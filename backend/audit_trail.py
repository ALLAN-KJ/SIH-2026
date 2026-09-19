import os
import hashlib
import json
import sqlite3
import threading
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "audit.db")

# A global lock to ensure completely serialized access to the audit logic
# (FastAPI def endpoints run in a threadpool)
audit_lock = threading.Lock()

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15)
    return conn

def init_db():
    with audit_lock:
        conn = get_db()
        try:
            conn.execute("CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT UNIQUE)")
            conn.execute("CREATE TABLE IF NOT EXISTS root_history (id INTEGER PRIMARY KEY AUTOINCREMENT, merkle_root TEXT, row_count INTEGER)")
            conn.commit()
        finally:
            conn.close()

init_db()

class AuditLogRequest(BaseModel):
    report_data: dict

class AuditLogResponse(BaseModel):
    report_hash: str
    merkle_root: str
    status: str
    tampered: bool
    tamper_message: str

class VerifyRequest(BaseModel):
    report_hash: str

class VerifyResponse(BaseModel):
    is_verified: bool
    merkle_root: str
    message: str
    tampered: bool
    tamper_message: str

def compute_merkle_root(leaves: List[str]) -> str:
    """Computes a simple Merkle Root from a list of SHA-256 hashes."""
    if not leaves:
        return ""
    
    current_level = leaves
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            node1 = current_level[i]
            # Duplicate the last node if there is an odd number of nodes
            node2 = current_level[i + 1] if (i + 1) < len(current_level) else current_level[i]
            combined = node1 + node2
            next_level.append(hashlib.sha256(combined.encode()).hexdigest())
        current_level = next_level
        
    return current_level[0]

def check_integrity(conn) -> tuple[bool, str, str]:
    """Returns (tampered, tamper_message, current_merkle_root)"""
    cursor = conn.execute("SELECT hash FROM audit_logs ORDER BY id ASC")
    current_hashes = [row[0] for row in cursor.fetchall()]
    current_root = compute_merkle_root(current_hashes)
    current_count = len(current_hashes)
    
    cursor = conn.execute("SELECT merkle_root, row_count FROM root_history ORDER BY id DESC LIMIT 1")
    last_record = cursor.fetchone()
    
    if not last_record:
        # No history yet, so it can't be tampered
        return False, "Integrity verified. No tampering detected.", current_root
        
    last_root, last_count = last_record
    
    if current_count < last_count:
        return True, f"TAMPERING DETECTED: Row count decreased from {last_count} to {current_count}. Records were deleted.", current_root
        
    # We check if we can reproduce the `last_root` from the first `last_count` records!
    # Because if they just appended, the first `last_count` should still hash to `last_root`.
    hashes_for_last_count = current_hashes[:last_count]
    root_for_last_count = compute_merkle_root(hashes_for_last_count)
    
    if root_for_last_count != last_root:
        return True, "TAMPERING DETECTED: Historical records were modified. Merkle root mismatch.", current_root
        
    return False, "Integrity verified. No tampering detected.", current_root

@router.on_event("startup")
def startup_integrity_check():
    import logging
    with audit_lock:
        conn = get_db()
        try:
            tampered, msg, _ = check_integrity(conn)
            if tampered:
                logging.error(f"❌ CRITICAL AUDIT WARNING: {msg}")
            else:
                logging.info(f"Audit trail integrity check passed on startup.")
        finally:
            conn.close()

@router.post("/log", response_model=AuditLogResponse)
def log_report(request: AuditLogRequest):
    """Hashes a report and adds it to the audit trail."""
    serialized = json.dumps(request.report_data, sort_keys=True)
    report_hash = hashlib.sha256(serialized.encode()).hexdigest()
    
    with audit_lock:
        conn = get_db()
        try:
            # Using EXCLUSIVE transaction ensures serialized SQLite access alongside our threading.Lock
            conn.execute("BEGIN EXCLUSIVE TRANSACTION")
            
            # First, check integrity before we append
            tampered, msg, _ = check_integrity(conn)
            
            cursor = conn.execute("SELECT id FROM audit_logs WHERE hash = ?", (report_hash,))
            exists = cursor.fetchone() is not None
            
            if not exists:
                conn.execute("INSERT INTO audit_logs (hash) VALUES (?)", (report_hash,))
                
            cursor = conn.execute("SELECT hash FROM audit_logs ORDER BY id ASC")
            all_hashes = [row[0] for row in cursor.fetchall()]
            new_root = compute_merkle_root(all_hashes)
            row_count = len(all_hashes)
            
            if not exists:
                conn.execute("INSERT INTO root_history (merkle_root, row_count) VALUES (?, ?)", (new_root, row_count))
                
            conn.commit()
            
            return AuditLogResponse(
                report_hash=report_hash,
                merkle_root=new_root,
                status="Successfully logged to audit trail.",
                tampered=tampered,
                tamper_message=msg
            )
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            conn.close()

@router.post("/verify", response_model=VerifyResponse)
def verify_report(request: VerifyRequest):
    """Verifies if a report hash exists in the current Merkle tree."""
    with audit_lock:
        conn = get_db()
        try:
            tampered, msg, root = check_integrity(conn)
            
            cursor = conn.execute("SELECT id FROM audit_logs WHERE hash = ?", (request.report_hash,))
            exists = cursor.fetchone() is not None
            
            return VerifyResponse(
                is_verified=exists,
                merkle_root=root,
                message="Hash verified. Report exists in the audit log." if exists else "Verification failed. Hash not found in the audit log.",
                tampered=tampered,
                tamper_message=msg
            )
        finally:
            conn.close()




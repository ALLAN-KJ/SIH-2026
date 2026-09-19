from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class PQCRequest(BaseModel):
    encryption_algorithm: str
    key_length_bits: int
    hash_algorithm: str
    dh_group: int

class PQCResponse(BaseModel):
    pqc_score: int
    is_quantum_safe: bool
    details: dict

def evaluate_pqc_readiness(req: PQCRequest) -> PQCResponse:
    score = 100
    details = {}
    
    # Evaluate Encryption Algorithm (Grover's algorithm halves effective key size)
    # 256-bit keys are considered quantum-safe for symmetric encryption.
    if req.key_length_bits >= 256 and req.encryption_algorithm.startswith("AES"):
        details["encryption"] = {"status": "Safe", "reason": "Symmetric key >= 256 bits resists Grover's algorithm."}
    else:
        score -= 30
        details["encryption"] = {"status": "Vulnerable", "reason": f"{req.encryption_algorithm}-{req.key_length_bits} is vulnerable to quantum search attacks."}
        
    # Evaluate Hashing Algorithm
    # SHA-384 and SHA-512 are considered quantum-safe.
    if req.hash_algorithm in ["SHA384", "SHA512"]:
        details["hashing"] = {"status": "Safe", "reason": f"{req.hash_algorithm} provides adequate collision resistance post-quantum."}
    else:
        score -= 20
        details["hashing"] = {"status": "Vulnerable", "reason": f"{req.hash_algorithm} output size is too small for quantum resistance."}
        
    # Evaluate Key Exchange / DH Group (Shor's algorithm breaks discrete log)
    # Mapping of known classical groups and hypothetical PQC KEM identifiers.
    CLASSICAL_DH_GROUPS = set(range(1, 35)) # Standard IANA DH groups
    PQC_KEM_GROUPS = {
        1024: "ML-KEM-512",
        1025: "ML-KEM-768",
        1026: "ML-KEM-1024",
        1030: "Hybrid-SECP256R1-ML-KEM"
    }

    if req.dh_group in PQC_KEM_GROUPS:
        kem_name = PQC_KEM_GROUPS[req.dh_group]
        details["key_exchange"] = {"status": "Safe", "reason": f"Uses quantum-resistant KEM: {kem_name}."}
    elif req.dh_group in CLASSICAL_DH_GROUPS or req.dh_group == 0:
        score -= 50
        details["key_exchange"] = {"status": "Critical Vulnerability", "reason": f"DH Group {req.dh_group} is classical and entirely broken by Shor's algorithm."}
    else:
        score -= 50
        details["key_exchange"] = {"status": "Unknown", "reason": f"Unknown DH Group {req.dh_group}, assuming not quantum safe."}

    # Floor score at 0
    score = max(0, score)
    is_safe = score == 100
    
    return PQCResponse(
        pqc_score=score,
        is_quantum_safe=is_safe,
        details=details
    )

@router.post("/pqc_score", response_model=PQCResponse)
def get_pqc_score(request: PQCRequest):
    return evaluate_pqc_readiness(request)


from pydantic import BaseModel
from typing import List, Dict

class IPsecRequest(BaseModel):
    ike_version: str
    ike_mode: str
    encryption_algorithm: str
    key_length_bits: int
    hash_algorithm: str
    dh_group: int
    auth_method: str
    operation_mode: str
    pfs_enabled: bool
    sa_lifetime_seconds: int
    
class AssessResponse(BaseModel):
    risk_score: float
    risk_label: str
    top_contributing_factors: dict
    flagged_issues: List[str]

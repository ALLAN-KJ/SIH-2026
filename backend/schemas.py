from pydantic import BaseModel
from typing import List, Dict, Optional

class IPsecRequest(BaseModel):
    ike_version: str
    ike_mode: str
    encryption_algorithm: str
    key_length_bits: int
    hash_algorithm: str
    dh_group: int
    auth_method: str
    operation_mode: str
    ip_version: str
    pfs_enabled: bool
    sa_lifetime_seconds: int
    esp_features: Optional[dict] = None
    metadata_exposure: Optional[str] = None
    ah_supported: bool = False
    ah_spi: Optional[int] = None
    ah_sequence: Optional[int] = None
    ah_icv_length: Optional[int] = None
    
class AssessResponse(BaseModel):
    risk_score: float
    risk_label: str
    risk_confidence: Optional[float] = None
    top_contributing_factors: dict
    flagged_issues: List[str]
    esp_anomaly_status: Optional[str] = None
    esp_anomaly_score: Optional[float] = None
    is_esp_anomaly: Optional[bool] = None
    traffic_type: Optional[str] = None
    traffic_confidence: Optional[float] = None
    metadata_exposure: Optional[str] = None

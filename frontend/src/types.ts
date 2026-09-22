export interface IPsecRequest {
  ike_version: string;
  ike_mode: string;
  encryption_algorithm: string;
  key_length_bits: number;
  hash_algorithm: string;
  dh_group: number;
  auth_method: string;
  operation_mode: string;
  ip_version: string;
  pfs_enabled: boolean;
  sa_lifetime_seconds: number;
  esp_features?: {
    esp_packet_count: number;
    esp_mean_size: number;
    esp_var_size: number;
    esp_mean_iat: number;
    esp_var_iat: number;
    esp_duration: number;
  };
}

export interface AssessResponse {
  risk_score: number;
  risk_label: string;
  top_contributing_factors: Record<string, number>;
  flagged_issues: string[];
  predicted_traffic_type?: string;
  traffic_confidence?: number;
}

export interface RemediateRequest {
  risk_label: string;
  flagged_issues: string[];
  top_contributing_factors: Record<string, number>;
}

export interface RemediateResponse {
  explanation: string;
  nist_citation: string;
  config_diff: string;
}

export interface PQCRequest {
  encryption_algorithm: string;
  key_length_bits: number;
  hash_algorithm: string;
  dh_group: number;
}

export interface PQCResponse {
  pqc_score: number;
  pqc_status: string;
  details: Record<string, {
    status: string;
    reason: string;
  }>;
}

export interface AuditLogRequest {
  report_data: Record<string, any>;
}

export interface AuditLogResponse {
  report_hash: string;
  merkle_root: string;
  status: string;
  tampered: boolean;
  tamper_message: string;
}

export interface VerifyRequest {
  report_hash: string;
}

export interface VerifyResponse {
  is_verified: boolean;
  merkle_root: string;
  message: string;
  tampered: boolean;
  tamper_message: string;
}

// Unified Result Type for the Dashboard
export interface AnalysisResult {
  ipsec_request: IPsecRequest;
  risk: AssessResponse;
  remediation: RemediateResponse;
  pqc: PQCResponse;
  audit: AuditLogResponse;
}

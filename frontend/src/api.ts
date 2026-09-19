import type { 
    AnalysisResult, 
    IPsecRequest, 
    AssessResponse, 
    RemediateResponse, 
    PQCResponse, 
    AuditLogResponse 
  } from './types';
  
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  export const api = {
    async analyzePCAP(file: File): Promise<AnalysisResult> {
      // 1. Upload PCAP
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch(`${API_URL}/upload_pcap`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Failed to parse PCAP');
      const ipsecReq: IPsecRequest = await uploadRes.json();
  
      // 2. Assess Risk
      const assessRes = await fetch(`${API_URL}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ipsecReq),
      });
      if (!assessRes.ok) throw new Error('Failed to assess risk');
      const risk: AssessResponse = await assessRes.json();
  
      // 3. Remediate & PQC (Can be run in parallel)
      const [remediateRes, pqcRes] = await Promise.all([
        fetch(`${API_URL}/remediate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risk_label: risk.risk_label,
            flagged_issues: risk.flagged_issues,
            top_contributing_factors: risk.top_contributing_factors
          }),
        }),
        fetch(`${API_URL}/pqc_score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encryption_algorithm: ipsecReq.encryption_algorithm,
            key_length_bits: ipsecReq.key_length_bits,
            hash_algorithm: ipsecReq.hash_algorithm,
            dh_group: ipsecReq.dh_group
          }),
        })
      ]);
  
      if (!remediateRes.ok) throw new Error('Failed to get remediation');
      if (!pqcRes.ok) throw new Error('Failed to calculate PQC score');
  
      const remediation: RemediateResponse = await remediateRes.json();
      const pqc: PQCResponse = await pqcRes.json();
  
      // 4. Log to Audit Trail
      const logRes = await fetch(`${API_URL}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_data: {
            ipsec_request: ipsecReq,
            risk_assessment: risk,
            pqc_score: pqc.pqc_score
          }
        }),
      });
      if (!logRes.ok) throw new Error('Failed to log audit trail');
      const audit: AuditLogResponse = await logRes.json();
  
      return { risk, remediation, pqc, audit };
    },
    async probeTarget(target_ip: string, auth_confirmation: string, override_rfc1918: boolean): Promise<AnalysisResult> {
      const probeRes = await fetch(`${API_URL}/probe/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_ip, auth_confirmation, override_rfc1918 }),
      });
      if (!probeRes.ok) {
        let msg = 'Failed to probe target';
        try { const err = await probeRes.json(); msg = err.detail || msg; } catch {}
        throw new Error(msg);
      }
      const ipsecReq: IPsecRequest = await probeRes.json();
  
      // 2. Assess Risk
      const assessRes = await fetch(`${API_URL}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ipsecReq),
      });
      if (!assessRes.ok) throw new Error('Failed to assess risk');
      const risk: AssessResponse = await assessRes.json();
  
      // 3. Remediate & PQC (Can be run in parallel)
      const [remediateRes, pqcRes] = await Promise.all([
        fetch(`${API_URL}/remediate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risk_label: risk.risk_label,
            flagged_issues: risk.flagged_issues,
            top_contributing_factors: risk.top_contributing_factors
          }),
        }),
        fetch(`${API_URL}/pqc_score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encryption_algorithm: ipsecReq.encryption_algorithm,
            key_length_bits: ipsecReq.key_length_bits,
            hash_algorithm: ipsecReq.hash_algorithm,
            dh_group: ipsecReq.dh_group
          }),
        })
      ]);
  
      if (!remediateRes.ok) throw new Error('Failed to get remediation');
      if (!pqcRes.ok) throw new Error('Failed to calculate PQC score');
  
      const remediation: RemediateResponse = await remediateRes.json();
      const pqc: PQCResponse = await pqcRes.json();
  
      // 4. Log to Audit Trail
      const logRes = await fetch(`${API_URL}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_data: {
            ipsec_request: ipsecReq,
            risk_assessment: risk,
            pqc_score: pqc.pqc_score
          }
        }),
      });
      if (!logRes.ok) throw new Error('Failed to log audit trail');
      const audit: AuditLogResponse = await logRes.json();
  
      return { risk, remediation, pqc, audit };
    }
  };

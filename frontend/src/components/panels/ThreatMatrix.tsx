import React from 'react';
import type { AssessResponse } from '../../types';

export const ThreatMatrix = ({ risk, ipsec }: { risk: AssessResponse, ipsec?: any }) => {
  // Build dynamic threats from issues
  const threats: Array<{issue: string, severity: string, cia: string}> = [];
  
  risk.flagged_issues.forEach(issue => {
    let cia = 'Confidentiality';
    let sev = 'Medium';
    
    if (issue.toLowerCase().includes('hash') || issue.toLowerCase().includes('integrity') || issue.toLowerCase().includes('hmac')) {
      cia = 'Integrity';
    } else if (issue.toLowerCase().includes('psk') || issue.toLowerCase().includes('auth') || issue.toLowerCase().includes('aggressive')) {
      cia = 'Authentication';
    }
    
    if (issue.toLowerCase().includes('critical') || issue.toLowerCase().includes('highly risky') || issue.toLowerCase().includes('vulnerable')) {
      sev = 'High';
    } else if (issue.toLowerCase().includes('weak')) {
      sev = 'Medium';
    } else {
      sev = 'Low';
    }
    
    threats.push({ issue, severity: sev, cia });
  });

  if (threats.length === 0) {
    if (risk.risk_score > 0) {
      threats.push({ issue: "Base configuration risk", severity: "Low", cia: "Confidentiality" });
    }
  }

  const getSevColor = (sev: string) => {
    if (sev === 'High') return 'var(--color-crit)';
    if (sev === 'Medium') return 'var(--color-mod)';
    return 'var(--color-strong)';
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Threat Matrix (Vulnerabilities vs C-I-A Impact)
      </div>
      
      {threats.length > 0 ? (
        <div style={{
          border: '1px solid var(--color-border-dim)',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: 'var(--color-well)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-border-dim)', textAlign: 'left', color: 'var(--color-text-2)' }}>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>Vulnerability / Misconfiguration</th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>Severity</th>
                <th style={{ padding: '8px 12px', fontWeight: 500 }}>Affected Property</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid var(--color-border-dim)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-1)' }}>{t.issue}</td>
                  <td style={{ padding: '8px 12px', color: getSevColor(t.severity), fontWeight: 500 }}>{t.severity}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-2)' }}>{t.cia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontStyle: 'italic' }}>
          No specific vulnerabilities detected.
        </div>
      )}
    </div>
  );
};

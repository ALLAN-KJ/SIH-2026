import type { PQCResponse } from '../../types';
import { CaretRight } from '@phosphor-icons/react';
import { Card, CardHeader, SevBadge, sev, HelperNote } from '../ui';

export const PQCPanel = ({ pqc }: { pqc: PQCResponse }) => {
  const label = pqc.pqc_status === 'Quantum-Safe' ? 'Strong' : pqc.pqc_status === 'Unrecognized' ? 'Moderate' : 'Critical';
  const s = sev(label);
  return (
    <Card id="panel-pqc" className="panel-secondary">
      <CardHeader
        title="Cryptographic Strength"
        subtitle="Based on proposed IANA KEM identifiers (not yet finalized)"
      />
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
          <span
            className="font-heading"
            style={{
              fontSize: 'var(--text-5xl)',
              lineHeight: 'var(--text-5xl--line-height)',
              fontWeight: 700,
              color: s.fg,
              letterSpacing: '-0.02em',
            }}
          >
            {pqc.pqc_score}
          </span>
          <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-3)' }}>/100</span>
          <SevBadge label={pqc.pqc_status} sev={s} />
          <div style={{ marginLeft: 'auto' }}>
            <HelperNote>how ready this config is for quantum threats</HelperNote>
          </div>
        </div>

        <p style={{
          fontSize: 'var(--text-base)',
          lineHeight: 'var(--text-base--line-height)',
          color: 'var(--color-text-2)',
        }}>
          {pqc.pqc_status === 'Quantum-Safe'
            ? "Estimated to use quantum-resistant algorithms (Note: IANA identifiers for ML-KEM are still in draft)."
            : pqc.pqc_status === 'Unrecognized'
            ? "This key exchange group ID is not in our known classical or PQC identifier list. This may indicate a newer/vendor-specific value not yet mapped, not necessarily a vulnerability."
            : "This configuration relies on classical algorithms vulnerable to Shor's algorithm."}
        </p>

        <details style={{ marginTop: '24px' }}>
          <summary className="transition-default" style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: 'var(--color-text-3)',
            cursor: 'pointer',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none' as const,
          }}>
            <CaretRight size={14} weight="bold" />
            Details
          </summary>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(pqc.details).map(([category, detail]) => {
              const detailSev = detail.status === 'Safe' ? sev('Strong') : detail.status === 'Unrecognized' ? sev('Moderate') : sev('Critical');
              return (
                <div key={category} className="transition-default" style={{
                  padding: '12px 16px',
                  border: '1px solid var(--color-border-dim)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 500,
                      color: 'var(--color-text-1)',
                      textTransform: 'capitalize' as const,
                    }}>
                      {category.replace('_', ' ')}
                    </span>
                    <SevBadge label={detail.status} sev={detailSev} />
                  </div>
                  <p style={{
                    fontSize: 'var(--text-sm)',
                    lineHeight: 'var(--text-sm--line-height)',
                    color: 'var(--color-text-3)',
                  }}>
                    {detail.reason}
                  </p>
                </div>
              );
            })}
          </div>
          
          <div className="text-secondary" style={{ marginTop: '16px', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
            <p><strong>Heuristic Methodology:</strong> The system scores PQC readiness by examining three components:</p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '16px', marginTop: '4px' }}>
              <li><strong>Encryption:</strong> Asserts symmetric key length is &ge; 256 bits to resist Grover's algorithm.</li>
              <li><strong>Hashing:</strong> Asserts digest size is &ge; 384 bits for quantum collision resistance.</li>
              <li><strong>Key Exchange:</strong> Rejects all classical Diffie-Hellman groups (1-34) as vulnerable to Shor's algorithm. Only standard draft KEM identifiers (e.g., ML-KEM-512 via proposed IANA group 1024) are recognized as safe.</li>
            </ul>
          </div>
        </details>
      </div>
    </Card>
  );
};

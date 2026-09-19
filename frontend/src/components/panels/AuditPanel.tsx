import type { AuditLogResponse } from '../../types';
import { Card, CardHeader, Overline, Mono } from '../ui';

export const AuditPanel = ({ audit }: { audit: AuditLogResponse }) => (
  <Card id="panel-audit" className="panel-secondary">
    <CardHeader title="Audit Record" />
    <div style={{ padding: '20px 24px' }}>
      {audit.tampered ? (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(255, 60, 60, 0.1)',
          border: '1px solid var(--color-crit)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-crit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-crit)' }}>
              TAMPERING DETECTED
            </span>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginTop: '4px', lineHeight: 1.4 }}>
              {audit.tamper_message}
            </p>
          </div>
        </div>
      ) : (
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-1)',
        }}>
          Tamper-evident, cryptographically verified
        </span>
      )}

      <details style={{ marginTop: '12px' }}>
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
          Details
        </summary>
        <div style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {[
            { label: 'Report Hash', value: audit.report_hash },
            { label: 'Merkle Root', value: audit.merkle_root },
          ].map(({ label, value }) => (
            <div key={label} style={{ minWidth: 0 }}>
              <Overline>{label}</Overline>
              <div style={{
                marginTop: '4px',
                padding: '8px 12px',
                border: '1px solid var(--color-border-dim)',
                overflow: 'hidden',
              }}>
                <Mono style={{
                  color: 'var(--color-text-2)',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{value}</Mono>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  </Card>
);

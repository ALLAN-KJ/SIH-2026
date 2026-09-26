import type { AuditLogResponse } from '../../types';
import { Warning, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { Card, CardHeader, Overline, Mono, HelperNote } from '../ui';

export const AuditPanel = ({ audit }: { audit: AuditLogResponse }) => (
  <Card id="panel-audit" className="panel-secondary">
    <CardHeader title="Audit Record" />
    <div style={{ padding: '20px 24px' }}>
      {audit.tampered ? (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--color-crit-muted)',
          border: '1px solid var(--color-crit)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <Warning size={20} weight="bold" color="var(--color-crit)" style={{ flexShrink: 0, marginTop: '2px' }} />
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
        <div style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-1)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <CheckCircle size={18} weight="fill" color="var(--color-strong)" />
          <div>
            <div>Tamper-evident, cryptographically verified</div>
            <HelperNote>blockchain-backed proof of this exact report</HelperNote>
          </div>
        </div>
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
          <CaretRight size={14} weight="bold" />
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

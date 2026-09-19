import type { RemediateResponse } from '../../types';
import { Card, CardHeader, Overline, Mono } from '../ui';

export const LLMPanel = ({ remediation, onUseFallback, hasFallback }: {
  remediation: RemediateResponse;
  onUseFallback?: () => void;
  hasFallback?: boolean;
}) => (
  <Card id="panel-llm" className="panel-secondary">
    <CardHeader title="Remediation Copilot" />
    {/* Persistent disclaimer — never removed */}
    <div style={{
      padding: '8px 24px',
      borderBottom: '1px solid var(--color-weak-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    }}>
      <p style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-weak)',
        margin: 0,
      }}>
        AI-generated — review before deploying
      </p>
      {remediation.explanation.includes("Remediation unavailable") && hasFallback && (
        <button
          onClick={onUseFallback}
          className="transition-default"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            padding: '4px 12px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-2)',
            cursor: 'pointer',
            whiteSpace: 'nowrap' as const,
          }}
        >
          Load Demo Fallback
        </button>
      )}
    </div>

    <div style={{ padding: '24px' }}>
      {/* Fix Summary — always visible */}
      <p style={{
        fontSize: 'var(--text-sm)',
        lineHeight: '1.6',
        color: 'var(--color-text-2)',
      }}>
        {remediation.explanation}
      </p>

      {/* Details — config + citation behind disclosure */}
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
          Details
        </summary>

        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '16px' }}>
            LLM-generated · NIST SP 800-77 aligned
          </p>

          <Overline>NIST Citation</Overline>
          <p style={{
            marginTop: '4px',
            fontSize: 'var(--text-sm)',
            lineHeight: '1.6',
            color: 'var(--color-text-2)',
          }}>
            {remediation.nist_citation}
          </p>

          <div style={{ marginTop: '16px' }}>
            <Overline>Remediated Configuration</Overline>
            <div style={{
              marginTop: '8px',
              border: '1px solid var(--color-border-dim)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border-dim)',
              }}>
                <Mono style={{ color: 'var(--color-text-3)' }}>cisco_ios.conf</Mono>
              </div>
              <pre className="font-mono" style={{
                padding: '16px',
                margin: 0,
                fontSize: 'var(--text-sm)',
                lineHeight: '1.7',
                color: 'var(--color-text-1)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all' as const,
                backgroundColor: 'var(--color-ground)',
              }}>
                {remediation.config_diff}
              </pre>
            </div>
          </div>
        </div>
      </details>
    </div>
  </Card>
);

import type { RemediateResponse } from '../../types';
import { Warning, CaretRight } from '@phosphor-icons/react';
import { Card, CardHeader, Overline, Mono } from '../ui';

export const LLMPanel = ({ remediation, onUseFallback, hasFallback }: {
  remediation: RemediateResponse;
  onUseFallback?: () => void;
  hasFallback?: boolean;
}) => {
  const isFallback = remediation.explanation.includes("Remediation unavailable");
  return (
  <Card id="panel-llm" className="panel-secondary" style={isFallback ? { borderColor: 'var(--color-weak-border)' } : {}}>
    <CardHeader title="Configuration Compliance" subtitle={isFallback ? "Fallback Configuration Loaded" : "Security Assessment Report"} />
    {/* Persistent disclaimer — never removed */}
    <div style={{
      padding: '8px 24px',
      borderBottom: '1px solid var(--color-border-dim)',
      backgroundColor: isFallback ? 'var(--color-weak-muted)' : 'transparent',
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
        color: isFallback ? 'var(--color-weak)' : 'var(--color-text-3)',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Warning size={16} weight="bold" />
        AI-generated — review before applying to production systems
      </p>
      {isFallback && hasFallback && (
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
          <CaretRight size={14} weight="bold" />
          Details
        </summary>

        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '16px' }}>
            Intelligent framework · NIST SP 800-77 aligned
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
};

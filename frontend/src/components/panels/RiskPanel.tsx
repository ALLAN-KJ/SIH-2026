import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { AssessResponse } from '../../types';
import { Card, CardHeader, Overline, SevBadge, Mono, sev, prefersReducedMotion } from '../ui';

export const RiskPanel = ({ risk }: { risk: AssessResponse }) => {
  const s = sev(risk.risk_label);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (scoreRef.current && !prefersReducedMotion()) {
      const target = Math.round(risk.risk_score * 10) / 10;
      gsap.fromTo(scoreRef.current,
        { textContent: '0' },
        {
          textContent: target,
          duration: 0.8,
          ease: 'power2.out',
          snap: { textContent: 0.1 },
          onUpdate() {
            if (scoreRef.current) {
              scoreRef.current.textContent = parseFloat(scoreRef.current.textContent || '0').toFixed(1);
            }
          },
        }
      );
    }
  }, [risk.risk_score]);

  return (
    <Card id="panel-risk" className="panel-risk">
      <CardHeader title="Risk Assessment" />
      <div style={{ padding: '24px' }}>
        {/* Verdict row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
          <span
            ref={scoreRef}
            className="font-heading"
            style={{
              fontSize: 'var(--text-5xl)',
              lineHeight: 'var(--text-5xl--line-height)',
              fontWeight: 700,
              color: s.fg,
              letterSpacing: '-0.02em',
            }}
          >
            {(Math.round(risk.risk_score * 10) / 10).toFixed(1)}
          </span>
          <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-3)' }}>/100</span>
          <SevBadge label={risk.risk_label} sev={s} />
        </div>

        <p style={{
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--text-sm--line-height)',
          color: 'var(--color-text-2)',
        }}>
          {risk.flagged_issues.length > 0 ? risk.flagged_issues[0] : 'No critical issues flagged.'}
        </p>

        {/* Technical Details (progressive disclosure) */}
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 150ms' }}>
              <polyline points="9 6 15 12 9 18" />
            </svg>
            Details
          </summary>

          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '16px' }}>
              XGBoost classifier · SHAP explainability
            </p>
            {/* SHAP table */}
            <Overline>Top contributing factors</Overline>
            <div style={{
              marginTop: '8px',
              border: '1px solid var(--color-border-dim)',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: 'var(--color-well)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
                    <th style={{
                      padding: '10px 16px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--color-text-3)',
                      textAlign: 'left',
                    }}>Feature</th>
                    <th style={{
                      padding: '10px 16px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--color-text-3)',
                      textAlign: 'right',
                    }}>SHAP Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(risk.top_contributing_factors).map(([k, v]) => (
                    <tr key={k} className="transition-default" style={{ borderBottom: '1px solid var(--color-border-dim)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <Mono style={{ color: 'var(--color-text-1)' }}>{k}</Mono>
                      </td>
                      <td className="font-mono" style={{
                        padding: '10px 16px',
                        textAlign: 'right',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        fontVariantNumeric: 'tabular-nums',
                        color: s.fg,
                      }}>
                        {v > 0 ? '+' : ''}{v.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Flagged issues */}
            {risk.flagged_issues.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Overline>All flagged issues</Overline>
                <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {risk.flagged_issues.map((issue, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 'var(--text-sm--line-height)',
                      color: 'var(--color-text-2)',
                    }}>
                      <span style={{
                        marginTop: '7px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: s.fg,
                        opacity: 0.5,
                        flexShrink: 0,
                      }} />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      </div>
    </Card>
  );
};

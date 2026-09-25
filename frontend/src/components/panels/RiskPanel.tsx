import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { AssessResponse } from '../../types';
import { CaretRight, WarningOctagon, CheckCircle } from '@phosphor-icons/react';
import { Card, CardHeader, Overline, SevBadge, Mono, sev, prefersReducedMotion, HelperNote } from '../ui';
import { ThreatMatrix } from './ThreatMatrix';

export const RiskPanel = ({ risk, ipsec }: { risk: AssessResponse, ipsec?: any }) => {
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
      <CardHeader title="Security Assessment" />
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
          {risk.risk_confidence !== undefined && (
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
                AI Confidence Score: {risk.risk_confidence}%
              </span>
              <HelperNote>how sure the model is about this specific prediction</HelperNote>
            </div>
          )}
        </div>

        <p style={{
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--text-sm--line-height)',
          color: 'var(--color-text-2)',
          marginBottom: '24px'
        }}>
          {risk.flagged_issues.length > 0 ? risk.flagged_issues[0] : 'No critical issues flagged.'}
        </p>

        {/* IPsec Extracted Parameters */}
        {ipsec && (
          <div style={{ marginBottom: '24px' }}>
            <Overline>Traffic Analysis (Metadata Exposure)</Overline>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '8px' }}>
              The following connection parameters were exposed in cleartext during IKE negotiation:
            </p>
            <div style={{
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'var(--color-well)',
              border: '1px solid var(--color-border-dim)',
              borderRadius: '6px'
            }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>Protocol</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>{ipsec.ike_version}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>IP Version</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>{ipsec.ip_version}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>Mode</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>{ipsec.operation_mode}</div>
              </div>
            </div>
            
            {risk.metadata_exposure && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: risk.metadata_exposure.includes('Public') ? 'var(--color-crit-subtle)' : 'var(--color-well)',
                border: `1px solid ${risk.metadata_exposure.includes('Public') ? 'var(--color-crit)' : 'var(--color-border-dim)'}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: risk.metadata_exposure.includes('Public') ? 'var(--color-crit)' : 'var(--color-text-1)' }}>
                  Metadata Exposure: {risk.metadata_exposure}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ESP Traffic Classification */}
        {risk.esp_anomaly_status && (
          <div style={{ marginBottom: '24px' }}>
            <Overline>Traffic Analysis</Overline>
            
            {/* Traffic Type Prediction */}
            {risk.traffic_type && (
              <div style={{
                marginTop: '8px',
                marginBottom: '8px',
                padding: '12px',
                backgroundColor: 'var(--color-well)',
                border: '1px solid var(--color-border-dim)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
                    Predicted Traffic: {risk.traffic_type}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
                    AI Confidence: {risk.traffic_confidence}%
                  </div>
                  <HelperNote>how sure the AI is about the traffic type</HelperNote>
                </div>
              </div>
            )}

            {/* Anomaly Detection */}
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-well)',
              border: '1px solid var(--color-border-dim)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {risk.is_esp_anomaly ? (
                  <WarningOctagon size={18} weight="bold" color="var(--color-crit)" />
                ) : (
                  <CheckCircle size={18} weight="bold" color="var(--color-accent)" />
                )}
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
                  {risk.esp_anomaly_status}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                Anomaly Score: <span style={{ color: 'var(--color-text-1)', fontWeight: 500 }}>{risk.esp_anomaly_score}</span>
              </div>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '6px', lineHeight: 1.4 }}>
              *Traffic classification uses timing/size heuristics and requires no payload decryption.
            </p>
          </div>
        )}

        <ThreatMatrix riskLabel={risk.risk_label} />

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
            <CaretRight size={14} weight="bold" style={{ transition: 'transform 150ms' }} />
            Details
          </summary>

          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginBottom: '16px' }}>
              AI Model Explainability · Top Factors
            </p>
            {/* SHAP chart */}
            <div style={{ marginBottom: '16px' }}>
              <Overline>Why this score?</Overline>
              <div style={{
                marginTop: '8px',
                border: '1px solid var(--color-border-dim)',
                borderRadius: '6px',
                padding: '16px',
                backgroundColor: 'var(--color-well)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {Object.entries(risk.top_contributing_factors).map(([k, v]) => {
                  const maxAbs = Math.max(...Object.values(risk.top_contributing_factors).map(Math.abs), 0.1);
                  const width = `${Math.abs(v) / maxAbs * 100}%`;
                  const isPositive = v > 0;
                  return (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: 'var(--color-text-1)' }}><Mono>{k}</Mono></span>
                        <span style={{ color: isPositive ? s.fg : 'var(--color-mod)', fontWeight: 500 }}>
                          {isPositive ? '+' : ''}{v.toFixed(3)}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width,
                          height: '100%',
                          backgroundColor: isPositive ? s.fg : 'var(--color-mod)',
                          borderRadius: '3px',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
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

import { useState } from 'react';
import { UploadSimple, Target, Play, ArrowRight, Circle } from '@phosphor-icons/react';

interface HomeProps {
  onNavigate: (mode: 'passive' | 'active' | 'demo') => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [liveHealth] = useState(true);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-ground)',
      color: 'var(--color-text-1)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 48px',
        borderBottom: '1px solid var(--color-border-dim)',
      }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '16px',
          letterSpacing: '-0.02em',
          color: 'var(--color-text-1)',
        }}>
          IPsec VPN Protocol Analyzer
        </div>
        <button
          onClick={() => onNavigate('passive')}
          className="home-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            color: 'var(--color-text-2)',
            border: '1px solid var(--color-border)',
            padding: '8px 18px',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Console <ArrowRight size={15} />
        </button>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '32px 48px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '80px',
        alignItems: 'start',
      }}>

        {/* Left Column */}
        <div>

          <h1 style={{
            fontSize: '42px',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: '16px',
            marginTop: 0,
            fontFamily: 'var(--font-heading)',
            lineHeight: 1.1,
            color: 'var(--color-text-1)',
          }}>
            Analyse IPsec VPN<br />security.
          </h1>
          <p style={{
            color: 'var(--color-text-2)',
            fontSize: 'var(--text-lg)',
            lineHeight: 1.65,
            maxWidth: '520px',
            marginBottom: '32px',
          }}>
            Upload a packet capture or probe a live target. Get a Security Score,
            cryptographic strength evaluation, configuration compliance
            recommendations, and a tamper-evident audit record.
          </p>

          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '14px',
            fontFamily: 'var(--font-heading)',
          }}>
            Choose your analysis mode
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Card 1 — Upload PCAP */}
            <button
              onClick={() => onNavigate('passive')}
              className="home-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '22px 24px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{
                color: 'var(--color-mod)',
                border: '1px solid rgba(251,191,36,0.25)',
                backgroundColor: 'rgba(251,191,36,0.06)',
                padding: '10px',
                flexShrink: 0,
              }}>
                <UploadSimple size={22} />
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--color-text-1)',
                  marginBottom: '6px',
                }}>
                  Upload PCAP <ArrowRight size={15} />
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                  Drop a .pcap or .pcapng — offline analysis, no traffic sent
                </div>
              </div>
            </button>

            {/* Card 2 — Active Probe (warning state) */}
            <button
              onClick={() => onNavigate('active')}
              className="home-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '22px 24px',
                backgroundColor: 'rgba(251,146,60,0.04)',
                border: '1px solid var(--color-weak-border)',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{
                color: 'var(--color-weak)',
                border: '1px solid var(--color-weak-border)',
                backgroundColor: 'var(--color-weak-muted)',
                padding: '10px',
                flexShrink: 0,
              }}>
                <Target size={22} />
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--color-text-1)',
                  marginBottom: '6px',
                }}>
                  Active Probe <ArrowRight size={15} />
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                  Send live IKE handshakes to a target you own and are authorized to test
                </div>
              </div>
            </button>

            {/* Card 3 — Guided Demo */}
            <button
              onClick={() => onNavigate('demo')}
              className="home-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                padding: '22px 24px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{
                color: 'var(--color-accent)',
                border: '1px solid rgba(45,212,191,0.25)',
                backgroundColor: 'rgba(45,212,191,0.05)',
                padding: '10px',
                flexShrink: 0,
              }}>
                <Play size={22} />
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--color-text-1)',
                  marginBottom: '6px',
                }}>
                  Guided Demo <ArrowRight size={15} />
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
                  Walk through a pre-loaded critical-risk scenario with step-by-step explanations
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column — System Status */}
        <div>
          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            System Status
          </div>

          {/* Status cards */}
          {[
            {
              label: 'Backend',
              value: 'Online',
              isStatus: true,
            },
            {
              label: 'Protocols',
              value: 'IKEv1 · IKEv2',
              mono: true,
            },
            {
              label: 'Standard',
              value: 'NIST SP 800-77r1',
              mono: true,
            },
          ].map(({ label, value, isStatus, mono }) => (
            <div key={label} style={{
              border: '1px solid var(--color-border-dim)',
              marginBottom: '10px',
              backgroundColor: 'var(--color-raised)',
            }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}>
                  {label}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
                  fontWeight: isStatus ? 600 : 400,
                  color: isStatus ? 'var(--color-text-1)' : 'var(--color-text-2)',
                }}>
                  {isStatus && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: liveHealth ? 'var(--color-accent)' : 'var(--color-crit)',
                      boxShadow: liveHealth ? '0 0 6px rgba(45,212,191,0.6)' : '0 0 6px rgba(248,113,113,0.6)',
                      flexShrink: 0,
                    }} />
                  )}
                  {value}
                </div>
              </div>
            </div>
          ))}

          {/* Separator */}
          <div style={{ height: '1px', backgroundColor: 'var(--color-border-dim)', margin: '20px 0' }} />

          {/* Feature list */}
          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            Capabilities
          </div>
          {[
            'XGBoost risk scoring + SHAP explainability',
            'NIST SP 800-77r1 compliance output',
            'Post-quantum readiness evaluation',
            'Tamper-evident Merkle audit trail',
            'IKEv1 & IKEv2 traffic classification',
          ].map((cap) => (
            <div key={cap} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '8px',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-2)',
              lineHeight: 1.5,
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-accent)',
                marginTop: '6px',
                flexShrink: 0,
              }} />
              {cap}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px 48px',
        textAlign: 'center',
        borderTop: '1px solid var(--color-border-dim)',
      }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
          Built for SIH 2026 · Problem Statement 26160 · NTRO · Blockchain &amp; Cybersecurity
        </div>
      </footer>
    </div>
  );
}

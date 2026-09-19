import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { api } from './api';
import type { AnalysisResult, RemediateResponse } from './types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dur, prefersReducedMotion } from './components/ui';
import { RiskPanel } from './components/panels/RiskPanel';
import { PQCPanel } from './components/panels/PQCPanel';
import { LLMPanel } from './components/panels/LLMPanel';
import { AuditPanel } from './components/panels/AuditPanel';
import { SihDemoModal } from './components/SihDemoModal';

gsap.registerPlugin(ScrollTrigger);

/*
 * ═══════════════════════════════════════════════════════════════
 *  IPsec Sentinel — Audit Console
 *
 *  Design direction: See DESIGN.md
 *  Typography: Satoshi (heading), Geist Sans (body), Geist Mono (data)
 *  Color: True-neutral dark. Color = severity/status only.
 *  Motion: GSAP power2/3 ease-out. Functional, not decorative.
 *  Layout: Single-column flow matching the user journey:
 *          Upload → Risk Verdict → PQC Assessment → Fix → Audit Record
 *
 *  All existing honesty disclaimers preserved from prior passes:
 *  - PQC: "Estimated" with IANA draft caveat
 *  - Audit: "Tamper-evident" not "tamper-proof"
 *  - LLM: "AI-generated starting point" disclaimer
 * ═══════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════
   Upload / Loading / Error states
   ═══════════════════════════════════════════════════════ */

const STEPS = [
  'Parsing IKE negotiation…',
  'Scoring risk factors…',
  'Checking quantum readiness…',
  'Generating remediation…',
  'Logging audit trail…',
];

const ActiveProbeZone = ({ loading, onProbe }: { loading: boolean; onProbe: (ip: string, auth: string) => void; }) => {
  const [ip, setIp] = useState('');
  const [auth, setAuth] = useState('');
  const [checked, setChecked] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (zoneRef.current && !prefersReducedMotion()) {
      gsap.fromTo(zoneRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.15 }
      );
    }
  }, []);

  return (
    <div ref={zoneRef} className="panel-hidden" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ padding: '24px', border: '1px solid var(--color-border)', backgroundColor: 'transparent' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 500, marginBottom: '16px', color: 'var(--color-text-1)' }}>Active Target Probe</h2>
        
        {/* Safety Disclaimer */}
        <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid var(--color-crit-border)', backgroundColor: 'transparent' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-crit)', margin: 0, lineHeight: 1.4 }}>
            <strong>WARNING:</strong> This tool sends active network packets. Unauthorized scanning is prohibited by law (e.g. India IT Act Section 43/66). You must only probe targets you own or have explicit authorization to test. Default restrictions limit scanning to private RFC1918 IPs.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: '4px' }}>Target IP Address</label>
            <input type="text" value={ip} onChange={e => setIp(e.target.value)} disabled={loading} placeholder="e.g. 192.168.1.10" style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-1)' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={loading} style={{ marginTop: '4px' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.4 }}>I certify that I am the owner of this target or have explicit authorization to perform security scanning against it.</span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: '4px' }}>Type "I AM AUTHORIZED" to confirm</label>
            <input type="text" value={auth} onChange={e => setAuth(e.target.value)} disabled={loading} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-1)' }} />
          </div>

          <button
            onClick={() => onProbe(ip, auth)}
            disabled={loading || !checked || auth !== "I AM AUTHORIZED" || !ip}
            style={{
              padding: '10px', marginTop: '8px',
              backgroundColor: (!checked || auth !== "I AM AUTHORIZED" || !ip) ? 'transparent' : 'var(--color-crit)',
              color: (!checked || auth !== "I AM AUTHORIZED" || !ip) ? 'var(--color-text-3)' : '#000',
              border: `1px solid ${(!checked || auth !== "I AM AUTHORIZED" || !ip) ? 'var(--color-border-dim)' : 'var(--color-crit)'}`,
              cursor: (!checked || auth !== "I AM AUTHORIZED" || !ip || loading) ? 'not-allowed' : 'pointer',
              fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            {loading ? 'Probing Target...' : 'Initiate Active Probe'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadZone = ({ loading, fileInputRef, onFileChange, loadSample }: {
  loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadSample: (filename: string) => void;
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) { setStep(0); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < STEPS.length) setStep(i);
    }, 700);
    return () => clearInterval(iv);
  }, [loading]);

  const zoneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (zoneRef.current && !prefersReducedMotion()) {
      gsap.fromTo(zoneRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.15 }
      );
    }
  }, []);

  return (
    <div ref={zoneRef} className="panel-hidden" style={{
      maxWidth: '640px',
      margin: '0 auto',
    }}>
      <input
        type="file"
        accept=".pcap,.pcapng"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={onFileChange}
        id="pcap-upload"
        disabled={loading}
      />

      <label
        htmlFor="pcap-upload"
        className="transition-default"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '40px 24px',
          border: '1px solid var(--color-border)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          textAlign: 'center',
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
        }}
      >
        {loading ? (
          <>
            {/* Spinner */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '16px', animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="2.5" />
              <path d="M12 2a10 10 0 019.95 9" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="font-heading" style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 500,
              color: 'var(--color-text-1)',
              marginBottom: '8px',
            }}>
              Processing…
            </span>
            <span style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-3)',
              transition: 'opacity 200ms',
            }}>
              {STEPS[step]}
            </span>
          </>
        ) : (
          <>
            <span style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-2)',
              marginBottom: '12px',
            }}>
              Drop .pcap / .pcapng or browse
            </span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              className="transition-default"
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-1)',
                padding: '6px 16px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              Browse Files
            </button>
          </>
        )}
      </label>

      {/* Sample cards */}
      {!loading && (
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border-dim)', paddingTop: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {[
              { file: 'scenario_critical_legacy.pcap', title: 'Critical Risk', desc: 'Legacy IPsec' },
              { file: 'scenario_moderate_transition.pcap', title: 'Moderate Risk', desc: 'Transitional config' },
              { file: 'scenario_strong_modern.pcap', title: 'Strong / Modern', desc: 'PQC ready' },
            ].map(({ file, title, desc }) => (
              <button
                key={file}
                onClick={() => loadSample(file)}
                className="transition-default"
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  border: '1px solid var(--color-border-dim)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-dim)';
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>{title}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ErrorBanner = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current && !prefersReducedMotion()) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div ref={ref} role="alert" style={{
      marginBottom: '24px',
      padding: '12px 16px',
      backgroundColor: 'transparent',
      border: '1px solid var(--color-crit-border)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-crit)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-crit)' }}>
          Analysis failed
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginTop: '2px' }}>
          {message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="transition-default"
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-text-3)',
          flexShrink: 0,
        }}
        aria-label="Dismiss error"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   App Shell
   ═══════════════════════════════════════════════════════ */

export default function App() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'passive' | 'active'>('passive');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [lastSuccessfulRemediation, setLastSuccessfulRemediation] = useState<RemediateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Header entrance animation
  useLayoutEffect(() => {
    if (headerRef.current && !prefersReducedMotion()) {
      gsap.fromTo(headerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: dur(0.4), ease: 'power2.out' }
      );
    }
  }, []);

  // Results panel stagger animation
  useEffect(() => {
    if (results && resultsRef.current && !prefersReducedMotion()) {
      const panels = resultsRef.current.querySelectorAll('.panel-hidden');
      panels.forEach((panel) => {
        gsap.fromTo(panel,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 90%',
              toggleActions: 'play none none none',
            }
          }
        );
      });
    }
    
    // Cleanup scroll triggers
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [results]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.analyzePCAP(file);
      setResults(res);
      if (!res.remediation.explanation.includes("Remediation unavailable")) {
        setLastSuccessfulRemediation(res.remediation);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadSample = useCallback(async (filename: string) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const resp = await fetch(`/${filename}`);
      if (!resp.ok) throw new Error('Failed to load sample PCAP');
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: 'application/vnd.tcpdump.pcap' });
      const res = await api.analyzePCAP(file);
      setResults(res);
      if (!res.remediation.explanation.includes("Remediation unavailable")) {
        setLastSuccessfulRemediation(res.remediation);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProbe = async (ip: string, auth: string) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.probeTarget(ip, auth, false);
      setResults(res);
      if (!res.remediation.explanation.includes("Remediation unavailable")) {
        setLastSuccessfulRemediation(res.remediation);
      }
    } catch (err: any) {
      setError(err.message || 'Active probe failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        minHeight: '100vh',
        padding: '32px 16px',
        position: 'relative',
        zIndex: 1,
      }}>
      {/* ── Header ── */}
      <header
        ref={headerRef}
        style={{
          maxWidth: '720px',
          margin: '0 auto 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: 0,
        }}
      >
        <h1 className="font-heading" style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-text-1)',
          letterSpacing: '-0.01em',
          margin: 0,
          lineHeight: 1.2,
        }}>
          IPsec Sentinel
        </h1>

        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="transition-default"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              backgroundColor: 'transparent',
              padding: '8px 16px',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Guided Demo
          </button>
          {results && (
            <button
            onClick={() => { setResults(null); setError(null); }}
            className="transition-default"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-1)',
              backgroundColor: 'transparent',
              padding: '8px 16px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
            }}
          >
            New Analysis
          </button>
        )}
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '64px' }}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!results && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
            <button onClick={() => setMode('passive')} style={{ padding: '8px 16px', border: '1px solid', borderColor: mode === 'passive' ? 'var(--color-accent)' : 'var(--color-border)', color: mode === 'passive' ? 'var(--color-accent)' : 'var(--color-text-2)', background: 'transparent', cursor: 'pointer' }}>Passive PCAP Upload</button>
            <button onClick={() => setMode('active')} style={{ padding: '8px 16px', border: '1px solid', borderColor: mode === 'active' ? 'var(--color-accent)' : 'var(--color-border)', color: mode === 'active' ? 'var(--color-accent)' : 'var(--color-text-2)', background: 'transparent', cursor: 'pointer' }}>Active Target Probe</button>
          </div>
        )}

        {!results && mode === 'passive' && (
          <UploadZone
            loading={loading}
            fileInputRef={fileInputRef}
            onFileChange={handleFileUpload}
            loadSample={loadSample}
          />
        )}

        {!results && mode === 'active' && (
          <ActiveProbeZone
            loading={loading}
            onProbe={handleProbe}
          />
        )}

        {results && (
          <div ref={resultsRef} className="results-grid">
            <RiskPanel risk={results.risk} />
            <PQCPanel pqc={results.pqc} />
            <LLMPanel
              remediation={results.remediation}
              onUseFallback={() => setResults({ ...results, remediation: lastSuccessfulRemediation! })}
              hasFallback={!!lastSuccessfulRemediation}
            />
            <AuditPanel audit={results.audit} />
          </div>
        )}

        <footer style={{
          marginTop: '64px',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border-dim)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-3)',
          letterSpacing: '0.02em',
        }}>
          Built for SIH 2026 · Problem Statement 26160 · NTRO · Blockchain & Cybersecurity
        </footer>
      </main>
      <SihDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} results={results} />

      {/* Keyframe for spinner and pulse — injected once */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        details > summary::-webkit-details-marker { display: none; }
        details > summary::marker { display: none; content: ''; }
        details[open] > summary svg { transform: rotate(90deg); }
        @media (max-width: 640px) {
          .sample-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          #panel-audit div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
    </>
  );
}

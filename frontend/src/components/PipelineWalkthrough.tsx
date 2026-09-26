/*
 * PipelineWalkthrough — Step-by-step guide to the 5-stage analysis pipeline.
 *
 * Key design decisions:
 * - PS-26160 language throughout (no marketing/SaaS phrasing)
 * - Step 2 (IKE Parsing) auto-loads a sample so judges do not need to
 *   upload a file first — the walkthrough is fully self-contained
 * - All risk/PQC severity badges use the sev() color system
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import type { AnalysisResult } from '../types';
import { api } from '../lib/api';
import { sev } from './ui';
import { X, ArrowRight, Check, CircleNotch } from '@phosphor-icons/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  results: AnalysisResult | null;
  loadSample: (filename: string) => Promise<void> | void;
}

export const PipelineWalkthrough = ({ isOpen, onClose, results }: Props) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [localResults, setLocalResults] = useState<AnalysisResult | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  /* Use external results if already loaded, otherwise use local */
  const activeResults = results || localResults;

  /* On open: animate in, reset to step 0 */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentStep(0);
      if (overlayRef.current) {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      }
      if (contentRef.current) {
        gsap.fromTo(contentRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' });
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* Step transition animation */
  useEffect(() => {
    if (stepRef.current && isOpen) {
      gsap.fromTo(stepRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    }
  }, [currentStep, isOpen]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && canProceed) handleNext();
      if (e.key === 'ArrowLeft' && currentStep > 0) handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, currentStep, onClose]);

  /* Auto-load sample when entering step 1 if no results yet */
  useEffect(() => {
    if (isOpen && currentStep === 1 && !activeResults && !isLoadingSample) {
      setIsLoadingSample(true);
      const sample = 'scenario_critical_legacy.pcap';
      (async () => {
        try {
          const resp = await fetch(`/${sample}`);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const file = new File([blob], sample, { type: 'application/vnd.tcpdump.pcap' });
          const res = await api.analyzePCAP(file);
          setLocalResults(res);
        } catch {
          /* Silently fall through — steps still render without results */
        } finally {
          setIsLoadingSample(false);
        }
      })();
    }
  }, [isOpen, currentStep, activeResults]);

  const STEPS = [
    {
      badge: 'INTRODUCTION',
      title: 'Pipeline Walkthrough',
      body: (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
          <p style={{ marginBottom: '12px' }}>
            This walkthrough covers the five pipeline stages:
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--color-text-1)' }}>
            <li>IKE Negotiation Parsing</li>
            <li>Risk Classification (XGBoost)</li>
            <li>Post-Quantum Readiness Assessment</li>
            <li>Configuration Compliance (NIST SP 800-77)</li>
            <li>Tamper-Evident Audit Trail</li>
          </ol>
        </div>
      ),
      action: 'Begin Walkthrough',
      canProceed: true,
    },
    {
      badge: 'STAGE 1 — IKE NEGOTIATION PARSING',
      title: 'Data Ingestion',
      body: (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
          {isLoadingSample ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-3)' }}>
              <CircleNotch size={16} weight="bold" style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-accent)' }} />
              Loading sample capture…
            </div>
          ) : activeResults ? (
            <>
              <p style={{ marginBottom: '12px' }}>
                The IKE parser (<code style={{ fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-raised)', padding: '1px 5px', fontSize: 'var(--text-xs)' }}>ike_parser.py</code>) extracted the
                following parameters from the capture using Scapy's IKEv2 and ISAKMP payload decoders:
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'var(--color-raised)',
                border: '1px solid var(--color-border-dim)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-1)',
              }}>
                <div>Protocol: <span style={{ color: 'var(--color-accent)' }}>{activeResults.ipsec_request.ike_version}</span></div>
                <div>Encryption: <span style={{ color: 'var(--color-accent)' }}>{activeResults.ipsec_request.encryption_algorithm}</span></div>
                <div>Hash: <span style={{ color: 'var(--color-accent)' }}>{activeResults.ipsec_request.hash_algorithm}</span></div>
                <div>DH Group: <span style={{ color: 'var(--color-accent)' }}>{activeResults.ipsec_request.dh_group}</span></div>
                <div>PFS: <span style={{ color: activeResults.ipsec_request.pfs_enabled ? 'var(--color-strong)' : 'var(--color-crit)' }}>
                  {activeResults.ipsec_request.pfs_enabled ? 'Enabled' : 'Disabled'}
                </span></div>
                <div>Mode: <span style={{ color: 'var(--color-accent)' }}>{activeResults.ipsec_request.operation_mode}</span></div>
              </div>
            </>
          ) : (
            <p>Upload a PCAP from the main page to see live extracted parameters here, or wait for the sample to load.</p>
          )}
        </div>
      ),
      action: 'View Risk Classification',
      canProceed: true,
    },
    {
      badge: 'STAGE 2 — XGBOOST RISK CLASSIFIER',
      title: 'Risk Classification',
      body: activeResults ? (() => {
        const s = sev(activeResults.risk.risk_label);
        return (
          <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
            <p style={{ marginBottom: '12px' }}>
              The XGBoost classifier evaluated the extracted parameters. SHAP values explain which factors drove the verdict.
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: s.fg, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                {activeResults.risk.risk_score.toFixed(1)}
              </span>
              <span style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>/100</span>
              <span style={{
                padding: '3px 10px',
                border: `1px solid ${s.border}`,
                backgroundColor: s.bg,
                color: s.fg,
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--font-heading)',
              }}>
                {activeResults.risk.risk_label}
              </span>
            </div>
            {activeResults.risk.flagged_issues.length > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', padding: '10px', border: `1px solid ${s.border}`, backgroundColor: s.bg, lineHeight: 1.5 }}>
                {activeResults.risk.flagged_issues[0]}
              </p>
            )}
          </div>
        );
      })() : <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>Load a PCAP on the main page to see results here.</p>,
      action: 'Post-Quantum Assessment',
      canProceed: true,
    },
    {
      badge: 'STAGE 3 — POST-QUANTUM READINESS',
      title: 'Post-Quantum Readiness Assessment',
      body: activeResults ? (() => {
        const pqcLabel = activeResults.pqc.pqc_status === 'Quantum-Safe' ? 'Strong' : activeResults.pqc.pqc_status === 'Unrecognized' ? 'Moderate' : 'Critical';
        const s = sev(pqcLabel);
        return (
          <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
            <p style={{ marginBottom: '12px' }}>
              The configuration was evaluated against proposed NIST FIPS 203 / IANA KEM identifiers. This is a heuristic — IANA identifiers for ML-KEM are still in draft.
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: s.fg, fontFamily: 'var(--font-heading)' }}>
                {activeResults.pqc.pqc_score}
              </span>
              <span style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>/100</span>
              <span style={{
                padding: '3px 10px',
                border: `1px solid ${s.border}`,
                backgroundColor: s.bg,
                color: s.fg,
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--font-heading)',
              }}>
                {activeResults.pqc.pqc_status}
              </span>
            </div>
          </div>
        );
      })() : <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>Load a PCAP on the main page to see results here.</p>,
      action: 'Configuration Compliance',
      canProceed: true,
    },
    {
      badge: 'STAGE 4 — CONFIGURATION COMPLIANCE',
      title: 'NIST SP 800-77 Configuration Compliance',
      body: activeResults ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
          <p style={{ marginBottom: '12px' }}>
            The compliance engine generated a NIST SP 800-77 compliant configuration patch based on the identified issues.
          </p>
          <div style={{
            padding: '10px 14px',
            border: '1px solid var(--color-border-dim)',
            backgroundColor: 'var(--color-raised)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-1)',
            lineHeight: 1.6,
            marginBottom: '12px',
          }}>
            {activeResults.remediation.explanation.substring(0, 180)}…
          </div>
          <div style={{
            padding: '8px 12px',
            border: '1px solid var(--color-weak-border)',
            backgroundColor: 'var(--color-weak-muted)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-weak)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <span>⚠</span>
            AI-generated — review before applying to production systems
          </div>
        </div>
      ) : <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>Load a PCAP on the main page to see results here.</p>,
      action: 'Audit Trail',
      canProceed: true,
    },
    {
      badge: 'STAGE 5 — TAMPER-EVIDENT AUDIT TRAIL',
      title: 'Immutable Audit Record',
      body: activeResults ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
          <p style={{ marginBottom: '12px' }}>
            The full analysis is persisted to a SQLite-backed Merkle tree. The report hash provides tamper-evident proof that this specific result has not been modified.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Hash</div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              padding: '10px 12px',
              border: '1px solid var(--color-border-dim)',
              color: 'var(--color-text-2)',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              {activeResults.audit.report_hash}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontStyle: 'italic' }}>
              Tamper-evident (SQLite Merkle tree), not tamper-proof against full DB replacement.
            </div>
          </div>
        </div>
      ) : <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>Load a PCAP on the main page to see results here.</p>,
      action: 'Close Walkthrough',
      canProceed: true,
    },
  ];

  const step = STEPS[currentStep];
  const canProceed = step.canProceed;

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) setCurrentStep((p) => p + 1);
    else onClose();
  }, [currentStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Pipeline Walkthrough"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9,9,11,0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={contentRef}
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border-dim)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <div className="font-heading" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-1)' }}>
              Pipeline Walkthrough
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '2px' }}>
              SIH 2026 · PS 26160 · Five-stage analysis pipeline
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close walkthrough"
            className="transition-default"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', padding: '4px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-3)')}
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: '4px' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '2px',
                background: i <= currentStep ? 'var(--color-accent)' : 'var(--color-border-dim)',
                transition: 'background 300ms ease',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div ref={stepRef} style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'var(--color-text-3)',
              textTransform: 'uppercase',
            }}>
              {step.badge}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>
          <h3 className="font-heading" style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-1)', fontWeight: 500, marginBottom: '14px' }}>
            {step.title}
          </h3>
          {step.body}
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border-dim)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="transition-default"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: currentStep === 0 ? 'var(--color-text-3)' : 'var(--color-text-2)',
              background: 'transparent',
              border: 'none',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              padding: '8px 0',
            }}
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="transition-default"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: canProceed ? 'var(--color-ground)' : 'var(--color-text-3)',
              background: canProceed ? 'var(--color-accent)' : 'var(--color-raised)',
              border: `1px solid ${canProceed ? 'var(--color-accent)' : 'var(--color-border)'}`,
              padding: '8px 20px',
              cursor: canProceed ? 'pointer' : 'not-allowed',
            }}
          >
            {step.action}
            {canProceed && currentStep < STEPS.length - 1
              ? <ArrowRight size={15} weight="bold" />
              : <Check size={15} weight="bold" />
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

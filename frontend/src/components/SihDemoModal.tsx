import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { AnalysisResult } from '../../types';
import { X, ArrowRight, Check } from '@phosphor-icons/react';

export const SihDemoModal = ({
  isOpen,
  onClose,
  results,
}: {
  isOpen: boolean;
  onClose: () => void;
  results: AnalysisResult | null;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(contentRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
      setCurrentStep(0);
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (stepRef.current && isOpen) {
      gsap.fromTo(stepRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentStep]); // handleNext and handlePrev rely on currentStep

  const steps = [
    {
      title: "Guided Tour: IPsec Sentinel",
      badge: "INTRODUCTION",
      content: (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p>
            This walkthrough covers the 5 pipeline stages: ingest, classify, quantum-assess, remediate, audit.
          </p>
        </div>
      ),
      action: "Start Tour",
      canProceed: true,
    },
    {
      title: "Data Ingestion & Parsing",
      badge: "STEP 1: UPLOAD",
      content: (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            To begin the analysis, we need a real-world enterprise VPN capture.
          </p>
          {results ? (
            <div style={{ padding: '12px', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
              Analysis loaded. Proceed to review.
            </div>
          ) : (
            <div style={{ padding: '12px', border: '1px solid var(--color-border-dim)' }}>
              Close this modal and upload a PCAP to continue.
            </div>
          )}
        </div>
      ),
      action: results ? "Review Risk Analysis" : "Waiting for Data...",
      canProceed: !!results,
    },
    {
      title: "AI / ML Risk Classification",
      badge: "STEP 2: XGBOOST MODEL",
      content: results ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            The machine learning pipeline has evaluated the uploaded capture.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-1)', fontFamily: 'var(--font-heading)' }}>
              {results.risk.risk_score.toFixed(1)}<span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-3)', fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ padding: '4px 8px', border: '1px solid var(--color-border)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {results.risk.risk_label}
            </div>
          </div>
          <p style={{ color: 'var(--color-text-1)', fontSize: 'var(--text-sm)' }}>
            {results.risk.flagged_issues[0] || 'No critical issues flagged.'}
          </p>
        </div>
      ) : null,
      action: "View Quantum Assessment",
      canProceed: true,
    },
    {
      title: "Post-Quantum Cryptography Assessment",
      badge: "STEP 3: NIST FIPS 203",
      content: results ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            The configuration was checked against upcoming PQC standards.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-1)', fontFamily: 'var(--font-heading)' }}>
              {results.pqc.pqc_score}<span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-3)', fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ padding: '4px 8px', border: '1px solid var(--color-border)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {results.pqc.pqc_status}
            </div>
          </div>
          <p style={{ color: 'var(--color-text-1)', fontSize: 'var(--text-sm)' }}>
            {results.pqc.pqc_status === 'Quantum-Safe'
              ? "Estimated to use quantum-resistant algorithms (Note: IANA identifiers for ML-KEM are still in draft)."
              : results.pqc.pqc_status === 'Unrecognized'
              ? "This key exchange group ID is not in our known classical or PQC identifier list. This may indicate a newer/vendor-specific value not yet mapped, not necessarily a vulnerability."
              : "This configuration relies on classical algorithms vulnerable to Shor's algorithm."}
          </p>
        </div>
      ) : null,
      action: "Review AI Remediation",
      canProceed: true,
    },
    {
      title: "AI Cyber Copilot Remediation",
      badge: "STEP 4: LLM COPILOT",
      content: results ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            The LLM generated a hardened, NIST SP 800-77 compliant replacement.
          </p>
          <div style={{ padding: '12px', border: '1px solid var(--color-border-dim)', marginBottom: '16px', fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>
            {results.remediation.explanation.substring(0, 150)}...
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-weak)', padding: '8px', border: '1px solid var(--color-weak-border)' }}>
            AI-generated — review before deploying
          </p>
        </div>
      ) : null,
      action: "View Audit Log",
      canProceed: true,
    },
    {
      title: "Immutable Audit Anchor",
      badge: "STEP 5: BLOCKCHAIN",
      content: results ? (
        <div style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '16px' }}>
            The entire analysis has been immutably recorded.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '4px', letterSpacing: '0.04em' }}>Report Hash</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', padding: '8px', border: '1px solid var(--color-border-dim)', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-2)' }}>
                {results.audit.report_hash}
              </div>
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-1)', fontWeight: 500 }}>
              Tamper-evident, cryptographically verified
            </span>
          </div>
        </div>
      ) : null,
      action: "Finish Tour",
      canProceed: true,
    }
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (!step.canProceed) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '600px',
          width: '100%',
          background: 'var(--color-surface)',
          padding: '32px',
          border: '1px solid var(--color-border)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-3)',
            cursor: 'pointer',
            padding: '4px'
          }}
          aria-label="Close"
          className="transition-default"
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-1)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-3)'}
        >
          <X size={20} weight="bold" />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '24px' }}>
          <div className="font-heading" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-1)' }}>Guided Demo</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '2px' }}>
            SIH 2026 · PS 26160
          </div>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '2px',
                background: i <= currentStep ? 'var(--color-accent)' : 'var(--color-border-dim)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Current Step Content */}
        <div ref={stepRef} style={{ padding: '24px', border: '1px solid var(--color-border-dim)', minHeight: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>
              {step.badge}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          <h3 className="font-heading" style={{ fontSize: 'var(--text-base)', marginBottom: '12px', color: 'var(--color-text-1)', fontWeight: 500 }}>{step.title}</h3>
          
          {step.content}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="transition-default"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: currentStep === 0 ? 'var(--color-text-3)' : 'var(--color-text-1)',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
            }}
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={!step.canProceed}
            className="transition-default"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: !step.canProceed ? 'var(--color-text-3)' : 'var(--color-ground)',
              background: !step.canProceed ? 'var(--color-raised)' : 'var(--color-accent)',
              border: '1px solid',
              borderColor: !step.canProceed ? 'var(--color-border)' : 'var(--color-accent)',
              padding: '8px 24px',
              cursor: !step.canProceed ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {step.action} 
            {step.canProceed && currentStep < steps.length - 1 && (
              <ArrowRight size={16} weight="bold" />
            )}
            {step.canProceed && currentStep === steps.length - 1 && (
              <Check size={16} weight="bold" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

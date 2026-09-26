import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { api } from './lib/api';
import type { AnalysisResult, RemediateResponse } from './types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dur, prefersReducedMotion, sev } from './components/ui';
import { RiskPanel } from './components/panels/RiskPanel';
import { PQCPanel } from './components/panels/PQCPanel';
import { LLMPanel } from './components/panels/LLMPanel';
import { AuditPanel } from './components/panels/AuditPanel';
import { PipelineWalkthrough } from './components/PipelineWalkthrough';
import { ReportExport } from './components/ReportExport';
import {
  X, UploadSimple, Target, ArrowCounterClockwise, Play,
  CircleNotch, CheckCircle, Warning, Desktop
} from '@phosphor-icons/react';

export interface AppProps {
  initialMode?: 'passive' | 'active' | 'demo';
  onGoHome?: () => void;
}

export interface AnalysisMetadata {
  sourceName: string;
  sourceType: 'file' | 'probe' | 'sample';
  timestamp: string;
}

/* ═══════════════════════════════════════════════════════
   Pipeline step labels (matches actual backend pipeline)
   ═══════════════════════════════════════════════════════ */
const PIPELINE_STEPS = [
  'Parsing IKE negotiation…',
  'Running risk classification…',
  'Assessing post-quantum readiness…',
  'Generating configuration compliance report…',
  'Writing audit trail…',
];

/* ─── Mode Tab ─── */
type AnalysisMode = 'passive' | 'active';

const ModeTab = ({
  label, icon, active, onClick, style
}: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void; style?: React.CSSProperties }) => (
  <button
    onClick={onClick}
    className="transition-default"
    aria-pressed={active}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      border: '1px solid',
      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
      color: active ? 'var(--color-accent)' : 'var(--color-text-2)',
      background: active ? 'rgba(45,212,191,0.06)' : 'transparent',
      cursor: 'pointer',
      fontSize: 'var(--text-sm)',
      fontWeight: 500,
      fontFamily: 'var(--font-sans)',
      ...style,
    }}
  >
    {icon}
    {label}
  </button>
);

/* ─── Pipeline Progress Bar ─── */
const PipelineProgress = ({ step, total }: { step: number; total: number }) => (
  <div role="status" aria-live="polite" aria-label={`Step ${step + 1} of ${total}: ${PIPELINE_STEPS[step]}`}>
    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
      {PIPELINE_STEPS.map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '2px',
            background: i <= step ? 'var(--color-accent)' : 'var(--color-border-dim)',
            transition: 'background 400ms ease',
          }}
        />
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-2)' }}>
      <CircleNotch
        size={16}
        weight="bold"
        style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-accent)', flexShrink: 0 }}
      />
      <span style={{ fontSize: 'var(--text-sm)' }}>{PIPELINE_STEPS[step]}</span>
    </div>
  </div>
);

/* ─── Scenario Cards ─── */
const SCENARIOS = [
  {
    file: 'scenario_critical_legacy.pcap',
    title: 'Critical Risk',
    desc: 'Legacy IKEv1 · DES · No PFS',
    sevLabel: 'Critical' as const,
  },
  {
    file: 'scenario_moderate_transition.pcap',
    title: 'Moderate Risk',
    desc: 'IKEv2 · AES-128 · Weak DH group',
    sevLabel: 'Moderate' as const,
  },
  {
    file: 'scenario_strong_modern.pcap',
    title: 'Low Risk',
    desc: 'IKEv2 · AES-256-GCM · Group 21 · PFS',
    sevLabel: 'Strong' as const,
  },
] as const;

const ScenarioCard = ({
  scenario,
  onClick,
  disabled,
}: {
  scenario: typeof SCENARIOS[number];
  onClick: () => void;
  disabled: boolean;
}) => {
  const s = sev(scenario.sevLabel);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-default"
      style={{
        textAlign: 'left',
        padding: '12px 16px',
        border: '1px solid var(--color-border-dim)',
        borderLeft: `3px solid ${s.fg}`,
        backgroundColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: disabled ? 0.5 : 1,
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-raised)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: s.fg, fontFamily: 'var(--font-heading)' }}>
        {scenario.title}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
        {scenario.desc}
      </span>
    </button>
  );
};

/* ─── Upload / Passive Zone ─── */
const PassiveZone = ({
  loading,
  step,
  fileInputRef,
  onFileChange,
  loadSample,
}: {
  loading: boolean;
  step: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadSample: (filename: string) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        type="file"
        accept=".pcap,.pcapng"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={onFileChange}
        id="pcap-upload"
        disabled={loading}
      />

      {/* Drop zone */}
      <label
        htmlFor="pcap-upload"
        className="transition-default"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: loading ? '32px 24px' : '48px 24px',
          border: `1px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          cursor: loading ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(45,212,191,0.04)' : 'transparent',
        }}
        tabIndex={loading ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0] && !loading && fileInputRef.current) {
            fileInputRef.current.files = e.dataTransfer.files;
            onFileChange({ target: fileInputRef.current } as any);
          }
        }}
      >
        {loading ? (
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <PipelineProgress step={step} total={PIPELINE_STEPS.length} />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '12px', color: isDragging ? 'var(--color-accent)' : 'var(--color-text-3)' }}>
              <UploadSimple weight="light" size={40} />
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: '4px' }}>
              {isDragging ? 'Drop file here' : 'Drop .pcap / .pcapng or click to browse'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
              Max 5 MB · IKEv1 and IKEv2 supported
            </span>
          </>
        )}
      </label>

      {/* Scenario presets */}
      {!loading && (
        <div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            Or load a sample scenario
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {SCENARIOS.map((s) => (
              <ScenarioCard key={s.file} scenario={s} onClick={() => loadSample(s.file)} disabled={loading} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Active Probe Zone ─── */
const ActiveProbeZone = ({
  loading,
  step,
  onProbe,
}: {
  loading: boolean;
  step: number;
  onProbe: (ip: string, auth: string) => void;
}) => {
  const [ip, setIp] = useState('');
  const [auth, setAuth] = useState('');
  const [checked, setChecked] = useState(false);

  const canSubmit = !loading && checked && auth === 'I AM AUTHORIZED' && ip.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Legal warning */}
      <div style={{
        padding: '12px 16px',
        border: '1px solid var(--color-crit-border)',
        backgroundColor: 'var(--color-crit-muted)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}>
        <Warning size={16} weight="bold" color="var(--color-crit)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-crit)', margin: 0, lineHeight: 1.5 }}>
          <strong>WARNING:</strong> This sends real IKEv2 SA_INIT packets. Unauthorized scanning is prohibited
          under India's IT Act (Sections 43 &amp; 66) and equivalent laws. Default restriction: RFC1918 private IPs
          only. Only probe targets you own or have explicit written authorization to test.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '24px' }}>
          <PipelineProgress step={step} total={PIPELINE_STEPS.length} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="probe-ip" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
              Target IP Address
            </label>
            <input
              id="probe-ip"
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.10"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-1)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              I certify that I am the owner of this target or have explicit written authorization to perform
              security assessment against it.
            </span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="probe-auth" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
              Type <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-raised)', padding: '1px 6px' }}>I AM AUTHORIZED</code> to confirm
            </label>
            <input
              id="probe-auth"
              type="text"
              value={auth}
              onChange={(e) => setAuth(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: `1px solid ${auth === 'I AM AUTHORIZED' ? 'var(--color-strong)' : 'var(--color-border)'}`,
                color: 'var(--color-text-1)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <button
            onClick={() => onProbe(ip.trim(), auth)}
            disabled={!canSubmit}
            className="transition-default"
            style={{
              padding: '10px 20px',
              backgroundColor: canSubmit ? 'var(--color-crit)' : 'transparent',
              color: canSubmit ? '#000' : 'var(--color-text-3)',
              border: `1px solid ${canSubmit ? 'var(--color-crit)' : 'var(--color-border-dim)'}`,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            <Target size={16} weight="bold" />
            Send Active Probe
          </button>
        </>
      )}
    </div>
  );
};

/* ─── Error Banner ─── */
const ErrorBanner = ({
  message,
  onDismiss,
  onRetry,
}: { message: string; onDismiss: () => void; onRetry?: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current && !prefersReducedMotion()) {
      gsap.fromTo(ref.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      style={{
        marginBottom: '24px',
        padding: '12px 16px',
        border: '1px solid var(--color-crit-border)',
        backgroundColor: 'var(--color-crit-muted)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <X size={18} weight="bold" color="var(--color-crit)" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-crit)' }}>
          Analysis failed
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginTop: '2px', lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            className="transition-default"
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-1)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="transition-default"
          style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-3)' }}
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

/* ─── Results Summary Bar ─── */
const ResultsSummaryBar = ({
  results,
  metadata,
  onReset,
}: {
  results: AnalysisResult;
  metadata: AnalysisMetadata;
  onReset: () => void;
}) => {
  const s = sev(results.risk.risk_label);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '10px 16px',
      backgroundColor: 'var(--color-raised)',
      border: '1px solid var(--color-border)',
      marginBottom: '16px',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <CheckCircle size={16} weight="fill" color="var(--color-strong)" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {metadata.sourceName}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>·</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
          {new Date(metadata.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div style={{
        padding: '2px 10px',
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        color: s.fg,
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {results.risk.risk_label} · {results.risk.risk_score.toFixed(1)}/100
      </div>
      <button
        onClick={onReset}
        className="transition-default report-hide-print"
        aria-label="Start new analysis"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--color-text-2)',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          padding: '4px 12px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'}
      >
        <ArrowCounterClockwise size={14} weight="bold" />
        New Analysis
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main App — Single Page
   ═══════════════════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

export default function App({ initialMode = 'passive', onGoHome }: AppProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<AnalysisMode>(initialMode === 'demo' ? 'passive' : initialMode);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(initialMode === 'demo');
  const [error, setError] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<(() => void) | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [metadata, setMetadata] = useState<AnalysisMetadata | null>(null);
  const [lastSuccessfulRemediation, setLastSuccessfulRemediation] = useState<RemediateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  /* Header entrance */
  useLayoutEffect(() => {
    if (headerRef.current && !prefersReducedMotion()) {
      gsap.fromTo(headerRef.current, { opacity: 0 }, { opacity: 1, duration: dur(0.4), ease: 'power2.out' });
    }
  }, []);

  /* Pipeline step ticker while loading */
  useEffect(() => {
    if (!loading) { setStep(0); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < PIPELINE_STEPS.length) setStep(i);
    }, 700);
    return () => clearInterval(iv);
  }, [loading]);

  /* Stagger-reveal results panels */
  useEffect(() => {
    if (!results || !resultsRef.current) return;
    if (!prefersReducedMotion()) {
      const panels = resultsRef.current.querySelectorAll('.panel-hidden');
      panels.forEach((panel) => {
        gsap.fromTo(
          panel,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 92%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }
    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, [results]);

  /* ── Analysis handlers ── */
  const handleSuccess = (res: AnalysisResult) => {
    setResults(res);
    if (!res.remediation.explanation.includes('Remediation unavailable')) {
      setLastSuccessfulRemediation(res.remediation);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const meta: AnalysisMetadata = { sourceName: file.name, sourceType: 'file', timestamp: new Date().toISOString() };
    setMetadata(meta);
    setLoading(true);
    setError(null);
    setResults(null);
    const retryFn = () => handleFileUpload(e);
    setLastIntent(() => retryFn);
    try {
      handleSuccess(await api.analyzePCAP(file));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadSample = useCallback(async (filename: string) => {
    const meta: AnalysisMetadata = { sourceName: filename, sourceType: 'sample', timestamp: new Date().toISOString() };
    setMetadata(meta);
    setLoading(true);
    setError(null);
    setResults(null);
    setLastIntent(() => () => loadSample(filename));
    try {
      const resp = await fetch(`/${filename}`);
      if (!resp.ok) throw new Error(`Failed to fetch sample: ${filename}`);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: 'application/vnd.tcpdump.pcap' });
      handleSuccess(await api.analyzePCAP(file));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProbe = async (ip: string, auth: string) => {
    const meta: AnalysisMetadata = { sourceName: `Live probe: ${ip}`, sourceType: 'probe', timestamp: new Date().toISOString() };
    setMetadata(meta);
    setLoading(true);
    setError(null);
    setResults(null);
    const retryFn = () => handleProbe(ip, auth);
    setLastIntent(() => retryFn);
    try {
      handleSuccess(await api.probeTarget(ip, auth, true));
    } catch (err: any) {
      setError(err.message || 'Active probe failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setMetadata(null);
    setLastIntent(null);
    ScrollTrigger.getAll().forEach((t) => t.kill());
  };

  return (
    <>
      <div style={{ minHeight: '100vh', padding: '0 16px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <header
          ref={headerRef}
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px 0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border-dim)',
            marginBottom: '32px',
            opacity: 0,
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1
              className="font-heading"
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 600,
                color: 'var(--color-text-1)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              IPsec VPN Protocol Analyzer
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', letterSpacing: '0.04em' }}>
              SIH 2026 · PS 26160 · NTRO · Blockchain &amp; Cybersecurity
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsWalkthroughOpen(true)}
              className="transition-default report-hide-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-2)',
                backgroundColor: 'transparent',
                padding: '7px 14px',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'}
            >
              <Play size={13} weight="bold" />
              Pipeline Walkthrough
            </button>
            {results && metadata && (
              <ReportExport results={results} metadata={metadata} />
            )}
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

          {/* Error banner */}
          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
              onRetry={lastIntent ?? undefined}
            />
          )}

          {/* Input zone — shown until results appear */}
          {!results && (
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '24px', width: '100%' }}>
                <ModeTab
                  label="Passive PCAP Analysis"
                  icon={<UploadSimple size={15} weight="bold" />}
                  active={mode === 'passive'}
                  onClick={() => setMode('passive')}
                  style={{ flex: 1, justifyContent: 'center' }}
                />
                <ModeTab
                  label="Homepage"
                  icon={<Desktop size={15} weight="bold" />}
                  active={false}
                  onClick={() => onGoHome?.()}
                  style={{ flex: 1, justifyContent: 'center' }}
                />
                <ModeTab
                  label="Active IKE Probe"
                  icon={<Target size={15} weight="bold" />}
                  active={mode === 'active'}
                  onClick={() => setMode('active')}
                  style={{ flex: 1, justifyContent: 'center' }}
                />
              </div>

              {/* Mode description */}
              <p style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-3)',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}>
                {mode === 'passive'
                  ? 'Upload a packet capture file (.pcap / .pcapng) containing IKE negotiation traffic. No packets are sent — analysis is fully offline.'
                  : 'Send a real IKEv2 SA_INIT packet to a target gateway (UDP 500) and analyse the live response. Requires explicit authorization.'}
              </p>

              {mode === 'passive' ? (
                <PassiveZone
                  loading={loading}
                  step={step}
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileUpload}
                  loadSample={loadSample}
                />
              ) : (
                <ActiveProbeZone loading={loading} step={step} onProbe={handleProbe} />
              )}
            </div>
          )}

          {/* Results zone */}
          {results && metadata && (
            <>
              <ResultsSummaryBar results={results} metadata={metadata} onReset={handleReset} />
              <div ref={resultsRef} className="results-grid">
                <RiskPanel risk={results.risk} ipsec={results.ipsec_request} />
                <PQCPanel pqc={results.pqc} />
                <LLMPanel
                  remediation={results.remediation}
                  onUseFallback={() => setResults({ ...results, remediation: lastSuccessfulRemediation! })}
                  hasFallback={!!lastSuccessfulRemediation}
                />
                <AuditPanel audit={results.audit} />
              </div>

              {/* Bottom report export — always visible */}
              <div style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-border-dim)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}>
                <ReportExport results={results} metadata={metadata} />
                <button
                  onClick={handleReset}
                  className="transition-default report-hide-print"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--color-text-2)',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    padding: '8px 16px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'}
                >
                  <ArrowCounterClockwise size={14} weight="bold" />
                  New Analysis
                </button>
              </div>
            </>
          )}
        </main>

        {/* ── Footer ── */}
        <footer style={{
          maxWidth: '1200px',
          margin: '64px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border-dim)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-3)',
          letterSpacing: '0.04em',
        }}>
          Smart India Hackathon 2026 · Problem Statement 26160 · NTRO · Blockchain &amp; Cybersecurity · Team K26090
        </footer>
      </div>

      {/* Pipeline Walkthrough modal */}
      <PipelineWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        results={results}
        loadSample={loadSample}
      />

      {/* Global keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        details > summary::-webkit-details-marker { display: none; }
        details > summary::marker { display: none; content: ''; }
        details[open] > summary svg { transform: rotate(90deg); }
        @media (max-width: 640px) {
          .results-grid > section { grid-column: span 12 !important; }
        }
      `}</style>
    </>
  );
}

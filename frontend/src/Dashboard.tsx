import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from './lib/api';
import gsap from 'gsap';
import { prefersReducedMotion } from './components/ui';

/*
 * ═══════════════════════════════════════════════════════════════
 *  IPsec VPN Protocol Analyzer — Dashboard Landing
 *
 *  PURPOSE: Lightweight pre-analysis home screen. Gives users
 *  context and three clearly-labelled quick-launch buttons
 *  (Upload PCAP, Active Probe, Guided Demo) before they enter
 *  the dense analysis console.
 *
 *  Design tokens: 100% from existing index.css — no new values.
 *  Motion: GSAP hover micro-interactions only (event-driven).
 *    No mount-time opacity animations — they are unreliable in
 *    React 18 StrictMode due to double-invocation of effects.
 *    All content renders visible immediately from the server/
 *    initial paint. A single CSS fade-in handles entrance.
 *
 *  SAFETY: Purely additive. No import from App.tsx or any
 *  existing panel. Only backend call: GET /health (read-only).
 * ═══════════════════════════════════════════════════════════════
 */

/* ── Navigation helpers ── */
function goToConsole(mode?: 'passive' | 'active' | 'demo') {
  window.location.hash = mode ? `#/console?mode=${mode}` : '#/console';
}

import { UploadSimple, Target, Play, ArrowRight } from '@phosphor-icons/react';

/* ── Health dot ── */

type HealthStatus = 'checking' | 'online' | 'offline';

function HealthDot({ status }: { status: HealthStatus }) {
  const dotColor =
    status === 'online'  ? 'var(--color-strong)' :
    status === 'offline' ? 'var(--color-crit)'   : 'var(--color-text-3)';

  const label =
    status === 'checking' ? 'Backend: checking…' :
    status === 'online'   ? 'Backend: online'     : 'Backend: offline';

  return (
    <span
      role="status"
      aria-label={label}
      aria-atomic="true"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
    >
      <span aria-hidden="true" style={{
        display: 'inline-block',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: dotColor,
        flexShrink: 0,
        /* Pulse only when online; disabled under reduced motion via @media */
        animation: status === 'online' ? 'dashHealthPulse 2.4s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)' }}>
        {status === 'checking' ? 'Checking…' : status === 'online' ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}

/* ── Stat card ── */

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 18px',
      border: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '7px',
    }}>
      {/* Label: use text-2 (not text-3) for legibility on dark bg */}
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-2)',
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/* ── Quick-launch button ── */

interface LaunchButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  accentColor: string;
  onClick: () => void;
}

function LaunchButton({ id, icon, label, sublabel, accentColor, onClick }: LaunchButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const enter = () => {
    if (ref.current) {
      ref.current.style.borderColor = accentColor;
      ref.current.style.backgroundColor = 'rgba(255,255,255,0.02)';
      if (!prefersReducedMotion()) {
        gsap.to(ref.current, { y: -2, duration: 0.18, ease: 'power2.out' });
      }
    }
  };

  const leave = () => {
    if (ref.current) {
      ref.current.style.borderColor = 'var(--color-border)';
      ref.current.style.backgroundColor = 'transparent';
      if (!prefersReducedMotion()) {
        gsap.to(ref.current, { y: 0, duration: 0.18, ease: 'power2.out' });
      }
    }
  };

  return (
    <button
      id={id}
      ref={ref}
      onClick={onClick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className="transition-default"
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '18px 20px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: 'inherit',
      }}
    >
      {/* Icon badge */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        border: `1px solid ${accentColor}`,
        color: accentColor,
        flexShrink: 0,
      }} aria-hidden="true">
        {icon}
      </span>

      {/* Text block */}
      <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-1)',
          fontFamily: 'var(--font-heading)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {label}
          <ArrowRight weight="bold" size={14} />
        </span>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-2)',
          lineHeight: 1.45,
        }}>
          {sublabel}
        </span>
      </span>
    </button>
  );
}

/* ── Toggle ── */

interface ToggleProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ id, label, hint, checked, onChange }: ToggleProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '12px 0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label htmlFor={id} style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-2)',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', lineHeight: 1.4 }}>
            {hint}
          </span>
        )}
      </div>

      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        {/* Native input — positioned over track for hit-testing */}
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '36px',
            height: '20px',
            cursor: 'pointer',
            zIndex: 1,
            margin: 0,
          }}
        />
        {/* Visual track */}
        <span aria-hidden="true" style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
          padding: '2px',
          transition: 'background-color 180ms',
          pointerEvents: 'none',
        }}>
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: checked ? '#000' : 'var(--color-text-3)',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 180ms cubic-bezier(0.4,0,0.2,1), background-color 180ms',
          }} />
        </span>
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Dashboard — main export
   ════════════════════════════════════════════════════ */

export function Dashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking');
  const [liveHealthEnabled, setLiveHealthEnabled] = useState(true);

  /* Health ping — useEffect so it runs client-side only */
  useEffect(() => {
    if (!liveHealthEnabled) {
      setHealthStatus('offline');
      return;
    }
    setHealthStatus('checking');
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (!cancelled) setHealthStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setHealthStatus('offline');
      }
    };

    ping();
    const interval = setInterval(ping, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [liveHealthEnabled]);

  return (
    <>
      <style>{`
        /*
         * CSS fade-in for the whole page — avoids the GSAP StrictMode
         * double-invocation bug that was leaving elements at opacity:0.
         * All content is visible immediately; this is purely cosmetic.
         */
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes dashFadeIn { from { opacity:1; } to { opacity:1; } }
        }
        .dash-page {
          animation: dashFadeIn 0.35s ease-out both;
        }

        /* Pulse animation for the health dot */
        @keyframes dashHealthPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes dashHealthPulse { from { opacity:1; } to { opacity:1; } }
        }

        /* Stat grid removed in favor of simple flex column in the right sidebar */
      `}</style>

      <div className="dash-page" style={{ minHeight: '100vh', padding: '32px 16px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <header style={{
          maxWidth: '880px',
          margin: '0 auto 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span className="font-heading" style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-text-1)',
            letterSpacing: '-0.01em',
          }}>
            IPsec VPN Protocol Analyzer
          </span>

          <button
            id="dash-header-console"
            onClick={() => goToConsole()}
            className="transition-default"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--color-text-2)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              padding: '6px 14px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-2)';
            }}
          >
            Console
            <ArrowRight weight="bold" size={14} />
          </button>
        </header>

        {/* ── Main ── */}
        <main style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', gap: '64px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Left Column (Primary Actions) ── */}
          <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            {/* ── Hero ── */}
            <div style={{ marginBottom: '48px' }}>
              <h1 className="font-heading" style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 600,
                color: 'var(--color-text-1)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                marginBottom: '10px',
              }}>
                Analyse IPsec VPN security.<br />
                <span style={{ color: 'var(--color-accent)' }}>Post-quantum ready.</span>
              </h1>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-2)',
                lineHeight: 1.6,
                maxWidth: '480px',
              }}>
                Upload a packet capture or probe a live target. Get a risk score, PQC readiness report, AI-generated remediation, and a tamper-evident audit record.
              </p>
            </div>

            {/* ── Analysis mode selection ── */}
            <p style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--color-text-2)',
              marginBottom: '10px',
            }}>
              Choose your analysis mode
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '36px' }}>
              <LaunchButton
                id="dash-launch-passive"
                icon={<UploadSimple weight="regular" size={20} />}
                label="Upload PCAP"
                sublabel="Drop a .pcap or .pcapng — offline analysis, no traffic sent"
                accentColor="var(--color-mod)"
                onClick={() => goToConsole('passive')}
              />
              <LaunchButton
                id="dash-launch-active"
                icon={<Target weight="regular" size={20} />}
                label="Active Probe"
                sublabel="Send live IKE handshakes to a target you own and are authorized to test"
                accentColor="var(--color-weak)"
                onClick={() => goToConsole('active')}
              />
              <LaunchButton
                id="dash-launch-demo"
                icon={<Play weight="regular" size={20} />}
                label="Guided Demo"
                sublabel="Walk through a pre-loaded critical-risk scenario with step-by-step explanations"
                accentColor="var(--color-accent)"
                onClick={() => goToConsole('demo')}
              />
            </div>
          </div>

          {/* ── Right Column (Secondary / Meta) ── */}
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* ── Status column ── */}
            <div>
              <p style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--color-text-2)',
                marginBottom: '12px',
              }}>
                System Status
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <StatCard label="Backend">
                  <HealthDot status={healthStatus} />
                </StatCard>
                <StatCard label="Protocols">
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-1)', fontFamily: 'var(--font-mono)' }}>
                    IKEv1 · IKEv2
                  </span>
                </StatCard>
                <StatCard label="Standard">
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-1)', fontFamily: 'var(--font-mono)' }}>
                    NIST SP 800-77r1
                  </span>
                </StatCard>
              </div>
            </div>

            {/* ── Preferences ── */}
            <div>
              <p style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--color-text-2)',
                marginBottom: '4px',
              }}>
                Preferences
              </p>

              <Toggle
                id="toggle-live-health"
                label="Live health polling"
                hint="Pings /health every 30 s"
                checked={liveHealthEnabled}
                onChange={setLiveHealthEnabled}
              />
            </div>

          </div>

        </main>
        
        {/* ── Footer ── */}
        <footer style={{
          maxWidth: '880px',
          margin: '0 auto',
          marginTop: '64px',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border-dim)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-3)',
          letterSpacing: '0.02em',
        }}>
          Built for SIH 2026 · Problem Statement 26160 · NTRO · Blockchain &amp; Cybersecurity
        </footer>
      </div>
    </>
  );
}

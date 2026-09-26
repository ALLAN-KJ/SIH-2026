import React from 'react';

/* ── Motion Utilities ── */

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const dur = (d: number) => prefersReducedMotion() ? 0 : d;

/* ── Severity Token Mapping ── */

export type Sev = {
  fg: string;     // foreground color for text/numbers
  bg: string;     // muted background
  border: string; // border color
};

export const SEV_MAP: Record<string, Sev> = {
  Critical: {
    fg:     'var(--color-crit)',
    bg:     'var(--color-crit-muted)',
    border: 'var(--color-crit-border)',
  },
  Weak: {
    fg:     'var(--color-weak)',
    bg:     'var(--color-weak-muted)',
    border: 'var(--color-weak-border)',
  },
  Moderate: {
    fg:     'var(--color-mod)',
    bg:     'var(--color-mod-muted)',
    border: 'var(--color-mod-border)',
  },
  Strong: {
    fg:     'var(--color-strong)',
    bg:     'var(--color-strong-muted)',
    border: 'var(--color-strong-border)',
  },
  'Normal (No VPN)': {
    fg:     'var(--color-text-2)',
    bg:     'var(--color-surface)',
    border: 'var(--color-border)',
  },
  High: {
    fg:     'var(--color-weak)',
    bg:     'var(--color-weak-muted)',
    border: 'var(--color-weak-border)',
  },
  Medium: {
    fg:     'var(--color-mod)',
    bg:     'var(--color-mod-muted)',
    border: 'var(--color-mod-border)',
  },
  Low: {
    fg:     'var(--color-strong)',
    bg:     'var(--color-strong-muted)',
    border: 'var(--color-strong-border)',
  },
};

export const DEFAULT_SEV: Sev = {
  fg:     'var(--color-text-3)',
  bg:     'var(--color-surface)',
  border: 'var(--color-border)',
};

export const sev = (label: string): Sev => SEV_MAP[label] ?? DEFAULT_SEV;

/* ═══════════════════════════════════════════════════════
   Primitives — design tokens enforced here, not inline
   ═══════════════════════════════════════════════════════ */

export const Card = ({ children, className = '', id, style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) => (
  <section
    id={id}
    className={`panel-hidden ${className}`}
    style={{
      backgroundColor: 'transparent',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
      ...style
    }}
  >
    {children}
  </section>
);

export const CardHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div style={{
    padding: '16px 24px',
    borderBottom: '1px solid var(--color-border-dim)',
  }}>
    <h2
      className="font-heading"
      style={{
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--text-sm--line-height)',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-2)',
        margin: 0,
      }}
    >
      {title}
    </h2>
    {subtitle && (
      <p style={{
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--text-xs--line-height)',
        color: 'var(--color-text-3)',
        marginTop: '4px',
      }}>
        {subtitle}
      </p>
    )}
  </div>
);

export const Overline = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    fontSize: 'var(--text-xs)',
    lineHeight: 'var(--text-xs--line-height)',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-3)',
  }}>
    {children}
  </span>
);

export const SevBadge = ({ label, sev: s }: { label: string; sev: Sev }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    border: `1px solid ${s.border}`,
    backgroundColor: s.bg,
    color: s.fg,
  }}>
    {label}
  </span>
);

export const Mono = ({ children, style: extraStyle }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span className="font-mono" style={{
    fontSize: 'var(--text-sm)',
    lineHeight: 'var(--text-sm--line-height)',
    ...extraStyle,
  }}>
    {children}
  </span>
);

export const HelperNote = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: '4px' }}>
    ({children})
  </div>
);

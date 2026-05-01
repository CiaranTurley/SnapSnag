'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

// ─── Loading ──────────────────────────────────────────────────────────────────

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0F1A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#00C9A7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-ring 2s ease-in-out infinite' }}>
        <svg width="26" height="22" viewBox="0 0 32 28" fill="none">
          <rect x="1" y="7" width="30" height="20" rx="4" stroke="white" strokeWidth="2" fill="none"/>
          <circle cx="16" cy="17" r="6" stroke="white" strokeWidth="2" fill="none"/>
          <circle cx="16" cy="17" r="3" fill="white"/>
        </svg>
      </div>
      <div className="spinner" />
      <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{message}</p>
    </div>
  )
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 16 : size === 'lg' ? 36 : 24
  const b = size === 'sm' ? 2 : 2.5
  return (
    <div style={{
      width: s, height: s,
      border: `${b}px solid rgba(0,201,167,0.2)`,
      borderTopColor: '#00C9A7',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ─── Error ────────────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card-danger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
      <XCircle size={36} color="#FF4D4F" />
      <h3 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 18, color: '#FAFAF8' }}>
        Something went wrong
      </h3>
      {message && (
        <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary" style={{ marginTop: 8 }}>
          <RefreshCw size={15} /> Try again
        </button>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon, heading, body, cta, ctaHref,
}: {
  icon: ReactNode
  heading: string
  body?: string
  cta?: string
  ctaHref?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#FAFAF8' }}>{heading}</h3>
      {body && <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 320, lineHeight: 1.6 }}>{body}</p>}
      {cta && ctaHref && (
        <Link href={ctaHref} className="btn-primary" style={{ marginTop: 8 }}>{cta}</Link>
      )}
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title, backHref, action,
}: {
  title: string
  backHref?: string
  action?: ReactNode
}) {
  return (
    <div style={{
      background: '#0A0F1A', borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ width: 80 }}>
        {backHref && (
          <Link href={backHref} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <ChevronLeft size={16} /> Back
          </Link>
        )}
      </div>
      <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 18, color: '#FAFAF8', textAlign: 'center' }}>
        {title}
      </h1>
      <div style={{ width: 80, display: 'flex', justifyContent: 'flex-end' }}>
        {action}
      </div>
    </div>
  )
}

// ─── Alert inline ─────────────────────────────────────────────────────────────

export function Alert({ type = 'error', children }: { type?: 'error' | 'success' | 'warning'; children: ReactNode }) {
  const styles = {
    error:   { bg: 'rgba(255,77,79,0.08)',   border: 'rgba(255,77,79,0.2)',   color: '#FF4D4F', icon: <AlertCircle size={16} /> },
    success: { bg: 'rgba(0,214,143,0.08)',   border: 'rgba(0,214,143,0.2)',  color: '#00D68F', icon: <AlertCircle size={16} /> },
    warning: { bg: 'rgba(255,179,64,0.08)',  border: 'rgba(255,179,64,0.2)', color: '#FFB340', icon: <AlertCircle size={16} /> },
  }
  const s = styles[type]
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 10, padding: '12px 16px',
      fontFamily: 'var(--font-space-grotesk)', fontSize: 14, lineHeight: 1.5,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ─── Pill badge ───────────────────────────────────────────────────────────────

export function Pill({ children, variant = 'teal' }: { children: ReactNode; variant?: 'teal' | 'pass' | 'fail' | 'amber' | 'na' }) {
  const cls = {
    teal:  'badge-teal',
    pass:  'badge-pass',
    fail:  'badge-fail',
    amber: 'badge-amber',
    na:    'badge-na',
  }
  return <span className={cls[variant]}>{children}</span>
}

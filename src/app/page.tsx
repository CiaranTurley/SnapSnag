'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Smartphone, FileText, X, Menu, Check } from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'
import { type CountryCode } from '@/lib/countryConfig'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Data ─────────────────────────────────────────────────────────────────────

const AVG_REPAIR_COST: Record<CountryCode, string> = {
  IE: '€3,000', UK: '£2,600', AU: 'A$5,000', US: '$3,200', CA: 'C$4,200',
}

const COUNTRIES = [
  { code: 'IE', flag: '🇮🇪', name: 'Ireland',        domain: 'snapsnag.ie' },
  { code: 'UK', flag: '🇬🇧', name: 'United Kingdom', domain: 'snapsnag.co.uk' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia',      domain: 'snapsnag.com.au' },
  { code: 'US', flag: '🇺🇸', name: 'United States',  domain: 'snapsnagapp.com' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada',         domain: 'snapsnag.ca' },
]

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#00C9A7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="10" cy="10" r="3" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M13 5.5l1.5-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 9.5l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20 }}>
        <span style={{ color: '#FAFAF8' }}>Snap</span><span style={{ color: '#00C9A7' }}>Snag</span>
      </span>
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function HomePageInner() {
  const { countryCode, config } = useCountry()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [inspectionCount, setInspectionCount] = useState<number | null>(null)
  const [billingAnnual, setBillingAnnual] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('snapsnag_ref', ref.toUpperCase())
  }, [searchParams])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    async function fetchCount() {
      const { count } = await supabase.from('inspections').select('*', { count: 'exact', head: true })
      if (count !== null) setInspectionCount(count)
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  const monthlyPrice  = (config.expertMonthly / 100).toFixed(2)
  const annualTotal   = (config.expertAnnual  / 100).toFixed(2)
  const annualMonthly = (config.expertAnnual  / 100 / 12).toFixed(2)
  const annualSaving  = ((config.expertMonthly * 12 - config.expertAnnual) / 100).toFixed(2)
  const sym = config.symbol

  return (
    <div style={{ background: '#0A0F1A', minHeight: '100vh', color: '#FAFAF8' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,15,26,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', height: 64,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />

          {/* Desktop */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
            <Link href="/login" style={{
              fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '9px 18px',
              textDecoration: 'none', transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.target as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
            >
              Expert Login
            </Link>
            <Link href="/inspect/start" style={{
              fontFamily: 'var(--font-space-grotesk)', fontSize: 14, fontWeight: 700,
              background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '9px 20px',
              textDecoration: 'none', boxShadow: '0 0 24px rgba(0,201,167,0.35)',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => (e.target as HTMLElement).style.filter = 'brightness(1.1)'}
              onMouseLeave={e => (e.target as HTMLElement).style.filter = 'brightness(1)'}
            >
              Start Free Inspection
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div style={{
            position: 'fixed', inset: 0, top: 64, background: '#0A0F1A', zIndex: 99,
            display: 'flex', flexDirection: 'column', padding: 24, gap: 12,
          }}>
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{
              fontFamily: 'var(--font-space-grotesk)', fontSize: 15, color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 20px',
              textDecoration: 'none', textAlign: 'center', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>Expert Login</Link>
            <Link href="/inspect/start" onClick={() => setMenuOpen(false)} style={{
              fontFamily: 'var(--font-space-grotesk)', fontSize: 15, fontWeight: 700,
              background: '#00C9A7', color: '#0A0F1A', borderRadius: 12, padding: '14px 20px',
              textDecoration: 'none', textAlign: 'center', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(0,201,167,0.35)',
            }}>Start Free Inspection</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Animated grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,201,167,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,167,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          animation: 'gridMove 30s linear infinite',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 600, height: 600, pointerEvents: 'none',
          background: 'radial-gradient(circle at top right, rgba(0,201,167,0.08) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1152, margin: '0 auto', padding: '80px 24px', width: '100%' }}>
          <div style={{ maxWidth: 640 }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)',
              borderRadius: 999, padding: '6px 14px', marginBottom: 24,
            }}>
              <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00C9A7' }}>
                New Home Inspector
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, lineHeight: 1.1, marginBottom: 24, color: '#FAFAF8', fontSize: 'clamp(38px, 5.5vw, 68px)' }}>
              Inspect your new home<br />
              <span style={{ color: '#00C9A7' }}>yourself</span>
            </h1>

            {/* Subheadline */}
            <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 19, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 36 }}>
              Get a professional snagging report for <strong style={{ color: '#00C9A7' }}>{config.oneTimePriceDisplay}</strong> instead of paying <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{config.professionalPrice}</strong> for a surveyor.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
              <Link href="/inspect/start" style={{
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 16,
                background: '#00C9A7', color: '#0A0F1A', borderRadius: 10,
                padding: '14px 28px', textDecoration: 'none', minHeight: 52,
                display: 'inline-flex', alignItems: 'center',
                boxShadow: '0 0 24px rgba(0,201,167,0.35)', transition: 'all 0.2s ease',
              }}>
                Start Free Inspection
              </Link>
              <Link href="/sample-report" style={{
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 600, fontSize: 16,
                background: 'transparent', color: '#FAFAF8',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                padding: '14px 28px', textDecoration: 'none', minHeight: 52,
                display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s ease',
              }}>
                View Sample Report
              </Link>
            </div>

            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {COUNTRIES.map(c => <span key={c.code} style={{ fontSize: 18 }}>{c.flag}</span>)}
              </div>
              <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {inspectionCount !== null
                  ? <><strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{inspectionCount.toLocaleString()}</strong> inspections completed across 5 countries</>
                  : 'Inspections completed across 5 countries'
                }
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '100px 0' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
          {/* Label */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)',
              borderRadius: 999, padding: '6px 14px',
            }}>
              <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00C9A7' }}>
                How It Works
              </span>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 60 }}>
            Three steps to your professional report
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              {
                step: '01', icon: <ClipboardList size={22} color="#00C9A7" />,
                title: 'Answer questions about your home',
                body: 'Takes 2 minutes. We build a custom checklist just for your property type and what\'s included in your contract.',
              },
              {
                step: '02', icon: <Smartphone size={22} color="#00C9A7" />,
                title: 'Walk through every room',
                body: 'Photograph defects, record voice notes, mark each item as Pass, Fail or N/A. Takes 2–3 hours.',
              },
              {
                step: '03', icon: <FileText size={22} color="#00C9A7" />,
                title: 'Download your PDF report instantly',
                body: 'Professional solicitor-ready report with all your photos, notes and severity ratings.',
              },
            ].map(({ step, icon, title, body }) => (
              <div key={step} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '32px 28px', position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(0,201,167,0.2)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(255,255,255,0.07)'; el.style.transform = 'translateY(0)' }}
              >
                {/* Decorative step number */}
                <div style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 64, color: 'rgba(0,201,167,0.1)', position: 'absolute', top: -8, right: 20, lineHeight: 1, userSelect: 'none' }}>
                  {step}
                </div>
                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,201,167,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  {icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#FAFAF8', marginBottom: 12 }}>{title}</h3>
                <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '80px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}>
            {[
              { stat: '94%',                     label: 'of new build buyers report defects' },
              { stat: AVG_REPAIR_COST[countryCode], label: 'average defect repair cost found' },
              { stat: '10x cheaper',             label: 'than a professional survey' },
            ].map(({ stat, label }, i) => (
              <div key={stat} style={{
                textAlign: 'center', padding: '32px 24px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(40px, 5vw, 64px)', color: '#00C9A7', marginBottom: 12, lineHeight: 1 }}>
                  {stat}
                </div>
                <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '100px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 999, padding: '6px 14px' }}>
              <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00C9A7' }}>Pricing</span>
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 16 }}>
            Simple, honest pricing
          </h2>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 56 }}>
            Pay once per inspection. No subscription needed for homebuyers.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

            {/* Single report */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Single Report</span>
              </div>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(36px, 4vw, 52px)', color: '#FAFAF8', lineHeight: 1, marginBottom: 8 }}>
                {config.oneTimePriceDisplay}
              </div>
              <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', marginBottom: 28 }}>
                vs {config.professionalPrice} for a surveyor
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {['Full room-by-room checklist', 'Photos on every item', 'Voice notes auto-transcribed', 'Custom items', 'Professional PDF report', 'Builder portal included', `${config.warrantyName} references`].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check size={15} style={{ color: '#00D68F', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/inspect/start" style={{
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 15,
                background: '#00C9A7', color: '#0A0F1A', borderRadius: 10,
                padding: '14px 24px', textDecoration: 'none', textAlign: 'center',
                minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(0,201,167,0.35)', transition: 'all 0.2s ease',
              }}>
                Get started
              </Link>
            </div>

            {/* Expert subscription */}
            <div style={{ background: 'rgba(0,201,167,0.05)', border: '2px solid rgba(0,201,167,0.25)', borderRadius: 20, padding: 36, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              {/* Most popular badge */}
              <div style={{ position: 'absolute', top: 20, right: 20, background: '#00C9A7', color: '#0A0F1A', fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 11, borderRadius: 999, padding: '4px 10px' }}>
                Most popular
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00C9A7' }}>Expert Subscription</span>
              </div>

              {/* Billing toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {['Monthly', 'Annual'].map(b => (
                  <button key={b} onClick={() => setBillingAnnual(b === 'Annual')}
                    style={{
                      fontFamily: 'var(--font-space-grotesk)', fontSize: 13, fontWeight: 600,
                      background: (b === 'Annual') === billingAnnual ? 'rgba(0,201,167,0.2)' : 'transparent',
                      color: (b === 'Annual') === billingAnnual ? '#00C9A7' : 'rgba(255,255,255,0.4)',
                      border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                      minHeight: 36, transition: 'all 0.2s ease',
                    }}>
                    {b}
                  </button>
                ))}
                {billingAnnual && (
                  <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: '#00D68F', fontWeight: 600 }}>
                    Save {sym}{annualSaving}/yr
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 28 }}>
                <span style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(36px, 4vw, 52px)', color: '#00C9A7', lineHeight: 1 }}>
                  {sym}{billingAnnual ? annualMonthly : monthlyPrice}
                </span>
                <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>/month</span>
                {billingAnnual && (
                  <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                    Billed {sym}{annualTotal}/year
                  </p>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {['Everything in single report PLUS:', 'Unlimited inspections', 'Your company logo on reports', 'Multiple properties at once', 'Priority SnapBot access', 'Expert dashboard', 'Bulk PDF export'].map((f, i) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check size={15} style={{ color: '#00C9A7', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: i === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.75)', fontStyle: i === 0 ? 'italic' : 'normal' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/signup?plan=expert-${billingAnnual ? 'annual' : 'monthly'}`} style={{
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 15,
                background: '#00C9A7', color: '#0A0F1A', borderRadius: 10,
                padding: '14px 24px', textDecoration: 'none', textAlign: 'center',
                minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(0,201,167,0.35)', transition: 'all 0.2s ease',
              }}>
                Start Expert trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / COUNTRIES ────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '80px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 'clamp(24px, 3vw, 36px)', color: '#FAFAF8', marginBottom: 48 }}>
            Trusted by new build buyers across 5 countries
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {COUNTRIES.map(c => (
              <div key={c.code} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s ease', minWidth: 140,
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,201,167,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                <span style={{ fontSize: 32 }}>{c.flag}</span>
                <span style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 15, color: '#FAFAF8' }}>{c.name}</span>
                <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{c.domain}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#060A10', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '60px 24px 40px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, marginBottom: 40 }}>
            <Logo />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms' },
                { href: '/support', label: 'Support' },
                { href: '/verify-report', label: 'Verify Report' },
                { href: '/blog', label: 'Blog' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.4)',
                  textDecoration: 'none', transition: 'color 0.2s ease', minHeight: 44, display: 'flex', alignItems: 'center',
                }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              © {new Date().getFullYear()} SnapSnag. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Grid animation keyframe */}
      <style>{`
        @keyframes gridMove {
          from { background-position: 0 0; }
          to   { background-position: 64px 64px; }
        }
      `}</style>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}

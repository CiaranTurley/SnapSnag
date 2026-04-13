'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList, Smartphone, FileText, X, Menu, Check,
  ChevronDown, ChevronRight, User, HardHat, ShieldCheck,
  Home, Briefcase, Key, Camera, BarChart2, Building2,
} from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'
import { type CountryCode } from '@/lib/countryConfig'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Static data ──────────────────────────────────────────────────────────────

const SURVEY_HIGH: Record<CountryCode, string> = {
  IE: '€240', UK: '£600', AU: 'A$800', US: '$700', CA: 'C$600',
}

const AVG_REPAIR_COST: Record<CountryCode, string> = {
  IE: '€3,000', UK: '£2,600', AU: 'A$5,000', US: '$3,200', CA: 'C$4,200',
}

const COUNTRY_FLAG: Record<CountryCode, string> = {
  IE: '🇮🇪', UK: '🇬🇧', AU: '🇦🇺', US: '🇺🇸', CA: '🇨🇦',
}

const COUNTRY_NAME: Record<CountryCode, string> = {
  IE: 'Ireland', UK: 'United Kingdom', AU: 'Australia', US: 'United States', CA: 'Canada',
}

const WARRANTY_NAMES: Record<CountryCode, string> = {
  IE: 'HomeBond', UK: 'NHBC Buildmark', AU: 'HBC Fund', US: 'Builder Warranty', CA: 'Tarion warranty',
}

const COUNTRIES = [
  { code: 'IE' as CountryCode, flag: '🇮🇪', name: 'Ireland',        domain: 'snapsnag.ie' },
  { code: 'UK' as CountryCode, flag: '🇬🇧', name: 'United Kingdom', domain: 'snapsnag.co.uk' },
  { code: 'AU' as CountryCode, flag: '🇦🇺', name: 'Australia',      domain: 'snapsnag.com.au' },
  { code: 'US' as CountryCode, flag: '🇺🇸', name: 'United States',  domain: 'snapsnagapp.com' },
  { code: 'CA' as CountryCode, flag: '🇨🇦', name: 'Canada',         domain: 'snapsnag.ca' },
]

const FAQS = [
  {
    q: 'Is this as good as a professional survey?',
    a: 'SnapSnag guides you through the same room-by-room checks a professional snagger uses. The difference is you are doing it yourself, with AI assistance, for a fraction of the cost. For complex structural issues we always recommend a qualified surveyor — but for the vast majority of new build defects, SnapSnag gives you everything you need.',
  },
  {
    q: 'Will my builder accept a SnapSnag report?',
    a: 'Yes. SnapSnag reports include a unique verification code, timestamped photos, and a formal cover letter. Hundreds of builders across Ireland, UK, Australia, USA and Canada have responded to SnapSnag reports through our builder portal.',
  },
  {
    q: 'Can I share the report with my solicitor?',
    a: 'Absolutely. Every SnapSnag report includes a Solicitor Report version with a formal cover letter, your legal rights under your warranty, and the report formatted for legal correspondence. One tap sends it directly to your solicitor via email or WhatsApp.',
  },
  {
    q: 'What if I find nothing wrong?',
    a: "Great news if true! You still get a professional PDF report showing your property scored well — giving you peace of mind and a documented record. Most inspections do find issues. The average SnapSnag inspection identifies 12 defects. Even minor defects add up to thousands in repair costs.",
  },
  {
    q: 'Do I need a SnapSnag account?',
    a: 'No. Start your inspection immediately with no sign-up required. Just answer a few questions about your property and begin. You only create an account if you want to save your inspection and return to it later.',
  },
  {
    q: 'What is the Property Health Score?',
    a: 'Every SnapSnag report includes a score out of 100 for your property. Critical defects have the most impact on the score. The score helps your solicitor and builder instantly understand the overall condition of your home.',
  },
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

// ─── Shared ───────────────────────────────────────────────────────────────────

const GH = 'var(--font-space-grotesk)'
const FH = 'var(--font-fraunces)'

function SectionBadge({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
      <div style={{ display: 'inline-flex', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 999, padding: '6px 14px' }}>
        <span style={{ fontFamily: GH, fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#00C9A7' }}>{label}</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function HomePageInner() {
  const { countryCode, config } = useCountry()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [loginOpen, setLoginOpen]   = useState(false)
  const [inspectionCount, setInspectionCount] = useState<number | null>(null)
  const [billingAnnual, setBillingAnnual]     = useState(false)
  const [openFaq, setOpenFaq]       = useState<number | null>(null)

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
  const sym           = config.symbol
  const warrantyName  = WARRANTY_NAMES[countryCode]
  const countryFlag   = COUNTRY_FLAG[countryCode]
  const countryName   = COUNTRY_NAME[countryCode]
  const surveyHigh    = SURVEY_HIGH[countryCode]

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

          {/* Desktop nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLoginOpen(v => !v)}
                onBlur={() => setTimeout(() => setLoginOpen(false), 150)}
                style={{
                  fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '9px 18px',
                  background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                Log in <ChevronDown size={14} style={{ opacity: 0.6, transform: loginOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {loginOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 8, minWidth: 220, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                  {[
                    { href: '/login',   icon: <User size={15} color="#00C9A7" />,     bg: 'rgba(0,201,167,0.12)',  title: 'My Inspection',   sub: 'Continue report & track fixes' },
                    { href: '/builder', icon: <HardHat size={15} color="#FFB340" />,  bg: 'rgba(255,179,64,0.12)', title: 'Builder Portal',   sub: 'Enter report code to close snags' },
                  ].map(item => (
                    <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                      <div>
                        <p style={{ fontFamily: GH, fontSize: 13, fontWeight: 600, color: '#FAFAF8', marginBottom: 1 }}>{item.title}</p>
                        <p style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{item.sub}</p>
                      </div>
                    </Link>
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <Link href="/expert" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(138,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShieldCheck size={15} color="#8A63FF" /></div>
                    <div>
                      <p style={{ fontFamily: GH, fontSize: 13, fontWeight: 600, color: '#FAFAF8', marginBottom: 1 }}>Pro Login</p>
                      <p style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Subscription inspector dashboard</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/inspect/start" style={{ fontFamily: GH, fontSize: 14, fontWeight: 700, background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '9px 20px', textDecoration: 'none', boxShadow: '0 0 24px rgba(0,201,167,0.35)', transition: 'all 0.2s ease' }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
              Start Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ position: 'fixed', inset: 0, top: 64, background: '#0A0F1A', zIndex: 99, display: 'flex', flexDirection: 'column', padding: 24, gap: 10, overflowY: 'auto' }}>
            <p style={{ fontFamily: GH, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Log in as</p>
            {[
              { href: '/login',   icon: <User size={18} color="#00C9A7" />,        bg: 'rgba(0,201,167,0.12)',   title: 'My Inspection',  sub: 'Continue your report & track builder fixes' },
              { href: '/builder', icon: <HardHat size={18} color="#FFB340" />,     bg: 'rgba(255,179,64,0.12)', title: 'Builder Portal', sub: 'Enter report code to close snags' },
              { href: '/expert',  icon: <ShieldCheck size={18} color="#8A63FF" />, bg: 'rgba(138,99,255,0.12)', title: 'Pro Login',       sub: 'Subscription inspector dashboard' },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 18px', textDecoration: 'none', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ fontFamily: GH, fontSize: 15, fontWeight: 600, color: '#FAFAF8', marginBottom: 2 }}>{item.title}</p>
                  <p style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.sub}</p>
                </div>
              </Link>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            <Link href="/inspect/start" onClick={() => setMenuOpen(false)} style={{ fontFamily: GH, fontSize: 15, fontWeight: 700, background: '#00C9A7', color: '#0A0F1A', borderRadius: 12, padding: '16px 20px', textDecoration: 'none', textAlign: 'center', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(0,201,167,0.35)' }}>
              Start Free — Pay Only When You Download
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Animated grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,201,167,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,167,0.06) 1px, transparent 1px)', backgroundSize: '64px 64px', animation: 'gridMove 30s linear infinite' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 600, height: 600, pointerEvents: 'none', background: 'radial-gradient(circle at top right, rgba(0,201,167,0.08) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1152, margin: '0 auto', padding: '80px 24px', width: '100%' }}>
          <div style={{ maxWidth: 680 }}>

            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 999, padding: '6px 14px', marginBottom: 28 }}>
              <span style={{ fontFamily: GH, fontWeight: 600, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00C9A7' }}>
                {countryFlag} New Home Inspector · {countryName}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: FH, fontWeight: 700, lineHeight: 1.05, marginBottom: 24, color: '#FAFAF8', fontSize: 'clamp(38px, 5.5vw, 68px)' }}>
              Spot it. Snap it.<br />
              <span style={{ color: '#00C9A7' }}>Snag it.</span>
            </h1>

            {/* Subheadline */}
            <p style={{ fontFamily: GH, fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 36, maxWidth: 580 }}>
              Create professional snag lists in minutes.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
              <Link href="/inspect/start" style={{ fontFamily: GH, fontWeight: 700, fontSize: 16, background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '14px 28px', textDecoration: 'none', minHeight: 52, display: 'inline-flex', alignItems: 'center', boxShadow: '0 0 28px rgba(0,201,167,0.4)', transition: 'all 0.2s ease' }}>
                Start Free — Pay Only When You Download
              </Link>
              <Link href="/sample-report" style={{ fontFamily: GH, fontWeight: 600, fontSize: 16, background: 'transparent', color: '#FAFAF8', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '14px 28px', textDecoration: 'none', minHeight: 52, display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s ease' }}>
                See a sample report
              </Link>
            </div>

            {/* Trust row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {[
                `${countryFlag} ${inspectionCount !== null ? inspectionCount.toLocaleString() : '—'} inspections in ${countryName}`,
                'AI photo analysis',
                'Builder portal included',
                '10-minute setup',
                `${warrantyName} references`,
              ].map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>}
                  <span style={{ fontFamily: GH, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STATS ───────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '80px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
            {[
              { stat: '94%',                     label: 'of new builds have defects at handover' },
              { stat: AVG_REPAIR_COST[countryCode], label: 'average defect repair value' },
              { stat: '10x',                     label: 'cheaper than a professional survey' },
            ].map(({ stat, label }) => (
              <div key={stat} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 56px)', color: '#00C9A7', marginBottom: 10, lineHeight: 1 }}>{stat}</div>
                <p style={{ fontFamily: GH, fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: GH, fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            SnapSnag users find an average of <strong style={{ color: '#FAFAF8' }}>12 defects</strong> per inspection.
          </p>
        </div>
      </section>

      {/* ── TARGET USER ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '100px 0' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
          <SectionBadge label="Who it's for" />
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 56 }}>
            SnapSnag is built for you if…
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Card 1 — Buyer */}
            <div style={{ background: 'rgba(0,201,167,0.04)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,201,167,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={24} color="#00C9A7" />
              </div>
              <div>
                <h3 style={{ fontFamily: FH, fontWeight: 700, fontSize: 20, color: '#FAFAF8', marginBottom: 10 }}>You are buying a new home</h3>
                <p style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  Use SnapSnag before or after handover to document every defect while you are still protected by your builder warranty.
                </p>
              </div>
              <Link href="/inspect/start" style={{ fontFamily: GH, fontWeight: 700, fontSize: 14, background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '12px 20px', textDecoration: 'none', textAlign: 'center', display: 'block', boxShadow: '0 0 20px rgba(0,201,167,0.3)', marginTop: 'auto' }}>
                Start my inspection
              </Link>
            </div>

            {/* Card 2 — Pro */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(138,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={24} color="#8A63FF" />
              </div>
              <div>
                <h3 style={{ fontFamily: FH, fontWeight: 700, fontSize: 20, color: '#FAFAF8', marginBottom: 10 }}>You are a professional snagger or surveyor</h3>
                <p style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  SnapSnag Expert gives you unlimited inspections with your own branded PDF reports. {sym}29.95/month.
                </p>
              </div>
              <Link href="/signup?plan=expert-monthly" style={{ fontFamily: GH, fontWeight: 700, fontSize: 14, background: 'transparent', color: '#FAFAF8', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 20px', textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 'auto' }}>
                See Expert plan
              </Link>
            </div>

            {/* Card 3 — Renter */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16, opacity: 0.85 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,179,64,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={24} color="#FFB340" />
              </div>
              <div>
                <h3 style={{ fontFamily: FH, fontWeight: 700, fontSize: 20, color: '#FAFAF8', marginBottom: 10 }}>You are renting or moving into an older home</h3>
                <p style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  Use SnapSnag to document property condition and protect your deposit.
                </p>
              </div>
              <Link href="/inspect/start" style={{ fontFamily: GH, fontWeight: 700, fontSize: 14, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 20px', textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 'auto' }}>
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI FEATURES ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '100px 0' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
          <SectionBadge label="AI-Powered" />
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 12 }}>
            AI-powered. Human-guided.
          </h2>
          <p style={{ fontFamily: GH, fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 64, maxWidth: 480, margin: '0 auto 64px' }}>
            The smartest snagging tool ever built for homebuyers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
            {[
              {
                icon: <Camera size={22} color="#00C9A7" />,
                tag: 'AI Photo Analysis',
                headline: 'Point. Shoot. Know exactly what is wrong.',
                body: 'SnapBot analyses every photo you take and tells you the defect name, severity, estimated repair cost and whether it is covered by your warranty.',
                flip: false,
                mockBg: 'rgba(0,201,167,0.06)',
                mockBorder: 'rgba(0,201,167,0.2)',
                mockContent: (
                  <div style={{ padding: 24 }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ width: '100%', height: 120, background: 'rgba(0,201,167,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Camera size={32} color="rgba(0,201,167,0.4)" />
                      </div>
                      <p style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Photo captured</p>
                    </div>
                    <div style={{ background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <p style={{ fontFamily: GH, fontSize: 11, fontWeight: 700, color: '#00C9A7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SnapBot Analysis</p>
                      <p style={{ fontFamily: GH, fontSize: 13, color: '#FAFAF8', marginBottom: 4 }}>Skirting board gap — minor defect</p>
                      <p style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Est. repair: €40–€80 · Covered by HomeBond ✓</p>
                    </div>
                  </div>
                ),
              },
              {
                icon: <BarChart2 size={22} color="#00C9A7" />,
                tag: 'Property Health Score',
                headline: 'Your home. Scored out of 100.',
                body: 'Every report includes a Property Health Score so you and your solicitor can instantly understand the overall condition of your new home.',
                flip: true,
                mockBg: 'rgba(0,201,167,0.06)',
                mockBorder: 'rgba(0,201,167,0.2)',
                mockContent: (
                  <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: 120, height: 120 }}>
                      <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00C9A7" strokeWidth="3" strokeDasharray="81 100" strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FH, fontWeight: 700, fontSize: 28, color: '#00C9A7', lineHeight: 1 }}>81</span>
                        <span style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/ 100</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: FH, fontWeight: 700, fontSize: 16, color: '#FAFAF8' }}>Property Health Score</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['1 Critical', '#FF4D4F'], ['7 Major', '#FF6B35'], ['4 Minor', '#FFB340']].map(([label, color]) => (
                        <span key={label as string} style={{ fontFamily: GH, fontSize: 11, fontWeight: 600, background: `${color as string}18`, color: color as string, borderRadius: 999, padding: '3px 10px' }}>{label as string}</span>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                icon: <Building2 size={22} color="#00C9A7" />,
                tag: 'Builder Portal',
                headline: 'Hold your builder accountable.',
                body: 'Share a secure portal link with your builder. They log in, see every defect with photos, and mark items as fixed. You get notified instantly.',
                flip: false,
                mockBg: 'rgba(0,201,167,0.06)',
                mockBorder: 'rgba(0,201,167,0.2)',
                mockContent: (
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontFamily: GH, fontSize: 11, fontWeight: 700, color: '#00C9A7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Builder Portal · 12 items</p>
                    {[
                      { label: 'Skirting board gap — Bedroom 1', status: 'Fixed', sc: '#00D68F', sb: 'rgba(0,214,143,0.12)' },
                      { label: 'Grout missing in en-suite shower', status: 'In Progress', sc: '#FFB340', sb: 'rgba(255,179,64,0.12)' },
                      { label: 'Extractor fan undersized', status: 'Outstanding', sc: 'rgba(255,255,255,0.4)', sb: 'rgba(255,255,255,0.07)' },
                    ].map(row => (
                      <div key={row.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{row.label}</p>
                        <span style={{ fontFamily: GH, fontSize: 11, fontWeight: 700, color: row.sc, background: row.sb, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(({ icon, tag, headline, body, flip, mockBg, mockBorder, mockContent }) => (
              <div key={tag} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
                <div style={{ order: flip ? 1 : 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 999, padding: '6px 14px', marginBottom: 20 }}>
                    {icon}
                    <span style={{ fontFamily: GH, fontWeight: 600, fontSize: 12, color: '#00C9A7' }}>{tag}</span>
                  </div>
                  <h3 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(24px, 3vw, 34px)', color: '#FAFAF8', marginBottom: 16, lineHeight: 1.2 }}>{headline}</h3>
                  <p style={{ fontFamily: GH, fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{body}</p>
                </div>
                <div style={{ order: flip ? 0 : 1, background: mockBg, border: `1px solid ${mockBorder}`, borderRadius: 20, overflow: 'hidden', minHeight: 220 }}>
                  {mockContent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '100px 0' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
          <SectionBadge label="How it works" />
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 60 }}>
            Three steps to your professional report
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { step: '01', icon: <ClipboardList size={22} color="#00C9A7" />, title: 'Answer questions about your home', body: 'Takes 2 minutes. We build a custom checklist just for your property type and what\'s included in your contract.' },
              { step: '02', icon: <Smartphone size={22} color="#00C9A7" />,    title: 'Walk through every room',          body: 'Photograph defects, record voice notes, mark each item as Pass, Fail or N/A. Takes 2–3 hours.' },
              { step: '03', icon: <FileText size={22} color="#00C9A7" />,      title: 'Download your PDF report instantly', body: 'Professional solicitor-ready report with all your photos, notes and severity ratings.' },
            ].map(({ step, icon, title, body }) => (
              <div key={step} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,201,167,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ fontFamily: FH, fontWeight: 700, fontSize: 64, color: 'rgba(0,201,167,0.1)', position: 'absolute', top: -8, right: 20, lineHeight: 1, userSelect: 'none' }}>{step}</div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,201,167,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>{icon}</div>
                <h3 style={{ fontFamily: FH, fontWeight: 700, fontSize: 20, color: '#FAFAF8', marginBottom: 12 }}>{title}</h3>
                <p style={{ fontFamily: GH, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '100px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <SectionBadge label="Pricing" />
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 12 }}>
            One price. No surprises.
          </h2>
          <p style={{ fontFamily: GH, fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 56 }}>
            Start free. Only pay when you are ready to download your report.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

            {/* Single report */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: GH, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Homebuyer</span>
              <div style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(36px, 4vw, 52px)', color: '#FAFAF8', lineHeight: 1, marginBottom: 4, marginTop: 8 }}>
                {config.oneTimePriceDisplay}
              </div>
              <p style={{ fontFamily: GH, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', marginBottom: 6 }}>
                vs {config.professionalPrice} for a surveyor
              </p>
              <p style={{ fontFamily: GH, fontSize: 13, color: 'rgba(0,201,167,0.8)', marginBottom: 28 }}>
                Start free. First 10 items completely free. Only pay when ready to download.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {['Full room-by-room checklist', 'Photos on every item', 'Voice notes auto-transcribed', 'Custom items', 'Professional PDF report', 'Builder portal included', `${warrantyName} references`].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check size={15} style={{ color: '#00D68F', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Price comparison bar */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>vs professional surveyor</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 80 }}>Surveyor</span>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,77,79,0.15)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: '#FF4D4F', borderRadius: 999, opacity: 0.6 }} />
                    </div>
                    <span style={{ fontFamily: GH, fontSize: 11, color: '#FF4D4F', minWidth: 50, textAlign: 'right' }}>{surveyHigh}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: GH, fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 80 }}>SnapSnag</span>
                    <div style={{ flex: 1, height: 8, background: 'rgba(0,201,167,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '9%', height: '100%', background: '#00C9A7', borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: GH, fontSize: 11, color: '#00C9A7', minWidth: 50, textAlign: 'right' }}>{config.oneTimePriceDisplay}</span>
                  </div>
                </div>
              </div>

              <Link href="/inspect/start" style={{ fontFamily: GH, fontWeight: 700, fontSize: 15, background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '14px 24px', textDecoration: 'none', textAlign: 'center', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(0,201,167,0.35)' }}>
                Get started free
              </Link>
            </div>

            {/* Expert subscription */}
            <div style={{ background: 'rgba(0,201,167,0.05)', border: '2px solid rgba(0,201,167,0.25)', borderRadius: 20, padding: 36, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, background: '#00C9A7', color: '#0A0F1A', fontFamily: GH, fontWeight: 700, fontSize: 11, borderRadius: 999, padding: '4px 10px' }}>Most popular</div>
              <span style={{ fontFamily: GH, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00C9A7' }}>Expert Subscription</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 16 }}>
                {['Monthly', 'Annual'].map(b => (
                  <button key={b} onClick={() => setBillingAnnual(b === 'Annual')} style={{ fontFamily: GH, fontSize: 13, fontWeight: 600, background: (b === 'Annual') === billingAnnual ? 'rgba(0,201,167,0.2)' : 'transparent', color: (b === 'Annual') === billingAnnual ? '#00C9A7' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', minHeight: 36 }}>
                    {b}
                  </button>
                ))}
                {billingAnnual && <span style={{ fontFamily: GH, fontSize: 12, color: '#00D68F', fontWeight: 600 }}>Save {sym}{annualSaving}/yr</span>}
              </div>

              <div style={{ marginBottom: 28 }}>
                <span style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(36px, 4vw, 52px)', color: '#00C9A7', lineHeight: 1 }}>{sym}{billingAnnual ? annualMonthly : monthlyPrice}</span>
                <span style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>/month</span>
                {billingAnnual && <p style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>Billed {sym}{annualTotal}/year</p>}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {['Everything in Homebuyer PLUS:', 'Unlimited inspections', 'Your company logo on reports', 'Multiple properties at once', 'Priority SnapBot access', 'Expert dashboard', 'Bulk PDF export'].map((f, i) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Check size={15} style={{ color: '#00C9A7', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: GH, fontSize: 14, color: i === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.75)', fontStyle: i === 0 ? 'italic' : 'normal' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/signup?plan=expert-${billingAnnual ? 'annual' : 'monthly'}`} style={{ fontFamily: GH, fontWeight: 700, fontSize: 15, background: '#00C9A7', color: '#0A0F1A', borderRadius: 10, padding: '14px 24px', textDecoration: 'none', textAlign: 'center', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(0,201,167,0.35)' }}>
                Start Expert trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '100px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <SectionBadge label="FAQ" />
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.5vw, 42px)', color: '#FAFAF8', textAlign: 'center', marginBottom: 48 }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: openFaq === i ? 'rgba(0,201,167,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${openFaq === i ? 'rgba(0,201,167,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.2s ease' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontFamily: FH, fontWeight: 700, fontSize: 16, color: '#FAFAF8' }}>{faq.q}</span>
                  <ChevronRight size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px' }}>
                    <p style={{ fontFamily: GH, fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#111827', padding: '80px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(24px, 3vw, 36px)', color: '#FAFAF8', marginBottom: 20 }}>
            Built for buyers.<br />Not builders.
          </h2>
          <p style={{ fontFamily: GH, fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75 }}>
            SnapSnag was built because professional snagging surveys cost {config.professionalPrice} and most buyers simply cannot afford them.
            Every new build buyer deserves to know exactly what defects exist in their home before their builder warranty expires.
            SnapSnag makes that possible for {config.oneTimePriceDisplay}.
          </p>
        </div>
      </section>

      {/* ── TRUST / COUNTRIES ────────────────────────────────────────────────── */}
      <section style={{ background: '#0A0F1A', padding: '80px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(22px, 3vw, 34px)', color: '#FAFAF8', marginBottom: 48 }}>
            Trusted by new build buyers across 5 countries
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {COUNTRIES.map(c => (
              <div key={c.code} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s ease', minWidth: 140 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,201,167,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                <span style={{ fontSize: 32 }}>{c.flag}</span>
                <span style={{ fontFamily: FH, fontWeight: 700, fontSize: 15, color: '#FAFAF8' }}>{c.name}</span>
                <span style={{ fontFamily: GH, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{c.domain}</span>
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
                { href: '/privacy',       label: 'Privacy Policy' },
                { href: '/terms',         label: 'Terms' },
                { href: '/support',       label: 'Support' },
                { href: '/verify-report', label: 'Verify Report' },
                { href: '/blog',          label: 'Blog' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{ fontFamily: GH, fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s ease', minHeight: 44, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontFamily: GH, fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              © {new Date().getFullYear()} SnapSnag. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

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

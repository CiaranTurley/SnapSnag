'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ClipboardList, Smartphone, FileText, X, Menu } from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'
import { type CountryCode } from '@/lib/countryConfig'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import CountrySwitcher from '@/components/CountrySwitcher'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Average repair cost per country (approx local currency equivalent of EUR3,000)
const AVG_REPAIR_COST: Record<CountryCode, string> = {
  IE: '€3,000',
  UK: '£2,600',
  AU: 'A$5,000',
  US: '$3,200',
  CA: 'C$4,200',
}

const FLAG_EMOJI: Record<string, string> = {
  IE: '🇮🇪', GB: '🇬🇧', AU: '🇦🇺', US: '🇺🇸', CA: '🇨🇦',
}

function HomePageInner() {
  const { countryCode, config } = useCountry()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [inspectionCount, setInspectionCount] = useState<number | null>(null)
  const [billingAnnual, setBillingAnnual] = useState(false)

  // Capture referral code from ?ref= and store in localStorage
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('snapsnag_ref', ref.toUpperCase())
  }, [searchParams])

  // Live inspection counter — fetches from Supabase, refreshes every 60s
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    async function fetchCount() {
      const { count } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
      if (count !== null) setInspectionCount(count)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  const monthlyPrice = (config.expertMonthly / 100).toFixed(2)
  const annualTotal  = (config.expertAnnual  / 100).toFixed(2)
  const annualMonthly = (config.expertAnnual / 100 / 12).toFixed(2)
  const annualSaving  = ((config.expertMonthly * 12 - config.expertAnnual) / 100).toFixed(2)

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">

      {/* ── NAVIGATION ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-snap-ink/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <SnapSnagLogo size="sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="font-grotesk text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-xl transition-all"
            >
              Expert Login
            </Link>
            <Link
              href="/inspect/start"
              className="btn-primary text-sm py-2 px-5"
              style={{ boxShadow: '0 0 24px rgba(0,201,167,0.3)' }}
            >
              Start Inspection
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-white/70 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-snap-ink px-6 py-6 flex flex-col gap-4">
            <Link
              href="/login"
              className="font-grotesk text-sm text-white/70 border border-white/20 px-4 py-3 rounded-xl text-center min-h-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen(false)}
            >
              Expert Login
            </Link>
            <Link
              href="/inspect/start"
              className="btn-primary text-sm text-center min-h-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen(false)}
              style={{ boxShadow: '0 0 24px rgba(0,201,167,0.3)' }}
            >
              Start Inspection
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Animated grid */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />

        {/* Radial teal glow top-right */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, rgba(0,201,167,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-32">
          {/* Label */}
          <p
            className="font-grotesk font-semibold text-snap-teal mb-5"
            style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            All-in-one inspection tool
          </p>

          {/* Headline */}
          <h1
            className="font-fraunces font-bold leading-tight mb-6 max-w-2xl"
            style={{ fontSize: 'clamp(36px, 5.5vw, 68px)' }}
          >
            Inspect any{' '}
            <span className="text-snap-teal">new home</span>
            <br />
            quickly and{' '}
            <span className="text-snap-teal">confidently.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-grotesk text-white/60 mb-8 max-w-xl leading-relaxed" style={{ fontSize: 18 }}>
            Create professional snagging reports in minutes, whether you're a new homebuyer or an experienced inspector.
          </p>

          {/* Bullet points */}
          <ul className="font-grotesk text-white/70 text-sm space-y-3 mb-10">
            {[
              <>Spot and document <strong className="text-white">defects</strong> with ease</>,
              <>Generate <strong className="text-white">comprehensive</strong>, ready-to-share reports</>,
              <>Save time and <strong className="text-white">money</strong> by streamlining your process</>,
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-snap-teal flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/inspect/start"
              className="btn-primary text-base px-8 py-4 text-center min-h-[52px] flex items-center justify-center"
              style={{ boxShadow: '0 0 24px rgba(0,201,167,0.3)', fontWeight: 700 }}
            >
              Start Free Inspection
            </Link>
            <Link
              href="#sample"
              className="btn-secondary text-base px-8 py-4 text-center min-h-[52px] flex items-center justify-center"
            >
              See Sample Report
            </Link>
          </div>

          {/* Live counter */}
          <div className="flex items-center gap-3 font-grotesk text-sm text-white/40">
            <div className="flex gap-1">
              {(['IE', 'GB', 'AU', 'US', 'CA'] as const).map(f => (
                <span key={f} className="text-base">{FLAG_EMOJI[f]}</span>
              ))}
            </div>
            {inspectionCount !== null ? (
              <span>
                <span className="text-snap-white font-semibold">{inspectionCount.toLocaleString()}</span>{' '}
                inspections completed across 5 countries
              </span>
            ) : (
              <span>Inspections completed across 5 countries</span>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-snap-ink-mid">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-fraunces text-4xl font-bold text-center mb-16">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ClipboardList size={28} className="text-snap-teal" />,
                step: '01',
                title: 'Answer questions about your home',
                body: 'Takes 2 minutes. We generate a custom checklist just for your property.',
              },
              {
                icon: <Smartphone size={28} className="text-snap-teal" />,
                step: '02',
                title: 'Walk through the checklist room by room',
                body: 'Photograph defects, add notes and voice recordings. Takes 2–3 hours.',
              },
              {
                icon: <FileText size={28} className="text-snap-teal" />,
                step: '03',
                title: 'Download your professional report instantly',
                body: 'Solicitor-ready PDF with photos, notes and severity ratings.',
              },
            ].map(({ icon, step, title, body }) => (
              <div key={step} className="relative">
                {/* Step number */}
                <span className="font-fraunces text-7xl font-bold text-white/5 absolute -top-4 -left-2 select-none">
                  {step}
                </span>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-snap-teal/10 rounded-2xl flex items-center justify-center mb-5 border border-snap-teal/20">
                    {icon}
                  </div>
                  <h3 className="font-fraunces text-xl font-bold mb-3">{title}</h3>
                  <p className="font-grotesk text-white/50 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-snap-ink">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-fraunces text-4xl font-bold text-center mb-4">Simple pricing</h2>
          <p className="font-grotesk text-white/50 text-center mb-16">
            Pay once per inspection. No subscription needed for homebuyers.
          </p>

          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT — One-time report */}
            <div className="card border border-white/10 flex flex-col">
              <div className="mb-6">
                <h3 className="font-fraunces text-2xl font-bold mb-1">Single Inspection Report</h3>
                <p className="font-grotesk text-white/40 text-sm">One payment, one full report.</p>
              </div>

              <div className="mb-2">
                <span className="font-fraunces font-bold text-snap-white"
                  style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}
                >
                  {config.oneTimePriceDisplay}
                </span>
              </div>
              <p className="font-grotesk text-white/40 text-sm mb-6 line-through">
                vs {config.professionalPrice} for a surveyor
              </p>

              <ul className="font-grotesk text-sm space-y-3 mb-8 flex-1">
                {[
                  'Full room-by-room checklist',
                  'Photos on every item',
                  'Voice notes auto-transcribed',
                  'Custom items you add yourself',
                  'Professional PDF report',
                  'Builder portal included',
                  `${config.warrantyName} references`,
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle size={15} className="text-snap-pass flex-shrink-0 mt-0.5" />
                    <span className="text-white/75">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/inspect/start"
                className="btn-primary w-full text-center min-h-[48px] flex items-center justify-center font-bold"
                style={{ fontWeight: 700 }}
              >
                Get started
              </Link>
            </div>

            {/* RIGHT — Expert subscription */}
            <div
              className="card border border-snap-teal/40 flex flex-col relative overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(0,201,167,0.08)' }}
            >
              {/* Popular badge */}
              <div className="absolute top-5 right-5 bg-snap-teal text-snap-ink text-xs font-bold px-3 py-1 rounded-full font-grotesk">
                Most popular for professionals
              </div>

              <div className="mb-6">
                <h3 className="font-fraunces text-2xl font-bold mb-1 pr-40">Expert Subscription</h3>
                <p className="font-grotesk text-white/40 text-sm">For snagging professionals.</p>
              </div>

              {/* Billing toggle */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setBillingAnnual(false)}
                  className={`font-grotesk text-sm px-3 py-1.5 rounded-lg transition-all min-h-[36px] ${
                    !billingAnnual ? 'bg-snap-teal/20 text-snap-teal' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingAnnual(true)}
                  className={`font-grotesk text-sm px-3 py-1.5 rounded-lg transition-all min-h-[36px] ${
                    billingAnnual ? 'bg-snap-teal/20 text-snap-teal' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Annual
                </button>
                {billingAnnual && (
                  <span className="font-grotesk text-xs text-snap-pass font-semibold">
                    Save {config.currency}{annualSaving}/year
                  </span>
                )}
              </div>

              <div className="mb-6">
                <span className="font-fraunces font-bold text-snap-teal"
                  style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}
                >
                  {config.currency}{billingAnnual ? annualMonthly : monthlyPrice}
                </span>
                <span className="font-grotesk text-white/40 text-sm ml-2">/month</span>
                {billingAnnual && (
                  <p className="font-grotesk text-xs text-white/30 mt-1">
                    Billed {config.currency}{annualTotal}/year
                  </p>
                )}
              </div>

              <ul className="font-grotesk text-sm space-y-3 mb-8 flex-1">
                {[
                  'Everything in single report PLUS:',
                  'Unlimited inspections',
                  'Your company logo on every report',
                  'Multiple properties at once',
                  'Priority SnapBot access',
                  'Expert dashboard',
                  'Bulk PDF export',
                ].map((f, i) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle
                      size={15}
                      className={`flex-shrink-0 mt-0.5 ${i === 0 ? 'text-snap-teal' : 'text-snap-teal'}`}
                    />
                    <span className={i === 0 ? 'text-white/50 italic' : 'text-white/75'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=expert-${billingAnnual ? 'annual' : 'monthly'}`}
                className="btn-primary w-full text-center min-h-[48px] flex items-center justify-center font-bold"
                style={{ boxShadow: '0 0 24px rgba(0,201,167,0.3)', fontWeight: 700 }}
              >
                Start Expert trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STATS ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-snap-ink border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            {[
              {
                stat: '94%',
                label: 'of new build buyers report defects',
              },
              {
                stat: AVG_REPAIR_COST[countryCode],
                label: 'average repair cost found per inspection',
              },
              {
                stat: '10x cheaper',
                label: 'than a professional survey',
              },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <div className="font-fraunces font-bold text-snap-teal mb-3"
                  style={{ fontSize: 'clamp(36px, 4vw, 52px)' }}
                >
                  {stat}
                </div>
                <p className="font-grotesk text-white/50 text-sm leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#060A10' }} className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            {/* Logo */}
            <SnapSnagLogo size="sm" showTagline />

            {/* Links */}
            <div className="flex flex-wrap gap-6 font-grotesk text-sm text-white/40">
              <Link href="/privacy"        className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">Privacy Policy</Link>
              <Link href="/terms"          className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">Terms</Link>
              <Link href="#support"        className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">Support</Link>
              <Link href="/verify-report"  className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">Verify Report</Link>
            </div>

            {/* Country switcher */}
            <CountrySwitcher variant="footer" />
          </div>

          <div className="border-t border-white/5 pt-6">
            <p className="font-grotesk text-xs text-white/20 text-center">
              © 2025 SnapSnag. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

import { Suspense } from 'react'
export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}

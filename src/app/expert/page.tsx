'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, FileText, Share2, Download, Star,
  Check, ChevronRight, Loader2
} from 'lucide-react'

const FEATURES = [
  { icon: FileText,  title: 'Branded PDF Reports',   desc: 'Every report carries your company logo, name, and contact details.' },
  { icon: Share2,    title: 'Client Share Links',     desc: 'Generate a read-only link for each report to share directly with clients.' },
  { icon: Download,  title: 'Bulk ZIP Export',        desc: 'Download up to 50 reports at once as a single ZIP file.' },
  { icon: Building2, title: 'No Per-Report Fees',     desc: 'Run unlimited inspections. No per-report charge — flat monthly or annual price.' },
  { icon: Star,      title: 'Priority SnapBot',       desc: 'Expert badge in SnapBot so it knows you\'re a professional, not a first-timer.' },
]

const PLANS = {
  monthly: { price: '€49', period: '/month', priceId: 'monthly', saving: null },
  annual:  { price: '€39', period: '/month', priceId: 'annual',  saving: 'Save 20%' },
}

export default function ExpertPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [companyName,  setCompanyName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone,        setPhone]        = useState('')
  const [website,      setWebsite]      = useState('')
  const [logo,         setLogo]         = useState<File | null>(null)
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogo(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!companyName || !contactEmail) {
      setError('Company name and contact email are required.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('company_name', companyName)
      fd.append('contact_email', contactEmail)
      fd.append('phone', phone)
      fd.append('website', website)
      fd.append('plan', billing)
      if (logo) fd.append('logo', logo)

      const res = await fetch('/api/expert/subscribe', { method: 'POST', body: fd })

      if (res.status === 401) {
        router.push(`/login?next=/expert`)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong.')
        return
      }

      const { url } = await res.json()
      window.location.href = url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS[billing]

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-snap-teal flex items-center justify-center">
              <span className="font-fraunces text-snap-ink font-bold text-sm">SS</span>
            </div>
            <span className="font-fraunces text-lg font-bold">
              Snap<span className="text-snap-teal">Snag</span>
            </span>
          </Link>
          <Link href="/dashboard" className="font-grotesk text-sm text-white/50 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-snap-teal/30 bg-snap-teal/10 mb-6">
          <Star size={12} className="text-snap-teal" />
          <span className="font-grotesk text-xs text-snap-teal font-semibold tracking-wide">EXPERT PLAN</span>
        </div>
        <h1 className="font-fraunces text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Professional snagging,<br />
          <span className="text-snap-teal">your brand.</span>
        </h1>
        <p className="font-grotesk text-lg text-white/60 max-w-xl mx-auto">
          Built for snagging professionals, surveyors, and property consultants.
          Deliver branded reports at scale — no per-report fees.
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card border border-white/5 p-5">
                <div className="w-9 h-9 rounded-lg bg-snap-teal/10 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-snap-teal" />
                </div>
                <p className="font-grotesk font-semibold text-sm text-white mb-1">{f.title}</p>
                <p className="font-grotesk text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Signup form + pricing */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBilling('monthly')}
            className="font-grotesk text-sm px-4 py-2 rounded-lg transition-colors"
            style={billing === 'monthly'
              ? { background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }
              : { color: 'rgba(255,255,255,0.4)' }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className="font-grotesk text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={billing === 'annual'
              ? { background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }
              : { color: 'rgba(255,255,255,0.4)' }}
          >
            Annual
            {billing === 'annual' && (
              <span className="text-xs bg-snap-teal text-snap-ink font-bold px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            )}
          </button>
        </div>

        {/* Pricing card */}
        <div className="card border border-snap-teal/30 p-6 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="font-fraunces text-5xl font-bold text-snap-teal">{plan.price}</span>
            <span className="font-grotesk text-white/50">{plan.period}</span>
          </div>
          {billing === 'annual' && (
            <p className="font-grotesk text-sm text-white/40">Billed €468/year — 2 months free</p>
          )}
          <div className="mt-4 flex flex-col gap-2 text-left max-w-xs mx-auto">
            {['14-day free trial', 'Unlimited inspections', 'Branded PDF reports', 'Bulk ZIP export', 'Client share links'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <Check size={14} className="text-snap-teal flex-shrink-0" />
                <span className="font-grotesk text-sm text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-up form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="font-fraunces text-xl font-bold mb-2">Set up your account</h2>

          {/* Logo */}
          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-1.5">Company logo (optional)</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-14 h-14 rounded-lg object-contain bg-white/5 border border-white/10" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                  <Building2 size={20} className="text-white/20" />
                </div>
              )}
              <label className="cursor-pointer font-grotesk text-sm text-snap-teal hover:underline">
                {logoPreview ? 'Change logo' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>
          </div>

          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-1.5">Company name *</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Inspections Ltd"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
            />
          </div>

          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-1.5">Contact email *</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="hello@acmeinspections.ie"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+353 1 234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
              />
            </div>
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://acmeinspections.ie"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
              />
            </div>
          </div>

          {error && (
            <p className="font-grotesk text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-grotesk font-semibold text-snap-ink transition-opacity disabled:opacity-60"
            style={{ background: '#00C9A7' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Start free trial
                <ChevronRight size={16} />
              </>
            )}
          </button>
          <p className="font-grotesk text-xs text-white/30 text-center">
            14-day free trial · No credit card required to start · Cancel anytime
          </p>
        </form>
      </section>
    </main>
  )
}

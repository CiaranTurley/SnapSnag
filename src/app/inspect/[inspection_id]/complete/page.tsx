'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { COUNTRY_CONFIG } from '@/lib/countryConfig'
import type { CountryCode } from '@/lib/countryConfig'
import { Check, FileText, Download, Shield, Star, ChevronRight } from 'lucide-react'

interface InspectionSummary {
  country: CountryCode
  passed_items: number
  failed_items: number
  na_items: number
  total_items: number
  inspector_name: string | null
  property_address_line1: string | null
  property_city: string | null
}

export default function CompletePage({ params }: { params: { inspection_id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isExpert, setIsExpert] = useState(false)
  const [summary, setSummary] = useState<InspectionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/expert/branding')
      .then(r => r.json())
      .then(d => { if (d.subscription) setIsExpert(true) })
      .catch(() => {})

    const supabase = createSupabaseBrowserClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('inspections')
      .select('country,passed_items,failed_items,na_items,total_items,inspector_name,property_address_line1,property_city')
      .eq('id', params.inspection_id)
      .single()
      .then(({ data }: { data: InspectionSummary | null }) => {
        if (data) setSummary(data)
      })
  }, [params.inspection_id])

  async function handleGetReport() {
    setLoading(true)
    setError(null)
    try {
      if (isExpert) {
        const res = await fetch('/api/expert/mark-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspection_id: params.inspection_id }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Something went wrong')
        }
        router.push(`/inspect/${params.inspection_id}/report`)
      } else {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspectionId: params.inspection_id }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error ?? 'Something went wrong')
        router.push(data.url)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const cfg = summary ? (COUNTRY_CONFIG[summary.country] ?? COUNTRY_CONFIG['IE']) : COUNTRY_CONFIG['IE']
  const answeredItems = summary ? (summary.passed_items + summary.failed_items + summary.na_items) : 0

  return (
    <div className="min-h-screen bg-snap-ink flex flex-col px-5 py-8">
      <div className="max-w-md mx-auto w-full flex flex-col">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SnapSnagLogo size="sm" />
        </div>

        {/* Completion badge */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'rgba(0,201,167,0.15)', border: '2px solid rgba(0,201,167,0.3)' }}
          >
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="font-fraunces text-3xl font-bold mb-2">Inspection complete!</h1>
          {summary?.property_address_line1 && (
            <p className="font-grotesk text-sm text-white/40">
              {summary.property_address_line1}{summary.property_city ? `, ${summary.property_city}` : ''}
            </p>
          )}
        </div>

        {/* Stats row */}
        {summary && (
          <div
            className="flex rounded-2xl overflow-hidden mb-6 border"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#1C2840' }}
          >
            <div className="flex-1 text-center py-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="font-fraunces text-2xl font-bold text-snap-pass">{summary.passed_items}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-0.5">Passed</p>
            </div>
            <div className="flex-1 text-center py-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="font-fraunces text-2xl font-bold text-snap-fail">{summary.failed_items}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-0.5">Issues found</p>
            </div>
            <div className="flex-1 text-center py-4">
              <p className="font-fraunces text-2xl font-bold text-white">{answeredItems}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-0.5">Items checked</p>
            </div>
          </div>
        )}

        {/* Expert path — direct to report */}
        {isExpert ? (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-5 border"
              style={{ background: 'rgba(0,201,167,0.08)', borderColor: 'rgba(0,201,167,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} style={{ color: '#00C9A7' }} />
                <span className="font-grotesk text-xs font-semibold text-snap-teal">Expert Plan</span>
              </div>
              <p className="font-grotesk text-sm text-white/70 leading-relaxed">
                Report generation is included in your subscription. Generate your report now.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleGetReport}
              disabled={loading}
              className="btn-primary w-full min-h-[54px] flex items-center justify-center gap-2 font-bold disabled:opacity-60"
              style={{ fontWeight: 700, boxShadow: loading ? 'none' : '0 0 28px rgba(0,201,167,0.25)' }}
            >
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Generating report…</>
              ) : (
                <><FileText size={18} /> Generate report</>
              )}
            </button>
          </div>
        ) : (
          /* One-time payment path */
          <div className="space-y-4">

            {/* One-time card — primary */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'rgba(0,201,167,0.3)', background: 'rgba(0,201,167,0.06)' }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-grotesk text-xs font-semibold text-snap-teal mb-1">One-time</p>
                    <p className="font-fraunces text-3xl font-bold text-white">{cfg.oneTimePriceDisplay}</p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-grotesk font-semibold"
                    style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }}
                  >
                    Recommended
                  </div>
                </div>
                <p className="font-grotesk text-xs text-white/45 mb-4">
                  Pay once, download instantly. No subscription.
                </p>
                <div className="space-y-2">
                  {[
                    'Professional PDF report',
                    'Excel & Word versions',
                    'Builder verification portal',
                    'Snag tracking dashboard',
                    'Permanent cloud storage',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <Check size={13} style={{ color: '#00C9A7', flexShrink: 0 }} />
                      <span className="font-grotesk text-xs text-white/70">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mx-5 mb-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="px-5 pb-5">
                <button
                  onClick={handleGetReport}
                  disabled={loading}
                  className="btn-primary w-full min-h-[52px] flex items-center justify-center gap-2 font-bold disabled:opacity-60"
                  style={{ fontWeight: 700, boxShadow: loading ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}
                >
                  {loading ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Taking you to payment…</>
                  ) : (
                    <><Download size={16} /> Unlock report · {cfg.oneTimePriceDisplay}</>
                  )}
                </button>
              </div>
            </div>

            {/* Expert plan teaser */}
            <Link
              href="/expert"
              className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all hover:border-white/15"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <Shield size={16} className="text-white/50" />
                </div>
                <div>
                  <p className="font-grotesk text-sm font-semibold text-white/70">Expert Plan</p>
                  <p className="font-grotesk text-xs text-white/35">
                    Unlimited reports from {cfg.symbol}{(cfg.expertMonthly / 100).toFixed(2)}/mo
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-white/25" />
            </Link>

            {/* Trust line */}
            <p className="font-grotesk text-[11px] text-white/25 text-center">
              Secure payment via Stripe · Instant access after payment
            </p>
          </div>
        )}

        <Link href="/dashboard" className="font-grotesk text-xs text-white/30 hover:text-white/50 text-center mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

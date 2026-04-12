'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface VerifyResult {
  valid: boolean
  address?: string
  inspectionDate?: string
  country?: string
  passRate?: number
}

const COUNTRY_NAMES: Record<string, string> = {
  IE: 'Ireland', UK: 'United Kingdom', AU: 'Australia', US: 'United States', CA: 'Canada',
}

export default function VerifyReportPage() {
  const supabase = createSupabaseBrowserClient()
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<VerifyResult | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 8) return
    setLoading(true)
    setResult(null)

    type InspRow = {
      id: string
      address: string | null
      created_at: string
      country: string
    }

    const { data } = await supabase
      .from('inspections')
      .select('id, address, created_at, country')
      .eq('verification_code', trimmed)
      .in('status', ['paid', 'completed'])
      .single() as { data: InspRow | null }

    if (!data) {
      setLoading(false)
      setResult({ valid: false })
      return
    }

    // Fetch pass rate from checklist items
    const { data: items } = await supabase
      .from('checklist_items')
      .select('status')
      .eq('inspection_id', data.id) as { data: { status: string | null }[] | null }

    const answered = (items ?? []).filter(i => i.status !== null)
    const passed   = answered.filter(i => i.status === 'pass')
    const passRate = answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : null

    setLoading(false)
    setResult({
      valid: true,
      address: data.address ?? 'Address on file',
      inspectionDate: new Date(data.created_at).toLocaleDateString('en-IE', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      country: COUNTRY_NAMES[data.country] ?? data.country,
      passRate: passRate ?? undefined,
    })
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white" id="main-content">
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-xl mx-auto">
          <Link href="/"
            className="inline-flex items-center gap-2 text-snap-teal font-grotesk text-sm hover:underline min-h-[44px]">
            <ChevronLeft size={16} aria-hidden="true" />
            Back to SnapSnag
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-snap-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
            aria-hidden="true">
            <Search size={24} className="text-snap-teal" />
          </div>
          <h1 className="font-fraunces text-3xl font-bold mb-2">Verify a Report</h1>
          <p className="font-grotesk text-white/50 text-sm">
            Enter the 8-character code from a SnapSnag report to confirm it is genuine.
          </p>
        </div>

        <div className="card border border-white/5 mb-6">
          <form onSubmit={handleVerify} className="flex gap-3" role="search" aria-label="Report verification">
            <label htmlFor="verification-code" className="sr-only">Verification code</label>
            <input
              id="verification-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. AB3X9K2M"
              maxLength={8}
              autoComplete="off"
              spellCheck={false}
              className="input flex-1 font-mono tracking-widest text-center text-lg uppercase"
              aria-label="Enter 8-character verification code"
              required
            />
            <button
              type="submit"
              disabled={loading || code.trim().length !== 8}
              className="btn-primary px-6 disabled:opacity-40 min-h-[44px]"
              aria-label="Verify report"
            >
              {loading ? '…' : 'Verify'}
            </button>
          </form>
        </div>

        {result && (
          <div
            className={`card border ${result.valid ? 'border-snap-pass/30 bg-snap-pass/5' : 'border-snap-fail/30 bg-snap-fail/5'}`}
            role="status"
            aria-live="polite"
          >
            {result.valid ? (
              <div className="flex items-start gap-4">
                <CheckCircle size={24} className="text-snap-pass flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-fraunces text-lg font-bold text-snap-pass">Genuine SnapSnag report</p>
                    <ShieldCheck size={16} className="text-snap-pass" aria-hidden="true" />
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="font-grotesk text-sm text-white/80">
                      <span className="text-white/40">Property: </span>{result.address}
                    </p>
                    <p className="font-grotesk text-sm text-white/80">
                      <span className="text-white/40">Inspection date: </span>{result.inspectionDate}
                    </p>
                    <p className="font-grotesk text-sm text-white/80">
                      <span className="text-white/40">Country: </span>{result.country}
                    </p>
                    {result.passRate !== undefined && (
                      <p className="font-grotesk text-sm text-white/80">
                        <span className="text-white/40">Pass rate: </span>
                        <span style={{ color: result.passRate >= 80 ? '#00D68F' : result.passRate >= 50 ? '#FFB340' : '#FF4D4F' }}>
                          {result.passRate}%
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-lg px-4 py-3">
                    <p className="font-grotesk text-xs text-white/50 leading-relaxed">
                      This report was generated by SnapSnag and has not been altered.
                      The inspection details above match the original report on file.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <XCircle size={24} className="text-snap-fail flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-fraunces text-lg font-bold text-snap-fail mb-1">Code not found</p>
                  <p className="font-grotesk text-sm text-white/60 mb-3">
                    This verification code does not match any SnapSnag report. Check the code and try again.
                  </p>
                  <p className="font-grotesk text-xs text-white/40">
                    If you believe this report is genuine, please{' '}
                    <Link href="/support" className="text-snap-teal hover:underline">contact support</Link>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

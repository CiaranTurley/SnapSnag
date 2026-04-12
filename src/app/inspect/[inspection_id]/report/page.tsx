'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InspectionRow {
  id: string
  address: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  country: string
  verification_code: string | null
  created_at: string
  completed_at: string | null
  total_items: number | null
  status: string | null
  paid_at: string | null
  warranty_expires_at: string | null
}

interface ItemRow {
  status: 'pass' | 'fail' | 'na' | null
  room: string
}

interface BuilderPortalItem {
  id: string
  checklist_item_id: string
  status: 'outstanding' | 'fixed' | 'in_progress' | 'disputed'
  dispute_reason: string | null
  builder_note: string | null
  builder_photo_url: string | null
  buyer_accepted: boolean | null
  updated_at: string
}

interface FailedItem {
  id: string
  room: string
  item_description: string
  severity: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PaymentGate({ inspectionId }: { inspectionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Something went wrong')
      router.push(data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="card border border-snap-teal/40 bg-snap-teal/5 mb-4 text-center">
      <div className="text-3xl mb-3">🔒</div>
      <h2 className="font-fraunces text-lg font-bold text-white mb-2">Unlock your report</h2>
      <p className="font-grotesk text-white/50 text-sm leading-relaxed mb-4">
        One-time payment to download your full PDF, Word, and Excel reports.
      </p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-primary w-full min-h-[52px] flex items-center justify-center font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ fontWeight: 700, boxShadow: loading ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Taking you to payment…
          </span>
        ) : (
          'Pay to unlock →'
        )}
      </button>
      <p className="font-grotesk text-xs text-white/30 mt-3 text-center">
        Not satisfied?{' '}
        <a href="mailto:hello@snapsnagapp.com" className="text-white/50 hover:text-snap-teal transition-colors underline">
          Contact us within 7 days
        </a>{' '}
        for a full refund.
      </p>
    </div>
  )
}

function WarrantyCountdown({ expiresAt }: { expiresAt: string }) {
  const now   = new Date()
  const expiry = new Date(expiresAt)
  const days  = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (days < 0) return null // Already expired — don't show

  const color = days > 90 ? '#00D68F' : days > 30 ? '#FFB340' : '#FF4D4F'
  const label = days > 90 ? 'Good' : days > 30 ? 'Expiring soon' : 'Urgent'

  return (
    <div className="card border mb-4" style={{ borderColor: `${color}40` }}>
      <div className="flex items-center gap-3 mb-2">
        <span style={{ fontSize: 24 }}>🛡️</span>
        <div>
          <h2 className="font-fraunces text-base font-bold" style={{ color }}>
            Builder warranty
          </h2>
          <span className="font-grotesk text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${color}20`, color }}>
            {label}
          </span>
        </div>
      </div>
      <p className="font-grotesk text-white/50 text-sm mb-3">
        Your builder warranty expires in{' '}
        <strong style={{ color }}>{days} day{days !== 1 ? 's' : ''}</strong>
        {' '}— on {expiry.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </p>
      {days <= 30 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="font-grotesk text-red-300 text-xs leading-relaxed">
            ⚠️ Contact your builder immediately with any remaining defects. Once the warranty expires,
            getting repairs covered at no cost becomes significantly harder.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 text-center flex-1 min-w-[90px]">
      <div
        className="text-2xl font-bold font-fraunces mb-1"
        style={{ color: color ?? '#fff' }}
      >
        {value}
      </div>
      <div className="text-white/40 text-xs font-grotesk">{label}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const inspectionId = params.inspection_id as string

  const [inspection, setInspection] = useState<InspectionRow | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
  const [failedItems, setFailedItems] = useState<FailedItem[]>([])
  const [builderPortalItems, setBuilderPortalItems] = useState<BuilderPortalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingWord, setGeneratingWord] = useState(false)
  const [generatingExcel, setGeneratingExcel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isExpert,      setIsExpert]      = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [buyerFeedback, setBuyerFeedback] = useState('')
  const [respondingLoading, setRespondingLoading] = useState(false)

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/expert/branding')
      .then(r => r.json())
      .then(d => { if (d.subscription) setIsExpert(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createSupabaseBrowserClient() as any

      const { data: insp } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single()

      if (!insp) {
        router.push('/dashboard')
        return
      }

      setInspection(insp)

      const { data: checklistItems } = await supabase
        .from('checklist_items')
        .select('id, status, room, item_description, severity')
        .eq('inspection_id', inspectionId)

      const allItems = checklistItems ?? []
      setItems(allItems.map((i: { id: string; status: string | null; room: string; item_description: string; severity: string | null }) => ({ id: i.id, status: i.status, room: i.room })))
      setFailedItems(
        allItems
          .filter((i: { status: string | null }) => i.status === 'fail')
          .map((i: { id: string; room: string; item_description: string; severity: string | null }) => ({
            id: i.id,
            room: i.room,
            item_description: i.item_description,
            severity: i.severity,
          }))
      )

      // Load builder portal responses
      const { data: bItems } = await supabase
        .from('builder_portal_items')
        .select('*')
        .eq('inspection_id', inspectionId)

      setBuilderPortalItems(bItems ?? [])
      setLoading(false)
    }

    load()
  }, [inspectionId, router])

  // ── Generate PDF ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'PDF generation failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setDownloaded(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }, [generating, inspectionId, inspection])

  // ── Generate Word ─────────────────────────────────────────────────────────────
  const handleDownloadWord = useCallback(async () => {
    if (generatingWord) return
    setGeneratingWord(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Word generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGeneratingWord(false)
    }
  }, [generatingWord, inspectionId, inspection])

  // ── Generate Excel ────────────────────────────────────────────────────────────
  const handleDownloadExcel = useCallback(async () => {
    if (generatingExcel) return
    setGeneratingExcel(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Excel generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGeneratingExcel(false)
    }
  }, [generatingExcel, inspectionId, inspection])

  // ── Buyer response (accept / reject builder fix) ─────────────────────────────
  async function handleBuyerResponse(checklistItemId: string, accepted: boolean, feedback?: string) {
    setRespondingLoading(true)
    try {
      const res = await fetch('/api/buyer-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistItemId, accepted, feedback: feedback ?? null }),
      })
      if (!res.ok) throw new Error('Failed to submit response')
      // Refresh builder portal items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createSupabaseBrowserClient() as any
      const { data: bItems } = await supabase
        .from('builder_portal_items')
        .select('*')
        .eq('inspection_id', inspectionId)
      setBuilderPortalItems(bItems ?? [])
      setRespondingTo(null)
      setBuyerFeedback('')
    } catch {
      // non-fatal
    } finally {
      setRespondingLoading(false)
    }
  }

  // ── Share / copy ─────────────────────────────────────────────────────────────
  const handleCopyCode = () => {
    if (inspection?.verification_code) {
      navigator.clipboard.writeText(inspection.verification_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const answered = items.filter(i => i.status !== null)
  const passed = items.filter(i => i.status === 'pass')
  const failed = items.filter(i => i.status === 'fail')
  const na = items.filter(i => i.status === 'na')
  const passRate =
    answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="text-white/40 font-grotesk text-sm">Loading your report…</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-snap-ink px-6 py-10">
      <div className="w-full max-w-lg mx-auto">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <SnapSnagLogo size="md" showTagline />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="font-fraunces text-2xl font-bold text-white mb-2">
            Your inspection report
          </h1>
          <p className="font-grotesk text-white/50 text-sm">
            {inspection?.address ?? 'Your property'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <StatCard label="Pass rate" value={`${passRate}%`} color="#00C9A7" />
          <StatCard label="Passed" value={passed.length} color="#22C55E" />
          <StatCard label="Failed" value={failed.length} color={failed.length > 0 ? '#EF4444' : '#fff'} />
          <StatCard label="N/A" value={na.length} />
          <StatCard label="Checked" value={answered.length} />
        </div>

        {/* Builder responses banner */}
        {builderPortalItems.length > 0 && (() => {
          const fixedCount = builderPortalItems.filter(b => b.status === 'fixed').length
          const inProgressCount = builderPortalItems.filter(b => b.status === 'in_progress').length
          return (
            <div className="card border border-snap-teal/40 bg-snap-teal/5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🏗️</span>
                <div>
                  <h2 className="font-fraunces text-base font-bold text-white">Builder has responded</h2>
                  <p className="font-grotesk text-white/50 text-xs">
                    {fixedCount} fixed · {inProgressCount} in progress · {builderPortalItems.length} total updates
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {builderPortalItems.map(bItem => {
                  const failedItem = failedItems.find(f => f.id === bItem.checklist_item_id)
                  if (!failedItem) return null
                  const needsResponse = bItem.status === 'fixed' && bItem.buyer_accepted === null

                  return (
                    <div
                      key={bItem.id}
                      className={`rounded-xl p-4 border ${
                        bItem.status === 'fixed' && bItem.buyer_accepted === true
                          ? 'border-green-500/30 bg-green-500/5'
                          : bItem.status === 'fixed'
                          ? 'border-snap-teal/30 bg-white/5'
                          : bItem.status === 'in_progress'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      {/* Item description */}
                      <p className="font-grotesk text-white text-xs font-bold mb-1 leading-snug">
                        {failedItem.item_description}
                      </p>
                      <p className="font-grotesk text-white/40 text-xs mb-3">{failedItem.room}</p>

                      {/* Status */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-grotesk ${
                          bItem.status === 'fixed' ? 'bg-green-500/20 text-green-300' :
                          bItem.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' :
                          bItem.status === 'disputed' ? 'bg-white/10 text-white/40' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {bItem.status === 'fixed' ? '✓ Builder says: Fixed' :
                           bItem.status === 'in_progress' ? '⟳ In Progress' :
                           bItem.status === 'disputed' ? '✗ Disputed' : 'Outstanding'}
                        </span>
                        {bItem.buyer_accepted === true && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300 font-grotesk">
                            ✓ You accepted
                          </span>
                        )}
                        {bItem.buyer_accepted === false && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 font-grotesk">
                            ✗ Needs more work
                          </span>
                        )}
                      </div>

                      {/* Builder note */}
                      {bItem.builder_note && (
                        <div className="bg-white/5 rounded-lg px-3 py-2 mb-3">
                          <p className="font-grotesk text-xs text-white/40 mb-1">Builder note:</p>
                          <p className="font-grotesk text-sm text-white/70">{bItem.builder_note}</p>
                        </div>
                      )}

                      {/* Dispute reason */}
                      {bItem.dispute_reason && (
                        <div className="bg-white/5 rounded-lg px-3 py-2 mb-3">
                          <p className="font-grotesk text-xs text-white/40 mb-1">Dispute reason:</p>
                          <p className="font-grotesk text-sm text-white/70">{bItem.dispute_reason}</p>
                        </div>
                      )}

                      {/* Builder fix photo */}
                      {bItem.builder_photo_url && (
                        <div className="mb-3">
                          <p className="font-grotesk text-xs text-white/40 mb-1">Photo of fix:</p>
                          <img
                            src={bItem.builder_photo_url}
                            alt="Builder fix"
                            className="w-28 h-28 object-cover rounded-lg border border-white/10"
                          />
                        </div>
                      )}

                      {/* Buyer response buttons — only for fixed items not yet responded to */}
                      {needsResponse && (
                        respondingTo === bItem.checklist_item_id ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              value={buyerFeedback}
                              onChange={e => setBuyerFeedback(e.target.value)}
                              placeholder="What still needs attention? (optional)"
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-grotesk placeholder:text-white/20 focus:outline-none focus:border-snap-teal resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleBuyerResponse(bItem.checklist_item_id, false, buyerFeedback)}
                                disabled={respondingLoading}
                                className="flex-1 min-h-[36px] rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-grotesk text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {respondingLoading ? 'Saving…' : 'Confirm — needs more work'}
                              </button>
                              <button
                                onClick={() => { setRespondingTo(null); setBuyerFeedback('') }}
                                className="px-4 min-h-[36px] rounded-lg border border-white/20 text-white/50 font-grotesk text-xs font-bold hover:bg-white/5"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleBuyerResponse(bItem.checklist_item_id, true)}
                              disabled={respondingLoading}
                              className="flex-1 min-h-[36px] rounded-lg bg-green-600 hover:bg-green-500 text-white font-grotesk text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              ✓ Accept fix
                            </button>
                            <button
                              onClick={() => setRespondingTo(bItem.checklist_item_id)}
                              className="flex-1 min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 text-white/70 font-grotesk text-xs font-bold transition-colors"
                            >
                              ✗ Needs more work
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Payment gate */}
        {!inspection?.paid_at && !isExpert && (
          <PaymentGate inspectionId={inspectionId} />
        )}

        {/* Downloads — only shown after payment or for experts */}
        {(inspection?.paid_at || isExpert) && (<>

        {/* Warranty countdown */}
        {inspection?.warranty_expires_at && (
          <WarrantyCountdown expiresAt={inspection.warranty_expires_at} />
        )}

        {/* Download card */}
        <div className="card border border-white/10 mb-4">
          <h2 className="font-fraunces text-lg font-bold text-white mb-1">
            Professional PDF report
          </h2>
          <p className="font-grotesk text-white/50 text-sm mb-5 leading-relaxed">
            Your full snagging report with every room, all findings, photos, severity ratings and
            a verification code your builder can check online.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-lg px-4 py-3 mb-4">
              {error} — please try again.
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={generating}
            className="btn-primary w-full min-h-[52px] flex items-center justify-center font-bold mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontWeight: 700, boxShadow: generating ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating your PDF…
              </span>
            ) : downloaded ? (
              '✓ Download again'
            ) : (
              'Download PDF report →'
            )}
          </button>

          {downloaded && (
            <p className="font-grotesk text-center text-white/40 text-xs">
              Check your Downloads folder if it didn't open automatically.
            </p>
          )}
        </div>

        {/* Word + Excel downloads */}
        <div className="card border border-white/10 mb-4">
          <h2 className="font-fraunces text-base font-bold text-white mb-1">
            Also available in
          </h2>
          <p className="font-grotesk text-white/50 text-xs mb-4 leading-relaxed">
            The Word report is great for sending to your builder. The Excel spreadsheet includes a ready-made snagging tracker with columns for the builder to fill in repair dates.
          </p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <button
              onClick={handleDownloadWord}
              disabled={generatingWord}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors font-grotesk text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingWord ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <span className="text-blue-400">📄</span> Download Word (.docx)
                </>
              )}
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={generatingExcel}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors font-grotesk text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingExcel ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <span className="text-green-400">📊</span> Download Excel (.xlsx)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verification code */}
        {inspection?.verification_code && (
          <div className="card border border-white/10 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-fraunces text-base font-bold text-white">Verification code</h2>
              <button
                onClick={handleCopyCode}
                className="font-grotesk text-xs text-snap-teal hover:text-white transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-grotesk text-white/50 text-xs mb-3">
              Anyone can verify your inspection took place at snapsnag.ie/verify
            </p>
            <div className="bg-white/5 rounded-lg px-4 py-3 text-center">
              <span className="font-fraunces text-2xl font-bold tracking-widest text-snap-teal">
                {inspection.verification_code}
              </span>
            </div>
          </div>
        )}

        {/* Share section */}
        <div className="card border border-white/10 mb-6">
          <h2 className="font-fraunces text-base font-bold text-white mb-1">
            Send to your builder
          </h2>
          <p className="font-grotesk text-white/50 text-xs mb-4 leading-relaxed">
            Download the PDF and email it to your builder or developer. Ask them to respond in
            writing with a timeline for each failed item.
          </p>
          <div className="bg-white/5 rounded-lg px-4 py-3">
            <p className="font-grotesk text-white/60 text-xs leading-relaxed italic">
              "Please find attached our SnapSnag inspection report dated{' '}
              {inspection?.completed_at
                ? new Date(inspection.completed_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'today'}
              . We request that all failed items are addressed within 28 days. Verification code:{' '}
              {inspection?.verification_code ?? '—'}."
            </p>
          </div>
        </div>

        {/* Review prompt */}
        {downloaded && (
          <div className="card border border-snap-teal/30 bg-snap-teal/5 mb-6 text-center">
            <div className="text-2xl mb-2">⭐</div>
            <h3 className="font-fraunces text-base font-bold text-white mb-1">
              Happy with SnapSnag?
            </h3>
            <p className="font-grotesk text-white/50 text-xs mb-3">
              Leaving a review helps other homebuyers find us — it takes 30 seconds.
            </p>
            <a
              href="https://g.page/r/snapsnag/review"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-6 py-2 inline-block"
            >
              Leave a review →
            </a>
          </div>
        )}

        </>)}

        {/* Back to dashboard */}
        <div className="text-center">
          <Link href="/dashboard" className="font-grotesk text-sm text-white/40 hover:text-white/60">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

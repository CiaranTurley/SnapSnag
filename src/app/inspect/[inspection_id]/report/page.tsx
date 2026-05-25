'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Download, FileText, FileSpreadsheet, Copy, Check, Share2, Shield, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [codeCopied, setCodeCopied] = useState(false)
  const [isExpert, setIsExpert] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [buyerFeedback, setBuyerFeedback] = useState('')
  const [respondingLoading, setRespondingLoading] = useState(false)
  const [builderExpanded, setBuilderExpanded] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  // ── Stripe session verify ────────────────────────────────────────────────────
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId || !inspectionId) return
    fetch('/api/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, inspectionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.paid) setInspection(prev => prev ? { ...prev, paid_at: prev.paid_at ?? new Date().toISOString() } : prev)
      })
      .catch(() => {})
  }, [searchParams, inspectionId]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const { data: insp } = await supabase.from('inspections').select('*').eq('id', inspectionId).single()
      if (!insp) { router.push('/dashboard'); return }
      setInspection(insp)

      const { data: checklistItems } = await supabase
        .from('checklist_items')
        .select('id, response, room, item_description, severity')
        .eq('inspection_id', inspectionId)

      const allItems = (checklistItems ?? []).map((i: { id: string; response: string | null; room: string; item_description: string; severity: string | null }) => ({ ...i, status: i.response }))
      setItems(allItems.map((i: { id: string; status: string | null; room: string }) => ({ id: i.id, status: i.status, room: i.room })))
      setFailedItems(
        allItems
          .filter((i: { status: string | null }) => i.status === 'fail')
          .map((i: { id: string; room: string; item_description: string; severity: string | null }) => ({
            id: i.id, room: i.room, item_description: i.item_description, severity: i.severity,
          }))
      )

      const { data: bItems } = await supabase.from('builder_portal_items').select('*').eq('inspection_id', inspectionId)
      setBuilderPortalItems(bItems ?? [])
      setLoading(false)
    }
    load()
  }, [inspectionId, router])

  // ── Downloads ────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (generating) return
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? 'PDF generation failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.pdf`; a.click()
      URL.revokeObjectURL(url); setDownloaded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setGenerating(false) }
  }, [generating, inspectionId, inspection])

  const handleDownloadWord = useCallback(async () => {
    if (generatingWord) return
    setGeneratingWord(true); setError(null)
    try {
      const res = await fetch('/api/generate-word', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? 'Word generation failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setGeneratingWord(false) }
  }, [generatingWord, inspectionId, inspection])

  const handleDownloadExcel = useCallback(async () => {
    if (generatingExcel) return
    setGeneratingExcel(true); setError(null)
    try {
      const res = await fetch('/api/generate-excel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? 'Excel generation failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `SnapSnag-Report-${inspection?.verification_code ?? inspectionId.slice(0, 8)}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setGeneratingExcel(false) }
  }, [generatingExcel, inspectionId, inspection])

  // ── Pay ──────────────────────────────────────────────────────────────────────
  async function handlePay() {
    setPayLoading(true); setPayError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Something went wrong')
      router.push(data.url)
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Something went wrong')
      setPayLoading(false)
    }
  }

  // ── Buyer response ───────────────────────────────────────────────────────────
  async function handleBuyerResponse(checklistItemId: string, accepted: boolean, feedback?: string) {
    setRespondingLoading(true)
    try {
      const res = await fetch('/api/buyer-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistItemId, accepted, feedback: feedback ?? null }),
      })
      if (!res.ok) throw new Error('Failed')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createSupabaseBrowserClient() as any
      const { data: bItems } = await supabase.from('builder_portal_items').select('*').eq('inspection_id', inspectionId)
      setBuilderPortalItems(bItems ?? [])
      setRespondingTo(null); setBuyerFeedback('')
    } catch { /* non-fatal */ }
    finally { setRespondingLoading(false) }
  }

  // ── Copy code ────────────────────────────────────────────────────────────────
  function handleCopyCode() {
    if (!inspection?.verification_code) return
    navigator.clipboard.writeText(inspection.verification_code)
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000)
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const answered = items.filter(i => i.status !== null)
  const passed = items.filter(i => i.status === 'pass')
  const failed = items.filter(i => i.status === 'fail')
  const passRate = answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0

  const isPaid = !!(inspection?.paid_at || isExpert)

  const builderFixed = builderPortalItems.filter(b => b.status === 'fixed').length
  const builderPending = builderPortalItems.filter(b => b.status !== 'fixed').length
  const awaitingResponse = builderPortalItems.filter(b => b.status === 'fixed' && b.buyer_accepted === null).length

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <Loader2 size={24} className="text-snap-teal animate-spin" />
      </main>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-snap-ink pb-24">

      {/* Nav */}
      <nav className="border-b border-white/05 px-5 py-4 sticky top-0 z-10" style={{ background: '#0A0F1A' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <SnapSnagLogo size="sm" />
          <Link href="/dashboard" className="font-grotesk text-xs text-white/35 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">

        {/* Header */}
        <div>
          <h1 className="font-fraunces text-2xl font-bold">
            {inspection?.address ?? 'Inspection Report'}
          </h1>
          <p className="font-grotesk text-xs text-white/35 mt-1">
            {inspection?.completed_at ? formatDate(inspection.completed_at) : formatDate(inspection?.created_at ?? '')}
            {inspection?.property_type ? ` · ${inspection.property_type}` : ''}
            {inspection?.bedrooms ? ` · ${inspection.bedrooms} bed` : ''}
          </p>
        </div>

        {/* Stats row */}
        <div className="rounded-2xl border border-white/07 overflow-hidden" style={{ background: '#1C2840' }}>
          <div className="flex">
            <div className="flex-1 text-center py-5 border-r border-white/07">
              <p className="font-fraunces text-4xl font-bold" style={{ color: passRate >= 80 ? '#00D68F' : passRate >= 60 ? '#F59E0B' : '#EF4444' }}>
                {passRate}%
              </p>
              <p className="font-grotesk text-[10px] text-white/35 mt-1">Pass rate</p>
            </div>
            <div className="flex-1 text-center py-5 border-r border-white/07">
              <p className="font-fraunces text-2xl font-bold text-snap-pass">{passed.length}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-1">Passed</p>
            </div>
            <div className="flex-1 text-center py-5 border-r border-white/07">
              <p className="font-fraunces text-2xl font-bold text-snap-fail">{failed.length}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-1">Failed</p>
            </div>
            <div className="flex-1 text-center py-5">
              <p className="font-fraunces text-2xl font-bold text-white">{answered.length}</p>
              <p className="font-grotesk text-[10px] text-white/35 mt-1">Checked</p>
            </div>
          </div>
        </div>

        {/* Warranty countdown */}
        {inspection?.warranty_expires_at && (() => {
          const days = Math.ceil((new Date(inspection.warranty_expires_at).getTime() - Date.now()) / 86400000)
          if (days < 0) return null
          const color = days > 90 ? '#00D68F' : days > 30 ? '#F59E0B' : '#EF4444'
          return (
            <div className="rounded-2xl p-4 border" style={{ background: `${color}0D`, borderColor: `${color}30` }}>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} style={{ color }} />
                <span className="font-grotesk text-xs font-semibold" style={{ color }}>
                  Builder warranty — {days} day{days !== 1 ? 's' : ''} left
                </span>
              </div>
              <p className="font-grotesk text-xs text-white/50">
                Expires {new Date(inspection.warranty_expires_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}.
                {days <= 30 && ' Contact your builder immediately with any remaining defects.'}
              </p>
            </div>
          )
        })()}

        {/* Builder responses */}
        {builderPortalItems.length > 0 && (
          <div className="rounded-2xl border border-white/07 overflow-hidden" style={{ background: '#1C2840' }}>
            <button
              onClick={() => setBuilderExpanded(p => !p)}
              className="w-full px-4 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'rgba(0,201,167,0.12)' }}>
                  🏗️
                </div>
                <div className="text-left">
                  <p className="font-grotesk text-sm font-semibold text-white">Builder has responded</p>
                  <p className="font-grotesk text-[10px] text-white/35 mt-0.5">
                    {builderFixed} fixed · {builderPending} pending
                    {awaitingResponse > 0 && ` · ${awaitingResponse} awaiting your review`}
                  </p>
                </div>
              </div>
              {builderExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
            </button>

            {builderExpanded && (
              <div className="border-t border-white/06">
                {builderPortalItems.map((bItem, idx) => {
                  const failedItem = failedItems.find(f => f.id === bItem.checklist_item_id)
                  if (!failedItem) return null
                  const needsResponse = bItem.status === 'fixed' && bItem.buyer_accepted === null

                  return (
                    <div key={bItem.id}>
                      {idx > 0 && <div className="border-t border-white/04 mx-4" />}
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-grotesk text-xs font-semibold text-white leading-snug">{failedItem.item_description}</p>
                            <p className="font-grotesk text-[10px] text-white/35 mt-0.5">{failedItem.room}</p>
                          </div>
                          <span className="flex-shrink-0 font-grotesk text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{
                              background: bItem.status === 'fixed' && bItem.buyer_accepted === true ? 'rgba(34,197,94,0.15)' :
                                          bItem.status === 'fixed' ? 'rgba(0,201,167,0.12)' :
                                          bItem.status === 'in_progress' ? 'rgba(245,158,11,0.15)' :
                                          'rgba(255,255,255,0.07)',
                              color: bItem.status === 'fixed' && bItem.buyer_accepted === true ? '#22C55E' :
                                     bItem.status === 'fixed' ? '#00C9A7' :
                                     bItem.status === 'in_progress' ? '#F59E0B' :
                                     'rgba(255,255,255,0.4)',
                            }}>
                            {bItem.status === 'fixed' && bItem.buyer_accepted === true ? 'Accepted ✓' :
                             bItem.status === 'fixed' ? 'Fixed — review?' :
                             bItem.status === 'in_progress' ? 'In Progress' :
                             bItem.status === 'disputed' ? 'Disputed' : 'Outstanding'}
                          </span>
                        </div>

                        {bItem.builder_note && (
                          <p className="font-grotesk text-xs text-white/45 mt-2 leading-relaxed">{bItem.builder_note}</p>
                        )}

                        {needsResponse && (
                          respondingTo === bItem.checklist_item_id ? (
                            <div className="mt-3 space-y-2">
                              <textarea
                                value={buyerFeedback}
                                onChange={e => setBuyerFeedback(e.target.value)}
                                placeholder="What still needs attention? (optional)"
                                rows={2}
                                className="w-full rounded-lg px-3 py-2 text-white text-xs font-grotesk placeholder:text-white/20 focus:outline-none focus:border-snap-teal resize-none border border-white/10"
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleBuyerResponse(bItem.checklist_item_id, true)} disabled={respondingLoading}
                                  className="flex-1 min-h-[34px] rounded-lg font-grotesk text-xs font-bold disabled:opacity-50"
                                  style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>
                                  {respondingLoading ? 'Saving…' : 'Accept fix ✓'}
                                </button>
                                <button onClick={() => handleBuyerResponse(bItem.checklist_item_id, false, buyerFeedback)} disabled={respondingLoading}
                                  className="flex-1 min-h-[34px] rounded-lg font-grotesk text-xs font-bold disabled:opacity-50"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                  Needs more work
                                </button>
                                <button onClick={() => { setRespondingTo(null); setBuyerFeedback('') }}
                                  className="px-3 min-h-[34px] rounded-lg font-grotesk text-xs text-white/40 border border-white/10">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setRespondingTo(bItem.checklist_item_id)}
                              className="mt-2 font-grotesk text-xs font-semibold px-3 py-1.5 rounded-lg"
                              style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7' }}>
                              Review fix →
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Payment gate */}
        {!isPaid && (
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(0,201,167,0.06)', borderColor: 'rgba(0,201,167,0.3)' }}>
            <div className="text-3xl mb-3 text-center">🔒</div>
            <h2 className="font-fraunces text-lg font-bold text-white text-center mb-1">Unlock your report</h2>
            <p className="font-grotesk text-white/50 text-sm text-center leading-relaxed mb-4">
              One-time payment — download PDF, Word, and Excel instantly.
            </p>
            {payError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-xl px-4 py-3 mb-4">
                {payError}
              </div>
            )}
            <button onClick={handlePay} disabled={payLoading}
              className="btn-primary w-full min-h-[52px] flex items-center justify-center gap-2 font-bold disabled:opacity-60"
              style={{ fontWeight: 700, boxShadow: payLoading ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}>
              {payLoading ? <><Spinner /> Taking you to payment…</> : 'Pay to unlock →'}
            </button>
            <p className="font-grotesk text-[11px] text-white/25 text-center mt-3">
              Secure payment via Stripe · Instant access
            </p>
          </div>
        )}

        {/* Downloads */}
        {isPaid && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-xl px-4 py-3">
                {error} — please try again.
              </div>
            )}

            {/* PDF — primary */}
            <div className="rounded-2xl border border-white/07 p-5" style={{ background: '#1C2840' }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={15} className="text-snap-teal" />
                <span className="font-grotesk text-xs font-semibold text-snap-teal">Professional PDF</span>
              </div>
              <p className="font-grotesk text-xs text-white/40 mb-4 leading-relaxed">
                Full room-by-room report with photos, severity ratings, and your verification code.
              </p>
              <button onClick={handleDownload} disabled={generating}
                className="btn-primary w-full min-h-[52px] flex items-center justify-center gap-2 font-bold disabled:opacity-60"
                style={{ fontWeight: 700, boxShadow: generating ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}>
                {generating ? <><Spinner /> Generating PDF…</> : downloaded ? <><Check size={16} /> Download again</> : <><Download size={16} /> Download PDF</>}
              </button>
              {downloaded && (
                <p className="font-grotesk text-[11px] text-white/25 text-center mt-2">
                  Check your Downloads folder if it didn't open.
                </p>
              )}
            </div>

            {/* Word + Excel — secondary */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <button onClick={handleDownloadWord} disabled={generatingWord}
                  className="w-full flex items-center justify-center gap-2 min-h-[46px] rounded-xl font-grotesk text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {generatingWord ? <Spinner /> : <FileText size={14} className="text-blue-400" />}
                  {generatingWord ? 'Generating…' : 'Word (.docx)'}
                </button>
                <p className="font-grotesk text-center" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Best viewed on desktop</p>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <button onClick={handleDownloadExcel} disabled={generatingExcel}
                  className="w-full flex items-center justify-center gap-2 min-h-[46px] rounded-xl font-grotesk text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {generatingExcel ? <Spinner /> : <FileSpreadsheet size={14} className="text-green-400" />}
                  {generatingExcel ? 'Generating…' : 'Excel (.xlsx)'}
                </button>
                <p className="font-grotesk text-center" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Best viewed on desktop</p>
              </div>
            </div>

            {/* Verification code + share */}
            {inspection?.verification_code && (
              <div className="rounded-2xl border border-white/07 overflow-hidden" style={{ background: '#1C2840' }}>
                {/* Code */}
                <div className="px-5 pt-5 pb-4 border-b border-white/06">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-grotesk text-xs font-semibold text-white/50">Verification code</p>
                    <button onClick={handleCopyCode}
                      className="flex items-center gap-1.5 font-grotesk text-xs font-semibold transition-colors"
                      style={{ color: codeCopied ? '#00D68F' : '#00C9A7' }}>
                      {codeCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="rounded-xl py-4 text-center" style={{ background: 'rgba(0,201,167,0.08)' }}>
                    <span className="font-fraunces text-3xl font-bold tracking-widest text-snap-teal">
                      {inspection.verification_code}
                    </span>
                  </div>
                  <p className="font-grotesk text-[10px] text-white/30 mt-2 text-center">
                    Anyone can verify this report at snapsnagapp.com/verify
                  </p>
                </div>

                {/* Share */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Share2 size={13} className="text-white/40" />
                    <p className="font-grotesk text-xs font-semibold text-white/50">Send to your builder</p>
                  </div>
                  {/* Direct link */}
                  <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3" style={{ background: 'rgba(0,201,167,0.07)', border: '1px solid rgba(0,201,167,0.15)' }}>
                    <p className="font-grotesk text-xs text-snap-teal font-mono truncate">
                      snapsnagapp.com/builder/{inspection.verification_code}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://snapsnagapp.com/builder/${inspection.verification_code}`)
                        setCodeCopied(true)
                        setTimeout(() => setCodeCopied(false), 2000)
                      }}
                      className="shrink-0 font-grotesk text-xs font-semibold transition-colors"
                      style={{ color: codeCopied ? '#00D68F' : '#00C9A7' }}
                    >
                      {codeCopied ? <><Check size={12} className="inline mr-1" />Copied</> : <><Copy size={12} className="inline mr-1" />Copy link</>}
                    </button>
                  </div>
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="font-grotesk text-xs text-white/55 leading-relaxed italic">
                      "Please find attached our SnapSnag inspection report dated{' '}
                      {inspection?.completed_at ? formatDate(inspection.completed_at) : 'today'}.
                      We request all failed items are addressed within 28 days. Builder portal: snapsnagapp.com/builder/{inspection.verification_code}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Review prompt */}
            {downloaded && (
              <div className="rounded-2xl border text-center py-5 px-5"
                style={{ background: 'rgba(0,201,167,0.06)', borderColor: 'rgba(0,201,167,0.2)' }}>
                <p className="text-2xl mb-2">⭐</p>
                <h3 className="font-fraunces text-base font-bold text-white mb-1">Happy with SnapSnag?</h3>
                <p className="font-grotesk text-xs text-white/45 mb-3">
                  Leaving a review helps other homebuyers find us — 30 seconds.
                </p>
                <a href="https://g.page/r/snapsnag/review" target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-sm px-6 py-2 inline-block">
                  Leave a review →
                </a>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}

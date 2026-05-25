'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Inspection {
  id: string
  property_address_line1: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  created_at: string
  builder_name: string | null
}

interface ChecklistItem {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  severity: string | null
  note: string | null
  photo_urls: string[] | null
  voice_note_url: string | null
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

type FilterType = 'open' | 'resolved' | 'major'
type ActionType = 'fix' | 'dispute' | 'progress' | null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    critical: { label: 'Critical', bg: 'bg-red-900/60', text: 'text-red-300' },
    major: { label: 'Major', bg: 'bg-amber-900/60', text: 'text-amber-300' },
    minor: { label: 'Minor', bg: 'bg-blue-900/60', text: 'text-blue-300' },
  }
  const s = map[severity ?? 'minor'] ?? map.minor
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-grotesk ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function StatusPill({ status }: { status: BuilderPortalItem['status'] | 'outstanding' }) {
  const map: Record<string, { label: string; cls: string }> = {
    outstanding: { label: 'Outstanding', cls: 'bg-white/10 text-white/60' },
    in_progress: { label: 'In Progress', cls: 'bg-amber-500/20 text-amber-300' },
    fixed: { label: 'Fixed', cls: 'bg-green-500/20 text-green-300' },
    disputed: { label: 'Disputed', cls: 'bg-white/10 text-white/40' },
  }
  const s = map[status] ?? map.outstanding
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-grotesk ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ─── Image upload helper ───────────────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
      if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.82)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuilderDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const verificationCode = (params.verification_code as string).toUpperCase()

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [builderItems, setBuilderItems] = useState<Map<string, BuilderPortalItem>>(new Map())
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [filter, setFilter] = useState<FilterType>('open')

  // Modal state
  const [activeItem, setActiveItem] = useState<ChecklistItem | null>(null)
  const [action, setAction] = useState<ActionType>(null)
  const [builderNote, setBuilderNote] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [builderPhoto, setBuilderPhoto] = useState<File | null>(null)
  const [builderPhotoPreview, setBuilderPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Photo enlargement
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseBrowserClient() as any

    // Look up inspection by verification code
    const { data: insp, error: inspError } = await supabase
      .from('inspections')
      .select('id, property_address_line1, property_type, bedrooms, bathrooms, created_at, builder_name')
      .eq('verification_code', verificationCode)
      .single()

    if (inspError || !insp) {
      setAuthError(true)
      setLoading(false)
      return
    }

    setInspection(insp)

    // Store builder session
    const sessionKey = `snapsnag_builder_${verificationCode}`
    const isFirstAccess = !localStorage.getItem(sessionKey)
    localStorage.setItem(sessionKey, JSON.stringify({ inspectionId: insp.id, accessedAt: new Date().toISOString() }))

    // Notify homeowner on first access only
    if (isFirstAccess) {
      fetch('/api/builder-access-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode }),
      }).catch(() => {})
    }

    // Load failed checklist items
    const { data: checklistItems } = await supabase
      .from('checklist_items')
      .select('id, room, room_order, item_description, item_order, severity, written_note, photos, voice_note_url')
      .eq('inspection_id', insp.id)
      .eq('response', 'fail')
      .order('room_order', { ascending: true })
      .order('item_order', { ascending: true })

    setItems((checklistItems ?? []).map((i: Record<string, unknown>) => ({ ...i, note: i.written_note, photo_urls: i.photos })))

    // Load builder portal items
    const { data: bItems } = await supabase
      .from('builder_portal_items')
      .select('*')
      .eq('inspection_id', insp.id)

    const bMap = new Map<string, BuilderPortalItem>()
    for (const b of (bItems ?? [])) {
      bMap.set(b.checklist_item_id, b)
    }
    setBuilderItems(bMap)
    setLoading(false)
  }, [verificationCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Photo handler ─────────────────────────────────────────────────────────────

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBuilderPhoto(file)
    const reader = new FileReader()
    reader.onload = ev => setBuilderPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Open / close modal ────────────────────────────────────────────────────────

  function openModal(item: ChecklistItem, type: ActionType) {
    setActiveItem(item)
    setAction(type)
    setBuilderNote('')
    setDisputeReason('')
    setBuilderPhoto(null)
    setBuilderPhotoPreview(null)
    setSubmitError(null)
  }

  function closeModal() {
    setActiveItem(null)
    setAction(null)
    setSubmitError(null)
  }

  // ── Submit update ─────────────────────────────────────────────────────────────

  async function handleSubmitUpdate() {
    if (!activeItem || !action) return
    if (action === 'fix' && !builderPhoto) {
      setSubmitError('A photo of the completed fix is required.')
      return
    }
    if (action === 'fix' && !builderNote.trim()) {
      setSubmitError('A description of the work carried out is required.')
      return
    }
    if (action === 'dispute' && !disputeReason.trim()) {
      setSubmitError('Please provide a reason for disputing this item.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      let photoUrl: string | null = null

      // Upload builder photo if provided
      if (builderPhoto && action === 'fix') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createSupabaseBrowserClient() as any
        const compressed = await compressImage(builderPhoto)
        const ext = 'jpg'
        const path = `${inspection!.id}/${activeItem.id}-fix.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('builder-photos')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('builder-photos').getPublicUrl(path)
          photoUrl = urlData?.publicUrl ?? null
        }
      }

      const statusMap: Record<NonNullable<ActionType>, BuilderPortalItem['status']> = {
        fix: 'fixed',
        dispute: 'disputed',
        progress: 'in_progress',
      }

      const res = await fetch('/api/builder-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationCode,
          checklistItemId: activeItem.id,
          status: statusMap[action],
          builderNote: action === 'fix' ? builderNote.trim() || null : null,
          disputeReason: action === 'dispute' ? disputeReason.trim() : null,
          builderPhotoUrl: photoUrl,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Update failed')
      }

      // Refresh builder items
      await loadData()
      closeModal()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filter items ──────────────────────────────────────────────────────────────

  const resolvedCount = Array.from(builderItems.values()).filter(b => b.status === 'fixed').length
  const majorCount = items.filter(i => i.severity === 'major' || i.severity === 'critical').length
  const openCount = items.length - resolvedCount
  const totalCount = items.length

  const filteredItems = items.filter(item => {
    const bItem = builderItems.get(item.id)
    const status = bItem?.status ?? 'outstanding'
    const isFixed = status === 'fixed'
    if (filter === 'resolved') return isFixed
    if (filter === 'major') return (item.severity === 'major' || item.severity === 'critical') && !isFixed
    return !isFixed // 'open'
  })

  // ── Auth error ────────────────────────────────────────────────────────────────

  if (!loading && authError) {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center"><SnapSnagLogo size="md" /></div>
          <div className="card border border-white/10">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="font-fraunces text-xl font-bold text-white mb-2">Invalid access code</h1>
            <p className="font-grotesk text-white/50 text-sm mb-6">
              The code <span className="text-white font-bold">{verificationCode}</span> doesn't match any inspection report. Check the PDF and try again.
            </p>
            <button
              onClick={() => router.push('/builder')}
              className="btn-primary w-full min-h-[44px] font-bold"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="text-white/40 font-grotesk text-sm">Loading inspection…</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-snap-ink">

      {/* Photo enlargement overlay */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
          onClick={() => setEnlargedPhoto(null)}
        >
          <img src={enlargedPhoto} alt="Enlarged photo" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            className="absolute top-6 right-6 text-white/60 hover:text-white text-2xl"
            onClick={() => setEnlargedPhoto(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Action modal */}
      {activeItem && action && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1A1D2E] border border-white/10 rounded-2xl p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-4">
                <SeverityBadge severity={activeItem.severity} />
                <p className="font-grotesk text-white text-sm font-bold mt-2 leading-snug">
                  {activeItem.item_description}
                </p>
                <p className="font-grotesk text-white/40 text-xs mt-1">{activeItem.room}</p>
              </div>
              <button onClick={closeModal} className="text-white/40 hover:text-white text-xl flex-shrink-0">✕</button>
            </div>

            {/* Fix form */}
            {action === 'fix' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-fraunces text-base font-bold text-white">Mark as Fixed</h3>
                  <p className="font-grotesk text-xs text-white/40 mt-1">Both a photo and description are required to close a snag.</p>
                </div>
                <div>
                  <label className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-2 block">
                    Photo of completed fix <span className="text-red-400">*</span>
                  </label>
                  {builderPhotoPreview ? (
                    <div className="relative">
                      <img src={builderPhotoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                      <button
                        onClick={() => { setBuilderPhoto(null); setBuilderPhotoPreview(null) }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                      >✕</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-snap-teal/50 transition-colors">
                      <span className="text-2xl">📷</span>
                      <span className="text-white/50 font-grotesk text-sm font-semibold">Upload photo of the fix</span>
                      <span className="text-white/25 font-grotesk text-xs">Required to close this snag</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-2 block">
                    Description of work carried out <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={builderNote}
                    onChange={e => setBuilderNote(e.target.value)}
                    placeholder="e.g. Skirting board removed, gap filled and mitre-cut corner re-fitted. Painted to match on 15 March."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-grotesk placeholder:text-white/20 focus:outline-none focus:border-snap-teal resize-none"
                  />
                </div>
              </div>
            )}

            {/* Dispute form */}
            {action === 'dispute' && (
              <div className="space-y-4">
                <h3 className="font-fraunces text-base font-bold text-white">Dispute this item</h3>
                <div>
                  <label className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-2 block">
                    Reason for disputing <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="e.g. This item is outside the scope of our contract / This was already present before handover"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-grotesk placeholder:text-white/20 focus:outline-none focus:border-snap-teal resize-none"
                  />
                </div>
              </div>
            )}

            {/* In progress (no extra fields) */}
            {action === 'progress' && (
              <div>
                <h3 className="font-fraunces text-base font-bold text-white mb-2">Mark as In Progress</h3>
                <p className="font-grotesk text-white/50 text-sm">
                  This will notify the homebuyer that work on this item has started.
                </p>
              </div>
            )}

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-lg px-4 py-3 mt-4">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 min-h-[44px] rounded-xl border border-white/20 text-white/60 font-grotesk text-sm font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUpdate}
                disabled={submitting}
                className="flex-1 min-h-[44px] rounded-xl font-grotesk text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  backgroundColor: action === 'fix' ? '#22C55E' : action === 'progress' ? '#F59E0B' : '#6B7280',
                  color: '#fff',
                }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </span>
                ) : action === 'fix' ? 'Confirm fixed' : action === 'progress' ? 'Mark in progress' : 'Submit dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="bg-snap-ink border-b border-white/08 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SnapSnagLogo size="sm" />
            <div className="h-5 w-px bg-white/10" />
            <span className="font-grotesk text-xs text-snap-teal font-semibold">Builder Portal</span>
            <span className="font-grotesk text-xs text-white/30">· {verificationCode}</span>
          </div>
          <div className="text-right">
            <p className="font-grotesk text-[11px] text-white/35">{resolvedCount}/{totalCount} resolved</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Property info */}
        <div className="mb-6">
          <h1 className="font-fraunces text-xl font-bold text-white mb-1">
            {inspection?.property_address_line1 ?? 'Inspection Report'}
          </h1>
          <p className="font-grotesk text-white/50 text-sm">
            Inspected {formatDate(inspection?.created_at ?? '')}
            {inspection?.property_type ? ` · ${inspection.property_type}` : ''}
            {inspection?.bedrooms ? ` · ${inspection.bedrooms} bed` : ''}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total defects', value: totalCount, color: '#fff' },
            { label: 'Outstanding', value: totalCount - resolvedCount, color: '#EF4444' },
            { label: 'Fixed', value: resolvedCount, color: '#22C55E' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-fraunces mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-white/40 text-xs font-grotesk">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-5">
          {([
            { key: 'open',     label: `${openCount} Open` },
            { key: 'resolved', label: `${resolvedCount} Resolved` },
            { key: 'major',    label: `${majorCount} Major` },
          ] as { key: FilterType; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full font-grotesk text-sm font-semibold transition-all"
              style={{
                background: filter === tab.key ? 'rgba(0,201,167,0.15)' : 'rgba(255,255,255,0.05)',
                color: filter === tab.key ? '#00C9A7' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${filter === tab.key ? 'rgba(0,201,167,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-white/30 font-grotesk text-sm">
            No items in this category.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/08" style={{ background: '#1C2840' }}>
            {filteredItems.map((item, idx) => {
              const bItem = builderItems.get(item.id)
              const status = bItem?.status ?? 'outstanding'
              const isFixed = status === 'fixed'
              const isDisputed = status === 'disputed'
              const isInProgress = status === 'in_progress'

              const severityDotColor = item.severity === 'critical' ? '#EF4444' : item.severity === 'major' ? '#F59E0B' : '#60A5FA'

              return (
                <div key={item.id}>
                  {idx > 0 && <div className="border-t border-white/06 mx-4" />}
                  <div className="px-4 py-4">
                    {/* Main row */}
                    <div className="flex items-start gap-3">
                      {/* Severity dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: severityDotColor }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-grotesk text-sm font-semibold text-white leading-snug">{item.item_description}</p>
                            <p className="font-grotesk text-xs text-white/35 mt-0.5">{item.room}</p>
                          </div>

                          {/* Right side: badges + action */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Severity badge */}
                            <span className="font-grotesk text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: item.severity === 'critical' ? 'rgba(239,68,68,0.15)' : item.severity === 'major' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.15)',
                                color: item.severity === 'critical' ? '#EF4444' : item.severity === 'major' ? '#F59E0B' : '#60A5FA',
                              }}>
                              {(item.severity ?? 'minor').charAt(0).toUpperCase() + (item.severity ?? 'minor').slice(1)}
                            </span>

                            {/* Status / action */}
                            {isFixed ? (
                              <span className="font-grotesk text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                                Done ✓
                              </span>
                            ) : isInProgress ? (
                              <button onClick={() => openModal(item, 'fix')}
                                className="font-grotesk text-[10px] font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                In Progress
                              </button>
                            ) : isDisputed ? (
                              <span className="font-grotesk text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                                Disputed
                              </span>
                            ) : (
                              <button onClick={() => openModal(item, 'fix')}
                                className="font-grotesk text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                                style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7', border: '1px solid rgba(0,201,167,0.25)' }}>
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable details */}
                        {(item.note || (item.photo_urls && item.photo_urls.length > 0) || bItem?.builder_note || bItem?.builder_photo_url) && (
                          <div className="mt-3 space-y-2">
                            {item.note && (
                              <p className="font-grotesk text-xs text-white/45 leading-relaxed">{item.note}</p>
                            )}
                            {item.photo_urls && item.photo_urls.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {item.photo_urls.map((url, i) => (
                                  <button key={i} onClick={() => setEnlargedPhoto(url)}
                                    className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-snap-teal transition-colors flex-shrink-0">
                                    <img src={url} alt="Defect photo" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {bItem?.builder_note && (
                              <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <p className="font-grotesk text-[10px] text-white/35 mb-1">Your response</p>
                                <p className="font-grotesk text-xs text-white/65">{bItem.builder_note}</p>
                                {bItem.builder_photo_url && (
                                  <button onClick={() => setEnlargedPhoto(bItem.builder_photo_url!)}
                                    className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-white/10 block">
                                    <img src={bItem.builder_photo_url} alt="Fix photo" className="w-full h-full object-cover" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Buyer feedback */}
                        {bItem?.buyer_accepted === false && (
                          <div className="mt-2 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p className="font-grotesk text-xs text-red-400">Buyer not satisfied — needs more work</p>
                            <button onClick={() => openModal(item, 'fix')}
                              className="font-grotesk text-xs font-bold mt-2 px-3 py-1.5 rounded-lg"
                              style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                              Update fix
                            </button>
                          </div>
                        )}

                        {/* Secondary actions for open items */}
                        {!isFixed && !isInProgress && !isDisputed && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => openModal(item, 'progress')}
                              className="font-grotesk text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              In Progress
                            </button>
                            <button onClick={() => openModal(item, 'dispute')}
                              className="font-grotesk text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              Dispute
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="font-grotesk text-white/20 text-xs">
            SnapSnag Builder Portal · Code: {verificationCode}
          </p>
        </div>
      </div>
    </div>
  )
}

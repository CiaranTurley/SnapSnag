'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Download, Share2, CheckSquare, Square, RefreshCw,
  Settings, FileText, Loader2, ExternalLink, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Inspection {
  id: string
  address: string | null
  status: string
  created_at: string
  completed_at: string | null
  total_items: number | null
  share_token: string | null
}

interface Subscription {
  company_name: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function statusColor(s: string) {
  if (s === 'paid' || s === 'completed') return '#22C55E'
  if (s === 'in_progress') return '#F59E0B'
  return '#6B7280'
}

// ─── Share button ───────────────────────────────────────────────────────────────

function ShareButton({ inspection, onTokenSaved }: {
  inspection: Inspection
  onTokenSaved: (id: string, token: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)

  async function handleShare() {
    if (inspection.share_token) {
      const url = `${window.location.origin}/share/${inspection.share_token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/expert/share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_id: inspection.id }),
      })
      if (!res.ok) { toast.error('Failed to generate share link'); return }
      const { token } = await res.json()
      onTokenSaved(inspection.id, token)
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Share link copied!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-grotesk text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ background: 'rgba(0,201,167,0.1)', color: '#00C9A7' }}
      title={inspection.share_token ? 'Copy share link' : 'Generate share link'}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> :
       copied  ? <Check size={12} /> :
       inspection.share_token ? <Copy size={12} /> : <Share2 size={12} />}
      {copied ? 'Copied!' : inspection.share_token ? 'Copy link' : 'Share'}
    </button>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────

function ExpertDashboardInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [sub,         setSub]         = useState<Subscription | null>(null)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [exporting,   setExporting]   = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [subRes, inspRes] = await Promise.all([
      fetch('/api/expert/branding'),
      fetch('/api/dashboard/inspections').catch(() => null),
    ])

    if (subRes.status === 401) { router.push('/login?next=/expert/dashboard'); return }

    const subData = await subRes.json()
    if (!subData.subscription) { router.push('/expert'); return }
    setSub(subData.subscription)

    // Use the main dashboard API if available, else fall back to inspections list
    if (inspRes && inspRes.ok) {
      const data = await inspRes.json()
      setInspections(data.inspections ?? [])
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
    if (searchParams.get('subscribed') === '1') {
      toast.success('Expert plan activated! Welcome aboard.')
    }
  }, [fetchData, searchParams])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const completedIds = inspections
      .filter(i => i.status === 'paid' || i.status === 'completed')
      .map(i => i.id)
    if (selected.size === completedIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(completedIds))
    }
  }

  async function handleExport() {
    if (!selected.size) return
    setExporting(true)
    try {
      const res = await fetch('/api/expert/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection_ids: Array.from(selected) }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Export failed')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `snapsnag-reports-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${selected.size} report${selected.size > 1 ? 's' : ''} exported!`)
    } finally {
      setExporting(false)
    }
  }

  function saveToken(id: string, token: string) {
    setInspections(prev =>
      prev.map(i => i.id === id ? { ...i, share_token: token } : i)
    )
  }

  const completed = inspections.filter(i => i.status === 'paid' || i.status === 'completed')
  const allSelected = selected.size === completed.length && completed.length > 0

  if (loading) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <Loader2 size={24} className="text-snap-teal animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 sticky top-0 z-10" style={{ background: '#0A0F1A' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-fraunces text-lg font-bold">
              Snap<span className="text-snap-teal">Snag</span>
            </Link>
            <span className="font-grotesk text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }}>
              Expert
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/expert/branding"
              className="flex items-center gap-1.5 font-grotesk text-sm text-white/50 hover:text-white transition-colors">
              <Settings size={14} />
              Branding
            </Link>
            <Link href="/dashboard"
              className="font-grotesk text-sm text-white/50 hover:text-white transition-colors">
              All inspections
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Subscription status */}
        {sub && (
          <div className="card border border-white/5 p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-grotesk font-semibold text-sm text-white">{sub.company_name}</p>
              <p className="font-grotesk text-xs text-white/40 mt-0.5">
                {sub.status === 'trial'
                  ? `Free trial · ends ${sub.trial_ends_at ? formatDate(sub.trial_ends_at) : '—'}`
                  : sub.status === 'active'
                  ? `Active · renews ${sub.current_period_end ? formatDate(sub.current_period_end) : '—'}`
                  : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
              </p>
            </div>
            <Link href="/expert/branding"
              className="flex items-center gap-1.5 font-grotesk text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
              <Settings size={12} />
              Edit branding
            </Link>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-fraunces text-2xl font-bold">Reports</h1>
          <div className="flex items-center gap-3">
            <button onClick={fetchData}
              className="flex items-center gap-1.5 font-grotesk text-sm text-white/40 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-grotesk text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: '#00C9A7', color: '#0A0F1A' }}
              >
                {exporting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />}
                Export {selected.size} PDF{selected.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {inspections.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={32} className="text-white/10 mx-auto mb-3" />
            <p className="font-grotesk text-white/40 mb-4">No inspections yet.</p>
            <Link href="/inspect/start"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-grotesk text-sm font-semibold"
              style={{ background: '#00C9A7', color: '#0A0F1A' }}>
              Start an inspection
            </Link>
          </div>
        ) : (
          <div className="card border border-white/5 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/2">
              <button onClick={toggleAll} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
                {allSelected
                  ? <CheckSquare size={16} className="text-snap-teal" />
                  : <Square size={16} />}
              </button>
              <span className="font-grotesk text-xs text-white/30 flex-1">ADDRESS</span>
              <span className="font-grotesk text-xs text-white/30 w-24 text-center hidden md:block">STATUS</span>
              <span className="font-grotesk text-xs text-white/30 w-28 text-right hidden md:block">DATE</span>
              <span className="font-grotesk text-xs text-white/30 w-40 text-right">ACTIONS</span>
            </div>

            {inspections.map(inspection => {
              const isCompleted = inspection.status === 'paid' || inspection.status === 'completed'
              const isSelected  = selected.has(inspection.id)
              return (
                <div
                  key={inspection.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
                >
                  <button
                    onClick={() => isCompleted && toggleSelect(inspection.id)}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: isCompleted ? undefined : 'transparent', cursor: isCompleted ? 'pointer' : 'default' }}
                  >
                    {isSelected
                      ? <CheckSquare size={16} className="text-snap-teal" />
                      : <Square size={16} className="text-white/20" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={isCompleted ? `/inspect/${inspection.id}/report` : `/inspect/${inspection.id}/checklist`}
                      className="font-grotesk text-sm text-white hover:text-snap-teal transition-colors truncate block"
                    >
                      {inspection.address ?? 'No address'}
                    </Link>
                    <span className="font-grotesk text-xs text-white/30 md:hidden">
                      {formatDate(inspection.created_at)}
                    </span>
                  </div>

                  <div className="w-24 text-center hidden md:block">
                    <span
                      className="font-grotesk text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${statusColor(inspection.status)}20`,
                        color: statusColor(inspection.status),
                      }}
                    >
                      {inspection.status === 'paid' ? 'Complete' :
                       inspection.status === 'completed' ? 'Complete' :
                       inspection.status === 'in_progress' ? 'In progress' : inspection.status}
                    </span>
                  </div>

                  <span className="font-grotesk text-xs text-white/30 w-28 text-right hidden md:block">
                    {formatDate(inspection.created_at)}
                  </span>

                  <div className="w-40 flex items-center justify-end gap-2">
                    {isCompleted && (
                      <>
                        <ShareButton inspection={inspection} onTokenSaved={saveToken} />
                        <Link
                          href={`/inspect/${inspection.id}/report`}
                          className="flex items-center gap-1 font-grotesk text-xs text-white/40 hover:text-white transition-colors"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

export default function ExpertDashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-snap-teal border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <ExpertDashboardInner />
    </Suspense>
  )
}

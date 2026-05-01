'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Download, Share2, Settings, FileText, Loader2, Copy, Check, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Inspection {
  id: string
  address: string | null
  status: string
  created_at: string
  total_items: number | null
  passed_items: number | null
  failed_items: number | null
  na_items: number | null
  share_token: string | null
}

interface Subscription {
  company_name: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ShareButton({ inspection, onTokenSaved }: {
  inspection: Inspection
  onTokenSaved: (id: string, token: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (inspection.share_token) {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${inspection.share_token}`)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/expert/share-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inspection_id: inspection.id }) })
      if (!res.ok) { toast.error('Failed to generate share link'); return }
      const { token } = await res.json()
      onTokenSaved(inspection.id, token)
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      toast.success('Share link copied!')
    } finally { setLoading(false) }
  }

  return (
    <button onClick={handleShare} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-grotesk text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ background: 'rgba(0,201,167,0.1)', color: '#00C9A7' }}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : copied ? <Check size={12} /> : inspection.share_token ? <Copy size={12} /> : <Share2 size={12} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

function ExpertDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [exporting, setExporting] = useState<string | null>(null)

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
    if (inspRes && inspRes.ok) {
      const data = await inspRes.json()
      setInspections(data.inspections ?? [])
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
    if (searchParams.get('subscribed') === '1') toast.success('Expert plan activated! Welcome aboard.')
  }, [fetchData, searchParams])

  async function downloadPdf(id: string) {
    setExporting(id)
    try {
      const res = await fetch(`/api/generate-pdf?inspection_id=${id}`)
      if (!res.ok) { toast.error('Failed to generate PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `snapsnag-report-${id.slice(0, 8)}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(null) }
  }

  function saveToken(id: string, token: string) {
    setInspections(prev => prev.map(i => i.id === id ? { ...i, share_token: token } : i))
  }

  const isDone = (i: Inspection) => i.status === 'paid' || i.status === 'completed'
  const isActive = (i: Inspection) => i.status === 'in_progress'

  const filtered = inspections.filter(i => {
    if (filter === 'active') return isActive(i)
    if (filter === 'done') return isDone(i)
    return true
  })

  const doneCount = inspections.filter(isDone).length
  const activeCount = inspections.filter(isActive).length

  // Month count
  const thisMonth = inspections.filter(i => {
    const d = new Date(i.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  if (loading) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <Loader2 size={24} className="text-snap-teal animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white pb-24">
      {/* Nav */}
      <nav className="border-b border-white/5 px-5 py-4 sticky top-0 z-10" style={{ background: '#0A0F1A' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-fraunces text-lg font-bold">
            Snap<span className="text-snap-teal">Snag</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/expert/branding" className="flex items-center gap-1.5 font-grotesk text-sm text-white/40 hover:text-white transition-colors">
              <Settings size={15} />
            </Link>
            <button onClick={fetchData} className="text-white/30 hover:text-white transition-colors">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-fraunces text-2xl font-bold">My Inspections</h1>
            {sub && (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-grotesk text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7' }}>
                  Expert
                </span>
                {thisMonth > 0 && (
                  <span className="font-grotesk text-xs text-white/35">· {thisMonth} this month</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {([
            ['all', `All (${inspections.length})`],
            ['active', `Active (${activeCount})`],
            ['done', `Done (${doneCount})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-4 py-1.5 rounded-full font-grotesk text-sm font-semibold transition-all"
              style={{
                background: filter === key ? 'rgba(0,201,167,0.15)' : 'rgba(255,255,255,0.05)',
                color: filter === key ? '#00C9A7' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${filter === key ? 'rgba(0,201,167,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Inspection cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={32} className="text-white/10 mx-auto mb-3" />
            <p className="font-grotesk text-white/40 mb-4">No inspections yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inspection => {
              const done = isDone(inspection)
              const active = isActive(inspection)
              const total = inspection.total_items ?? 0
              const answered = (inspection.passed_items ?? 0) + (inspection.failed_items ?? 0) + (inspection.na_items ?? 0)
              const progress = total > 0 ? Math.round((answered / total) * 100) : 0
              const fails = inspection.failed_items ?? 0

              return (
                <div key={inspection.id}
                  className="rounded-2xl border p-4 transition-all"
                  style={{ background: '#1C2840', borderColor: active ? 'rgba(0,201,167,0.2)' : 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-grotesk font-semibold text-sm text-white truncate">
                        {inspection.address ?? 'No address'}
                      </p>
                      <p className="font-grotesk text-xs text-white/35 mt-0.5">{formatDate(inspection.created_at)}</p>
                    </div>
                    <span className="flex-shrink-0 font-grotesk text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: done ? 'rgba(0,214,143,0.12)' : active ? 'rgba(0,201,167,0.12)' : 'rgba(255,255,255,0.07)',
                        color: done ? '#00D68F' : active ? '#00C9A7' : 'rgba(255,255,255,0.4)',
                      }}>
                      {done ? 'DONE' : active ? 'ACTIVE' : inspection.status.toUpperCase()}
                    </span>
                  </div>

                  {active && total > 0 && (
                    <div className="mb-3">
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-snap-teal rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="font-grotesk text-[10px] text-white/30 mt-1">{answered}/{total} items · {fails > 0 ? `${fails} fail${fails > 1 ? 's' : ''}` : 'no fails yet'}</p>
                    </div>
                  )}

                  {done && fails > 0 && (
                    <p className="font-grotesk text-xs text-white/35 mb-3">{fails} fail{fails > 1 ? 's' : ''} · {total} items checked</p>
                  )}

                  <div className="flex items-center gap-2">
                    {done && (
                      <>
                        <button onClick={() => downloadPdf(inspection.id)} disabled={exporting === inspection.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-grotesk text-xs font-semibold transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
                          {exporting === inspection.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          PDF
                        </button>
                        <ShareButton inspection={inspection} onTokenSaved={saveToken} />
                      </>
                    )}
                    {active && (
                      <Link href={`/inspect/${inspection.id}/checklist`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-grotesk text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7' }}>
                        Continue →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New inspection FAB */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5 z-40">
        <Link href="/inspect/start"
          className="flex items-center gap-2 px-6 py-3.5 rounded-full font-grotesk font-bold text-sm shadow-lg"
          style={{ background: '#00C9A7', color: '#0A0F1A', boxShadow: '0 0 28px rgba(0,201,167,0.35)' }}>
          <Plus size={18} />
          New Inspection
        </Link>
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

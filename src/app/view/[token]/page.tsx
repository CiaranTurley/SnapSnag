'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Radio, CheckCircle, XCircle, MinusCircle, Loader2, Clock } from 'lucide-react'

interface Inspection {
  id: string
  address: string | null
  status: string
  view_token_expires_at: string | null
}

interface ChecklistItem {
  id: string
  room: string
  room_order: number
  item_description: string
  status: 'pass' | 'fail' | 'na' | null
  severity: string | null
}

function StatusDot({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle size={14} className="text-snap-pass flex-shrink-0" aria-label="Pass" />
  if (status === 'fail') return <XCircle    size={14} className="text-snap-fail flex-shrink-0" aria-label="Fail" />
  if (status === 'na')   return <MinusCircle size={14} className="text-white/30 flex-shrink-0" aria-label="Not applicable" />
  return <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" aria-label="Not checked" />
}

export default function LiveViewPage() {
  const params = useParams()
  const token  = params.token as string

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [items,      setItems]      = useState<ChecklistItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [expired,    setExpired]    = useState(false)
  const [notFound,   setNotFound]   = useState(false)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insp } = await (supabase as any)
        .from('inspections')
        .select('id, address, status, view_token_expires_at')
        .eq('view_token', token)
        .single()

      if (!insp) { setNotFound(true); setLoading(false); return }

      if (insp.view_token_expires_at && new Date(insp.view_token_expires_at) < new Date()) {
        setExpired(true); setLoading(false); return
      }

      setInspection(insp)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: checklistItems } = await (supabase as any)
        .from('checklist_items')
        .select('id, room, room_order, item_description, status, severity')
        .eq('inspection_id', insp.id)
        .order('room_order')
        .order('item_order')

      setItems(checklistItems ?? [])
      setLoading(false)
    }

    load()

    // Real-time subscription — update items as inspector works
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`live-view-${token}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'checklist_items',
      }, async () => {
        // Re-fetch the inspection ID first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: insp } = await (supabase as any)
          .from('inspections')
          .select('id')
          .eq('view_token', token)
          .single()

        if (!insp) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated } = await (supabase as any)
          .from('checklist_items')
          .select('id, room, room_order, item_description, status, severity')
          .eq('inspection_id', insp.id)
          .order('room_order')
          .order('item_order')

        setItems(updated ?? [])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [token, supabase])

  if (loading) return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center">
      <Loader2 size={24} className="text-snap-teal animate-spin" aria-label="Loading" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-fraunces text-2xl font-bold mb-2">Link not found</p>
        <p className="font-grotesk text-white/50 text-sm">This share link doesn&apos;t exist.</p>
      </div>
    </div>
  )

  if (expired) return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
      <div className="text-center">
        <Clock size={32} className="text-white/20 mx-auto mb-4" aria-hidden="true" />
        <p className="font-fraunces text-2xl font-bold mb-2">Link expired</p>
        <p className="font-grotesk text-white/50 text-sm">This inspection share link has expired.</p>
      </div>
    </div>
  )

  const isLive      = inspection?.status === 'in_progress'
  const isComplete  = inspection?.status === 'paid' || inspection?.status === 'completed'
  const answered    = items.filter(i => i.status !== null)
  const passed      = items.filter(i => i.status === 'pass')
  const failed      = items.filter(i => i.status === 'fail')
  const passRate    = answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : null

  // Group by room
  const roomMap = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    if (!roomMap.has(item.room)) roomMap.set(item.room, [])
    roomMap.get(item.room)!.push(item)
  }
  const rooms = Array.from(roomMap.entries()).sort(
    (a, b) => (a[1][0]?.room_order ?? 0) - (b[1][0]?.room_order ?? 0)
  )

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white" id="main-content">
      <header className="border-b border-white/5 px-6 py-4 sticky top-0 z-10" style={{ background: '#0A0F1A' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-fraunces text-lg font-bold">
            Snap<span className="text-snap-teal">Snag</span>
          </Link>
          <div className="flex items-center gap-2 font-grotesk text-xs font-semibold px-3 py-1.5 rounded-full"
            style={isLive
              ? { background: 'rgba(255,79,79,0.15)', color: '#FF4F4F' }
              : { background: 'rgba(0,214,143,0.15)', color: '#00D68F' }}>
            {isLive && <Radio size={12} className="animate-pulse" aria-hidden="true" />}
            {isLive ? 'Live inspection in progress' : 'Inspection complete'}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Property */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-snap-teal flex-shrink-0" aria-hidden="true" />
            <h1 className="font-fraunces text-2xl font-bold">
              {inspection?.address ?? 'Inspection in progress'}
            </h1>
          </div>
          <p className="font-grotesk text-sm text-white/40 ml-6">Read-only view · shared by inspector</p>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-2xl font-bold text-snap-teal">
              {passRate !== null ? `${passRate}%` : '—'}
            </p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Pass rate</p>
          </div>
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-2xl font-bold text-red-400">{failed.length}</p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Issues</p>
          </div>
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-2xl font-bold">{answered.length}</p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Checked</p>
          </div>
        </div>

        {/* Room-by-room */}
        <div className="space-y-4">
          {rooms.map(([room, roomItems]) => {
            const roomAnswered = roomItems.filter(i => i.status !== null).length
            if (roomAnswered === 0) return null
            return (
              <section key={room} className="card border border-white/5 !p-0 overflow-hidden" aria-label={room}>
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-grotesk font-semibold text-sm">{room}</h2>
                  <span className="font-grotesk text-xs text-white/30">{roomAnswered} checked</span>
                </div>
                <ul className="divide-y divide-white/5">
                  {roomItems.filter(i => i.status !== null).map(item => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <StatusDot status={item.status ?? ''} />
                      <span className="font-grotesk text-sm text-white/80 flex-1">{item.item_description}</span>
                      {item.status === 'fail' && item.severity && (
                        <span className="font-grotesk text-xs px-2 py-0.5 rounded-full"
                          style={item.severity === 'critical'
                            ? { background: 'rgba(255,79,79,0.15)', color: '#FF4F4F' }
                            : item.severity === 'major'
                            ? { background: 'rgba(255,179,64,0.15)', color: '#FFB340' }
                            : { background: 'rgba(147,197,253,0.15)', color: '#93C5FD' }}>
                          {item.severity}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        {isLive && (
          <p className="font-grotesk text-xs text-white/25 text-center mt-8">
            This view updates automatically as the inspection progresses.
          </p>
        )}
      </div>
    </main>
  )
}

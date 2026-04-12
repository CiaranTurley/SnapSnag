import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Shield, MapPin, Home, Calendar, Clock, CheckCircle, XCircle, MinusCircle } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  status: 'pass' | 'fail' | 'na' | null
  severity: string | null
  note: string | null
  photo_urls: string[] | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null
  const cfg =
    severity === 'critical' ? { bg: 'bg-red-900/40',    text: 'text-red-300',    label: 'Critical' } :
    severity === 'major'    ? { bg: 'bg-amber-900/40',  text: 'text-amber-300',  label: 'Major' } :
                              { bg: 'bg-blue-900/40',   text: 'text-blue-300',   label: 'Minor' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold font-grotesk ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

// ─── Page (server component) ───────────────────────────────────────────────────

export default async function SharePage({ params }: { params: { token: string } }) {
  const admin = createSupabaseAdminClient()

  const { data: inspection } = await admin
    .from('inspections')
    .select('*')
    .eq('share_token', params.token)
    .maybeSingle()

  if (!inspection) notFound()

  const { data: items } = await admin
    .from('checklist_items')
    .select('id, room, room_order, item_description, item_order, status, severity, note, photo_urls')
    .eq('inspection_id', inspection.id)
    .order('room_order')
    .order('item_order')

  // Get expert branding
  const { data: expertSub } = await admin
    .from('expert_subscriptions')
    .select('company_name, company_logo_url, contact_email, website')
    .eq('user_id', inspection.user_id)
    .in('status', ['trial', 'active'])
    .maybeSingle()

  const allItems = (items ?? []) as ChecklistItem[]
  const failed   = allItems.filter(i => i.status === 'fail')
  const passed   = allItems.filter(i => i.status === 'pass')
  const answered = allItems.filter(i => i.status !== null)
  const passRate = answered.length > 0
    ? Math.round((passed.length / answered.length) * 100)
    : 0

  // Group by room
  const roomMap = new Map<string, ChecklistItem[]>()
  for (const item of allItems) {
    if (!roomMap.has(item.room)) roomMap.set(item.room, [])
    roomMap.get(item.room)!.push(item)
  }
  const rooms = Array.from(roomMap.entries()).sort(
    (a, b) => (a[1][0]?.room_order ?? 0) - (b[1][0]?.room_order ?? 0)
  )

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {expertSub ? (
            <div className="flex items-center gap-3">
              {expertSub.company_logo_url ? (
                <img src={expertSub.company_logo_url} alt={expertSub.company_name}
                  className="h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-snap-teal/20 flex items-center justify-center">
                  <span className="font-fraunces text-snap-teal font-bold text-sm">
                    {expertSub.company_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-grotesk font-semibold text-sm text-white">
                {expertSub.company_name}
              </span>
            </div>
          ) : (
            <Link href="/" className="font-fraunces text-lg font-bold">
              Snap<span className="text-snap-teal">Snag</span>
            </Link>
          )}
          <div className="flex items-center gap-1.5 font-grotesk text-xs text-snap-teal">
            <Shield size={12} />
            Verified Report
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Property info */}
        <div className="mb-8">
          <div className="flex items-start gap-2 mb-1">
            <MapPin size={16} className="text-snap-teal mt-0.5 flex-shrink-0" />
            <h1 className="font-fraunces text-2xl font-bold leading-tight">
              {inspection.address ?? 'Address not provided'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 font-grotesk text-sm text-white/50">
            {inspection.property_type && (
              <span className="flex items-center gap-1.5">
                <Home size={13} />
                {inspection.property_type}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {formatDate(inspection.completed_at ?? inspection.created_at)}
            </span>
            {inspection.duration_seconds && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {formatDuration(inspection.duration_seconds)}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-3xl font-bold" style={{ color: '#00C9A7' }}>{passRate}%</p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Pass Rate</p>
          </div>
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-3xl font-bold text-red-400">{failed.length}</p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Issues Found</p>
          </div>
          <div className="card border border-white/5 p-4 text-center">
            <p className="font-fraunces text-3xl font-bold text-green-400">{passed.length}</p>
            <p className="font-grotesk text-xs text-white/40 mt-1">Items Passed</p>
          </div>
        </div>

        {/* Failed items */}
        {failed.length > 0 && (
          <section className="mb-8">
            <h2 className="font-fraunces text-lg font-bold mb-4 text-red-300">
              Issues requiring attention ({failed.length})
            </h2>
            <div className="space-y-3">
              {failed.map(item => (
                <div key={item.id}
                  className="border border-red-900/40 rounded-xl overflow-hidden">
                  <div className="bg-red-950/30 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-grotesk text-xs text-white/40 mb-0.5">{item.room}</p>
                      <p className="font-grotesk text-sm font-semibold text-white">{item.item_description}</p>
                    </div>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  {(item.note || item.photo_urls?.length) ? (
                    <div className="px-4 py-3 space-y-2">
                      {item.note && (
                        <p className="font-grotesk text-sm text-white/60 leading-relaxed">{item.note}</p>
                      )}
                      {item.photo_urls && item.photo_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.photo_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Photo ${i + 1}`}
                                className="w-24 h-18 rounded-lg object-cover border border-white/10 hover:border-snap-teal/50 transition-colors" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Room summary */}
        <section className="mb-8">
          <h2 className="font-fraunces text-lg font-bold mb-4">Room summary</h2>
          <div className="card border border-white/5 overflow-hidden">
            {rooms.map(([room, roomItems], idx) => {
              const roomFail = roomItems.filter(i => i.status === 'fail').length
              const roomPass = roomItems.filter(i => i.status === 'pass').length
              return (
                <div key={room}
                  className={`flex items-center px-4 py-3 gap-4 ${idx < rooms.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="font-grotesk text-sm text-white flex-1">{room}</span>
                  <div className="flex items-center gap-3 font-grotesk text-xs">
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle size={12} /> {roomPass}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle size={12} /> {roomFail}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Footer / verification */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div>
            <p className="font-grotesk text-xs text-white/30 mb-1">Verification code</p>
            <p className="font-fraunces text-xl font-bold text-snap-teal tracking-widest">
              {inspection.verification_code ?? '—'}
            </p>
            <p className="font-grotesk text-xs text-white/25 mt-1">
              Verify at{' '}
              <Link href="/verify-report" className="text-snap-teal hover:underline">
                snapsnag.ie/verify
              </Link>
            </p>
          </div>
          {expertSub && (
            <div className="font-grotesk text-xs text-white/30 text-right">
              <p>Report by {expertSub.company_name}</p>
              {expertSub.contact_email && <p>{expertSub.contact_email}</p>}
              {expertSub.website && (
                <a href={expertSub.website} target="_blank" rel="noopener noreferrer"
                  className="text-snap-teal hover:underline">{expertSub.website}</a>
              )}
              <p className="mt-1 text-white/15">Powered by SnapSnag</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

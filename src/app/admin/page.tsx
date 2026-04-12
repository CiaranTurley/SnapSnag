'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, TrendingUp, Users, MessageSquare, ClipboardList,
  CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Zap, FileText, DollarSign, Send, ExternalLink,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  inspectionsToday: number
  revenueToday: number
  activeExperts: number
  openTickets: number
}

interface RevenueSeries {
  date: string
  IE: number; UK: number; AU: number; US: number; CA: number
}

interface Inspection {
  id: string
  country: string
  address: string | null
  created_at: string
  paid_at: string | null
  status: string | null
  amount_cents: number | null
  currency: string | null
}

interface Ticket {
  id: string
  user_email: string | null
  category: string
  messages: { role: string; content: string }[]
  status: 'open' | 'resolved' | 'escalated'
  owner_note: string | null
  created_at: string
}

interface Expert {
  id: string
  user_id: string
  email: string
  company_name: string | null
  plan: string
  status: string
  created_at: string
  revenue_cents: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  IE: '🇮🇪', UK: '🇬🇧', AU: '🇦🇺', US: '🇺🇸', CA: '🇨🇦',
}

const COUNTRY_COLORS: Record<string, string> = {
  IE: '#169B62', UK: '#012169', AU: '#00008B', US: '#B22234', CA: '#FF0000',
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: '#818CF8', payment: '#34D399', complaint: '#F87171',
  question: '#60A5FA', legal: '#F472B6', fraud: '#FB923C',
}

const STATUS_CONFIG = {
  escalated: { label: 'Escalated', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: AlertTriangle },
  open:      { label: 'Open',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  resolved:  { label: 'Resolved',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

function formatCurrency(cents: number | null, currency: string | null) {
  if (!cents) return '—'
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', AUD: '$', USD: '$', CAD: '$' }
  return `${symbols[currency ?? 'EUR'] ?? ''}${(cents / 100).toFixed(2)}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-2xl border border-white/7 p-5" style={{ background: '#0D1420' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-grotesk text-xs text-white/40 uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="font-fraunces text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

function TicketRow({ ticket, onUpdate }: { ticket: Ticket; onUpdate: (id: string, u: Partial<Ticket>) => void }) {
  const [expanded, setExpanded] = useState(ticket.status === 'escalated')
  const [noteText, setNoteText] = useState(ticket.owner_note ?? '')
  const [saving, setSaving] = useState(false)
  const cfg = STATUS_CONFIG[ticket.status]
  const Icon = cfg.icon

  async function patch(updates: Partial<Ticket>) {
    setSaving(true)
    const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSaving(false)
    if (res.ok) onUpdate(ticket.id, updates)
  }

  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{
        borderColor: ticket.status === 'escalated' ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)',
        background: '#111827',
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 text-xs font-semibold"
          style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={11} strokeWidth={2.5} />
          {cfg.label}
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
          style={{ background: `${CATEGORY_COLORS[ticket.category] ?? '#6B7280'}20`, color: CATEGORY_COLORS[ticket.category] ?? '#6B7280' }}>
          {ticket.category}
        </span>
        <span className="font-grotesk text-sm text-white flex-1 truncate">{ticket.user_email ?? 'Anonymous'}</span>
        <span className="font-grotesk text-xs text-white/35 flex-shrink-0 hidden md:block">
          {ticket.messages.at(-1)?.content.slice(0, 55)}…
        </span>
        <span className="font-grotesk text-xs text-white/35 flex-shrink-0">{formatDate(ticket.created_at)}</span>
        {expanded ? <ChevronUp size={14} className="text-white/35 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/35 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {ticket.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="px-3 py-2 rounded-xl text-sm max-w-[80%] leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: '#1C2840', color: '#FAFAF8' }
                    : { background: '#0F172A', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }
                  }>
                  <span className="text-xs opacity-50 block mb-1">{msg.role === 'user' ? '👤 User' : '🤖 Support AI'}</span>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Owner note…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20" />
            <button onClick={() => patch({ owner_note: noteText })}
              disabled={saving || noteText === ticket.owner_note}
              className="px-4 py-2 rounded-lg font-grotesk text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }}>
              Save
            </button>
          </div>
          <div className="flex gap-2">
            {ticket.status !== 'resolved' && (
              <button onClick={() => patch({ status: 'resolved' })} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-grotesk text-sm font-semibold disabled:opacity-40"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                <CheckCircle size={13} /> Mark resolved
              </button>
            )}
            {ticket.status === 'resolved' && (
              <button onClick={() => patch({ status: 'open' })} disabled={saving}
                className="px-4 py-2 rounded-lg font-grotesk text-sm text-white/50 border border-white/10 hover:text-white transition-colors">
                Reopen
              </button>
            )}
            <span className="font-grotesk text-xs text-white/20 self-center ml-auto">#{ticket.id.slice(0, 8)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics]         = useState<Metrics | null>(null)
  const [revenue, setRevenue]         = useState<RevenueSeries[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [tickets, setTickets]         = useState<Ticket[]>([])
  const [experts, setExperts]         = useState<Expert[]>([])
  const [loading, setLoading]         = useState(true)
  const [ticketFilter, setTicketFilter] = useState<string>('all')

  // Quick actions state
  const [qaResult, setQaResult]       = useState<string>('')
  const [qaLoading, setQaLoading]     = useState(false)
  const [pdfId, setPdfId]             = useState('')
  const [refundPi, setRefundPi]       = useState('')
  const [refundAmt, setRefundAmt]     = useState('')
  const [emailTemplate, setEmailTemplate] = useState('receipt')
  const [emailTo, setEmailTo]         = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [metricsRes, revenueRes, inspRes, ticketsRes, expertsRes] = await Promise.all([
      fetch('/api/admin/metrics'),
      fetch('/api/admin/revenue'),
      fetch('/api/admin/inspections'),
      fetch('/api/admin/tickets'),
      fetch('/api/admin/experts'),
    ])

    if (metricsRes.status === 401) { router.push('/admin/login'); return }

    const [m, r, i, t, e] = await Promise.all([
      metricsRes.json(), revenueRes.json(), inspRes.json(), ticketsRes.json(), expertsRes.json(),
    ])

    setMetrics(m)
    setRevenue(r.series ?? [])
    setInspections(i.inspections ?? [])
    setTickets(t.tickets ?? [])
    setExperts(e.experts ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  function updateTicket(id: string, updates: Partial<Ticket>) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function runQuickAction(action: string, payload: Record<string, unknown>) {
    setQaLoading(true)
    setQaResult('')
    const res = await fetch('/api/admin/quick-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    })
    const data = await res.json()
    setQaResult(res.ok ? `✅ ${JSON.stringify(data)}` : `❌ ${data.error}`)
    setQaLoading(false)
  }

  const filteredTickets = tickets.filter(t =>
    ticketFilter === 'all' ? true : t.status === ticketFilter
  )

  const escalatedCount = tickets.filter(t => t.status === 'escalated').length
  const openCount      = tickets.filter(t => t.status === 'open').length

  const TICKET_TABS = [
    { key: 'all',       label: 'All' },
    { key: 'open',      label: 'Open' },
    { key: 'escalated', label: 'Escalated' },
    { key: 'resolved',  label: 'Resolved' },
  ]

  // ─── Revenue chart tooltip ───────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-snap-ink-soft border border-white/10 rounded-xl p-3 text-xs font-grotesk shadow-xl">
        <p className="text-white/50 mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-white/70">{COUNTRY_FLAGS[p.name]} {p.name}:</span>
            <span className="text-white font-semibold">€{p.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-fraunces text-2xl font-bold">Dashboard</h1>
          <p className="font-grotesk text-white/40 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 font-grotesk text-sm text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Top metrics ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Inspections today"   value={metrics?.inspectionsToday ?? '—'} icon={ClipboardList} color="#00C9A7" />
        <MetricCard label="Revenue today (EUR)"  value={metrics ? `€${metrics.revenueToday.toFixed(2)}` : '—'} icon={TrendingUp} color="#60A5FA" />
        <MetricCard label="Active experts"       value={metrics?.activeExperts ?? '—'} icon={Users} color="#A78BFA" />
        <MetricCard label="Open tickets"         value={metrics?.openTickets ?? '—'} icon={MessageSquare} color={metrics?.openTickets ? '#F59E0B' : '#22C55E'} />
      </div>

      {/* ── Revenue chart ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 p-6 mb-8" style={{ background: '#0D1420' }}>
        <h2 className="font-fraunces text-lg font-bold mb-5">Revenue — last 30 days</h2>
        {revenue.length === 0 ? (
          <div className="h-48 flex items-center justify-center font-grotesk text-white/30 text-sm">No revenue data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={v => formatShortDate(v)}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'var(--font-grotesk)' }}
                axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'var(--font-grotesk)' }}
                axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value) => `${COUNTRY_FLAGS[value] ?? ''} ${value}`}
                wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-grotesk)', color: 'rgba(255,255,255,0.5)' }} />
              {(['IE','UK','AU','US','CA'] as const).map(c => (
                <Line key={c} type="monotone" dataKey={c} stroke={COUNTRY_COLORS[c]}
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Recent inspections ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 mb-8 overflow-hidden" style={{ background: '#0D1420' }}>
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-fraunces text-lg font-bold">Recent Inspections</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Country', 'Address', 'Date', 'Status', 'Revenue'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide">{h}</th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {inspections.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center font-grotesk text-white/30 text-sm">No inspections yet</td></tr>
              ) : inspections.map(insp => (
                <tr key={insp.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3.5 font-grotesk text-lg">{COUNTRY_FLAGS[insp.country] ?? insp.country}</td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/80 max-w-[220px] truncate">{insp.address ?? '—'}</td>
                  <td className="px-5 py-3.5 font-grotesk text-xs text-white/40 whitespace-nowrap">{formatDate(insp.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-grotesk text-xs px-2 py-1 rounded-full ${
                      insp.paid_at
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-white/5 text-white/40'
                    }`}>
                      {insp.paid_at ? 'Paid' : insp.status ?? 'In progress'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/80">
                    {insp.paid_at ? formatCurrency(insp.amount_cents, insp.currency) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <a href={`/inspect/${insp.id}/report`} target="_blank" rel="noreferrer"
                      className="text-white/25 hover:text-snap-teal transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Support tickets ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 mb-8" style={{ background: '#0D1420' }}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-fraunces text-lg font-bold">Support Tickets</h2>
          {escalatedCount > 0 && (
            <span className="font-grotesk text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              {escalatedCount} escalated
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-white/5 px-6 gap-1">
          {TICKET_TABS.map(tab => (
            <button key={tab.key}
              onClick={() => setTicketFilter(tab.key)}
              className={`font-grotesk text-sm px-4 py-3 border-b-2 transition-colors ${
                ticketFilter === tab.key
                  ? 'border-snap-teal text-snap-teal'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}>
              {tab.label}
              {tab.key === 'escalated' && escalatedCount > 0 && (
                <span className="ml-1.5 text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full">{escalatedCount}</span>
              )}
              {tab.key === 'open' && openCount > 0 && (
                <span className="ml-1.5 text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded-full">{openCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="py-8 text-center font-grotesk text-white/30 text-sm">No tickets</div>
          ) : filteredTickets.map(ticket => (
            <TicketRow key={ticket.id} ticket={ticket} onUpdate={updateTicket} />
          ))}
        </div>
      </div>

      {/* ── Expert subscribers ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 mb-8 overflow-hidden" style={{ background: '#0D1420' }}>
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-fraunces text-lg font-bold">Expert Subscribers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Company', 'Email', 'Plan', 'Status', 'Joined', 'Revenue'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {experts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center font-grotesk text-white/30 text-sm">No expert subscribers yet</td></tr>
              ) : experts.map(exp => (
                <tr key={exp.id}
                  className={`border-b border-white/4 transition-colors ${
                    exp.status === 'active' ? 'hover:bg-emerald-900/10' : 'hover:bg-white/2 opacity-50'
                  }`}>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/90 font-semibold">{exp.company_name ?? '—'}</td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/50">{exp.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-grotesk text-xs px-2 py-1 rounded-full bg-violet-900/40 text-violet-400">{exp.plan}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`font-grotesk text-xs px-2 py-1 rounded-full ${
                      exp.status === 'active' ? 'bg-emerald-900/40 text-emerald-400' :
                      exp.status === 'trial'  ? 'bg-blue-900/40 text-blue-400' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-xs text-white/40">
                    {formatShortDate(exp.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/70">
                    {exp.revenue_cents > 0 ? `€${(exp.revenue_cents / 100).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 p-6" style={{ background: '#0D1420' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,201,167,0.12)' }}>
            <Zap size={15} style={{ color: '#00C9A7' }} />
          </div>
          <h2 className="font-fraunces text-lg font-bold">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Regenerate PDF */}
          <div className="rounded-xl border border-white/7 p-4" style={{ background: '#0A0F1A' }}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-blue-400" />
              <h3 className="font-grotesk text-sm font-semibold">Regenerate PDF</h3>
            </div>
            <input value={pdfId} onChange={e => setPdfId(e.target.value)}
              placeholder="Inspection ID"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 mb-3" />
            <button
              onClick={() => runQuickAction('regen_pdf', { inspection_id: pdfId })}
              disabled={qaLoading || !pdfId}
              className="w-full py-2 rounded-lg font-grotesk text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
              Regenerate
            </button>
          </div>

          {/* Manual refund */}
          <div className="rounded-xl border border-white/7 p-4" style={{ background: '#0A0F1A' }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-amber-400" />
              <h3 className="font-grotesk text-sm font-semibold">Manual Refund</h3>
            </div>
            <input value={refundPi} onChange={e => setRefundPi(e.target.value)}
              placeholder="Payment Intent ID (pi_…)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 mb-2" />
            <input value={refundAmt} onChange={e => setRefundAmt(e.target.value)}
              placeholder="Amount in cents (blank = full)"
              type="number"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 mb-3" />
            <button
              onClick={() => runQuickAction('manual_refund', {
                payment_intent_id: refundPi,
                amount_cents: refundAmt ? parseInt(refundAmt) : undefined,
              })}
              disabled={qaLoading || !refundPi}
              className="w-full py-2 rounded-lg font-grotesk text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              Issue Refund
            </button>
          </div>

          {/* Send test email */}
          <div className="rounded-xl border border-white/7 p-4" style={{ background: '#0A0F1A' }}>
            <div className="flex items-center gap-2 mb-3">
              <Send size={14} className="text-violet-400" />
              <h3 className="font-grotesk text-sm font-semibold">Send Test Email</h3>
            </div>
            <select value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white outline-none mb-2">
              {['receipt','refund','data_deletion','builder_update','purchase_completed','warranty_reminder','expert_cancelled','payment_failed'].map(t => (
                <option key={t} value={t} style={{ background: '#0A0F1A' }}>{t}</option>
              ))}
            </select>
            <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
              placeholder="To email address"
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 mb-3" />
            <button
              onClick={() => runQuickAction('test_email', { template: emailTemplate, to_email: emailTo })}
              disabled={qaLoading || !emailTo}
              className="w-full py-2 rounded-lg font-grotesk text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>
              Send Test
            </button>
          </div>
        </div>

        {/* Result */}
        {(qaLoading || qaResult) && (
          <div className={`mt-4 px-4 py-3 rounded-xl font-grotesk text-sm ${
            qaLoading ? 'text-white/40 bg-white/5' :
            qaResult.startsWith('✅') ? 'text-emerald-400 bg-emerald-900/20 border border-emerald-900/40' :
            'text-red-400 bg-red-900/20 border border-red-900/40'
          }`}>
            {qaLoading ? 'Running…' : qaResult}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabelValue { label: string; value: number }

interface DefectData {
  total: number
  byCountry: LabelValue[]
  byRoom: LabelValue[]
  bySeverity: LabelValue[]
  byPropertyType: LabelValue[]
  topItems: { item: string; count: number }[]
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COUNTRY_COLORS: Record<string, string> = {
  IE: '#169B62', UK: '#012169', AU: '#00008B', US: '#B22234', CA: '#FF0000',
}
const COUNTRY_FLAGS: Record<string, string> = {
  IE: '🇮🇪', UK: '🇬🇧', AU: '🇦🇺', US: '🇺🇸', CA: '🇨🇦',
}
const SEVERITY_COLORS: Record<string, string> = {
  minor:    '#60A5FA',
  major:    '#F59E0B',
  critical: '#EF4444',
}
const ROOM_COLOR = '#00C9A7'
const PIE_FALLBACK_COLORS = ['#818CF8','#34D399','#F87171','#60A5FA','#F472B6','#FB923C']

// ─── Chart helpers ────────────────────────────────────────────────────────────

const AxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => (
  <text x={x} y={y} dy={4} fill="rgba(255,255,255,0.35)" fontSize={11} fontFamily="var(--font-grotesk)" textAnchor="end">
    {(payload?.value ?? '').length > 18 ? (payload?.value ?? '').slice(0, 18) + '…' : payload?.value}
  </text>
)

const XAxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => (
  <text x={x} y={y} dy={12} fill="rgba(255,255,255,0.35)" fontSize={11} fontFamily="var(--font-grotesk)" textAnchor="middle">
    {payload?.value}
  </text>
)

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-snap-ink-soft border border-white/10 rounded-xl px-3 py-2 text-xs font-grotesk shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} defects</p>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/7 overflow-hidden" style={{ background: '#0D1420' }}>
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="font-fraunces text-base font-bold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DefectsPage() {
  const router = useRouter()
  const [data, setData]     = useState<DefectData | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/admin/defects')
    if (res.status === 401) { router.push('/admin/login'); return }
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-8 font-grotesk text-white/40">Failed to load defect data.</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-fraunces text-2xl font-bold">Defect Analytics</h1>
          <p className="font-grotesk text-white/40 text-sm mt-0.5">{data.total.toLocaleString()} anonymised defects recorded</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 font-grotesk text-sm text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* By country */}
        <SectionCard title="Defects by Country">
          {data.byCountry.length === 0 ? (
            <p className="font-grotesk text-white/30 text-sm text-center py-4">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byCountry} layout="vertical" margin={{ left: 20, right: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-grotesk)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={<AxisTick />} axisLine={false} tickLine={false} width={70}
                  tickFormatter={v => `${COUNTRY_FLAGS[v] ?? ''} ${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.byCountry.map(entry => (
                    <Cell key={entry.label} fill={COUNTRY_COLORS[entry.label] ?? '#00C9A7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* By severity */}
        <SectionCard title="Defects by Severity">
          {data.bySeverity.length === 0 ? (
            <p className="font-grotesk text-white/30 text-sm text-center py-4">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.bySeverity} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {data.bySeverity.map(entry => (
                    <Cell key={entry.label} fill={SEVERITY_COLORS[entry.label] ?? '#818CF8'} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--font-grotesk)' }}>{value}</span>}
                />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* By room (top 10) */}
        <SectionCard title="Defects by Room (Top 10)">
          {data.byRoom.length === 0 ? (
            <p className="font-grotesk text-white/30 text-sm text-center py-4">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.byRoom} layout="vertical" margin={{ left: 20, right: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-grotesk)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={<AxisTick />} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" fill={ROOM_COLOR} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* By property type */}
        <SectionCard title="Defects by Property Type">
          {data.byPropertyType.length === 0 ? (
            <p className="font-grotesk text-white/30 text-sm text-center py-4">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.byPropertyType} margin={{ bottom: 30 }}>
                <XAxis dataKey="label" tick={<XAxisTick />} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-grotesk)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.byPropertyType.map((entry, i) => (
                    <Cell key={entry.label} fill={PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Top 20 most common failed items */}
      <SectionCard title="Top 20 Most Commonly Failed Items">
        {data.topItems.length === 0 ? (
          <p className="font-grotesk text-white/30 text-sm text-center py-4">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-4 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide">Item</th>
                  <th className="text-right px-4 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide">Count</th>
                  <th className="px-4 py-3 w-48" />
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((row, i) => {
                  const pct = data.topItems[0] ? Math.round(row.count / data.topItems[0].count * 100) : 0
                  return (
                    <tr key={i} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 font-grotesk text-sm text-white/30">{i + 1}</td>
                      <td className="px-4 py-3 font-grotesk text-sm text-white/80">{row.item}</td>
                      <td className="px-4 py-3 font-grotesk text-sm text-white/70 text-right font-semibold">{row.count}</td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#00C9A7' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

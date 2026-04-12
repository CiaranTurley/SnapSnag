'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Plus, Download, Gift } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GiftCard {
  id: string
  code: string
  amount_cents: number
  currency: string
  purchased_by_email: string | null
  redeemed_by: string | null
  redeemed_at: string | null
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'EUR', label: '🇮🇪 EUR — Ireland', symbol: '€' },
  { code: 'GBP', label: '🇬🇧 GBP — United Kingdom', symbol: '£' },
  { code: 'AUD', label: '🇦🇺 AUD — Australia', symbol: '$' },
  { code: 'USD', label: '🇺🇸 USD — United States', symbol: '$' },
  { code: 'CAD', label: '🇨🇦 CAD — Canada', symbol: '$' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmount(cents: number, currency: string) {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', AUD: '$', USD: '$', CAD: '$' }
  return `${symbols[currency] ?? ''}${(cents / 100).toFixed(2)} ${currency}`
}

function downloadCSV(codes: { code: string; amount_cents: number; currency: string }[], currency: string) {
  const rows = [
    ['Code', 'Value', 'Currency'],
    ...codes.map(c => [c.code, (c.amount_cents / 100).toFixed(2), c.currency]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `snapsnag-gift-cards-${currency}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GiftCardsPage() {
  const router = useRouter()
  const [giftCards, setGiftCards]   = useState<GiftCard[]>([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)

  // Create form
  const [currency, setCurrency]     = useState('EUR')
  const [amountStr, setAmountStr]   = useState('')
  const [quantity, setQuantity]     = useState(10)
  const [error, setError]           = useState('')
  const [lastGenerated, setLastGenerated] = useState<{ code: string; amount_cents: number; currency: string }[]>([])

  async function fetchCards() {
    setLoading(true)
    const res = await fetch('/api/admin/gift-cards')
    if (res.status === 401) { router.push('/admin/login'); return }
    const data = await res.json()
    setGiftCards(data.gift_cards ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCards() }, [])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amount = parseFloat(amountStr)
    if (!amountStr || isNaN(amount) || amount <= 0) { setError('Enter a valid amount.'); return }
    if (quantity < 1 || quantity > 100) { setError('Quantity must be 1–100.'); return }

    setGenerating(true)
    const res = await fetch('/api/admin/gift-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency,
        amount_cents: Math.round(amount * 100),
        quantity,
      }),
    })
    const data = await res.json()
    setGenerating(false)

    if (!res.ok) { setError(data.error ?? 'Failed to generate codes.'); return }

    setLastGenerated(data.gift_cards ?? [])
    await fetchCards()
  }

  const unused = giftCards.filter(c => !c.redeemed_at).length
  const used   = giftCards.filter(c => c.redeemed_at).length

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-fraunces text-2xl font-bold">Gift Cards</h1>
          <p className="font-grotesk text-white/40 text-sm mt-0.5">
            {unused} unused · {used} redeemed · {giftCards.length} total
          </p>
        </div>
        <button onClick={fetchCards}
          className="flex items-center gap-2 font-grotesk text-sm text-white/40 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Generate new codes ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 p-6 mb-8" style={{ background: '#0D1420' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,201,167,0.12)' }}>
            <Plus size={15} style={{ color: '#00C9A7' }} />
          </div>
          <h2 className="font-fraunces text-lg font-bold">Generate New Codes</h2>
        </div>

        <form onSubmit={handleGenerate}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Country / currency */}
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Country / Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white outline-none focus:border-white/20"
                style={{ background: '#0A0F1A' }}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: '#0A0F1A' }}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">
                Value ({CURRENCIES.find(c => c.code === currency)?.symbol})
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="e.g. 19.95"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20"
                required
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Quantity (max 100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white outline-none focus:border-white/20"
                required
              />
            </div>
          </div>

          {error && <p className="font-grotesk text-sm text-red-400 mb-4">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={generating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-grotesk text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#00C9A7', color: '#0A0F1A' }}>
              <Gift size={15} />
              {generating ? 'Generating…' : `Generate ${quantity} Code${quantity !== 1 ? 's' : ''}`}
            </button>

            {lastGenerated.length > 0 && (
              <button type="button"
                onClick={() => downloadCSV(lastGenerated, lastGenerated[0]?.currency ?? currency)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-grotesk text-sm font-semibold transition-colors"
                style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                <Download size={14} />
                Download CSV ({lastGenerated.length} codes)
              </button>
            )}
          </div>
        </form>

        {/* Last generated preview */}
        {lastGenerated.length > 0 && (
          <div className="mt-5 p-4 rounded-xl border border-emerald-900/40 bg-emerald-900/10">
            <p className="font-grotesk text-xs text-emerald-400 font-semibold mb-3">
              ✅ {lastGenerated.length} codes generated — {formatAmount(lastGenerated[0]?.amount_cents ?? 0, lastGenerated[0]?.currency ?? currency)} each
            </p>
            <div className="flex flex-wrap gap-2">
              {lastGenerated.slice(0, 20).map(c => (
                <span key={c.code}
                  className="font-grotesk text-xs px-3 py-1.5 rounded-lg tracking-widest font-semibold"
                  style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7', fontFamily: 'monospace' }}>
                  {c.code}
                </span>
              ))}
              {lastGenerated.length > 20 && (
                <span className="font-grotesk text-xs text-white/30 self-center">+{lastGenerated.length - 20} more in CSV</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── All gift cards ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/7 overflow-hidden" style={{ background: '#0D1420' }}>
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-fraunces text-lg font-bold">All Gift Cards</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Code', 'Value', 'Status', 'Purchased by', 'Created', 'Redeemed'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-grotesk text-xs text-white/35 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center">
                  <RefreshCw size={16} className="animate-spin text-white/30 mx-auto" />
                </td></tr>
              ) : giftCards.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center font-grotesk text-white/30 text-sm">No gift cards yet</td></tr>
              ) : giftCards.map(card => (
                <tr key={card.id}
                  className={`border-b border-white/4 transition-colors ${card.redeemed_at ? 'opacity-45' : 'hover:bg-white/2'}`}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-sm tracking-widest text-white/90">{card.code}</span>
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/80">
                    {formatAmount(card.amount_cents, card.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`font-grotesk text-xs px-2 py-1 rounded-full ${
                      card.redeemed_at
                        ? 'bg-white/5 text-white/30'
                        : 'bg-emerald-900/40 text-emerald-400'
                    }`}>
                      {card.redeemed_at ? 'Used' : 'Unused'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-sm text-white/45">
                    {card.purchased_by_email ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-xs text-white/35">
                    {formatDate(card.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-grotesk text-xs text-white/35">
                    {card.redeemed_at ? formatDate(card.redeemed_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

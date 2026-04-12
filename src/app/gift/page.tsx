'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, ChevronRight, Loader2, Minus, Plus } from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'

const PRESET_AMOUNTS: Record<string, number[]> = {
  IE: [2999, 4999, 9999],
  UK: [2599, 4299, 8599],
  AU: [4999, 7999, 15999],
  US: [3199, 5299, 10599],
  CA: [4299, 6999, 13999],
}

const CURRENCY_SYMBOL: Record<string, string> = {
  IE: '€', UK: '£', AU: 'A$', US: '$', CA: 'C$',
}

export default function GiftPage() {
  const { countryCode, config } = useCountry()
  const symbol    = CURRENCY_SYMBOL[countryCode] ?? '€'
  const currency  = config.currency ?? 'EUR'
  const presets   = PRESET_AMOUNTS[countryCode] ?? PRESET_AMOUNTS.IE

  const [selectedAmount, setSelectedAmount] = useState<number>(presets[0])
  const [customAmount,   setCustomAmount]   = useState('')
  const [useCustom,      setUseCustom]      = useState(false)
  const [quantity,       setQuantity]       = useState(1)
  const [email,          setEmail]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')

  const finalAmount = useCustom
    ? Math.round(parseFloat(customAmount || '0') * 100)
    : selectedAmount

  const bulkDiscount  = quantity >= 5 ? 0.10 : 0
  const unitPrice     = finalAmount * (1 - bulkDiscount)
  const totalPrice    = unitPrice * quantity

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (finalAmount < 100) { setError('Minimum gift card value is ' + symbol + '1'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: finalAmount, currency, quantity, buyer_email: email || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { setError(data.error ?? 'Something went wrong'); return }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white" id="main-content">
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-fraunces text-lg font-bold">
            Snap<span className="text-snap-teal">Snag</span>
          </Link>
          <Link href="/dashboard" className="font-grotesk text-sm text-white/50 hover:text-white transition-colors min-h-[44px] flex items-center">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-snap-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <Gift size={24} className="text-snap-teal" />
          </div>
          <h1 className="font-fraunces text-3xl font-bold mb-2">Gift a SnapSnag report</h1>
          <p className="font-grotesk text-white/50 text-sm">
            The perfect gift for a new build homebuyer. Buy 5+ for a 10% discount.
          </p>
        </div>

        <form onSubmit={handlePurchase} className="space-y-6">
          {/* Amount selection */}
          <fieldset>
            <legend className="font-grotesk text-xs text-white/40 mb-3 uppercase tracking-wider">Gift card value</legend>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setSelectedAmount(p); setUseCustom(false) }}
                  aria-pressed={!useCustom && selectedAmount === p}
                  className="py-3 rounded-xl font-grotesk font-semibold text-sm transition-colors min-h-[44px]"
                  style={!useCustom && selectedAmount === p
                    ? { background: 'rgba(0,201,167,0.15)', color: '#00C9A7', border: '1px solid rgba(0,201,167,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(250,250,248,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {symbol}{(p / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-grotesk text-white/40">{symbol}</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Custom amount"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setUseCustom(true) }}
                onFocus={() => setUseCustom(true)}
                aria-label="Custom gift card amount"
                className="input pl-8"
              />
            </div>
          </fieldset>

          {/* Quantity */}
          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-3 uppercase tracking-wider">
              Quantity {quantity >= 5 && <span className="text-snap-teal ml-2">10% bulk discount</span>}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-fraunces text-2xl font-bold w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(q => Math.min(20, q + 1))}
                aria-label="Increase quantity"
                className="w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors"
              >
                <Plus size={16} />
              </button>
              <span className="font-grotesk text-sm text-white/40">Max 20</span>
            </div>
          </div>

          {/* Recipient email (optional) */}
          <div>
            <label htmlFor="gift-email" className="font-grotesk text-xs text-white/40 block mb-2 uppercase tracking-wider">
              Your email (optional — to receive codes after purchase)
            </label>
            <input
              id="gift-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
            />
          </div>

          {/* Price summary */}
          <div className="card border border-white/5 !py-4">
            <div className="flex justify-between font-grotesk text-sm mb-1">
              <span className="text-white/50">
                {quantity} × {symbol}{(finalAmount / 100).toFixed(2)}
              </span>
              <span>{symbol}{(finalAmount * quantity / 100).toFixed(2)}</span>
            </div>
            {bulkDiscount > 0 && (
              <div className="flex justify-between font-grotesk text-sm mb-1 text-snap-teal">
                <span>Bulk discount (10%)</span>
                <span>−{symbol}{(finalAmount * quantity * bulkDiscount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-grotesk font-semibold mt-2 pt-2 border-t border-white/5">
              <span>Total</span>
              <span className="text-snap-teal">{symbol}{(totalPrice / 100).toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <p className="font-grotesk text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || finalAmount < 100}
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>Purchase gift card{quantity > 1 ? 's' : ''} <ChevronRight size={16} /></>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}

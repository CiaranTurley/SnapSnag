'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Copy, Check, Loader2 } from 'lucide-react'

interface GiftCode {
  code: string
  amount_cents: number
  currency: string
}

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', GBP: '£', AUD: 'A$', USD: '$', CAD: 'C$',
}

function GiftSuccessInner() {
  const searchParams = useSearchParams()
  const sessionId    = searchParams.get('session_id')
  const [codes,   setCodes]   = useState<GiftCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) { setError('Missing session ID'); setLoading(false); return }
    fetch(`/api/gift?session_id=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.codes) setCodes(d.codes)
        else setError(d.error ?? 'Failed to load gift codes')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [sessionId])

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center">
      <Loader2 size={24} className="text-snap-teal animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white" id="main-content">
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 bg-snap-pass/10 rounded-2xl flex items-center justify-center mx-auto mb-6" aria-hidden="true">
          <CheckCircle size={32} className="text-snap-pass" />
        </div>
        <h1 className="font-fraunces text-3xl font-bold mb-3">Gift cards purchased!</h1>
        <p className="font-grotesk text-white/50 text-sm mb-10">
          Share these codes with whoever you&apos;d like — they can enter them at checkout.
        </p>

        {error ? (
          <p className="font-grotesk text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
        ) : (
          <div className="space-y-3 mb-10">
            {codes.map(({ code, amount_cents, currency }) => {
              const symbol = CURRENCY_SYMBOL[currency] ?? '€'
              return (
                <button
                  key={code}
                  onClick={() => copyCode(code)}
                  aria-label={`Copy gift code ${code}`}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/3 hover:border-snap-teal/40 transition-colors group"
                >
                  <div className="text-left">
                    <p className="font-grotesk text-xs text-white/40 mb-1">
                      {symbol}{(amount_cents / 100).toFixed(2)} gift card
                    </p>
                    <p className="font-mono text-lg font-bold text-snap-teal tracking-widest">{code}</p>
                  </div>
                  {copied === code
                    ? <Check size={18} className="text-snap-teal flex-shrink-0" />
                    : <Copy size={18} className="text-white/30 group-hover:text-white/60 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        )}

        <p className="font-grotesk text-xs text-white/30 mb-6">
          Recipients enter their code at checkout to redeem it against a SnapSnag inspection report.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Back to SnapSnag
        </Link>
      </div>
    </main>
  )
}

export default function GiftSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <Loader2 size={24} className="text-snap-teal animate-spin" />
      </div>
    }>
      <GiftSuccessInner />
    </Suspense>
  )
}

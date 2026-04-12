'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'

export default function CompletePage({ params }: { params: { inspection_id: string } }) {
  const router  = useRouter()
  const [loading,   setLoading]   = useState(false)
  const [isExpert,  setIsExpert]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/expert/branding')
      .then(r => r.json())
      .then(d => { if (d.subscription) setIsExpert(true) })
      .catch(() => {})
  }, [])

  async function handleGetReport() {
    setLoading(true)
    setError(null)
    try {
      if (isExpert) {
        // Experts bypass Stripe — mark as paid directly
        const res = await fetch('/api/expert/mark-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspection_id: params.inspection_id }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Something went wrong')
        }
        router.push(`/inspect/${params.inspection_id}/report`)
      } else {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inspectionId: params.inspection_id }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error ?? 'Something went wrong')
        router.push(data.url)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <SnapSnagLogo size="md" showTagline />
        </div>
        <div className="card border border-white/10">
          <div className="text-5xl mb-5">🎉</div>
          <h1 className="font-fraunces text-2xl font-bold mb-3">Inspection complete!</h1>
          <p className="font-grotesk text-white/50 text-sm leading-relaxed mb-2">
            Well done. Your checklist is saved. Get your professional PDF report — includes every
            room, photos, severity ratings, and a verification code.
          </p>
          <p className="font-grotesk text-snap-teal text-sm font-bold mb-8">
            {isExpert ? 'Expert plan — included in your subscription' : 'One-time payment · instant download'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleGetReport}
            disabled={loading}
            className="btn-primary w-full min-h-[52px] flex items-center justify-center font-bold mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontWeight: 700, boxShadow: loading ? 'none' : '0 0 24px rgba(0,201,167,0.25)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {isExpert ? 'Generating report…' : 'Taking you to payment…'}
              </span>
            ) : (
              'Get your report →'
            )}
          </button>

          <Link href="/dashboard" className="font-grotesk text-sm text-white/40 hover:text-white/60">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

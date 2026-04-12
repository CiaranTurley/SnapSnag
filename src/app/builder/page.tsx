'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase'

function BuilderLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefill = searchParams.get('code') ?? ''

  const [code, setCode] = useState(prefill.toUpperCase())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createSupabaseBrowserClient() as any
      const { data, error: dbError } = await supabase
        .from('inspections')
        .select('id, verification_code')
        .eq('verification_code', trimmed)
        .single()

      if (dbError || !data) {
        setError('Invalid code. Check the PDF report and try again.')
        setLoading(false)
        return
      }

      // Store session in localStorage
      localStorage.setItem(
        `snapsnag_builder_${trimmed}`,
        JSON.stringify({ inspectionId: data.id, accessedAt: new Date().toISOString() }),
      )

      router.push(`/builder/${trimmed}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  function handleCodeChange(val: string) {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
  }

  return (
    <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <SnapSnagLogo size="md" showTagline />
        </div>

        {/* Card */}
        <div className="card border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-5">
              <span className="text-sm">🏗️</span>
              <span className="font-grotesk text-xs text-white/60 tracking-wide">BUILDER PORTAL</span>
            </div>
            <h1 className="font-fraunces text-2xl font-bold text-white mb-2">
              SnapSnag Builder Portal
            </h1>
            <p className="font-grotesk text-white/50 text-sm leading-relaxed">
              Enter the access code from the inspection report to view and update defect statuses.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-2 block">
                Access Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder="e.g. A1B2C3D4"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl font-bold font-fraunces text-center tracking-[0.3em] placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-snap-teal transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-grotesk rounded-lg px-4 py-3 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="btn-primary w-full min-h-[52px] flex items-center justify-center font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 700, boxShadow: '0 0 24px rgba(0,201,167,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Checking code…
                </span>
              ) : (
                'Access report →'
              )}
            </button>
          </form>

          <p className="font-grotesk text-center text-white/30 text-xs mt-6 leading-relaxed">
            The access code is printed on the front page of the SnapSnag PDF report.
            Contact the homebuyer if you don't have the code.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BuilderLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-snap-ink" />}>
      <BuilderLoginForm />
    </Suspense>
  )
}

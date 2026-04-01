'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/account/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-snap-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="text-snap-teal" size={28} />
          </div>
          <h1 className="font-fraunces text-3xl font-bold mb-3">Check your email</h1>
          <p className="font-grotesk text-white/60 mb-8">
            We've sent a password reset link to <span className="text-white font-semibold">{email}</span>.
          </p>
          <Link href="/login" className="btn-secondary inline-block">Back to log in</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-snap-ink flex flex-col">
      <nav className="flex items-center px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <img src="/icon-192.png" alt="SnapSnag" width={32} height={32} className="rounded-xl" />
          <span className="font-fraunces text-xl font-bold text-snap-teal">SnapSnag</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-fraunces text-3xl font-bold mb-2">Reset your password</h1>
            <p className="font-grotesk text-white/50 text-sm">
              Enter your email and we'll send you a reset link.
            </p>
          </div>
          <div className="card">
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </div>
          <p className="text-center font-grotesk text-sm text-white/40 mt-6">
            <Link href="/login" className="text-snap-teal hover:brightness-110 font-semibold">
              ← Back to log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

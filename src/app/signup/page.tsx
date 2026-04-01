'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Create the user profile row in the users table
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
      })
    }

    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <main className="min-h-screen bg-snap-ink flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-snap-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📬</span>
          </div>
          <h1 className="font-fraunces text-3xl font-bold mb-3">Check your inbox</h1>
          <p className="font-grotesk text-white/60 mb-8 leading-relaxed">
            We've sent a confirmation link to <span className="text-snap-white font-semibold">{email}</span>.
            Click the link in that email to activate your account.
          </p>
          <Link href="/login" className="btn-secondary inline-block">
            Back to log in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-snap-ink flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <img src="/icon-192.png" alt="SnapSnag" width={32} height={32} className="rounded-xl" />
          <span className="font-fraunces text-xl font-bold text-snap-teal">SnapSnag</span>
        </Link>
        <Link href="/login" className="font-grotesk text-sm text-white/60 hover:text-white transition-colors">
          Already have an account? <span className="text-snap-teal font-semibold">Log in</span>
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-fraunces text-3xl font-bold mb-2">Create your account</h1>
            <p className="font-grotesk text-white/50 text-sm">Free to sign up. Pay only when you generate a report.</p>
          </div>

          <div className="card">
            <form onSubmit={handleSignup} className="space-y-5">
              {/* Name */}
              <div>
                <label className="label">Your name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="font-grotesk text-xs text-white/30 mt-1">Minimum 8 characters</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="font-grotesk">Creating account…</span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span className="font-grotesk">Create free account</span>
                  </>
                )}
              </button>

              <p className="font-grotesk text-xs text-white/30 text-center leading-relaxed">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-white/50 hover:text-white underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>

          <p className="text-center font-grotesk text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-snap-teal hover:brightness-110 font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

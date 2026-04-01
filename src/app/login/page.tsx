'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Welcome back!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-snap-ink flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <img src="/icon-192.png" alt="SnapSnag" width={32} height={32} className="rounded-xl" />
          <span className="font-fraunces text-xl font-bold text-snap-teal">SnapSnag</span>
        </Link>
        <Link href="/signup" className="font-grotesk text-sm text-white/60 hover:text-white transition-colors">
          No account? <span className="text-snap-teal font-semibold">Sign up free</span>
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-fraunces text-3xl font-bold mb-2">Welcome back</h1>
            <p className="font-grotesk text-white/50 text-sm">Log in to your SnapSnag account</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-5">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <Link href="/forgot-password" className="font-grotesk text-xs text-snap-teal hover:brightness-110">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="font-grotesk">Logging in…</span>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span className="font-grotesk">Log in</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center font-grotesk text-sm text-white/40 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-snap-teal hover:brightness-110 font-semibold">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

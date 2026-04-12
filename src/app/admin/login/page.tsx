'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-fraunces text-2xl font-bold text-snap-teal">SnapSnag</span>
          <p className="font-grotesk text-white/50 text-sm mt-1">Admin Dashboard</p>
        </div>

        <div className="card border border-white/5">
          <h1 className="font-fraunces text-xl font-bold mb-4">Sign in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              className="input w-full"
              autoFocus
              required
            />
            {error && <p className="font-grotesk text-sm text-snap-fail">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

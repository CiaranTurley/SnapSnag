'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated!')
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-snap-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/icon-192.png" alt="SnapSnag" width={36} height={36} className="rounded-xl" />
          <span className="font-fraunces text-2xl font-bold text-snap-teal">SnapSnag</span>
        </Link>

        <div className="card border border-white/5">
          <h1 className="font-fraunces text-2xl font-bold mb-2">Set new password</h1>
          <p className="font-grotesk text-sm text-white/50 mb-6">
            Choose a strong password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-grotesk text-xs text-white/50 block mb-1.5">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input w-full"
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div>
              <label className="font-grotesk text-xs text-white/50 block mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="input w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

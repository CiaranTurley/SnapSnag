import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Mail, Shield, Palette } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export default async function AccountPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, created_at')
    .eq('id', user.id)
    .single()

  const p = profile as { name?: string; created_at?: string } | null
  const name = p?.name ?? ''
  const joined = p?.created_at
    ? new Date(p.created_at).toLocaleDateString('en-IE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="SnapSnag" width={30} height={30} className="rounded-xl" />
            <span className="font-fraunces text-lg font-bold text-snap-teal">SnapSnag</span>
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              formAction="/api/auth/signout"
              className="flex items-center gap-2 font-grotesk text-sm text-white/50 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              Log out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-fraunces text-3xl font-bold mb-8">Account</h1>

        {/* Profile card */}
        <div className="card border border-white/5 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-snap-teal/10 flex items-center justify-center flex-shrink-0">
              <User size={24} className="text-snap-teal" />
            </div>
            <div>
              <p className="font-fraunces text-xl font-bold">{name || 'Your account'}</p>
              {joined && (
                <p className="font-grotesk text-xs text-white/40">Member since {joined}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
              <Mail size={16} className="text-white/40 flex-shrink-0" />
              <div>
                <p className="font-grotesk text-xs text-white/40 mb-0.5">Email</p>
                <p className="font-grotesk text-sm text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
              <Shield size={16} className="text-white/40 flex-shrink-0" />
              <div>
                <p className="font-grotesk text-xs text-white/40 mb-0.5">Password</p>
                <p className="font-grotesk text-sm text-white/60">••••••••</p>
              </div>
              <Link
                href="/forgot-password"
                className="ml-auto font-grotesk text-xs text-snap-teal hover:underline"
              >
                Change
              </Link>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card border border-white/5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={18} className="text-white/40" />
            <h2 className="font-fraunces text-lg font-bold">Appearance</h2>
          </div>
          <p className="font-grotesk text-xs text-white/40 mb-3">
            Choose your preferred colour scheme. &ldquo;System&rdquo; follows your device setting.
          </p>
          <ThemeToggle />
        </div>

        {/* Actions */}
        <div className="card border border-white/5 mb-4">
          <h2 className="font-fraunces text-lg font-bold mb-4">Inspections</h2>
          <Link
            href="/dashboard"
            className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/15 transition-colors"
          >
            <span className="font-grotesk text-sm text-white">View all inspections</span>
            <span className="text-white/30">→</span>
          </Link>
        </div>

        {/* Settings link */}
        <div className="card border border-white/5 mb-6">
          <h2 className="font-fraunces text-lg font-bold mb-4">Settings &amp; Privacy</h2>
          <Link
            href="/account/settings"
            className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/15 transition-colors"
          >
            <span className="font-grotesk text-sm text-white">Notifications, data export, delete account</span>
            <span className="text-white/30">→</span>
          </Link>
        </div>

        {/* Danger zone */}
        <div className="card border border-snap-fail/10">
          <h2 className="font-fraunces text-lg font-bold mb-4 text-snap-fail/80">Sign out</h2>
          <form action="/api/auth/signout" method="post">
            <button
              formAction="/api/auth/signout"
              className="w-full font-grotesk text-sm font-semibold text-snap-fail border border-snap-fail/30 rounded-xl px-4 py-3 hover:bg-snap-fail/10 transition-colors"
            >
              Sign out of SnapSnag
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, MessageSquare, Users, BarChart2, Gift, LogOut } from 'lucide-react'

const NAV = [
  { href: '/admin',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/defects',    label: 'Defects',      icon: BarChart2 },
  { href: '/admin/gift-cards', label: 'Gift Cards',   icon: Gift },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  // Don't render sidebar on login page
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-snap-ink text-snap-white flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/5 flex flex-col sticky top-0 h-screen" style={{ background: '#080D17' }}>
        <div className="px-5 py-5 border-b border-white/5">
          <span className="font-fraunces text-lg font-bold text-snap-teal">SnapSnag</span>
          <p className="font-grotesk text-white/30 text-xs mt-0.5">Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-grotesk text-sm transition-all ${
                  active
                    ? 'bg-snap-teal/15 text-snap-teal font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-grotesk text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

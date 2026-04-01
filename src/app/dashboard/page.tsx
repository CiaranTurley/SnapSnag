import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, LogOut } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  // Fetch their inspections
  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, property_address_line1, property_city, status, created_at, failed_items, total_items')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const firstName = (profile as { name?: string } | null)?.name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="SnapSnag" width={30} height={30} className="rounded-xl" />
            <span className="font-fraunces text-lg font-bold text-snap-teal">SnapSnag</span>
          </Link>
          <form action="/auth/signout" method="post">
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

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-fraunces text-3xl font-bold mb-1">
              Hello, {firstName}
            </h1>
            <p className="font-grotesk text-white/50 text-sm">
              {inspections?.length === 0
                ? 'Start your first inspection below.'
                : `You have ${inspections?.length} inspection${inspections?.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <Link href="/inspection/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>New inspection</span>
          </Link>
        </div>

        {/* Inspections list */}
        {!inspections || inspections.length === 0 ? (
          <div className="card border border-white/5 text-center py-16">
            <div className="w-14 h-14 bg-snap-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="text-snap-teal" size={24} />
            </div>
            <h2 className="font-fraunces text-xl font-bold mb-2">No inspections yet</h2>
            <p className="font-grotesk text-white/50 text-sm mb-6">
              Create your first inspection to get started.
            </p>
            <Link href="/inspection/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Start my first inspection
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {inspections.map(inspection => (
              <Link
                key={inspection.id}
                href={`/inspection/${inspection.id}`}
                className="card border border-white/5 hover:border-snap-teal/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-grotesk font-semibold text-snap-white group-hover:text-snap-teal transition-colors">
                    {inspection.property_address_line1 ?? 'Unnamed property'}
                    {inspection.property_city ? `, ${inspection.property_city}` : ''}
                  </p>
                  <p className="font-grotesk text-xs text-white/40 mt-1">
                    {new Date(inspection.created_at).toLocaleDateString('en-IE', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {inspection.total_items > 0 && (
                    <div className="text-right">
                      <p className="font-grotesk text-xs text-snap-fail font-semibold">
                        {inspection.failed_items} issue{inspection.failed_items !== 1 ? 's' : ''}
                      </p>
                      <p className="font-grotesk text-xs text-white/30">
                        of {inspection.total_items} items
                      </p>
                    </div>
                  )}
                  <span className={`font-grotesk text-xs font-semibold px-3 py-1 rounded-full ${
                    inspection.status === 'paid'
                      ? 'bg-snap-pass/10 text-snap-pass'
                      : inspection.status === 'completed'
                      ? 'bg-snap-amber/10 text-snap-amber'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {inspection.status === 'paid' ? 'Report ready' :
                     inspection.status === 'completed' ? 'Complete' : 'In progress'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

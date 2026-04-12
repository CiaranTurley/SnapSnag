import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'SnapSnag Blog — New Build Snagging Guides & Tips',
  description: 'Expert guides on new build snagging, warranty claims, and home inspection tips for Ireland, UK, Australia, USA, and Canada.',
  openGraph: {
    title: 'SnapSnag Blog — New Build Snagging Guides',
    description: 'Expert guides on new build snagging and home inspection tips.',
    type: 'website',
  },
}

const countryFlag: Record<string, string> = {
  IE: '🇮🇪',
  UK: '🇬🇧',
  AU: '🇦🇺',
  US: '🇺🇸',
  CA: '🇨🇦',
}

const countryLabel: Record<string, string> = {
  IE: 'Ireland',
  UK: 'United Kingdom',
  AU: 'Australia',
  US: 'United States',
  CA: 'Canada',
}

export default function BlogPage() {
  const posts = getAllPosts()

  const grouped = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    const key = post.country
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const countryOrder = ['IE', 'UK', 'AU', 'US', 'CA']

  return (
    <main id="main-content" className="min-h-screen bg-snap-ink">
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-fraunces text-xl font-bold text-snap-teal">SnapSnag</Link>
        <Link href="/login" className="font-grotesk text-sm text-white/60 hover:text-white transition-colors">
          Log in
        </Link>
      </nav>

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="mb-2">
          <span className="inline-block bg-snap-teal/10 text-snap-teal font-grotesk text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Resource Hub
          </span>
        </div>
        <h1 className="font-fraunces text-4xl md:text-5xl font-bold text-snap-white mb-4 leading-tight">
          New Build Snagging Guides
        </h1>
        <p className="font-grotesk text-white/60 text-lg max-w-2xl leading-relaxed">
          Everything you need to know about inspecting your new build, understanding your warranty, and protecting your investment — by country.
        </p>
      </div>

      {/* Posts by country */}
      <div className="max-w-5xl mx-auto px-6 pb-24 space-y-16">
        {countryOrder.map(country => {
          const countryPosts = grouped[country]
          if (!countryPosts?.length) return null

          return (
            <section key={country}>
              <h2 className="font-fraunces text-2xl font-bold text-snap-white mb-6 flex items-center gap-3">
                <span>{countryFlag[country]}</span>
                <span>{countryLabel[country]}</span>
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countryPosts.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="block bg-snap-ink-mid border border-snap-border rounded-2xl p-6 hover:border-snap-teal/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{countryFlag[post.country]}</span>
                      <span className="font-grotesk text-xs text-white/40">{post.readingTime} min read</span>
                    </div>
                    <h3 className="font-fraunces text-lg font-bold text-snap-white mb-2 leading-snug group-hover:text-snap-teal transition-colors">
                      {post.title}
                    </h3>
                    <p className="font-grotesk text-sm text-white/50 leading-relaxed line-clamp-3">
                      {post.description}
                    </p>
                    <div className="mt-4 font-grotesk text-xs text-snap-teal font-semibold">
                      Read guide →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* CTA */}
      <div className="border-t border-snap-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="font-fraunces text-3xl font-bold text-snap-white mb-4">Ready to inspect your new build?</h2>
          <p className="font-grotesk text-white/60 mb-8 max-w-xl mx-auto">
            SnapSnag guides you through 86 checks, room by room. Generate a professional PDF report and share it with your builder.
          </p>
          <Link href="/signup" className="btn-primary inline-block">
            Start your inspection
          </Link>
        </div>
      </div>
    </main>
  )
}

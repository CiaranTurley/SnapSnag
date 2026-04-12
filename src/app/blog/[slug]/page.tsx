import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getPost, getAllSlugs } from '@/lib/blog'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost(params.slug)
  if (!post) return {}

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

const countryFlag: Record<string, string> = {
  IE: '🇮🇪', UK: '🇬🇧', AU: '🇦🇺', US: '🇺🇸', CA: '🇨🇦',
}

// MDX component overrides — styled to match SnapSnag dark theme
const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="font-fraunces text-3xl md:text-4xl font-bold text-snap-white mt-10 mb-4 leading-tight" />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props} className="font-fraunces text-2xl font-bold text-snap-white mt-10 mb-3 leading-snug" />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className="font-fraunces text-xl font-bold text-snap-white mt-8 mb-2" />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="font-grotesk text-white/75 text-base leading-relaxed mb-4" />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="font-grotesk text-white/75 list-disc list-inside space-y-2 mb-4 pl-2" />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="font-grotesk text-white/75 list-decimal list-inside space-y-2 mb-4 pl-2" />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed" />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-snap-white" />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} className="text-snap-teal hover:brightness-110 underline underline-offset-2 transition-all" />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote {...props} className="border-l-4 border-snap-teal pl-4 my-6 font-grotesk text-white/60 italic" />
  ),
  hr: () => <hr className="border-snap-border my-8" />,
  // CTA button — use in MDX as <CTA href="..." label="..." />
}

// Inline CTA component available in MDX
function CTA({ href, label }: { href: string; label: string }) {
  return (
    <div className="my-8 p-6 bg-snap-teal/10 border border-snap-teal/20 rounded-2xl text-center">
      <p className="font-grotesk text-white/70 mb-4 text-sm">Ready to inspect your new build?</p>
      <a
        href={href}
        className="inline-block bg-snap-teal text-snap-ink font-grotesk font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
      >
        {label}
      </a>
    </div>
  )
}

const mdxComponents = {
  ...components,
  CTA,
}

export default function BlogPostPage({ params }: Props) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const formattedDate = new Date(post.date).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main id="main-content" className="min-h-screen bg-snap-ink">
      {/* Nav */}
      <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-fraunces text-xl font-bold text-snap-teal">SnapSnag</Link>
        <Link href="/blog" className="font-grotesk text-sm text-white/60 hover:text-white transition-colors">
          ← All guides
        </Link>
      </nav>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-24">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xl">{countryFlag[post.country] ?? '🌍'}</span>
          <span className="font-grotesk text-xs text-white/40">{formattedDate}</span>
          <span className="font-grotesk text-xs text-white/30">·</span>
          <span className="font-grotesk text-xs text-white/40">{post.readingTime} min read</span>
        </div>

        {/* Title */}
        <h1 className="font-fraunces text-3xl md:text-4xl font-bold text-snap-white mb-4 leading-tight">
          {post.title}
        </h1>
        <p className="font-grotesk text-white/60 text-lg mb-10 leading-relaxed border-b border-snap-border pb-8">
          {post.description}
        </p>

        {/* MDX Content */}
        <div className="prose-none">
          <MDXRemote source={post.content} components={mdxComponents} />
        </div>

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-snap-border">
          <Link href="/blog" className="font-grotesk text-sm text-white/40 hover:text-white transition-colors">
            ← Back to all guides
          </Link>
        </div>
      </article>
    </main>
  )
}

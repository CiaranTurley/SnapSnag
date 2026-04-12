/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://snapsnag.ie',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    '/api/*',
    '/dashboard',
    '/account',
    '/inspect/*',
    '/admin/*',
    '/auth/*',
    '/gift/success',
    '/share/*',
    '/view/*',
    '/expert/dashboard',
    '/expert/branding',
  ],
  additionalPaths: async (config) => {
    const fs = require('fs')
    const path = require('path')
    const blogDir = path.join(process.cwd(), 'content', 'blog')
    const slugs = fs.readdirSync(blogDir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''))

    return slugs.map((slug) => ({
      loc: `/blog/${slug}`,
      changefreq: 'monthly',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    }))
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/admin/', '/dashboard', '/inspect/'] },
    ],
  },
}

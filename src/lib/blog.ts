import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  description: string
  metaTitle: string
  metaDescription: string
  date: string
  country: string
  readingTime: number
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export function getAllPosts(): Omit<BlogPost, 'content'>[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))

  return files
    .map(file => {
      const slug = file.replace(/\.mdx$/, '')
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
      const { data, content } = matter(raw)
      const words = content.split(/\s+/).length
      const readingTime = Math.ceil(words / 200)

      return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? '',
        metaTitle: data.metaTitle ?? data.title ?? slug,
        metaDescription: data.metaDescription ?? data.description ?? '',
        date: data.date ?? '2025-01-01',
        country: data.country ?? 'IE',
        readingTime,
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const words = content.split(/\s+/).length
  const readingTime = Math.ceil(words / 200)

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    metaTitle: data.metaTitle ?? data.title ?? slug,
    metaDescription: data.metaDescription ?? data.description ?? '',
    date: data.date ?? '2025-01-01',
    country: data.country ?? 'IE',
    readingTime,
    content,
  }
}

export function getAllSlugs(): string[] {
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''))
}

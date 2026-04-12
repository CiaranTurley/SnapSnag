'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Save, Loader2, ArrowLeft, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subscription {
  company_name: string
  company_logo_url: string | null
  contact_email: string
  phone: string | null
  website: string | null
  status: string
}

export default function ExpertBrandingPage() {
  const router = useRouter()
  const [sub,          setSub]          = useState<Subscription | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [companyName,  setCompanyName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone,        setPhone]        = useState('')
  const [website,      setWebsite]      = useState('')
  const [logo,         setLogo]         = useState<File | null>(null)
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/expert/branding')
      if (res.status === 401) { router.push('/login?next=/expert/branding'); return }
      const { subscription } = await res.json()
      if (!subscription) { router.push('/expert'); return }
      setSub(subscription)
      setCompanyName(subscription.company_name ?? '')
      setContactEmail(subscription.contact_email ?? '')
      setPhone(subscription.phone ?? '')
      setWebsite(subscription.website ?? '')
      if (subscription.company_logo_url) setLogoPreview(subscription.company_logo_url)
      setLoading(false)
    }
    load()
  }, [router])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogo(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('company_name', companyName)
      fd.append('contact_email', contactEmail)
      fd.append('phone', phone)
      fd.append('website', website)
      if (logo) fd.append('logo', logo)

      const res = await fetch('/api/expert/branding', { method: 'PATCH', body: fd })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Save failed')
        return
      }
      toast.success('Branding saved!')
      setLogo(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <Loader2 size={24} className="text-snap-teal animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 sticky top-0 z-10" style={{ background: '#0A0F1A' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/expert/dashboard"
              className="flex items-center gap-1.5 font-grotesk text-sm text-white/50 hover:text-white transition-colors">
              <ArrowLeft size={14} />
              Dashboard
            </Link>
          </div>
          <span className="font-grotesk text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7' }}>
            Expert · {sub?.status}
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-fraunces text-2xl font-bold mb-2">Company branding</h1>
        <p className="font-grotesk text-sm text-white/50 mb-8">
          These details appear on every PDF report you generate.
        </p>

        {/* Preview strip */}
        <div className="card border border-white/5 p-4 mb-8 flex items-center gap-4"
          style={{ background: '#0D0F1A' }}>
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-12 h-12 rounded-lg object-contain bg-white/5" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-snap-teal/10 flex items-center justify-center">
              <span className="font-fraunces text-snap-teal font-bold text-lg">
                {companyName.slice(0, 2).toUpperCase() || 'CO'}
              </span>
            </div>
          )}
          <div>
            <p className="font-grotesk font-semibold text-sm text-white">
              {companyName || 'Your Company'}
            </p>
            <p className="font-grotesk text-xs text-white/40">
              {contactEmail || 'your@email.com'}
              {phone ? ` · ${phone}` : ''}
            </p>
            {website && (
              <p className="font-grotesk text-xs text-snap-teal">{website}</p>
            )}
          </div>
          <span className="ml-auto font-grotesk text-xs text-white/20">PDF preview</span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Logo upload */}
          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-2">Company logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="logo"
                  className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                  <Building2 size={20} className="text-white/20" />
                </div>
              )}
              <div>
                <label className="cursor-pointer font-grotesk text-sm text-snap-teal hover:underline block mb-1">
                  {logoPreview ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden" onChange={handleLogoChange} />
                </label>
                <p className="font-grotesk text-xs text-white/30">PNG, JPG or SVG · appears on PDF cover page</p>
              </div>
            </div>
          </div>

          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-1.5">Company name *</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
            />
          </div>

          <div>
            <label className="font-grotesk text-xs text-white/40 block mb-1.5">Contact email *</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+353 1 234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
              />
            </div>
            <div>
              <label className="font-grotesk text-xs text-white/40 block mb-1.5">Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-grotesk text-sm text-white placeholder:text-white/25 outline-none focus:border-snap-teal/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-grotesk text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: '#00C9A7', color: '#0A0F1A' }}
            >
              {saving
                ? <Loader2 size={16} className="animate-spin" />
                : <Save size={16} />}
              Save changes
            </button>
            <Link href="/expert/dashboard"
              className="font-grotesk text-sm text-white/40 hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}

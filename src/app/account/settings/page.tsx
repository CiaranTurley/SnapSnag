'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ChevronLeft, User, Bell, Gift, Database, Trash2, Download, Copy, Check, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  name: string
  email: string
  referral_code: string | null
  credit_balance: number
  warranty_emails: boolean
  marketing_emails: boolean
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirmEmail.toLowerCase() !== email.toLowerCase()) {
      toast.error('Email does not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/data-deletion', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Deletion failed')
      toast.success('Your account is being deleted. You will receive a confirmation email.')
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-snap-ink-mid border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <h2 className="font-fraunces text-xl font-bold">Delete your account</h2>
        </div>

        <p className="font-grotesk text-white/60 text-sm mb-4">
          This will permanently delete:
        </p>
        <ul className="font-grotesk text-sm text-white/60 space-y-1 mb-4 pl-2">
          {[
            'Your account and profile',
            'All inspection data and photos',
            'All report PDFs',
            'All support ticket history',
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
          <p className="font-grotesk text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-300">This cannot be undone.</strong> Your payment history will be anonymised but retained for legal compliance (7-year tax requirement).
          </p>
        </div>

        <label className="font-grotesk text-sm text-white/60 block mb-2">
          Enter your email to confirm
        </label>
        <input
          type="email"
          className="input w-full mb-5"
          placeholder={email}
          value={confirmEmail}
          onChange={e => setConfirmEmail(e.target.value)}
          autoComplete="off"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || confirmEmail.toLowerCase() !== email.toLowerCase()}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-grotesk font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
          >
            {loading ? 'Deleting…' : 'DELETE MY ACCOUNT'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseBrowserClient() as any
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [warrantyEmails, setWarrantyEmails] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('name, email, referral_code, credit_balance, warranty_emails, marketing_emails')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({ ...data, email: user.email ?? data.email ?? '' })
        setName(data.name ?? '')
        setWarrantyEmails(data.warranty_emails ?? true)
        setMarketingEmails(data.marketing_emails ?? true)
      }
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update({ name, warranty_emails: warrantyEmails, marketing_emails: marketingEmails }).eq('id', user.id)
    setSaving(false)
    toast.success('Settings saved')
  }

  function copyReferral() {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${profile.referral_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function exportData() {
    toast('Preparing your data export…')
    const res = await fetch('/api/data-export')
    if (!res.ok) { toast.error('Export failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'snapsnag-data-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-snap-teal border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <>
      {showDeleteModal && (
        <DeleteModal email={profile.email} onClose={() => setShowDeleteModal(false)} />
      )}

      <main id="main-content" className="min-h-screen bg-snap-ink text-snap-white">
        <nav className="border-b border-white/5 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/account" className="flex items-center gap-2 text-snap-teal font-grotesk text-sm hover:underline">
              <ChevronLeft size={16} />
              Account
            </Link>
            <span className="font-grotesk text-sm text-white/40">Settings</span>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

          {/* Profile */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-snap-teal/10 rounded-xl flex items-center justify-center">
                <User size={16} className="text-snap-teal" />
              </div>
              <h2 className="font-fraunces text-lg font-bold">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Your name</label>
                <input
                  type="text"
                  className="input w-full"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input w-full opacity-50 cursor-not-allowed"
                  value={profile.email}
                  disabled
                />
                <p className="font-grotesk text-xs text-white/30 mt-1">Contact support to change your email address.</p>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-snap-teal/10 rounded-xl flex items-center justify-center">
                <Bell size={16} className="text-snap-teal" />
              </div>
              <h2 className="font-fraunces text-lg font-bold">Notifications</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: 'Warranty countdown emails',
                  description: 'Remind me when my HomeBond / NHBC warranty is about to expire.',
                  value: warrantyEmails,
                  set: setWarrantyEmails,
                },
                {
                  label: 'Marketing emails',
                  description: 'Tips, guides, and product updates from SnapSnag.',
                  value: marketingEmails,
                  set: setMarketingEmails,
                },
              ].map(({ label, description, value, set }) => (
                <label key={label} className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e => set(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-white/10 peer-checked:bg-snap-teal rounded-full transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <p className="font-grotesk text-sm font-semibold text-snap-white">{label}</p>
                    <p className="font-grotesk text-xs text-white/40 mt-0.5">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Referral */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-snap-teal/10 rounded-xl flex items-center justify-center">
                <Gift size={16} className="text-snap-teal" />
              </div>
              <div>
                <h2 className="font-fraunces text-lg font-bold">Referral</h2>
              </div>
            </div>

            <div className="bg-snap-ink-soft rounded-xl p-4 mb-4">
              <p className="font-grotesk text-xs text-white/40 mb-1">Your credit balance</p>
              <p className="font-fraunces text-3xl font-bold text-snap-teal">
                €{((profile.credit_balance ?? 0) / 100).toFixed(2)}
              </p>
              <p className="font-grotesk text-xs text-white/30 mt-1">Applied automatically to your next inspection</p>
            </div>

            {profile.referral_code ? (
              <div>
                <label className="label">Your referral link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="input flex-1 text-xs"
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://snapsnag.ie'}/?ref=${profile.referral_code}`}
                  />
                  <button
                    onClick={copyReferral}
                    className="btn-secondary px-3 flex items-center gap-2 shrink-0"
                  >
                    {copied ? <Check size={14} className="text-snap-teal" /> : <Copy size={14} />}
                    <span className="font-grotesk text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-grotesk text-xs text-white/30 mt-2">You and a friend both get €5 credit when they complete their first inspection.</p>
              </div>
            ) : (
              <p className="font-grotesk text-sm text-white/40">Complete your first paid inspection to unlock your referral code.</p>
            )}
          </section>

          {/* Data */}
          <section className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-snap-teal/10 rounded-xl flex items-center justify-center">
                <Database size={16} className="text-snap-teal" />
              </div>
              <div>
                <h2 className="font-fraunces text-lg font-bold">Your data</h2>
                <p className="font-grotesk text-xs text-white/40 mt-0.5">Manage and export your SnapSnag data</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportData}
                className="w-full flex items-center gap-3 bg-snap-ink-soft hover:bg-white/5 border border-white/5 rounded-xl px-4 py-3 transition-colors group"
              >
                <Download size={16} className="text-white/40 group-hover:text-snap-teal transition-colors" />
                <div className="text-left">
                  <p className="font-grotesk text-sm font-semibold">Export my data</p>
                  <p className="font-grotesk text-xs text-white/40">Download all your inspections, photos, and profile data as JSON</p>
                </div>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 transition-colors group"
              >
                <Trash2 size={16} className="text-red-400" />
                <div className="text-left">
                  <p className="font-grotesk text-sm font-semibold text-red-400">Delete my account and all data</p>
                  <p className="font-grotesk text-xs text-white/40">Permanently delete your account, inspections, and personal data</p>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 font-grotesk text-xs text-white/30">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            </div>
          </section>

          {/* Save button */}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>

        </div>
      </main>
    </>
  )
}

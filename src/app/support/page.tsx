'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Mail, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const FAQS = [
  {
    q: 'How do I share my snagging list with my builder?',
    a: 'After completing your inspection and downloading your report, you will see a verification code on the report page. Share this 8-character code with your builder. They can access the builder portal at snapsnag.ie/builder and enter the code to view your defects and update their status.',
  },
  {
    q: 'Can I add items that are not on the checklist?',
    a: 'Yes. At the bottom of any room in the checklist you will find an "Add your own check" button. You can add as many custom items as you need.',
  },
  {
    q: 'What happens if I do not finish in one session?',
    a: 'Your progress is saved automatically after every response. You can close the app and resume later — your timer and room position will be restored from where you left off.',
  },
  {
    q: 'How do I get a refund?',
    a: 'Once a report has been downloaded, payments are non-refundable. If you experienced a technical issue that prevented you accessing your report, email us at support@snapsnag.ie and we will resolve it.',
  },
  {
    q: 'My builder has marked everything as fixed — how do I respond?',
    a: 'Go to your report page and scroll to the "Builder Responses" section. For each item your builder has updated, you can tap "Accept Fix" or "Reject" and leave feedback. The builder will be notified of your response.',
  },
  {
    q: 'Which file format should I download?',
    a: 'PDF is best for sharing with your builder or solicitor. Word (.docx) is useful if you want to edit or add your own notes. Excel is handy for tracking defect status in a spreadsheet.',
  },
  {
    q: 'Does SnapSnag work on mobile?',
    a: 'Yes — SnapSnag is designed mobile-first. On iOS and Android you can add it to your home screen as a progressive web app (PWA) for a full-screen, offline-ready experience.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-grotesk text-sm font-semibold text-white">{q}</span>
        {open ? <ChevronUp size={16} className="text-white/40 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/40 flex-shrink-0" />}
      </button>
      {open && (
        <p className="font-grotesk text-sm text-white/60 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  )
}

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In production this would POST to a support ticket API
    // For now we open a mailto link as a simple fallback
    const subject = encodeURIComponent('SnapSnag Support Request')
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
    window.location.href = `mailto:support@snapsnag.ie?subject=${subject}&body=${body}`
    toast.success('Opening your email client…')
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-snap-teal font-grotesk text-sm hover:underline w-fit">
            <ChevronLeft size={16} />
            Back to SnapSnag
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-fraunces text-4xl font-bold mb-2">Support</h1>
        <p className="font-grotesk text-white/50 text-sm mb-10">
          We typically respond within one business day.
        </p>

        {/* Contact options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a
            href="mailto:support@snapsnag.ie"
            className="card border border-white/5 hover:border-snap-teal/30 transition-all flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-snap-teal/10 flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-snap-teal" />
            </div>
            <div>
              <p className="font-grotesk font-semibold text-sm text-white">Email support</p>
              <p className="font-grotesk text-xs text-white/40">support@snapsnag.ie</p>
            </div>
          </a>
          <div className="card border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-snap-teal/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-snap-teal" />
            </div>
            <div>
              <p className="font-grotesk font-semibold text-sm text-white">SnapBot</p>
              <p className="font-grotesk text-xs text-white/40">Instant construction answers</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card border border-white/5 mb-8">
          <h2 className="font-fraunces text-xl font-bold mb-2">Frequently asked questions</h2>
          <div className="divide-y divide-white/5">
            {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>

        {/* Contact form */}
        {!sent ? (
          <div className="card border border-white/5">
            <h2 className="font-fraunces text-xl font-bold mb-4">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-grotesk text-xs text-white/50 block mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="font-grotesk text-xs text-white/50 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="font-grotesk text-xs text-white/50 block mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="input w-full resize-none"
                  rows={4}
                  required
                  placeholder="Describe your issue or question…"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Send message
              </button>
            </form>
          </div>
        ) : (
          <div className="card border border-white/5 text-center py-8">
            <p className="text-2xl mb-3">✅</p>
            <p className="font-fraunces text-lg font-bold mb-1">Message sent</p>
            <p className="font-grotesk text-sm text-white/50">We will get back to you shortly.</p>
          </div>
        )}
      </div>
    </main>
  )
}

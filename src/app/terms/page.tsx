import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — SnapSnag',
  description: 'Terms and conditions for using SnapSnag, the new build inspection app.',
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/5 pb-8">
      <h2 className="font-fraunces text-xl font-bold text-snap-white mb-4 flex items-baseline gap-3">
        <span className="text-snap-teal text-sm font-grotesk font-semibold">{number}</span>
        {title}
      </h2>
      <div className="font-grotesk text-white/70 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-screen bg-snap-ink text-snap-white">
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-snap-teal font-grotesk text-sm hover:underline w-fit">
            <ChevronLeft size={16} />
            Back to SnapSnag
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Solicitor notice */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-10">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="font-grotesk text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-300">Note:</strong> These terms should be reviewed by a solicitor before launch.
          </p>
        </div>

        <h1 className="font-fraunces text-4xl font-bold mb-2">Terms &amp; Conditions</h1>
        <p className="font-grotesk text-white/40 text-sm mb-10">Last updated: January 2025</p>

        {/* Prominent disclaimer */}
        <div className="bg-snap-ink-soft border border-white/10 rounded-2xl p-6 mb-10">
          <p className="font-grotesk text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Important disclaimer</p>
          <p className="font-fraunces text-lg font-bold text-snap-white leading-snug mb-3">
            SnapSnag is a self-guided inspection tool — not a professional survey.
          </p>
          <p className="font-grotesk text-white/70 text-sm leading-relaxed">
            SnapSnag is designed to help homebuyers identify potential defects in new build homes.{' '}
            <strong className="text-snap-white">SnapSnag is NOT a professional survey and should not be relied upon as one.</strong>{' '}
            SnapSnag does not accept any liability for defects not identified during a self-guided inspection.
            For complete protection, we recommend also engaging a qualified chartered surveyor.
          </p>
        </div>

        <div className="space-y-8">

          <Section number="1" title="Service description">
            <p>SnapSnag provides a self-guided digital inspection tool for buyers of new build homes. The app guides users through a room-by-room checklist, allows defects to be photographed and documented, and generates a formatted report for presentation to the builder.</p>
            <p>SnapSnag is designed for personal use in connection with your own home purchase. By using SnapSnag, you agree to these terms in full.</p>
          </Section>

          <Section number="2" title="User obligations">
            <ul className="space-y-2">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>Use the app honestly and for lawful purposes only.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>Do not share your account access or login credentials with third parties.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>Keep your login credentials secure. You are responsible for all activity on your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>You must be at least 18 years of age to use SnapSnag.</span>
              </li>
            </ul>
          </Section>

          <Section number="3" title="Payment terms">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">One-time reports:</strong> charged at checkout via Stripe. Not satisfied? Contact us within 7 days of purchase for a full refund, provided the PDF has not yet been downloaded.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Expert subscription:</strong> billed monthly or annually. You may cancel at any time; cancellation takes effect at the end of the current billing period.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Refund policy:</strong> full refund available within 7 days of purchase for unused reports. Refund requests should be sent to <a href="mailto:hello@snapsnagapp.com" className="text-snap-teal hover:underline">hello@snapsnagapp.com</a>.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>All payments are processed by Stripe. SnapSnag does not store payment card details.</span>
              </li>
            </ul>
          </Section>

          <Section number="4" title="Intellectual property">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">SnapSnag IP:</strong> all app code, design, branding, and content created by SnapSnag is owned by SnapSnag and protected by copyright. You may not copy, reverse-engineer, or redistribute any part of the service.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Your content:</strong> you retain full ownership of your inspection data, photos, notes, and reports. You grant SnapSnag a limited licence to store and process this content solely to provide the service to you.</span>
              </li>
            </ul>
          </Section>

          <Section number="5" title="Limitation of liability">
            <p>SnapSnag is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by applicable law:</p>
            <ul className="space-y-2 mt-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>SnapSnag is not liable for any defects in your property that were not identified during a self-guided inspection.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>SnapSnag is not liable for any disputes between you and your builder or developer.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span>SnapSnag is not liable for any indirect, incidental, or consequential damages arising from use of the service.</span>
              </li>
            </ul>
            <p className="mt-3">Nothing in these terms limits our liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.</p>
          </Section>

          <Section number="6" title="Governing law">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Ireland and United Kingdom:</strong> these terms are governed by the laws of Ireland. Any disputes shall be subject to the exclusive jurisdiction of the Irish courts.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Australia:</strong> for Australian users, these terms are governed by the laws of New South Wales. Consumer guarantees under the Australian Consumer Law apply and are not excluded by these terms.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">United States and Canada:</strong> governed by the laws of Ireland.</span>
              </li>
            </ul>
          </Section>

          <Section number="7" title="Changes to these terms">
            <p>We may update these terms from time to time. We will notify you of material changes by email at least 14 days before they take effect. Continued use of SnapSnag after the effective date of changes constitutes acceptance of the new terms.</p>
          </Section>

          <Section number="8" title="Contact">
            <p>Questions about these terms:</p>
            <p className="mt-2">
              <a href="mailto:hello@snapsnagapp.com" className="text-snap-teal hover:underline font-semibold">
                hello@snapsnagapp.com
              </a>
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 font-grotesk text-sm text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Back to SnapSnag</Link>
        </div>
      </div>
    </main>
  )
}

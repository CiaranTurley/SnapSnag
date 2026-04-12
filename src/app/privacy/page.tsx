import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — SnapSnag',
  description: 'How SnapSnag collects, uses, and protects your personal data.',
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

export default function PrivacyPage() {
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
            <strong className="text-amber-300">Note:</strong> This policy should be reviewed by a solicitor before launch.
          </p>
        </div>

        <h1 className="font-fraunces text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="font-grotesk text-white/40 text-sm mb-10">Last updated: January 2025</p>

        <div className="space-y-8">

          <Section number="1" title="What data we collect">
            <p>When you use SnapSnag, we collect the following personal data:</p>
            <ul className="space-y-3 mt-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Name and email address</strong> — required to create and manage your account.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Property address</strong> — stored as part of each inspection you create.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Inspection data, photos, and notes</strong> — all content you create during an inspection belongs to you and is stored to provide the service.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Payment information</strong> — all payments are processed by Stripe. SnapSnag does not store your card details. Stripe&apos;s privacy policy applies to payment data.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Device and usage data</strong> — anonymous analytics via Google Analytics to help us understand how the app is used. This is only collected with your consent.</span>
              </li>
            </ul>
          </Section>

          <Section number="2" title="How we store your data">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Database (Supabase):</strong> EU servers for Ireland and UK users; Australian servers for AU users.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Payments (Stripe):</strong> PCI-DSS Level 1 compliant. We do not store card numbers, CVVs, or full payment details.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Photos and files:</strong> stored in encrypted cloud storage (Supabase Storage).</span>
              </li>
            </ul>
            <p className="mt-4 font-semibold text-snap-white">We never sell your data to third parties. Ever.</p>
          </Section>

          <Section number="3" title="How long we keep your data">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Inspection data:</strong> retained for 3 years after your last activity, then deleted.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Payment records:</strong> retained for 7 years as required by tax law in Ireland, the UK, and Australia.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Marketing data:</strong> retained until you unsubscribe from marketing communications.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Account deletion requests:</strong> all personal data deleted within 30 days. Payment records are anonymised but retained for legal compliance.</span>
              </li>
            </ul>
          </Section>

          <Section number="4" title="Your rights">
            <p>You have the following rights regarding your personal data:</p>
            <ul className="space-y-3 mt-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Right to access:</strong> request a copy of all data we hold about you.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Right to correction:</strong> ask us to correct any inaccurate personal data.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Right to deletion:</strong> delete your account and all associated data from your account settings. We will complete deletion within 30 days.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Right to portability:</strong> export your inspection data in a portable format from your account settings.</span>
              </li>
            </ul>
            <p className="mt-4">To exercise any of these rights, contact us at{' '}
              <a href="mailto:hello@snapsnagapp.com" className="text-snap-teal hover:underline">hello@snapsnagapp.com</a>
            </p>
          </Section>

          <Section number="5" title="Cookies">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Essential cookies:</strong> required for authentication and for the app to function. These cannot be disabled.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Analytics cookies (Google Analytics):</strong> only used with your explicit consent. You can withdraw consent at any time from your account settings or by clicking &ldquo;Essential only&rdquo; on the cookie banner.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Advertising cookies:</strong> we do not use advertising or retargeting cookies.</span>
              </li>
            </ul>
          </Section>

          <Section number="6" title="GDPR compliance (IE / UK / EU users)">
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Data controller:</strong> SnapSnag.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Legal basis for processing:</strong> contract performance (to provide the inspection service you have paid for) and legitimate interests (improving our service, preventing fraud).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-snap-teal mt-1">•</span>
                <span><strong className="text-snap-white">Right to complain:</strong> if you are based in Ireland or the EU, you have the right to lodge a complaint with the Data Protection Commission (dataprotection.ie). UK users may contact the ICO (ico.org.uk).</span>
              </li>
            </ul>
          </Section>

          <Section number="7" title="Contact">
            <p>For privacy-related questions or to exercise your rights:</p>
            <p className="mt-2">
              <a href="mailto:hello@snapsnagapp.com" className="text-snap-teal hover:underline font-semibold">
                hello@snapsnagapp.com
              </a>
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 font-grotesk text-sm text-white/30">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Back to SnapSnag</Link>
        </div>
      </div>
    </main>
  )
}

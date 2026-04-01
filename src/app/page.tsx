import Link from 'next/link'
import { CheckCircle, Camera, FileText, Share2 } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-snap-ink text-snap-white">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="SnapSnag" width={36} height={36} className="rounded-xl" />
          <span className="font-fraunces text-2xl font-bold text-snap-teal">SnapSnag</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-grotesk text-sm text-white/70 hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-5">
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 bg-snap-teal/10 text-snap-teal text-sm font-semibold px-4 py-2 rounded-full mb-8 font-grotesk">
          <CheckCircle size={14} />
          Built for new build homebuyers
        </div>

        <h1 className="font-fraunces text-5xl md:text-6xl font-bold leading-tight mb-6">
          Snag your new home
          <br />
          <span className="text-snap-teal">like a professional</span>
        </h1>

        <p className="font-grotesk text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Walk through every room with guided checklists, photograph every defect,
          and generate a professional PDF report your builder can't ignore — all
          from your phone.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base px-8 py-4 w-full sm:w-auto">
            Start my inspection →
          </Link>
          <Link href="#how-it-works" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto">
            See how it works
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-fraunces text-3xl font-bold text-center mb-16">
          Everything you need for a thorough snag
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-snap-teal" size={24} />
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Guided Checklists</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              Room-by-room checklists covering hundreds of common defects —
              from plasterwork to plumbing, electrics to external finishes.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Camera className="text-snap-teal" size={24} />
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Photo Evidence</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              Attach multiple photos to each defect. Annotate with arrows and
              text. Voice notes transcribed automatically.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="text-snap-teal" size={24} />
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Instant PDF Report</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              Generate a professional, branded PDF report with all defects,
              photos, and severity ratings — ready to send to your builder.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="text-snap-teal" size={24} />
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Builder Portal</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              Share a secure link with your builder. They can update the status
              of each fix — you'll see it all in real time.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-snap-teal text-2xl">👥</span>
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Couple Mode</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              Inspect together. Two people can work on the same inspection
              simultaneously from their own devices.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-snap-teal/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-snap-teal text-2xl">📶</span>
            </div>
            <h3 className="font-fraunces text-xl font-bold mb-3">Works Offline</h3>
            <p className="font-grotesk text-white/60 text-sm leading-relaxed">
              No signal on a new build site? No problem. SnapSnag works fully
              offline and syncs when you're back online.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="font-fraunces text-3xl font-bold mb-4">Simple pricing</h2>
        <p className="font-grotesk text-white/60 mb-16">
          Pay once per inspection. No subscription needed for homebuyers.
        </p>

        {/* One-time inspection */}
        <div className="mb-16">
          <h3 className="font-fraunces text-xl font-bold mb-2">One-time Inspection Report</h3>
          <p className="font-grotesk text-white/50 text-sm mb-8">Pay once, get your full PDF report. No account required.</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto mb-8">
            {[
              { flag: '🇮🇪', country: 'Ireland',   price: '€19.95' },
              { flag: '🇬🇧', country: 'UK',        price: '£23.95' },
              { flag: '🇦🇺', country: 'Australia', price: 'A$39.95' },
              { flag: '🇺🇸', country: 'USA',       price: '$29.95' },
              { flag: '🇨🇦', country: 'Canada',    price: 'C$34.95' },
            ].map(({ flag, country, price }) => (
              <div key={country} className="card py-4 px-3 flex flex-col items-center gap-2 border border-white/10">
                <span className="text-2xl">{flag}</span>
                <span className="font-grotesk text-xs text-white/50">{country}</span>
                <span className="font-fraunces text-lg font-bold text-snap-white">{price}</span>
              </div>
            ))}
          </div>

          <div className="card border border-white/10 max-w-sm mx-auto text-left">
            <ul className="font-grotesk text-sm space-y-3 mb-6">
              {['Full guided checklist', 'Unlimited photos per defect', 'Professional PDF report', 'Builder portal share link', '1 year report storage'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-snap-pass flex-shrink-0" />
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary w-full text-center block">
              Start my inspection →
            </Link>
          </div>
        </div>

        {/* Expert subscription */}
        <div>
          <h3 className="font-fraunces text-xl font-bold mb-2">Expert Subscription</h3>
          <p className="font-grotesk text-white/50 text-sm mb-8">For snagging professionals, surveyors, and punch-list companies.</p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="card border border-white/10 text-left">
              <p className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-3">Monthly</p>
              <p className="font-fraunces text-4xl font-bold text-snap-white mb-1">€29.95</p>
              <p className="font-grotesk text-white/50 text-sm mb-6">per month</p>
              <ul className="font-grotesk text-sm space-y-3 mb-6">
                {['Unlimited inspections', 'Your branding on reports', 'Priority support', 'Defect analytics', 'Client management portal'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-snap-teal flex-shrink-0" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=expert-monthly" className="btn-secondary w-full text-center block">
                Start free trial
              </Link>
            </div>

            {/* Annual */}
            <div className="card border border-snap-teal/40 relative overflow-hidden text-left">
              <div className="absolute top-4 right-4 bg-snap-teal text-snap-ink text-xs font-bold px-2 py-1 rounded-full font-grotesk">
                BEST VALUE
              </div>
              <p className="font-grotesk text-xs text-white/40 uppercase tracking-widest mb-3">Annual</p>
              <p className="font-fraunces text-4xl font-bold text-snap-teal mb-1">€249</p>
              <p className="font-grotesk text-white/50 text-sm mb-1">per year</p>
              <p className="font-grotesk text-snap-pass text-xs font-semibold mb-6">Saves €110.40 vs monthly</p>
              <ul className="font-grotesk text-sm space-y-3 mb-6">
                {['Unlimited inspections', 'Your branding on reports', 'Priority support', 'Defect analytics', 'Client management portal'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-snap-teal flex-shrink-0" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=expert-annual" className="btn-primary w-full text-center block">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-10 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-fraunces text-lg font-bold text-snap-teal">SnapSnag</span>
        <p className="font-grotesk text-sm text-white/30">
          © {new Date().getFullYear()} SnapSnag. All rights reserved.
        </p>
        <div className="flex gap-6 font-grotesk text-sm text-white/40">
          <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-white/70 transition-colors">Contact</Link>
        </div>
      </footer>
    </main>
  )
}

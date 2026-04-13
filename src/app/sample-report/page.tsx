import Link from 'next/link'
import SnapSnagLogo from '@/components/SnapSnagLogo'

// ─── Sample data ───────────────────────────────────────────────────────────────

const INSPECTION = {
  address: '14 Maple Grove, Citywest, Dublin 24',
  propertyType: '4-bed semi-detached',
  completedAt: '12 April 2025',
  verificationCode: 'SS7K2M9X',
  inspectorName: 'Ciaran Murphy',
  durationMinutes: 97,
  warrantyExpires: '14 March 2026',
  warrantyDaysLeft: 336,
}

const STATS = {
  total: 68,
  passed: 51,
  failed: 12,
  na: 5,
  passRate: 81,
}

const FAILED_ITEMS = [
  { id: '1', room: 'Master Bedroom', description: 'Skirting board gap at corner junction — not mitre-cut, 8mm gap visible', severity: 'minor', builderStatus: 'fixed', builderNote: 'Gap has been filled and painted. Please review.', accepted: null },
  { id: '2', room: 'Master Bedroom', description: 'Window reveal not plastered flush — step of approx. 4mm at frame', severity: 'minor', builderStatus: 'in_progress', builderNote: null, accepted: null },
  { id: '3', room: 'En-suite', description: 'Grout missing between wall tiles behind shower head — two tile joints', severity: 'major', builderStatus: null, builderNote: null, accepted: null },
  { id: '4', room: 'En-suite', description: 'Extractor fan not clearing steam within 10 mins — possible undersized unit', severity: 'major', builderStatus: null, builderNote: null, accepted: null },
  { id: '5', room: 'Kitchen', description: 'Worktop join at corner not flush — 2mm lip creating moisture trap', severity: 'major', builderStatus: 'fixed', builderNote: 'Worktop has been re-joined and sealed.', accepted: true },
  { id: '6', room: 'Kitchen', description: 'Splash-back tile grout uneven — significant colour variation in lower row', severity: 'minor', builderStatus: null, builderNote: null, accepted: null },
  { id: '7', room: 'Living Room', description: 'Paint roller marks visible on ceiling under raking light — three patches', severity: 'minor', builderStatus: null, builderNote: null, accepted: null },
  { id: '8', room: 'Hallway', description: 'Front door threshold strip loose — lifts 3mm when stepped on', severity: 'major', builderStatus: null, builderNote: null, accepted: null },
  { id: '9', room: 'Bathroom', description: 'Bath panel not clipped flush at right side — 5mm gap to wall', severity: 'minor', builderStatus: 'fixed', builderNote: 'Panel has been re-clipped and sealed along full length.', accepted: null },
  { id: '10', room: 'Garage', description: 'Internal access door not self-closing — fire safety requirement (Part B)', severity: 'critical', builderStatus: null, builderNote: null, accepted: null },
  { id: '11', room: 'Garage', description: 'Concrete floor crack running 600mm from corner — monitoring advised', severity: 'major', builderStatus: null, builderNote: null, accepted: null },
  { id: '12', room: 'Exterior', description: 'Pointing incomplete on left gable above first floor window — three courses', severity: 'major', builderStatus: null, builderNote: null, accepted: null },
]

const PASSED_BY_ROOM: Record<string, number> = {
  'Master Bedroom': 7,
  'En-suite': 4,
  'Bedroom 2': 6,
  'Bedroom 3': 5,
  'Bedroom 4': 5,
  'Kitchen': 6,
  'Living Room': 5,
  'Hallway': 4,
  'Bathroom': 5,
  'Garage': 2,
  'Exterior': 2,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  minor:    { label: 'Minor',    bg: 'rgba(255,179,64,0.12)',  color: '#FFB340' },
  major:    { label: 'Major',    bg: 'rgba(255,107,53,0.12)',  color: '#FF6B35' },
  critical: { label: 'Critical', bg: 'rgba(255,77,79,0.12)',   color: '#FF4D4F' },
}

const BUILDER_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  fixed:       { label: 'Builder says: Fixed',  bg: 'rgba(0,214,143,0.12)', color: '#00D68F' },
  in_progress: { label: 'In Progress',          bg: 'rgba(255,179,64,0.12)', color: '#FFB340' },
}

function Pill({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, color, borderRadius: 999,
      padding: '3px 10px', fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-space-grotesk)', whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SampleReportPage() {
  const criticalCount = FAILED_ITEMS.filter(i => i.severity === 'critical').length
  const majorCount    = FAILED_ITEMS.filter(i => i.severity === 'major').length
  const minorCount    = FAILED_ITEMS.filter(i => i.severity === 'minor').length
  const builderResponded = FAILED_ITEMS.filter(i => i.builderStatus).length

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1A', paddingBottom: 60 }}>

      {/* ── Banner ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,201,167,0.08)', borderBottom: '1px solid rgba(0,201,167,0.2)',
        padding: '10px 24px', textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          This is a <strong style={{ color: '#00C9A7' }}>sample report</strong> with realistic data — your report will look exactly like this.{' '}
          <Link href="/signup" style={{ color: '#00C9A7', fontWeight: 700, textDecoration: 'none' }}>
            Start your free inspection →
          </Link>
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 0' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <SnapSnagLogo size="md" showTagline />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 700, color: '#FAFAF8', marginBottom: 8 }}>
            Inspection Report
          </h1>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            {INSPECTION.address}
          </p>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {INSPECTION.propertyType} · Completed {INSPECTION.completedAt} · {INSPECTION.durationMinutes} min
          </p>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Pass rate', value: `${STATS.passRate}%`, color: '#00C9A7' },
            { label: 'Passed',    value: STATS.passed,          color: '#00D68F' },
            { label: 'Failed',    value: STATS.failed,          color: '#FF4D4F' },
            { label: 'N/A',       value: STATS.na,              color: 'rgba(255,255,255,0.4)' },
            { label: 'Checked',   value: STATS.total,           color: '#FAFAF8' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 80px', background: 'rgba(255,255,255,0.05)',
              borderRadius: 12, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 24, fontWeight: 700, color: s.color, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Severity summary ───────────────────────────────────────────────── */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 16, fontWeight: 700, color: '#FAFAF8', marginBottom: 12 }}>
            Defect breakdown
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {criticalCount > 0 && (
              <div style={{ flex: 1, background: 'rgba(255,77,79,0.08)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 700, color: '#FF4D4F' }}>{criticalCount}</div>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: '#FF4D4F', marginTop: 2 }}>Critical</div>
              </div>
            )}
            <div style={{ flex: 1, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 700, color: '#FF6B35' }}>{majorCount}</div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: '#FF6B35', marginTop: 2 }}>Major</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,179,64,0.08)', border: '1px solid rgba(255,179,64,0.2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 700, color: '#FFB340' }}>{minorCount}</div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: '#FFB340', marginTop: 2 }}>Minor</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 700, color: '#00D68F' }}>{builderResponded}</div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: '#00D68F', marginTop: 2 }}>Builder responded</div>
            </div>
          </div>
        </div>

        {/* ── Warranty countdown ─────────────────────────────────────────────── */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,179,64,0.3)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 15, fontWeight: 700, color: '#FFB340' }}>
                HomeBond builder warranty
              </h2>
              <span style={{
                display: 'inline-block', background: 'rgba(255,179,64,0.15)', color: '#FFB340',
                borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-space-grotesk)', marginTop: 2,
              }}>
                Expiring soon
              </span>
            </div>
          </div>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Your builder warranty expires in{' '}
            <strong style={{ color: '#FFB340' }}>{INSPECTION.warrantyDaysLeft} days</strong>
            {' '}— on {INSPECTION.warrantyExpires}. Raise all outstanding defects with your builder before this date.
          </p>
        </div>

        {/* ── Builder responses ──────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(0,201,167,0.05)', border: '1px solid rgba(0,201,167,0.25)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🏗️</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 15, fontWeight: 700, color: '#FAFAF8' }}>
                Builder has responded
              </h2>
              <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                2 fixed · 1 in progress · 3 total updates
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAILED_ITEMS.filter(i => i.builderStatus).map(item => {
              const bs = BUILDER_STYLES[item.builderStatus!]
              return (
                <div key={item.id} style={{
                  background: '#111827', borderRadius: 12,
                  border: `1px solid ${item.accepted === true ? 'rgba(0,214,143,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  padding: '14px 16px',
                }}>
                  <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, fontWeight: 600, color: '#FAFAF8', marginBottom: 2, lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                  <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                    {item.room}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: item.builderNote ? 10 : 0 }}>
                    <Pill text={bs.label} bg={bs.bg} color={bs.color} />
                    {item.accepted === true && <Pill text="✓ You accepted" bg="rgba(0,214,143,0.12)" color="#00D68F" />}
                    {item.accepted === null && item.builderStatus === 'fixed' && (
                      <Pill text="Awaiting your review" bg="rgba(255,255,255,0.07)" color="rgba(255,255,255,0.5)" />
                    )}
                  </div>
                  {item.builderNote && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Builder note:</p>
                      <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                        {item.builderNote}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Failed items list ──────────────────────────────────────────────── */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 16, fontWeight: 700, color: '#FAFAF8', marginBottom: 4 }}>
            All failed items
          </h2>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            {STATS.failed} items flagged across your property
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAILED_ITEMS.map(item => {
              const sev = SEVERITY_STYLES[item.severity]
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    marginTop: 5, background: sev.color,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: '#FAFAF8', lineHeight: 1.4, marginBottom: 4 }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {item.room}
                      </span>
                      <Pill text={sev.label} bg={sev.bg} color={sev.color} />
                      {item.builderStatus && (
                        <Pill
                          text={BUILDER_STYLES[item.builderStatus].label}
                          bg={BUILDER_STYLES[item.builderStatus].bg}
                          color={BUILDER_STYLES[item.builderStatus].color}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Room-by-room summary ───────────────────────────────────────────── */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 16, fontWeight: 700, color: '#FAFAF8', marginBottom: 16 }}>
            Room-by-room
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(PASSED_BY_ROOM).map(([room, passed]) => {
              const failed = FAILED_ITEMS.filter(i => i.room === room).length
              const total = passed + failed
              const rate = total > 0 ? Math.round((passed / total) * 100) : 100
              return (
                <div key={room} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.7)', minWidth: 130 }}>
                    {room}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${rate}%`,
                      background: rate === 100 ? '#00D68F' : rate >= 70 ? '#00C9A7' : '#FFB340',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 32, textAlign: 'right' }}>
                    {rate}%
                  </span>
                  {failed > 0 && (
                    <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 11, color: '#FF4D4F', minWidth: 40 }}>
                      {failed} fail{failed > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Download card (blurred/locked) ────────────────────────────────── */}
        <div style={{
          background: 'rgba(0,201,167,0.05)', border: '1px solid rgba(0,201,167,0.3)',
          borderRadius: 16, padding: 24, marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 18, fontWeight: 700, color: '#FAFAF8', marginBottom: 8 }}>
            Download your report
          </h2>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 20 }}>
            Your real report unlocks a professional PDF, Word doc and Excel snagging tracker — all ready to send to your builder.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              📄 PDF report
            </span>
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              📝 Word (.docx)
            </span>
            <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              📊 Excel (.xlsx)
            </span>
          </div>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#00C9A7', color: '#0A0F1A', fontFamily: 'var(--font-space-grotesk)',
            fontSize: 15, fontWeight: 700, padding: '14px 32px', borderRadius: 10,
            textDecoration: 'none', boxShadow: '0 0 24px rgba(0,201,167,0.35)',
          }}>
            Start your free inspection →
          </Link>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
            Free to inspect · One-time payment to unlock your report
          </p>
        </div>

        {/* ── Verification code ──────────────────────────────────────────────── */}
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 15, fontWeight: 700, color: '#FAFAF8' }}>
              Verification code
            </h2>
            <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              (sample)
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            Anyone can verify your inspection at snapsnagapp.com/verify-report
          </p>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 700, letterSpacing: '0.15em', color: '#00C9A7' }}>
              {INSPECTION.verificationCode}
            </span>
          </div>
        </div>

        {/* ── Back to homepage ───────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Link href="/" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

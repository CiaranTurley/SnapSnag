'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useCountry } from '@/lib/CountryContext'
import { COUNTRY_CONFIG, type CountryCode } from '@/lib/countryConfig'
import SnapSnagLogo from '@/components/SnapSnagLogo'
import { generateChecklist } from '@/lib/generateChecklist'

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = {
  // Section 1
  country: CountryCode
  address1: string; address2: string; city: string; county: string; postcode: string
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  features: string[]
  apartmentFloor: string
  size: string
  // Section 2
  builderName: string
  handoverDate: string
  handoverNotConfirmed: boolean
  inspectionType: string
  constructionType: string
  isManaged: boolean | null
  sharedAreas: string[]
  // Section 3
  contractInclusions: string[]
  integratedAppliances: string[]
  contractOther: string
  // Section 4
  heatingSystem: string
  pressurisedCylinder: string
  hrvSystem: string
  energyCert: string
  // Section 5
  knownIssues: string
  builderFlagged: boolean | null
  builderFlaggedDesc: string
  previousInspections: boolean | null
  roomConcerns: string
  // Section 6
  inspectorName: string
  inspectionDate: string
  weather: string
  whoInspecting: string
}

function emptyAnswers(country: CountryCode): Answers {
  return {
    country,
    address1: '', address2: '', city: '', county: '', postcode: '',
    propertyType: '', bedrooms: null, bathrooms: null, features: [],
    apartmentFloor: '', size: '',
    builderName: '', handoverDate: '', handoverNotConfirmed: false,
    inspectionType: '', constructionType: '', isManaged: null, sharedAreas: [],
    contractInclusions: [], integratedAppliances: [], contractOther: '',
    heatingSystem: '', pressurisedCylinder: '', hrvSystem: '', energyCert: '',
    knownIssues: '', builderFlagged: null, builderFlaggedDesc: '',
    previousInspections: null, roomConcerns: '',
    inspectorName: '', inspectionDate: new Date().toISOString().split('T')[0],
    weather: '', whoInspecting: '',
  }
}

function randomCode(len: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function OptionCard({ label, sub, icon, selected, onClick }: {
  label: string; sub?: string; icon?: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all min-h-[52px] flex items-center gap-4 ${
        selected
          ? 'border-snap-teal bg-snap-teal/10 text-snap-white'
          : 'border-white/10 bg-snap-ink-mid text-white/70 hover:border-white/25 hover:text-white'
      }`}
    >
      {icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        <div className="font-grotesk font-semibold text-sm">{label}</div>
        {sub && <div className="font-grotesk text-xs text-white/40 mt-0.5">{sub}</div>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-snap-teal flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 2.5" stroke="#0A0F1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  )
}

function CheckCard({ label, icon, checked, onClick }: {
  label: string; icon?: string; checked: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all min-h-[52px] flex items-center gap-3 ${
        checked
          ? 'border-snap-teal bg-snap-teal/10 text-snap-white'
          : 'border-white/10 bg-snap-ink-mid text-white/60 hover:border-white/25'
      }`}
    >
      <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
        checked ? 'bg-snap-teal border-snap-teal' : 'border-white/20'
      }`}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 2.5" stroke="#0A0F1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-grotesk text-sm">{label}</span>
    </button>
  )
}

function NumBtn({ n, selected, onClick }: { n: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[56px] rounded-2xl border text-lg font-fraunces font-bold transition-all ${
        selected
          ? 'border-snap-teal bg-snap-teal text-snap-ink'
          : 'border-white/10 bg-snap-ink-mid text-white/70 hover:border-white/30'
      }`}
    >
      {n}
    </button>
  )
}

function Q({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h3 className="font-fraunces text-xl font-bold mb-1">{label}</h3>
      {sub && <p className="font-grotesk text-sm text-white/40 mb-5">{sub}</p>}
      {!sub && <div className="mb-5" />}
      {children}
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full border border-white/20 text-white/40 text-xs flex items-center justify-center hover:border-white/40 hover:text-white/60"
      >
        i
      </button>
      {open && (
        <div className="absolute z-20 left-7 top-0 w-64 bg-snap-ink-soft border border-white/10 rounded-xl p-3 font-grotesk text-xs text-white/70 shadow-xl">
          {text}
        </div>
      )}
    </span>
  )
}

// ─── Section validation ───────────────────────────────────────────────────────

function canProceed(section: number, a: Answers): boolean {
  switch (section) {
    case 1: return !!(a.address1 && a.city && a.county && a.postcode && a.propertyType && a.bedrooms !== null && a.bathrooms !== null && a.size)
    case 2: return !!(a.builderName && a.inspectionType && a.constructionType && a.isManaged !== null)
    case 3: return a.contractInclusions.length > 0
    case 4: return !!(a.heatingSystem && a.pressurisedCylinder && a.hrvSystem && a.energyCert)
    case 5: return a.builderFlagged !== null
    case 6: return !!(a.inspectorName && a.inspectionDate && a.weather && a.whoInspecting)
    default: return false
  }
}

// ─── Map answers → Supabase row ───────────────────────────────────────────────

function toSupabaseRow(a: Answers) {
  return {
    country: a.country,
    property_address_line1: a.address1 || null,
    property_address_line2: a.address2 || null,
    property_city: a.city || null,
    property_county: a.county || null,
    property_postcode: a.postcode || null,
    property_type: a.propertyType || null,
    bedrooms: a.bedrooms,
    bathrooms: a.bathrooms,
    builder_name: a.builderName || null,
    handover_date: (!a.handoverNotConfirmed && a.handoverDate) ? a.handoverDate : null,
    inspection_type: a.inspectionType || null,
    construction_type: a.constructionType || null,
    is_managed_development: a.isManaged ?? false,
    contract_inclusions: a.contractInclusions,
    integrated_appliances: a.integratedAppliances,
    inspector_name: a.inspectorName || null,
    inspection_date: a.inspectionDate || null,
    weather_conditions: a.weather || null,
    questionnaire_answers: {
      features: a.features,
      apartmentFloor: a.apartmentFloor,
      size: a.size,
      handoverNotConfirmed: a.handoverNotConfirmed,
      sharedAreas: a.sharedAreas,
      contractOther: a.contractOther,
      heatingSystem: a.heatingSystem,
      pressurisedCylinder: a.pressurisedCylinder,
      hrvSystem: a.hrvSystem,
      energyCert: a.energyCert,
      knownIssues: a.knownIssues,
      builderFlagged: a.builderFlagged,
      builderFlaggedDesc: a.builderFlaggedDesc,
      previousInspections: a.previousInspections,
      roomConcerns: a.roomConcerns,
      whoInspecting: a.whoInspecting,
    },
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL_SECTIONS = 6
const STORAGE_KEY = 'snapsnag_draft_id'

export default function InspectStartPage() {
  const router = useRouter()
  const { countryCode, setCountry } = useCountry()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseBrowserClient() as any

  const [stage, setStage] = useState<'loading' | 'disclaimer' | 'form' | 'completing'>('loading')
  const [section, setSection] = useState(1)
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answers>(emptyAnswers(countryCode))
  const [saving, setSaving] = useState(false)
  const [disclaimerLoading, setDisclaimerLoading] = useState(false)
  const [disclaimerError, setDisclaimerError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Keep answers.country in sync with CountryContext
  useEffect(() => {
    set('country', countryCode)
  }, [countryCode])

  // Auth check + resume draft
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const draftId = localStorage.getItem(STORAGE_KEY)
      if (draftId) {
        const { data } = await supabase.from('inspections').select('*').eq('id', draftId).eq('user_id', user.id).single()
        if (data && data.status === 'draft') {
          setInspectionId(draftId)
          const qa = (data.questionnaire_answers as Record<string, unknown>) ?? {}
          setAnswers({
            country: (data.country as CountryCode) ?? countryCode,
            address1: data.property_address_line1 ?? '',
            address2: data.property_address_line2 ?? '',
            city: data.property_city ?? '',
            county: data.property_county ?? '',
            postcode: data.property_postcode ?? '',
            propertyType: data.property_type ?? '',
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            features: (qa.features as string[]) ?? [],
            apartmentFloor: (qa.apartmentFloor as string) ?? '',
            size: (qa.size as string) ?? '',
            builderName: data.builder_name ?? '',
            handoverDate: data.handover_date ?? '',
            handoverNotConfirmed: (qa.handoverNotConfirmed as boolean) ?? false,
            inspectionType: data.inspection_type ?? '',
            constructionType: data.construction_type ?? '',
            isManaged: data.is_managed_development,
            sharedAreas: (qa.sharedAreas as string[]) ?? [],
            contractInclusions: (data.contract_inclusions as string[]) ?? [],
            integratedAppliances: (data.integrated_appliances as string[]) ?? [],
            contractOther: (qa.contractOther as string) ?? '',
            heatingSystem: (qa.heatingSystem as string) ?? '',
            pressurisedCylinder: (qa.pressurisedCylinder as string) ?? '',
            hrvSystem: (qa.hrvSystem as string) ?? '',
            energyCert: (qa.energyCert as string) ?? '',
            knownIssues: (qa.knownIssues as string) ?? '',
            builderFlagged: (qa.builderFlagged as boolean | null) ?? null,
            builderFlaggedDesc: (qa.builderFlaggedDesc as string) ?? '',
            previousInspections: (qa.previousInspections as boolean | null) ?? null,
            roomConcerns: (qa.roomConcerns as string) ?? '',
            inspectorName: data.inspector_name ?? '',
            inspectionDate: data.inspection_date ?? new Date().toISOString().split('T')[0],
            weather: data.weather_conditions ?? '',
            whoInspecting: (qa.whoInspecting as string) ?? '',
          })
          setStage('form')
          return
        }
      }

      setStage('disclaimer')
    }
    init()
  }, [])

  // Debounced auto-save
  useEffect(() => {
    if (!inspectionId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('inspections').update(toSupabaseRow(answers)).eq('id', inspectionId)
      setSaving(false)
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [answers, inspectionId])

  function set<K extends keyof Answers>(key: K, val: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  function toggle(key: 'features' | 'sharedAreas' | 'contractInclusions' | 'integratedAppliances', val: string) {
    setAnswers(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })
  }

  async function acceptDisclaimer() {
    setDisclaimerLoading(true)
    setDisclaimerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Ensure user row exists (may be missing if they signed up without email confirmation)
    await supabase.from('users').upsert(
      { id: user.id, email: user.email ?? '' },
      { onConflict: 'id' }
    )

    const { data, error } = await supabase.from('inspections').insert({
      user_id: user.id,
      country: countryCode,
      status: 'draft',
      questionnaire_answers: {},
    }).select('id').single()

    if (error) {
      setDisclaimerError(error.message)
      setDisclaimerLoading(false)
      return
    }

    if (data) {
      setInspectionId(data.id)
      localStorage.setItem(STORAGE_KEY, data.id)
      setStage('form')
    }
  }

  async function handleComplete() {
    if (!inspectionId) return
    setStage('completing')

    clearTimeout(saveTimer.current)

    const verificationCode = randomCode(8)
    const shareToken = crypto.randomUUID()

    await supabase.from('inspections').update({
      ...toSupabaseRow(answers),
      verification_code: verificationCode,
      share_token: shareToken,
      status: 'in_progress',
    }).eq('id', inspectionId)

    // Generate and save the checklist
    await generateChecklist(inspectionId, {
      propertyType: answers.propertyType,
      bedrooms: answers.bedrooms,
      bathrooms: answers.bathrooms,
      constructionType: answers.constructionType,
      isManaged: answers.isManaged ?? false,
      contractInclusions: answers.contractInclusions,
      integratedAppliances: answers.integratedAppliances,
      features: answers.features,
      sharedAreas: answers.sharedAreas,
      heatingSystem: answers.heatingSystem,
      pressurisedCylinder: answers.pressurisedCylinder,
      hrvSystem: answers.hrvSystem,
      contractOther: answers.contractOther,
    }, answers.country)

    localStorage.removeItem(STORAGE_KEY)
    router.push(`/inspect/${inspectionId}/checklist`)
  }

  function next() {
    if (section < TOTAL_SECTIONS) setSection(s => s + 1)
    else handleComplete()
  }

  function back() {
    if (section > 1) setSection(s => s - 1)
  }

  const cfg = COUNTRY_CONFIG[answers.country]
  const isUS_CA = answers.country === 'US' || answers.country === 'CA'

  // ── Loading ────────────────────────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-snap-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Completing ─────────────────────────────────────────────────────────────

  if (stage === 'completing') {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-snap-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-grotesk text-white/50 text-sm">Building your checklist…</p>
        </div>
      </div>
    )
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────────

  if (stage === 'disclaimer') {
    return (
      <div className="min-h-screen bg-snap-ink flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <SnapSnagLogo size="md" showTagline />
          </div>

          <div className="card border border-white/10">
            <h1 className="font-fraunces text-2xl font-bold mb-4">Before you start</h1>
            <p className="font-grotesk text-sm text-white/60 leading-relaxed mb-6">
              SnapSnag is a self-guided inspection tool to help you identify potential defects
              in your new home.
              <br /><br />
              This inspection is not a substitute for a professional survey by a qualified surveyor.
              SnapSnag does not accept liability for defects not identified during your inspection.
              <br /><br />
              By continuing you agree to our{' '}
              <Link href="/terms" className="text-snap-teal hover:brightness-110 underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-snap-teal hover:brightness-110 underline">Privacy Policy</Link>.
            </p>

            {disclaimerError && (
              <p className="font-grotesk text-sm text-snap-fail mb-4">{disclaimerError}</p>
            )}
            <button
              onClick={acceptDisclaimer}
              disabled={disclaimerLoading}
              className="btn-primary w-full min-h-[52px] flex items-center justify-center font-bold disabled:opacity-50"
              style={{ fontWeight: 700, boxShadow: '0 0 24px rgba(0,201,167,0.25)' }}
            >
              {disclaimerLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-snap-ink border-t-transparent rounded-full animate-spin" />
                  Starting…
                </span>
              ) : (
                'I understand — start my inspection'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-snap-ink text-snap-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-snap-ink/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <SnapSnagLogo size="sm" />
          </Link>
          {saving && (
            <span className="font-grotesk text-xs text-white/30">Saving…</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-grotesk text-xs text-white/40">Section {section} of {TOTAL_SECTIONS}</span>
            <span className="font-grotesk text-xs text-white/40">{Math.round((section / TOTAL_SECTIONS) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-snap-teal rounded-full transition-all duration-500"
              style={{ width: `${(section / TOTAL_SECTIONS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pt-36 pb-40">

        {/* ── SECTION 1 ── */}
        {section === 1 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">About the property</p>

            <Q label="What country is the property in?">
              <div className="grid grid-cols-1 gap-3">
                {([
                  ['IE', '🇮🇪', 'Ireland'],
                  ['UK', '🇬🇧', 'United Kingdom'],
                  ['AU', '🇦🇺', 'Australia'],
                  ['US', '🇺🇸', 'United States'],
                  ['CA', '🇨🇦', 'Canada'],
                ] as [CountryCode, string, string][]).map(([code, flag, name]) => (
                  <OptionCard
                    key={code}
                    icon={flag}
                    label={name}
                    selected={answers.country === code}
                    onClick={() => { set('country', code); setCountry(code) }}
                  />
                ))}
              </div>
            </Q>

            <Q label="Full address of the property" sub="This appears on your report cover">
              <div className="space-y-3">
                <input className="input" placeholder="Address line 1 *" value={answers.address1} onChange={e => set('address1', e.target.value)} />
                <input className="input" placeholder="Address line 2 (optional)" value={answers.address2} onChange={e => set('address2', e.target.value)} />
                <input className="input" placeholder="City or Town *" value={answers.city} onChange={e => set('city', e.target.value)} />
                <input className="input" placeholder="County / State / Province *" value={answers.county} onChange={e => set('county', e.target.value)} />
                <input className="input" placeholder={isUS_CA ? 'ZIP Code *' : 'Eircode / Postcode *'} value={answers.postcode} onChange={e => set('postcode', e.target.value)} />
              </div>
            </Q>

            <Q label="What type of property is it?">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['🏠', 'Detached house'],
                  ['🏘', 'Semi-detached house'],
                  ['🏚', 'Terraced house'],
                  ['🏢', 'Apartment'],
                  ['🏛', 'Duplex'],
                  ['🏙', 'Townhouse'],
                  ['🏡', 'Bungalow'],
                  ['❓', 'Other'],
                ].map(([icon, label]) => (
                  <OptionCard
                    key={label}
                    icon={icon}
                    label={label}
                    selected={answers.propertyType === label}
                    onClick={() => set('propertyType', label)}
                  />
                ))}
              </div>
            </Q>

            <Q label="How many bedrooms?">
              <div className="grid grid-cols-7 gap-2">
                {['1','2','3','4','5','6','7+'].map(n => (
                  <NumBtn key={n} n={n} selected={answers.bedrooms === parseInt(n) || (n === '7+' && (answers.bedrooms ?? 0) >= 7)} onClick={() => set('bedrooms', n === '7+' ? 7 : parseInt(n))} />
                ))}
              </div>
            </Q>

            <Q label="How many bathrooms and en-suites in total?">
              <div className="grid grid-cols-6 gap-2">
                {['1','2','3','4','5','6+'].map(n => (
                  <NumBtn key={n} n={n} selected={answers.bathrooms === parseInt(n) || (n === '6+' && (answers.bathrooms ?? 0) >= 6)} onClick={() => set('bathrooms', n === '6+' ? 6 : parseInt(n))} />
                ))}
              </div>
            </Q>

            <Q label="Which of the following does it have?" sub="Tick all that apply">
              <div className="grid grid-cols-1 gap-2">
                {[
                  ['🧺', 'Utility room'],
                  ['🪜', 'Accessible attic (can walk in)'],
                  ['🔍', 'Attic hatch only (can look in)'],
                  ['🏠', 'Converted attic room'],
                  ['🚗', 'Attached garage'],
                  ['🏗', 'Detached garage'],
                  ['🌿', 'Front garden'],
                  ['🌳', 'Back garden'],
                  ['🌇', 'Balcony'],
                  ['🪑', 'Terrace or patio'],
                  ['🤝', 'Shared outdoor space only'],
                  ['🚫', 'No outdoor space'],
                ].map(([icon, label]) => (
                  <CheckCard key={label} icon={icon} label={label} checked={answers.features.includes(label)} onClick={() => toggle('features', label)} />
                ))}
              </div>
            </Q>

            {answers.propertyType === 'Apartment' && (
              <Q label="What floor is the apartment on?">
                <div className="grid grid-cols-1 gap-3">
                  {['Ground floor', 'Middle floor', 'Top floor', 'Only floor'].map(f => (
                    <OptionCard key={f} label={f} selected={answers.apartmentFloor === f} onClick={() => set('apartmentFloor', f)} />
                  ))}
                </div>
              </Q>
            )}

            <Q label="Approximate size?">
              <div className="grid grid-cols-1 gap-3">
                {isUS_CA ? [
                  ['Under 750 sq ft', 'under_750'],
                  ['750–1,100 sq ft', '750_1100'],
                  ['1,100–1,600 sq ft', '1100_1600'],
                  ['Over 1,600 sq ft', 'over_1600'],
                  ['Not sure', 'not_sure'],
                ] : [
                  ['Under 70 sqm', 'under_70'],
                  ['70–100 sqm', '70_100'],
                  ['100–150 sqm', '100_150'],
                  ['Over 150 sqm', 'over_150'],
                  ['Not sure', 'not_sure'],
                ].map(([label, val]) => (
                  <OptionCard key={val} label={label} selected={answers.size === val} onClick={() => set('size', val)} />
                ))}
              </div>
            </Q>
          </div>
        )}

        {/* ── SECTION 2 ── */}
        {section === 2 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">About the build</p>

            <Q label="Builder or developer name" sub="This appears on your PDF report cover">
              <input className="input" placeholder="e.g. Cairn Homes, Bellway, etc." value={answers.builderName} onChange={e => set('builderName', e.target.value)} />
            </Q>

            <Q label="Date of completion or handover" sub="We use this to set your warranty countdown reminder">
              <div className="space-y-3">
                {!answers.handoverNotConfirmed && (
                  <input type="date" className="input" value={answers.handoverDate} onChange={e => set('handoverDate', e.target.value)} />
                )}
                <CheckCard
                  label="Not confirmed yet"
                  checked={answers.handoverNotConfirmed}
                  onClick={() => set('handoverNotConfirmed', !answers.handoverNotConfirmed)}
                />
              </div>
            </Q>

            <Q label="Pre-completion or post-completion?">
              <div className="grid grid-cols-1 gap-3">
                <OptionCard icon="🔑" label="Before I get the keys" sub="Pre-completion inspection" selected={answers.inspectionType === 'pre'} onClick={() => set('inspectionType', 'pre')} />
                <OptionCard icon="🏠" label="I already have the keys" sub="Post-completion inspection" selected={answers.inspectionType === 'post'} onClick={() => set('inspectionType', 'post')} />
              </div>
            </Q>

            <Q label={<>Construction type <Tooltip text="Timber frame: walls made of wood panels. Common in Ireland and UK." /></>  as unknown as string}>
              <div className="grid grid-cols-1 gap-3">
                {['Brick built', 'Block built', 'Timber frame', 'Steel frame', 'I am not sure'].map(t => (
                  <OptionCard key={t} label={t} selected={answers.constructionType === t} onClick={() => set('constructionType', t)} />
                ))}
              </div>
            </Q>

            <Q label="Part of a managed development?">
              <div className="grid grid-cols-2 gap-3">
                <OptionCard label="Yes" icon="✅" selected={answers.isManaged === true} onClick={() => set('isManaged', true)} />
                <OptionCard label="No" icon="❌" selected={answers.isManaged === false} onClick={() => set('isManaged', false)} />
              </div>
            </Q>

            {answers.isManaged === true && (
              <Q label="Shared areas" sub="Tick all that apply">
                <div className="grid grid-cols-1 gap-2">
                  {['Lift or elevator', 'Shared entrance corridors or lobby', 'Underground or basement car park', 'Shared garden or courtyard', 'Rooftop terrace'].map(a => (
                    <CheckCard key={a} label={a} checked={answers.sharedAreas.includes(a)} onClick={() => toggle('sharedAreas', a)} />
                  ))}
                </div>
              </Q>
            )}
          </div>
        )}

        {/* ── SECTION 3 ── */}
        {section === 3 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">Contract inclusions</p>

            <Q label="What is included in your purchase contract?" sub="Tick everything the builder agreed to include in the sale price">
              <div className="grid grid-cols-1 gap-2">
                {[
                  ['🍳', 'Fitted kitchen (units, worktop, sink)'],
                  ['🚪', 'Built-in wardrobes in ALL bedrooms'],
                  ['🚪', 'Built-in wardrobes in SOME bedrooms'],
                  ['🧊', 'Integrated kitchen appliances'],
                  ['🪵', 'Flooring throughout entire home'],
                  ['🪵', 'Flooring in some rooms only'],
                  ['⚡', 'EV charging point'],
                  ['☀️', 'Solar panels or solar PV'],
                  ['♨️', 'Heat pump'],
                  ['🌡', 'Underfloor heating throughout'],
                  ['🌡', 'Underfloor heating ground floor only'],
                  ['🔐', 'Security alarm system'],
                  ['🏠', 'Smart home system'],
                  ['💡', 'Outdoor lighting'],
                  ['🏚', 'Garden shed'],
                  ['🌿', 'Landscaping and garden finish'],
                  ['🚫', 'Nothing extra included'],
                ].map(([icon, label]) => (
                  <CheckCard key={label} icon={icon} label={label} checked={answers.contractInclusions.includes(label)} onClick={() => toggle('contractInclusions', label)} />
                ))}
              </div>
            </Q>

            {answers.contractInclusions.includes('Integrated kitchen appliances') && (
              <Q label="Which integrated appliances?">
                <div className="grid grid-cols-1 gap-2">
                  {['Oven and hob', 'Extractor fan or rangehood', 'Dishwasher', 'Fridge or freezer', 'Washing machine', 'Tumble dryer', 'Microwave'].map(a => (
                    <CheckCard key={a} label={a} checked={answers.integratedAppliances.includes(a)} onClick={() => toggle('integratedAppliances', a)} />
                  ))}
                </div>
              </Q>
            )}

            <Q label="Anything else promised in contract?" sub="Optional">
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder={`e.g. specific floor tiles in kitchen, chrome fittings in bathrooms, ${cfg.terminology.sockets} in specific locations...`}
                value={answers.contractOther}
                onChange={e => set('contractOther', e.target.value)}
              />
            </Q>
          </div>
        )}

        {/* ── SECTION 4 ── */}
        {section === 4 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">Heating and energy</p>

            <Q label="Primary heating system">
              <div className="grid grid-cols-1 gap-3">
                {['Gas boiler', 'Air-to-water heat pump', 'Air-to-air heat pump', 'Oil boiler', 'Electric heating', 'District heating', 'Not sure'].map(h => (
                  <OptionCard key={h} label={h} selected={answers.heatingSystem === h} onClick={() => set('heatingSystem', h)} />
                ))}
              </div>
            </Q>

            <Q label={<>Pressurised hot water cylinder? <Tooltip text="A sealed metal cylinder usually in an airing cupboard. Not a standard open tank." /></> as unknown as string}>
              <div className="grid grid-cols-3 gap-3">
                {['Yes', 'No', 'Not sure'].map(v => (
                  <OptionCard key={v} label={v} selected={answers.pressurisedCylinder === v} onClick={() => set('pressurisedCylinder', v)} />
                ))}
              </div>
            </Q>

            <Q label={<>HRV or MVHR ventilation system? <Tooltip text="Heat Recovery Ventilation — usually has circular vents in ceilings throughout." /></> as unknown as string}>
              <div className="grid grid-cols-3 gap-3">
                {['Yes', 'No', 'Not sure'].map(v => (
                  <OptionCard key={v} label={v} selected={answers.hrvSystem === v} onClick={() => set('hrvSystem', v)} />
                ))}
              </div>
            </Q>

            <Q label={`Has your ${cfg.energyCertName} been provided?`}>
              <div className="grid grid-cols-1 gap-3">
                {['Yes, I have it', 'Not yet', 'Not sure what this is'].map(v => (
                  <OptionCard key={v} label={v} selected={answers.energyCert === v} onClick={() => set('energyCert', v)} />
                ))}
              </div>
            </Q>
          </div>
        )}

        {/* ── SECTION 5 ── */}
        {section === 5 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">Known concerns</p>

            <Q label="Already noticed anything you want checked?" sub="Optional">
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="e.g. I noticed a hairline crack above the kitchen window..."
                value={answers.knownIssues}
                onChange={e => set('knownIssues', e.target.value)}
              />
            </Q>

            <Q label="Has the builder flagged any outstanding items?">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <OptionCard label="Yes" icon="✅" selected={answers.builderFlagged === true} onClick={() => set('builderFlagged', true)} />
                <OptionCard label="No" icon="❌" selected={answers.builderFlagged === false} onClick={() => set('builderFlagged', false)} />
              </div>
              {answers.builderFlagged === true && (
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Describe what they said..."
                  value={answers.builderFlaggedDesc}
                  onChange={e => set('builderFlaggedDesc', e.target.value)}
                />
              )}
            </Q>

            <Q label="Previous inspections done?">
              <div className="grid grid-cols-2 gap-3">
                <OptionCard label="Yes" icon="✅" selected={answers.previousInspections === true} onClick={() => set('previousInspections', true)} />
                <OptionCard label="No" icon="❌" selected={answers.previousInspections === false} onClick={() => set('previousInspections', false)} />
              </div>
            </Q>

            <Q label="Rooms you are most concerned about?" sub="Optional">
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="e.g. bathroom grout looks patchy, back garden not level..."
                value={answers.roomConcerns}
                onChange={e => set('roomConcerns', e.target.value)}
              />
            </Q>
          </div>
        )}

        {/* ── SECTION 6 ── */}
        {section === 6 && (
          <div>
            <p className="font-grotesk text-xs text-white/30 uppercase tracking-widest mb-6">Inspector details</p>

            <Q label="Your name (appears on report)">
              <input className="input" placeholder="Full name" value={answers.inspectorName} onChange={e => set('inspectorName', e.target.value)} />
            </Q>

            <Q label="Date of inspection">
              <input type="date" className="input" value={answers.inspectionDate} onChange={e => set('inspectionDate', e.target.value)} />
            </Q>

            <Q label="Weather and lighting right now" sub="Printed on your report — protects you in any future dispute about conditions">
              <div className="grid grid-cols-1 gap-3">
                {[
                  ['☀️', 'Bright sunshine'],
                  ['🌥', 'Overcast but dry'],
                  ['🌧', 'Raining'],
                  ['🌑', 'Dark outside'],
                  ['⛅', 'Mixed conditions'],
                  ['🏠', 'Inspecting indoors only'],
                ].map(([icon, label]) => (
                  <OptionCard key={label} icon={icon} label={label} selected={answers.weather === label} onClick={() => set('weather', label)} />
                ))}
              </div>
            </Q>

            <Q label="Who is inspecting today?">
              <div className="grid grid-cols-1 gap-3">
                {['Just me', 'Me and my partner or spouse', 'Me and my family', 'With my solicitor', 'With a professional inspector', 'Multiple inspectors'].map(w => (
                  <OptionCard key={w} label={w} selected={answers.whoInspecting === w} onClick={() => set('whoInspecting', w)} />
                ))}
              </div>
            </Q>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-snap-ink/95 backdrop-blur-md border-t border-white/5 px-6 py-4 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {section > 1 && (
            <button
              onClick={back}
              className="min-h-[52px] min-w-[52px] flex items-center justify-center border border-white/10 rounded-2xl text-white/60 hover:text-white hover:border-white/25 transition-all flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <button
            onClick={next}
            disabled={!canProceed(section, answers)}
            className="btn-primary flex-1 min-h-[52px] flex items-center justify-center font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontWeight: 700 }}
          >
            {section === TOTAL_SECTIONS ? 'Build my checklist →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

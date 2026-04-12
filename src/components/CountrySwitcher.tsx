'use client'

import { useCountry } from '@/lib/CountryContext'
import { COUNTRY_CONFIG, DOMAIN_MAP, type CountryCode } from '@/lib/countryConfig'

const FLAG_EMOJI: Record<string, string> = {
  IE: '🇮🇪',
  GB: '🇬🇧',
  AU: '🇦🇺',
  US: '🇺🇸',
  CA: '🇨🇦',
}

const COUNTRY_ORDER: CountryCode[] = ['IE', 'UK', 'AU', 'US', 'CA']

const IS_PRODUCTION = typeof window !== 'undefined' &&
  Object.keys(DOMAIN_MAP).some(d => window.location.hostname === d)

interface CountrySwitcherProps {
  /** 'dev' shows flag buttons inline. 'footer' shows domain links for production. */
  variant?: 'dev' | 'footer'
  size?: 'sm' | 'lg'
}

export default function CountrySwitcher({ variant = 'dev', size = 'sm' }: CountrySwitcherProps) {
  const { countryCode, config, setCountry } = useCountry()

  if (variant === 'footer') {
    return (
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {COUNTRY_ORDER.map(code => {
          const cfg = COUNTRY_CONFIG[code]
          const domain = Object.entries(DOMAIN_MAP).find(([, c]) => c === code)?.[0]
          const flag = FLAG_EMOJI[cfg.flag]

          if (IS_PRODUCTION && domain) {
            return (
              <a
                key={code}
                href={`https://${domain}`}
                className={`flex items-center gap-1.5 font-grotesk text-sm transition-colors ${
                  code === countryCode
                    ? 'text-snap-teal font-semibold'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span>{flag}</span>
                <span>{cfg.name}</span>
              </a>
            )
          }

          // Dev: switch country via state
          return (
            <button
              key={code}
              onClick={() => setCountry(code)}
              className={`flex items-center gap-1.5 font-grotesk text-sm transition-colors ${
                code === countryCode
                  ? 'text-snap-teal font-semibold'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <span>{flag}</span>
              <span>{cfg.name}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Dev variant: compact flag row with active indicator
  return (
    <div className="flex items-center gap-1">
      {COUNTRY_ORDER.map(code => {
        const cfg = COUNTRY_CONFIG[code]
        const flag = FLAG_EMOJI[cfg.flag]
        const isActive = code === countryCode

        return (
          <button
            key={code}
            onClick={() => setCountry(code)}
            title={`Switch to ${cfg.name} (${cfg.oneTimePriceDisplay})`}
            className={`${size === 'lg' ? 'text-4xl px-3 py-2' : 'text-xl px-1.5 py-1'} rounded-lg transition-all ${
              isActive
                ? 'bg-snap-teal/20 ring-1 ring-snap-teal/50 scale-110'
                : 'opacity-40 hover:opacity-80 hover:bg-white/5'
            }`}
          >
            {flag}
          </button>
        )
      })}
      <span className={`ml-2 font-grotesk text-white/30 ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
        {config.oneTimePriceDisplay}
      </span>
    </div>
  )
}

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  COUNTRY_CONFIG,
  DOMAIN_MAP,
  DEFAULT_COUNTRY,
  type CountryCode,
  type CountryConfig,
} from './countryConfig'

const STORAGE_KEY = 'snapsnag_country'

function detectCountry(): CountryCode {
  if (typeof window === 'undefined') return DEFAULT_COUNTRY

  // 1. Check ?country= query param (development testing)
  const params = new URLSearchParams(window.location.search)
  const queryCountry = params.get('country')?.toUpperCase() as CountryCode | null
  if (queryCountry && queryCountry in COUNTRY_CONFIG) {
    localStorage.setItem(STORAGE_KEY, queryCountry)
    return queryCountry
  }

  // 2. Check production domain
  const hostname = window.location.hostname
  for (const [domain, code] of Object.entries(DOMAIN_MAP)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      localStorage.setItem(STORAGE_KEY, code)
      return code
    }
  }

  // 3. Check localStorage (persisted from previous visit)
  const stored = localStorage.getItem(STORAGE_KEY) as CountryCode | null
  if (stored && stored in COUNTRY_CONFIG) return stored

  // 4. Default
  return DEFAULT_COUNTRY
}

interface CountryContextValue {
  countryCode: CountryCode
  config: CountryConfig
  setCountry: (code: CountryCode) => void
}

const CountryContext = createContext<CountryContextValue | null>(null)

export function CountryProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY)

  useEffect(() => {
    setCountryCode(detectCountry())
  }, [])

  function setCountry(code: CountryCode) {
    localStorage.setItem(STORAGE_KEY, code)
    setCountryCode(code)
  }

  return (
    <CountryContext.Provider
      value={{ countryCode, config: COUNTRY_CONFIG[countryCode], setCountry }}
    >
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext)
  if (!ctx) throw new Error('useCountry must be used inside <CountryProvider>')
  return ctx
}

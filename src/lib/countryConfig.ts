export type CountryCode = 'IE' | 'UK' | 'AU' | 'US' | 'CA'

export interface CountryConfig {
  name: string
  currency: string
  symbol: string
  flag: string
  oneTimePrice: number
  oneTimePriceDisplay: string
  professionalPrice: string
  expertMonthly: number
  expertAnnual: number
  warrantyName: string
  energyCertName: string
  electricalStandard: string
  terminology: {
    sockets: string
    taps: string
    worktop: string
    wardrobes: string
    extractor: string
    skirting: string
    powerboard: string
    lounge: string
    hotWater: string
    floorArea: string
  }
}

export const COUNTRY_CONFIG: Record<CountryCode, CountryConfig> = {
  IE: {
    name: 'Ireland',
    currency: 'EUR',
    symbol: '€',
    flag: 'IE',
    oneTimePrice: 1995,
    oneTimePriceDisplay: '€19.95',
    professionalPrice: '€190–€240',
    expertMonthly: 2995,
    expertAnnual: 24900,
    warrantyName: 'HomeBond',
    energyCertName: 'BER Certificate',
    electricalStandard: 'ETCI Wiring Regulations',
    terminology: {
      sockets: 'sockets',
      taps: 'taps',
      worktop: 'worktop',
      wardrobes: 'built-in wardrobes',
      extractor: 'extractor fan',
      skirting: 'skirting boards',
      powerboard: 'consumer unit / fuse board',
      lounge: 'living room',
      hotWater: 'hot water cylinder',
      floorArea: 'sqm',
    },
  },
  UK: {
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    flag: 'GB',
    oneTimePrice: 2395,
    oneTimePriceDisplay: '£23.95',
    professionalPrice: '£300–£600',
    expertMonthly: 2995,
    expertAnnual: 24900,
    warrantyName: 'NHBC Buildmark',
    energyCertName: 'EPC Certificate',
    electricalStandard: '18th Edition IET Wiring Regs',
    terminology: {
      sockets: 'sockets',
      taps: 'taps',
      worktop: 'worktop',
      wardrobes: 'built-in wardrobes',
      extractor: 'extractor fan',
      skirting: 'skirting boards',
      powerboard: 'consumer unit',
      lounge: 'living room',
      hotWater: 'hot water cylinder',
      floorArea: 'sqm',
    },
  },
  AU: {
    name: 'Australia',
    currency: 'AUD',
    symbol: '$',
    flag: 'AU',
    oneTimePrice: 3995,
    oneTimePriceDisplay: 'A$39.95',
    professionalPrice: 'A$400–A$800',
    expertMonthly: 2995,
    expertAnnual: 24900,
    warrantyName: 'HBC Fund',
    energyCertName: 'NatHERS Rating',
    electricalStandard: 'AS/NZS 3000 Wiring Rules',
    terminology: {
      sockets: 'powerpoints',
      taps: 'tapware',
      worktop: 'benchtop',
      wardrobes: 'built-in robes',
      extractor: 'rangehood',
      skirting: 'skirting boards',
      powerboard: 'switchboard',
      lounge: 'living area',
      hotWater: 'hot water unit',
      floorArea: 'sqm',
    },
  },
  US: {
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    flag: 'US',
    oneTimePrice: 2995,
    oneTimePriceDisplay: '$29.95',
    professionalPrice: '$400–$700',
    expertMonthly: 2995,
    expertAnnual: 24900,
    warrantyName: 'Builder Warranty',
    energyCertName: 'Energy Efficiency Certificate',
    electricalStandard: 'NEC (National Electrical Code)',
    terminology: {
      sockets: 'outlets',
      taps: 'faucets',
      worktop: 'countertop',
      wardrobes: 'closets',
      extractor: 'range hood',
      skirting: 'baseboards',
      powerboard: 'electrical panel',
      lounge: 'living room',
      hotWater: 'water heater',
      floorArea: 'sq ft',
    },
  },
  CA: {
    name: 'Canada',
    currency: 'CAD',
    symbol: '$',
    flag: 'CA',
    oneTimePrice: 3495,
    oneTimePriceDisplay: 'C$34.95',
    professionalPrice: 'C$350–C$600',
    expertMonthly: 2995,
    expertAnnual: 24900,
    warrantyName: 'Tarion / Provincial Warranty',
    energyCertName: 'EnerGuide Rating',
    electricalStandard: 'CSA C22.1 Electrical Code',
    terminology: {
      sockets: 'outlets',
      taps: 'faucets',
      worktop: 'countertop',
      wardrobes: 'closets',
      extractor: 'range hood',
      skirting: 'baseboards',
      powerboard: 'electrical panel',
      lounge: 'living room',
      hotWater: 'water heater',
      floorArea: 'sq ft',
    },
  },
}

/** Maps production domains to country codes */
export const DOMAIN_MAP: Record<string, CountryCode> = {
  'snapsnag.ie': 'IE',
  'snapsnag.co.uk': 'UK',
  'snapsnag.com.au': 'AU',
  'snapsnagapp.com': 'US',
  'snapsnag.ca': 'CA',
}

export const DEFAULT_COUNTRY: CountryCode = 'IE'

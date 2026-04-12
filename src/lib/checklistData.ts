import type { CountryConfig } from './countryConfig'

export interface RoomTemplate {
  room: string
  room_order: number
  items: string[]
}

/** Replace [placeholder] tokens with country-specific terminology */
function t(text: string, terms: CountryConfig['terminology']): string {
  return text
    .replace(/\[sockets\]/g, terms.sockets)
    .replace(/\[socket\]/g, terms.sockets)
    .replace(/\[taps\]/g, terms.taps)
    .replace(/\[tap\]/g, terms.taps)
    .replace(/\[worktop\]/g, terms.worktop)
    .replace(/\[wardrobes\]/g, terms.wardrobes)
    .replace(/\[extractor\]/g, terms.extractor)
    .replace(/\[skirting\]/g, terms.skirting)
    .replace(/\[powerboard\]/g, terms.powerboard)
    .replace(/\[lounge\]/g, terms.lounge)
    .replace(/\[hotWater\]/g, terms.hotWater)
    .replace(/\[floorArea\]/g, terms.floorArea)
}

function applyTerms(items: string[], terms: CountryConfig['terminology']): string[] {
  return items.map(i => t(i, terms))
}

// ─── Room templates ────────────────────────────────────────────────────────────

const OUTSIDE_ITEMS = [
  'Front garden / yard - ground level, properly graded, no low spots collecting water?',
  'Driveway - any cracks, sunken areas, uneven surfaces or drainage problems?',
  'Boundary walls and fences - straight, complete, properly finished, no loose sections?',
  'Gutters - properly fitted, no sagging, no gaps at joints?',
  'Downpipes - connected correctly, discharging away from house foundation?',
  'Roof tiles or covering - any missing, cracked, slipped or misaligned sections visible?',
  'Fascia boards - properly fitted, painted, no gaps at joins or corners?',
  'Soffit boards - properly fitted, ventilated, no gaps?',
  'Front door exterior - frame fitted flush, no gaps, threshold neat and sealed?',
  'Back door exterior - frame fitted flush, no gaps, threshold neat and sealed?',
  'All windows exterior - frames fitted flush, no gaps, sealed correctly all around?',
  'External render or brickwork - any cracks, gaps, staining or unfinished patches?',
  'Air bricks and vents - all present, correctly positioned and not blocked?',
  'Outside tap - present and working if specified in contract?',
  'Manholes and drainage covers - flush with ground, secure, not cracked?',
  'Ground around property - no signs of subsidence, no standing water pools?',
  'Outdoor lighting - all fittings present and working if specified in contract?',
  'Garden shed - present and correctly erected if specified in contract?',
  'Landscaping - grass laid, paths finished, beds edged if specified in contract?',
]

const HALLWAY_ITEMS = [
  'Front door from inside - draughtproof seal working, letterbox present and working?',
  'Doorbell - working?',
  'Hall floor - level, no squeaks, no cracked tiles, no lifting at edges?',
  'Stairs - no squeaking or movement on any individual step?',
  'Stair banisters - secure, correctly fitted, no wobble when firmly tested?',
  'Handrail - continuous along full length, correctly fixed, no movement?',
  'Paintwork throughout - no drips, runs, missed patches, no uneven sheen?',
  '[sockets] and switches - all present, level, flush to wall, all working?',
  'Smoke alarm - present, fitted correctly, tested and working?',
  'Carbon monoxide alarm - present near any gas appliances, working?',
  'Coving and cornicing - fully fitted, no gaps at corners or joins?',
  'Ceiling - no cracks, no stains, no uneven plasterwork?',
  '[skirting] boards - properly fitted, mitred at corners, no gaps, neatly painted?',
  'Any internal doors off hallway - opening, closing, latching correctly?',
]

const LIVING_ROOM_ITEMS = [
  'Floor - level, no squeaks, no gaps at edges, no damage to surface?',
  'Paintwork - even coverage on all walls and ceiling, no drips or missed patches?',
  'Windows - opening, closing and locking correctly, no condensation between panes?',
  '[sockets] - correct number as per specification, all working?',
  'TV aerial or cable point - present in correct position?',
  'Radiator - correctly fitted, heating up fully, no leaks at valve connections?',
  'Ceiling - no cracks, stains or uneven plasterwork?',
  '[skirting] boards - properly fitted, mitred at corners, no gaps, neatly painted?',
  'Coving - fully fitted with no gaps?',
  'Any patio or French doors - opening, closing, locking correctly, properly sealed?',
  'Window sills - properly fitted, no gaps to wall, painted neatly?',
]

const KITCHEN_ITEMS = [
  'All cupboard doors - opening and closing smoothly, hinges aligned, handles fitted?',
  'All drawers - opening and closing smoothly, no sticking, handles fitted?',
  '[worktop] - no chips, no gaps at joins, no damage, no uneven seams?',
  'Sink - properly fitted, sealed all around, no leaks under or around it?',
  'Hot [tap] - working with good pressure?',
  'Cold [tap] - working with good pressure?',
  '[extractor] - working with adequate suction, ducted to outside?',
  '[worktop] splashback - properly fitted, no loose tiles, no missing grout?',
  'Kitchen floor - level, no damage, no lifting at edges?',
  'Sufficient [sockets] in correct positions as per specification?',
  'Plumbing under sink - no leaks, no damp, connections secure?',
  'Dishwasher connection point - plumbed and ready if specified in contract?',
  'Ceiling - no cracks, no uneven plasterwork?',
  '[skirting] boards or kick plates - properly fitted, no gaps?',
]

const BEDROOM_ITEMS = [
  'Floor - level, no damage, no squeaks, no gaps at [skirting]?',
  'Paintwork - even coverage on all walls, no drips or missed patches?',
  'Windows - opening, closing and locking correctly, no condensation between panes?',
  '[sockets] - correct number as per spec, all working?',
  '[wardrobes] - doors aligned, tracks smooth, handles fitted (if in contract)?',
  'Radiator - present, heating up fully, no leaks at connections?',
  'Ceiling - no cracks, no stains, no uneven plasterwork?',
  '[skirting] boards - properly fitted, mitred at corners, no gaps?',
  'Window sill - properly fitted, painted neatly?',
  'Any built-in shelving - properly fixed, level, no gaps to wall?',
]

const BATHROOM_ITEMS = [
  'Toilet - flushes correctly, no rocking on floor, seat properly fitted, no leaks at base?',
  'Toilet cistern - filling correctly, no continuous running after flush?',
  'Sink - properly fitted, [taps] working, no leaks underneath, sealed at wall?',
  'Bath - properly sealed on all sides, [taps] working, waste draining correctly?',
  'Shower enclosure or screen - fitted correctly, sealed, no leaks, pressure adequate?',
  'All tiles - level, no cracked or missing tiles, grout complete and even, no hollow spots?',
  'Floor - properly fitted, no lifting edges, no loose areas?',
  'Extractor fan - working and ducted to outside (not just into attic)?',
  'Heated towel rail - working and warming to full heat?',
  'Mirror and accessories - present if specified in contract?',
  'Silicone seals - fully applied with no gaps around bath, shower, sink and all tiles?',
  'Ceiling - no stains, no signs of condensation damage?',
  '[sockets] or shaver socket - correct type for bathroom, positioned correctly?',
]

const ENSUITE_ITEMS = [
  'Toilet - flushes correctly, no rocking on floor, seat properly fitted, no leaks at base?',
  'Toilet cistern - filling correctly, no continuous running after flush?',
  'Sink - properly fitted, [taps] working, no leaks underneath, sealed at wall?',
  'Shower enclosure or screen - fitted correctly, sealed, no leaks, pressure adequate?',
  'All tiles - level, no cracked or missing tiles, grout complete and even, no hollow spots?',
  'Floor - properly fitted, no lifting edges, no loose areas?',
  'Extractor fan - working and ducted to outside?',
  'Heated towel rail - working and warming to full heat?',
  'Silicone seals - fully applied with no gaps around shower, sink and all tiles?',
  'Ceiling - no stains, no signs of condensation damage?',
]

const UTILITY_ITEMS = [
  'Plumbing connections for washing machine - present, capped, accessible?',
  'Plumbing connection for tumble dryer if applicable - present?',
  'Floor - properly fitted and finished?',
  'Door - opening, closing and locking correctly?',
  '[sockets] - sufficient number for appliances?',
  'Ventilation or external vent - present and working?',
  'Ceiling and walls - no damp, staining or unfinished areas?',
]

const ATTIC_ITEMS = [
  'Insulation - present across full floor area, evenly laid to correct depth?',
  'Any visible damp, water staining or daylight showing through the roof?',
  'Attic hatch - opens properly, properly framed, has insulated hatch cover?',
  'Any water tank present - properly lagged, secured, no corrosion?',
  'No visible pest activity, nesting material or entry points?',
  'Timber joists and rafters - no visible rot, damage or insect activity?',
  'Any electrical cabling in attic - properly clipped, no loose runs?',
]

const GARAGE_ITEMS = [
  'Garage door - opening, closing and locking correctly, no sticking or misalignment?',
  'Garage floor - level, no cracks, no drainage issues?',
  'Walls and ceiling - no damp, staining or unfinished areas?',
  'If attached garage: fire door between garage and house - self-closing and fire rated?',
  'If attached garage: fire door frame and seal - intact and undamaged?',
  'Electrical [sockets] in garage - working if specified?',
  'Lighting in garage - working?',
]

const GARDEN_ITEMS = [
  'Back garden ground level - properly graded, no low spots, drainage adequate?',
  'Boundary walls or fences at rear - complete, properly finished, stable?',
  'Patio or decking if present - level, properly laid, no loose slabs or boards?',
  'Any outdoor taps - working?',
  'Outdoor lighting - all fittings present and working if specified?',
  'Soakaway or drainage - working, no standing water after rain?',
]

const HEATING_ELECTRICS_ITEMS = [
  'Boiler or heat pump - present, commissioned and working?',
  'Boiler operating manual and commissioning certificate - provided by builder?',
  'All radiators throughout house - heating up fully, no cold spots?',
  'Thermostatic radiator valves - present on all radiators, working?',
  'Main thermostat or control unit - present, working, correctly calibrated?',
  '[powerboard] / fuse board - properly labelled with all circuits identified?',
  '[powerboard] - no open knockouts, no loose wiring visible?',
  'All light switches throughout house - working in every room?',
  'All [sockets] throughout house - working? (use a socket tester)',
  'Carbon monoxide alarm - present and working near gas appliances?',
  'Smoke alarms throughout - all present, all tested and working?',
  'Any exposed wiring or unfinished electrical work anywhere?',
  'Meter cupboard or utility box - properly labelled, accessible?',
  'All appliance manuals, installation certs and warranty cards provided?',
]

// ─── Country-specific extras ────────────────────────────────────────────────

const COUNTRY_EXTRAS: Record<string, string[]> = {
  IE: [
    'BER (Building Energy Rating) certificate - provided by builder?',
    'HomeBond warranty documents - provided by builder?',
    'All appliance manuals and warranty cards - provided by builder?',
    'HomeBond 10 year structural warranty registered - confirmation provided?',
  ],
  UK: [
    'NHBC Buildmark warranty documents - provided by builder?',
    'Building Control Completion Certificate - provided?',
    'Gas Safe certificate for all gas work - provided?',
    'Electrical Installation Certificate (EIC) - provided?',
    'FENSA or equivalent certificate for all windows - provided?',
    'EPC (Energy Performance Certificate) - provided?',
  ],
  AU: [
    'HBC (Home Building Compensation) certificate - provided by builder?',
    'Occupation Certificate - issued by certifier?',
    'Termite barrier treatment documentation - provided?',
    'Termite management system type and warranty - documented?',
    'BASIX certificate compliance - all commitments present and working?',
    'All statutory warranty and compliance certificates - provided?',
  ],
  US: [
    'Certificate of Occupancy - issued by local authority?',
    'Builder warranty documents (1yr workmanship, 2yr systems, 10yr structural) - provided?',
    'GFCI outlets tested in all wet areas?',
    'AFCI breakers fitted in all bedroom circuits?',
    'All appliance manuals and warranties - provided?',
  ],
  CA: [
    'Provincial new home warranty documents (Tarion/equivalent) - provided?',
    'HRV or ERV unit commissioned and balanced?',
    'All outlets tested with outlet tester for correct wiring?',
    'Electrical panel labelled to CSA standards?',
    'All appliance manuals and compliance certificates - provided?',
  ],
}

// ─── Main export ───────────────────────────────────────────────────────────────

export interface BaseChecklistRoom {
  room: string
  roomKey: string   // stable key for logic checks
  room_order: number
  items: string[]
}

/**
 * Returns all base checklist rooms with terminology applied.
 * Does NOT include bedrooms/bathrooms — those are generated dynamically.
 * Does NOT include optional rooms (attic, garage etc.) — caller filters those.
 */
export function getBaseChecklist(
  country: string,
  terminology: CountryConfig['terminology'],
): BaseChecklistRoom[] {
  const countryExtras = COUNTRY_EXTRAS[country] ?? []

  const rooms: BaseChecklistRoom[] = [
    {
      room: 'Outside the Property',
      roomKey: 'outside',
      room_order: 1,
      items: applyTerms(OUTSIDE_ITEMS, terminology),
    },
    {
      room: 'Hallway and Stairs',
      roomKey: 'hallway',
      room_order: 2,
      items: applyTerms(HALLWAY_ITEMS, terminology),
    },
    {
      room: 'Living Room',
      roomKey: 'living_room',
      room_order: 3,
      items: applyTerms(LIVING_ROOM_ITEMS, terminology),
    },
    {
      room: 'Kitchen',
      roomKey: 'kitchen',
      room_order: 4,
      items: applyTerms(KITCHEN_ITEMS, terminology),
    },
    // Bedrooms inserted at room_order 5+ by generateChecklist
    // Bathrooms inserted after bedrooms by generateChecklist
    {
      room: 'Utility Room',
      roomKey: 'utility',
      room_order: 900, // placed after bedrooms/bathrooms
      items: applyTerms(UTILITY_ITEMS, terminology),
    },
    {
      room: 'Attic',
      roomKey: 'attic',
      room_order: 910,
      items: applyTerms(ATTIC_ITEMS, terminology),
    },
    {
      room: 'Garage',
      roomKey: 'garage',
      room_order: 920,
      items: applyTerms(GARAGE_ITEMS, terminology),
    },
    {
      room: 'Garden and Outdoor Areas',
      roomKey: 'garden',
      room_order: 930,
      items: applyTerms(GARDEN_ITEMS, terminology),
    },
    {
      room: 'Heating and Electrics',
      roomKey: 'heating_electrics',
      room_order: 990,
      items: applyTerms([...HEATING_ELECTRICS_ITEMS, ...countryExtras], terminology),
    },
  ]

  return rooms
}

// Export templates for use in generateChecklist
export { BEDROOM_ITEMS, BATHROOM_ITEMS, ENSUITE_ITEMS }

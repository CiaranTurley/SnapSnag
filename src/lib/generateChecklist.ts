import { createSupabaseBrowserClient } from './supabase'
import { COUNTRY_CONFIG, type CountryCode } from './countryConfig'
import {
  getBaseChecklist,
  BEDROOM_ITEMS,
  BATHROOM_ITEMS,
  ENSUITE_ITEMS,
  type BaseChecklistRoom,
} from './checklistData'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface QuestionnaireAnswers {
  // Top-level inspection fields
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  constructionType: string
  isManaged: boolean
  contractInclusions: string[]
  integratedAppliances: string[]
  // From questionnaire_answers JSONB
  features: string[]
  sharedAreas: string[]
  heatingSystem: string
  pressurisedCylinder: string
  hrvSystem: string
  contractOther: string
}

interface SupabaseChecklistItem {
  inspection_id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  is_custom: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function applyTerms(text: string, terms: ReturnType<typeof COUNTRY_CONFIG[CountryCode]['terminology']['sockets'] extends string ? () => typeof COUNTRY_CONFIG[CountryCode]['terminology'] : never>): string {
  return text
}

function hasFeature(features: string[], ...keys: string[]): boolean {
  return keys.some(k => features.some(f => f.toLowerCase().includes(k.toLowerCase())))
}

function hasInclusion(inclusions: string[], keyword: string): boolean {
  return inclusions.some(i => i.toLowerCase().includes(keyword.toLowerCase()))
}

function applyT(text: string, terms: typeof COUNTRY_CONFIG[CountryCode]['terminology']): string {
  return text
    .replace(/\[sockets\]/g, (terms as any).sockets)
    .replace(/\[socket\]/g, (terms as any).sockets)
    .replace(/\[taps\]/g, (terms as any).taps)
    .replace(/\[tap\]/g, (terms as any).taps)
    .replace(/\[worktop\]/g, (terms as any).worktop)
    .replace(/\[wardrobes\]/g, (terms as any).wardrobes)
    .replace(/\[extractor\]/g, (terms as any).extractor)
    .replace(/\[skirting\]/g, (terms as any).skirting)
    .replace(/\[powerboard\]/g, (terms as any).powerboard)
    .replace(/\[lounge\]/g, (terms as any).lounge)
    .replace(/\[hotWater\]/g, (terms as any).hotWater)
    .replace(/\[floorArea\]/g, (terms as any).floorArea)
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function generateChecklist(
  inspectionId: string,
  answers: QuestionnaireAnswers,
  country: string,
): Promise<void> {
  const countryCode = country as CountryCode
  const cfg = COUNTRY_CONFIG[countryCode] ?? COUNTRY_CONFIG['IE']
  const terms = cfg.terminology

  function term(text: string): string {
    return applyT(text, terms)
  }

  function termItems(items: string[]): string[] {
    return items.map(term)
  }

  // ── 1. Get base checklist ──────────────────────────────────────────────────
  let rooms: BaseChecklistRoom[] = getBaseChecklist(countryCode, terms)

  // ── 2. Remove rooms that don't apply ──────────────────────────────────────
  const features = answers.features ?? []

  const hasAttic = hasFeature(features, 'accessible attic', 'attic hatch', 'converted attic')
  const hasGarage = hasFeature(features, 'garage')
  const hasUtility = hasFeature(features, 'utility room')
  const hasGarden = hasFeature(features, 'front garden', 'back garden', 'balcony', 'terrace', 'outdoor space')

  rooms = rooms.filter(r => {
    if (r.roomKey === 'attic' && !hasAttic) return false
    if (r.roomKey === 'garage' && !hasGarage) return false
    if (r.roomKey === 'utility' && !hasUtility) return false
    if (r.roomKey === 'garden' && !hasGarden) return false
    return true
  })

  // Remove shared areas section if not a managed development
  if (!answers.isManaged) {
    rooms = rooms.filter(r => r.roomKey !== 'shared_areas')
  }

  // ── 3. Generate bedroom sections ──────────────────────────────────────────
  const bedroomCount = answers.bedrooms ?? 1
  const bedroomRooms: BaseChecklistRoom[] = []

  for (let i = 1; i <= bedroomCount; i++) {
    const items = termItems(BEDROOM_ITEMS)

    // Add timber frame checks to each room if applicable
    if (answers.constructionType === 'Timber frame') {
      items.push(
        'No visible gaps, cracks or movement in internal wall plasterboard?',
        'No visible moisture or damp patches on internal walls or ceiling?',
      )
      if (i === 1) {
        items.push('Timber frame completion certificate provided by builder?')
      }
    }

    // Add underfloor heating check per bedroom if applicable
    if (hasInclusion(answers.contractInclusions, 'underfloor heating')) {
      items.push(`Bedroom ${i} floor - underfloor heating warming evenly, no cold spots?`)
    }

    bedroomRooms.push({
      room: bedroomCount === 1 ? 'Bedroom' : `Bedroom ${i}`,
      roomKey: `bedroom_${i}`,
      room_order: 4 + i,
      items,
    })
  }

  // ── 4. Generate bathroom sections ─────────────────────────────────────────
  const bathroomCount = answers.bathrooms ?? 1
  const bathroomRooms: BaseChecklistRoom[] = []
  const bathroomOrder = 4 + bedroomCount + 1

  // Always have main bathroom
  bathroomRooms.push({
    room: 'Main Bathroom',
    roomKey: 'main_bathroom',
    room_order: bathroomOrder,
    items: termItems(BATHROOM_ITEMS),
  })

  // Add en-suites
  for (let i = 2; i <= bathroomCount; i++) {
    const label = i === 2 ? 'En-Suite Bathroom' : `En-Suite ${i - 1}`
    bathroomRooms.push({
      room: label,
      roomKey: `ensuite_${i - 1}`,
      room_order: bathroomOrder + (i - 1),
      items: termItems(ENSUITE_ITEMS),
    })
  }

  // ── 5. Reassign room_order for optional rooms after bathrooms ──────────────
  const afterBathrooms = bathroomOrder + bathroomCount
  rooms = rooms.map(r => {
    if (r.room_order >= 900) {
      const offset = r.room_order - 900
      return { ...r, room_order: afterBathrooms + offset }
    }
    return r
  })

  // ── 6. Merge all rooms in order ────────────────────────────────────────────
  // Split base rooms into before/after bedroom insertion point
  const beforeBedrooms = rooms.filter(r => r.room_order <= 4)
  const afterBedroomsRooms = rooms.filter(r => r.room_order > 4)

  const allRooms: BaseChecklistRoom[] = [
    ...beforeBedrooms,
    ...bedroomRooms,
    ...bathroomRooms,
    ...afterBedroomsRooms,
  ]

  // ── 7. Add extras to existing rooms ───────────────────────────────────────

  // Hallway: security alarm additions
  if (hasInclusion(answers.contractInclusions, 'security alarm')) {
    const hallway = allRooms.find(r => r.roomKey === 'hallway')
    if (hallway) {
      hallway.items.push(
        'Security alarm control panel present and powered on?',
        'Security alarm tested and working in all zones?',
        'All alarm sensors present on doors and windows specified?',
        'Alarm codes, manual and installer details provided by builder?',
      )
    }
  }

  // Kitchen: integrated appliances
  if (answers.integratedAppliances?.length > 0) {
    const kitchen = allRooms.find(r => r.roomKey === 'kitchen')
    if (kitchen) {
      for (const appliance of answers.integratedAppliances) {
        kitchen.items.push(
          `${appliance} - present, undamaged and tested working?`,
          `${appliance} - instruction manual and warranty card provided?`,
        )
      }
    }
  }

  // Heating and Electrics: EV charger
  if (hasInclusion(answers.contractInclusions, 'EV charging')) {
    const heatingRoom = allRooms.find(r => r.roomKey === 'heating_electrics')
    if (heatingRoom) {
      heatingRoom.items.push(
        'EV charging point - present, correctly installed, charging cable included?',
        'EV charger installer certificate provided by builder?',
      )
    }
  }

  // Underfloor heating manifold (in heating_electrics)
  if (hasInclusion(answers.contractInclusions, 'underfloor heating')) {
    const heatingRoom = allRooms.find(r => r.roomKey === 'heating_electrics')
    if (heatingRoom) {
      heatingRoom.items.push(
        'Underfloor heating manifold - all zones labelled and valves accessible?',
        'Underfloor heating commissioning manual provided?',
      )
    }
  }

  // Living room: underfloor heating check
  if (hasInclusion(answers.contractInclusions, 'underfloor heating')) {
    const lounge = allRooms.find(r => r.roomKey === 'living_room')
    if (lounge) {
      lounge.items.push('Floor - underfloor heating warming evenly, no cold spots?')
    }
    const kitchen = allRooms.find(r => r.roomKey === 'kitchen')
    if (kitchen) {
      kitchen.items.push('Kitchen floor - underfloor heating warming evenly, no cold spots?')
    }
  }

  // Timber frame wall checks in living room and kitchen
  if (answers.constructionType === 'Timber frame') {
    for (const key of ['living_room', 'kitchen', 'hallway']) {
      const room = allRooms.find(r => r.roomKey === key)
      if (room) {
        room.items.push(
          'No visible gaps, cracks or movement in internal wall plasterboard?',
          'No visible moisture or damp patches on internal walls or ceiling?',
        )
      }
    }
  }

  // ── 8. Add new sections ────────────────────────────────────────────────────
  const heatingOrder = allRooms.find(r => r.roomKey === 'heating_electrics')?.room_order ?? 999
  let extraOrder = heatingOrder - 50 // insert before heating_electrics

  // Solar panels
  if (hasInclusion(answers.contractInclusions, 'solar')) {
    allRooms.push({
      room: 'Solar Panels',
      roomKey: 'solar',
      room_order: extraOrder++,
      items: [
        'All solar panels present as per specification?',
        'Solar panels undamaged, no cracks or chips visible?',
        'Solar inverter present and working - display showing output?',
        'Solar installation certificate provided by builder?',
        'Feed-in tariff registration documents provided?',
      ],
    })
  }

  // Heat pump section
  if (hasInclusion(answers.contractInclusions, 'heat pump')) {
    allRooms.push({
      room: 'Heat Pump',
      roomKey: 'heat_pump',
      room_order: extraOrder++,
      items: [
        'Heat pump outdoor unit present and undamaged?',
        'Heat pump outdoor unit on stable plinth with correct clearance around it?',
        'Heat pump indoor unit correctly installed and commissioned?',
        'All pipework properly insulated where exposed?',
        'Heat pump commissioning certificate and manual provided by builder?',
        'Correct refrigerant type certificate provided?',
      ],
    })
  }

  // HRV/MVHR ventilation
  if (answers.hrvSystem === 'Yes') {
    allRooms.push({
      room: 'Ventilation System (HRV/MVHR)',
      roomKey: 'hrv',
      room_order: extraOrder++,
      items: [
        'HRV/MVHR unit accessible - usually in attic or utility room?',
        'All ceiling supply and extract vents present in correct rooms?',
        'All vents undamaged and not blocked?',
        'HRV/MVHR filters clean and not blocked?',
        'Commissioning report and airflow balancing certificate provided?',
        'Maintenance and operation manual provided?',
      ],
    })
  }

  // Smart home
  if (hasInclusion(answers.contractInclusions, 'smart home')) {
    allRooms.push({
      room: 'Smart Home System',
      roomKey: 'smart_home',
      room_order: extraOrder++,
      items: [
        'Smart home hub or controller present and powered on?',
        'All smart switches and controls working and connected?',
        'Smart home app configured and login details provided?',
        'All smart devices commissioned by installer?',
      ],
    })
  }

  // Shared areas (managed development)
  if (answers.isManaged && answers.sharedAreas?.length > 0) {
    const sharedItems: string[] = []
    if (answers.sharedAreas.includes('Lift or elevator')) {
      sharedItems.push(
        'Lift or elevator - operational and serviced?',
        'Lift inspection certificate present and in date?',
        'Emergency phone in lift - working?',
      )
    }
    if (answers.sharedAreas.some(a => a.toLowerCase().includes('corridor') || a.toLowerCase().includes('lobby'))) {
      sharedItems.push(
        'Shared entrance corridors - clean, finished, lighting working?',
        'Lobby intercom or entry system - working correctly?',
        'Fire escape signage and emergency lighting in shared areas - present and working?',
      )
    }
    if (answers.sharedAreas.some(a => a.toLowerCase().includes('car park') || a.toLowerCase().includes('basement'))) {
      sharedItems.push(
        'Basement or underground car park - lighting fully working?',
        'Car park access barrier or gate - working correctly?',
        'Designated parking space clearly marked?',
        'No water ingress, damp or staining in underground car park?',
      )
    }
    if (answers.sharedAreas.some(a => a.toLowerCase().includes('garden') || a.toLowerCase().includes('courtyard'))) {
      sharedItems.push(
        'Shared garden or courtyard - properly landscaped and finished?',
        'Shared outdoor lighting - working?',
      )
    }
    if (answers.sharedAreas.includes('Rooftop terrace')) {
      sharedItems.push(
        'Rooftop terrace - access door working, surface properly laid?',
        'Rooftop terrace balustrades - secure, correct height?',
        'Rooftop terrace drainage - working, no ponding water?',
      )
    }

    if (sharedItems.length > 0) {
      allRooms.push({
        room: 'Shared Areas',
        roomKey: 'shared_areas',
        room_order: extraOrder++,
        items: sharedItems,
      })
    }
  }

  // ── 9. Add custom items from Q17 free text ─────────────────────────────────
  if (answers.contractOther?.trim()) {
    const kitchen = allRooms.find(r => r.roomKey === 'kitchen')
    if (kitchen) {
      kitchen.items.push(`Custom contract item to check: "${answers.contractOther.trim()}"`)
    }
  }

  // ── 10. Sort rooms by room_order ──────────────────────────────────────────
  allRooms.sort((a, b) => a.room_order - b.room_order)

  // ── 11. Build Supabase rows ────────────────────────────────────────────────
  const rows: SupabaseChecklistItem[] = []

  for (const room of allRooms) {
    room.items.forEach((description, index) => {
      rows.push({
        inspection_id: inspectionId,
        room: room.room,
        room_order: room.room_order,
        item_description: description,
        item_order: index + 1,
        is_custom: false,
      })
    })
  }

  // ── 12. Save to Supabase in batches of 100 ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseBrowserClient() as any

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('checklist_items').insert(batch)
    if (error) {
      console.error('Checklist insert error:', error)
      throw new Error(`Failed to save checklist: ${error.message}`)
    }
  }

  // ── 13. Update inspection with total item count ────────────────────────────
  await supabase
    .from('inspections')
    .update({ total_items: rows.length })
    .eq('id', inspectionId)
}

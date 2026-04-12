/**
 * SnapSnag Social Media Scheduler — Buffer API v1
 *
 * Schedules 4 weeks of Facebook posts and Pinterest pins every Monday at 8am.
 * Called by /api/schedule-social (Vercel cron).
 *
 * Required env vars:
 *   BUFFER_API_KEY              — Buffer access token
 *   BUFFER_FACEBOOK_PROFILE_ID  — Buffer profile ID for the Facebook Business Page
 *   BUFFER_PINTEREST_PROFILE_ID — Buffer profile ID for the Pinterest Business Account
 */

const BUFFER_API = 'https://api.bufferapp.com/1'

// ─── Country rotation (by week index mod 5) ────────────────────────────────
const COUNTRIES = ['IE', 'UK', 'AU', 'US', 'CA'] as const
type Country = typeof COUNTRIES[number]

// ─── Country config ────────────────────────────────────────────────────────
const countryConfig: Record<Country, { currency: string; price: string; domain: string; warranty: string }> = {
  IE: { currency: 'EUR', price: '€19.95', domain: 'snapsnag.ie', warranty: 'HomeBond' },
  UK: { currency: 'GBP', price: '£23.95', domain: 'snapsnag.co.uk', warranty: 'NHBC Buildmark' },
  AU: { currency: 'AUD', price: 'AUD $34.95', domain: 'snapsnag.com.au', warranty: 'HBC' },
  US: { currency: 'USD', price: '$24.95', domain: 'snapsnag.com', warranty: "builder's warranty" },
  CA: { currency: 'CAD', price: 'CAD $29.95', domain: 'snapsnag.ca', warranty: 'Tarion (Ontario)' },
}

// ─── Facebook content ────────────────────────────────────────────────────────

const mondayPosts: Record<Country, string[]> = {
  IE: [
    `🏠 Buying a new build in Ireland? Check these 5 things before you sign off:\n\n1️⃣ Test every socket and light switch\n2️⃣ Check all doors and windows open, close and lock properly\n3️⃣ Look for cracks in plasterwork — even hairlines matter\n4️⃣ Run every tap and check water pressure\n5️⃣ Inspect tiling grout for gaps and misalignment\n\nSnapSnag guides you through 86 checks for just ${countryConfig.IE.price} 👉 ${countryConfig.IE.domain}`,
    `🔍 Moving into your new build in Ireland? Don't skip the snag list.\n\nBuilders are legally obligated to fix defects reported within the HomeBond warranty period. Most buyers don't know what to look for — and miss thousands in free repairs.\n\nHere are 5 checks most people forget:\n1️⃣ Check the attic insulation is fully laid\n2️⃣ Test the boiler pressure and hot water temperature\n3️⃣ Look for damp patches under windowsills after rain\n4️⃣ Check every radiator heats evenly\n5️⃣ Verify the garden drainage slopes away from the house\n\nSnapSnag walks you through it all — ${countryConfig.IE.price} 👉 ${countryConfig.IE.domain}`,
  ],
  UK: [
    `🏠 Buying a new build in the UK? 5 things to check before you complete:\n\n1️⃣ Check all NHBC Buildmark documentation is in order\n2️⃣ Test every electrical socket with a plug tester\n3️⃣ Check external brickwork for cracks and repointing gaps\n4️⃣ Run all taps simultaneously and check for pressure drops\n5️⃣ Inspect loft insulation coverage — many new builds fall short\n\nSnapSnag guides you through a full room-by-room checklist for just ${countryConfig.UK.price} 👉 ${countryConfig.UK.domain}`,
    `🔍 First-time buyer in the UK? Your NHBC warranty doesn't cover poor workmanship unless you report it.\n\n5 things UK new build buyers miss:\n1️⃣ Gaps around skirting boards and architraves\n2️⃣ Uneven floor tiles in kitchen and bathroom\n3️⃣ Poorly fitted kitchen unit doors and drawers\n4️⃣ Condensation in double-glazed units\n5️⃣ Missing or misaligned roof tiles (check from street level)\n\nDocument everything with SnapSnag — ${countryConfig.UK.price} 👉 ${countryConfig.UK.domain}`,
  ],
  AU: [
    `🏠 Taking handover of a new build in Australia? Check these 5 things first:\n\n1️⃣ Check HBC Home Warranty Insurance documentation is provided\n2️⃣ Test all weatherproofing — check for gaps around windows and doors\n3️⃣ Inspect roof tiles or cladding for chips and alignment\n4️⃣ Run every tap and shower — check pressure and drainage speed\n5️⃣ Test all smoke alarms — legally required in every bedroom\n\nSnapSnag guides you through 86 checks at handover for just ${countryConfig.AU.price} 👉 ${countryConfig.AU.domain}`,
    `🔍 Buying a new home in Australia? The builder must fix defects — but only if you document them.\n\n5 checks Australian buyers miss at handover:\n1️⃣ Check eaves and fascias for paint runs and gaps\n2️⃣ Inspect the garage door auto-reverse safety function\n3️⃣ Test all ceiling fans and exhaust fans\n4️⃣ Check external taps and irrigation connections\n5️⃣ Verify insulation batts in walls (request builder evidence)\n\nSnapSnag makes it easy — ${countryConfig.AU.price} 👉 ${countryConfig.AU.domain}`,
  ],
  US: [
    `🏠 Taking possession of a new construction home in the US? 5 things to check before closing:\n\n1️⃣ Get a copy of the builder warranty — know what's covered and for how long\n2️⃣ Test all GFCI outlets in kitchens, bathrooms and garage\n3️⃣ Check grading — ground should slope away from foundation\n4️⃣ Test every window and door for smooth operation and weatherstripping\n5️⃣ Inspect caulking around tubs, showers and countertops\n\nSnapSnag walks you through a professional inspection for just ${countryConfig.US.price} 👉 ${countryConfig.US.domain}`,
    `🔍 New construction in the US? Builder warranties only cover what you report.\n\n5 things US new build buyers miss:\n1️⃣ Check attic ventilation — improper venting causes moisture and mold\n2️⃣ Test the HVAC system in both heat and cool modes\n3️⃣ Check for nail pops in drywall (common in first year)\n4️⃣ Inspect the driveway and walkway for cracks\n5️⃣ Test every light switch — sometimes wired to wrong fixture\n\nSnapSnag helps you document everything — ${countryConfig.US.price} 👉 ${countryConfig.US.domain}`,
  ],
  CA: [
    `🏠 Taking possession of a new build in Canada? 5 things to check before moving in:\n\n1️⃣ In Ontario, register your Tarion warranty before the PDI date\n2️⃣ Test all GFCI breakers and arc-fault circuit interrupters\n3️⃣ Check exterior caulking on all penetrations — critical for Canadian winters\n4️⃣ Test HRV/ERV heat recovery ventilator operation\n5️⃣ Inspect basement slab for cracks and efflorescence\n\nSnapSnag guides you through 86 checks for just ${countryConfig.CA.price} 👉 ${countryConfig.CA.domain}`,
    `🔍 New build buyer in Canada? Your Tarion warranty covers defects — but you need to document them at PDI.\n\n5 things Canadian buyers miss at possession:\n1️⃣ Check window and door weatherstripping is correctly seated\n2️⃣ Test the sump pump if present — pour water to verify\n3️⃣ Inspect all exterior grading and drainage\n4️⃣ Check insulation in attached garage ceiling (fire separation)\n5️⃣ Test every smoke and CO detector\n\nSnapSnag makes your PDI inspection easy — ${countryConfig.CA.price} 👉 ${countryConfig.CA.domain}`,
  ],
}

const wednesdayPosts = [
  `📊 94% of new build homebuyers in Ireland report defects to their builder after moving in.\n\nMost could have been fixed for free before completion — if they'd been documented.\n\nSnapSnag helps you find them, photograph them, and present a professional report to your builder. Just ${countryConfig.IE.price}. 👉 ${countryConfig.IE.domain}`,
  `📊 The average new build home in the UK has 157 snags.\n\nThe average professional snagging survey costs £450.\nSnapSnag costs ${countryConfig.UK.price}.\n\nSame room-by-room checklist. Professional PDF report. Shareable with your builder instantly. 👉 ${countryConfig.UK.domain}`,
  `📊 New build defect repair costs average €3,000 in Ireland if you miss the warranty window.\n\nA SnapSnag inspection costs ${countryConfig.IE.price}. Do the maths.\n\nDocument everything before you sign off. 👉 ${countryConfig.IE.domain}`,
  `📊 In Australia, 1 in 3 new homeowners discover major defects within the first 12 months.\n\nUnder the HBC Home Warranty, builders must fix structural and non-structural defects — but only if you've documented them.\n\nSnapSnag costs ${countryConfig.AU.price} and generates an instant professional report. 👉 ${countryConfig.AU.domain}`,
  `📊 In the US, new construction homes generate an average of 17 warranty service calls in the first year.\n\nMost buyers don't know what to look for at closing. SnapSnag walks you through 86 checks — room by room — for just ${countryConfig.US.price}. 👉 ${countryConfig.US.domain}`,
  `📊 Under Tarion in Ontario, you have a 30-day PDI list, a 1-year warranty, a 2-year warranty, and a 7-year structural warranty.\n\nBut you only get the full benefit if you document defects at each stage.\n\nSnapSnag makes that easy — ${countryConfig.CA.price}. 👉 ${countryConfig.CA.domain}`,
  `📊 Professional snagging surveys in Ireland cost €190–€500.\n\nSnapSnag costs ${countryConfig.IE.price} and you do it yourself — guided by the same room-by-room checklist professionals use.\n\nSame result. A fraction of the price. 👉 ${countryConfig.IE.domain}`,
]

const fridayPosts: Record<Country, string> = {
  IE: `🏠 Moving into your new build this weekend? Before you sign off, check these:\n\n✅ Test every socket, switch and light fitting\n✅ Run all taps — check hot water reaches each one\n✅ Open and lock every window and exterior door\n✅ Check all kitchen unit doors, drawers and hinges\n✅ Look for paint misses on ceilings and walls in natural light\n\nSnapSnag walks you through 86 checks room by room — ${countryConfig.IE.price} 👉 ${countryConfig.IE.domain}`,
  UK: `🏠 Getting the keys to your new build this weekend? Don't forget:\n\n✅ Check NHBC documents are all present and signed\n✅ Test every double-glazed unit for condensation\n✅ Flush all toilets and check cisterns refill fully\n✅ Test the smoke alarm in every room\n✅ Check all tiling — look for lippage and grout gaps\n\nSnapSnag guides you through it all — ${countryConfig.UK.price} 👉 ${countryConfig.UK.domain}`,
  AU: `🏠 New home handover this weekend in Australia? Run through these:\n\n✅ Check all HBC paperwork has been provided by builder\n✅ Test every power point with a tester\n✅ Run all taps and check hot water system temperature\n✅ Inspect roof tiles visible from ground level\n✅ Check all fly screens are fitted and undamaged\n\nSnapSnag walks you through 86 checks — ${countryConfig.AU.price} 👉 ${countryConfig.AU.domain}`,
  US: `🏠 New construction closing this weekend? Walk through these before you sign:\n\n✅ Test all GFCI outlets in kitchen, bathrooms and garage\n✅ Check all interior doors close and latch without force\n✅ Run the dishwasher and disposal — check for leaks under cabinet\n✅ Test the garage door sensors and auto-reverse\n✅ Look for drywall cracks around window and door corners\n\nSnapSnag guides you through a professional inspection — ${countryConfig.US.price} 👉 ${countryConfig.US.domain}`,
  CA: `🏠 New home PDI this weekend in Canada? Check these before your builder walkthrough:\n\n✅ Bring your Tarion PDI checklist — or use SnapSnag\n✅ Test the HRV/ERV ventilation system\n✅ Check all exterior caulking around windows and penetrations\n✅ Test every bathroom exhaust fan\n✅ Inspect basement floor for cracks or wet spots\n\nSnapSnag generates a professional report for your Tarion records — ${countryConfig.CA.price} 👉 ${countryConfig.CA.domain}`,
}

const sundayPosts: Record<Country, string[]> = {
  IE: [
    `💬 New build buyers of Ireland — what was the most frustrating snag you found after moving in?\n\nDrop it in the comments 👇`,
    `💬 Did you do a snag list before moving into your new build in Ireland?\n\nHow many defects did you find? We'd love to hear your experience 👇`,
    `💬 Irish new build buyers — did your builder fix everything on your snag list?\n\nShare your experience below 👇`,
  ],
  UK: [
    `💬 UK new build buyers — did you do a snagging survey before moving in?\n\nWould you recommend it? Tell us your experience 👇`,
    `💬 What's the most common defect you've seen in UK new builds?\n\nShare below — this helps other buyers know what to look for 👇`,
    `💬 UK first-time buyers — what do you wish you'd checked before taking the keys?\n\nDrop your tips in the comments 👇`,
  ],
  AU: [
    `💬 Buying a new home in Australia — what's the one thing you wish you had checked before handover?\n\nShare below 👇`,
    `💬 Australian new build buyers — how was your handover experience?\n\nDid your builder fix everything before settlement? 👇`,
    `💬 Aussie new home owners — was your HBC warranty ever needed?\n\nTell us what happened 👇`,
  ],
  US: [
    `💬 US new construction buyers — what defects did you find after closing?\n\nShare below to help other buyers know what to look for 👇`,
    `💬 Did you hire a third-party inspector for your new construction home?\n\nWas it worth it? Tell us your experience 👇`,
    `💬 What surprised you most about your new construction home after you moved in?\n\nDrop it in the comments 👇`,
  ],
  CA: [
    `💬 Canadian new build buyers — how was your PDI experience?\n\nDid your builder fix everything on the list? Share below 👇`,
    `💬 Ontario new home buyers — have you ever used your Tarion warranty?\n\nTell us what the process was like 👇`,
    `💬 What's the most important thing you'd tell a first-time new build buyer in Canada?\n\nDrop your advice below 👇`,
  ],
}

// ─── Pinterest pin content ────────────────────────────────────────────────────

const pinterestPins = [
  {
    title: 'Kitchen Checks for New Builds',
    text: `Moving into a new build? The kitchen is where most defects hide. Check cabinet alignment, drawer runners, plumbing under the sink, extractor fan operation, and all appliance connections. SnapSnag's kitchen checklist covers 14 specific items — snapsnag.ie`,
    url: 'https://snapsnag.ie/blog/snag-list-ireland-complete-guide',
  },
  {
    title: 'Bathroom Tiling — What to Look For in a New Build',
    text: `New build bathroom tiles should be perfectly aligned with no lippage, consistent grout width, and properly sealed edges. Look for hollow tiles (tap gently), misaligned patterns, and silicon joints at floor/wall junctions. SnapSnag checks every detail — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'Checking Your Roof from the Ground — New Build Checklist',
    text: `You don't need to get up there. From the ground, check: ridge tiles are straight, no missing or slipped slates, flashing around chimneys and valleys is properly sealed, and gutters are aligned. SnapSnag guides you through every exterior check — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'Understanding Your HomeBond Warranty — Ireland',
    text: `HomeBond covers structural defects for 10 years, non-structural defects in year 1 and 2, and water ingress for the first 5 years. To claim, defects must be reported in writing during the relevant period. Document everything with SnapSnag — snapsnag.ie`,
    url: 'https://snapsnag.ie/blog/homebond-warranty-ireland-explained',
  },
  {
    title: 'What Is NHBC Buildmark? — UK New Build Warranty Explained',
    text: `NHBC Buildmark protects UK new build buyers for 10 years. Years 1–2: builder fixes defects. Years 3–10: NHBC covers structural issues. But you must report defects within the right window. Use SnapSnag to document everything — snapsnag.co.uk`,
    url: 'https://snapsnag.co.uk/blog/nhbc-buildmark-warranty-explained',
  },
  {
    title: 'HBC Home Warranty Explained — Australian New Home Buyers',
    text: `Australia's Home Building Compensation (HBC) scheme protects buyers for up to 6 years against structural defects and 2 years for non-structural defects. Claims require documented evidence. SnapSnag generates your professional report — snapsnag.com.au`,
    url: 'https://snapsnag.com.au/blog/hbc-warranty-australia-explained',
  },
  {
    title: 'Checking Electrics and Sockets in a New Build Home',
    text: `Every socket in your new build should be tested. Use a socket tester (under €10) to verify correct wiring polarity. Check all light switches operate the right fitting. Test MCBs and RCDs in the consumer unit. SnapSnag's electrical checklist covers 8 specific tests — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'Garden and Outdoor Area Checks — New Build Snag List',
    text: `Builders often rush outdoor areas. Check: fence posts are vertical and secure, paving slabs are level with no trip hazards, external taps are connected and drain properly, drainage channels are clear, and boundary walls are plumb. SnapSnag covers the full exterior — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'How to Photograph Defects Properly in a New Build',
    text: `Good defect photos make the difference between a builder accepting and rejecting a claim. Use natural light or a torch for shadows, include a coin or ruler for scale, take a wide shot and a close-up, and note the room and location. SnapSnag's app does this automatically — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'New Build Snagging — The Complete Guide',
    text: `Snagging is the process of identifying defects in a new build before or shortly after handover. A professional snag list covers every room, every fitting, every surface. SnapSnag guides you through 86 checks with photo documentation and instant PDF report — snapsnag.ie`,
    url: 'https://snapsnag.ie/blog/snag-list-ireland-complete-guide',
  },
  {
    title: 'Bedroom Checklist for New Build Homes',
    text: `New build bedroom checks: wardrobe doors hang level and close fully, door swings clear of all furniture positions, radiator heats fully and has a working TRV, socket placement meets your needs, and loft hatch (if present) insulates properly. SnapSnag covers every room — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'Heating and Boiler Checks — New Build Handover',
    text: `Test your new build heating before you sign off: boiler pressure should be 1–1.5 bar cold, every radiator should heat fully (bleed if needed), thermostat zones respond correctly, and hot water reaches every tap within 30 seconds. SnapSnag guides you through it — snapsnag.ie`,
    url: 'https://snapsnag.ie',
  },
  {
    title: 'First-Time Buyer Snagging Tips — Ireland',
    text: `First-time buyers in Ireland: you have the right to a pre-completion inspection. Bring a torch, a phone for photos, a socket tester, and ideally a friend. Or use SnapSnag — it guides you through 86 checks and generates a PDF report your builder can't ignore. snapsnag.ie`,
    url: 'https://snapsnag.ie/blog/how-to-do-your-own-snag-list-ireland',
  },
  {
    title: 'UK New Build Defects — Most Common List',
    text: `The most common UK new build defects: plasterwork cracks, missing or uneven grout, poorly fitted kitchen doors, UPVC windows that stick, snagged carpets, draughts from external doors, and uneven tiling. SnapSnag checks for all of these — snapsnag.co.uk`,
    url: 'https://snapsnag.co.uk/blog/new-build-defects-uk-common-problems',
  },
  {
    title: 'Australian New Home Inspection Guide — What to Check',
    text: `At handover in Australia, you're entitled to inspect the property before settlement. Check every room, every fitting, every surface. You have limited time to raise defects with your builder after settlement. SnapSnag generates your official inspection report — snapsnag.com.au`,
    url: 'https://snapsnag.com.au/blog/new-build-inspection-australia',
  },
]

// ─── Buffer API helpers ───────────────────────────────────────────────────────

async function bufferPost(params: {
  text: string
  profileIds: string[]
  scheduledAt: Date
}): Promise<{ id: string } | null> {
  const token = process.env.BUFFER_API_KEY
  if (!token) {
    console.warn('[buffer] BUFFER_API_KEY not set — skipping post')
    return null
  }

  const body = new URLSearchParams()
  body.append('text', params.text)
  params.profileIds.forEach(id => body.append('profile_ids[]', id))
  body.append('scheduled_at', params.scheduledAt.toISOString())

  const res = await fetch(`${BUFFER_API}/updates/create.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[buffer] Failed to schedule post:', err)
    return null
  }

  const data = await res.json()
  return data.updates?.[0] ?? null
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function nextWeekday(from: Date, dayOfWeek: number, hour: number, minute = 0): Date {
  const d = new Date(from)
  d.setUTCHours(hour, minute, 0, 0)
  const diff = (dayOfWeek - d.getUTCDay() + 7) % 7
  d.setUTCDate(d.getUTCDate() + (diff === 0 ? 0 : diff))
  return d
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

// ─── Schedule 4 weeks ────────────────────────────────────────────────────────

export async function scheduleWeek(): Promise<{ facebook: number; pinterest: number }> {
  const fbProfileId = process.env.BUFFER_FACEBOOK_PROFILE_ID
  const pinProfileId = process.env.BUFFER_PINTEREST_PROFILE_ID

  if (!fbProfileId || !pinProfileId) {
    throw new Error('BUFFER_FACEBOOK_PROFILE_ID or BUFFER_PINTEREST_PROFILE_ID not set')
  }

  let fbScheduled = 0
  let pinScheduled = 0

  // Base week = the Monday we're running from
  const now = new Date()
  const baseMonday = nextWeekday(now, 1, 8) // 8am UTC
  if (baseMonday < now) {
    baseMonday.setUTCDate(baseMonday.getUTCDate() + 7)
  }

  // Global counters for content rotation
  // Use ISO week number mod content length to keep rotation consistent
  const isoWeek = Math.ceil(
    (now.getTime() - new Date(now.getUTCFullYear(), 0, 1).getTime()) / (7 * 24 * 3600 * 1000)
  )

  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(baseMonday)
    weekStart.setUTCDate(weekStart.getUTCDate() + week * 7)

    const countryIndex = (isoWeek + week) % COUNTRIES.length
    const country = COUNTRIES[countryIndex]
    const wednesdayIndex = (isoWeek + week) % wednesdayPosts.length
    const mondayIndex = (isoWeek + week) % (mondayPosts[country]?.length ?? 1)
    const sundayIndex = (isoWeek + week) % (sundayPosts[country]?.length ?? 1)

    // ── Monday 8am: Educational tip ───────────────────────────────────────────
    const monday = new Date(weekStart)
    monday.setUTCHours(8, 0, 0, 0)
    const mondayText = mondayPosts[country][mondayIndex]
    const monResult = await bufferPost({ text: mondayText, profileIds: [fbProfileId], scheduledAt: monday })
    if (monResult) fbScheduled++

    // ── Wednesday 8am: Defect statistic ──────────────────────────────────────
    const wednesday = addDays(weekStart, 2)
    wednesday.setUTCHours(8, 0, 0, 0)
    const wedResult = await bufferPost({
      text: wednesdayPosts[wednesdayIndex],
      profileIds: [fbProfileId],
      scheduledAt: wednesday,
    })
    if (wedResult) fbScheduled++

    // ── Friday 8am: Weekend checklist tip ─────────────────────────────────────
    const friday = addDays(weekStart, 4)
    friday.setUTCHours(8, 0, 0, 0)
    const friResult = await bufferPost({
      text: fridayPosts[country],
      profileIds: [fbProfileId],
      scheduledAt: friday,
    })
    if (friResult) fbScheduled++

    // ── Sunday 7pm: Community engagement ─────────────────────────────────────
    const sunday = addDays(weekStart, 6)
    sunday.setUTCHours(19, 0, 0, 0)
    const sunResult = await bufferPost({
      text: sundayPosts[country][sundayIndex],
      profileIds: [fbProfileId],
      scheduledAt: sunday,
    })
    if (sunResult) fbScheduled++

    // ── Pinterest: daily 9am (7 pins per week) ───────────────────────────────
    for (let day = 0; day < 7; day++) {
      const pinDate = addDays(weekStart, day)
      pinDate.setUTCHours(9, 0, 0, 0)

      const pinIndex = ((isoWeek + week) * 7 + day) % pinterestPins.length
      const pin = pinterestPins[pinIndex]

      const pinText = `📌 ${pin.title}\n\n${pin.text}\n\n🔗 ${pin.url}`

      const pinResult = await bufferPost({
        text: pinText,
        profileIds: [pinProfileId],
        scheduledAt: pinDate,
      })
      if (pinResult) pinScheduled++
    }
  }

  return { facebook: fbScheduled, pinterest: pinScheduled }
}

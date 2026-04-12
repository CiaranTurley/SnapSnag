import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExcelChecklistItem {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  status: 'pass' | 'fail' | 'na' | null
  severity: string | null
  note: string | null
}

export interface ExcelInspection {
  id: string
  address: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  country: string
  verification_code: string | null
  created_at: string
  completed_at: string | null
  duration_seconds: number | null
  builder_name: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} minutes`
}

function statusLabel(status: 'pass' | 'fail' | 'na' | null): string {
  if (status === 'pass') return '✓ PASS'
  if (status === 'fail') return '✗ FAIL'
  if (status === 'na') return 'N/A'
  return 'Not answered'
}

function severityLabel(severity: string | null): string {
  if (severity === 'critical') return 'Critical'
  if (severity === 'major') return 'Major'
  if (severity === 'minor') return 'Minor'
  return ''
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateExcelReport(
  inspection: ExcelInspection,
  items: ExcelChecklistItem[],
  warrantyName: string,
): Buffer {
  const workbook = XLSX.utils.book_new()

  const answered = items.filter(i => i.status !== null)
  const passed = items.filter(i => i.status === 'pass')
  const failed = items.filter(i => i.status === 'fail')
  const na = items.filter(i => i.status === 'na')
  const passRate =
    answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0

  // ── Sheet 1: Summary ────────────────────────────────────────────────────────

  const summaryRows: (string | number)[][] = [
    ['SnapSnag — New Build Inspection Report'],
    [],
    ['Address', inspection.address ?? '—'],
    ['Inspection Date', formatDate(inspection.completed_at ?? inspection.created_at)],
    ['Builder / Developer', inspection.builder_name ?? '—'],
    ['Property Type', inspection.property_type ?? '—'],
    ['Bedrooms', inspection.bedrooms ?? '—'],
    ['Bathrooms', inspection.bathrooms ?? '—'],
    ['Duration', formatDuration(inspection.duration_seconds)],
    ['Country', inspection.country],
    ['Verification Code', inspection.verification_code ?? '—'],
    [],
    ['RESULTS', ''],
    ['Overall Pass Rate', `${passRate}%`],
    ['Total Items Checked', answered.length],
    ['Items Passed', passed.length],
    ['Items Failed', failed.length],
    ['Items N/A', na.length],
    [],
    ['WARRANTY', ''],
    ['Warranty Provider', warrantyName],
    ['Verify this report at', 'snapsnag.ie/verify'],
    [],
    [
      'DISCLAIMER: This report was produced using the SnapSnag self-inspection tool and is based solely on visual observations by the homebuyer. It does not constitute a professional survey or legal document.',
    ],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)

  // Column widths
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 50 }]

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // ── Sheet 2: Full Checklist ─────────────────────────────────────────────────

  const checklistHeader = [
    'Room',
    'Item',
    'Status',
    'Severity',
    'Inspector Note',
  ]

  const checklistData = items
    .sort((a, b) => a.room_order - b.room_order || a.item_order - b.item_order)
    .map(item => [
      item.room,
      item.item_description,
      statusLabel(item.status),
      item.status === 'fail' ? severityLabel(item.severity) : '',
      item.note ?? '',
    ])

  const checklistSheet = XLSX.utils.aoa_to_sheet([checklistHeader, ...checklistData])

  checklistSheet['!cols'] = [
    { wch: 24 },
    { wch: 60 },
    { wch: 14 },
    { wch: 12 },
    { wch: 40 },
  ]

  // Freeze header row
  checklistSheet['!freeze'] = { xSplit: 0, ySplit: 1 }

  XLSX.utils.book_append_sheet(workbook, checklistSheet, 'Full Checklist')

  // ── Sheet 3: Failed Items (Snagging List) ───────────────────────────────────

  const snagHeader = [
    'Room',
    'Defect Description',
    'Severity',
    'Inspector Note',
    'Status',
    'Date Raised',
    'Builder Response',
    'Date Resolved',
  ]

  const snagData = failed
    .sort((a, b) => {
      // Sort by severity: critical > major > minor
      const sevOrder: Record<string, number> = { critical: 0, major: 1, minor: 2 }
      const aS = sevOrder[a.severity ?? 'minor'] ?? 2
      const bS = sevOrder[b.severity ?? 'minor'] ?? 2
      if (aS !== bS) return aS - bS
      return a.room_order - b.room_order
    })
    .map(item => [
      item.room,
      item.item_description,
      severityLabel(item.severity),
      item.note ?? '',
      'Open',       // Status — for builder to fill in
      formatDate(inspection.completed_at ?? inspection.created_at),
      '',           // Builder Response — blank for builder to fill in
      '',           // Date Resolved — blank for builder to fill in
    ])

  const snagSheet = XLSX.utils.aoa_to_sheet([snagHeader, ...snagData])

  snagSheet['!cols'] = [
    { wch: 22 },
    { wch: 55 },
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 16 },
    { wch: 35 },
    { wch: 16 },
  ]

  snagSheet['!freeze'] = { xSplit: 0, ySplit: 1 }

  XLSX.utils.book_append_sheet(workbook, snagSheet, 'Snagging List (Failed)')

  // ── Sheet 4: Room Summary ───────────────────────────────────────────────────

  const roomMap = new Map<string, { pass: number; fail: number; na: number; order: number }>()
  for (const item of items) {
    if (!roomMap.has(item.room)) roomMap.set(item.room, { pass: 0, fail: 0, na: 0, order: item.room_order })
    const entry = roomMap.get(item.room)!
    if (item.status === 'pass') entry.pass++
    else if (item.status === 'fail') entry.fail++
    else if (item.status === 'na') entry.na++
  }

  const roomSummaryHeader = ['Room', 'Pass', 'Fail', 'N/A', 'Total Answered', 'Pass Rate', 'Status']
  const roomSummaryData = Array.from(roomMap.entries())
    .sort((a, b) => a[1].order - b[1].order)
    .map(([room, counts]) => {
      const total = counts.pass + counts.fail + counts.na
      const rate = total > 0 ? `${Math.round((counts.pass / total) * 100)}%` : '—'
      return [
        room,
        counts.pass,
        counts.fail,
        counts.na,
        total,
        rate,
        counts.fail > 0 ? 'Action Needed' : 'Clear',
      ]
    })

  const roomSheet = XLSX.utils.aoa_to_sheet([roomSummaryHeader, ...roomSummaryData])
  roomSheet['!cols'] = [
    { wch: 28 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
  ]

  XLSX.utils.book_append_sheet(workbook, roomSheet, 'Room Summary')

  // ── Write to buffer ─────────────────────────────────────────────────────────

  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return buf
}

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  PageBreak,
} from 'docx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WordChecklistItem {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  status: 'pass' | 'fail' | 'na' | null
  severity: string | null
  note: string | null
}

export interface WordInspection {
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

function severityLabel(severity: string | null): string {
  if (severity === 'critical') return 'CRITICAL'
  if (severity === 'major') return 'MAJOR'
  return 'MINOR'
}

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  }
}

function thinBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
  }
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateWordReport(
  inspection: WordInspection,
  items: WordChecklistItem[],
  warrantyName: string,
): Promise<Buffer> {
  const address = inspection.address ?? 'Address not provided'
  const inspDate = formatDate(inspection.completed_at ?? inspection.created_at)

  const answered = items.filter(i => i.status !== null)
  const passed = items.filter(i => i.status === 'pass')
  const failed = items.filter(i => i.status === 'fail')
  const na = items.filter(i => i.status === 'na')
  const passRate =
    answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0

  // Group by room
  const roomMap = new Map<string, WordChecklistItem[]>()
  for (const item of items) {
    if (!roomMap.has(item.room)) roomMap.set(item.room, [])
    roomMap.get(item.room)!.push(item)
  }
  const rooms = Array.from(roomMap.entries()).sort(
    (a, b) => (a[1][0]?.room_order ?? 0) - (b[1][0]?.room_order ?? 0),
  )

  const children: (Paragraph | Table)[] = []

  // ── Cover / Header ──────────────────────────────────────────────────────────

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'SnapSnag', bold: true, size: 36, color: '00C9A7' }),
        new TextRun({ text: ' — New Build Inspection Report', bold: true, size: 36, color: '0D0F1A' }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: address, size: 28, color: '374151' })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Date: ${inspDate}`, size: 22, color: '6B7280' })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Builder: ${inspection.builder_name ?? '—'}  |  Property: ${inspection.property_type ?? '—'}  |  Bedrooms: ${inspection.bedrooms ?? '—'}  |  Duration: ${formatDuration(inspection.duration_seconds)}`,
          size: 20,
          color: '6B7280',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Verification Code: ${inspection.verification_code ?? '—'}`,
          bold: true,
          size: 22,
          color: '00C9A7',
        }),
      ],
      spacing: { after: 400 },
    }),
  )

  // ── Executive Summary ───────────────────────────────────────────────────────

  children.push(
    new Paragraph({
      text: 'Executive Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 160 },
    }),
  )

  // Summary stats table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${passRate}%`, bold: true, size: 48, color: '00C9A7' })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Overall Pass Rate', size: 18, color: '6B7280' })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
              borders: thinBorder(),
              margins: { top: 150, bottom: 150, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${passed.length}`, bold: true, size: 48, color: '22C55E' })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Passed', size: 18, color: '6B7280' })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
              borders: thinBorder(),
              margins: { top: 150, bottom: 150, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${failed.length}`,
                      bold: true,
                      size: 48,
                      color: failed.length > 0 ? 'EF4444' : '374151',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Failed', size: 18, color: '6B7280' })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
              borders: thinBorder(),
              margins: { top: 150, bottom: 150, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${na.length}`, bold: true, size: 48, color: '374151' })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'N/A', size: 18, color: '6B7280' })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
              borders: thinBorder(),
              margins: { top: 150, bottom: 150, left: 100, right: 100 },
            }),
          ],
        }),
      ],
    }),
  )

  children.push(new Paragraph({ text: '', spacing: { after: 300 } }))

  // Room summary table
  children.push(
    new Paragraph({
      text: 'Room-by-Room Summary',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 160 },
    }),
  )

  const roomSummaryRows = [
    new TableRow({
      children: ['Room', 'Pass', 'Fail', 'N/A', 'Status'].map(
        h =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 18, color: '374151' })],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: 'F3F4F6' },
            borders: thinBorder(),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
      ),
      tableHeader: true,
    }),
    ...rooms.map(([room, roomItems]) => {
      const rPass = roomItems.filter(i => i.status === 'pass').length
      const rFail = roomItems.filter(i => i.status === 'fail').length
      const rNa = roomItems.filter(i => i.status === 'na').length
      const hasFails = rFail > 0
      return new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: room, size: 18 })] })],
            borders: thinBorder(),
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(rPass), size: 18, color: '22C55E', bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: thinBorder(),
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(rFail),
                    size: 18,
                    color: hasFails ? 'EF4444' : '6B7280',
                    bold: hasFails,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: thinBorder(),
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(rNa), size: 18, color: '6B7280' })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: thinBorder(),
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: hasFails ? 'ACTION NEEDED' : 'CLEAR',
                    size: 16,
                    bold: true,
                    color: hasFails ? 'EF4444' : '22C55E',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: thinBorder(),
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
          }),
        ],
      })
    }),
  ]

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: roomSummaryRows,
    }),
  )

  children.push(new Paragraph({ text: '', spacing: { after: 400 } }))

  // ── Room-by-Room Detail ─────────────────────────────────────────────────────

  for (const [room, roomItems] of rooms) {
    const roomFailed = roomItems.filter(i => i.status === 'fail')
    const roomPassed = roomItems.filter(i => i.status === 'pass')
    const roomNa = roomItems.filter(i => i.status === 'na')

    // Page break before each room (except first room after summary)
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    )

    children.push(
      new Paragraph({
        text: room,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${roomFailed.length} failed  ·  ${roomPassed.length} passed  ·  ${roomNa.length} not applicable`,
            size: 18,
            color: '6B7280',
          }),
        ],
        spacing: { after: 240 },
      }),
    )

    // Failed items
    if (roomFailed.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Failed Items', bold: true, size: 22, color: 'EF4444' })],
          spacing: { before: 120, after: 100 },
        }),
      )

      for (const item of roomFailed) {
        const sev = severityLabel(item.severity)
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: `[${sev}]  `, bold: true, size: 18, color: item.severity === 'critical' ? 'B91C1C' : item.severity === 'major' ? 'B45309' : '1E40AF' }),
                          new TextRun({ text: item.item_description, bold: true, size: 18, color: '111827' }),
                        ],
                      }),
                      ...(item.note
                        ? [
                            new Paragraph({
                              children: [
                                new TextRun({ text: 'Note: ', bold: true, size: 17, color: '374151' }),
                                new TextRun({ text: item.note, size: 17, color: '374151' }),
                              ],
                              spacing: { before: 60 },
                            }),
                          ]
                        : []),
                    ],
                    shading: { type: ShadingType.SOLID, color: 'FEF2F2' },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: 'FECACA' },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'FECACA' },
                      left: { style: BorderStyle.SINGLE, size: 16, color: 'EF4444' },
                      right: { style: BorderStyle.SINGLE, size: 6, color: 'FECACA' },
                    },
                    margins: { top: 100, bottom: 100, left: 140, right: 100 },
                  }),
                ],
              }),
            ],
          }),
        )
        children.push(new Paragraph({ text: '', spacing: { after: 80 } }))
      }
    }

    // Passed items
    if (roomPassed.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Passed Items', bold: true, size: 22, color: '16A34A' })],
          spacing: { before: 200, after: 100 },
        }),
      )

      for (const item of roomPassed) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '✓  ', bold: true, size: 18, color: '22C55E' }),
              new TextRun({ text: item.item_description, size: 18, color: '374151' }),
            ],
            spacing: { after: 60 },
          }),
        )
      }
    }

    // N/A items
    if (roomNa.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Not Applicable', bold: true, size: 22, color: '9CA3AF' })],
          spacing: { before: 200, after: 100 },
        }),
      )

      for (const item of roomNa) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '—  ', size: 18, color: '9CA3AF' }),
              new TextRun({ text: item.item_description, size: 18, color: '9CA3AF' }),
            ],
            spacing: { after: 60 },
          }),
        )
      }
    }
  }

  // ── Final Page ──────────────────────────────────────────────────────────────

  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      text: 'Next Steps',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 160 },
    }),
    ...[
      `1. Compile your failed items into a formal snagging list and send it to your builder in writing.`,
      `2. Request a written response from the builder with a repair timeline for each item. Reference your ${warrantyName} warranty where applicable.`,
      `3. Re-inspect every failed item once the builder confirms it has been repaired. Do not sign off until satisfied.`,
      `4. For Critical or Major items the builder refuses to address, contact your warranty provider or solicitor.`,
      `5. Keep this report safely — it may be needed as evidence of defects found at handover.`,
    ].map(
      step =>
        new Paragraph({
          children: [new TextRun({ text: step, size: 20, color: '374151' })],
          spacing: { after: 120 },
        }),
    ),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'DISCLAIMER: ',
          bold: true,
          size: 16,
          color: '6B7280',
        }),
        new TextRun({
          text:
            'This report was produced using the SnapSnag self-inspection tool and is based solely on visual observations made by the homebuyer. It does not constitute a professional structural survey, engineer\'s report, or legal document. SnapSnag Limited accepts no liability for defects not identified during the inspection.',
          size: 16,
          color: '9CA3AF',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Verification Code: ', size: 20, bold: true, color: '374151' }),
        new TextRun({ text: inspection.verification_code ?? '—', size: 20, bold: true, color: '00C9A7' }),
        new TextRun({ text: '  —  Verify at snapsnag.ie/verify', size: 16, color: '9CA3AF' }),
      ],
    }),
  )

  // ── Build document ──────────────────────────────────────────────────────────

  const doc = new Document({
    creator: 'SnapSnag',
    title: `SnapSnag Report — ${address}`,
    description: 'New Build Snagging Report',
    sections: [
      {
        children,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

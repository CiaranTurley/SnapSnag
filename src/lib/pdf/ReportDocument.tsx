import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ChecklistItemRow {
  id: string
  room: string
  room_order: number
  item_description: string
  item_order: number
  status: 'pass' | 'fail' | 'na' | null
  severity: string | null
  note: string | null
  photo_urls: string[] | null
  voice_note_url: string | null
}

export interface InspectionData {
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
  total_items: number | null
  builder_name: string | null
  questionnaire_answers: Record<string, unknown> | null
}

export interface CompanyBranding {
  companyName: string
  companyLogoUrl?: string
  contactEmail?: string
  phone?: string
  website?: string
}

export interface ReportDocumentProps {
  inspection: InspectionData
  items: ChecklistItemRow[]
  warrantyName: string
  energyCertName: string
  companyBranding?: CompanyBranding
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const C = {
  teal: '#00C9A7',
  ink: '#0D0F1A',
  inkLight: '#1A1D2E',
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  pass: '#22C55E',
  fail: '#EF4444',
  warn: '#F59E0B',
  na: '#6B7280',
  border: '#E5E7EB',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingBottom: 40,
  },

  // ── Cover page
  coverDark: {
    backgroundColor: C.ink,
    padding: 40,
    paddingBottom: 48,
  },
  coverLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coverLogoBox: {
    width: 36,
    height: 36,
    backgroundColor: C.teal,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  coverLogoText: {
    color: C.white,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  coverWordmark: {
    fontSize: 20,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
  },
  coverWordmarkTeal: {
    fontSize: 20,
    color: C.teal,
    fontFamily: 'Helvetica-Bold',
  },
  coverTagline: {
    fontSize: 8,
    color: C.teal,
    letterSpacing: 2,
    marginTop: 2,
  },
  coverBadge: {
    marginTop: 24,
    backgroundColor: C.teal,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  coverBadgeText: {
    color: C.ink,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  coverLight: {
    backgroundColor: C.white,
    padding: 40,
    paddingTop: 36,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 13,
    color: C.gray,
    marginBottom: 28,
  },
  coverInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  coverInfoCell: {
    width: '50%',
    marginBottom: 18,
  },
  coverInfoLabel: {
    fontSize: 8,
    color: C.gray,
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  coverInfoValue: {
    fontSize: 11,
    color: C.ink,
    fontFamily: 'Helvetica-Bold',
  },
  coverVerification: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: C.lightGray,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverVerificationLabel: {
    fontSize: 8,
    color: C.gray,
    letterSpacing: 1,
  },
  coverVerificationCode: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.teal,
    letterSpacing: 3,
  },
  coverVerificationNote: {
    fontSize: 8,
    color: C.gray,
    marginTop: 4,
    maxWidth: 200,
  },

  // ── Section header (summary + room pages)
  pageHeader: {
    backgroundColor: C.ink,
    paddingHorizontal: 36,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderLogo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginRight: 4,
  },
  pageHeaderLogoTeal: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.teal,
  },
  pageHeaderAddress: {
    fontSize: 8,
    color: C.gray,
  },
  pageHeaderSection: {
    fontSize: 8,
    color: C.teal,
    letterSpacing: 1,
  },
  pageBody: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },

  // ── Summary page
  summaryPassRate: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryPassRateNumber: {
    fontSize: 56,
    fontFamily: 'Helvetica-Bold',
    color: C.teal,
  },
  summaryPassRateLabel: {
    fontSize: 10,
    color: C.gray,
    letterSpacing: 1,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 28,
  },
  summaryStat: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderRadius: 6,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryStatNumber: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
  },
  summaryStatNumberFail: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.fail,
    marginBottom: 2,
  },
  summaryStatNumberPass: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.pass,
    marginBottom: 2,
  },

  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  roomTable: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 24,
  },
  roomTableHeader: {
    flexDirection: 'row',
    backgroundColor: C.offWhite,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  roomTableHeaderCell: {
    fontSize: 8,
    color: C.gray,
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  roomTableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
  },
  roomTableRowLast: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  roomTableCell: {
    fontSize: 9,
    color: C.ink,
  },
  roomTableCellGray: {
    fontSize: 9,
    color: C.gray,
  },

  // ── Room pages
  roomPageHeading: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 4,
  },
  roomPageSubheading: {
    fontSize: 9,
    color: C.gray,
    marginBottom: 20,
  },

  // Fail item card
  failCard: {
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  failCardHeader: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  failCardHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#991B1B',
    flex: 1,
    marginRight: 8,
  },
  severityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  severityBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  failCardBody: {
    padding: 12,
    paddingTop: 8,
  },
  failCardNote: {
    fontSize: 8,
    color: C.gray,
    marginTop: 4,
    lineHeight: 1.4,
  },
  failCardPhotoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  failCardPhoto: {
    width: 100,
    height: 75,
    borderRadius: 4,
    objectFit: 'cover',
  },

  // Pass item
  passItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.lightGray,
  },
  passItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.pass,
    marginRight: 8,
    marginTop: 3,
  },
  passItemText: {
    fontSize: 8,
    color: C.ink,
    flex: 1,
    lineHeight: 1.4,
  },

  // NA items compact
  naSection: {
    marginTop: 16,
  },
  naSectionLabel: {
    fontSize: 8,
    color: C.gray,
    letterSpacing: 1,
    marginBottom: 6,
  },
  naChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  naChip: {
    backgroundColor: C.offWhite,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  naChipText: {
    fontSize: 7,
    color: C.gray,
  },

  // ── Final page
  finalSection: {
    marginBottom: 24,
  },
  finalHeading: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginBottom: 12,
  },
  finalStepRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  finalStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  finalStepNumText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
  },
  finalStepText: {
    fontSize: 9,
    color: C.ink,
    flex: 1,
    lineHeight: 1.5,
  },
  finalDisclaimer: {
    backgroundColor: C.offWhite,
    borderRadius: 6,
    padding: 14,
    marginTop: 8,
  },
  finalDisclaimerText: {
    fontSize: 7.5,
    color: C.gray,
    lineHeight: 1.6,
  },
  finalVerifyBox: {
    backgroundColor: C.ink,
    borderRadius: 6,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finalVerifyLabel: {
    fontSize: 8,
    color: C.gray,
    marginBottom: 4,
  },
  finalVerifyCode: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.teal,
    letterSpacing: 3,
  },
  finalVerifyNote: {
    fontSize: 7.5,
    color: C.gray,
    maxWidth: 180,
    lineHeight: 1.5,
  },

  // Page number footer
  pageFooter: {
    position: 'absolute',
    bottom: 14,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.lightGray,
    paddingTop: 8,
  },
  pageFooterText: {
    fontSize: 7,
    color: C.gray,
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────────

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

function getSeverityStyle(severity: string | null) {
  if (severity === 'critical') return { bg: '#7F1D1D', text: '#FCA5A5', label: 'CRITICAL' }
  if (severity === 'major') return { bg: '#78350F', text: '#FCD34D', label: 'MAJOR' }
  return { bg: '#1E3A5F', text: '#93C5FD', label: 'MINOR' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────────

function PageHeader({
  address,
  section,
  companyBranding,
}: {
  address: string
  section: string
  companyBranding?: CompanyBranding
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeft}>
        {companyBranding ? (
          <>
            {companyBranding.companyLogoUrl ? (
              <Image src={companyBranding.companyLogoUrl} style={{ width: 18, height: 18, marginRight: 6 }} />
            ) : (
              <Text style={[styles.pageHeaderLogo, { color: C.teal }]}>{companyBranding.companyName.slice(0, 2).toUpperCase()}</Text>
            )}
            <Text style={styles.pageHeaderLogo}>{companyBranding.companyName}</Text>
          </>
        ) : (
          <>
            <Text style={styles.pageHeaderLogo}>Snap</Text>
            <Text style={styles.pageHeaderLogoTeal}>Snag</Text>
          </>
        )}
        <Text style={{ fontSize: 8, color: C.gray, marginLeft: 8 }}>  |  {address}</Text>
      </View>
      <Text style={styles.pageHeaderSection}>{section.toUpperCase()}</Text>
    </View>
  )
}

function PageFooter({
  pageLabel,
  companyBranding,
}: {
  pageLabel: string
  companyBranding?: CompanyBranding
}) {
  const left = companyBranding
    ? `${companyBranding.companyName} — Inspection Report`
    : 'SnapSnag Inspection Report — Confidential'
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterText}>{left}</Text>
      <Text style={styles.pageFooterText}>{pageLabel}</Text>
    </View>
  )
}

// ─── Cover Page ───────────────────────────────────────────────────────────────────

function CoverPage({
  inspection,
  companyBranding,
}: {
  inspection: InspectionData
  companyBranding?: CompanyBranding
}) {
  const address = inspection.address ?? 'Address not provided'
  const inspDate = formatDate(inspection.completed_at ?? inspection.created_at)

  return (
    <Page size="A4" style={styles.page}>
      {/* Dark top section */}
      <View style={styles.coverDark}>
        {/* Logo / company branding */}
        <View style={styles.coverLogoRow}>
          {companyBranding ? (
            companyBranding.companyLogoUrl ? (
              <Image src={companyBranding.companyLogoUrl} style={{ height: 40, maxWidth: 160, objectFit: 'contain', marginRight: 12 }} />
            ) : (
              <View style={styles.coverLogoBox}>
                <Text style={styles.coverLogoText}>{companyBranding.companyName.slice(0, 2).toUpperCase()}</Text>
              </View>
            )
          ) : (
            <View style={styles.coverLogoBox}>
              <Text style={styles.coverLogoText}>SS</Text>
            </View>
          )}
          {!companyBranding?.companyLogoUrl && (
            <View>
              <View style={{ flexDirection: 'row' }}>
                {companyBranding ? (
                  <Text style={styles.coverWordmark}>{companyBranding.companyName}</Text>
                ) : (
                  <>
                    <Text style={styles.coverWordmark}>Snap</Text>
                    <Text style={styles.coverWordmarkTeal}>Snag</Text>
                  </>
                )}
              </View>
              <Text style={styles.coverTagline}>
                {companyBranding ? 'EXPERT INSPECTOR' : 'NEW HOME INSPECTOR'}
              </Text>
            </View>
          )}
          {companyBranding?.companyLogoUrl && (
            <View>
              <Text style={styles.coverTagline}>EXPERT INSPECTOR</Text>
            </View>
          )}
        </View>

        {/* Badge */}
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>OFFICIAL SNAGGING REPORT</Text>
        </View>

        {/* "Powered by SnapSnag" for expert reports */}
        {companyBranding && (
          <Text style={{ fontSize: 7, color: C.gray, marginTop: 8 }}>
            Powered by SnapSnag
          </Text>
        )}
      </View>

      {/* Light bottom section */}
      <View style={styles.coverLight}>
        <Text style={styles.coverTitle}>{address}</Text>
        <Text style={styles.coverSubtitle}>New Build Inspection Report</Text>

        {/* Info grid */}
        <View style={styles.coverInfoGrid}>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Inspection Date</Text>
            <Text style={styles.coverInfoValue}>{inspDate}</Text>
          </View>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Property Type</Text>
            <Text style={styles.coverInfoValue}>{inspection.property_type ?? '—'}</Text>
          </View>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Bedrooms</Text>
            <Text style={styles.coverInfoValue}>{inspection.bedrooms ?? '—'}</Text>
          </View>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Bathrooms</Text>
            <Text style={styles.coverInfoValue}>{inspection.bathrooms ?? '—'}</Text>
          </View>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Builder / Developer</Text>
            <Text style={styles.coverInfoValue}>{inspection.builder_name ?? '—'}</Text>
          </View>
          <View style={styles.coverInfoCell}>
            <Text style={styles.coverInfoLabel}>Duration</Text>
            <Text style={styles.coverInfoValue}>{formatDuration(inspection.duration_seconds)}</Text>
          </View>
        </View>

        {/* Verification code */}
        <View style={styles.coverVerification}>
          <View>
            <Text style={styles.coverVerificationLabel}>VERIFICATION CODE</Text>
            <Text style={styles.coverVerificationCode}>
              {inspection.verification_code ?? '—'}
            </Text>
            <Text style={styles.coverVerificationNote}>
              Verify this report at snapsnag.ie/verify
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7, color: C.gray }}>Report ID</Text>
            <Text style={{ fontSize: 8, color: C.ink, fontFamily: 'Helvetica-Bold' }}>
              {inspection.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <PageFooter pageLabel="Page 1" companyBranding={companyBranding} />
    </Page>
  )
}

// ─── Summary Page ─────────────────────────────────────────────────────────────────

function SummaryPage({
  inspection,
  items,
  warrantyName,
  companyBranding,
}: {
  inspection: InspectionData
  items: ChecklistItemRow[]
  warrantyName: string
  companyBranding?: CompanyBranding
}) {
  const answered = items.filter(i => i.status !== null)
  const passed = items.filter(i => i.status === 'pass')
  const failed = items.filter(i => i.status === 'fail')
  const na = items.filter(i => i.status === 'na')
  const passRate =
    answered.length > 0 ? Math.round((passed.length / answered.length) * 100) : 0

  // Group by room for the table
  const roomMap = new Map<string, { pass: number; fail: number; na: number; order: number }>()
  for (const item of items) {
    if (!roomMap.has(item.room)) {
      roomMap.set(item.room, { pass: 0, fail: 0, na: 0, order: item.room_order })
    }
    const entry = roomMap.get(item.room)!
    if (item.status === 'pass') entry.pass++
    else if (item.status === 'fail') entry.fail++
    else if (item.status === 'na') entry.na++
  }
  const roomRows = Array.from(roomMap.entries()).sort((a, b) => a[1].order - b[1].order)

  const address = inspection.address ?? 'Address not provided'

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader address={address} section="Executive Summary" companyBranding={companyBranding} />

      <View style={styles.pageBody}>
        {/* Pass rate */}
        <View style={styles.summaryPassRate}>
          <Text style={styles.summaryPassRateNumber}>{passRate}%</Text>
          <Text style={styles.summaryPassRateLabel}>OVERALL PASS RATE</Text>
        </View>

        {/* Stats */}
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatNumber}>{answered.length}</Text>
            <Text style={styles.summaryStatLabel}>Items{'\n'}Checked</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatNumberPass}>{passed.length}</Text>
            <Text style={styles.summaryStatLabel}>Items{'\n'}Passed</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatNumberFail}>{failed.length}</Text>
            <Text style={styles.summaryStatLabel}>Items{'\n'}Failed</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatNumber}>{na.length}</Text>
            <Text style={styles.summaryStatLabel}>Not{'\n'}Applicable</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatNumber}>{formatDuration(inspection.duration_seconds)}</Text>
            <Text style={styles.summaryStatLabel}>Time{'\n'}Taken</Text>
          </View>
        </View>

        {/* Room table */}
        <Text style={styles.sectionHeading}>Room-by-Room Summary</Text>
        <View style={styles.roomTable}>
          <View style={styles.roomTableHeader}>
            <Text style={[styles.roomTableHeaderCell, { flex: 3 }]}>ROOM</Text>
            <Text style={[styles.roomTableHeaderCell, { flex: 1, textAlign: 'center' }]}>PASS</Text>
            <Text style={[styles.roomTableHeaderCell, { flex: 1, textAlign: 'center' }]}>FAIL</Text>
            <Text style={[styles.roomTableHeaderCell, { flex: 1, textAlign: 'center' }]}>N/A</Text>
            <Text style={[styles.roomTableHeaderCell, { flex: 1, textAlign: 'right' }]}>STATUS</Text>
          </View>
          {roomRows.map(([room, counts], idx) => {
            const isLast = idx === roomRows.length - 1
            const rowStyle = isLast ? styles.roomTableRowLast : styles.roomTableRow
            const hasFails = counts.fail > 0
            return (
              <View key={room} style={rowStyle}>
                <Text style={[styles.roomTableCell, { flex: 3 }]}>{room}</Text>
                <Text style={[styles.roomTableCell, { flex: 1, textAlign: 'center', color: C.pass }]}>
                  {counts.pass}
                </Text>
                <Text
                  style={[
                    styles.roomTableCell,
                    { flex: 1, textAlign: 'center', color: counts.fail > 0 ? C.fail : C.gray },
                  ]}
                >
                  {counts.fail}
                </Text>
                <Text style={[styles.roomTableCellGray, { flex: 1, textAlign: 'center' }]}>
                  {counts.na}
                </Text>
                <Text
                  style={[
                    styles.roomTableCell,
                    {
                      flex: 1,
                      textAlign: 'right',
                      color: hasFails ? C.fail : C.pass,
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 7,
                    },
                  ]}
                >
                  {hasFails ? 'ACTION' : 'CLEAR'}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Disclaimer */}
        <View style={styles.finalDisclaimer}>
          <Text style={styles.finalDisclaimerText}>
            This report was self-generated using the SnapSnag inspection app and reflects the
            observations of the homebuyer on the date shown. It is not a substitute for a
            professional snagging survey. Items marked as failed should be raised formally with the
            developer in writing, referencing the {warrantyName} warranty where applicable.
          </Text>
        </View>
      </View>

      <PageFooter pageLabel="Page 2" companyBranding={companyBranding} />
    </Page>
  )
}

// ─── Room Page ────────────────────────────────────────────────────────────────────

function RoomPage({
  room,
  items,
  pageNum,
  address,
  companyBranding,
}: {
  room: string
  items: ChecklistItemRow[]
  pageNum: number
  address: string
  companyBranding?: CompanyBranding
}) {
  const failed = items.filter(i => i.status === 'fail')
  const passed = items.filter(i => i.status === 'pass')
  const na = items.filter(i => i.status === 'na')

  return (
    <Page size="A4" style={styles.page} wrap>
      <PageHeader address={address} section={room} companyBranding={companyBranding} />

      <View style={styles.pageBody}>
        <Text style={styles.roomPageHeading}>{room}</Text>
        <Text style={styles.roomPageSubheading}>
          {failed.length} failed · {passed.length} passed · {na.length} not applicable
        </Text>

        {/* Failed items */}
        {failed.length > 0 && (
          <View>
            <Text style={[styles.sectionHeading, { color: C.fail }]}>Failed Items</Text>
            {failed.map(item => {
              const sev = getSeverityStyle(item.severity)
              return (
                <View key={item.id} style={styles.failCard}>
                  <View style={styles.failCardHeader}>
                    <Text style={styles.failCardHeaderText}>{item.item_description}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                      <Text style={[styles.severityBadgeText, { color: sev.text }]}>
                        {sev.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.failCardBody}>
                    {item.note ? (
                      <Text style={styles.failCardNote}>Note: {item.note}</Text>
                    ) : null}
                    {item.photo_urls && item.photo_urls.length > 0 && (
                      <View style={styles.failCardPhotoRow}>
                        {item.photo_urls.slice(0, 4).map((url, i) => (
                          <Image key={i} src={url} style={styles.failCardPhoto} />
                        ))}
                      </View>
                    )}
                    {!item.note && (!item.photo_urls || item.photo_urls.length === 0) && (
                      <Text style={styles.failCardNote}>No additional notes provided.</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Passed items */}
        {passed.length > 0 && (
          <View style={{ marginTop: failed.length > 0 ? 16 : 0 }}>
            <Text style={[styles.sectionHeading, { color: C.pass }]}>Passed Items</Text>
            {passed.map(item => (
              <View key={item.id} style={styles.passItem}>
                <View style={styles.passItemDot} />
                <Text style={styles.passItemText}>{item.item_description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* N/A items */}
        {na.length > 0 && (
          <View style={styles.naSection}>
            <Text style={styles.naSectionLabel}>NOT APPLICABLE</Text>
            <View style={styles.naChipRow}>
              {na.map(item => (
                <View key={item.id} style={styles.naChip}>
                  <Text style={styles.naChipText}>{item.item_description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <PageFooter pageLabel={`Page ${pageNum}`} companyBranding={companyBranding} />
    </Page>
  )
}

// ─── Final Page ───────────────────────────────────────────────────────────────────

function FinalPage({
  inspection,
  warrantyName,
  pageNum,
  companyBranding,
}: {
  inspection: InspectionData
  warrantyName: string
  pageNum: number
  companyBranding?: CompanyBranding
}) {
  const address = inspection.address ?? 'Address not provided'

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader address={address} section="Next Steps" />

      <View style={styles.pageBody}>
        {/* Next steps */}
        <View style={styles.finalSection}>
          <Text style={styles.finalHeading}>What to do with this report</Text>

          {[
            {
              num: '1',
              text:
                'Compile your list of failed items into a formal snagging list document to send to your builder or developer.',
            },
            {
              num: '2',
              text:
                `Submit your snagging list in writing (email is fine) and request a written response with a timeline for each repair. Reference your ${warrantyName} warranty where applicable.`,
            },
            {
              num: '3',
              text:
                'Re-inspect each failed item once the builder confirms it has been repaired — do not sign off until you are satisfied.',
            },
            {
              num: '4',
              text:
                'For items marked Critical or Major that the builder refuses to address, contact your warranty provider or a solicitor.',
            },
            {
              num: '5',
              text:
                'Keep this report safely — you may need it as evidence of defects discovered at the time of handover.',
            },
          ].map(step => (
            <View key={step.num} style={styles.finalStepRow}>
              <View style={styles.finalStepNum}>
                <Text style={styles.finalStepNumText}>{step.num}</Text>
              </View>
              <Text style={styles.finalStepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Warranty section */}
        <View style={styles.finalSection}>
          <Text style={styles.finalHeading}>Your {warrantyName} Warranty</Text>
          <Text style={{ fontSize: 9, color: C.gray, lineHeight: 1.6 }}>
            Your new home is covered by a structural warranty through {warrantyName}. This typically
            covers major structural defects for 10 years, and builder-related defects (snags) for the
            first 1–2 years. Document everything in writing, keep copies of all correspondence, and
            follow up any verbal promises with an email confirmation.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.finalDisclaimer}>
          <Text style={styles.finalDisclaimerText}>
            DISCLAIMER: This report was produced using the SnapSnag self-inspection tool. It is
            based solely on visual observations made by the homebuyer and does not constitute a
            professional structural survey, engineer's report, or legal document. SnapSnag Limited
            accepts no liability for any defects not identified during the inspection or for any
            actions taken on the basis of this report. Always seek professional advice for serious or
            structural concerns.
          </Text>
        </View>

        {/* Verify box */}
        <View style={styles.finalVerifyBox}>
          <View>
            <Text style={styles.finalVerifyLabel}>VERIFICATION CODE</Text>
            <Text style={styles.finalVerifyCode}>{inspection.verification_code ?? '—'}</Text>
          </View>
          <Text style={styles.finalVerifyNote}>
            Verify this report at snapsnag.ie/verify{'\n'}
            Any person can confirm this inspection took place using the code above.
          </Text>
        </View>
      </View>

      <PageFooter pageLabel={`Page ${pageNum}`} companyBranding={companyBranding} />
    </Page>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────────

export function ReportDocument({
  inspection,
  items,
  warrantyName,
  companyBranding,
}: ReportDocumentProps) {
  // Group items by room
  const roomMap = new Map<string, ChecklistItemRow[]>()
  for (const item of items) {
    if (!roomMap.has(item.room)) roomMap.set(item.room, [])
    roomMap.get(item.room)!.push(item)
  }

  // Sort rooms by room_order
  const rooms = Array.from(roomMap.entries()).sort(
    (a, b) => (a[1][0]?.room_order ?? 0) - (b[1][0]?.room_order ?? 0)
  )

  // Filter to rooms with at least one answered item
  const answeredRooms = rooms.filter(([, roomItems]) =>
    roomItems.some((item: ChecklistItemRow) => item.status !== null)
  )

  return (
    <Document
      title={`SnapSnag Report — ${inspection.address ?? 'Inspection'}`}
      author="SnapSnag"
      subject="New Build Snagging Report"
    >
      <CoverPage inspection={inspection} companyBranding={companyBranding} />
      <SummaryPage inspection={inspection} items={items} warrantyName={warrantyName} companyBranding={companyBranding} />
      {answeredRooms.map(([room, roomItems], idx) => (
        <RoomPage
          key={room}
          room={room}
          items={roomItems}
          pageNum={3 + idx}
          address={inspection.address ?? ''}
          companyBranding={companyBranding}
        />
      ))}
      <FinalPage
        inspection={inspection}
        warrantyName={warrantyName}
        pageNum={3 + answeredRooms.length}
        companyBranding={companyBranding}
      />
    </Document>
  )
}

// ─── Re-export database types ─────────────────────────────────────────────────
export type { Database } from './database'

// ─── Convenience row types ────────────────────────────────────────────────────
import type { Database } from './database'

export type User                = Database['public']['Tables']['users']['Row']
export type Inspection          = Database['public']['Tables']['inspections']['Row']
export type ChecklistItem       = Database['public']['Tables']['checklist_items']['Row']
export type BuilderPortalItem   = Database['public']['Tables']['builder_portal_items']['Row']
export type ExpertSubscription  = Database['public']['Tables']['expert_subscriptions']['Row']
export type SupportTicket       = Database['public']['Tables']['support_tickets']['Row']
export type GiftCard            = Database['public']['Tables']['gift_cards']['Row']
export type DefectDatabase      = Database['public']['Tables']['defect_database']['Row']

// ─── App-level types ──────────────────────────────────────────────────────────

export type InspectionStatus = 'in_progress' | 'completed' | 'paid'

export type ChecklistResponse = 'pass' | 'fail' | 'na' | null

export type DefectSeverity = 'minor' | 'major' | 'critical' | null

export type Country = 'GB' | 'IE' | 'US' | 'CA' | 'AU' | 'NZ'

export interface PhotoAttachment {
  url: string
  thumbnailUrl?: string
  caption?: string
  takenAt: string
}

export interface ChecklistRoom {
  name: string
  order: number
  items: ChecklistItem[]
}

export interface InspectionWithItems extends Inspection {
  checklist_items: ChecklistItem[]
}

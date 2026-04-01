// ─── Auto-generated Supabase database types ───────────────────────────────────
// These types mirror every table in your Supabase project exactly.
// When you change the database schema, update these types to match.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          country: string | null
          created_at: string
          referral_code: string | null
          referred_by: string | null
          credit_balance: number
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          country?: string | null
          created_at?: string
          referral_code?: string | null
          referred_by?: string | null
          credit_balance?: number
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          country?: string | null
          created_at?: string
          referral_code?: string | null
          referred_by?: string | null
          credit_balance?: number
        }
      }
      inspections: {
        Row: {
          id: string
          user_id: string | null
          country: string
          property_address_line1: string | null
          property_address_line2: string | null
          property_city: string | null
          property_county: string | null
          property_postcode: string | null
          property_type: string | null
          bedrooms: number | null
          bathrooms: number | null
          builder_name: string | null
          handover_date: string | null
          inspection_date: string | null
          inspector_name: string | null
          weather_conditions: string | null
          construction_type: string | null
          inspection_type: string | null
          is_managed_development: boolean
          questionnaire_answers: Json
          contract_inclusions: Json
          integrated_appliances: Json
          status: string
          paid_at: string | null
          stripe_payment_intent_id: string | null
          total_items: number
          passed_items: number
          failed_items: number
          na_items: number
          custom_items: number
          inspection_duration_minutes: number
          verification_code: string | null
          share_token: string | null
          couple_mode_active: boolean
          couple_share_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          country: string
          property_address_line1?: string | null
          property_address_line2?: string | null
          property_city?: string | null
          property_county?: string | null
          property_postcode?: string | null
          property_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          builder_name?: string | null
          handover_date?: string | null
          inspection_date?: string | null
          inspector_name?: string | null
          weather_conditions?: string | null
          construction_type?: string | null
          inspection_type?: string | null
          is_managed_development?: boolean
          questionnaire_answers?: Json
          contract_inclusions?: Json
          integrated_appliances?: Json
          status?: string
          paid_at?: string | null
          stripe_payment_intent_id?: string | null
          total_items?: number
          passed_items?: number
          failed_items?: number
          na_items?: number
          custom_items?: number
          inspection_duration_minutes?: number
          verification_code?: string | null
          share_token?: string | null
          couple_mode_active?: boolean
          couple_share_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['inspections']['Insert']>
      }
      checklist_items: {
        Row: {
          id: string
          inspection_id: string
          room: string
          room_order: number
          item_description: string
          item_order: number
          is_custom: boolean
          response: 'pass' | 'fail' | 'na' | null
          severity: 'minor' | 'major' | 'critical' | null
          written_note: string | null
          voice_note_transcript: string | null
          voice_note_url: string | null
          photos: Json
          annotated_photos: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          room: string
          room_order?: number
          item_description: string
          item_order?: number
          is_custom?: boolean
          response?: 'pass' | 'fail' | 'na' | null
          severity?: 'minor' | 'major' | 'critical' | null
          written_note?: string | null
          voice_note_transcript?: string | null
          voice_note_url?: string | null
          photos?: Json
          annotated_photos?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['checklist_items']['Insert']>
      }
      builder_portal_items: {
        Row: {
          id: string
          checklist_item_id: string
          inspection_id: string
          builder_status: 'fixed' | 'in_progress' | 'disputed' | null
          builder_note: string | null
          builder_photo_url: string | null
          buyer_accepted: boolean | null
          updated_at: string
        }
        Insert: {
          id?: string
          checklist_item_id: string
          inspection_id: string
          builder_status?: 'fixed' | 'in_progress' | 'disputed' | null
          builder_note?: string | null
          builder_photo_url?: string | null
          buyer_accepted?: boolean | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['builder_portal_items']['Insert']>
      }
      expert_subscriptions: {
        Row: {
          id: string
          user_id: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          plan: 'monthly' | 'annual' | null
          status: string
          company_name: string | null
          company_logo_url: string | null
          company_contact_email: string | null
          company_phone: string | null
          company_website: string | null
          current_period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan?: 'monthly' | 'annual' | null
          status?: string
          company_name?: string | null
          company_logo_url?: string | null
          company_contact_email?: string | null
          company_phone?: string | null
          company_website?: string | null
          current_period_end?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['expert_subscriptions']['Insert']>
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string | null
          category: string | null
          messages: Json
          status: string
          resolution: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          category?: string | null
          messages?: Json
          status?: string
          resolution?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>
      }
      gift_cards: {
        Row: {
          id: string
          code: string
          value_cents: number
          currency: string
          used: boolean
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          value_cents: number
          currency: string
          used?: boolean
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['gift_cards']['Insert']>
      }
      defect_database: {
        Row: {
          id: string
          country: string | null
          property_type: string | null
          region: string | null
          room: string | null
          item_description: string | null
          severity: string | null
          created_at: string
        }
        Insert: {
          id?: string
          country?: string | null
          property_type?: string | null
          region?: string | null
          room?: string | null
          item_description?: string | null
          severity?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['defect_database']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          owner_user_id: string
          slug: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          timezone: string
          working_hours: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          slug: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          timezone?: string
          working_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          slug?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          timezone?: string
          working_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          shop_id: string
          user_id: string | null
          display_name: string
          avatar_url: string | null
          invite_email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id?: string | null
          display_name: string
          avatar_url?: string | null
          invite_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string | null
          display_name?: string
          avatar_url?: string | null
          invite_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string
          shop_id: string
          name: string
          duration_min: number
          price_cents: number | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          duration_min: number
          price_cents?: number | null
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          duration_min?: number
          price_cents?: number | null
          display_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          barber_id: string
          service_id: string | null
          customer_name: string
          customer_phone: string | null
          starts_at: string
          ends_at: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          service_id?: string | null
          customer_name: string
          customer_phone?: string | null
          starts_at: string
          ends_at: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          barber_id?: string
          service_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          starts_at?: string
          ends_at?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          id: string
          barber_id: string
          starts_at: string
          ends_at: string
          reason: string
          created_via: string
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          starts_at: string
          ends_at: string
          reason?: string
          created_via?: string
          created_at?: string
        }
        Update: {
          id?: string
          barber_id?: string
          starts_at?: string
          ends_at?: string
          reason?: string
          created_via?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_tokens: {
        Row: {
          id: string
          shop_id: string
          token_hash: string
          label: string
          last_used_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          token_hash: string
          label?: string
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          token_hash?: string
          label?: string
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_tokens_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots: {
        Row: {
          appointment_id: string
          barber_id: string
          starts_at: string
          ends_at: string
        }
        Insert: {
          appointment_id: string
          barber_id: string
          starts_at: string
          ends_at: string
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          starts_at?: string
          ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      block_slots: {
        Row: {
          block_id: string
          barber_id: string
          starts_at: string
          ends_at: string
        }
        Insert: {
          block_id: string
          barber_id: string
          starts_at: string
          ends_at: string
        }
        Update: {
          block_id?: string
          barber_id?: string
          starts_at?: string
          ends_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_slots_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_occupied_ranges: {
        Args: { p_barber_id: string; p_date: string }
        Returns: {
          starts_at: string
          ends_at: string
        }[]
      }
      assign_any_barber: {
        Args: { p_shop_id: string; p_starts_at: string; p_ends_at: string }
        Returns: string | null
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      additional_vehicle_fields: {
        Row: {
          active: boolean
          created_at: string
          field_name: string
          id: string
          input_type: string
          label: string
          options: Json | null
          required_for_eligibility: boolean
          required_for_pricing: boolean
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          field_name: string
          id?: string
          input_type?: string
          label: string
          options?: Json | null
          required_for_eligibility?: boolean
          required_for_pricing?: boolean
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          field_name?: string
          id?: string
          input_type?: string
          label?: string
          options?: Json | null
          required_for_eligibility?: boolean
          required_for_pricing?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      coverage_pricing: {
        Row: {
          active: boolean
          created_at: string
          deductible: string
          deductible_cost: number | null
          id: string
          mileage_covered: number
          plan_id: string
          price: number
          rental_plus: number | null
          updated_at: string
          vehicle_class: string | null
          years_covered: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          deductible: string
          deductible_cost?: number | null
          id?: string
          mileage_covered: number
          plan_id: string
          price: number
          rental_plus?: number | null
          updated_at?: string
          vehicle_class?: string | null
          years_covered: number
        }
        Update: {
          active?: boolean
          created_at?: string
          deductible?: string
          deductible_cost?: number | null
          id?: string
          mileage_covered?: number
          plan_id?: string
          price?: number
          rental_plus?: number | null
          updated_at?: string
          vehicle_class?: string | null
          years_covered?: number
        }
        Relationships: [
          {
            foreignKeyName: "coverage_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          file_url: string
          id: string
          import_type: string
          row_count: number | null
          status: string
          user_id: string | null
          validation_errors: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          file_url: string
          id?: string
          import_type: string
          row_count?: number | null
          status?: string
          user_id?: string | null
          validation_errors?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          file_url?: string
          id?: string
          import_type?: string
          row_count?: number | null
          status?: string
          user_id?: string | null
          validation_errors?: Json | null
        }
        Relationships: []
      }
      custom_quote_requests: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string | null
          phone: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          vin: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message?: string | null
          phone: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string | null
          phone?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Relationships: []
      }
      eligibility_rules: {
        Row: {
          active: boolean
          created_at: string
          eligible: boolean
          id: string
          ineligible_message: string | null
          make: string | null
          max_mileage: number | null
          max_year: number | null
          min_year: number | null
          model: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          eligible?: boolean
          id?: string
          ineligible_message?: string | null
          make?: string | null
          max_mileage?: number | null
          max_year?: number | null
          min_year?: number | null
          model?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          eligible?: boolean
          id?: string
          ineligible_message?: string | null
          make?: string | null
          max_mileage?: number | null
          max_year?: number | null
          min_year?: number | null
          model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_sessions: {
        Row: {
          abandoned_notified_at: string | null
          additional_details: Json | null
          base_price: number | null
          computed_at: string | null
          computed_input_hash: string | null
          coverage: Json | null
          created_at: string
          current_step: number
          deductible_cost: number | null
          email: string | null
          first_name: string | null
          id: string
          ineligible_message: string | null
          is_eligible: boolean | null
          last_activity_at: string
          last_name: string | null
          phone: string | null
          price: number | null
          referrer: string | null
          session_id: string
          status: string
          surcharges: Json | null
          token_created_at: string | null
          updated_at: string
          user_agent: string | null
          vehicle: Json | null
          vehicle_class: string | null
          write_token_hash: string | null
        }
        Insert: {
          abandoned_notified_at?: string | null
          additional_details?: Json | null
          base_price?: number | null
          computed_at?: string | null
          computed_input_hash?: string | null
          coverage?: Json | null
          created_at?: string
          current_step?: number
          deductible_cost?: number | null
          email?: string | null
          first_name?: string | null
          id?: string
          ineligible_message?: string | null
          is_eligible?: boolean | null
          last_activity_at?: string
          last_name?: string | null
          phone?: string | null
          price?: number | null
          referrer?: string | null
          session_id: string
          status?: string
          surcharges?: Json | null
          token_created_at?: string | null
          updated_at?: string
          user_agent?: string | null
          vehicle?: Json | null
          vehicle_class?: string | null
          write_token_hash?: string | null
        }
        Update: {
          abandoned_notified_at?: string | null
          additional_details?: Json | null
          base_price?: number | null
          computed_at?: string | null
          computed_input_hash?: string | null
          coverage?: Json | null
          created_at?: string
          current_step?: number
          deductible_cost?: number | null
          email?: string | null
          first_name?: string | null
          id?: string
          ineligible_message?: string | null
          is_eligible?: boolean | null
          last_activity_at?: string
          last_name?: string | null
          phone?: string | null
          price?: number | null
          referrer?: string | null
          session_id?: string
          status?: string
          surcharges?: Json | null
          token_created_at?: string | null
          updated_at?: string
          user_agent?: string | null
          vehicle?: Json | null
          vehicle_class?: string | null
          write_token_hash?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      surcharges: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          id: string
          mileage_threshold: number | null
          plan_id: string
          surcharge_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          mileage_threshold?: number | null
          plan_id: string
          surcharge_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          mileage_threshold?: number | null
          plan_id?: string
          surcharge_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surcharges_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean
          created_at: string
          drivetrain: string | null
          fuel_type: string | null
          id: string
          make: string
          model: string
          updated_at: string
          vehicle_class: string | null
          year: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          drivetrain?: string | null
          fuel_type?: string | null
          id?: string
          make: string
          model: string
          updated_at?: string
          vehicle_class?: string | null
          year: number
        }
        Update: {
          active?: boolean
          created_at?: string
          drivetrain?: string | null
          fuel_type?: string | null
          id?: string
          make?: string
          model?: string
          updated_at?: string
          vehicle_class?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_quote_computation:
        | {
            Args: {
              p_coverage: Json
              p_ineligible_message: string
              p_input_hash: string
              p_is_eligible: boolean
              p_price: number
              p_session_id: string
              p_surcharges: Json
              p_vehicle_class: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_base_price?: number
              p_coverage: Json
              p_deductible_cost?: number
              p_ineligible_message: string
              p_input_hash: string
              p_is_eligible: boolean
              p_price: number
              p_session_id: string
              p_surcharges: Json
              p_vehicle_class: string
            }
            Returns: undefined
          }
      complete_quote_session: {
        Args: { p_session_id: string; p_status: string }
        Returns: undefined
      }
      create_quote_session: {
        Args: { p_referrer?: string; p_user_agent?: string }
        Returns: {
          session_id: string
          write_token: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_abandon_notified: { Args: { p_id: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      patch_quote_session: {
        Args: { p_patch: Json; p_session_id: string; p_write_token: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sweep_quote_sessions: {
        Args: never
        Returns: {
          current_step: number
          email: string
          first_name: string
          last_name: string
          newly_abandoned_id: string
          vehicle: Json
        }[]
      }
      upsert_quote_session: {
        Args: { p_patch: Json; p_session_id: string }
        Returns: undefined
      }
      verify_quote_session_token: {
        Args: { p_session_id: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

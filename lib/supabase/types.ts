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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          customer_phone: string
          id: number
          service: string
          station_id: string
          status: string
          time_slot: string
        }
        Insert: {
          created_at?: string
          customer_phone: string
          id?: number
          service: string
          station_id: string
          status?: string
          time_slot: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          id?: number
          service?: string
          station_id?: string
          status?: string
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_state: string | null
          avg_latency: number | null
          caller: string
          created_at: string | null
          duration: number | null
          id: string
          intent: string | null
          language: string
          loyalty_id: string | null
          outcome: string | null
          phone: string | null
          sentiment: string | null
          start_time: string | null
          station_id: string | null
          status: string
        }
        Insert: {
          agent_state?: string | null
          avg_latency?: number | null
          caller: string
          created_at?: string | null
          duration?: number | null
          id: string
          intent?: string | null
          language?: string
          loyalty_id?: string | null
          outcome?: string | null
          phone?: string | null
          sentiment?: string | null
          start_time?: string | null
          station_id?: string | null
          status?: string
        }
        Update: {
          agent_state?: string | null
          avg_latency?: number | null
          caller?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          intent?: string | null
          language?: string
          loyalty_id?: string | null
          outcome?: string | null
          phone?: string | null
          sentiment?: string | null
          start_time?: string | null
          station_id?: string | null
          status?: string
        }
        Relationships: []
      }
      customer_behavior_profiles: {
        Row: {
          avg_basket_value: number
          created_at: string
          customer_id: string
          favorite_product: string
          id: string
          price_sensitivity_score: number
          upsell_acceptance_score: number
          visits_per_week: number
        }
        Insert: {
          avg_basket_value: number
          created_at?: string
          customer_id: string
          favorite_product: string
          id?: string
          price_sensitivity_score: number
          upsell_acceptance_score: number
          visits_per_week: number
        }
        Update: {
          avg_basket_value?: number
          created_at?: string
          customer_id?: string
          favorite_product?: string
          id?: string
          price_sensitivity_score?: number
          upsell_acceptance_score?: number
          visits_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_behavior_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_demo_locations: {
        Row: {
          created_at: string
          customer_id: string
          label: string
          lat: number
          lng: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          label: string
          lat: number
          lng: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          label?: string
          lat?: number
          lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_demo_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          loyalty_tier: string
          preferred_language: string
          voice_enabled: boolean
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          loyalty_tier: string
          preferred_language?: string
          voice_enabled?: boolean
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          loyalty_tier?: string
          preferred_language?: string
          voice_enabled?: boolean
        }
        Relationships: []
      }
      daily_kpis: {
        Row: {
          avg_handle_time: string | null
          avg_tool_latency: string | null
          calls_today: number | null
          conversion_rate: number | null
          date: string
          deflection_rate: number | null
          id: number
          orders_created: number | null
        }
        Insert: {
          avg_handle_time?: string | null
          avg_tool_latency?: string | null
          calls_today?: number | null
          conversion_rate?: number | null
          date?: string
          deflection_rate?: number | null
          id?: number
          orders_created?: number | null
        }
        Update: {
          avg_handle_time?: string | null
          avg_tool_latency?: string | null
          calls_today?: number | null
          conversion_rate?: number | null
          date?: string
          deflection_rate?: number | null
          id?: number
          orders_created?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          chunks: number | null
          created_at: string | null
          id: string
          last_indexed: string | null
          name: string
          size: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          chunks?: number | null
          created_at?: string | null
          id: string
          last_indexed?: string | null
          name: string
          size?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          chunks?: number | null
          created_at?: string | null
          id?: string
          last_indexed?: string | null
          name?: string
          size?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      loyalty_members: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          phone: string
          points: number
          tier: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id: string
          phone: string
          points?: number
          tier?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          phone?: string
          points?: number
          tier?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          category: string
          created_at: string
          margin_percent: number | null
          name: string
          price: number
          sku: string
          stock: number
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string
          margin_percent?: number | null
          name: string
          price: number
          sku: string
          stock?: number
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string
          margin_percent?: number | null
          name?: string
          price?: number
          sku?: string
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promotion_skus: {
        Row: {
          promotion_id: string
          sku: string
        }
        Insert: {
          promotion_id: string
          sku: string
        }
        Update: {
          promotion_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_skus_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_skus_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean | null
          created_at: string
          discount: string
          discount_percent: number | null
          end_time: string | null
          id: string
          loyalty_required: string | null
          name: string
          product_sku: string | null
          start_time: string | null
          station_id: string | null
          valid_until: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          discount: string
          discount_percent?: number | null
          end_time?: string | null
          id: string
          loyalty_required?: string | null
          name: string
          product_sku?: string | null
          start_time?: string | null
          station_id?: string | null
          valid_until: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          discount?: string
          discount_percent?: number | null
          end_time?: string | null
          id?: string
          loyalty_required?: string | null
          name?: string
          product_sku?: string | null
          start_time?: string | null
          station_id?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_sku_fkey"
            columns: ["product_sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
          {
            foreignKeyName: "promotions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_triggers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          station_id: string
          trigger_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          station_id: string
          trigger_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          station_id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_triggers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_triggers_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_analytics: {
        Row: {
          aht: string | null
          calls: number | null
          conversion: number | null
          date: string
          id: number
          revenue: number | null
          station_id: string | null
        }
        Insert: {
          aht?: string | null
          calls?: number | null
          conversion?: number | null
          date?: string
          id?: number
          revenue?: number | null
          station_id?: string | null
        }
        Update: {
          aht?: string | null
          calls?: number | null
          conversion?: number | null
          date?: string
          id?: number
          revenue?: number | null
          station_id?: string | null
        }
        Relationships: []
      }
      station_ev_sessions: {
        Row: {
          avg_duration_min: number
          avg_queue_min: number
          charger_type: string
          date: string
          id: number
          revenue: number
          station_id: string
          total_kwh: number
          total_sessions: number
          utilization_pct: number
        }
        Insert: {
          avg_duration_min?: number
          avg_queue_min?: number
          charger_type: string
          date?: string
          id?: number
          revenue?: number
          station_id: string
          total_kwh?: number
          total_sessions?: number
          utilization_pct?: number
        }
        Update: {
          avg_duration_min?: number
          avg_queue_min?: number
          charger_type?: string
          date?: string
          id?: number
          revenue?: number
          station_id?: string
          total_kwh?: number
          total_sessions?: number
          utilization_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "station_ev_sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_hse: {
        Row: {
          audit_score_pct: number
          fatalities: number
          id: number
          ltif: number
          month: string
          near_misses: number
          open_actions: number
          safety_observations: number
          station_id: string
          training_hours: number
          trir: number
        }
        Insert: {
          audit_score_pct?: number
          fatalities?: number
          id?: number
          ltif?: number
          month: string
          near_misses?: number
          open_actions?: number
          safety_observations?: number
          station_id: string
          training_hours?: number
          trir?: number
        }
        Update: {
          audit_score_pct?: number
          fatalities?: number
          id?: number
          ltif?: number
          month?: string
          near_misses?: number
          open_actions?: number
          safety_observations?: number
          station_id?: string
          training_hours?: number
          trir?: number
        }
        Relationships: [
          {
            foreignKeyName: "station_hse_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_loyalty: {
        Row: {
          active_members: number
          avg_basket_aed: number
          date: string
          id: number
          new_signups: number
          points_earned: number
          points_redeemed: number
          redemption_rate: number
          station_id: string
          tier_bronze: number
          tier_gold: number
          tier_silver: number
        }
        Insert: {
          active_members?: number
          avg_basket_aed?: number
          date?: string
          id?: number
          new_signups?: number
          points_earned?: number
          points_redeemed?: number
          redemption_rate?: number
          station_id: string
          tier_bronze?: number
          tier_gold?: number
          tier_silver?: number
        }
        Update: {
          active_members?: number
          avg_basket_aed?: number
          date?: string
          id?: number
          new_signups?: number
          points_earned?: number
          points_redeemed?: number
          redemption_rate?: number
          station_id?: string
          tier_bronze?: number
          tier_gold?: number
          tier_silver?: number
        }
        Relationships: [
          {
            foreignKeyName: "station_loyalty_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_operational_signals: {
        Row: {
          approach_traffic_minutes: number | null
          avg_ev_charge_time_minutes: number
          car_wash_queue_minutes: number
          coffee_prep_time_minutes: number
          cold_beverage_stock_high: boolean
          created_at: string
          ev_chargers_available: number
          id: string
          interior_cleaning_available: boolean
          station_id: string
        }
        Insert: {
          approach_traffic_minutes?: number | null
          avg_ev_charge_time_minutes?: number
          car_wash_queue_minutes?: number
          coffee_prep_time_minutes?: number
          cold_beverage_stock_high?: boolean
          created_at?: string
          ev_chargers_available?: number
          id?: string
          interior_cleaning_available?: boolean
          station_id: string
        }
        Update: {
          approach_traffic_minutes?: number | null
          avg_ev_charge_time_minutes?: number
          car_wash_queue_minutes?: number
          coffee_prep_time_minutes?: number
          cold_beverage_stock_high?: boolean
          created_at?: string
          ev_chargers_available?: number
          id?: string
          interior_cleaning_available?: boolean
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_operational_signals_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_sales: {
        Row: {
          category: string
          cost: number
          date: string
          daypart: string
          id: number
          margin: number | null
          product_name: string
          qty_sold: number
          revenue: number
          sku: string
          station_id: string
        }
        Insert: {
          category: string
          cost?: number
          date?: string
          daypart: string
          id?: number
          margin?: number | null
          product_name: string
          qty_sold?: number
          revenue?: number
          sku: string
          station_id: string
        }
        Update: {
          category?: string
          cost?: number
          date?: string
          daypart?: string
          id?: number
          margin?: number | null
          product_name?: string
          qty_sold?: number
          revenue?: number
          sku?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_sales_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          address: string | null
          car_care: string[] | null
          city: string
          created_at: string
          ev_charging: boolean | null
          facilities: string[] | null
          fnb: string[] | null
          fuel_types: string[] | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          operating_hours: string | null
          region: string
          services: string[] | null
          shop: string[] | null
          station_number: number | null
          station_type: string | null
        }
        Insert: {
          address?: string | null
          car_care?: string[] | null
          city: string
          created_at?: string
          ev_charging?: boolean | null
          facilities?: string[] | null
          fnb?: string[] | null
          fuel_types?: string[] | null
          id: string
          lat?: number | null
          lng?: number | null
          name: string
          operating_hours?: string | null
          region: string
          services?: string[] | null
          shop?: string[] | null
          station_number?: number | null
          station_type?: string | null
        }
        Update: {
          address?: string | null
          car_care?: string[] | null
          city?: string
          created_at?: string
          ev_charging?: boolean | null
          facilities?: string[] | null
          fnb?: string[] | null
          fuel_types?: string[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          operating_hours?: string | null
          region?: string
          services?: string[] | null
          shop?: string[] | null
          station_number?: number | null
          station_type?: string | null
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          available: boolean
          date: string
          id: number
          service: string
          station_id: string
          time: string
        }
        Insert: {
          available?: boolean
          date?: string
          id?: number
          service: string
          station_id: string
          time: string
        }
        Update: {
          available?: boolean
          date?: string
          id?: number
          service?: string
          station_id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_events: {
        Row: {
          call_id: string
          created_at: string | null
          details: Json | null
          id: string
          latency: number | null
          status: string | null
          timestamp: string | null
          title: string | null
          type: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          details?: Json | null
          id: string
          latency?: number | null
          status?: string | null
          timestamp?: string | null
          title?: string | null
          type: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          latency?: number | null
          status?: string | null
          timestamp?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_lines: {
        Row: {
          call_id: string
          created_at: string | null
          id: number
          speaker: string
          text: string
          timestamp: string | null
        }
        Insert: {
          call_id: string
          created_at?: string | null
          id?: number
          speaker: string
          text: string
          timestamp?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string | null
          id?: number
          speaker?: string
          text?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_lines_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          confirmations: string[] | null
          description: string | null
          fallback: string | null
          id: string
          label: string
          sort_order: number | null
        }
        Insert: {
          confirmations?: string[] | null
          description?: string | null
          fallback?: string | null
          id: string
          label: string
          sort_order?: number | null
        }
        Update: {
          confirmations?: string[] | null
          description?: string | null
          fallback?: string | null
          id?: string
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "manager" | "viewer"
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
      app_role: ["admin", "operator", "manager", "viewer"],
    },
  },
} as const

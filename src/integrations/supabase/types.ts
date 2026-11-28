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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          action: string | null
          change_id: string
          created_at: string
          deadline: string | null
          id: string
          item_index: number
          kind: string
          notice_days: number | null
          product: string | null
          published_at: string | null
          remind_at: string | null
          sent_to: string | null
          severity: string
          source_url: string | null
          status: string
          title: string
          type: string
          vendor: string
          why: string | null
          workspace_id: string
        }
        Insert: {
          action?: string | null
          change_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          item_index?: number
          kind: string
          notice_days?: number | null
          product?: string | null
          published_at?: string | null
          remind_at?: string | null
          sent_to?: string | null
          severity: string
          source_url?: string | null
          status?: string
          title: string
          type: string
          vendor: string
          why?: string | null
          workspace_id: string
        }
        Update: {
          action?: string | null
          change_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          item_index?: number
          kind?: string
          notice_days?: number | null
          product?: string | null
          published_at?: string | null
          remind_at?: string | null
          sent_to?: string | null
          severity?: string
          source_url?: string | null
          status?: string
          title?: string
          type?: string
          vendor?: string
          why?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "changes"
            referencedColumns: ["id"]
          },
        ]
      }
      changes: {
        Row: {
          classifier_output: Json | null
          detected_at: string
          diff: string
          entry_date: string | null
          entry_url: string | null
          id: string
          snapshot_from: string | null
          snapshot_to: string
          watch_id: string
        }
        Insert: {
          classifier_output?: Json | null
          detected_at?: string
          diff: string
          entry_date?: string | null
          entry_url?: string | null
          id?: string
          snapshot_from?: string | null
          snapshot_to: string
          watch_id: string
        }
        Update: {
          classifier_output?: Json | null
          detected_at?: string
          diff?: string
          entry_date?: string | null
          entry_url?: string | null
          id?: string
          snapshot_from?: string | null
          snapshot_to?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "changes_snapshot_from_fkey"
            columns: ["snapshot_from"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changes_snapshot_to_fkey"
            columns: ["snapshot_to"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changes_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          created_at: string
          email: string | null
          id: string
          type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          change_count: number
          computed_at: string
          id: string
          per_type: Json
          per_vendor: Json
          published_count: number
          total: number | null
          workspace_id: string
        }
        Insert: {
          change_count?: number
          computed_at?: string
          id?: string
          per_type?: Json
          per_vendor?: Json
          published_count?: number
          total?: number | null
          workspace_id: string
        }
        Update: {
          change_count?: number
          computed_at?: string
          id?: string
          per_type?: Json
          per_vendor?: Json
          published_count?: number
          total?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          content: string
          content_hash: string
          entry_date: string | null
          entry_url: string | null
          fetched_at: string
          id: string
          watch_id: string
        }
        Insert: {
          content: string
          content_hash: string
          entry_date?: string | null
          entry_url?: string | null
          fetched_at?: string
          id?: string
          watch_id: string
        }
        Update: {
          content?: string
          content_hash?: string
          entry_date?: string | null
          entry_url?: string | null
          fetched_at?: string
          id?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      stack_items: {
        Row: {
          added_via: string
          block: string
          created_at: string
          id: string
          product: string | null
          vendor: string
          workspace_id: string
        }
        Insert: {
          added_via?: string
          block: string
          created_at?: string
          id?: string
          product?: string | null
          vendor: string
          workspace_id: string
        }
        Update: {
          added_via?: string
          block?: string
          created_at?: string
          id?: string
          product?: string | null
          vendor?: string
          workspace_id?: string
        }
        Relationships: []
      }
      usage_manifest: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      watches: {
        Row: {
          cadence: string
          created_at: string
          dependency_position: string
          id: string
          kind: string
          last_checked_at: string | null
          last_status: string | null
          role: string
          url: string
          use_firecrawl: boolean
          vendor: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          dependency_position?: string
          id?: string
          kind?: string
          last_checked_at?: string | null
          last_status?: string | null
          role?: string
          url: string
          use_firecrawl?: boolean
          vendor: string
        }
        Update: {
          cadence?: string
          created_at?: string
          dependency_position?: string
          id?: string
          kind?: string
          last_checked_at?: string | null
          last_status?: string | null
          role?: string
          url?: string
          use_firecrawl?: boolean
          vendor?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_change_highlights: {
        Args: never
        Returns: {
          after_text: string
          before_text: string
          change_type: string
          detected_at: string
          entry_date: string
          entry_url: string
          id: string
          interpretation: string
          priority: string
          routed_to: string
          section: string
          vendor: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

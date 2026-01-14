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
      activity_feed: {
        Row: {
          action: string
          created_at: string
          id: string
          project_id: string | null
          target: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          project_id?: string | null
          target?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          project_id?: string | null
          target?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      consulting_tools: {
        Row: {
          category: string
          configuration_schema: Json | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          configuration_schema?: Json | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          configuration_schema?: Json | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      custom_tools: {
        Row: {
          canvas_image_url: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          canvas_image_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          canvas_image_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          owner_id: string | null
          priority: string
          project_id: string
          raised_date: string
          resolution: string | null
          resolved_date: string | null
          status: string
          target_resolution_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string
          project_id: string
          raised_date?: string
          resolution?: string | null
          resolved_date?: string | null
          status?: string
          target_resolution_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string
          project_id?: string
          raised_date?: string
          resolution?: string | null
          resolved_date?: string | null
          status?: string
          target_resolution_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          project_id: string
          status: string
          target_date: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          project_id: string
          status?: string
          target_date: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          project_id?: string
          status?: string
          target_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_risks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          impact: string
          likelihood: string
          mitigation_plan: string | null
          owner_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string
          likelihood?: string
          mitigation_plan?: string | null
          owner_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string
          likelihood?: string
          mitigation_plan?: string | null
          owner_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          deliverables: Json | null
          description: string | null
          id: string
          layout_json: Json | null
          notes_json: Json | null
          order_index: number | null
          project_id: string
          status: string
          title: string
          tool_link: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          id?: string
          layout_json?: Json | null
          notes_json?: Json | null
          order_index?: number | null
          project_id: string
          status?: string
          title: string
          tool_link?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          id?: string
          layout_json?: Json | null
          notes_json?: Json | null
          order_index?: number | null
          project_id?: string
          status?: string
          title?: string
          tool_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_assignments: {
        Row: {
          allocation_percentage: number
          created_at: string
          end_date: string | null
          id: string
          project_id: string
          role_in_project: string
          start_date: string | null
          team_member_id: string
        }
        Insert: {
          allocation_percentage?: number
          created_at?: string
          end_date?: string | null
          id?: string
          project_id: string
          role_in_project?: string
          start_date?: string | null
          team_member_id: string
        }
        Update: {
          allocation_percentage?: number
          created_at?: string
          end_date?: string | null
          id?: string
          project_id?: string
          role_in_project?: string
          start_date?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          progress_percentage: number | null
          runbook_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          progress_percentage?: number | null
          runbook_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          progress_percentage?: number | null
          runbook_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_runbook_id_fkey"
            columns: ["runbook_id"]
            isOneToOne: false
            referencedRelation: "runbook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      runbook_templates: {
        Row: {
          created_at: string
          id: string
          industry_focus: string | null
          name: string
          step_layouts: Json | null
          updated_at: string
          workflow_json: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry_focus?: string | null
          name: string
          step_layouts?: Json | null
          updated_at?: string
          workflow_json?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          industry_focus?: string | null
          name?: string
          step_layouts?: Json | null
          updated_at?: string
          workflow_json?: Json | null
        }
        Relationships: []
      }
      suggested_team_structures: {
        Row: {
          created_at: string
          id: string
          max_duration_weeks: number | null
          min_duration_weeks: number | null
          project_type: string
          structure_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          max_duration_weeks?: number | null
          min_duration_weeks?: number | null
          project_type: string
          structure_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          max_duration_weeks?: number | null
          min_duration_weeks?: number | null
          project_type?: string
          structure_json?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          availability_percentage: number | null
          avatar_url: string | null
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          level: string
          name: string
          role: string
          skills: Json | null
          updated_at: string
        }
        Insert: {
          availability_percentage?: number | null
          avatar_url?: string | null
          created_at?: string
          email: string
          hourly_rate?: number | null
          id?: string
          level?: string
          name: string
          role?: string
          skills?: Json | null
          updated_at?: string
        }
        Update: {
          availability_percentage?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          level?: string
          name?: string
          role?: string
          skills?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tool_data: {
        Row: {
          content_json: Json | null
          created_at: string
          id: string
          project_id: string
          step_id: string | null
          tool_id: string
          updated_at: string
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          id?: string
          project_id: string
          step_id?: string | null
          tool_id: string
          updated_at?: string
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          id?: string
          project_id?: string
          step_id?: string | null
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_data_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_data_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "consulting_tools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

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
      assessment_benchmarks: {
        Row: {
          assessment_template_id: string | null
          benchmark_type: string
          created_at: string
          data_date: string | null
          dimension_id: string | null
          framework: string | null
          id: string
          industry: string | null
          metadata: Json | null
          sample_size: number | null
          score_average: number | null
          score_percentile_25: number | null
          score_percentile_50: number | null
          score_percentile_75: number | null
          source: string | null
          updated_at: string
        }
        Insert: {
          assessment_template_id?: string | null
          benchmark_type: string
          created_at?: string
          data_date?: string | null
          dimension_id?: string | null
          framework?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          sample_size?: number | null
          score_average?: number | null
          score_percentile_25?: number | null
          score_percentile_50?: number | null
          score_percentile_75?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          assessment_template_id?: string | null
          benchmark_type?: string
          created_at?: string
          data_date?: string | null
          dimension_id?: string | null
          framework?: string | null
          id?: string
          industry?: string | null
          metadata?: Json | null
          sample_size?: number | null
          score_average?: number | null
          score_percentile_25?: number | null
          score_percentile_50?: number | null
          score_percentile_75?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_benchmarks_assessment_template_id_fkey"
            columns: ["assessment_template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_benchmarks_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "assessment_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_dimensions: {
        Row: {
          assessment_template_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          weight: number | null
        }
        Insert: {
          assessment_template_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          weight?: number | null
        }
        Update: {
          assessment_template_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_dimensions_assessment_template_id_fkey"
            columns: ["assessment_template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_instances: {
        Row: {
          allow_anonymous: boolean
          assessment_template_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_id: string | null
          settings: Json | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allow_anonymous?: boolean
          assessment_template_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allow_anonymous?: boolean
          assessment_template_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_instances_assessment_template_id_fkey"
            columns: ["assessment_template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_items: {
        Row: {
          assessment_template_id: string
          created_at: string
          description: string | null
          id: string
          metadata_json: Json | null
          order_index: number
          title: string
        }
        Insert: {
          assessment_template_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_json?: Json | null
          order_index?: number
          title: string
        }
        Update: {
          assessment_template_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata_json?: Json | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_items_assessment_template_id_fkey"
            columns: ["assessment_template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_template_id: string
          created_at: string
          dimension_id: string | null
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          required: boolean
          scale_config: Json | null
          weight: number | null
        }
        Insert: {
          assessment_template_id: string
          created_at?: string
          dimension_id?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
          required?: boolean
          scale_config?: Json | null
          weight?: number | null
        }
        Update: {
          assessment_template_id?: string
          created_at?: string
          dimension_id?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          required?: boolean
          scale_config?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_template_id_fkey"
            columns: ["assessment_template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "assessment_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_recipients: {
        Row: {
          assessment_instance_id: string
          completed_at: string | null
          email: string
          id: string
          industry: string | null
          invited_at: string
          name: string | null
          organization: string | null
          reminder_sent_at: string | null
          role: string | null
          started_at: string | null
          status: string
          token: string
        }
        Insert: {
          assessment_instance_id: string
          completed_at?: string | null
          email: string
          id?: string
          industry?: string | null
          invited_at?: string
          name?: string | null
          organization?: string | null
          reminder_sent_at?: string | null
          role?: string | null
          started_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          assessment_instance_id?: string
          completed_at?: string | null
          email?: string
          id?: string
          industry?: string | null
          invited_at?: string
          name?: string | null
          organization?: string | null
          reminder_sent_at?: string | null
          role?: string | null
          started_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_recipients_assessment_instance_id_fkey"
            columns: ["assessment_instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_instance_id: string
          created_at: string
          id: string
          item_id: string | null
          notes: string | null
          question_id: string
          recipient_id: string | null
          response_value: Json
          updated_at: string
        }
        Insert: {
          assessment_instance_id: string
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          question_id: string
          recipient_id?: string | null
          response_value: Json
          updated_at?: string
        }
        Update: {
          assessment_instance_id?: string
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          question_id?: string
          recipient_id?: string | null
          response_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_instance_id_fkey"
            columns: ["assessment_instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "assessment_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          assessment_type: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          framework_type: string | null
          id: string
          industry: string | null
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          assessment_type?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          framework_type?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          assessment_type?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          framework_type?: string | null
          id?: string
          industry?: string | null
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          folder_id: string | null
          id: string
          is_private: boolean | null
          persona: string | null
          session_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_private?: boolean | null
          persona?: string | null
          session_type?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_private?: boolean | null
          persona?: string | null
          session_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      client_access: {
        Row: {
          access_level: string
          client_id: string
          created_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          client_id: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          access_level?: string
          client_id?: string
          created_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback: {
        Row: {
          category: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          portal_token_id: string | null
          project_id: string | null
          rating: number
        }
        Insert: {
          category?: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          portal_token_id?: string | null
          project_id?: string | null
          rating: number
        }
        Update: {
          category?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          portal_token_id?: string | null
          project_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_portal_token_id_fkey"
            columns: ["portal_token_id"]
            isOneToOne: false
            referencedRelation: "client_portal_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          settings: Json | null
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          settings?: Json | null
          token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          settings?: Json | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
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
          owner_id: string | null
          sections_json: Json | null
          updated_at: string
          visibility: string | null
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
          owner_id?: string | null
          sections_json?: Json | null
          updated_at?: string
          visibility?: string | null
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
          owner_id?: string | null
          sections_json?: Json | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: []
      }
      dashboard_preferences: {
        Row: {
          created_at: string
          hidden_widgets: string[]
          id: string
          layout_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          layout_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          layout_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          rates: Json
        }
        Insert: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Relationships: []
      }
      llm_config: {
        Row: {
          api_key_secret_name: string | null
          created_at: string
          endpoint_url: string
          id: string
          is_active: boolean
          label: string
          model: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key_secret_name?: string | null
          created_at?: string
          endpoint_url?: string
          id?: string
          is_active?: boolean
          label?: string
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          api_key_secret_name?: string | null
          created_at?: string
          endpoint_url?: string
          id?: string
          is_active?: boolean
          label?: string
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          preferred_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assessments: {
        Row: {
          assessment_instance_id: string
          created_at: string
          id: string
          notes_json: Json | null
          project_id: string
          step_id: string | null
        }
        Insert: {
          assessment_instance_id: string
          created_at?: string
          id?: string
          notes_json?: Json | null
          project_id: string
          step_id?: string | null
        }
        Update: {
          assessment_instance_id?: string
          created_at?: string
          id?: string
          notes_json?: Json | null
          project_id?: string
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assessments_assessment_instance_id_fkey"
            columns: ["assessment_instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assessments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          order_index: number
          project_id: string
          status: string
          step_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          order_index?: number
          project_id: string
          status?: string
          step_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          order_index?: number
          project_id?: string
          status?: string
          step_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      project_members: {
        Row: {
          can_manage: boolean | null
          id: string
          joined_at: string | null
          project_id: string
          role_in_project: string
          user_id: string
        }
        Insert: {
          can_manage?: boolean | null
          id?: string
          joined_at?: string | null
          project_id: string
          role_in_project?: string
          user_id: string
        }
        Update: {
          can_manage?: boolean | null
          id?: string
          joined_at?: string | null
          project_id?: string
          role_in_project?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
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
      project_reports: {
        Row: {
          blocks_json: Json | null
          branding_json: Json | null
          created_at: string
          created_by: string | null
          editor_mode: string
          id: string
          images_json: Json | null
          project_id: string
          sections_json: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          blocks_json?: Json | null
          branding_json?: Json | null
          created_at?: string
          created_by?: string | null
          editor_mode?: string
          id?: string
          images_json?: Json | null
          project_id: string
          sections_json?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          blocks_json?: Json | null
          branding_json?: Json | null
          created_at?: string
          created_by?: string | null
          editor_mode?: string
          id?: string
          images_json?: Json | null
          project_id?: string
          sections_json?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey"
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
          assignment_status: string
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
          assignment_status?: string
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
          assignment_status?: string
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
          budget_amount: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          progress_percentage: number | null
          project_type: string
          runbook_id: string | null
          sow_file_name: string | null
          sow_file_url: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          progress_percentage?: number | null
          project_type?: string
          runbook_id?: string | null
          sow_file_name?: string | null
          sow_file_url?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          progress_percentage?: number | null
          project_type?: string
          runbook_id?: string | null
          sow_file_name?: string | null
          sow_file_url?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_documents: {
        Row: {
          ai_summary: string | null
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          file_size: number
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          name: string
          project_id: string | null
          tags: string[]
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          ai_summary?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_size?: number
          file_type?: string
          file_url: string
          folder_id?: string | null
          id?: string
          name: string
          project_id?: string | null
          tags?: string[]
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          ai_summary?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          name?: string
          project_id?: string | null
          tags?: string[]
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_folders: {
        Row: {
          created_at: string
          created_by: string
          folder_type: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          folder_type?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          folder_type?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_project: { Args: { _project_id: string }; Returns: boolean }
      can_manage_users: { Args: { _user_id: string }; Returns: boolean }
      get_projects_for_assignment: {
        Args: never
        Returns: {
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }[]
      }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_elevated_role: { Args: { _user_id: string }; Returns: boolean }
      has_global_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: { Args: { _project_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "practice_leader"
        | "engagement_lead"
        | "member"
        | "super_admin"
        | "partner"
        | "account_lead"
        | "delivery_lead"
        | "consultant"
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
      app_role: [
        "admin",
        "practice_leader",
        "engagement_lead",
        "member",
        "super_admin",
        "partner",
        "account_lead",
        "delivery_lead",
        "consultant",
      ],
    },
  },
} as const

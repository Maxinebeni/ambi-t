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
      annual_goals: {
        Row: {
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"] | null
          description: string | null
          id: string
          owner_id: string | null
          plan_id: string
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          id?: string
          owner_id?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          id?: string
          owner_id?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "annual_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"] | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "quarterly_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_milestones: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"] | null
          description: string | null
          due_date: string | null
          goal_id: string
          id: string
          owner_id: string | null
          quarter: Database["public"]["Enums"]["quarter"]
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          owner_id?: string | null
          quarter: Database["public"]["Enums"]["quarter"]
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          owner_id?: string | null
          quarter?: Database["public"]["Enums"]["quarter"]
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "annual_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assignee_id: string | null
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"] | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string | null
          proof_file_path: string | null
          proof_notes: string | null
          proof_url: string | null
          status: Database["public"]["Enums"]["task_status"]
          submitted_at: string | null
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          proof_file_path?: string | null
          proof_notes?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"] | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          proof_file_path?: string | null
          proof_notes?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "manager" | "team_member"
      department: "Finance" | "Operations" | "Marketing" | "IT"
      goal_status: "on_track" | "at_risk" | "behind" | "complete"
      project_status: "not_started" | "in_progress" | "complete"
      quarter: "Q1" | "Q2" | "Q3" | "Q4"
      task_status: "pending" | "in_progress" | "submitted" | "approved"
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
      app_role: ["manager", "team_member"],
      department: ["Finance", "Operations", "Marketing", "IT"],
      goal_status: ["on_track", "at_risk", "behind", "complete"],
      project_status: ["not_started", "in_progress", "complete"],
      quarter: ["Q1", "Q2", "Q3", "Q4"],
      task_status: ["pending", "in_progress", "submitted", "approved"],
    },
  },
} as const

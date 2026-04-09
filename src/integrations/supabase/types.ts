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
      announcements: {
        Row: {
          author_id: string
          author_name: string
          body: string
          course_id: string | null
          created_at: string
          id: string
          program: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          program?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          program?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          document_url: string | null
          email: string
          full_name: string
          id: string
          motivation: string
          phone: string | null
          program: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          email: string
          full_name: string
          id?: string
          motivation: string
          phone?: string | null
          program: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_url?: string | null
          email?: string
          full_name?: string
          id?: string
          motivation?: string
          phone?: string | null
          program?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          session_date: string
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          session_date: string
          week_number?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          session_date?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          professor_id: string | null
          program: string
          semester: number
          syllabus_url: string | null
          updated_at: string
          year: number
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          professor_id?: string | null
          program: string
          semester?: number
          syllabus_url?: string | null
          updated_at?: string
          year?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          professor_id?: string | null
          program?: string
          semester?: number
          syllabus_url?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_components: {
        Row: {
          count: number
          course_id: string
          created_at: string
          id: string
          name: string
          weight: number
        }
        Insert: {
          count?: number
          course_id: string
          created_at?: string
          id?: string
          name: string
          weight?: number
        }
        Update: {
          count?: number
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_components_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          enrollment_id: string
          grade_component_id: string
          id: string
          instance_number: number
          max_score: number
          score: number | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          grade_component_id: string
          id?: string
          instance_number?: number
          max_score?: number
          score?: number | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          grade_component_id?: string
          id?: string
          instance_number?: number
          max_score?: number
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_grade_component_id_fkey"
            columns: ["grade_component_id"]
            isOneToOne: false
            referencedRelation: "grade_components"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          excerpt: string
          id?: string
          image_url?: string | null
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      professors: {
        Row: {
          bio: string
          created_at: string
          department: string
          display_order: number
          id: string
          name: string
          photo_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bio?: string
          created_at?: string
          department: string
          display_order?: number
          id?: string
          name: string
          photo_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bio?: string
          created_at?: string
          department?: string
          display_order?: number
          id?: string
          name?: string
          photo_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          pending_email: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          pending_email?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          pending_email?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          careers: string[]
          courses: string[]
          created_at: string
          degree: string
          description: string
          duration: string
          faculty: string
          id: string
          overview: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          careers?: string[]
          courses?: string[]
          created_at?: string
          degree: string
          description: string
          duration: string
          faculty: string
          id?: string
          overview: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          careers?: string[]
          courses?: string[]
          created_at?: string
          degree?: string
          description?: string
          duration?: string
          faculty?: string
          id?: string
          overview?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          admin_note: string | null
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          sent_by_admin: boolean
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sent_by_admin?: boolean
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sent_by_admin?: boolean
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          course_name: string
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          professor_name: string
          program: string
          room: string
          semester: number
          start_time: string
          updated_at: string
          year: number
        }
        Insert: {
          course_name: string
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          professor_name?: string
          program: string
          room?: string
          semester?: number
          start_time: string
          updated_at?: string
          year?: number
        }
        Update: {
          course_name?: string
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          professor_name?: string
          program?: string
          room?: string
          semester?: number
          start_time?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
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
      app_role: "admin" | "user" | "professor"
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
      app_role: ["admin", "user", "professor"],
    },
  },
} as const

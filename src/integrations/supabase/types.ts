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
      academic_semesters: {
        Row: {
          created_at: string
          end_date: string
          enrollment_deadline: string | null
          enrollment_open: boolean
          feedback_enabled: boolean
          id: string
          is_current: boolean
          name: string
          semester: number
          start_date: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          enrollment_deadline?: string | null
          enrollment_open?: boolean
          feedback_enabled?: boolean
          id?: string
          is_current?: boolean
          name: string
          semester?: number
          start_date: string
          status?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          end_date?: string
          enrollment_deadline?: string | null
          enrollment_open?: boolean
          feedback_enabled?: boolean
          id?: string
          is_current?: boolean
          name?: string
          semester?: number
          start_date?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      access_gates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      access_logs: {
        Row: {
          action: string
          card_id: string | null
          card_type: string
          created_at: string
          gate_id: string | null
          gate_name: string
          id: string
          notes: string | null
          role: string
          scanned_at: string
          scanned_by: string | null
          status: string
          user_id: string
          verification_token: string | null
        }
        Insert: {
          action: string
          card_id?: string | null
          card_type?: string
          created_at?: string
          gate_id?: string | null
          gate_name?: string
          id?: string
          notes?: string | null
          role?: string
          scanned_at?: string
          scanned_by?: string | null
          status?: string
          user_id: string
          verification_token?: string | null
        }
        Update: {
          action?: string
          card_id?: string | null
          card_type?: string
          created_at?: string
          gate_id?: string | null
          gate_name?: string
          id?: string
          notes?: string | null
          role?: string
          scanned_at?: string
          scanned_by?: string | null
          status?: string
          user_id?: string
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "access_gates"
            referencedColumns: ["id"]
          },
        ]
      }
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
          birthplace: string | null
          created_at: string
          document_url: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          motivation: string
          personal_id: string | null
          phone: string | null
          program: string
          status: string
          user_id: string | null
        }
        Insert: {
          birthplace?: string | null
          created_at?: string
          document_url?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          motivation: string
          personal_id?: string | null
          phone?: string | null
          program: string
          status?: string
          user_id?: string | null
        }
        Update: {
          birthplace?: string | null
          created_at?: string
          document_url?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          motivation?: string
          personal_id?: string | null
          phone?: string | null
          program?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content_type: string
          created_at: string
          feedback: string | null
          file_name: string
          file_path: string
          file_size: number
          graded_at: string | null
          graded_by: string | null
          id: string
          note: string | null
          score: number | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content_type?: string
          created_at?: string
          feedback?: string | null
          file_name: string
          file_path: string
          file_size?: number
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          note?: string | null
          score?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content_type?: string
          created_at?: string
          feedback?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          note?: string | null
          score?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_path: string | null
          course_id: string
          created_at: string
          created_by: string
          description: string
          due_at: string
          id: string
          is_published: boolean
          max_points: number
          title: string
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          course_id: string
          created_at?: string
          created_by: string
          description?: string
          due_at: string
          id?: string
          is_published?: boolean
          max_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string
          id?: string
          is_published?: boolean
          max_points?: number
          title?: string
          updated_at?: string
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
          hours: number
          id: string
          session_date: string
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string
          hours?: number
          id?: string
          session_date: string
          week_number?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          hours?: number
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
      calendar_events: {
        Row: {
          audience: string
          color: string
          created_at: string
          created_by: string | null
          description: string
          end_date: string | null
          end_time: string | null
          event_type: string
          id: string
          is_published: boolean
          location: string
          program: string | null
          start_date: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_published?: boolean
          location?: string
          program?: string | null
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_published?: boolean
          location?: string
          program?: string | null
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campus_events: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          location: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaint_submissions: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          is_anonymous: boolean
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          submitter_email: string
          submitter_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          submitter_email?: string
          submitter_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          submitter_email?: string
          submitter_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      course_materials: {
        Row: {
          content_type: string
          course_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string
          course_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          course_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_retake_requests: {
        Row: {
          advisor_comment: string | null
          attempt_number: number
          course_id: string
          created_at: string
          fee_amount: number | null
          fee_charge_id: string | null
          fee_currency: string | null
          id: string
          original_enrollment_id: string | null
          previous_albanian: number | null
          previous_grade: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_semester_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_comment?: string | null
          attempt_number?: number
          course_id: string
          created_at?: string
          fee_amount?: number | null
          fee_charge_id?: string | null
          fee_currency?: string | null
          id?: string
          original_enrollment_id?: string | null
          previous_albanian?: number | null
          previous_grade?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_semester_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_comment?: string | null
          attempt_number?: number
          course_id?: string
          created_at?: string
          fee_amount?: number | null
          fee_charge_id?: string | null
          fee_currency?: string | null
          id?: string
          original_enrollment_id?: string | null
          previous_albanian?: number | null
          previous_grade?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_semester_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_retake_requests_original_enrollment_id_fkey"
            columns: ["original_enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_retake_requests_target_semester_id_fkey"
            columns: ["target_semester_id"]
            isOneToOne: false
            referencedRelation: "academic_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      course_shared_programs: {
        Row: {
          course_id: string
          created_at: string
          id: string
          program_slug: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          program_slug: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          program_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_shared_programs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          ects: number
          hours_per_week: number
          id: string
          is_shared: boolean
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
          ects?: number
          hours_per_week?: number
          id?: string
          is_shared?: boolean
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
          ects?: number
          hours_per_week?: number
          id?: string
          is_shared?: boolean
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
      deans_list_entries: {
        Row: {
          certificate_code: string
          created_at: string
          full_name: string
          gpa_4: number
          gpa_albanian: number
          id: string
          program: string
          rank: number
          snapshot_id: string
          user_id: string
        }
        Insert: {
          certificate_code?: string
          created_at?: string
          full_name?: string
          gpa_4: number
          gpa_albanian: number
          id?: string
          program?: string
          rank: number
          snapshot_id: string
          user_id: string
        }
        Update: {
          certificate_code?: string
          created_at?: string
          full_name?: string
          gpa_4?: number
          gpa_albanian?: number
          id?: string
          program?: string
          rank?: number
          snapshot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deans_list_entries_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "deans_list_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      deans_list_snapshots: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          is_published: boolean
          list_title: string
          notes: string | null
          program: string | null
          published_at: string | null
          semester_id: string
          threshold_gpa: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_published?: boolean
          list_title?: string
          notes?: string | null
          program?: string | null
          published_at?: string | null
          semester_id: string
          threshold_gpa?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_published?: boolean
          list_title?: string
          notes?: string | null
          program?: string | null
          published_at?: string | null
          semester_id?: string
          threshold_gpa?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_template_overrides: {
        Row: {
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          template_key: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      enrollment_reminder_log: {
        Row: {
          id: string
          reminder_kind: string
          semester_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          reminder_kind: string
          semester_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          reminder_kind?: string
          semester_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      enrollment_requests: {
        Row: {
          course_id: string
          created_at: string
          id: string
          review_note: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["enrollment_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          attempt_number: number
          course_id: string
          created_at: string
          id: string
          is_retake: boolean
          original_enrollment_id: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          course_id: string
          created_at?: string
          id?: string
          is_retake?: boolean
          original_enrollment_id?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          course_id?: string
          created_at?: string
          id?: string
          is_retake?: boolean
          original_enrollment_id?: string | null
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
          {
            foreignKeyName: "enrollments_original_enrollment_id_fkey"
            columns: ["original_enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          ticket_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          ticket_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          ticket_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "campus_events"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_schedule: {
        Row: {
          course_id: string | null
          created_at: string
          end_time: string
          exam_date: string
          exam_type: string
          id: string
          is_published: boolean
          notes: string | null
          program: string
          room: string
          start_time: string
          supervisor_name: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          end_time: string
          exam_date: string
          exam_type?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          program: string
          room?: string
          start_time: string
          supervisor_name?: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          end_time?: string
          exam_date?: string
          exam_type?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          program?: string
          room?: string
          start_time?: string
          supervisor_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_campaigns: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          opens_at: string
          semester_id: string
          updated_at: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          semester_id: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          semester_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          generated_by: string | null
          id: string
          issued_at: string
          reference_code: string
          status: string
          template_key: string
          title: string
          updated_at: string
          user_id: string
          variables: Json
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          generated_by?: string | null
          id?: string
          issued_at?: string
          reference_code?: string
          status?: string
          template_key: string
          title: string
          updated_at?: string
          user_id: string
          variables?: Json
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          generated_by?: string | null
          id?: string
          issued_at?: string
          reference_code?: string
          status?: string
          template_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          variables?: Json
        }
        Relationships: []
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
      grade_notifications: {
        Row: {
          component_name: string
          course_name: string
          created_at: string
          grade_id: string | null
          id: string
          is_read: boolean
          max_score: number
          score: number | null
          user_id: string
        }
        Insert: {
          component_name?: string
          course_name?: string
          created_at?: string
          grade_id?: string | null
          id?: string
          is_read?: boolean
          max_score?: number
          score?: number | null
          user_id: string
        }
        Update: {
          component_name?: string
          course_name?: string
          created_at?: string
          grade_id?: string | null
          id?: string
          is_read?: boolean
          max_score?: number
          score?: number | null
          user_id?: string
        }
        Relationships: []
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
      message_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
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
      office_hours_bookings: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          slot_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          slot_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          slot_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hours_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "office_hours_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hours_slots: {
        Row: {
          capacity: number
          created_at: string
          end_at: string
          id: string
          location: string | null
          notes: string | null
          professor_id: string
          start_at: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          end_at: string
          id?: string
          location?: string | null
          notes?: string | null
          professor_id: string
          start_at: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          end_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          professor_id?: string
          start_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      professor_feedback: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          professor_id: string
          rating: number
          semester_id: string
          submitter_hash: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          professor_id: string
          rating: number
          semester_id: string
          submitter_hash: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          professor_id?: string
          rating?: number
          semester_id?: string
          submitter_hash?: string
        }
        Relationships: []
      }
      professor_id_cards: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          reissue_count: number
          status: string
          updated_at: string
          user_id: string
          verification_token: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          reissue_count?: number
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          reissue_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
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
          birthplace: string | null
          completed_open_lecture_hours: number
          created_at: string
          current_semester: number
          current_year: number
          email: string
          full_name: string
          gender: string | null
          has_scholarship: boolean
          id: string
          must_change_password: boolean
          pending_email: string | null
          personal_id: string | null
          phone: string | null
          program: string | null
          required_open_lecture_hours: number
          scholarship_percentage: number
          student_exam_code: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          birthplace?: string | null
          completed_open_lecture_hours?: number
          created_at?: string
          current_semester?: number
          current_year?: number
          email?: string
          full_name?: string
          gender?: string | null
          has_scholarship?: boolean
          id?: string
          must_change_password?: boolean
          pending_email?: string | null
          personal_id?: string | null
          phone?: string | null
          program?: string | null
          required_open_lecture_hours?: number
          scholarship_percentage?: number
          student_exam_code?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          birthplace?: string | null
          completed_open_lecture_hours?: number
          created_at?: string
          current_semester?: number
          current_year?: number
          email?: string
          full_name?: string
          gender?: string | null
          has_scholarship?: boolean
          id?: string
          must_change_password?: boolean
          pending_email?: string | null
          personal_id?: string | null
          phone?: string | null
          program?: string | null
          required_open_lecture_hours?: number
          scholarship_percentage?: number
          student_exam_code?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_advisors: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          program: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          program: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          program?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_tuition_fees: {
        Row: {
          academic_semester_id: string
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          program: string
          updated_at: string
        }
        Insert: {
          academic_semester_id: string
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          program: string
          updated_at?: string
        }
        Update: {
          academic_semester_id?: string
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          program?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          careers: string[]
          courses: string[]
          created_at: string
          curriculum: Json
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
          curriculum?: Json
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
          curriculum?: Json
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
      promo_banners: {
        Row: {
          button_link: string
          button_text: string
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string
          button_text?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string
          button_text?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          audience_program: string | null
          audience_role: string
          audience_year: number | null
          body: string
          created_at: string
          id: string
          link: string | null
          sent_at: string
          sent_by: string
          title: string
        }
        Insert: {
          audience_program?: string | null
          audience_role?: string
          audience_year?: number | null
          body: string
          created_at?: string
          id?: string
          link?: string | null
          sent_at?: string
          sent_by: string
          title: string
        }
        Update: {
          audience_program?: string | null
          audience_role?: string
          audience_year?: number | null
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          sent_at?: string
          sent_by?: string
          title?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          max_score: number | null
          quiz_id: string
          score: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          max_score?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          max_score?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      room_bookings: {
        Row: {
          booking_date: string
          created_at: string
          end_time: string
          id: string
          notes: string
          purpose: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string
          purpose: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string
          purpose?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          building: string
          capacity: number
          created_at: string
          equipment: string
          floor: string
          id: string
          is_active: boolean
          name: string
          room_type: string
          updated_at: string
        }
        Insert: {
          building?: string
          capacity?: number
          created_at?: string
          equipment?: string
          floor?: string
          id?: string
          is_active?: boolean
          name: string
          room_type?: string
          updated_at?: string
        }
        Update: {
          building?: string
          capacity?: number
          created_at?: string
          equipment?: string
          floor?: string
          id?: string
          is_active?: boolean
          name?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          recipient_count: number
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          target_programs: string[]
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          recipient_count?: number
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject: string
          target_programs?: string[]
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          recipient_count?: number
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          target_programs?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      seat_assignments: {
        Row: {
          chart_id: string
          col_index: number
          created_at: string
          id: string
          row_index: number
          user_id: string
        }
        Insert: {
          chart_id: string
          col_index: number
          created_at?: string
          id?: string
          row_index: number
          user_id: string
        }
        Update: {
          chart_id?: string
          col_index?: number
          created_at?: string
          id?: string
          row_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "seating_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_charts: {
        Row: {
          cols: number
          course_id: string
          created_at: string
          created_by: string
          id: string
          label: string
          rows: number
          updated_at: string
        }
        Insert: {
          cols?: number
          course_id: string
          created_at?: string
          created_by: string
          id?: string
          label?: string
          rows?: number
          updated_at?: string
        }
        Update: {
          cols?: number
          course_id?: string
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          rows?: number
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
      student_id_cards: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          reissue_count: number
          status: string
          updated_at: string
          user_id: string
          verification_token: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          reissue_count?: number
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          reissue_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
        }
        Relationships: []
      }
      student_id_scans: {
        Row: {
          card_id: string
          created_at: string
          id: string
          result: string
          scan_type: string
          scanned_by: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          result?: string
          scan_type?: string
          scanned_by?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          result?: string
          scan_type?: string
          scanned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_id_scans_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "student_id_cards"
            referencedColumns: ["id"]
          },
        ]
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
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
      tuition_charges: {
        Row: {
          academic_semester_id: string
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          program: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_semester_id: string
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          program: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_semester_id?: string
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          program?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tuition_late_fee_settings: {
        Row: {
          amount: number
          currency: string
          enabled: boolean
          fee_type: string
          grace_days: number
          id: string
          max_fee: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          currency?: string
          enabled?: boolean
          fee_type?: string
          grace_days?: number
          id?: string
          max_fee?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          currency?: string
          enabled?: boolean
          fee_type?: string
          grace_days?: number
          id?: string
          max_fee?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tuition_late_fees: {
        Row: {
          amount: number
          applied_at: string
          charge_id: string
          created_by: string | null
          currency: string
          id: string
          reason: string | null
          user_id: string
          waived: boolean
          waived_at: string | null
          waived_by: string | null
        }
        Insert: {
          amount?: number
          applied_at?: string
          charge_id: string
          created_by?: string | null
          currency?: string
          id?: string
          reason?: string | null
          user_id: string
          waived?: boolean
          waived_at?: string | null
          waived_by?: string | null
        }
        Update: {
          amount?: number
          applied_at?: string
          charge_id?: string
          created_by?: string | null
          currency?: string
          id?: string
          reason?: string | null
          user_id?: string
          waived?: boolean
          waived_at?: string | null
          waived_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tuition_late_fees_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: true
            referencedRelation: "tuition_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_payments: {
        Row: {
          admin_note: string | null
          amount: number
          charge_id: string
          created_at: string
          currency: string
          id: string
          method: string
          payment_date: string
          receipt_path: string | null
          reference: string | null
          updated_at: string
          uploaded_by_student: boolean
          user_id: string
          verification_status: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          charge_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          payment_date?: string
          receipt_path?: string | null
          reference?: string | null
          updated_at?: string
          uploaded_by_student?: boolean
          user_id: string
          verification_status?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          charge_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          payment_date?: string
          receipt_path?: string | null
          reference?: string | null
          updated_at?: string
          uploaded_by_student?: boolean
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tuition_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "tuition_charges"
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
      generate_deans_list: {
        Args: {
          _min_courses?: number
          _program?: string
          _semester_id: string
          _threshold?: number
        }
        Returns: Json
      }
      generate_exam_code: { Args: never; Returns: string }
      generate_student_id: { Args: never; Returns: string }
      get_all_professors_performance: {
        Args: { _semester_id?: string }
        Returns: {
          attendance_score: number
          department: string
          feedback_count: number
          feedback_score: number
          full_name: string
          grading_score: number
          performance_score: number
          professor_id: string
        }[]
      }
      get_my_honors: {
        Args: never
        Returns: {
          certificate_code: string
          entry_id: string
          generated_at: string
          gpa_4: number
          gpa_albanian: number
          is_published: boolean
          program: string
          rank: number
          semester_id: string
          semester_name: string
          snapshot_id: string
        }[]
      }
      get_professor_performance: {
        Args: { _professor_id: string; _semester_id?: string }
        Returns: Json
      }
      get_user_failed_courses: {
        Args: { _user_id: string }
        Returns: {
          albanian: number
          attempt_number: number
          course_id: string
          enrollment_id: string
          weighted_percent: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_submitted_feedback: {
        Args: { _course_id: string; _semester_id: string }
        Returns: boolean
      }
      preview_deans_list: {
        Args: {
          _min_courses?: number
          _program?: string
          _semester_id: string
          _threshold?: number
        }
        Returns: Json
      }
      record_card_scan: {
        Args: {
          _card_type?: string
          _force_action?: string
          _gate_id?: string
          _gate_name?: string
          _verification_token: string
        }
        Returns: Json
      }
      send_enrollment_deadline_reminders: { Args: never; Returns: Json }
      submit_professor_feedback: {
        Args: {
          _comment?: string
          _course_id: string
          _rating: number
          _semester_id: string
        }
        Returns: Json
      }
      system_admin_uid: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "professor"
      enrollment_request_status: "pending" | "accepted" | "rejected"
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
      enrollment_request_status: ["pending", "accepted", "rejected"],
    },
  },
} as const

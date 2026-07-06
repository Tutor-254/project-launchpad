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
      answers: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          is_instructor_answer: boolean
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          is_instructor_answer?: boolean
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          is_instructor_answer?: boolean
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          attempt_number: number
          id: string
          preliminary_score: number | null
          released_at: string | null
          score: number | null
          started_at: string
          state: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assessment_id: string
          attempt_number?: number
          id?: string
          preliminary_score?: number | null
          released_at?: string | null
          score?: number | null
          started_at?: string
          state?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assessment_id?: string
          attempt_number?: number
          id?: string
          preliminary_score?: number | null
          released_at?: string | null
          score?: number | null
          started_at?: string
          state?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          ai_generated: boolean
          assessment_id: string
          created_at: string
          id: string
          model_answer: string | null
          options: Json | null
          rubric: string | null
          source_ref: string | null
          status: string
          stem: string
          type: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          assessment_id: string
          created_at?: string
          id?: string
          model_answer?: string | null
          options?: Json | null
          rubric?: string | null
          source_ref?: string | null
          status?: string
          stem: string
          type: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          assessment_id?: string
          created_at?: string
          id?: string
          model_answer?: string | null
          options?: Json | null
          rubric?: string | null
          source_ref?: string | null
          status?: string
          stem?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          attempt_id: string
          created_at: string
          final_score: number | null
          id: string
          needs_review: boolean
          question_id: string
          released: boolean
          response_text: string | null
          selected_option: string | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id: string
          created_at?: string
          final_score?: number | null
          id?: string
          needs_review?: boolean
          question_id: string
          released?: boolean
          response_text?: string | null
          selected_option?: string | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id?: string
          created_at?: string
          final_score?: number | null
          id?: string
          needs_review?: boolean
          question_id?: string
          released?: boolean
          response_text?: string | null
          selected_option?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          title: string
          type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          title: string
          type: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          code: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          code?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          course_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          max_redemptions: number | null
          max_uses: number | null
          percent_off: number
          redemptions: number
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          max_uses?: number | null
          percent_off: number
          redemptions?: number
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          max_uses?: number | null
          percent_off?: number
          redemptions?: number
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          language: string
          level: Database["public"]["Enums"]["course_level"]
          price_cents: number
          published_at: string | null
          search_tsv: unknown
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          price_cents?: number
          published_at?: string | null
          search_tsv?: unknown
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          price_cents?: number
          published_at?: string | null
          search_tsv?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_profile_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
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
          {
            foreignKeyName: "enrollments_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_overrides: {
        Row: {
          created_at: string
          id: string
          instructor_id: string
          original_score: number
          override_score: number
          response_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructor_id: string
          original_score: number
          override_score: number
          response_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructor_id?: string
          original_score?: number
          override_score?: number
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_overrides_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_overrides_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "assessment_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_applications: {
        Row: {
          background: string
          created_at: string
          expertise: string
          id: string
          portfolio_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          statement: string
          status: string
          user_id: string
        }
        Insert: {
          background: string
          created_at?: string
          expertise: string
          id?: string
          portfolio_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement: string
          status?: string
          user_id: string
        }
        Update: {
          background?: string
          created_at?: string
          expertise?: string
          id?: string
          portfolio_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      lecture_progress: {
        Row: {
          completed: boolean
          last_position_seconds: number
          lecture_id: string
          seconds_watched: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          last_position_seconds?: number
          lecture_id: string
          seconds_watched?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          last_position_seconds?: number
          lecture_id?: string
          seconds_watched?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          is_preview: boolean
          position: number
          section_id: string
          title: string
          video_path: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          position?: number
          section_id: string
          title: string
          video_path?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          position?: number
          section_id?: string
          title?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          coupon_id: string | null
          course_id: string
          created_at: string
          currency: string
          discount_cents: number
          id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          coupon_id?: string | null
          course_id: string
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          coupon_id?: string | null
          course_id?: string
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          order_id: string
          phone: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref: string | null
          raw_callback: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_id: string
          phone?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          raw_callback?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_id?: string
          phone?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          raw_callback?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          course_id: string
          created_at: string
          gross_cents: number
          id: string
          instructor_id: string
          net_cents: number
          order_id: string
          platform_fee_cents: number
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          course_id: string
          created_at?: string
          gross_cents: number
          id?: string
          instructor_id: string
          net_cents: number
          order_id: string
          platform_fee_cents: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          course_id?: string
          created_at?: string
          gross_cents?: number
          id?: string
          instructor_id?: string
          net_cents?: number
          order_id?: string
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          body: string
          course_id: string
          created_at: string
          hidden: boolean
          id: string
          lecture_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          hidden?: boolean
          id?: string
          lecture_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          hidden?: boolean
          id?: string
          lecture_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          hidden: boolean
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          hidden?: boolean
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          hidden?: boolean
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_attempts: {
        Row: {
          applicant_id: string
          application_id: string
          id: string
          score: number | null
          started_at: string
          state: string
          submitted_at: string | null
        }
        Insert: {
          applicant_id: string
          application_id: string
          id?: string
          score?: number | null
          started_at?: string
          state?: string
          submitted_at?: string | null
        }
        Update: {
          applicant_id?: string
          application_id?: string
          id?: string
          score?: number | null
          started_at?: string
          state?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_attempts_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_attempts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "instructor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_responses: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          attempt_id: string
          created_at: string
          id: string
          model_answer: string | null
          options: Json | null
          question_index: number
          question_stem: string
          question_type: string
          response_text: string | null
          rubric: string
          selected_option: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id: string
          created_at?: string
          id?: string
          model_answer?: string | null
          options?: Json | null
          question_index: number
          question_stem: string
          question_type: string
          response_text?: string | null
          rubric: string
          selected_option?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id?: string
          created_at?: string
          id?: string
          model_answer?: string | null
          options?: Json | null
          question_index?: number
          question_stem?: string
          question_type?: string
          response_text?: string | null
          rubric?: string
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "screening_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          course_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_instructor_application: {
        Args: { application_id: string }
        Returns: undefined
      }
      compute_weighted_score: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: number
      }
      get_lecture_completion_pct: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_instructor_application: {
        Args: { application_id: string; reason?: string }
        Returns: undefined
      }
      reset_student_attempts: {
        Args: { p_assessment_id: string; p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "instructor" | "admin"
      course_level: "beginner" | "intermediate" | "advanced" | "all"
      course_status: "draft" | "published"
      order_status:
        | "pending"
        | "awaiting_payment"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
      payment_provider: "mpesa"
      payment_status:
        | "initiated"
        | "pending"
        | "success"
        | "failed"
        | "cancelled"
      payout_status: "accrued" | "paid"
      report_status: "open" | "resolved" | "dismissed"
      report_target: "review" | "question" | "answer" | "course"
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
      app_role: ["student", "instructor", "admin"],
      course_level: ["beginner", "intermediate", "advanced", "all"],
      course_status: ["draft", "published"],
      order_status: [
        "pending",
        "awaiting_payment",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      payment_provider: ["mpesa"],
      payment_status: [
        "initiated",
        "pending",
        "success",
        "failed",
        "cancelled",
      ],
      payout_status: ["accrued", "paid"],
      report_status: ["open", "resolved", "dismissed"],
      report_target: ["review", "question", "answer", "course"],
    },
  },
} as const

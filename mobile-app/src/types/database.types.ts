export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string
          code: string
          name: string
          full_name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          full_name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          full_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          branch_id: string | null
          year: number | null
          semester: number | null
          roll_number: string | null
          course: string | null
          photo_url: string | null
          is_admin: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          branch_id?: string | null
          year?: number | null
          semester?: number | null
          roll_number?: string | null
          course?: string | null
          photo_url?: string | null
          is_admin?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          branch_id?: string | null
          year?: number | null
          semester?: number | null
          roll_number?: string | null
          course?: string | null
          photo_url?: string | null
          is_admin?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          file_url: string
          file_type: string | null
          file_size: number | null
          tags: string[] | null
          uploaded_by: string | null
          verified_by: string | null
          is_verified: boolean
          download_count: number
          created_at: string
          updated_at: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          poster_url: string | null
          event_date: string
          start_time: string | null
          end_time: string | null
          location: string | null
          organizer: string | null
          categories: string[] | null
          target_branches: string[] | null
          target_semesters: number[] | null
          max_participants: number | null
          registration_deadline: string | null
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
      }
      opportunities: {
        Row: {
          id: string
          title: string
          type: string
          company_name: string | null
          description: string
          eligibility: string | null
          target_branches: string[] | null
          target_years: number[] | null
          application_link: string | null
          deadline: string | null
          stipend: string | null
          location: string | null
          is_remote: boolean
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
      }
      forum_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          subject_id: string | null
          tags: string[] | null
          status: string
          is_resolved: boolean
          view_count: number
          reported_by: string[] | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}

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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcement_recipients: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          client_org_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          provider_id: string
          recruiter_id: string
          specialty: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_org_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          recruiter_id: string
          specialty?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_org_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          recruiter_id?: string
          specialty?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          bucket: string
          category: Database["public"]["Enums"]["doc_category"]
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          org_id: string | null
          original_filename: string
          owner_id: string
          role_visibility: Database["public"]["Enums"]["app_role"][]
          storage_path: string
          updated_at: string
          updated_by: string | null
          uploader_id: string
        }
        Insert: {
          bucket?: string
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          org_id?: string | null
          original_filename: string
          owner_id: string
          role_visibility?: Database["public"]["Enums"]["app_role"][]
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          uploader_id: string
        }
        Update: {
          bucket?: string
          category?: Database["public"]["Enums"]["doc_category"]
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          org_id?: string | null
          original_filename?: string
          owner_id?: string
          role_visibility?: Database["public"]["Enums"]["app_role"][]
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      hr_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      monthly_availability_requests: {
        Row: {
          created_at: string
          deadline: string
          id: string
          month_year: string
          no_changes: boolean
          provider_id: string
          status: Database["public"]["Enums"]["monthly_avail_status"]
          submission_group_id: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          month_year: string
          no_changes?: boolean
          provider_id: string
          status?: Database["public"]["Enums"]["monthly_avail_status"]
          submission_group_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          month_year?: string
          no_changes?: boolean
          provider_id?: string
          status?: Database["public"]["Enums"]["monthly_avail_status"]
          submission_group_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      optum_pocs: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          work_site_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          work_site_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          work_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optum_pocs_work_site_id_fkey"
            columns: ["work_site_id"]
            isOneToOne: false
            referencedRelation: "work_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string
          created_at: string
          created_by: string | null
          email: string | null
          employment_type: string | null
          facility_location: string | null
          facility_name: string | null
          full_name: string | null
          id: string
          liaison_email: string | null
          liaison_id: string | null
          liaison_name: string | null
          liaison_phone: string | null
          phone: string | null
          portal_type: string | null
          primary_facility_id: string | null
          provider_id: string | null
          recruiter_email: string | null
          recruiter_id: string | null
          recruiter_name: string | null
          recruiter_phone: string | null
          region: string | null
          schedule_type: string
          specialty: string | null
          state: string | null
          states_licensed: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          work_schedule: string | null
        }
        Insert: {
          company?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          facility_location?: string | null
          facility_name?: string | null
          full_name?: string | null
          id?: string
          liaison_email?: string | null
          liaison_id?: string | null
          liaison_name?: string | null
          liaison_phone?: string | null
          phone?: string | null
          portal_type?: string | null
          primary_facility_id?: string | null
          provider_id?: string | null
          recruiter_email?: string | null
          recruiter_id?: string | null
          recruiter_name?: string | null
          recruiter_phone?: string | null
          region?: string | null
          schedule_type?: string
          specialty?: string | null
          state?: string | null
          states_licensed?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          work_schedule?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string | null
          facility_location?: string | null
          facility_name?: string | null
          full_name?: string | null
          id?: string
          liaison_email?: string | null
          liaison_id?: string | null
          liaison_name?: string | null
          liaison_phone?: string | null
          phone?: string | null
          portal_type?: string | null
          primary_facility_id?: string | null
          provider_id?: string | null
          recruiter_email?: string | null
          recruiter_id?: string | null
          recruiter_name?: string | null
          recruiter_phone?: string | null
          region?: string | null
          schedule_type?: string
          specialty?: string | null
          state?: string | null
          states_licensed?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          work_schedule?: string | null
        }
        Relationships: []
      }
      provider_invites: {
        Row: {
          company: string
          created_at: string
          created_user_id: string | null
          email: string
          employment_type: string | null
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          liaison_id: string | null
          phone: string | null
          provider_id_external: string | null
          recruiter_id: string | null
          region: string | null
          specialty: string | null
          state: string | null
          token: string
          used_at: string | null
          work_schedule: string | null
          work_site_assignments: Json
        }
        Insert: {
          company?: string
          created_at?: string
          created_user_id?: string | null
          email: string
          employment_type?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          liaison_id?: string | null
          phone?: string | null
          provider_id_external?: string | null
          recruiter_id?: string | null
          region?: string | null
          specialty?: string | null
          state?: string | null
          token?: string
          used_at?: string | null
          work_schedule?: string | null
          work_site_assignments?: Json
        }
        Update: {
          company?: string
          created_at?: string
          created_user_id?: string | null
          email?: string
          employment_type?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          liaison_id?: string | null
          phone?: string | null
          provider_id_external?: string | null
          recruiter_id?: string | null
          region?: string | null
          specialty?: string | null
          state?: string | null
          token?: string
          used_at?: string | null
          work_schedule?: string | null
          work_site_assignments?: Json
        }
        Relationships: []
      }
      provider_work_sites: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          provider_id: string
          weekly_schedule: Json
          work_site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          provider_id: string
          weekly_schedule?: Json
          work_site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          provider_id?: string
          weekly_schedule?: Json
          work_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_work_sites_work_site_id_fkey"
            columns: ["work_site_id"]
            isOneToOne: false
            referencedRelation: "work_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_requests: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          end_date: string
          end_time: string | null
          expires_at: string | null
          id: string
          notes: string | null
          org_id: string | null
          provider_id: string
          recruiter_id: string | null
          specialty: string | null
          start_date: string
          start_time: string | null
          states_licensed: string | null
          status: Database["public"]["Enums"]["pto_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          end_time?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          provider_id: string
          recruiter_id?: string | null
          specialty?: string | null
          start_date: string
          start_time?: string | null
          states_licensed?: string | null
          status?: Database["public"]["Enums"]["pto_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          end_time?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          provider_id?: string
          recruiter_id?: string | null
          specialty?: string | null
          start_date?: string
          start_time?: string | null
          states_licensed?: string | null
          status?: Database["public"]["Enums"]["pto_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pto_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_emails: {
        Row: {
          cancel_if_field: string | null
          created_at: string
          id: string
          recipient_email: string
          recipient_user_id: string | null
          related_id: string | null
          related_table: string | null
          send_at: string
          sent_at: string | null
          status: string
          template_data: Json
          template_name: string
        }
        Insert: {
          cancel_if_field?: string | null
          created_at?: string
          id?: string
          recipient_email: string
          recipient_user_id?: string | null
          related_id?: string | null
          related_table?: string | null
          send_at: string
          sent_at?: string | null
          status?: string
          template_data?: Json
          template_name: string
        }
        Update: {
          cancel_if_field?: string | null
          created_at?: string
          id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          related_id?: string | null
          related_table?: string | null
          send_at?: string
          sent_at?: string | null
          status?: string
          template_data?: Json
          template_name?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          change_type: Database["public"]["Enums"]["time_off_change_type"]
          client_name: string
          created_at: string
          end_time: string | null
          id: string
          is_unavailable: boolean
          liaison_id: string | null
          notes: string | null
          pacr_document_id: string | null
          provider_id: string
          recruiter_id: string | null
          request_date: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["time_off_status"]
          submission_group_id: string | null
          updated_at: string
          work_site_id: string | null
        }
        Insert: {
          change_type?: Database["public"]["Enums"]["time_off_change_type"]
          client_name?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          liaison_id?: string | null
          notes?: string | null
          pacr_document_id?: string | null
          provider_id: string
          recruiter_id?: string | null
          request_date: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["time_off_status"]
          submission_group_id?: string | null
          updated_at?: string
          work_site_id?: string | null
        }
        Update: {
          change_type?: Database["public"]["Enums"]["time_off_change_type"]
          client_name?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          liaison_id?: string | null
          notes?: string | null
          pacr_document_id?: string | null
          provider_id?: string
          recruiter_id?: string | null
          request_date?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["time_off_status"]
          submission_group_id?: string | null
          updated_at?: string
          work_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_pacr_document_id_fkey"
            columns: ["pacr_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_work_site_id_fkey"
            columns: ["work_site_id"]
            isOneToOne: false
            referencedRelation: "work_sites"
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
      work_sites: {
        Row: {
          address: string | null
          city: string | null
          client_name: string
          created_at: string
          facility_name: string
          id: string
          latitude: number | null
          longitude: number | null
          region: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_name?: string
          created_at?: string
          facility_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_name?: string
          created_at?: string
          facility_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to: {
        Args: { _provider_id: string; _staff_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: Database["public"]["Enums"]["audit_action"]
          _details?: Json
          _resource_id?: string
          _resource_type?: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "internal_staff" | "client_user" | "provider_user"
      assignment_status: "active" | "completed" | "pending" | "cancelled"
      audit_action:
        | "login"
        | "logout"
        | "login_failed"
        | "file_upload"
        | "file_download"
        | "file_delete"
        | "role_change"
        | "access_denied"
        | "record_create"
        | "record_update"
        | "record_delete"
      doc_category:
        | "contract"
        | "confirmation_letter"
        | "onboarding"
        | "credentialing"
        | "cv_packet"
        | "invoice"
        | "w9"
        | "direct_deposit"
        | "general"
      monthly_avail_status: "requested" | "submitted" | "overdue"
      org_type: "client" | "provider_agency" | "internal"
      pto_status:
        | "available"
        | "submitted"
        | "being_presented"
        | "booked"
        | "no_longer_available"
      time_off_change_type: "remove_day" | "add_day"
      time_off_status: "pending_review" | "approved" | "denied" | "withdrawn"
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
      app_role: ["admin", "internal_staff", "client_user", "provider_user"],
      assignment_status: ["active", "completed", "pending", "cancelled"],
      audit_action: [
        "login",
        "logout",
        "login_failed",
        "file_upload",
        "file_download",
        "file_delete",
        "role_change",
        "access_denied",
        "record_create",
        "record_update",
        "record_delete",
      ],
      doc_category: [
        "contract",
        "confirmation_letter",
        "onboarding",
        "credentialing",
        "cv_packet",
        "invoice",
        "w9",
        "direct_deposit",
        "general",
      ],
      monthly_avail_status: ["requested", "submitted", "overdue"],
      org_type: ["client", "provider_agency", "internal"],
      pto_status: [
        "available",
        "submitted",
        "being_presented",
        "booked",
        "no_longer_available",
      ],
      time_off_change_type: ["remove_day", "add_day"],
      time_off_status: ["pending_review", "approved", "denied", "withdrawn"],
    },
  },
} as const

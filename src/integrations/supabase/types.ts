export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_chat_conversations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_message_at: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          ai_provider: string | null
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          ai_provider?: string | null
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          ai_provider?: string | null
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          document_name: string
          document_type: Database["public"]["Enums"]["employee_document_type"]
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          observations: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          document_name: string
          document_type?: Database["public"]["Enums"]["employee_document_type"]
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["employee_document_type"]
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_family_members: {
        Row: {
          age: number | null
          candidate_id: string
          company_id: string
          created_at: string
          full_name: string
          gender: string | null
          id: string
          observations: string | null
          relationship: string
        }
        Insert: {
          age?: number | null
          candidate_id: string
          company_id: string
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          observations?: string | null
          relationship: string
        }
        Update: {
          age?: number | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          observations?: string | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_family_members_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_family_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address: string | null
          application_date: string
          birth_date: string | null
          blood_type: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_company: string | null
          current_position: string | null
          current_step:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url: string | null
          department: string | null
          disability_type: string | null
          document_issue_city: string | null
          document_issue_date: string | null
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          education_level: string | null
          education_level_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          ethnic_group: string | null
          experience_years: number | null
          final_concept: string | null
          final_score: number | null
          first_name: string
          gender: string | null
          gender_identity: string | null
          gender_identity_other: string | null
          general_notes: string | null
          id: string
          identification_type_id: string | null
          is_conflict_victim: boolean | null
          is_demobilized: boolean | null
          is_first_job: boolean | null
          is_head_of_household: boolean | null
          is_selected: boolean | null
          last_name: string
          marital_status: string | null
          mobile: string | null
          neighborhood: string | null
          phone: string | null
          profession: string | null
          profession_id: string | null
          rehire_employee_id: string | null
          rejection_reason: string | null
          salary_expectation: number | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          strengths: string | null
          thanks_sent_at: string | null
          updated_at: string
          vacancy_id: string
          weaknesses: string | null
          withdrawal_reason: string | null
        }
        Insert: {
          address?: string | null
          application_date?: string
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          current_step?:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url?: string | null
          department?: string | null
          disability_type?: string | null
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          education_level_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          ethnic_group?: string | null
          experience_years?: number | null
          final_concept?: string | null
          final_score?: number | null
          first_name: string
          gender?: string | null
          gender_identity?: string | null
          gender_identity_other?: string | null
          general_notes?: string | null
          id?: string
          identification_type_id?: string | null
          is_conflict_victim?: boolean | null
          is_demobilized?: boolean | null
          is_first_job?: boolean | null
          is_head_of_household?: boolean | null
          is_selected?: boolean | null
          last_name: string
          marital_status?: string | null
          mobile?: string | null
          neighborhood?: string | null
          phone?: string | null
          profession?: string | null
          profession_id?: string | null
          rehire_employee_id?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          strengths?: string | null
          thanks_sent_at?: string | null
          updated_at?: string
          vacancy_id: string
          weaknesses?: string | null
          withdrawal_reason?: string | null
        }
        Update: {
          address?: string | null
          application_date?: string
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          current_step?:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url?: string | null
          department?: string | null
          disability_type?: string | null
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          education_level_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          ethnic_group?: string | null
          experience_years?: number | null
          final_concept?: string | null
          final_score?: number | null
          first_name?: string
          gender?: string | null
          gender_identity?: string | null
          gender_identity_other?: string | null
          general_notes?: string | null
          id?: string
          identification_type_id?: string | null
          is_conflict_victim?: boolean | null
          is_demobilized?: boolean | null
          is_first_job?: boolean | null
          is_head_of_household?: boolean | null
          is_selected?: boolean | null
          last_name?: string
          marital_status?: string | null
          mobile?: string | null
          neighborhood?: string | null
          phone?: string | null
          profession?: string | null
          profession_id?: string | null
          rehire_employee_id?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          strengths?: string | null
          thanks_sent_at?: string | null
          updated_at?: string
          vacancy_id?: string
          weaknesses?: string | null
          withdrawal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_education_level_id_fkey"
            columns: ["education_level_id"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_identification_type_id_fkey"
            columns: ["identification_type_id"]
            isOneToOne: false
            referencedRelation: "identification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "professions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_rehire_employee_id_fkey"
            columns: ["rehire_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_afc: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_afc_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_afp: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_afp_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_arl: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_arl_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_banks: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_banks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_ccf: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_ccf_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_eps: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_eps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_ips: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_ips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cesantias_deposits: {
        Row: {
          average_salary: number | null
          base_salary: number
          calculation_end_date: string
          calculation_start_date: string
          cesantias_amount: number
          company_id: string
          created_at: string
          created_by: string | null
          days_worked: number
          deposit_date: string | null
          deposit_document_url: string | null
          due_date: string
          employee_id: string
          fund_account: string | null
          fund_name: string
          id: string
          is_late: boolean | null
          late_days: number | null
          observations: string | null
          status: Database["public"]["Enums"]["cesantias_status"]
          updated_at: string
          year: number
        }
        Insert: {
          average_salary?: number | null
          base_salary: number
          calculation_end_date: string
          calculation_start_date: string
          cesantias_amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          days_worked?: number
          deposit_date?: string | null
          deposit_document_url?: string | null
          due_date: string
          employee_id: string
          fund_account?: string | null
          fund_name: string
          id?: string
          is_late?: boolean | null
          late_days?: number | null
          observations?: string | null
          status?: Database["public"]["Enums"]["cesantias_status"]
          updated_at?: string
          year: number
        }
        Update: {
          average_salary?: number | null
          base_salary?: number
          calculation_end_date?: string
          calculation_start_date?: string
          cesantias_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          days_worked?: number
          deposit_date?: string | null
          deposit_document_url?: string | null
          due_date?: string
          employee_id?: string
          fund_account?: string | null
          fund_name?: string
          id?: string
          is_late?: boolean | null
          late_days?: number | null
          observations?: string | null
          status?: Database["public"]["Enums"]["cesantias_status"]
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cesantias_deposits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cesantias_deposits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      cesantias_interest_payments: {
        Row: {
          cesantias_balance: number
          company_id: string
          created_at: string
          created_by: string | null
          days_accrued: number
          due_date: string
          employee_id: string
          id: string
          interest_amount: number
          interest_rate: number
          is_late: boolean | null
          is_paid: boolean | null
          late_days: number | null
          observations: string | null
          payment_date: string | null
          payment_document_url: string | null
          updated_at: string
          year: number
        }
        Insert: {
          cesantias_balance: number
          company_id: string
          created_at?: string
          created_by?: string | null
          days_accrued?: number
          due_date: string
          employee_id: string
          id?: string
          interest_amount: number
          interest_rate?: number
          is_late?: boolean | null
          is_paid?: boolean | null
          late_days?: number | null
          observations?: string | null
          payment_date?: string | null
          payment_document_url?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          cesantias_balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          days_accrued?: number
          due_date?: string
          employee_id?: string
          id?: string
          interest_amount?: number
          interest_rate?: number
          is_late?: boolean | null
          is_paid?: boolean | null
          late_days?: number | null
          observations?: string | null
          payment_date?: string | null
          payment_document_url?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cesantias_interest_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cesantias_interest_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      cesantias_withdrawals: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          authorization_date: string | null
          authorization_document_url: string | null
          beneficiary_document: string | null
          beneficiary_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          destination_description: string | null
          disbursement_date: string | null
          employee_id: string
          fund_name: string
          id: string
          observations: string | null
          rejection_reason: string | null
          request_date: string
          request_document_url: string | null
          status: string
          updated_at: string
          withdrawal_reason: Database["public"]["Enums"]["cesantias_withdrawal_reason"]
        }
        Insert: {
          amount_approved?: number | null
          amount_requested: number
          authorization_date?: string | null
          authorization_document_url?: string | null
          beneficiary_document?: string | null
          beneficiary_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          destination_description?: string | null
          disbursement_date?: string | null
          employee_id: string
          fund_name: string
          id?: string
          observations?: string | null
          rejection_reason?: string | null
          request_date?: string
          request_document_url?: string | null
          status?: string
          updated_at?: string
          withdrawal_reason: Database["public"]["Enums"]["cesantias_withdrawal_reason"]
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          authorization_date?: string | null
          authorization_document_url?: string | null
          beneficiary_document?: string | null
          beneficiary_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          destination_description?: string | null
          disbursement_date?: string | null
          employee_id?: string
          fund_name?: string
          id?: string
          observations?: string | null
          rejection_reason?: string | null
          request_date?: string
          request_document_url?: string | null
          status?: string
          updated_at?: string
          withdrawal_reason?: Database["public"]["Enums"]["cesantias_withdrawal_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "cesantias_withdrawals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cesantias_withdrawals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          bucket_id: string
          company_id: string
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          expires_at: string
          file_name: string
          file_size: number
          height: number | null
          id: string
          message_id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          bucket_id?: string
          company_id: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          file_name: string
          file_size?: number
          height?: number | null
          id?: string
          message_id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          bucket_id?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          file_name?: string
          file_size?: number
          height?: number | null
          id?: string
          message_id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          last_message_at: string | null
          last_message_id: string | null
          last_message_preview: string | null
          title: string | null
          type: Database["public"]["Enums"]["chat_conversation_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["chat_conversation_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["chat_conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_receipts: {
        Row: {
          company_id: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          message_id: string
          read_at: string | null
          status: Database["public"]["Enums"]["chat_receipt_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_id: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["chat_receipt_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_id?: string
          read_at?: string | null
          status?: Database["public"]["Enums"]["chat_receipt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_receipts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          company_id: string
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          expires_at: string
          id: string
          message_type: Database["public"]["Enums"]["chat_message_type"]
          metadata: Json
          reply_to_message_id: string | null
          sender_id: string
        }
        Insert: {
          company_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          expires_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json
          reply_to_message_id?: string | null
          sender_id: string
        }
        Update: {
          company_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          expires_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json
          reply_to_message_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          archived_at: string | null
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          pinned_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          pinned_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_reactions: {
        Row: {
          company_id: string
          conversation_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          conversation_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          conversation_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          horizontal_logo_url: string | null
          id: string
          logo_url: string | null
          name: string
          nit: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          horizontal_logo_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          nit: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          horizontal_logo_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          nit?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_holidays: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          holiday_date: string
          id: string
          is_active: boolean | null
          is_national: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          holiday_date: string
          id?: string
          is_active?: boolean | null
          is_national?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
          is_active?: boolean | null
          is_national?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_evidences: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          evidence_date: string
          file_name: string | null
          file_url: string | null
          id: string
          obligation_id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          evidence_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          obligation_id: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          evidence_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          obligation_id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evidences_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "compliance_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_obligation_templates: {
        Row: {
          created_at: string
          default_priority: Database["public"]["Enums"]["compliance_priority"]
          description: string | null
          domain: Database["public"]["Enums"]["compliance_domain"]
          id: string
          is_active: boolean
          legal_reference: string | null
          recommended_evidence: string | null
          suggested_frequency: string | null
          title: string
        }
        Insert: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["compliance_priority"]
          description?: string | null
          domain: Database["public"]["Enums"]["compliance_domain"]
          id?: string
          is_active?: boolean
          legal_reference?: string | null
          recommended_evidence?: string | null
          suggested_frequency?: string | null
          title: string
        }
        Update: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["compliance_priority"]
          description?: string | null
          domain?: Database["public"]["Enums"]["compliance_domain"]
          id?: string
          is_active?: boolean
          legal_reference?: string | null
          recommended_evidence?: string | null
          suggested_frequency?: string | null
          title?: string
        }
        Relationships: []
      }
      compliance_obligations: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain: Database["public"]["Enums"]["compliance_domain"]
          due_date: string | null
          id: string
          legal_reference: string | null
          notes: string | null
          period_label: string | null
          priority: Database["public"]["Enums"]["compliance_priority"]
          progress: number
          recurrence: string | null
          requires_evidence: boolean
          responsible_role_id: string | null
          responsible_user_id: string | null
          source_module: string | null
          source_record_id: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain: Database["public"]["Enums"]["compliance_domain"]
          due_date?: string | null
          id?: string
          legal_reference?: string | null
          notes?: string | null
          period_label?: string | null
          priority?: Database["public"]["Enums"]["compliance_priority"]
          progress?: number
          recurrence?: string | null
          requires_evidence?: boolean
          responsible_role_id?: string | null
          responsible_user_id?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: Database["public"]["Enums"]["compliance_domain"]
          due_date?: string | null
          id?: string
          legal_reference?: string | null
          notes?: string | null
          period_label?: string | null
          priority?: Database["public"]["Enums"]["compliance_priority"]
          progress?: number
          recurrence?: string | null
          requires_evidence?: boolean
          responsible_role_id?: string | null
          responsible_user_id?: string | null
          source_module?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_obligations_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_obligations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "compliance_obligation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_extensions: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          end_date: string
          extension_number: number
          extension_type: string
          id: string
          new_salary: number | null
          reason: string | null
          start_date: string
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date: string
          extension_number: number
          extension_type?: string
          id?: string
          new_salary?: number | null
          reason?: string | null
          start_date: string
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string
          extension_number?: number
          extension_type?: string
          id?: string
          new_salary?: number | null
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_extensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_extensions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_sequences: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_number: number
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_type_config: {
        Row: {
          company_id: string
          contract_type: string
          created_at: string
          default_trial_days: number | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          max_duration_months: number | null
          max_extensions: number | null
          requires_end_date: boolean | null
          template_file_name: string | null
          template_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_type: string
          created_at?: string
          default_trial_days?: number | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_duration_months?: number | null
          max_extensions?: number | null
          requires_end_date?: boolean | null
          template_file_name?: string | null
          template_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_type?: string
          created_at?: string
          default_trial_days?: number | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_duration_months?: number | null
          max_extensions?: number | null
          requires_end_date?: boolean | null
          template_file_name?: string | null
          template_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_type_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contract_number: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          document_url: string | null
          employee_id: string
          employment_cycle_id: string | null
          end_date: string | null
          has_confidentiality_clause: boolean | null
          has_non_compete_clause: boolean | null
          id: string
          is_approved: boolean | null
          is_terminated: boolean | null
          other_allowances: number | null
          salary: number
          salary_type: string | null
          special_clauses: string | null
          start_date: string
          termination_date: string | null
          termination_reason: string | null
          transport_allowance: number | null
          trial_end_date: string | null
          trial_period_days: number | null
          updated_at: string
          work_address: string | null
          work_city: string | null
          work_labor_description: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contract_number?: string | null
          contract_type: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          end_date?: string | null
          has_confidentiality_clause?: boolean | null
          has_non_compete_clause?: boolean | null
          id?: string
          is_approved?: boolean | null
          is_terminated?: boolean | null
          other_allowances?: number | null
          salary: number
          salary_type?: string | null
          special_clauses?: string | null
          start_date: string
          termination_date?: string | null
          termination_reason?: string | null
          transport_allowance?: number | null
          trial_end_date?: string | null
          trial_period_days?: number | null
          updated_at?: string
          work_address?: string | null
          work_city?: string | null
          work_labor_description?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          end_date?: string | null
          has_confidentiality_clause?: boolean | null
          has_non_compete_clause?: boolean | null
          id?: string
          is_approved?: boolean | null
          is_terminated?: boolean | null
          other_allowances?: number | null
          salary?: number
          salary_type?: string | null
          special_clauses?: string | null
          start_date?: string
          termination_date?: string | null
          termination_reason?: string | null
          transport_allowance?: number | null
          trial_end_date?: string | null
          trial_period_days?: number | null
          updated_at?: string
          work_address?: string | null
          work_city?: string | null
          work_labor_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_defense_tokens: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          expires_at: string
          id: string
          is_used: boolean
          process_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          expires_at: string
          id?: string
          is_used?: boolean
          process_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          process_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_defense_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_defense_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_defense_tokens_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "disciplinary_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_defenses: {
        Row: {
          company_id: string
          content: string
          created_at: string
          defense_date: string
          defense_type: string
          document_url: string | null
          id: string
          process_id: string
          received_by: string | null
          received_by_id: string | null
          submitted_via_token: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          defense_date: string
          defense_type: string
          document_url?: string | null
          id?: string
          process_id: string
          received_by?: string | null
          received_by_id?: string | null
          submitted_via_token?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          defense_date?: string
          defense_type?: string
          document_url?: string | null
          id?: string
          process_id?: string
          received_by?: string | null
          received_by_id?: string | null
          submitted_via_token?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_defenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_defenses_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "disciplinary_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_evidence: {
        Row: {
          collected_by: string | null
          collected_date: string
          company_id: string
          created_at: string
          description: string
          evidence_type: string
          file_name: string | null
          file_url: string | null
          id: string
          process_id: string
          updated_at: string
        }
        Insert: {
          collected_by?: string | null
          collected_date?: string
          company_id: string
          created_at?: string
          description: string
          evidence_type: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          process_id: string
          updated_at?: string
        }
        Update: {
          collected_by?: string | null
          collected_date?: string
          company_id?: string
          created_at?: string
          description?: string
          evidence_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          process_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_evidence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_evidence_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "disciplinary_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_processes: {
        Row: {
          appeal_date: string | null
          appeal_decision_date: string | null
          appeal_document_url: string | null
          appeal_resolution: string | null
          article_violated: string | null
          case_number: string
          closing_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          decision_date: string | null
          decision_document_url: string | null
          decision_maker_id: string | null
          decision_maker_name: string | null
          decision_summary: string | null
          employee_id: string
          facts_description: string
          fault_date: string
          fault_type: Database["public"]["Enums"]["fault_type"]
          has_appeal: boolean | null
          hearing_date: string | null
          hearing_document_url: string | null
          id: string
          investigator_id: string | null
          investigator_name: string | null
          notification_date: string | null
          notification_document_url: string | null
          observations: string | null
          opening_date: string
          opening_document_url: string | null
          sanction_days: number | null
          sanction_end_date: string | null
          sanction_start_date: string | null
          sanction_type: Database["public"]["Enums"]["sanction_type"] | null
          status: Database["public"]["Enums"]["disciplinary_status"]
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          appeal_date?: string | null
          appeal_decision_date?: string | null
          appeal_document_url?: string | null
          appeal_resolution?: string | null
          article_violated?: string | null
          case_number: string
          closing_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          decision_document_url?: string | null
          decision_maker_id?: string | null
          decision_maker_name?: string | null
          decision_summary?: string | null
          employee_id: string
          facts_description: string
          fault_date: string
          fault_type: Database["public"]["Enums"]["fault_type"]
          has_appeal?: boolean | null
          hearing_date?: string | null
          hearing_document_url?: string | null
          id?: string
          investigator_id?: string | null
          investigator_name?: string | null
          notification_date?: string | null
          notification_document_url?: string | null
          observations?: string | null
          opening_date?: string
          opening_document_url?: string | null
          sanction_days?: number | null
          sanction_end_date?: string | null
          sanction_start_date?: string | null
          sanction_type?: Database["public"]["Enums"]["sanction_type"] | null
          status?: Database["public"]["Enums"]["disciplinary_status"]
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          appeal_date?: string | null
          appeal_decision_date?: string | null
          appeal_document_url?: string | null
          appeal_resolution?: string | null
          article_violated?: string | null
          case_number?: string
          closing_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          decision_date?: string | null
          decision_document_url?: string | null
          decision_maker_id?: string | null
          decision_maker_name?: string | null
          decision_summary?: string | null
          employee_id?: string
          facts_description?: string
          fault_date?: string
          fault_type?: Database["public"]["Enums"]["fault_type"]
          has_appeal?: boolean | null
          hearing_date?: string | null
          hearing_document_url?: string | null
          id?: string
          investigator_id?: string | null
          investigator_name?: string | null
          notification_date?: string | null
          notification_document_url?: string | null
          observations?: string | null
          opening_date?: string
          opening_document_url?: string | null
          sanction_days?: number | null
          sanction_end_date?: string | null
          sanction_start_date?: string | null
          sanction_type?: Database["public"]["Enums"]["sanction_type"] | null
          status?: Database["public"]["Enums"]["disciplinary_status"]
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_processes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_timeline: {
        Row: {
          action_date: string
          action_type: string
          company_id: string
          created_at: string
          description: string
          document_url: string | null
          id: string
          new_status: Database["public"]["Enums"]["disciplinary_status"] | null
          performed_by: string | null
          performed_by_name: string | null
          previous_status:
            | Database["public"]["Enums"]["disciplinary_status"]
            | null
          process_id: string
        }
        Insert: {
          action_date?: string
          action_type: string
          company_id: string
          created_at?: string
          description: string
          document_url?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["disciplinary_status"] | null
          performed_by?: string | null
          performed_by_name?: string | null
          previous_status?:
            | Database["public"]["Enums"]["disciplinary_status"]
            | null
          process_id: string
        }
        Update: {
          action_date?: string
          action_type?: string
          company_id?: string
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["disciplinary_status"] | null
          performed_by?: string | null
          performed_by_name?: string | null
          previous_status?:
            | Database["public"]["Enums"]["disciplinary_status"]
            | null
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_timeline_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "disciplinary_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_expiry_alerts: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          document_id: string
          employee_id: string
          expires_at: string
          id: string
          notification_id: string | null
          notified_at: string | null
          status: Database["public"]["Enums"]["document_expiry_alert_status"]
          updated_at: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string
          document_id: string
          employee_id: string
          expires_at: string
          id?: string
          notification_id?: string | null
          notified_at?: string | null
          status?: Database["public"]["Enums"]["document_expiry_alert_status"]
          updated_at?: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string
          document_id?: string
          employee_id?: string
          expires_at?: string
          id?: string
          notification_id?: string | null
          notified_at?: string | null
          status?: Database["public"]["Enums"]["document_expiry_alert_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_expiry_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_expiry_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_expiry_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_expiry_alerts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_current: boolean
          mime_type: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_current?: boolean
          mime_type: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_current?: boolean
          mime_type?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: []
      }
      dotation_deliveries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delivered_by: string | null
          delivery_date: string
          document_url: string | null
          employee_id: string
          expiration_date: string
          id: string
          item_description: string | null
          item_name: string
          item_type: Database["public"]["Enums"]["dotation_item_type"]
          observations: string | null
          quantity: number
          received_by: string | null
          signature_url: string | null
          size: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          delivery_date: string
          document_url?: string | null
          employee_id: string
          expiration_date: string
          id?: string
          item_description?: string | null
          item_name: string
          item_type: Database["public"]["Enums"]["dotation_item_type"]
          observations?: string | null
          quantity?: number
          received_by?: string | null
          signature_url?: string | null
          size?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          delivery_date?: string
          document_url?: string | null
          employee_id?: string
          expiration_date?: string
          id?: string
          item_description?: string | null
          item_name?: string
          item_type?: Database["public"]["Enums"]["dotation_item_type"]
          observations?: string | null
          quantity?: number
          received_by?: string | null
          signature_url?: string | null
          size?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_deliveries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_deliveries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "dotation_delivery_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_delivery_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delivered_by: string | null
          delivery_date: string
          document_url: string | null
          employee_id: string
          id: string
          observations: string | null
          received_by: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          delivery_date: string
          document_url?: string | null
          employee_id: string
          id?: string
          observations?: string | null
          received_by?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivered_by?: string | null
          delivery_date?: string
          document_url?: string | null
          employee_id?: string
          id?: string
          observations?: string | null
          received_by?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_delivery_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_delivery_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_inventory: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_name: string
          item_type: string
          minimum_stock: number
          operation_center_id: string | null
          quantity_available: number
          size: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name: string
          item_type: string
          minimum_stock?: number
          operation_center_id?: string | null
          quantity_available?: number
          size?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name?: string
          item_type?: string
          minimum_stock?: number
          operation_center_id?: string | null
          quantity_available?: number
          size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_inventory_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_inventory_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          quantity: number
          reason: string | null
          reference_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          movement_type: string
          new_stock?: number
          previous_stock?: number
          quantity: number
          reason?: string | null
          reference_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          quantity?: number
          reason?: string | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dotation_inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "dotation_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_item_types: {
        Row: {
          category: string
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          default_validity_months: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          requires_size: boolean | null
          sizes_available: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          default_validity_months?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          requires_size?: boolean | null
          sizes_available?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_validity_months?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          requires_size?: boolean | null
          sizes_available?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_item_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_profesiograma: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          operation_center_id: string
          position_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          operation_center_id: string
          position_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          operation_center_id?: string
          position_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_profesiograma_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_profesiograma_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_profesiograma_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      dotation_profesiograma_items: {
        Row: {
          company_id: string
          created_at: string
          dotation_item_type_id: string
          id: string
          is_required: boolean
          notes: string | null
          profesiograma_id: string
          quantity: number
        }
        Insert: {
          company_id: string
          created_at?: string
          dotation_item_type_id: string
          id?: string
          is_required?: boolean
          notes?: string | null
          profesiograma_id: string
          quantity?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          dotation_item_type_id?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          profesiograma_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dotation_profesiograma_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_profesiograma_items_dotation_item_type_id_fkey"
            columns: ["dotation_item_type_id"]
            isOneToOne: false
            referencedRelation: "dotation_item_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dotation_profesiograma_items_profesiograma_id_fkey"
            columns: ["profesiograma_id"]
            isOneToOne: false
            referencedRelation: "dotation_profesiograma"
            referencedColumns: ["id"]
          },
        ]
      }
      education_levels: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_bank_info: {
        Row: {
          account_number: string | null
          account_registered: boolean | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          bank_letter_url: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_current: boolean
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          account_number?: string | null
          account_registered?: boolean | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_letter_url?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          account_number?: string | null
          account_registered?: boolean | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          bank_letter_url?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_info_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          applies_to_position: boolean | null
          certification_name: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          company_id: string
          created_at: string
          document_url: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          is_valid: boolean
          issue_date: string | null
          license_category: string | null
          updated_at: string
        }
        Insert: {
          applies_to_position?: boolean | null
          certification_name?: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          company_id: string
          created_at?: string
          document_url?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          is_valid?: boolean
          issue_date?: string | null
          license_category?: string | null
          updated_at?: string
        }
        Update: {
          applies_to_position?: boolean | null
          certification_name?: string | null
          certification_type?: Database["public"]["Enums"]["certification_type"]
          company_id?: string
          created_at?: string
          document_url?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          is_valid?: boolean
          issue_date?: string | null
          license_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_change_requests: {
        Row: {
          company_id: string
          created_at: string
          current_value: string | null
          employee_id: string
          field_name: string
          id: string
          request_type: string
          requested_by: string
          requested_value: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_value?: string | null
          employee_id: string
          field_name: string
          id?: string
          request_type: string
          requested_by: string
          requested_value: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_value?: string | null
          employee_id?: string
          field_name?: string
          id?: string
          request_type?: string
          requested_by?: string
          requested_value?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_change_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contact: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_current: boolean
          mobile: string | null
          personal_email: string | null
          phone: string | null
          residence_address: string | null
          residence_city: string | null
          residence_department: string | null
          residence_letter_expiry: string | null
          residence_letter_url: string | null
          residence_neighborhood: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          mobile?: string | null
          personal_email?: string | null
          phone?: string | null
          residence_address?: string | null
          residence_city?: string | null
          residence_department?: string | null
          residence_letter_expiry?: string | null
          residence_letter_url?: string | null
          residence_neighborhood?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          mobile?: string | null
          personal_email?: string | null
          phone?: string | null
          residence_address?: string | null
          residence_city?: string | null
          residence_department?: string | null
          residence_letter_expiry?: string | null
          residence_letter_url?: string | null
          residence_neighborhood?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contact_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contact_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contact_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_deductions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          deduction_type: Database["public"]["Enums"]["deduction_type"]
          description: string
          document_url: string | null
          employee_id: string
          end_date: string | null
          entity_name: string | null
          id: string
          is_percentage: boolean
          is_recurring: boolean
          notes: string | null
          percentage_value: number | null
          reference_number: string | null
          start_date: string
          status: Database["public"]["Enums"]["deduction_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          deduction_type: Database["public"]["Enums"]["deduction_type"]
          description: string
          document_url?: string | null
          employee_id: string
          end_date?: string | null
          entity_name?: string | null
          id?: string
          is_percentage?: boolean
          is_recurring?: boolean
          notes?: string | null
          percentage_value?: number | null
          reference_number?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["deduction_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          deduction_type?: Database["public"]["Enums"]["deduction_type"]
          description?: string
          document_url?: string | null
          employee_id?: string
          end_date?: string | null
          entity_name?: string | null
          id?: string
          is_percentage?: boolean
          is_recurring?: boolean
          notes?: string | null
          percentage_value?: number | null
          reference_number?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["deduction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          company_id: string
          created_at: string
          document_name: string | null
          document_type: Database["public"]["Enums"]["employee_document_type"]
          employee_id: string
          employment_cycle_id: string | null
          expiry_date: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          is_valid: boolean
          mime_type: string | null
          observations: string | null
          updated_at: string
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_name?: string | null
          document_type: Database["public"]["Enums"]["employee_document_type"]
          employee_id: string
          employment_cycle_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_valid?: boolean
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_name?: string | null
          document_type?: Database["public"]["Enums"]["employee_document_type"]
          employee_id?: string
          employment_cycle_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_valid?: boolean
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_employment_cycles: {
        Row: {
          candidate_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          cycle_number: number
          employee_id: string
          end_date: string | null
          id: string
          source: Database["public"]["Enums"]["employment_cycle_source"]
          start_date: string
          status: Database["public"]["Enums"]["employment_cycle_status"]
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          cycle_number: number
          employee_id: string
          end_date?: string | null
          id?: string
          source?: Database["public"]["Enums"]["employment_cycle_source"]
          start_date: string
          status: Database["public"]["Enums"]["employment_cycle_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          cycle_number?: number
          employee_id?: string
          end_date?: string | null
          id?: string
          source?: Database["public"]["Enums"]["employment_cycle_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["employment_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_employment_cycles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_employment_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_employment_cycles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_family: {
        Row: {
          children_count: number | null
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_current: boolean
          spouse_birth_date: string | null
          spouse_gender: Database["public"]["Enums"]["gender_type"] | null
          spouse_name: string | null
          spouse_works: boolean | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          children_count?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          spouse_birth_date?: string | null
          spouse_gender?: Database["public"]["Enums"]["gender_type"] | null
          spouse_name?: string | null
          spouse_works?: boolean | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          children_count?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          spouse_birth_date?: string | null
          spouse_gender?: Database["public"]["Enums"]["gender_type"] | null
          spouse_name?: string | null
          spouse_works?: boolean | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_family_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_family_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_family_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_family_members: {
        Row: {
          age: number | null
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          full_name: string
          gender: string | null
          id: string
          observations: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          observations?: string | null
          relationship: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          observations?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_family_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_family_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_family_members_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_incapacities: {
        Row: {
          actual_payment_date: string | null
          afp_amount: number | null
          afp_days: number
          afp_name: string | null
          arl_amount: number | null
          arl_days: number
          arl_name: string | null
          certificate_number: string | null
          certificate_url: string | null
          cie10_code: string | null
          clinical_history_url: string | null
          company_id: string
          created_at: string
          created_by: string | null
          daily_base_salary: number | null
          diagnosis: string
          employee_id: string
          employer_amount: number | null
          employer_days: number
          end_date: string
          eps_amount: number | null
          eps_days: number
          eps_name: string | null
          expected_payment_date: string | null
          extension_number: number | null
          filing_date: string | null
          filing_number: string | null
          id: string
          is_extension: boolean
          medical_entity: string | null
          observations: string | null
          origin: Database["public"]["Enums"]["incapacity_origin"]
          parent_incapacity_id: string | null
          recovered_amount: number | null
          recovery_notes: string | null
          recovery_status: Database["public"]["Enums"]["recovery_status"]
          reintegration_exam_id: string | null
          requires_reintegration_exam: boolean
          start_date: string
          total_amount: number | null
          total_days: number
          treating_doctor: string | null
          updated_at: string
        }
        Insert: {
          actual_payment_date?: string | null
          afp_amount?: number | null
          afp_days?: number
          afp_name?: string | null
          arl_amount?: number | null
          arl_days?: number
          arl_name?: string | null
          certificate_number?: string | null
          certificate_url?: string | null
          cie10_code?: string | null
          clinical_history_url?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          daily_base_salary?: number | null
          diagnosis: string
          employee_id: string
          employer_amount?: number | null
          employer_days?: number
          end_date: string
          eps_amount?: number | null
          eps_days?: number
          eps_name?: string | null
          expected_payment_date?: string | null
          extension_number?: number | null
          filing_date?: string | null
          filing_number?: string | null
          id?: string
          is_extension?: boolean
          medical_entity?: string | null
          observations?: string | null
          origin?: Database["public"]["Enums"]["incapacity_origin"]
          parent_incapacity_id?: string | null
          recovered_amount?: number | null
          recovery_notes?: string | null
          recovery_status?: Database["public"]["Enums"]["recovery_status"]
          reintegration_exam_id?: string | null
          requires_reintegration_exam?: boolean
          start_date: string
          total_amount?: number | null
          total_days?: number
          treating_doctor?: string | null
          updated_at?: string
        }
        Update: {
          actual_payment_date?: string | null
          afp_amount?: number | null
          afp_days?: number
          afp_name?: string | null
          arl_amount?: number | null
          arl_days?: number
          arl_name?: string | null
          certificate_number?: string | null
          certificate_url?: string | null
          cie10_code?: string | null
          clinical_history_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          daily_base_salary?: number | null
          diagnosis?: string
          employee_id?: string
          employer_amount?: number | null
          employer_days?: number
          end_date?: string
          eps_amount?: number | null
          eps_days?: number
          eps_name?: string | null
          expected_payment_date?: string | null
          extension_number?: number | null
          filing_date?: string | null
          filing_number?: string | null
          id?: string
          is_extension?: boolean
          medical_entity?: string | null
          observations?: string | null
          origin?: Database["public"]["Enums"]["incapacity_origin"]
          parent_incapacity_id?: string | null
          recovered_amount?: number | null
          recovery_notes?: string | null
          recovery_status?: Database["public"]["Enums"]["recovery_status"]
          reintegration_exam_id?: string | null
          requires_reintegration_exam?: boolean
          start_date?: string
          total_amount?: number | null
          total_days?: number
          treating_doctor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_incapacities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incapacities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incapacities_parent_incapacity_id_fkey"
            columns: ["parent_incapacity_id"]
            isOneToOne: false
            referencedRelation: "employee_incapacities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incapacities_reintegration_exam_id_fkey"
            columns: ["reintegration_exam_id"]
            isOneToOne: false
            referencedRelation: "medical_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loan_payments: {
        Row: {
          amount: number
          balance_after: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payment_number: number
          payroll_period: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id: string
          notes?: string | null
          payment_date: string
          payment_number: number
          payroll_period?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payment_number?: number
          payroll_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_loan_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "employee_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          employee_id: string
          end_date: string | null
          id: string
          installment_amount: number
          installments: number
          interest_rate: number
          loan_type: Database["public"]["Enums"]["loan_type"]
          notes: string | null
          paid_amount: number
          paid_installments: number
          rejection_reason: string | null
          remaining_balance: number
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          total_amount: number
          total_with_interest: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          installment_amount: number
          installments?: number
          interest_rate?: number
          loan_type?: Database["public"]["Enums"]["loan_type"]
          notes?: string | null
          paid_amount?: number
          paid_installments?: number
          rejection_reason?: string | null
          remaining_balance: number
          start_date: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_amount: number
          total_with_interest: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          installment_amount?: number
          installments?: number
          interest_rate?: number
          loan_type?: Database["public"]["Enums"]["loan_type"]
          notes?: string | null
          paid_amount?: number
          paid_installments?: number
          rejection_reason?: string | null
          remaining_balance?: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_amount?: number
          total_with_interest?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_tasks: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_completed: boolean | null
          sort_order: number | null
          task_description: string | null
          task_key: string
          task_label: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_description?: string | null
          task_key: string
          task_label: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_description?: string | null
          task_key?: string
          task_label?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_tasks_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_operation_center_assignments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          employment_cycle_id: string | null
          id: string
          operation_center_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          operation_center_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          operation_center_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_operation_center_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_operation_center_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_operation_center_assignments_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_operation_center_assignments_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedule: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_current: boolean
          is_office_schedule: boolean | null
          payroll_type: Database["public"]["Enums"]["payroll_type"]
          rest_day: string | null
          shift_type_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          is_office_schedule?: boolean | null
          payroll_type?: Database["public"]["Enums"]["payroll_type"]
          rest_day?: string | null
          shift_type_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_current?: boolean
          is_office_schedule?: boolean | null
          payroll_type?: Database["public"]["Enums"]["payroll_type"]
          rest_day?: string | null
          shift_type_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedule_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedule_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedule_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_assignments: {
        Row: {
          assignment_date: string
          company_id: string
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          shift_id: string
          source: Database["public"]["Enums"]["shift_assignment_source"]
          updated_at: string | null
        }
        Insert: {
          assignment_date: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          shift_id: string
          source?: Database["public"]["Enums"]["shift_assignment_source"]
          updated_at?: string | null
        }
        Update: {
          assignment_date?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          shift_id?: string
          source?: Database["public"]["Enums"]["shift_assignment_source"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          notes: string | null
          shift_type_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          shift_type_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          shift_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_social_security: {
        Row: {
          afc: string | null
          afp: string | null
          arl: string | null
          ccf: string | null
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          eps: string | null
          id: string
          ips: string | null
          is_current: boolean
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          afc?: string | null
          afp?: string | null
          arl?: string | null
          ccf?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          eps?: string | null
          id?: string
          ips?: string | null
          is_current?: boolean
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          afc?: string | null
          afp?: string | null
          arl?: string | null
          ccf?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          eps?: string | null
          id?: string
          ips?: string | null
          is_current?: boolean
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_social_security_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_social_security_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_social_security_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_terminations: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_completed: boolean
          reason: string | null
          resignation_date: string | null
          termination_date: string
          termination_type: Database["public"]["Enums"]["termination_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date: string
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_completed?: boolean
          reason?: string | null
          resignation_date?: string | null
          termination_date: string
          termination_type: Database["public"]["Enums"]["termination_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_completed?: boolean
          reason?: string | null
          resignation_date?: string | null
          termination_date?: string
          termination_type?: Database["public"]["Enums"]["termination_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_terminations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_terminations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_terminations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_terminations_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_config: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          cycle_start_date: string | null
          employee_id: string
          employment_cycle_id: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          mode: Database["public"]["Enums"]["employee_time_mode"]
          notes: string | null
          shift_cycle_id: string | null
          start_date: string
          updated_at: string | null
          work_schedule_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          cycle_start_date?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mode: Database["public"]["Enums"]["employee_time_mode"]
          notes?: string | null
          shift_cycle_id?: string | null
          start_date: string
          updated_at?: string | null
          work_schedule_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          cycle_start_date?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mode?: Database["public"]["Enums"]["employee_time_mode"]
          notes?: string | null
          shift_cycle_id?: string | null
          start_date?: string
          updated_at?: string | null
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_config_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_config_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_config_shift_cycle_id_fkey"
            columns: ["shift_cycle_id"]
            isOneToOne: false
            referencedRelation: "shift_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_config_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          source_company_id: string
          source_employee_id: string
          status: Database["public"]["Enums"]["transfer_status"]
          target_company_id: string
          target_employee_id: string | null
          transfer_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_company_id: string
          source_employee_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
          target_company_id: string
          target_employee_id?: string | null
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_company_id?: string
          source_employee_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          target_company_id?: string
          target_employee_id?: string | null
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_transfers_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_source_employee_id_fkey"
            columns: ["source_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transfers_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_user_links: {
        Row: {
          employee_id: string
          id: string
          is_active: boolean
          linked_at: string
          linked_by: string | null
          user_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          is_active?: boolean
          linked_at?: string
          linked_by?: string | null
          user_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          is_active?: boolean
          linked_at?: string
          linked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_user_links_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vaccinations: {
        Row: {
          application_date: string
          company_id: string
          created_at: string
          document_url: string | null
          dose_number: number
          employee_id: string
          id: string
          next_dose_date: string | null
          provider: string | null
          updated_at: string
          vaccine_name: string | null
          vaccine_type: Database["public"]["Enums"]["vaccine_type"]
        }
        Insert: {
          application_date: string
          company_id: string
          created_at?: string
          document_url?: string | null
          dose_number?: number
          employee_id: string
          id?: string
          next_dose_date?: string | null
          provider?: string | null
          updated_at?: string
          vaccine_name?: string | null
          vaccine_type: Database["public"]["Enums"]["vaccine_type"]
        }
        Update: {
          application_date?: string
          company_id?: string
          created_at?: string
          document_url?: string | null
          dose_number?: number
          employee_id?: string
          id?: string
          next_dose_date?: string | null
          provider?: string | null
          updated_at?: string
          vaccine_name?: string | null
          vaccine_type?: Database["public"]["Enums"]["vaccine_type"]
        }
        Relationships: [
          {
            foreignKeyName: "employee_vaccinations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vaccinations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_work_info: {
        Row: {
          area_id: string | null
          company_id: string
          cost_center: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          employment_cycle_id: string | null
          hire_date: string
          id: string
          is_current: boolean
          link_type: Database["public"]["Enums"]["link_type"]
          observations: string | null
          operation_center_id: string | null
          position_id: string | null
          position_name: string
          termination_date: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
          work_city: string | null
        }
        Insert: {
          area_id?: string | null
          company_id: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          hire_date: string
          id?: string
          is_current?: boolean
          link_type?: Database["public"]["Enums"]["link_type"]
          observations?: string | null
          operation_center_id?: string | null
          position_id?: string | null
          position_name: string
          termination_date?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          work_city?: string | null
        }
        Update: {
          area_id?: string | null
          company_id?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          hire_date?: string
          id?: string
          is_current?: boolean
          link_type?: Database["public"]["Enums"]["link_type"]
          observations?: string | null
          operation_center_id?: string | null
          position_id?: string | null
          position_name?: string
          termination_date?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          work_city?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_work_info_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_info_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_info_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_info_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_info_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          afp: string | null
          arl: string | null
          avatar_url: string | null
          birth_date: string | null
          blood_type: string | null
          caja_compensacion: string | null
          city: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          department: string | null
          department_area: string | null
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          education_level: string | null
          education_level_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          eps: string | null
          first_name: string
          gender: string | null
          hire_date: string
          id: string
          last_name: string
          marital_status: string | null
          mobile: string | null
          operation_center_id: string | null
          phone: string | null
          position: string
          profession: string | null
          profession_id: string | null
          salary: number | null
          shift_type: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          afp?: string | null
          arl?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          caja_compensacion?: string | null
          city?: string | null
          company_id: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          department?: string | null
          department_area?: string | null
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          education_level_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          eps?: string | null
          first_name: string
          gender?: string | null
          hire_date: string
          id?: string
          last_name: string
          marital_status?: string | null
          mobile?: string | null
          operation_center_id?: string | null
          phone?: string | null
          position: string
          profession?: string | null
          profession_id?: string | null
          salary?: number | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          afp?: string | null
          arl?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          caja_compensacion?: string | null
          city?: string | null
          company_id?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          department?: string | null
          department_area?: string | null
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          education_level_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          eps?: string | null
          first_name?: string
          gender?: string | null
          hire_date?: string
          id?: string
          last_name?: string
          marital_status?: string | null
          mobile?: string | null
          operation_center_id?: string | null
          phone?: string | null
          position?: string
          profession?: string | null
          profession_id?: string | null
          salary?: number | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_education_level_id_fkey"
            columns: ["education_level_id"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "professions"
            referencedColumns: ["id"]
          },
        ]
      }
      employees_v2: {
        Row: {
          avatar_url: string | null
          birth_city: string | null
          birth_country: string | null
          birth_date: string | null
          birth_department: string | null
          blood_type: Database["public"]["Enums"]["blood_type"] | null
          company_id: string
          created_at: string
          created_by: string | null
          disability_type: string | null
          document_issue_city: string | null
          document_issue_date: string | null
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          education_level_id: string | null
          ethnic_group: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          gender_identity: string | null
          gender_identity_other: string | null
          id: string
          identification_type_id: string | null
          is_active: boolean
          is_conflict_victim: boolean | null
          is_demobilized: boolean | null
          is_first_job: boolean | null
          is_head_of_household: boolean | null
          last_name: string
          marital_status:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name: string | null
          proceso_exclusivo_pcd: boolean
          profession_id: string | null
          second_last_name: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_city?: string | null
          birth_country?: string | null
          birth_date?: string | null
          birth_department?: string | null
          blood_type?: Database["public"]["Enums"]["blood_type"] | null
          company_id: string
          created_at?: string
          created_by?: string | null
          disability_type?: string | null
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level_id?: string | null
          ethnic_group?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          gender_identity?: string | null
          gender_identity_other?: string | null
          id?: string
          identification_type_id?: string | null
          is_active?: boolean
          is_conflict_victim?: boolean | null
          is_demobilized?: boolean | null
          is_first_job?: boolean | null
          is_head_of_household?: boolean | null
          last_name: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name?: string | null
          proceso_exclusivo_pcd?: boolean
          profession_id?: string | null
          second_last_name?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_city?: string | null
          birth_country?: string | null
          birth_date?: string | null
          birth_department?: string | null
          blood_type?: Database["public"]["Enums"]["blood_type"] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          disability_type?: string | null
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level_id?: string | null
          ethnic_group?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          gender_identity?: string | null
          gender_identity_other?: string | null
          id?: string
          identification_type_id?: string | null
          is_active?: boolean
          is_conflict_victim?: boolean | null
          is_demobilized?: boolean | null
          is_first_job?: boolean | null
          is_head_of_household?: boolean | null
          last_name?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name?: string | null
          proceso_exclusivo_pcd?: boolean
          profession_id?: string | null
          second_last_name?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_v2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_v2_education_level_id_fkey"
            columns: ["education_level_id"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_v2_identification_type_id_fkey"
            columns: ["identification_type_id"]
            isOneToOne: false
            referencedRelation: "identification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_v2_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "professions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          level_1_description: string | null
          level_2_description: string | null
          level_3_description: string | null
          level_4_description: string | null
          max_score: number | null
          name: string
          sort_order: number | null
          template_id: string
          weight: number | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          level_1_description?: string | null
          level_2_description?: string | null
          level_3_description?: string | null
          level_4_description?: string | null
          max_score?: number | null
          name: string
          sort_order?: number | null
          template_id: string
          weight?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          level_1_description?: string | null
          level_2_description?: string | null
          level_3_description?: string | null
          level_4_description?: string | null
          max_score?: number | null
          name?: string
          sort_order?: number | null
          template_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_criteria_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_cycles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          manager_evaluation_deadline: string | null
          name: string
          self_evaluation_deadline: string | null
          start_date: string
          status: Database["public"]["Enums"]["evaluation_cycle_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          manager_evaluation_deadline?: string | null
          name: string
          self_evaluation_deadline?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["evaluation_cycle_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          manager_evaluation_deadline?: string | null
          name?: string
          self_evaluation_deadline?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["evaluation_cycle_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_cycles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          criteria_id: string
          evaluation_id: string
          id: string
          score: number
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          criteria_id: string
          evaluation_id: string
          id?: string
          score: number
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          criteria_id?: string
          evaluation_id?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "performance_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_template_positions: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          position_id: string
          template_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          position_id: string
          template_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          position_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_positions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          qualitative_questions: Json | null
          rating_scale: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          qualitative_questions?: Json | null
          rating_scale?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          qualitative_questions?: Json | null
          rating_scale?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_catalog: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_catalog_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_delivery_items: {
        Row: {
          company_id: string
          concept: string | null
          created_at: string
          document_url: string | null
          exam_catalog_id: string | null
          exam_name: string
          expiration_date: string | null
          id: string
          restrictions: string | null
          result: string
          transaction_id: string
        }
        Insert: {
          company_id: string
          concept?: string | null
          created_at?: string
          document_url?: string | null
          exam_catalog_id?: string | null
          exam_name: string
          expiration_date?: string | null
          id?: string
          restrictions?: string | null
          result?: string
          transaction_id: string
        }
        Update: {
          company_id?: string
          concept?: string | null
          created_at?: string
          document_url?: string | null
          exam_catalog_id?: string | null
          exam_name?: string
          expiration_date?: string | null
          id?: string
          restrictions?: string | null
          result?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_delivery_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_delivery_items_exam_catalog_id_fkey"
            columns: ["exam_catalog_id"]
            isOneToOne: false
            referencedRelation: "exam_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_delivery_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "exam_delivery_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_delivery_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          doctor_name: string | null
          document_url: string | null
          employee_id: string
          exam_date: string
          exam_type: string
          id: string
          observations: string | null
          provider: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          document_url?: string | null
          employee_id: string
          exam_date?: string
          exam_type?: string
          id?: string
          observations?: string | null
          provider?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          document_url?: string | null
          employee_id?: string
          exam_date?: string
          exam_type?: string
          id?: string
          observations?: string | null
          provider?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_delivery_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_delivery_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_profesiograma: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          operation_center_id: string
          position_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          operation_center_id: string
          position_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          operation_center_id?: string
          position_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_profesiograma_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_profesiograma_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_profesiograma_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_profesiograma_items: {
        Row: {
          company_id: string
          created_at: string
          exam_catalog_id: string
          id: string
          is_required: boolean | null
          notes: string | null
          profesiograma_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          exam_catalog_id: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
          profesiograma_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          exam_catalog_id?: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
          profesiograma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_profesiograma_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_profesiograma_items_exam_catalog_id_fkey"
            columns: ["exam_catalog_id"]
            isOneToOne: false
            referencedRelation: "exam_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_profesiograma_items_profesiograma_id_fkey"
            columns: ["profesiograma_id"]
            isOneToOne: false
            referencedRelation: "exam_profesiograma"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_automation_runs: {
        Row: {
          automation_id: string
          company_id: string
          created_at: string
          entity_type: Database["public"]["Enums"]["hr_automation_entity_type"]
          event_type: string
          id: string
          message: string | null
          payload: Json
          record_id: string
          status: string
          success: boolean
        }
        Insert: {
          automation_id: string
          company_id: string
          created_at?: string
          entity_type: Database["public"]["Enums"]["hr_automation_entity_type"]
          event_type: string
          id?: string
          message?: string | null
          payload?: Json
          record_id: string
          status?: string
          success?: boolean
        }
        Update: {
          automation_id?: string
          company_id?: string
          created_at?: string
          entity_type?: Database["public"]["Enums"]["hr_automation_entity_type"]
          event_type?: string
          id?: string
          message?: string | null
          payload?: Json
          record_id?: string
          status?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hr_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "hr_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_automations: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["hr_automation_action_type"]
          company_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          entity_type: Database["public"]["Enums"]["hr_automation_entity_type"]
          failure_count: number
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["hr_automation_trigger_type"]
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["hr_automation_action_type"]
          company_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entity_type: Database["public"]["Enums"]["hr_automation_entity_type"]
          failure_count?: number
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["hr_automation_trigger_type"]
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["hr_automation_action_type"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entity_type?: Database["public"]["Enums"]["hr_automation_entity_type"]
          failure_count?: number
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["hr_automation_trigger_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      identification_types: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identification_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_disconnection_policies: {
        Row: {
          applies_holidays: boolean
          applies_weekends: boolean
          company_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          exception_notes: string | null
          id: string
          last_review_date: string | null
          legal_reference: string
          next_review_date: string | null
          policy_name: string
          protected_end_time: string
          protected_start_time: string
          responsible_user_id: string | null
          updated_at: string
        }
        Insert: {
          applies_holidays?: boolean
          applies_weekends?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          exception_notes?: string | null
          id?: string
          last_review_date?: string | null
          legal_reference?: string
          next_review_date?: string | null
          policy_name?: string
          protected_end_time?: string
          protected_start_time?: string
          responsible_user_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_holidays?: boolean
          applies_weekends?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          exception_notes?: string | null
          id?: string
          last_review_date?: string | null
          legal_reference?: string
          next_review_date?: string | null
          policy_name?: string
          protected_end_time?: string
          protected_start_time?: string
          responsible_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_disconnection_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          available_days: number | null
          company_id: string
          created_at: string
          employee_id: string
          employment_cycle_id: string | null
          entitled_days: number
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          available_days?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          employment_cycle_id?: string | null
          entitled_days?: number
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          available_days?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          employment_cycle_id?: string | null
          entitled_days?: number
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          pending_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_name: string | null
          document_url: string | null
          duration_type: Database["public"]["Enums"]["leave_duration_type"]
          employee_id: string
          end_date: string
          end_time: string | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          rejection_reason: string | null
          requested_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_name: string | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["leave_request_status"]
          total_days: number
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          duration_type?: Database["public"]["Enums"]["leave_duration_type"]
          employee_id: string
          end_date: string
          end_time?: string | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          rejection_reason?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_request_status"]
          total_days: number
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          duration_type?: Database["public"]["Enums"]["leave_duration_type"]
          employee_id?: string
          end_date?: string
          end_time?: string | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string
          rejection_reason?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_request_status"]
          total_days?: number
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_config: {
        Row: {
          allows_half_day: boolean | null
          allows_hours: boolean | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          document_description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          max_days_per_year: number | null
          min_days_advance: number | null
          requires_document: boolean
          updated_at: string
        }
        Insert: {
          allows_half_day?: boolean | null
          allows_hours?: boolean | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          document_description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          max_days_per_year?: number | null
          min_days_advance?: number | null
          requires_document?: boolean
          updated_at?: string
        }
        Update: {
          allows_half_day?: boolean | null
          allows_hours?: boolean | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          document_description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean
          leave_type?: Database["public"]["Enums"]["leave_type"]
          max_days_per_year?: number | null
          min_days_advance?: number | null
          requires_document?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_type_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_refinancing_history: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          employee_id: string
          id: string
          loan_id: string
          new_installment_amount: number
          new_installments: number
          new_interest_rate: number
          new_start_date: string
          new_total_amount: number
          new_total_with_interest: number
          previous_installment_amount: number
          previous_installments: number
          previous_interest_rate: number
          previous_paid_amount: number
          previous_paid_installments: number
          previous_remaining_balance: number
          previous_total_amount: number
          previous_total_with_interest: number
          reason: string | null
          refinance_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          loan_id: string
          new_installment_amount: number
          new_installments: number
          new_interest_rate?: number
          new_start_date: string
          new_total_amount: number
          new_total_with_interest: number
          previous_installment_amount: number
          previous_installments: number
          previous_interest_rate?: number
          previous_paid_amount?: number
          previous_paid_installments?: number
          previous_remaining_balance: number
          previous_total_amount: number
          previous_total_with_interest: number
          reason?: string | null
          refinance_date?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          loan_id?: string
          new_installment_amount?: number
          new_installments?: number
          new_interest_rate?: number
          new_start_date?: string
          new_total_amount?: number
          new_total_with_interest?: number
          previous_installment_amount?: number
          previous_installments?: number
          previous_interest_rate?: number
          previous_paid_amount?: number
          previous_paid_installments?: number
          previous_remaining_balance?: number
          previous_total_amount?: number
          previous_total_with_interest?: number
          reason?: string | null
          refinance_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_refinancing_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_refinancing_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_refinancing_history_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "employee_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      medical_exams: {
        Row: {
          company_id: string
          concept: string
          created_at: string
          created_by: string | null
          doctor_name: string
          document_url: string | null
          employee_id: string
          employment_cycle_id: string | null
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          expiration_date: string | null
          id: string
          observations: string | null
          order_type: string | null
          provider: string
          restrictions: string | null
          result: Database["public"]["Enums"]["exam_result"]
          updated_at: string
        }
        Insert: {
          company_id: string
          concept: string
          created_at?: string
          created_by?: string | null
          doctor_name: string
          document_url?: string | null
          employee_id: string
          employment_cycle_id?: string | null
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          expiration_date?: string | null
          id?: string
          observations?: string | null
          order_type?: string | null
          provider: string
          restrictions?: string | null
          result?: Database["public"]["Enums"]["exam_result"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          concept?: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string
          document_url?: string | null
          employee_id?: string
          employment_cycle_id?: string | null
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          expiration_date?: string | null
          id?: string
          observations?: string | null
          order_type?: string | null
          provider?: string
          restrictions?: string | null
          result?: Database["public"]["Enums"]["exam_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_exams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_exams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_exams_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          channel: string
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          notification_id: string | null
          provider: string | null
          recipient_email: string | null
          recipient_user_id: string | null
          status: string
          subject: string | null
          template_name: string | null
          triggered_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          notification_id?: string | null
          provider?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
          triggered_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          notification_id?: string | null
          provider?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
          triggered_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_channel_providers: {
        Row: {
          channel: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          config: Json
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          provider_key: string
          retry_policy: Json
          throttle_per_minute: number | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          config?: Json
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          provider_key: string
          retry_policy?: Json
          throttle_per_minute?: number | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_engine_channel"]
          company_id?: string
          config?: Json
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          provider_key?: string
          retry_policy?: Json
          throttle_per_minute?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_channel_providers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_deliveries: {
        Row: {
          action_at: string | null
          action_by: string | null
          action_label: string | null
          body: string | null
          channel: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          created_at: string
          error_message: string | null
          escalation_rule_id: string | null
          event_log_id: string | null
          generated_at: string
          id: string
          notification_id: string | null
          payload: Json
          priority: Database["public"]["Enums"]["notification_engine_priority"]
          provider_key: string | null
          read_at: string | null
          recipient_role_id: string | null
          recipient_user_id: string | null
          retry_count: number
          rule_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_engine_delivery_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          action_at?: string | null
          action_by?: string | null
          action_label?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          created_at?: string
          error_message?: string | null
          escalation_rule_id?: string | null
          event_log_id?: string | null
          generated_at?: string
          id?: string
          notification_id?: string | null
          payload?: Json
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          provider_key?: string | null
          read_at?: string | null
          recipient_role_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number
          rule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_engine_delivery_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          action_at?: string | null
          action_by?: string | null
          action_label?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_engine_channel"]
          company_id?: string
          created_at?: string
          error_message?: string | null
          escalation_rule_id?: string | null
          event_log_id?: string | null
          generated_at?: string
          id?: string
          notification_id?: string | null
          payload?: Json
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          provider_key?: string | null
          read_at?: string | null
          recipient_role_id?: string | null
          recipient_user_id?: string | null
          retry_count?: number
          rule_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_engine_delivery_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_deliveries_escalation_rule_id_fkey"
            columns: ["escalation_rule_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_escalation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_deliveries_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_event_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_deliveries_recipient_role_id_fkey"
            columns: ["recipient_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_deliveries_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_escalation_rules: {
        Row: {
          channels: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_resends: number
          priority_override:
            | Database["public"]["Enums"]["notification_engine_priority"]
            | null
          recipient_role_ids: string[]
          recipient_user_ids: string[]
          resend_enabled: boolean
          resend_interval_minutes: number | null
          rule_id: string
          sequence: number
          updated_at: string
          wait_minutes: number
        }
        Insert: {
          channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_resends?: number
          priority_override?:
            | Database["public"]["Enums"]["notification_engine_priority"]
            | null
          recipient_role_ids?: string[]
          recipient_user_ids?: string[]
          resend_enabled?: boolean
          resend_interval_minutes?: number | null
          rule_id: string
          sequence?: number
          updated_at?: string
          wait_minutes: number
        }
        Update: {
          channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_resends?: number
          priority_override?:
            | Database["public"]["Enums"]["notification_engine_priority"]
            | null
          recipient_role_ids?: string[]
          recipient_user_ids?: string[]
          resend_enabled?: boolean
          resend_interval_minutes?: number | null
          rule_id?: string
          sequence?: number
          updated_at?: string
          wait_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_escalation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_escalation_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_event_logs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          event_key: string
          generated_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_engine_kind"]
          payload: Json
          priority: Database["public"]["Enums"]["notification_engine_priority"]
          processed_at: string | null
          status: Database["public"]["Enums"]["notification_engine_delivery_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          event_key: string
          generated_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          payload?: Json
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          processed_at?: string | null
          status?: Database["public"]["Enums"]["notification_engine_delivery_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          event_key?: string
          generated_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          payload?: Json
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          processed_at?: string | null
          status?: Database["public"]["Enums"]["notification_engine_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_event_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_event_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          default_channels: Database["public"]["Enums"]["notification_engine_channel"][]
          default_priority: Database["public"]["Enums"]["notification_engine_priority"]
          description: string | null
          event_key: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["notification_engine_kind"]
          name: string
          sample_payload: Json
          source_module: string
          updated_at: string
          variables: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          default_channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          default_priority?: Database["public"]["Enums"]["notification_engine_priority"]
          description?: string | null
          event_key: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          name: string
          sample_payload?: Json
          source_module?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          default_priority?: Database["public"]["Enums"]["notification_engine_priority"]
          description?: string | null
          event_key?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          name?: string
          sample_payload?: Json
          source_module?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_rules: {
        Row: {
          channels: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["notification_engine_kind"]
          name: string
          priority: Database["public"]["Enums"]["notification_engine_priority"]
          recipient_role_ids: string[]
          recipient_user_ids: string[]
          updated_at: string
        }
        Insert: {
          channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          name: string
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          recipient_role_ids?: string[]
          recipient_user_ids?: string[]
          updated_at?: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["notification_engine_channel"][]
          company_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["notification_engine_kind"]
          name?: string
          priority?: Database["public"]["Enums"]["notification_engine_priority"]
          recipient_role_ids?: string[]
          recipient_user_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_engine_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          subject_template: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_template: string
          channel?: Database["public"]["Enums"]["notification_engine_channel"]
          company_id: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          subject_template: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["notification_engine_channel"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          subject_template?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_engine_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_engine_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_engine_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_role_rules: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          email_enabled: boolean
          event_key: string
          event_label: string
          id: string
          in_app_enabled: boolean
          is_active: boolean
          push_enabled: boolean
          role_id: string
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          email_enabled?: boolean
          event_key: string
          event_label: string
          id?: string
          in_app_enabled?: boolean
          is_active?: boolean
          push_enabled?: boolean
          role_id: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          email_enabled?: boolean
          event_key?: string
          event_label?: string
          id?: string
          in_app_enabled?: boolean
          is_active?: boolean
          push_enabled?: boolean
          role_id?: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_role_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_role_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          attended_at: string | null
          attended_by: string | null
          attention_note: string | null
          category: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_key: string | null
          id: string
          is_attended: boolean
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          attended_at?: string | null
          attended_by?: string | null
          attention_note?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          is_attended?: boolean
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          attended_at?: string | null
          attended_by?: string | null
          attention_note?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          is_attended?: boolean
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      novelty_reasons: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          item_number: number
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_number: number
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          item_number?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "novelty_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_templates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          position_id: string
          sort_order: number
          task_description: string | null
          task_key: string
          task_label: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          position_id: string
          sort_order?: number
          task_description?: string | null
          task_key: string
          task_label: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          position_id?: string
          sort_order?: number
          task_description?: string | null
          task_key?: string
          task_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_task_templates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_centers: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          contract_commercial_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          is_active: boolean
          main_client: string | null
          manager_name: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          contract_commercial_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean
          main_client?: string | null
          manager_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          contract_commercial_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean
          main_client?: string | null
          manager_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_export_batches: {
        Row: {
          batch_number: string
          company_id: string
          created_at: string
          end_date: string
          exported_at: string
          exported_by: string | null
          file_url: string | null
          id: string
          notes: string | null
          payroll_period: string
          start_date: string
          total_hours: number
          total_records: number
          total_value: number
        }
        Insert: {
          batch_number: string
          company_id: string
          created_at?: string
          end_date: string
          exported_at?: string
          exported_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          payroll_period: string
          start_date: string
          total_hours?: number
          total_records?: number
          total_value?: number
        }
        Update: {
          batch_number?: string
          company_id?: string
          created_at?: string
          end_date?: string
          exported_at?: string
          exported_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          payroll_period?: string
          start_date?: string
          total_hours?: number
          total_records?: number
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "overtime_export_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_records: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          end_time: string
          export_batch_id: string | null
          exported_at: string | null
          hourly_rate: number | null
          id: string
          is_exported: boolean
          overtime_type: Database["public"]["Enums"]["overtime_type"]
          payroll_period: string | null
          reason: string | null
          rejected_reason: string | null
          start_time: string
          status: Database["public"]["Enums"]["overtime_status"]
          surcharge_percentage: number
          total_hours: number
          total_value: number | null
          updated_at: string
          work_date: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_time: string
          export_batch_id?: string | null
          exported_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_exported?: boolean
          overtime_type: Database["public"]["Enums"]["overtime_type"]
          payroll_period?: string | null
          reason?: string | null
          rejected_reason?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["overtime_status"]
          surcharge_percentage: number
          total_hours: number
          total_value?: number | null
          updated_at?: string
          work_date: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_time?: string
          export_batch_id?: string | null
          exported_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_exported?: boolean
          overtime_type?: Database["public"]["Enums"]["overtime_type"]
          payroll_period?: string | null
          reason?: string | null
          rejected_reason?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["overtime_status"]
          surcharge_percentage?: number
          total_hours?: number
          total_value?: number | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_labor_config: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          daily_hours: number
          display_unit: string
          id: string
          max_weekly_hours: number
          night_end: string
          night_start: string
          surcharge_dominical: number
          surcharge_hedf: number
          surcharge_hedo: number
          surcharge_henf: number
          surcharge_heno: number
          surcharge_rn: number
          surcharge_rnf: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          daily_hours?: number
          display_unit?: string
          id?: string
          max_weekly_hours?: number
          night_end?: string
          night_start?: string
          surcharge_dominical?: number
          surcharge_hedf?: number
          surcharge_hedo?: number
          surcharge_henf?: number
          surcharge_heno?: number
          surcharge_rn?: number
          surcharge_rnf?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          daily_hours?: number
          display_unit?: string
          id?: string
          max_weekly_hours?: number
          night_end?: string
          night_start?: string
          surcharge_dominical?: number
          surcharge_hedf?: number
          surcharge_hedo?: number
          surcharge_henf?: number
          surcharge_heno?: number
          surcharge_rn?: number
          surcharge_rnf?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_labor_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_novelties: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          end_time: string | null
          hours: number
          id: string
          notes: string | null
          novelty_date: string
          novelty_type: string
          reason_id: string | null
          source: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_time?: string | null
          hours?: number
          id?: string
          notes?: string | null
          novelty_date: string
          novelty_type: string
          reason_id?: string | null
          source?: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_time?: string | null
          hours?: number
          id?: string
          notes?: string | null
          novelty_date?: string
          novelty_type?: string
          reason_id?: string | null
          source?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_novelties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_novelties_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_novelties_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "novelty_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_receipts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          file_name: string | null
          file_url: string | null
          id: string
          net_pay: number | null
          period_end: string
          period_label: string
          period_start: string
          total_deductions: number | null
          total_earnings: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          net_pay?: number | null
          period_end: string
          period_label: string
          period_start: string
          total_deductions?: number | null
          total_earnings?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          net_pay?: number | null
          period_end?: string
          period_label?: string
          period_start?: string
          total_deductions?: number | null
          total_earnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_receipts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          areas_to_improve: string | null
          company_id: string
          created_at: string
          cycle_id: string
          development_plan: string | null
          employee_comments: string | null
          employee_id: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id: string | null
          general_comments: string | null
          id: string
          overall_rating: string | null
          overall_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          strengths: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          areas_to_improve?: string | null
          company_id: string
          created_at?: string
          cycle_id: string
          development_plan?: string | null
          employee_comments?: string | null
          employee_id: string
          evaluation_type?: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id?: string | null
          general_comments?: string | null
          id?: string
          overall_rating?: string | null
          overall_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          areas_to_improve?: string | null
          company_id?: string
          created_at?: string
          cycle_id?: string
          development_plan?: string | null
          employee_comments?: string | null
          employee_id?: string
          evaluation_type?: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id?: string | null
          general_comments?: string | null
          id?: string
          overall_rating?: string | null
          overall_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          achieved_value: string | null
          company_id: string
          created_at: string
          created_by: string | null
          cycle_id: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          manager_feedback: string | null
          progress_percentage: number | null
          status: string | null
          target_value: string | null
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          achieved_value?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          manager_feedback?: string | null
          progress_percentage?: number | null
          status?: string | null
          target_value?: string | null
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          achieved_value?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          manager_feedback?: string | null
          progress_percentage?: number | null
          status?: string | null
          target_value?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string
          description: string | null
          id: string
          module_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_requisitions: {
        Row: {
          area_id: string | null
          autoriza: string | null
          cantidad_vacantes_requeridas: number
          cargo_a_reemplazar: string | null
          cargo_solicitado: string
          cargo_solicitante: string | null
          company_id: string
          coordinadores_aprobado: boolean | null
          coordinadores_aprobador_id: string | null
          coordinadores_fecha_aprobacion: string | null
          coordinadores_observaciones: string | null
          coordinadores_quien_aprobo: string | null
          created_at: string
          created_by: string | null
          dia_descanso_obligatorio:
            | Database["public"]["Enums"]["day_of_week"]
            | null
          estado_requisicion: Database["public"]["Enums"]["requisition_status"]
          fecha_ingreso_estimada: string | null
          fecha_requisicion: string
          gerencia_aprobado: boolean | null
          gerencia_aprobado_salario: boolean | null
          gerencia_aprobador_id: string | null
          gerencia_fecha_aprobacion: string | null
          gerencia_observaciones: string | null
          gerencia_quien_aprobo: string | null
          horario_trabajo: string | null
          id: string
          incluye_alimentacion: boolean | null
          incluye_desplazamiento: boolean | null
          is_confidential: boolean
          juridico_aprobado: boolean | null
          juridico_aprobador_id: string | null
          juridico_duracion: string | null
          juridico_fecha_aprobacion: string | null
          juridico_observaciones: string | null
          juridico_quien_aprobo: string | null
          juridico_tipo_contrato: string | null
          lider_proceso: string | null
          motivo_solicitud: Database["public"]["Enums"]["requisition_reason"]
          observaciones_motivo_solicitud: string | null
          operaciones_aprobado: boolean | null
          operaciones_aprobado_salario: boolean | null
          operaciones_aprobador_id: string | null
          operaciones_fecha_aprobacion: string | null
          operaciones_observaciones: string | null
          operaciones_quien_aprobo: string | null
          operation_center_id: string | null
          persona_a_reemplazar: string | null
          proceso_exclusivo_pcd: boolean
          requiere_herramienta_trabajo: boolean | null
          requisition_code: string
          rrhh_aprobado: boolean | null
          rrhh_aprobador_id: string | null
          rrhh_asignacion_salarial: number | null
          rrhh_condiciones_adicionales: string | null
          rrhh_fecha_aprobacion: string | null
          rrhh_fuente_asignacion_salarial: string | null
          rrhh_nivel_politica_salarial: string | null
          rrhh_observaciones: string | null
          rrhh_quien_aprobo: string | null
          rrhh_tipo_convocatoria:
            | Database["public"]["Enums"]["recruitment_type"]
            | null
          salario_propuesto: number | null
          seleccion_aprobado: boolean | null
          seleccion_aprobador_id: string | null
          seleccion_fecha_aprobacion: string | null
          seleccion_fecha_inicio_proceso: string | null
          seleccion_observaciones: string | null
          seleccion_perfil_cargo_creado: boolean | null
          seleccion_quien_aprobo: string | null
          seleccion_tipo_mano_obra: string | null
          solicitante_id: string | null
          solicitante_nombre: string
          tipo_contrato_solicitado: string | null
          trayecto_desplazamiento: string | null
          turno_trabajo_id: string | null
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          autoriza?: string | null
          cantidad_vacantes_requeridas?: number
          cargo_a_reemplazar?: string | null
          cargo_solicitado: string
          cargo_solicitante?: string | null
          company_id: string
          coordinadores_aprobado?: boolean | null
          coordinadores_aprobador_id?: string | null
          coordinadores_fecha_aprobacion?: string | null
          coordinadores_observaciones?: string | null
          coordinadores_quien_aprobo?: string | null
          created_at?: string
          created_by?: string | null
          dia_descanso_obligatorio?:
            | Database["public"]["Enums"]["day_of_week"]
            | null
          estado_requisicion?: Database["public"]["Enums"]["requisition_status"]
          fecha_ingreso_estimada?: string | null
          fecha_requisicion?: string
          gerencia_aprobado?: boolean | null
          gerencia_aprobado_salario?: boolean | null
          gerencia_aprobador_id?: string | null
          gerencia_fecha_aprobacion?: string | null
          gerencia_observaciones?: string | null
          gerencia_quien_aprobo?: string | null
          horario_trabajo?: string | null
          id?: string
          incluye_alimentacion?: boolean | null
          incluye_desplazamiento?: boolean | null
          is_confidential?: boolean
          juridico_aprobado?: boolean | null
          juridico_aprobador_id?: string | null
          juridico_duracion?: string | null
          juridico_fecha_aprobacion?: string | null
          juridico_observaciones?: string | null
          juridico_quien_aprobo?: string | null
          juridico_tipo_contrato?: string | null
          lider_proceso?: string | null
          motivo_solicitud: Database["public"]["Enums"]["requisition_reason"]
          observaciones_motivo_solicitud?: string | null
          operaciones_aprobado?: boolean | null
          operaciones_aprobado_salario?: boolean | null
          operaciones_aprobador_id?: string | null
          operaciones_fecha_aprobacion?: string | null
          operaciones_observaciones?: string | null
          operaciones_quien_aprobo?: string | null
          operation_center_id?: string | null
          persona_a_reemplazar?: string | null
          proceso_exclusivo_pcd?: boolean
          requiere_herramienta_trabajo?: boolean | null
          requisition_code: string
          rrhh_aprobado?: boolean | null
          rrhh_aprobador_id?: string | null
          rrhh_asignacion_salarial?: number | null
          rrhh_condiciones_adicionales?: string | null
          rrhh_fecha_aprobacion?: string | null
          rrhh_fuente_asignacion_salarial?: string | null
          rrhh_nivel_politica_salarial?: string | null
          rrhh_observaciones?: string | null
          rrhh_quien_aprobo?: string | null
          rrhh_tipo_convocatoria?:
            | Database["public"]["Enums"]["recruitment_type"]
            | null
          salario_propuesto?: number | null
          seleccion_aprobado?: boolean | null
          seleccion_aprobador_id?: string | null
          seleccion_fecha_aprobacion?: string | null
          seleccion_fecha_inicio_proceso?: string | null
          seleccion_observaciones?: string | null
          seleccion_perfil_cargo_creado?: boolean | null
          seleccion_quien_aprobo?: string | null
          seleccion_tipo_mano_obra?: string | null
          solicitante_id?: string | null
          solicitante_nombre: string
          tipo_contrato_solicitado?: string | null
          trayecto_desplazamiento?: string | null
          turno_trabajo_id?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          autoriza?: string | null
          cantidad_vacantes_requeridas?: number
          cargo_a_reemplazar?: string | null
          cargo_solicitado?: string
          cargo_solicitante?: string | null
          company_id?: string
          coordinadores_aprobado?: boolean | null
          coordinadores_aprobador_id?: string | null
          coordinadores_fecha_aprobacion?: string | null
          coordinadores_observaciones?: string | null
          coordinadores_quien_aprobo?: string | null
          created_at?: string
          created_by?: string | null
          dia_descanso_obligatorio?:
            | Database["public"]["Enums"]["day_of_week"]
            | null
          estado_requisicion?: Database["public"]["Enums"]["requisition_status"]
          fecha_ingreso_estimada?: string | null
          fecha_requisicion?: string
          gerencia_aprobado?: boolean | null
          gerencia_aprobado_salario?: boolean | null
          gerencia_aprobador_id?: string | null
          gerencia_fecha_aprobacion?: string | null
          gerencia_observaciones?: string | null
          gerencia_quien_aprobo?: string | null
          horario_trabajo?: string | null
          id?: string
          incluye_alimentacion?: boolean | null
          incluye_desplazamiento?: boolean | null
          is_confidential?: boolean
          juridico_aprobado?: boolean | null
          juridico_aprobador_id?: string | null
          juridico_duracion?: string | null
          juridico_fecha_aprobacion?: string | null
          juridico_observaciones?: string | null
          juridico_quien_aprobo?: string | null
          juridico_tipo_contrato?: string | null
          lider_proceso?: string | null
          motivo_solicitud?: Database["public"]["Enums"]["requisition_reason"]
          observaciones_motivo_solicitud?: string | null
          operaciones_aprobado?: boolean | null
          operaciones_aprobado_salario?: boolean | null
          operaciones_aprobador_id?: string | null
          operaciones_fecha_aprobacion?: string | null
          operaciones_observaciones?: string | null
          operaciones_quien_aprobo?: string | null
          operation_center_id?: string | null
          persona_a_reemplazar?: string | null
          proceso_exclusivo_pcd?: boolean
          requiere_herramienta_trabajo?: boolean | null
          requisition_code?: string
          rrhh_aprobado?: boolean | null
          rrhh_aprobador_id?: string | null
          rrhh_asignacion_salarial?: number | null
          rrhh_condiciones_adicionales?: string | null
          rrhh_fecha_aprobacion?: string | null
          rrhh_fuente_asignacion_salarial?: string | null
          rrhh_nivel_politica_salarial?: string | null
          rrhh_observaciones?: string | null
          rrhh_quien_aprobo?: string | null
          rrhh_tipo_convocatoria?:
            | Database["public"]["Enums"]["recruitment_type"]
            | null
          salario_propuesto?: number | null
          seleccion_aprobado?: boolean | null
          seleccion_aprobador_id?: string | null
          seleccion_fecha_aprobacion?: string | null
          seleccion_fecha_inicio_proceso?: string | null
          seleccion_observaciones?: string | null
          seleccion_perfil_cargo_creado?: boolean | null
          seleccion_quien_aprobo?: string | null
          seleccion_tipo_mano_obra?: string | null
          solicitante_id?: string | null
          solicitante_nombre?: string
          tipo_contrato_solicitado?: string | null
          trayecto_desplazamiento?: string | null
          turno_trabajo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_requisitions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_requisitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_requisitions_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_requisitions_turno_trabajo_id_fkey"
            columns: ["turno_trabajo_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      pila_ugpp_employee_validations: {
        Row: {
          afp: string | null
          arl: string | null
          ccf: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          employee_id: string
          employee_name: string
          eps: string | null
          estimated_contributions: Json
          ibc: number
          id: string
          issue_count: number
          issues: Json
          novelty_summary: Json
          operation_center_name: string | null
          period_id: string
          position_name: string | null
          risk_level: string | null
          salary: number
          status: Database["public"]["Enums"]["pila_validation_status"]
        }
        Insert: {
          afp?: string | null
          arl?: string | null
          ccf?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          employee_id: string
          employee_name: string
          eps?: string | null
          estimated_contributions?: Json
          ibc?: number
          id?: string
          issue_count?: number
          issues?: Json
          novelty_summary?: Json
          operation_center_name?: string | null
          period_id: string
          position_name?: string | null
          risk_level?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["pila_validation_status"]
        }
        Update: {
          afp?: string | null
          arl?: string | null
          ccf?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          employee_id?: string
          employee_name?: string
          eps?: string | null
          estimated_contributions?: Json
          ibc?: number
          id?: string
          issue_count?: number
          issues?: Json
          novelty_summary?: Json
          operation_center_name?: string | null
          period_id?: string
          position_name?: string | null
          risk_level?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["pila_validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pila_ugpp_employee_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pila_ugpp_employee_validations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pila_ugpp_employee_validations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "pila_ugpp_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      pila_ugpp_periods: {
        Row: {
          company_id: string
          created_at: string
          critical_count: number
          estimated_total_contributions: number
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          ok_count: number
          period_end: string
          period_label: string
          period_start: string
          status: Database["public"]["Enums"]["pila_period_status"]
          total_employees: number
          total_ibc: number
          updated_at: string
          warning_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          critical_count?: number
          estimated_total_contributions?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          ok_count?: number
          period_end: string
          period_label: string
          period_start: string
          status?: Database["public"]["Enums"]["pila_period_status"]
          total_employees?: number
          total_ibc?: number
          updated_at?: string
          warning_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          critical_count?: number
          estimated_total_contributions?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          ok_count?: number
          period_end?: string
          period_label?: string
          period_start?: string
          status?: Database["public"]["Enums"]["pila_period_status"]
          total_employees?: number
          total_ibc?: number
          updated_at?: string
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "pila_ugpp_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pila_ugpp_settings: {
        Row: {
          arl_rate_i: number
          arl_rate_ii: number
          arl_rate_iii: number
          arl_rate_iv: number
          arl_rate_v: number
          ccf_rate: number
          company_id: string
          created_at: string
          health_employee_rate: number
          health_employer_rate: number
          icbf_rate: number
          id: string
          notes: string | null
          pension_employee_rate: number
          pension_employer_rate: number
          salary_floor_enabled: boolean
          sena_rate: number
          updated_at: string
        }
        Insert: {
          arl_rate_i?: number
          arl_rate_ii?: number
          arl_rate_iii?: number
          arl_rate_iv?: number
          arl_rate_v?: number
          ccf_rate?: number
          company_id: string
          created_at?: string
          health_employee_rate?: number
          health_employer_rate?: number
          icbf_rate?: number
          id?: string
          notes?: string | null
          pension_employee_rate?: number
          pension_employer_rate?: number
          salary_floor_enabled?: boolean
          sena_rate?: number
          updated_at?: string
        }
        Update: {
          arl_rate_i?: number
          arl_rate_ii?: number
          arl_rate_iii?: number
          arl_rate_iv?: number
          arl_rate_v?: number
          ccf_rate?: number
          company_id?: string
          created_at?: string
          health_employee_rate?: number
          health_employer_rate?: number
          icbf_rate?: number
          id?: string
          notes?: string | null
          pension_employee_rate?: number
          pension_employer_rate?: number
          salary_floor_enabled?: boolean
          sena_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pila_ugpp_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      position_profile_annexes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          education_detail: string | null
          education_level: string | null
          experience: string | null
          functions: Json | null
          id: string
          notes: string | null
          num_positions: number | null
          operation_center_id: string
          profile_id: string
          purpose: string | null
          reports_to: string | null
          responsibilities: Json | null
          skills: Json | null
          specific_knowledge: Json | null
          supervises: string | null
          updated_at: string
          working_conditions: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          education_detail?: string | null
          education_level?: string | null
          experience?: string | null
          functions?: Json | null
          id?: string
          notes?: string | null
          num_positions?: number | null
          operation_center_id: string
          profile_id: string
          purpose?: string | null
          reports_to?: string | null
          responsibilities?: Json | null
          skills?: Json | null
          specific_knowledge?: Json | null
          supervises?: string | null
          updated_at?: string
          working_conditions?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          education_detail?: string | null
          education_level?: string | null
          experience?: string | null
          functions?: Json | null
          id?: string
          notes?: string | null
          num_positions?: number | null
          operation_center_id?: string
          profile_id?: string
          purpose?: string | null
          reports_to?: string | null
          responsibilities?: Json | null
          skills?: Json | null
          specific_knowledge?: Json | null
          supervises?: string | null
          updated_at?: string
          working_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "position_profile_annexes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_profile_annexes_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_profile_annexes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "position_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_profiles: {
        Row: {
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          education_detail: string | null
          education_level: string | null
          education_level_id: string | null
          effective_date: string | null
          elaborated_by: string | null
          experience: string | null
          functions: Json | null
          id: string
          is_current: boolean
          num_positions: number | null
          position_id: string
          purpose: string | null
          reports_to: string | null
          responsibilities: Json | null
          reviewed_by: string | null
          skills: Json | null
          specific_knowledge: Json | null
          supervises: string | null
          updated_at: string
          version: number
          working_conditions: Json | null
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          education_detail?: string | null
          education_level?: string | null
          education_level_id?: string | null
          effective_date?: string | null
          elaborated_by?: string | null
          experience?: string | null
          functions?: Json | null
          id?: string
          is_current?: boolean
          num_positions?: number | null
          position_id: string
          purpose?: string | null
          reports_to?: string | null
          responsibilities?: Json | null
          reviewed_by?: string | null
          skills?: Json | null
          specific_knowledge?: Json | null
          supervises?: string | null
          updated_at?: string
          version?: number
          working_conditions?: Json | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          education_detail?: string | null
          education_level?: string | null
          education_level_id?: string | null
          effective_date?: string | null
          elaborated_by?: string | null
          experience?: string | null
          functions?: Json | null
          id?: string
          is_current?: boolean
          num_positions?: number | null
          position_id?: string
          purpose?: string | null
          reports_to?: string | null
          responsibilities?: Json | null
          reviewed_by?: string | null
          skills?: Json | null
          specific_knowledge?: Json | null
          supervises?: string | null
          updated_at?: string
          version?: number
          working_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "position_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_profiles_education_level_id_fkey"
            columns: ["education_level_id"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          area_id: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number | null
          max_salary: number | null
          min_salary: number | null
          name: string
          parent_position_id: string | null
          requirements: string | null
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          max_salary?: number | null
          min_salary?: number | null
          name: string
          parent_position_id?: string | null
          requirements?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          max_salary?: number | null
          min_salary?: number | null
          name?: string
          parent_position_id?: string | null
          requirements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      professions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_vacancy_codes: {
        Row: {
          codigo_vacante_externa: string
          company_id: string
          created_at: string
          entidad_origen: string | null
          fecha_cierre: string | null
          fecha_creacion: string | null
          id: string
          platform_id: string | null
          requisition_id: string
        }
        Insert: {
          codigo_vacante_externa: string
          company_id: string
          created_at?: string
          entidad_origen?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string | null
          id?: string
          platform_id?: string | null
          requisition_id: string
        }
        Update: {
          codigo_vacante_externa?: string
          company_id?: string
          created_at?: string
          entidad_origen?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string | null
          id?: string
          platform_id?: string | null
          requisition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_vacancy_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_vacancy_codes_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "vacancy_publication_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_vacancy_codes_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "personnel_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_steps: {
        Row: {
          candidate_id: string
          company_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          doctor_name: string | null
          document_url: string | null
          evaluator_id: string | null
          evaluator_name: string | null
          exam_profesiograma_items: Json | null
          id: string
          medical_concept: string | null
          notes: string | null
          order_type: string | null
          provider: string | null
          result: string | null
          scheduled_date: string | null
          score: number | null
          status: Database["public"]["Enums"]["selection_step_status"]
          step_order: number
          step_type: Database["public"]["Enums"]["selection_step_type"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          document_url?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          exam_profesiograma_items?: Json | null
          id?: string
          medical_concept?: string | null
          notes?: string | null
          order_type?: string | null
          provider?: string | null
          result?: string | null
          scheduled_date?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["selection_step_status"]
          step_order?: number
          step_type: Database["public"]["Enums"]["selection_step_type"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          document_url?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          exam_profesiograma_items?: Json | null
          id?: string
          medical_concept?: string | null
          notes?: string | null
          order_type?: string | null
          provider?: string | null
          result?: string | null
          scheduled_date?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["selection_step_status"]
          step_order?: number
          step_type?: Database["public"]["Enums"]["selection_step_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_steps_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      self_registration_tokens: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          enabled_fields: Json
          expires_at: string | null
          id: string
          is_reusable: boolean
          is_used: boolean
          name: string | null
          target_type: string
          token: string
          updated_at: string
          used_at: string | null
          vacancy_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          enabled_fields?: Json
          expires_at?: string | null
          id?: string
          is_reusable?: boolean
          is_used?: boolean
          name?: string | null
          target_type?: string
          token?: string
          updated_at?: string
          used_at?: string | null
          vacancy_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          enabled_fields?: Json
          expires_at?: string | null
          id?: string
          is_reusable?: boolean
          is_used?: boolean
          name?: string | null
          target_type?: string
          token?: string
          updated_at?: string
          used_at?: string | null
          vacancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "self_registration_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_registration_tokens_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          login_at: string
          os: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          login_at?: string
          os?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          login_at?: string
          os?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shift_cycle_days: {
        Row: {
          company_id: string
          created_at: string | null
          day_number: number
          id: string
          shift_cycle_id: string
          shift_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_number: number
          id?: string
          shift_cycle_id: string
          shift_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_number?: number
          id?: string
          shift_cycle_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_cycle_days_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_cycle_days_shift_cycle_id_fkey"
            columns: ["shift_cycle_id"]
            isOneToOne: false
            referencedRelation: "shift_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_cycle_days_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_cycles: {
        Row: {
          code: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          total_days: number
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          total_days: number
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_types: {
        Row: {
          break_duration_minutes: number | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_night_shift: boolean | null
          is_rotating: boolean | null
          name: string
          rotation_days: number | null
          start_time: string
          updated_at: string
        }
        Insert: {
          break_duration_minutes?: number | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_night_shift?: boolean | null
          is_rotating?: boolean | null
          name: string
          rotation_days?: number | null
          start_time: string
          updated_at?: string
        }
        Update: {
          break_duration_minutes?: number | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_night_shift?: boolean | null
          is_rotating?: boolean | null
          name?: string
          rotation_days?: number | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          code: string | null
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          crosses_midnight: boolean | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_rest_day: boolean | null
          name: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          code?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          crosses_midnight?: boolean | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_rest_day?: boolean | null
          name: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          code?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          crosses_midnight?: boolean | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_rest_day?: boolean | null
          name?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          company_id: string
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      termination_documents: {
        Row: {
          company_id: string
          created_at: string
          document_data: Json | null
          document_type: Database["public"]["Enums"]["termination_document_type"]
          document_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_generated: boolean
          is_required: boolean
          is_signed: boolean
          signed_at: string | null
          signed_by: string | null
          termination_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_data?: Json | null
          document_type: Database["public"]["Enums"]["termination_document_type"]
          document_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_generated?: boolean
          is_required?: boolean
          is_signed?: boolean
          signed_at?: string | null
          signed_by?: string | null
          termination_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_data?: Json | null
          document_type?: Database["public"]["Enums"]["termination_document_type"]
          document_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_generated?: boolean
          is_required?: boolean
          is_signed?: boolean
          signed_at?: string | null
          signed_by?: string | null
          termination_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "termination_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termination_documents_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "employee_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_access_tokens: {
        Row: {
          access_type: string
          company_id: string
          course_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          operation_center_id: string | null
          requires_evaluation: boolean
          token: string
          updated_at: string
          usage_type: string
          uses_count: number
        }
        Insert: {
          access_type?: string
          company_id: string
          course_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          operation_center_id?: string | null
          requires_evaluation?: boolean
          token?: string
          updated_at?: string
          usage_type?: string
          uses_count?: number
        }
        Update: {
          access_type?: string
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          operation_center_id?: string | null
          requires_evaluation?: boolean
          token?: string
          updated_at?: string
          usage_type?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_access_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_access_tokens_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_access_tokens_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          attendance_date: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          company_id: string
          created_at: string
          employee_id: string
          enrolled_by: string | null
          enrollment_date: string
          id: string
          observations: string | null
          passed: boolean | null
          score: number | null
          session_id: string
          signature_data: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          company_id: string
          created_at?: string
          employee_id: string
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          observations?: string | null
          passed?: boolean | null
          score?: number | null
          session_id: string
          signature_data?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          company_id?: string
          created_at?: string
          employee_id?: string
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          observations?: string | null
          passed?: boolean | null
          score?: number | null
          session_id?: string
          signature_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          company_id: string
          completed_at: string
          course_id: string
          employee_id: string | null
          id: string
          ip_address: string | null
          operator_cedula: string | null
          operator_name: string
          quiz_score: number | null
          signature_data: string
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string
          course_id: string
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          operator_cedula?: string | null
          operator_name: string
          quiz_score?: number | null
          signature_data: string
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string
          course_id?: string
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          operator_cedula?: string | null
          operator_name?: string
          quiz_score?: number | null
          signature_data?: string
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "training_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      training_course_periods: {
        Row: {
          company_id: string
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          month: number
          year: number
        }
        Insert: {
          company_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          year: number
        }
        Update: {
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_course_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_course_periods_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          audience: string | null
          category: string
          code: string | null
          company_id: string
          content: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number
          id: string
          is_active: boolean
          is_mandatory: boolean
          language: string
          legal_framework: string | null
          level: string
          modality: Database["public"]["Enums"]["training_modality"]
          name: string
          objective: string | null
          objectives: string | null
          prerequisites: string | null
          provider: string | null
          requires_certification: boolean
          risk_level: string
          status: string
          target_audience: string | null
          updated_at: string
          validity_months: number | null
          version: number
        }
        Insert: {
          audience?: string | null
          category: string
          code?: string | null
          company_id: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          language?: string
          legal_framework?: string | null
          level?: string
          modality?: Database["public"]["Enums"]["training_modality"]
          name: string
          objective?: string | null
          objectives?: string | null
          prerequisites?: string | null
          provider?: string | null
          requires_certification?: boolean
          risk_level?: string
          status?: string
          target_audience?: string | null
          updated_at?: string
          validity_months?: number | null
          version?: number
        }
        Update: {
          audience?: string | null
          category?: string
          code?: string | null
          company_id?: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          language?: string
          legal_framework?: string | null
          level?: string
          modality?: Database["public"]["Enums"]["training_modality"]
          name?: string
          objective?: string | null
          objectives?: string | null
          prerequisites?: string | null
          provider?: string | null
          requires_certification?: boolean
          risk_level?: string
          status?: string
          target_audience?: string | null
          updated_at?: string
          validity_months?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_group_assignments: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          course_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          name: string
          requires_evaluation: boolean
          status: string
          token_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          course_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          name: string
          requires_evaluation?: boolean
          status?: string
          token_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          name?: string
          requires_evaluation?: boolean
          status?: string
          token_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_assignments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "training_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      training_group_participants: {
        Row: {
          added_by: string
          assignment_id: string
          company_id: string
          completion_id: string | null
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          removed_at: string | null
          removed_by: string | null
          updated_at: string
        }
        Insert: {
          added_by: string
          assignment_id: string
          company_id: string
          completion_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          assignment_id?: string
          company_id?: string
          completion_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_participants_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_group_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_participants_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "training_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_group_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      training_media: {
        Row: {
          company_id: string
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          duration: number | null
          file_size: number | null
          file_url: string
          id: string
          metadata: Json
          title: string
          type: string
        }
        Insert: {
          company_id: string
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          metadata?: Json
          title: string
          type: string
        }
        Update: {
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          metadata?: Json
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_media_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_items: {
        Row: {
          company_id: string
          course_id: string
          created_at: string
          estimated_cost: number | null
          id: string
          is_completed: boolean
          observations: string | null
          plan_id: string
          priority: string | null
          scheduled_month: number | null
          session_id: string | null
          target_areas: string[] | null
          target_participants: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          course_id: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_completed?: boolean
          observations?: string | null
          plan_id: string
          priority?: string | null
          scheduled_month?: number | null
          session_id?: string | null
          target_areas?: string[] | null
          target_participants?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          course_id?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          is_completed?: boolean
          observations?: string | null
          plan_id?: string
          priority?: string | null
          scheduled_month?: number | null
          session_id?: string | null
          target_areas?: string[] | null
          target_participants?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget: number | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          company_id: string
          course_id: string
          created_at: string
          created_by: string | null
          end_date: string
          end_time: string | null
          id: string
          instructor_id: string | null
          instructor_name: string | null
          location: string | null
          materials_url: string | null
          max_participants: number | null
          observations: string | null
          session_code: string | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["training_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          location?: string | null
          materials_url?: string | null
          max_participants?: number | null
          observations?: string | null
          session_code?: string | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          location?: string | null
          materials_url?: string | null
          max_participants?: number | null
          observations?: string | null
          session_code?: string | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_center_assignments: {
        Row: {
          created_at: string
          id: string
          operation_center_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operation_center_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          operation_center_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_center_assignments_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_assignments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          ai_data_assistant_enabled: boolean
          created_at: string
          email_notifications: boolean
          email_requisition_approvals: boolean | null
          id: string
          language: string | null
          notify_contract_expiry: boolean
          notify_disciplinary_updates: boolean
          notify_dotation_expiry: boolean
          notify_leave_requests: boolean
          notify_medical_exam_expiry: boolean
          notify_system_announcements: boolean
          notify_vacation_requests: boolean
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_data_assistant_enabled?: boolean
          created_at?: string
          email_notifications?: boolean
          email_requisition_approvals?: boolean | null
          id?: string
          language?: string | null
          notify_contract_expiry?: boolean
          notify_disciplinary_updates?: boolean
          notify_dotation_expiry?: boolean
          notify_leave_requests?: boolean
          notify_medical_exam_expiry?: boolean
          notify_system_announcements?: boolean
          notify_vacation_requests?: boolean
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_data_assistant_enabled?: boolean
          created_at?: string
          email_notifications?: boolean
          email_requisition_approvals?: boolean | null
          id?: string
          language?: string | null
          notify_contract_expiry?: boolean
          notify_disciplinary_updates?: boolean
          notify_dotation_expiry?: boolean
          notify_leave_requests?: boolean
          notify_medical_exam_expiry?: boolean
          notify_system_announcements?: boolean
          notify_vacation_requests?: boolean
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          mobile: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_current: boolean
          last_active: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean
          last_active?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vacancies: {
        Row: {
          actual_close_date: string | null
          colocado_url: string | null
          company_id: string
          created_at: string
          created_by: string | null
          department_area: string | null
          education_level: string | null
          experience_years: number | null
          hiring_manager_id: string | null
          id: string
          includes_transport: boolean | null
          job_description: string | null
          observations: string | null
          open_date: string
          operation_center_id: string | null
          other_benefits: string | null
          position_id: string | null
          position_title: string
          positions_count: number
          priority: string | null
          psychologist_id: string | null
          publication_platforms: string[] | null
          reason_details: string | null
          requirements: string | null
          requisition_id: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          salary_type: string | null
          shift_type: string | null
          status: Database["public"]["Enums"]["vacancy_status"]
          target_close_date: string | null
          updated_at: string
          vacancy_reason: Database["public"]["Enums"]["vacancy_reason"]
          vacancy_type: Database["public"]["Enums"]["vacancy_type"]
        }
        Insert: {
          actual_close_date?: string | null
          colocado_url?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department_area?: string | null
          education_level?: string | null
          experience_years?: number | null
          hiring_manager_id?: string | null
          id?: string
          includes_transport?: boolean | null
          job_description?: string | null
          observations?: string | null
          open_date?: string
          operation_center_id?: string | null
          other_benefits?: string | null
          position_id?: string | null
          position_title: string
          positions_count?: number
          priority?: string | null
          psychologist_id?: string | null
          publication_platforms?: string[] | null
          reason_details?: string | null
          requirements?: string | null
          requisition_id?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          salary_type?: string | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          target_close_date?: string | null
          updated_at?: string
          vacancy_reason?: Database["public"]["Enums"]["vacancy_reason"]
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Update: {
          actual_close_date?: string | null
          colocado_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_area?: string | null
          education_level?: string | null
          experience_years?: number | null
          hiring_manager_id?: string | null
          id?: string
          includes_transport?: boolean | null
          job_description?: string | null
          observations?: string | null
          open_date?: string
          operation_center_id?: string | null
          other_benefits?: string | null
          position_id?: string | null
          position_title?: string
          positions_count?: number
          priority?: string | null
          psychologist_id?: string | null
          publication_platforms?: string[] | null
          reason_details?: string | null
          requirements?: string | null
          requisition_id?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          salary_type?: string | null
          shift_type?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          target_close_date?: string | null
          updated_at?: string
          vacancy_reason?: Database["public"]["Enums"]["vacancy_reason"]
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "personnel_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_documents: {
        Row: {
          company_id: string
          created_at: string
          document_name: string
          document_type: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          observations: string | null
          updated_at: string
          uploaded_by: string | null
          vacancy_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_name: string
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vacancy_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          observations?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_documents_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_publication_platforms: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_publication_platforms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_balances: {
        Row: {
          accumulation_expires: string | null
          company_id: string
          created_at: string
          days_accrued: number
          days_compensated: number
          days_pending: number | null
          days_taken: number
          employee_id: string
          employment_cycle_id: string | null
          id: string
          is_accumulated: boolean
          notes: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          accumulation_expires?: string | null
          company_id: string
          created_at?: string
          days_accrued?: number
          days_compensated?: number
          days_pending?: number | null
          days_taken?: number
          employee_id: string
          employment_cycle_id?: string | null
          id?: string
          is_accumulated?: boolean
          notes?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          accumulation_expires?: string | null
          company_id?: string
          created_at?: string
          days_accrued?: number
          days_compensated?: number
          days_pending?: number | null
          days_taken?: number
          employee_id?: string
          employment_cycle_id?: string | null
          id?: string
          is_accumulated?: boolean
          notes?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_balances_employment_cycle_id_fkey"
            columns: ["employment_cycle_id"]
            isOneToOne: false
            referencedRelation: "employee_employment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_config: {
        Row: {
          alert_threshold_days: number
          company_id: string
          created_at: string
          days_per_year: number
          id: string
          max_accumulation_years: number
          max_compensation_percentage: number
          updated_at: string
        }
        Insert: {
          alert_threshold_days?: number
          company_id: string
          created_at?: string
          days_per_year?: number
          id?: string
          max_accumulation_years?: number
          max_compensation_percentage?: number
          updated_at?: string
        }
        Update: {
          alert_threshold_days?: number
          company_id?: string
          created_at?: string
          days_per_year?: number
          id?: string
          max_accumulation_years?: number
          max_compensation_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          accrued_days_at_request: number
          approval_stage: string
          approved_at: string | null
          approved_by: string | null
          area_leader_approved: boolean | null
          area_leader_approved_at: string | null
          area_leader_approved_by: string | null
          area_leader_approver_name: string | null
          area_leader_observations: string | null
          balance_id: string | null
          business_days: number
          calendar_days: number | null
          company_id: string
          compensation_amount: number | null
          compensated_days: number
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          employee_id: string
          end_date: string
          enjoyment_days: number
          id: string
          interruption_date: string | null
          interruption_reason: string | null
          notes: string | null
          manager_approved: boolean | null
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_approver_name: string | null
          manager_observations: string | null
          payroll_recorded_days: number
          pending_activities: string | null
          pending_days_to_enjoy: number
          remaining_days: number | null
          request_type: Database["public"]["Enums"]["vacation_request_type"]
          request_date: string
          replacement_employee_id: string | null
          replacement_requires_hiring: boolean
          return_to_work_date: string | null
          resume_end_date: string | null
          resume_start_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["vacation_status"]
          total_requested_days: number
          updated_at: string
        }
        Insert: {
          accrued_days_at_request?: number
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          area_leader_approved?: boolean | null
          area_leader_approved_at?: string | null
          area_leader_approved_by?: string | null
          area_leader_approver_name?: string | null
          area_leader_observations?: string | null
          balance_id?: string | null
          business_days: number
          calendar_days?: number | null
          company_id: string
          compensation_amount?: number | null
          compensated_days?: number
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          end_date: string
          enjoyment_days?: number
          id?: string
          interruption_date?: string | null
          interruption_reason?: string | null
          notes?: string | null
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_approver_name?: string | null
          manager_observations?: string | null
          payroll_recorded_days?: number
          pending_activities?: string | null
          pending_days_to_enjoy?: number
          remaining_days?: number | null
          request_type?: Database["public"]["Enums"]["vacation_request_type"]
          request_date?: string
          replacement_employee_id?: string | null
          replacement_requires_hiring?: boolean
          return_to_work_date?: string | null
          resume_end_date?: string | null
          resume_start_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["vacation_status"]
          total_requested_days?: number
          updated_at?: string
        }
        Update: {
          accrued_days_at_request?: number
          approval_stage?: string
          approved_at?: string | null
          approved_by?: string | null
          area_leader_approved?: boolean | null
          area_leader_approved_at?: string | null
          area_leader_approved_by?: string | null
          area_leader_approver_name?: string | null
          area_leader_observations?: string | null
          balance_id?: string | null
          business_days?: number
          calendar_days?: number | null
          company_id?: string
          compensation_amount?: number | null
          compensated_days?: number
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          end_date?: string
          enjoyment_days?: number
          id?: string
          interruption_date?: string | null
          interruption_reason?: string | null
          notes?: string | null
          manager_approved?: boolean | null
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_approver_name?: string | null
          manager_observations?: string | null
          payroll_recorded_days?: number
          pending_activities?: string | null
          pending_days_to_enjoy?: number
          remaining_days?: number | null
          request_type?: Database["public"]["Enums"]["vacation_request_type"]
          request_date?: string
          replacement_employee_id?: string | null
          replacement_requires_hiring?: boolean
          return_to_work_date?: string | null
          resume_end_date?: string | null
          resume_start_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["vacation_status"]
          total_requested_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "vacation_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          break_minutes: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          days_of_week: number[]
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_training_media: {
        Args: { p_action: string; p_course_id: string }
        Returns: boolean
      }
      can_chat_in_company: { Args: { _company_id: string }; Returns: boolean }
      can_manage_candidate_document: {
        Args: { _action: string; _candidate_id: string; _company_id: string }
        Returns: boolean
      }
      can_view_hired_candidate_storage_document: {
        Args: {
          p_candidate_id: string
          p_company_id: string
          p_object_name: string
        }
        Returns: boolean
      }
      check_account_locked: {
        Args: {
          p_email: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: Json
      }
      check_candidate_background: {
        Args: {
          p_company_id?: string
          p_document_number: string
          p_document_type?: string
        }
        Returns: Json
      }
      check_center_access: {
        Args: { p_center_id: string; p_company_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { _action: string; _module_code: string; _user_id: string }
        Returns: boolean
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      close_training_group_assignment: {
        Args: { assignment_id_value: string }
        Returns: Json
      }
      complete_candidate_hiring: {
        Args: { p_candidate_id: string; p_hiring: Json }
        Returns: Json
      }
      complete_training_access: {
        Args: {
          p_employee_id: string
          p_operator_cedula: string
          p_operator_name: string
          p_quiz_score: number
          p_signature_data: string
          p_token: string
          p_user_agent: string
        }
        Returns: Json
      }
      create_vacation_request_workflow: {
        Args: { p_request: Json }
        Returns: Database["public"]["Tables"]["vacation_requests"]["Row"]
      }
      create_training_group_assignment: {
        Args: { payload: Json }
        Returns: Json
      }
      create_role_based_notifications: {
        Args: {
          _action_url?: string
          _category?: string
          _company_id: string
          _entity_id?: string
          _entity_type?: string
          _event_key: string
          _message: string
          _title: string
          _type?: string
        }
        Returns: number
      }
      delete_shift_assignments_for_absence: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: number
      }
      decide_vacation_as_area_leader: {
        Args: {
          p_approved: boolean
          p_observations?: string | null
          p_payroll_recorded_days: number
          p_request_id: string
        }
        Returns: Database["public"]["Tables"]["vacation_requests"]["Row"]
      }
      decide_vacation_as_manager: {
        Args: {
          p_approved: boolean
          p_observations?: string | null
          p_pending_activities: string | null
          p_replacement_employee_id: string | null
          p_replacement_requires_hiring: boolean
          p_request_id: string
          p_return_to_work_date: string | null
        }
        Returns: Database["public"]["Tables"]["vacation_requests"]["Row"]
      }
      delete_training_group_link: {
        Args: { assignment_id_value: string }
        Returns: Json
      }
      enqueue_hr_automation_runs: {
        Args: {
          _company_id: string
          _entity_type: Database["public"]["Enums"]["hr_automation_entity_type"]
          _payload: Json
          _record_id: string
          _trigger_type: Database["public"]["Enums"]["hr_automation_trigger_type"]
        }
        Returns: number
      }
      execute_read_only_query: { Args: { query_text: string }; Returns: Json }
      get_admin_user_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_candidate_by_token_and_document: {
        Args: {
          p_document_number: string
          p_document_type?: string
          p_token: string
        }
        Returns: Json
      }
      get_chat_unread_count: { Args: { _company_id: string }; Returns: number }
      get_employee_by_token_and_document: {
        Args: { p_document_number: string; p_token: string }
        Returns: Json
      }
      get_exam_profesiogramas_with_items: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_my_employee_id: { Args: never; Returns: string }
      get_next_contract_number: {
        Args: { _company_id: string; _prefix?: string }
        Returns: string
      }
      get_notification_recipient_user_ids: {
        Args: { _channel?: string; _company_id: string; _event_key: string }
        Returns: {
          user_id: string
        }[]
      }
      get_profesiogramas_with_items: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_psychology_users: {
        Args: { p_company_id: string }
        Returns: {
          display_name: string
          full_name: string
          id: string
        }[]
      }
      get_user_center_ids: { Args: never; Returns: string[] }
      get_user_company_ids: { Args: never; Returns: string[] }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: string
          module_code: string
        }[]
      }
      has_center_access: { Args: { _center_id: string }; Returns: boolean }
      has_company_center_assignments: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      has_employee_access: { Args: { _employee_id: string }; Returns: boolean }
      has_employee_v2_access: {
        Args: { _employee_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_training_completion: {
        Args: {
          p_employee_id?: string
          p_operator_cedula?: string
          p_token: string
        }
        Returns: boolean
      }
      hr_automation_config_matches: {
        Args: { _config: Json; _payload: Json }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_rrhh: { Args: never; Returns: boolean }
      is_auditor: { Args: never; Returns: boolean }
      is_chat_participant: {
        Args: { _conversation_id: string; _user_id?: string }
        Returns: boolean
      }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_psicologo: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      is_user_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_document_number: { Args: { p_value: string }; Returns: string }
      purge_expired_chat_messages: { Args: never; Returns: number }
      complete_direct_employee_rehire: {
        Args: { p_employee_id: string; p_hiring: Json }
        Returns: Json
      }
      get_direct_employee_rehire_prefill: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      regenerate_training_group_link: {
        Args: { assignment_id_value: string; expires_at_value: string }
        Returns: Json
      }
      get_training_group_compliance: {
        Args: { assignment_id_value: string }
        Returns: Json
      }
      resolve_training_group_token: {
        Args: { token_value: string }
        Returns: {
          assignment_id: string
          group_name: string
        }[]
      }
      start_employee_rehire: {
        Args: { p_employee_id: string; p_vacancy_id: string }
        Returns: Json
      }
      submit_candidate_registration:
        | {
            Args: {
              p_address?: string
              p_birth_date?: string
              p_city?: string
              p_current_company?: string
              p_current_position?: string
              p_department?: string
              p_document_number?: string
              p_document_type?: string
              p_education_level?: string
              p_email?: string
              p_experience_years?: number
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_general_notes?: string
              p_last_name: string
              p_mobile?: string
              p_phone?: string
              p_profession?: string
              p_salary_expectation?: number
              p_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_address?: string
              p_birth_date?: string
              p_blood_type?: string
              p_city?: string
              p_current_company?: string
              p_current_position?: string
              p_department?: string
              p_disability_type?: string
              p_document_issue_city?: string
              p_document_issue_date?: string
              p_document_number?: string
              p_document_type?: string
              p_education_level?: string
              p_email?: string
              p_emergency_contact_name?: string
              p_emergency_contact_phone?: string
              p_emergency_contact_relationship?: string
              p_ethnic_group?: string
              p_experience_years?: number
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_general_notes?: string
              p_is_conflict_victim?: boolean
              p_is_demobilized?: boolean
              p_is_first_job?: boolean
              p_is_head_of_household?: boolean
              p_last_name: string
              p_marital_status?: string
              p_mobile?: string
              p_neighborhood?: string
              p_phone?: string
              p_profession?: string
              p_salary_expectation?: number
              p_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_address?: string
              p_birth_date?: string
              p_blood_type?: string
              p_city?: string
              p_current_company?: string
              p_current_position?: string
              p_department?: string
              p_disability_type?: string
              p_document_issue_city?: string
              p_document_issue_date?: string
              p_document_number?: string
              p_document_type?: string
              p_education_level?: string
              p_education_level_id?: string
              p_email?: string
              p_emergency_contact_name?: string
              p_emergency_contact_phone?: string
              p_emergency_contact_relationship?: string
              p_ethnic_group?: string
              p_experience_years?: number
              p_family_members?: Json
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_general_notes?: string
              p_identification_type_id?: string
              p_is_conflict_victim?: boolean
              p_is_demobilized?: boolean
              p_is_first_job?: boolean
              p_is_head_of_household?: boolean
              p_last_name: string
              p_marital_status?: string
              p_mobile?: string
              p_neighborhood?: string
              p_phone?: string
              p_profession?: string
              p_profession_id?: string
              p_salary_expectation?: number
              p_token: string
            }
            Returns: Json
          }
      submit_defense_via_token: {
        Args: { p_content: string; p_defense_type?: string; p_token: string }
        Returns: Json
      }
      submit_employee_registration:
        | {
            Args: {
              p_birth_city?: string
              p_birth_country?: string
              p_birth_date?: string
              p_birth_department?: string
              p_blood_type?: string
              p_children_count?: number
              p_document_issue_city?: string
              p_document_issue_date?: string
              p_document_number?: string
              p_document_type?: string
              p_email?: string
              p_emergency_contact_name?: string
              p_emergency_contact_phone?: string
              p_emergency_contact_relationship?: string
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_last_name: string
              p_marital_status?: string
              p_middle_name?: string
              p_mobile?: string
              p_personal_email?: string
              p_phone?: string
              p_residence_address?: string
              p_residence_city?: string
              p_residence_department?: string
              p_residence_neighborhood?: string
              p_second_last_name?: string
              p_spouse_birth_date?: string
              p_spouse_name?: string
              p_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_number?: string
              p_account_type?: string
              p_afc?: string
              p_afp?: string
              p_arl?: string
              p_bank_name?: string
              p_birth_city?: string
              p_birth_country?: string
              p_birth_date?: string
              p_birth_department?: string
              p_blood_type?: string
              p_ccf?: string
              p_children_count?: number
              p_disability_type?: string
              p_document_issue_city?: string
              p_document_issue_date?: string
              p_document_number?: string
              p_document_type?: string
              p_email?: string
              p_emergency_contact_name?: string
              p_emergency_contact_phone?: string
              p_emergency_contact_relationship?: string
              p_eps?: string
              p_ethnic_group?: string
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_ips?: string
              p_is_conflict_victim?: boolean
              p_is_demobilized?: boolean
              p_is_first_job?: boolean
              p_is_head_of_household?: boolean
              p_last_name: string
              p_marital_status?: string
              p_middle_name?: string
              p_mobile?: string
              p_personal_email?: string
              p_phone?: string
              p_residence_address?: string
              p_residence_city?: string
              p_residence_department?: string
              p_residence_neighborhood?: string
              p_risk_level?: string
              p_second_last_name?: string
              p_spouse_birth_date?: string
              p_spouse_name?: string
              p_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_number?: string
              p_account_type?: string
              p_afc?: string
              p_afp?: string
              p_arl?: string
              p_bank_name?: string
              p_birth_city?: string
              p_birth_country?: string
              p_birth_date?: string
              p_birth_department?: string
              p_blood_type?: string
              p_ccf?: string
              p_children_count?: number
              p_disability_type?: string
              p_document_issue_city?: string
              p_document_issue_date?: string
              p_document_number?: string
              p_document_type?: string
              p_education_level_id?: string
              p_email?: string
              p_emergency_contact_name?: string
              p_emergency_contact_phone?: string
              p_emergency_contact_relationship?: string
              p_eps?: string
              p_ethnic_group?: string
              p_first_name: string
              p_gender?: string
              p_gender_identity?: string
              p_gender_identity_other?: string
              p_identification_type_id?: string
              p_ips?: string
              p_is_conflict_victim?: boolean
              p_is_demobilized?: boolean
              p_is_first_job?: boolean
              p_is_head_of_household?: boolean
              p_last_name: string
              p_marital_status?: string
              p_middle_name?: string
              p_mobile?: string
              p_personal_email?: string
              p_phone?: string
              p_profession_id?: string
              p_residence_address?: string
              p_residence_city?: string
              p_residence_department?: string
              p_residence_neighborhood?: string
              p_risk_level?: string
              p_second_last_name?: string
              p_spouse_birth_date?: string
              p_spouse_name?: string
              p_token: string
            }
            Returns: Json
          }
      submit_employee_rehire_registration: {
        Args: { p_profile: Json; p_token: string }
        Returns: Json
      }
      update_employee_from_registration: {
        Args: {
          p_account_number?: string
          p_account_type?: string
          p_afc?: string
          p_afp?: string
          p_arl?: string
          p_avatar_url?: string
          p_bank_name?: string
          p_birth_city?: string
          p_birth_country?: string
          p_birth_date?: string
          p_birth_department?: string
          p_blood_type?: string
          p_ccf?: string
          p_children_count?: number
          p_disability_type?: string
          p_document_issue_city?: string
          p_document_issue_date?: string
          p_document_number?: string
          p_document_type?: string
          p_education_level_id?: string
          p_email?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_emergency_contact_relationship?: string
          p_employee_id: string
          p_eps?: string
          p_ethnic_group?: string
          p_family_members?: Json
          p_first_name: string
          p_gender?: string
          p_gender_identity?: string
          p_gender_identity_other?: string
          p_identification_type_id?: string
          p_ips?: string
          p_is_conflict_victim?: boolean
          p_is_demobilized?: boolean
          p_is_first_job?: boolean
          p_is_head_of_household?: boolean
          p_last_name: string
          p_marital_status?: string
          p_middle_name?: string
          p_mobile?: string
          p_personal_email?: string
          p_phone?: string
          p_profession_id?: string
          p_residence_address?: string
          p_residence_city?: string
          p_residence_department?: string
          p_residence_neighborhood?: string
          p_risk_level?: string
          p_second_last_name?: string
          p_spouse_birth_date?: string
          p_spouse_name?: string
          p_token: string
          p_vaccines?: Json
        }
        Returns: Json
      }
      update_training_group_assignment: {
        Args: { assignment_id_value: string; payload: Json }
        Returns: Json
      }
      user_can_read_requisition:
        | {
            Args: {
              p_company_id: string
              p_created_by: string
              p_estado_requisicion: string
              p_is_confidential: boolean
              p_operation_center_id: string
              p_solicitante_id: string
            }
            Returns: boolean
          }
        | { Args: { p_requisition_id: string }; Returns: boolean }
      user_can_read_vacation_request: {
        Args: {
          p_approval_stage: string
          p_company_id: string
          p_created_by: string
          p_employee_id: string
        }
        Returns: boolean
      }
      validate_registration_token: { Args: { p_token: string }; Returns: Json }
      validate_training_access_token: {
        Args: { p_token: string }
        Returns: Json
      }
      vacation_approver_name: { Args: { p_user_id: string }; Returns: string }
      verify_employee_cedula: {
        Args: { p_cedula: string; p_company_id: string }
        Returns: {
          employee_id: string
          employee_name: string
        }[]
      }
      verify_training_group_participant: {
        Args: { document_value: string; token_value: string }
        Returns: {
          assignment_id: string
          employee_id: string
          employee_name: string
          group_name: string
        }[]
      }
    }
    Enums: {
      account_type: "ahorros" | "corriente"
      app_role: "admin" | "rrhh" | "psicologo" | "jefe_area" | "auditor"
      attendance_status: "inscrito" | "asistio" | "no_asistio" | "justificado"
      blood_type: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      candidate_status:
        | "applied"
        | "in_interview"
        | "in_psycho_test"
        | "in_technical_test"
        | "in_validation"
        | "in_medical"
        | "selected"
        | "not_selected"
        | "withdrawn"
        | "hired"
      certification_type:
        | "licencia_conduccion"
        | "manejo_defensivo"
        | "manipulacion_alimentos"
        | "psicosensometrico"
        | "bpm"
        | "trabajo_alturas"
        | "primeros_auxilios"
        | "otro"
      cesantias_status:
        | "pendiente"
        | "calculado"
        | "depositado"
        | "extemporaneo"
      cesantias_withdrawal_reason:
        | "vivienda"
        | "educacion"
        | "terminacion_contrato"
      chat_conversation_type: "direct" | "group"
      chat_message_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "file"
        | "system"
      chat_receipt_status: "sent" | "delivered" | "read"
      compliance_domain:
        | "pila_ugpp"
        | "nomina_electronica"
        | "sg_sst"
        | "documental_laboral"
        | "juridico_laboral"
        | "contratos"
        | "seguridad_social"
      compliance_priority: "baja" | "media" | "alta" | "critica"
      compliance_status:
        | "pendiente"
        | "en_proceso"
        | "cumplido"
        | "vencido"
        | "no_aplica"
      contract_type:
        | "indefinido"
        | "fijo"
        | "obra_labor"
        | "aprendizaje"
        | "servicios"
      day_of_week:
        | "lunes"
        | "martes"
        | "miercoles"
        | "jueves"
        | "viernes"
        | "sabado"
        | "domingo"
        | "2_dias"
        | "4_dias"
        | "7_dias"
      deduction_status: "activo" | "pausado" | "finalizado" | "cancelado"
      deduction_type:
        | "judicial"
        | "responsabilidad"
        | "cooperativa"
        | "sindicato"
        | "otro"
      disciplinary_status:
        | "apertura"
        | "investigacion"
        | "citacion_descargos"
        | "descargos"
        | "analisis"
        | "decision"
        | "apelacion"
        | "cerrado"
      document_expiry_alert_status: "pendiente" | "notificada" | "cerrada"
      document_type: "CC" | "CE" | "TI" | "PA" | "PEP"
      dotation_item_type:
        | "uniforme_camisa"
        | "uniforme_pantalon"
        | "uniforme_conjunto"
        | "calzado_seguridad"
        | "calzado_dielectrico"
        | "casco"
        | "guantes"
        | "gafas_seguridad"
        | "protector_auditivo"
        | "arnes"
        | "overol"
        | "chaleco_reflectivo"
        | "impermeable"
        | "otros"
      employee_document_type:
        | "contrato"
        | "hoja_vida"
        | "cedula"
        | "certificado_laboral"
        | "certificado_estudio"
        | "antecedentes"
        | "carta_residencia"
        | "carta_banco"
        | "otro"
        | "certificados_laborales_academicos"
        | "proceso_seleccion"
        | "certificados_residencia"
        | "afiliaciones"
        | "examenes_ocupacionales"
        | "carne_vacunas"
        | "consulta_antecedentes"
        | "dotacion"
        | "contratos_otrosi"
        | "certificados_bancarios"
        | "documentos_retiro"
        | "inducciones_cursos"
        | "licencia_cursos"
        | "preavisos"
      employee_status: "active" | "suspended" | "retired" | "en_retiro"
      employee_time_mode: "administrative" | "shift"
      employment_cycle_source:
        | "selection"
        | "rehire"
        | "direct_rehire"
        | "manual"
        | "backfill"
      employment_cycle_status: "active" | "terminated"
      evaluation_cycle_status: "draft" | "active" | "completed" | "cancelled"
      evaluation_status:
        | "pending"
        | "in_progress"
        | "submitted"
        | "reviewed"
        | "approved"
      evaluation_type: "self" | "manager" | "peer" | "360"
      exam_result: "apto" | "apto_restricciones" | "no_apto" | "pendiente"
      exam_type:
        | "ingreso"
        | "periodico"
        | "egreso"
        | "reintegro"
        | "post_incapacidad"
        | "cambio_cargo"
        | "seguimiento"
      fault_type: "leve" | "grave" | "gravisima"
      gender_type: "M" | "F" | "O"
      hr_automation_action_type:
        | "set_status"
        | "assign_to"
        | "notify"
        | "schedule_meeting"
        | "create_task"
      hr_automation_entity_type:
        | "employee"
        | "candidate"
        | "leave_request"
        | "vacation_request"
        | "performance_review"
        | "onboarding"
      hr_automation_trigger_type:
        | "employee_hired"
        | "status_changed"
        | "department_changed"
        | "review_completed"
        | "leave_requested"
        | "vacation_requested"
        | "candidate_status_changed"
        | "onboarding_task_completed"
      incapacity_origin:
        | "comun"
        | "laboral"
        | "accidente_transito"
        | "licencia_maternidad"
        | "licencia_paternidad"
      leave_duration_type: "dias_completos" | "medio_dia" | "horas"
      leave_request_status: "pendiente" | "aprobado" | "rechazado" | "cancelado"
      leave_type:
        | "calamidad_domestica"
        | "cita_medica"
        | "licencia_maternidad"
        | "licencia_paternidad"
        | "licencia_luto"
        | "permiso_sindical"
        | "permiso_estudio"
        | "permiso_personal"
        | "licencia_no_remunerada"
        | "otro"
      link_type:
        | "indefinido"
        | "fijo"
        | "obra_labor"
        | "aprendizaje"
        | "servicios"
        | "temporal"
      loan_status:
        | "solicitado"
        | "aprobado"
        | "activo"
        | "pagado"
        | "cancelado"
        | "rechazado"
      loan_type:
        | "personal"
        | "vivienda"
        | "educacion"
        | "calamidad"
        | "libranza"
        | "anticipo"
        | "otro"
      marital_status_type:
        | "soltero"
        | "casado"
        | "union_libre"
        | "divorciado"
        | "viudo"
      notification_engine_channel:
        | "in_app"
        | "push"
        | "email"
        | "whatsapp"
        | "sms"
        | "teams"
        | "telegram"
        | "webhook"
      notification_engine_delivery_status:
        | "queued"
        | "pending"
        | "sent"
        | "read"
        | "attended"
        | "failed"
        | "cancelled"
        | "suppressed"
      notification_engine_kind: "notification" | "alert"
      notification_engine_priority:
        | "critical"
        | "high"
        | "medium"
        | "low"
        | "info"
      overtime_status: "pendiente" | "aprobado" | "rechazado" | "pagado"
      overtime_type:
        | "extra_diurna"
        | "extra_nocturna"
        | "recargo_nocturno"
        | "dominical_diurna"
        | "dominical_nocturna"
        | "festivo_diurna"
        | "festivo_nocturna"
      payroll_type: "quincenal" | "mensual"
      permission_action:
        | "view"
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "export"
      pila_period_status: "borrador" | "validado" | "con_alertas" | "cerrado"
      pila_validation_status: "ok" | "advertencia" | "critico"
      recovery_status:
        | "pendiente"
        | "radicado"
        | "en_tramite"
        | "aprobado"
        | "rechazado"
        | "pagado"
        | "asumido_empresa"
      recruitment_type: "externa" | "interna" | "mixta"
      requisition_reason:
        | "renuncia"
        | "vacaciones"
        | "incapacidad"
        | "rotacion"
        | "movimiento_interno"
        | "nuevo_cargo"
        | "nuevo_puesto"
        | "terminacion_contrato"
        | "calamidad"
        | "licencia"
      requisition_status:
        | "borrador"
        | "enviada"
        | "en_operaciones"
        | "en_rrhh"
        | "en_juridico"
        | "en_seleccion"
        | "en_gerencia"
        | "aprobada"
        | "rechazada"
        | "cerrada"
        | "en_coordinadores"
      risk_level: "I" | "II" | "III" | "IV" | "V"
      sanction_type:
        | "amonestacion_verbal"
        | "amonestacion_escrita"
        | "suspension_1_3_dias"
        | "suspension_4_8_dias"
        | "terminacion_justa_causa"
        | "sin_sancion"
      selection_step_status:
        | "pending"
        | "scheduled"
        | "completed"
        | "passed"
        | "failed"
        | "skipped"
        | "not_applicable"
      selection_step_type:
        | "initial_interview"
        | "psycho_test"
        | "technical_test"
        | "background_check"
        | "academic_validation"
        | "reference_check"
        | "financial_check"
        | "medical_exam"
        | "final_interview"
        | "offer"
        | "prefiltro"
        | "entrevista_seleccion"
        | "entrevista_jefe"
        | "validacion_antecedentes"
        | "pruebas_psicotecnicas"
        | "pruebas_conocimiento"
        | "validacion_academica"
        | "validacion_referencias"
        | "examenes_medicos"
      shift_assignment_source: "cycle" | "manual"
      termination_document_type:
        | "acta_terminacion"
        | "preaviso"
        | "notificacion_aportes"
        | "aceptacion_renuncia"
        | "certificado_laboral"
        | "paz_y_salvo"
        | "examen_egreso"
        | "retiro_cesantias"
      termination_type:
        | "mutuo_acuerdo"
        | "preaviso"
        | "periodo_prueba"
        | "obra_labor"
        | "sin_justa_causa"
        | "renuncia"
        | "traslado"
        | "tiempo_pactado"
        | "pension_vejez"
      training_modality: "presencial" | "virtual" | "mixto"
      training_status: "programado" | "en_curso" | "completado" | "cancelado"
      transfer_status: "pending" | "completed" | "cancelled"
      vacancy_reason:
        | "new_position"
        | "replacement"
        | "growth"
        | "temporary"
        | "other"
      vacancy_status:
        | "open"
        | "in_process"
        | "closed"
        | "cancelled"
        | "paused"
        | "pending_placed"
      vacancy_type: "internal" | "external" | "both"
      vacation_request_type:
        | "disfrute"
        | "compensacion"
        | "acumulacion"
        | "interrupcion"
      vacation_status:
        | "borrador"
        | "aprobado"
        | "en_curso"
        | "completado"
        | "cancelado"
        | "interrumpido"
      vaccine_type:
        | "TT"
        | "HA"
        | "HB"
        | "FA"
        | "TIFO"
        | "COVID"
        | "INFLUENZA"
        | "otro"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["ahorros", "corriente"],
      app_role: ["admin", "rrhh", "psicologo", "jefe_area", "auditor"],
      attendance_status: ["inscrito", "asistio", "no_asistio", "justificado"],
      blood_type: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      candidate_status: [
        "applied",
        "in_interview",
        "in_psycho_test",
        "in_technical_test",
        "in_validation",
        "in_medical",
        "selected",
        "not_selected",
        "withdrawn",
        "hired",
      ],
      certification_type: [
        "licencia_conduccion",
        "manejo_defensivo",
        "manipulacion_alimentos",
        "psicosensometrico",
        "bpm",
        "trabajo_alturas",
        "primeros_auxilios",
        "otro",
      ],
      cesantias_status: [
        "pendiente",
        "calculado",
        "depositado",
        "extemporaneo",
      ],
      cesantias_withdrawal_reason: [
        "vivienda",
        "educacion",
        "terminacion_contrato",
      ],
      chat_conversation_type: ["direct", "group"],
      chat_message_type: ["text", "image", "video", "audio", "file", "system"],
      chat_receipt_status: ["sent", "delivered", "read"],
      compliance_domain: [
        "pila_ugpp",
        "nomina_electronica",
        "sg_sst",
        "documental_laboral",
        "juridico_laboral",
        "contratos",
        "seguridad_social",
      ],
      compliance_priority: ["baja", "media", "alta", "critica"],
      compliance_status: [
        "pendiente",
        "en_proceso",
        "cumplido",
        "vencido",
        "no_aplica",
      ],
      contract_type: [
        "indefinido",
        "fijo",
        "obra_labor",
        "aprendizaje",
        "servicios",
      ],
      day_of_week: [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
        "2_dias",
        "4_dias",
        "7_dias",
      ],
      deduction_status: ["activo", "pausado", "finalizado", "cancelado"],
      deduction_type: [
        "judicial",
        "responsabilidad",
        "cooperativa",
        "sindicato",
        "otro",
      ],
      disciplinary_status: [
        "apertura",
        "investigacion",
        "citacion_descargos",
        "descargos",
        "analisis",
        "decision",
        "apelacion",
        "cerrado",
      ],
      document_expiry_alert_status: ["pendiente", "notificada", "cerrada"],
      document_type: ["CC", "CE", "TI", "PA", "PEP"],
      dotation_item_type: [
        "uniforme_camisa",
        "uniforme_pantalon",
        "uniforme_conjunto",
        "calzado_seguridad",
        "calzado_dielectrico",
        "casco",
        "guantes",
        "gafas_seguridad",
        "protector_auditivo",
        "arnes",
        "overol",
        "chaleco_reflectivo",
        "impermeable",
        "otros",
      ],
      employee_document_type: [
        "contrato",
        "hoja_vida",
        "cedula",
        "certificado_laboral",
        "certificado_estudio",
        "antecedentes",
        "carta_residencia",
        "carta_banco",
        "otro",
        "certificados_laborales_academicos",
        "proceso_seleccion",
        "certificados_residencia",
        "afiliaciones",
        "examenes_ocupacionales",
        "carne_vacunas",
        "consulta_antecedentes",
        "dotacion",
        "contratos_otrosi",
        "certificados_bancarios",
        "documentos_retiro",
        "inducciones_cursos",
        "licencia_cursos",
        "preavisos",
      ],
      employee_status: ["active", "suspended", "retired", "en_retiro"],
      employee_time_mode: ["administrative", "shift"],
      employment_cycle_source: [
        "selection",
        "rehire",
        "direct_rehire",
        "manual",
        "backfill",
      ],
      employment_cycle_status: ["active", "terminated"],
      evaluation_cycle_status: ["draft", "active", "completed", "cancelled"],
      evaluation_status: [
        "pending",
        "in_progress",
        "submitted",
        "reviewed",
        "approved",
      ],
      evaluation_type: ["self", "manager", "peer", "360"],
      exam_result: ["apto", "apto_restricciones", "no_apto", "pendiente"],
      exam_type: [
        "ingreso",
        "periodico",
        "egreso",
        "reintegro",
        "post_incapacidad",
        "cambio_cargo",
        "seguimiento",
      ],
      fault_type: ["leve", "grave", "gravisima"],
      gender_type: ["M", "F", "O"],
      hr_automation_action_type: [
        "set_status",
        "assign_to",
        "notify",
        "schedule_meeting",
        "create_task",
      ],
      hr_automation_entity_type: [
        "employee",
        "candidate",
        "leave_request",
        "vacation_request",
        "performance_review",
        "onboarding",
      ],
      hr_automation_trigger_type: [
        "employee_hired",
        "status_changed",
        "department_changed",
        "review_completed",
        "leave_requested",
        "vacation_requested",
        "candidate_status_changed",
        "onboarding_task_completed",
      ],
      incapacity_origin: [
        "comun",
        "laboral",
        "accidente_transito",
        "licencia_maternidad",
        "licencia_paternidad",
      ],
      leave_duration_type: ["dias_completos", "medio_dia", "horas"],
      leave_request_status: ["pendiente", "aprobado", "rechazado", "cancelado"],
      leave_type: [
        "calamidad_domestica",
        "cita_medica",
        "licencia_maternidad",
        "licencia_paternidad",
        "licencia_luto",
        "permiso_sindical",
        "permiso_estudio",
        "permiso_personal",
        "licencia_no_remunerada",
        "otro",
      ],
      link_type: [
        "indefinido",
        "fijo",
        "obra_labor",
        "aprendizaje",
        "servicios",
        "temporal",
      ],
      loan_status: [
        "solicitado",
        "aprobado",
        "activo",
        "pagado",
        "cancelado",
        "rechazado",
      ],
      loan_type: [
        "personal",
        "vivienda",
        "educacion",
        "calamidad",
        "libranza",
        "anticipo",
        "otro",
      ],
      marital_status_type: [
        "soltero",
        "casado",
        "union_libre",
        "divorciado",
        "viudo",
      ],
      notification_engine_channel: [
        "in_app",
        "push",
        "email",
        "whatsapp",
        "sms",
        "teams",
        "telegram",
        "webhook",
      ],
      notification_engine_delivery_status: [
        "queued",
        "pending",
        "sent",
        "read",
        "attended",
        "failed",
        "cancelled",
        "suppressed",
      ],
      notification_engine_kind: ["notification", "alert"],
      notification_engine_priority: [
        "critical",
        "high",
        "medium",
        "low",
        "info",
      ],
      overtime_status: ["pendiente", "aprobado", "rechazado", "pagado"],
      overtime_type: [
        "extra_diurna",
        "extra_nocturna",
        "recargo_nocturno",
        "dominical_diurna",
        "dominical_nocturna",
        "festivo_diurna",
        "festivo_nocturna",
      ],
      payroll_type: ["quincenal", "mensual"],
      permission_action: [
        "view",
        "create",
        "update",
        "delete",
        "approve",
        "export",
      ],
      pila_period_status: ["borrador", "validado", "con_alertas", "cerrado"],
      pila_validation_status: ["ok", "advertencia", "critico"],
      recovery_status: [
        "pendiente",
        "radicado",
        "en_tramite",
        "aprobado",
        "rechazado",
        "pagado",
        "asumido_empresa",
      ],
      recruitment_type: ["externa", "interna", "mixta"],
      requisition_reason: [
        "renuncia",
        "vacaciones",
        "incapacidad",
        "rotacion",
        "movimiento_interno",
        "nuevo_cargo",
        "nuevo_puesto",
        "terminacion_contrato",
        "calamidad",
        "licencia",
      ],
      requisition_status: [
        "borrador",
        "enviada",
        "en_operaciones",
        "en_rrhh",
        "en_juridico",
        "en_seleccion",
        "en_gerencia",
        "aprobada",
        "rechazada",
        "cerrada",
        "en_coordinadores",
      ],
      risk_level: ["I", "II", "III", "IV", "V"],
      sanction_type: [
        "amonestacion_verbal",
        "amonestacion_escrita",
        "suspension_1_3_dias",
        "suspension_4_8_dias",
        "terminacion_justa_causa",
        "sin_sancion",
      ],
      selection_step_status: [
        "pending",
        "scheduled",
        "completed",
        "passed",
        "failed",
        "skipped",
        "not_applicable",
      ],
      selection_step_type: [
        "initial_interview",
        "psycho_test",
        "technical_test",
        "background_check",
        "academic_validation",
        "reference_check",
        "financial_check",
        "medical_exam",
        "final_interview",
        "offer",
        "prefiltro",
        "entrevista_seleccion",
        "entrevista_jefe",
        "validacion_antecedentes",
        "pruebas_psicotecnicas",
        "pruebas_conocimiento",
        "validacion_academica",
        "validacion_referencias",
        "examenes_medicos",
      ],
      shift_assignment_source: ["cycle", "manual"],
      termination_document_type: [
        "acta_terminacion",
        "preaviso",
        "notificacion_aportes",
        "aceptacion_renuncia",
        "certificado_laboral",
        "paz_y_salvo",
        "examen_egreso",
        "retiro_cesantias",
      ],
      termination_type: [
        "mutuo_acuerdo",
        "preaviso",
        "periodo_prueba",
        "obra_labor",
        "sin_justa_causa",
        "renuncia",
        "traslado",
        "tiempo_pactado",
        "pension_vejez",
      ],
      training_modality: ["presencial", "virtual", "mixto"],
      training_status: ["programado", "en_curso", "completado", "cancelado"],
      transfer_status: ["pending", "completed", "cancelled"],
      vacancy_reason: [
        "new_position",
        "replacement",
        "growth",
        "temporary",
        "other",
      ],
      vacancy_status: [
        "open",
        "in_process",
        "closed",
        "cancelled",
        "paused",
        "pending_placed",
      ],
      vacancy_type: ["internal", "external", "both"],
      vacation_request_type: [
        "disfrute",
        "compensacion",
        "acumulacion",
        "interrupcion",
      ],
      vacation_status: [
        "borrador",
        "aprobado",
        "en_curso",
        "completado",
        "cancelado",
        "interrumpido",
      ],
      vaccine_type: [
        "TT",
        "HA",
        "HB",
        "FA",
        "TIFO",
        "COVID",
        "INFLUENZA",
        "otro",
      ],
    },
  },
} as const

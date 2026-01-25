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
      candidates: {
        Row: {
          address: string | null
          application_date: string
          birth_date: string | null
          city: string | null
          created_at: string
          created_by: string | null
          current_company: string | null
          current_position: string | null
          current_step:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url: string | null
          department: string | null
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          education_level: string | null
          email: string | null
          employee_id: string | null
          experience_years: number | null
          final_concept: string | null
          final_score: number | null
          first_name: string
          gender: string | null
          general_notes: string | null
          id: string
          is_selected: boolean | null
          last_name: string
          mobile: string | null
          phone: string | null
          profession: string | null
          rejection_reason: string | null
          salary_expectation: number | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          strengths: string | null
          updated_at: string
          vacancy_id: string
          weaknesses: string | null
        }
        Insert: {
          address?: string | null
          application_date?: string
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          current_step?:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url?: string | null
          department?: string | null
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          email?: string | null
          employee_id?: string | null
          experience_years?: number | null
          final_concept?: string | null
          final_score?: number | null
          first_name: string
          gender?: string | null
          general_notes?: string | null
          id?: string
          is_selected?: boolean | null
          last_name: string
          mobile?: string | null
          phone?: string | null
          profession?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          strengths?: string | null
          updated_at?: string
          vacancy_id: string
          weaknesses?: string | null
        }
        Update: {
          address?: string | null
          application_date?: string
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_position?: string | null
          current_step?:
            | Database["public"]["Enums"]["selection_step_type"]
            | null
          cv_url?: string | null
          department?: string | null
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          education_level?: string | null
          email?: string | null
          employee_id?: string | null
          experience_years?: number | null
          final_concept?: string | null
          final_score?: number | null
          first_name?: string
          gender?: string | null
          general_notes?: string | null
          id?: string
          is_selected?: boolean | null
          last_name?: string
          mobile?: string | null
          phone?: string | null
          profession?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          strengths?: string | null
          updated_at?: string
          vacancy_id?: string
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
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
          id?: string
          logo_url?: string | null
          name?: string
          nit?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_extensions: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          document_url: string | null
          end_date: string
          extension_number: number
          id: string
          new_salary: number | null
          reason: string | null
          start_date: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date: string
          extension_number: number
          id?: string
          new_salary?: number | null
          reason?: string | null
          start_date: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          end_date?: string
          extension_number?: number
          id?: string
          new_salary?: number | null
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_extensions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
          display_name: string
          id: string
          is_active: boolean | null
          max_duration_months: number | null
          max_extensions: number | null
          requires_end_date: boolean | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_type: string
          created_at?: string
          default_trial_days?: number | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_duration_months?: number | null
          max_extensions?: number | null
          requires_end_date?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_type?: string
          created_at?: string
          default_trial_days?: number | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_duration_months?: number | null
          max_extensions?: number | null
          requires_end_date?: boolean | null
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
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          document_url: string | null
          employee_id: string
          end_date: string | null
          has_confidentiality_clause: boolean | null
          has_non_compete_clause: boolean | null
          id: string
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
        }
        Insert: {
          contract_number?: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          end_date?: string | null
          has_confidentiality_clause?: boolean | null
          has_non_compete_clause?: boolean | null
          id?: string
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
        }
        Update: {
          contract_number?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          end_date?: string | null
          has_confidentiality_clause?: boolean | null
          has_non_compete_clause?: boolean | null
          id?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_defenses: {
        Row: {
          content: string
          created_at: string
          defense_date: string
          defense_type: string
          document_url: string | null
          id: string
          process_id: string
          received_by: string | null
          received_by_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          defense_date: string
          defense_type: string
          document_url?: string | null
          id?: string
          process_id: string
          received_by?: string | null
          received_by_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          defense_date?: string
          defense_type?: string
          document_url?: string | null
          id?: string
          process_id?: string
          received_by?: string | null
          received_by_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "disciplinary_timeline_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "disciplinary_processes"
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dotation_deliveries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      employee_bank_info: {
        Row: {
          account_number: string | null
          account_registered: boolean | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          bank_letter_url: string | null
          bank_name: string | null
          created_at: string
          employee_id: string
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
          created_at?: string
          employee_id: string
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
          created_at?: string
          employee_id?: string
          id?: string
          is_current?: boolean
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_info_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          applies_to_position: boolean | null
          certification_name: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
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
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contact: {
        Row: {
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string
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
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id: string
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
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string
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
            foreignKeyName: "employee_contact_employee_id_fkey"
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
        ]
      }
      employee_family: {
        Row: {
          children_count: number | null
          created_at: string
          employee_id: string
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
          created_at?: string
          employee_id: string
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
          created_at?: string
          employee_id?: string
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
            foreignKeyName: "employee_family_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
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
      employee_schedule: {
        Row: {
          created_at: string
          employee_id: string
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
          created_at?: string
          employee_id: string
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
          created_at?: string
          employee_id?: string
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
            foreignKeyName: "employee_schedule_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
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
      employee_shifts: {
        Row: {
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
          created_at: string
          employee_id: string
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
          created_at?: string
          employee_id: string
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
          created_at?: string
          employee_id?: string
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
            foreignKeyName: "employee_social_security_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_terminations: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
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
          contract_id: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          employee_id: string
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
          contract_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vaccinations: {
        Row: {
          application_date: string
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
            foreignKeyName: "employees_operation_center_id_fkey"
            columns: ["operation_center_id"]
            isOneToOne: false
            referencedRelation: "operation_centers"
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
          document_issue_city: string | null
          document_issue_date: string | null
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean
          last_name: string
          marital_status:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name: string | null
          second_last_name: string | null
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
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number: string
          document_type?: Database["public"]["Enums"]["document_type"]
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean
          last_name: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name?: string | null
          second_last_name?: string | null
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
          document_issue_city?: string | null
          document_issue_date?: string | null
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean
          last_name?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          middle_name?: string | null
          second_last_name?: string | null
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
        ]
      }
      leave_balances: {
        Row: {
          available_days: number | null
          company_id: string
          created_at: string
          employee_id: string
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
      medical_exams: {
        Row: {
          concept: string
          created_at: string
          created_by: string | null
          doctor_name: string
          document_url: string | null
          employee_id: string
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          expiration_date: string | null
          id: string
          observations: string | null
          provider: string
          restrictions: string | null
          result: Database["public"]["Enums"]["exam_result"]
          updated_at: string
        }
        Insert: {
          concept: string
          created_at?: string
          created_by?: string | null
          doctor_name: string
          document_url?: string | null
          employee_id: string
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          expiration_date?: string | null
          id?: string
          observations?: string | null
          provider: string
          restrictions?: string | null
          result?: Database["public"]["Enums"]["exam_result"]
          updated_at?: string
        }
        Update: {
          concept?: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string
          document_url?: string | null
          employee_id?: string
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          expiration_date?: string | null
          id?: string
          observations?: string | null
          provider?: string
          restrictions?: string | null
          result?: Database["public"]["Enums"]["exam_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_exams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          manager_name: string | null
          name: string
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
          department?: string | null
          id?: string
          manager_name?: string | null
          name: string
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
          department?: string | null
          id?: string
          manager_name?: string | null
          name?: string
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
        ]
      }
      selection_steps: {
        Row: {
          candidate_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          evaluator_id: string | null
          evaluator_name: string | null
          id: string
          notes: string | null
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
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          notes?: string | null
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
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          notes?: string | null
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
            foreignKeyName: "termination_documents_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "employee_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          attendance_date: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          employee_id: string
          enrolled_by: string | null
          enrollment_date: string
          id: string
          observations: string | null
          passed: boolean | null
          score: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          employee_id: string
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          observations?: string | null
          passed?: boolean | null
          score?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          employee_id?: string
          enrolled_by?: string | null
          enrollment_date?: string
          id?: string
          observations?: string | null
          passed?: boolean | null
          score?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
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
      training_certificates: {
        Row: {
          certificate_number: string
          certificate_url: string | null
          company_id: string
          course_id: string
          created_at: string
          employee_id: string
          expiry_date: string | null
          id: string
          issue_date: string
          issued_by: string | null
          observations: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
        }
        Insert: {
          certificate_number: string
          certificate_url?: string | null
          company_id: string
          course_id: string
          created_at?: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          observations?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
        }
        Update: {
          certificate_number?: string
          certificate_url?: string | null
          company_id?: string
          course_id?: string
          created_at?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          observations?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string
          code: string | null
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number
          id: string
          is_active: boolean
          is_mandatory: boolean
          modality: Database["public"]["Enums"]["training_modality"]
          name: string
          objectives: string | null
          prerequisites: string | null
          provider: string | null
          requires_certification: boolean
          target_audience: string | null
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          category?: string
          code?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          modality?: Database["public"]["Enums"]["training_modality"]
          name: string
          objectives?: string | null
          prerequisites?: string | null
          provider?: string | null
          requires_certification?: boolean
          target_audience?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          category?: string
          code?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          modality?: Database["public"]["Enums"]["training_modality"]
          name?: string
          objectives?: string | null
          prerequisites?: string | null
          provider?: string | null
          requires_certification?: boolean
          target_audience?: string | null
          updated_at?: string
          validity_months?: number | null
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
      training_plan_items: {
        Row: {
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
      vacancies: {
        Row: {
          actual_close_date: string | null
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
          position_title: string
          positions_count: number
          priority: string | null
          psychologist_id: string | null
          publication_platforms: string[] | null
          reason_details: string | null
          requirements: string | null
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
          position_title: string
          positions_count?: number
          priority?: string | null
          psychologist_id?: string | null
          publication_platforms?: string[] | null
          reason_details?: string | null
          requirements?: string | null
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
          position_title?: string
          positions_count?: number
          priority?: string | null
          psychologist_id?: string | null
          publication_platforms?: string[] | null
          reason_details?: string | null
          requirements?: string | null
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
          approved_at: string | null
          approved_by: string | null
          balance_id: string | null
          business_days: number
          calendar_days: number | null
          company_id: string
          compensation_amount: number | null
          created_at: string
          created_by: string | null
          document_url: string | null
          employee_id: string
          end_date: string
          id: string
          interruption_date: string | null
          interruption_reason: string | null
          notes: string | null
          remaining_days: number | null
          request_type: Database["public"]["Enums"]["vacation_request_type"]
          resume_end_date: string | null
          resume_start_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["vacation_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          balance_id?: string | null
          business_days: number
          calendar_days?: number | null
          company_id: string
          compensation_amount?: number | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          end_date: string
          id?: string
          interruption_date?: string | null
          interruption_reason?: string | null
          notes?: string | null
          remaining_days?: number | null
          request_type?: Database["public"]["Enums"]["vacation_request_type"]
          resume_end_date?: string | null
          resume_start_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["vacation_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          balance_id?: string | null
          business_days?: number
          calendar_days?: number | null
          company_id?: string
          compensation_amount?: number | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          interruption_date?: string | null
          interruption_reason?: string | null
          notes?: string | null
          remaining_days?: number | null
          request_type?: Database["public"]["Enums"]["vacation_request_type"]
          resume_end_date?: string | null
          resume_start_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["vacation_status"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_center_ids: { Args: never; Returns: string[] }
      get_user_company_ids: { Args: never; Returns: string[] }
      has_center_access: { Args: { _center_id: string }; Returns: boolean }
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
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_rrhh: { Args: never; Returns: boolean }
      is_auditor: { Args: never; Returns: boolean }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_psicologo: { Args: never; Returns: boolean }
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
      certificate_status: "pendiente" | "emitido" | "vencido"
      certification_type:
        | "licencia_conduccion"
        | "manejo_defensivo"
        | "manipulacion_alimentos"
        | "psicosensometrico"
        | "bpm"
        | "trabajo_alturas"
        | "primeros_auxilios"
        | "otro"
      contract_type:
        | "indefinido"
        | "fijo"
        | "obra_labor"
        | "aprendizaje"
        | "servicios"
      disciplinary_status:
        | "apertura"
        | "investigacion"
        | "citacion_descargos"
        | "descargos"
        | "analisis"
        | "decision"
        | "apelacion"
        | "cerrado"
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
      employee_status: "active" | "suspended" | "retired" | "en_retiro"
      exam_result: "apto" | "apto_restricciones" | "no_apto" | "pendiente"
      exam_type: "ingreso" | "periodico" | "egreso" | "reintegro"
      fault_type: "leve" | "grave" | "gravisima"
      gender_type: "M" | "F" | "O"
      incapacity_origin: "comun" | "laboral"
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
      marital_status_type:
        | "soltero"
        | "casado"
        | "union_libre"
        | "divorciado"
        | "viudo"
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
      recovery_status:
        | "pendiente"
        | "radicado"
        | "en_tramite"
        | "aprobado"
        | "rechazado"
        | "pagado"
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
      training_modality: "presencial" | "virtual" | "mixto"
      training_status: "programado" | "en_curso" | "completado" | "cancelado"
      vacancy_reason:
        | "new_position"
        | "replacement"
        | "growth"
        | "temporary"
        | "other"
      vacancy_status: "open" | "in_process" | "closed" | "cancelled"
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
      certificate_status: ["pendiente", "emitido", "vencido"],
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
      contract_type: [
        "indefinido",
        "fijo",
        "obra_labor",
        "aprendizaje",
        "servicios",
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
      ],
      employee_status: ["active", "suspended", "retired", "en_retiro"],
      exam_result: ["apto", "apto_restricciones", "no_apto", "pendiente"],
      exam_type: ["ingreso", "periodico", "egreso", "reintegro"],
      fault_type: ["leve", "grave", "gravisima"],
      gender_type: ["M", "F", "O"],
      incapacity_origin: ["comun", "laboral"],
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
      marital_status_type: [
        "soltero",
        "casado",
        "union_libre",
        "divorciado",
        "viudo",
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
      recovery_status: [
        "pendiente",
        "radicado",
        "en_tramite",
        "aprobado",
        "rechazado",
        "pagado",
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
      ],
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
      ],
      training_modality: ["presencial", "virtual", "mixto"],
      training_status: ["programado", "en_curso", "completado", "cancelado"],
      vacancy_reason: [
        "new_position",
        "replacement",
        "growth",
        "temporary",
        "other",
      ],
      vacancy_status: ["open", "in_process", "closed", "cancelled"],
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

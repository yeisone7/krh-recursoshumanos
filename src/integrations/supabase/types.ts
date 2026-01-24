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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_center_ids: { Args: never; Returns: string[] }
      get_user_company_ids: { Args: never; Returns: string[] }
      has_center_access: { Args: { _center_id: string }; Returns: boolean }
      has_employee_access: { Args: { _employee_id: string }; Returns: boolean }
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
      app_role: "admin" | "rrhh" | "psicologo" | "jefe_area" | "auditor"
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
      contract_type:
        | "indefinido"
        | "fijo"
        | "obra_labor"
        | "aprendizaje"
        | "servicios"
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
      employee_status: "active" | "suspended" | "retired"
      exam_result: "apto" | "apto_restricciones" | "no_apto" | "pendiente"
      exam_type: "ingreso" | "periodico" | "egreso" | "reintegro"
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
      vacancy_reason:
        | "new_position"
        | "replacement"
        | "growth"
        | "temporary"
        | "other"
      vacancy_status: "open" | "in_process" | "closed" | "cancelled"
      vacancy_type: "internal" | "external" | "both"
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
      app_role: ["admin", "rrhh", "psicologo", "jefe_area", "auditor"],
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
      contract_type: [
        "indefinido",
        "fijo",
        "obra_labor",
        "aprendizaje",
        "servicios",
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
      employee_status: ["active", "suspended", "retired"],
      exam_result: ["apto", "apto_restricciones", "no_apto", "pendiente"],
      exam_type: ["ingreso", "periodico", "egreso", "reintegro"],
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
      vacancy_reason: [
        "new_position",
        "replacement",
        "growth",
        "temporary",
        "other",
      ],
      vacancy_status: ["open", "in_process", "closed", "cancelled"],
      vacancy_type: ["internal", "external", "both"],
    },
  },
} as const

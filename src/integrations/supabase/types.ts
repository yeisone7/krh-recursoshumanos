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
    },
  },
} as const

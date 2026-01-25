import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { 
  EmployeeCertification, 
  EmployeeVaccination, 
  EmployeeDocument,
  CertificationType,
  VaccineType,
  EmployeeDocumentType 
} from '@/types/employeeV2';

// =====================================================
// CERTIFICATIONS HOOKS
// =====================================================

export function useEmployeeCertifications(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_certifications', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_certifications')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data as EmployeeCertification[];
    },
    enabled: !!employeeId,
  });
}

export interface CreateCertificationData {
  employeeId: string;
  certificationType: CertificationType;
  certificationName?: string;
  issueDate?: Date;
  expiryDate?: Date;
  licenseCategory?: string;
  documentUrl?: string;
  appliesToPosition?: boolean;
}

export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCertificationData) => {
      const { data: cert, error } = await supabase
        .from('employee_certifications')
        .insert({
          employee_id: data.employeeId,
          certification_type: data.certificationType,
          certification_name: data.certificationName || null,
          issue_date: data.issueDate ? format(data.issueDate, 'yyyy-MM-dd') : null,
          expiry_date: data.expiryDate ? format(data.expiryDate, 'yyyy-MM-dd') : null,
          license_category: data.licenseCategory || null,
          document_url: data.documentUrl || null,
          applies_to_position: data.appliesToPosition || false,
          is_valid: true,
        })
        .select()
        .single();

      if (error) throw error;
      return cert;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee_certifications', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', variables.employeeId] });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_certifications')
        .update({ is_valid: false })
        .eq('id', id);

      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee_certifications', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.employeeId] });
    },
  });
}

// =====================================================
// VACCINATIONS HOOKS
// =====================================================

export function useEmployeeVaccinations(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_vaccinations', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_vaccinations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('application_date', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeVaccination[];
    },
    enabled: !!employeeId,
  });
}

export interface CreateVaccinationData {
  employeeId: string;
  vaccineType: VaccineType;
  vaccineName?: string;
  doseNumber: number;
  applicationDate: Date;
  nextDoseDate?: Date;
  provider?: string;
  documentUrl?: string;
}

export function useCreateVaccination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVaccinationData) => {
      const { data: vac, error } = await supabase
        .from('employee_vaccinations')
        .insert({
          employee_id: data.employeeId,
          vaccine_type: data.vaccineType,
          vaccine_name: data.vaccineName || null,
          dose_number: data.doseNumber,
          application_date: format(data.applicationDate, 'yyyy-MM-dd'),
          next_dose_date: data.nextDoseDate ? format(data.nextDoseDate, 'yyyy-MM-dd') : null,
          provider: data.provider || null,
          document_url: data.documentUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return vac;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee_vaccinations', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', variables.employeeId] });
    },
  });
}

export function useDeleteVaccination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_vaccinations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee_vaccinations', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.employeeId] });
    },
  });
}

// =====================================================
// DOCUMENTS HOOKS
// =====================================================

export function useEmployeeDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('upload_date', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!employeeId,
  });
}

export interface CreateDocumentData {
  employeeId: string;
  companyId: string;
  documentType: EmployeeDocumentType;
  documentName?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date;
  observations?: string;
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      const { data: doc, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: data.employeeId,
          company_id: data.companyId,
          document_type: data.documentType,
          document_name: data.documentName || null,
          file_url: data.fileUrl,
          file_name: data.fileName || null,
          file_size: data.fileSize || null,
          mime_type: data.mimeType || null,
          expiry_date: data.expiryDate ? format(data.expiryDate, 'yyyy-MM-dd') : null,
          observations: data.observations || null,
          is_valid: true,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return doc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee_documents', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', variables.employeeId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_documents')
        .update({ is_valid: false })
        .eq('id', id);

      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee_documents', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.employeeId] });
    },
  });
}

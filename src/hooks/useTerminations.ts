import { toDateOnlyString } from '@/lib/dateOnly';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  TerminationType, 
  TerminationDocumentType, 
  requiredDocumentsByType,
  EmployeeTermination,
} from '@/types/termination';
import type { Database } from '@/integrations/supabase/types';

type DbTerminationType = Database['public']['Enums']['termination_type'];
type DbDocumentType = Database['public']['Enums']['termination_document_type'];

function mapTerminationRow(data: any): EmployeeTermination {
  return {
    id: data.id,
    contractId: data.contract_id,
    employeeId: data.employee_id,
    companyId: data.company_id,
    terminationType: data.termination_type as TerminationType,
    terminationDate: new Date(data.termination_date),
    effectiveDate: new Date(data.effective_date),
    reason: data.reason ?? undefined,
    resignationDate: data.resignation_date ? new Date(data.resignation_date) : undefined,
    isCompleted: data.is_completed,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    documents: (data.termination_documents || []).map((doc: any) => ({
      id: doc.id,
      terminationId: doc.termination_id,
      documentType: doc.document_type as TerminationDocumentType,
      isRequired: doc.is_required,
      isGenerated: doc.is_generated,
      isSigned: doc.is_signed,
      documentData: doc.document_data,
      documentUrl: doc.document_url ?? undefined,
      signedAt: doc.signed_at ? new Date(doc.signed_at) : undefined,
      signedBy: doc.signed_by ?? undefined,
      generatedAt: doc.generated_at ? new Date(doc.generated_at) : undefined,
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at),
    })),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// Fetch termination by contract ID
export function useContractTerminationProcess(contractId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['termination-process', contractId],
    queryFn: async () => {
      if (!contractId) return null;

      const { data, error } = await supabase
        .from('employee_terminations')
        .select(`
          *,
          termination_documents(*)
        `)
        .eq('contract_id', contractId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapTerminationRow(data);
    },
    enabled: !!contractId && !!currentCompanyId,
  });
}

// Fetch latest active termination by employee ID for offboarding without a contract
export function useEmployeeTerminationProcess(employeeId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee-termination-process', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase
        .from('employee_terminations')
        .select(`
          *,
          termination_documents(*)
        `)
        .eq('employee_id', employeeId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? mapTerminationRow(data) : null;
    },
    enabled: !!employeeId && !!currentCompanyId,
  });
}

// Initiate termination process
export function useInitiateTermination() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      contractId,
      employeeId,
      terminationType,
      terminationDate,
      effectiveDate,
      reason,
      resignationDate,
    }: {
      contractId?: string | null;
      employeeId: string;
      terminationType: TerminationType;
      terminationDate: Date;
      effectiveDate: Date;
      reason?: string;
      resignationDate?: Date;
    }) => {
      if (!currentCompanyId || !user) throw new Error('No company selected');

      // Create the termination record
      const { data: termination, error: terminationError } = await supabase
        .from('employee_terminations')
        .insert({
          contract_id: contractId ?? null,
          employee_id: employeeId,
          company_id: currentCompanyId,
          termination_type: terminationType as DbTerminationType,
          termination_date: toDateOnlyString(terminationDate),
          effective_date: toDateOnlyString(effectiveDate),
          reason,
          resignation_date: resignationDate?.toISOString().split('T')[0],
          created_by: user.id,
        })
        .select()
        .single();

      if (terminationError) throw terminationError;

      // Create required documents based on termination type
      const requiredDocs = requiredDocumentsByType[terminationType];
      const documentInserts = requiredDocs.map((docType) => ({
        termination_id: termination.id,
        document_type: docType as DbDocumentType,
        is_required: true,
        is_generated: false,
        is_signed: false,
        company_id: currentCompanyId!,
      }));

      const { error: docsError } = await supabase
        .from('termination_documents')
        .insert(documentInserts);

      if (docsError) throw docsError;

      // Update employee status in employees_v2 - set is_active to false during termination process
      // Note: We don't change is_active here, only when process completes
      // For employees_v2, we track termination via employee_work_info
      const { error: workInfoError } = await supabase
        .from('employee_work_info')
        .update({ termination_date: toDateOnlyString(effectiveDate) })
        .eq('employee_id', employeeId)
        .eq('is_current', true);

      if (workInfoError) {
        console.error('Error updating work info:', workInfoError);
        // Don't fail the whole process for this
      }

      const { error: employeeStatusError } = await supabase
        .from('employees_v2')
        .update({ status: 'en_retiro' } as any)
        .eq('id', employeeId);

      if (employeeStatusError) {
        console.error('Error updating employee status:', employeeStatusError);
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        company_id: currentCompanyId,
        action: 'initiate_termination',
        entity_type: 'employee_termination',
        entity_id: termination.id,
        new_values: {
          termination_type: terminationType,
          termination_date: toDateOnlyString(terminationDate),
          effective_date: toDateOnlyString(effectiveDate),
        },
        user_agent: navigator.userAgent,
      });

      return termination;
    },
    onSuccess: (_, variables) => {
      if (variables.contractId) {
        queryClient.invalidateQueries({ queryKey: ['termination-process', variables.contractId] });
      }
      queryClient.invalidateQueries({ queryKey: ['employee-termination-process', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_infinite'] });
      toast.success('Proceso de retiro iniciado');
    },
    onError: (error) => {
      console.error('Error initiating termination:', error);
      toast.error('Error al iniciar el proceso de retiro');
    },
  });
}

// Mark document as generated
export function useMarkDocumentGenerated() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      documentId,
      documentData,
      contractId,
    }: {
      documentId: string;
      documentData?: Record<string, any>;
      contractId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('termination_documents')
        .update({
          is_generated: true,
          generated_at: new Date().toISOString(),
          generated_by: user?.id,
          document_data: documentData,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data, contractId };
    },
    onSuccess: ({ contractId }) => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: ['termination-process', contractId] });
      }
      queryClient.invalidateQueries({ queryKey: ['employee-termination-process'] });
    },
  });
}

// Mark document as signed/uploaded
export function useMarkDocumentSigned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      documentUrl,
      signedBy,
      contractId,
    }: {
      documentId: string;
      documentUrl: string;
      signedBy: string;
      contractId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('termination_documents')
        .update({
          is_signed: true,
          document_url: documentUrl,
          signed_at: new Date().toISOString(),
          signed_by: signedBy,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data, contractId };
    },
    onSuccess: ({ contractId }) => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: ['termination-process', contractId] });
      }
      queryClient.invalidateQueries({ queryKey: ['employee-termination-process'] });
      toast.success('Documento firmado registrado');
    },
  });
}

// Complete termination process
export function useCompleteTermination() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      terminationId,
      contractId,
      employeeId,
      effectiveDate,
      reason,
    }: {
      terminationId: string;
      contractId?: string | null;
      employeeId: string;
      effectiveDate: Date;
      reason?: string;
    }) => {
      // Update termination as completed
      const { error: terminationError } = await supabase
        .from('employee_terminations')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq('id', terminationId);

      if (terminationError) throw terminationError;

      // Mark contract as terminated when the process started from a contract.
      if (contractId) {
        const { error: contractError } = await supabase
          .from('contracts')
          .update({
            is_terminated: true,
            termination_date: toDateOnlyString(effectiveDate),
            termination_reason: reason,
          })
          .eq('id', contractId);

        if (contractError) throw contractError;
      }

      // Update employee status in employees_v2 - set as retired
      const { error: employeeError } = await supabase
        .from('employees_v2')
        .update({ is_active: false, status: 'retired' } as any)
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      // Update work info to mark as not current
      const { error: workInfoError } = await supabase
        .from('employee_work_info')
        .update({ 
          is_current: false,
          valid_to: toDateOnlyString(effectiveDate),
          termination_date: toDateOnlyString(effectiveDate)
        })
        .eq('employee_id', employeeId)
        .eq('is_current', true);

      if (workInfoError) {
        console.error('Error updating work info:', workInfoError);
      }

      // Log audit event
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          company_id: currentCompanyId,
          action: 'complete_termination',
          entity_type: 'employee_termination',
          entity_id: terminationId,
          new_values: {
            is_completed: true,
            is_terminated: true,
            employee_is_active: false,
            employee_status: 'retired',
          },
          user_agent: navigator.userAgent,
        });
      }

      return { terminationId, contractId, employeeId };
    },
    onSuccess: ({ contractId, employeeId }) => {
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: ['termination-process', contractId] });
        queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      }
      queryClient.invalidateQueries({ queryKey: ['employee-termination-process', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_infinite'] });
      toast.success('Proceso de retiro completado', {
        description: 'El empleado ha sido marcado como Retirado.',
      });
    },
    onError: (error) => {
      console.error('Error completing termination:', error);
      toast.error('Error al completar el proceso de retiro');
    },
  });
}

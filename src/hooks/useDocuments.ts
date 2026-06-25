import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EntityType = 
  | 'contract' 
  | 'contract_extension' 
  | 'medical_exam' 
  | 'dotation' 
  | 'incapacity' 
  | 'incapacity_clinical_history'
  | 'disciplinary_opening'
  | 'disciplinary_notification'
  | 'disciplinary_hearing'
  | 'disciplinary_decision'
  | 'disciplinary_appeal'
  | 'vacation_request';

export interface DocumentVersion {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  notes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface UploadDocumentParams {
  file: File;
  entityType: EntityType;
  entityId: string;
  notes?: string;
}

export interface DeleteDocumentParams {
  document: DocumentVersion;
}

// Fetch document versions for an entity
export function useDocumentVersions(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['document_versions', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: !!entityId,
  });
}

// Get current document for an entity
export function useCurrentDocument(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['current_document', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return null;
      
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;
      return data as DocumentVersion | null;
    },
    enabled: !!entityId,
  });
}

// Upload a new document
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ file, entityType, entityId, notes }: UploadDocumentParams) => {
      if (!user || !currentCompanyId) {
        throw new Error('Usuario no autenticado o sin empresa asignada');
      }

      // Get the current version number
      const { data: existingVersions } = await supabase
        .from('document_versions')
        .select('version')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('version', { ascending: false })
        .limit(1);

      const newVersion = existingVersions && existingVersions.length > 0 
        ? existingVersions[0].version + 1 
        : 1;

      // Create file path: {company_id}/{entity_type}/{entity_id}/{version}_{filename}
      const fileExt = file.name.split('.').pop();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${currentCompanyId}/${entityType}/${entityId}/v${newVersion}_${sanitizedFileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Mark previous versions as not current
      if (newVersion > 1) {
        await supabase
          .from('document_versions')
          .update({ is_current: false })
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);
      }

      // Insert document version record
      const { data: docVersion, error: insertError } = await supabase
        .from('document_versions')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          company_id: currentCompanyId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          version: newVersion,
          uploaded_by: user.id,
          notes: notes || null,
          is_current: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update the entity's document_url field based on entity type
      try {
        if (entityType === 'contract') {
          await supabase.from('contracts').update({ document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'contract_extension') {
          await supabase.from('contract_extensions').update({ document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'medical_exam') {
          await supabase.from('medical_exams').update({ document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'dotation') {
          await supabase.from('dotation_deliveries').update({ document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'incapacity') {
          await supabase.from('employee_incapacities').update({ certificate_url: filePath }).eq('id', entityId);
        } else if (entityType === 'incapacity_clinical_history') {
          await supabase.from('employee_incapacities').update({ clinical_history_url: filePath }).eq('id', entityId);
        } else if (entityType === 'disciplinary_opening') {
          await supabase.from('disciplinary_processes').update({ opening_document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'disciplinary_notification') {
          await supabase.from('disciplinary_processes').update({ notification_document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'disciplinary_hearing') {
          await supabase.from('disciplinary_processes').update({ hearing_document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'disciplinary_decision') {
          await supabase.from('disciplinary_processes').update({ decision_document_url: filePath }).eq('id', entityId);
        } else if (entityType === 'disciplinary_appeal') {
          await supabase.from('disciplinary_processes').update({ appeal_document_url: filePath }).eq('id', entityId);
        }
      } catch (updateError) {
        console.warn('Could not update entity document_url:', updateError);
      }

      return docVersion as DocumentVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document_versions', data.entity_type, data.entity_id] });
      queryClient.invalidateQueries({ queryKey: ['current_document', data.entity_type, data.entity_id] });
      // Invalidate the entity queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process'] });
    },
  });
}

function getEntityDocumentUpdate(entityType: EntityType, filePath: string | null) {
  if (entityType === 'contract') {
    return { table: 'contracts', values: { document_url: filePath } };
  }
  if (entityType === 'contract_extension') {
    return { table: 'contract_extensions', values: { document_url: filePath } };
  }
  if (entityType === 'medical_exam') {
    return { table: 'medical_exams', values: { document_url: filePath } };
  }
  if (entityType === 'dotation') {
    return { table: 'dotation_deliveries', values: { document_url: filePath } };
  }
  if (entityType === 'incapacity') {
    return { table: 'employee_incapacities', values: { certificate_url: filePath } };
  }
  if (entityType === 'incapacity_clinical_history') {
    return { table: 'employee_incapacities', values: { clinical_history_url: filePath } };
  }
  if (entityType === 'disciplinary_opening') {
    return { table: 'disciplinary_processes', values: { opening_document_url: filePath } };
  }
  if (entityType === 'disciplinary_notification') {
    return { table: 'disciplinary_processes', values: { notification_document_url: filePath } };
  }
  if (entityType === 'disciplinary_hearing') {
    return { table: 'disciplinary_processes', values: { hearing_document_url: filePath } };
  }
  if (entityType === 'disciplinary_decision') {
    return { table: 'disciplinary_processes', values: { decision_document_url: filePath } };
  }
  if (entityType === 'disciplinary_appeal') {
    return { table: 'disciplinary_processes', values: { appeal_document_url: filePath } };
  }

  return null;
}

// Delete a document version and keep the entity URL pointing to the latest remaining version.
export function useDeleteDocumentVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ document }: DeleteDocumentParams) => {
      let replacement: DocumentVersion | null = null;

      if (document.is_current) {
        const { data: replacementData, error: replacementError } = await supabase
          .from('document_versions')
          .select('*')
          .eq('entity_type', document.entity_type)
          .eq('entity_id', document.entity_id)
          .neq('id', document.id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (replacementError) throw replacementError;
        replacement = replacementData as DocumentVersion | null;
      }

      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from('document_versions')
        .delete()
        .eq('id', document.id);

      if (deleteError) throw deleteError;

      if (document.is_current) {
        if (replacement) {
          const { error: replacementUpdateError } = await supabase
            .from('document_versions')
            .update({ is_current: true })
            .eq('id', replacement.id);

          if (replacementUpdateError) throw replacementUpdateError;
        }

        const updateTarget = getEntityDocumentUpdate(document.entity_type, replacement?.file_path ?? null);

        if (updateTarget) {
          const { error: entityUpdateError } = await supabase
            .from(updateTarget.table as any)
            .update(updateTarget.values)
            .eq('id', document.entity_id);

          if (entityUpdateError) throw entityUpdateError;
        }
      }

      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['document_versions', document.entity_type, document.entity_id] });
      queryClient.invalidateQueries({ queryKey: ['current_document', document.entity_type, document.entity_id] });
      queryClient.invalidateQueries({ queryKey: ['document_url', document.file_path] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process'] });
    },
  });
}

// Get signed URL for downloading a document
export function useDocumentUrl(filePath: string | undefined) {
  return useQuery({
    queryKey: ['document_url', filePath],
    queryFn: async () => {
      if (!filePath) return null;

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Download document helper
export async function downloadDocument(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) throw error;

  // Create download link
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

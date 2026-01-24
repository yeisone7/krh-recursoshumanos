import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EntityType = 'contract' | 'contract_extension' | 'medical_exam' | 'dotation';

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

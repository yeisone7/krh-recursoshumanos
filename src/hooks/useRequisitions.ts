import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PersonnelRequisition {
  id: string;
  company_id: string;
  fecha_requisicion: string;
  fecha_ingreso_estimada: string | null;
  cantidad_vacantes_requeridas: number;
  cargo_solicitado: string;
  area_id: string | null;
  operation_center_id: string | null;
  cargo_a_reemplazar: string | null;
  persona_a_reemplazar: string | null;
  requiere_herramienta_trabajo: boolean;
  horario_trabajo: string | null;
  dia_descanso_obligatorio: string | null;
  // New fields for salary and contract type
  salario_propuesto: number | null;
  tipo_contrato_solicitado: string | null;
  // Turno y condiciones
  turno_trabajo_id: string | null;
  incluye_alimentacion: boolean;
  incluye_desplazamiento: boolean;
  trayecto_desplazamiento: string | null;
  motivo_solicitud: string;
  observaciones_motivo_solicitud: string | null;
  solicitante_id: string | null;
  solicitante_nombre: string;
  cargo_solicitante: string | null;
  // Operaciones
  operaciones_aprobado: boolean | null;
  operaciones_aprobado_salario: boolean | null;
  operaciones_quien_aprobo: string | null;
  operaciones_aprobador_id: string | null;
  operaciones_fecha_aprobacion: string | null;
  operaciones_observaciones: string | null;
  // RRHH
  rrhh_asignacion_salarial: number | null;
  rrhh_condiciones_adicionales: string | null;
  rrhh_fuente_asignacion_salarial: string | null;
  rrhh_nivel_politica_salarial: string | null;
  rrhh_tipo_convocatoria: string | null;
  rrhh_observaciones: string | null;
  rrhh_aprobado: boolean | null;
  rrhh_quien_aprobo: string | null;
  rrhh_aprobador_id: string | null;
  rrhh_fecha_aprobacion: string | null;
  // Jurídico
  juridico_tipo_contrato: string | null;
  juridico_duracion: string | null;
  juridico_observaciones: string | null;
  juridico_aprobado: boolean | null;
  juridico_quien_aprobo: string | null;
  juridico_aprobador_id: string | null;
  juridico_fecha_aprobacion: string | null;
  // Selección
  seleccion_fecha_inicio_proceso: string | null;
  seleccion_perfil_cargo_creado: boolean | null;
  seleccion_tipo_mano_obra: string | null;
  seleccion_observaciones: string | null;
  seleccion_aprobado: boolean | null;
  seleccion_quien_aprobo: string | null;
  seleccion_aprobador_id: string | null;
  seleccion_fecha_aprobacion: string | null;
  // Gerencia
  gerencia_aprobado_salario: boolean | null;
  gerencia_aprobado: boolean | null;
  gerencia_observaciones: string | null;
  gerencia_quien_aprobo: string | null;
  gerencia_aprobador_id: string | null;
  gerencia_fecha_aprobacion: string | null;
  // Autoriza
  autoriza: string | null;
  lider_proceso: string | null;
  // Estado
  estado_requisicion: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  areas?: { id: string; name: string } | null;
  operation_centers?: { id: string; name: string } | null;
  vacancies?: { id: string; position_title: string; status: string }[];
}

export function useRequisitions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['requisitions', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnel_requisitions')
        .select(`
          *,
          areas(id, name),
          operation_centers(id, name)
        `)
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PersonnelRequisition[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useRequisition(id: string | undefined) {
  return useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('personnel_requisitions')
        .select(`
          *,
          areas(id, name),
          operation_centers(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as PersonnelRequisition;
    },
    enabled: !!id,
  });
}

export function useRequisitionWithVacancies(id: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['requisition-vacancies', id],
    queryFn: async () => {
      if (!id) return null;

      // Get requisition
      const { data: requisition, error: reqError } = await supabase
        .from('personnel_requisitions')
        .select(`
          *,
          areas(id, name),
          operation_centers(id, name)
        `)
        .eq('id', id)
        .single();

      if (reqError) throw reqError;

      // Get linked vacancies
      const { data: vacancies, error: vacError } = await supabase
        .from('vacancies')
        .select('id, position_title, status, candidates(id, status)')
        .eq('requisition_id', id);

      if (vacError) throw vacError;

      return {
        ...requisition,
        vacancies: vacancies || [],
      } as unknown as PersonnelRequisition;
    },
    enabled: !!id && !!currentCompanyId,
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<PersonnelRequisition>) => {
      const { data: result, error } = await supabase
        .from('personnel_requisitions')
        .insert({
          ...data,
          company_id: currentCompanyId!,
          solicitante_id: user?.id,
          created_by: user?.id,
          estado_requisicion: 'borrador',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({
        title: 'Requisición creada',
        description: 'La requisición se ha creado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la requisición.',
        variant: 'destructive',
      });
      console.error('Error creating requisition:', error);
    },
  });
}

export function useUpdateRequisition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PersonnelRequisition> & { id: string }) => {
      const { data, error } = await supabase
        .from('personnel_requisitions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requisition-vacancies', data.id] });
      toast({
        title: 'Requisición actualizada',
        description: 'La requisición se ha actualizado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la requisición.',
        variant: 'destructive',
      });
      console.error('Error updating requisition:', error);
    },
  });
}

export function useApproveRequisitionStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      step,
      approved,
      data,
    }: {
      id: string;
      step: 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia';
      approved: boolean;
      data?: Record<string, any>;
    }) => {
      const updates: Record<string, any> = {
        ...data,
        [`${step}_aprobado`]: approved,
        [`${step}_aprobador_id`]: user?.id,
        [`${step}_fecha_aprobacion`]: new Date().toISOString(),
      };

      // First fetch the requisition to get autoriza value
      const { data: reqData } = await supabase
        .from('personnel_requisitions')
        .select('autoriza')
        .eq('id', id)
        .single();

      const autoriza = (reqData as any)?.autoriza;

      // Determine next status dynamically based on autoriza
      let statusMap: Record<string, string>;
      if (autoriza === 'gerencia_administrativa') {
        statusMap = {
          rrhh: approved ? 'en_juridico' : 'rechazada',
          juridico: approved ? 'en_gerencia' : 'rechazada',
          gerencia: approved ? 'en_seleccion' : 'rechazada',
          seleccion: approved ? 'aprobada' : 'rechazada',
        };
      } else if (autoriza === 'gerencia_operaciones') {
        statusMap = {
          rrhh: approved ? 'en_juridico' : 'rechazada',
          juridico: approved ? 'en_operaciones' : 'rechazada',
          operaciones: approved ? 'en_seleccion' : 'rechazada',
          seleccion: approved ? 'aprobada' : 'rechazada',
        };
      } else {
        statusMap = {
          rrhh: approved ? 'en_juridico' : 'rechazada',
          juridico: approved ? 'en_operaciones' : 'rechazada',
          operaciones: approved ? 'en_gerencia' : 'rechazada',
          gerencia: approved ? 'en_seleccion' : 'rechazada',
          seleccion: approved ? 'aprobada' : 'rechazada',
        };
      }

      updates.estado_requisicion = statusMap[step];

      const { data: result, error } = await supabase
        .from('personnel_requisitions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify the next approver if approved and there's a next step
      if (approved && updates.estado_requisicion !== 'aprobada') {
        try {
          await supabase.functions.invoke('notify-requisition-approver', {
            body: {
              requisitionId: id,
              currentStep: updates.estado_requisicion,
              requisitionTitle: result.cargo_solicitado,
            },
          });
        } catch (notifyError) {
          console.error('Error notifying next approver:', notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requisition-vacancies', data.id] });
      toast({
        title: 'Aprobación registrada',
        description: 'La aprobación se ha registrado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la aprobación.',
        variant: 'destructive',
      });
      console.error('Error approving requisition:', error);
    },
  });
}

export function useSubmitRequisition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First step is now RRHH
      const { data, error } = await supabase
        .from('personnel_requisitions')
        .update({ estado_requisicion: 'en_rrhh' } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requisition-vacancies', data.id] });
      toast({
        title: 'Requisición enviada',
        description: 'La requisición ha sido enviada para aprobación.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la requisición.',
        variant: 'destructive',
      });
      console.error('Error submitting requisition:', error);
    },
  });
}

export function useDeleteRequisition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personnel_requisitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({
        title: 'Requisición eliminada',
        description: 'La requisición se ha eliminado correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la requisición.',
        variant: 'destructive',
      });
      console.error('Error deleting requisition:', error);
    },
  });
}

// Approved requisitions for vacancy creation
export function useApprovedRequisitions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['approved-requisitions', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnel_requisitions')
        .select('id, cargo_solicitado, cantidad_vacantes_requeridas, operation_centers(name)')
        .eq('company_id', currentCompanyId!)
        .in('estado_requisicion', ['aprobada', 'en_seleccion'])
        .order('cargo_solicitado');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CleanupParams {
  employeeId: string;
  startDate: string;
  endDate: string;
  absenceType: 'vacaciones' | 'permiso' | 'incapacidad';
}

/**
 * Hook to cleanup shift assignments when an absence is approved/created.
 * Calls the database function that removes work shifts (not rest days) in the date range.
 */
export function useCleanupShiftAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, startDate, endDate }: CleanupParams) => {
      const { data, error } = await supabase
        .rpc('delete_shift_assignments_for_absence', {
          p_employee_id: employeeId,
          p_start_date: startDate,
          p_end_date: endDate,
        });

      if (error) throw error;
      
      return data as number; // Number of deleted assignments
    },
    onSuccess: (deletedCount, variables) => {
      // Invalidate shift assignment queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['employee_absences'] });

      if (deletedCount > 0) {
        toast.info(`${deletedCount} asignación(es) de turno eliminada(s)`, {
          description: `Se eliminaron turnos en conflicto con ${variables.absenceType}`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Error cleaning up shift assignments:', error);
      // Don't show toast for cleanup errors - the main operation succeeded
    },
  });
}

/**
 * Standalone function to cleanup shift assignments without React hook.
 * Useful for calling inside other mutation functions.
 */
export async function cleanupShiftAssignments({
  employeeId,
  startDate,
  endDate,
  absenceType,
}: CleanupParams): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('delete_shift_assignments_for_absence', {
        p_employee_id: employeeId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) {
      console.error('Error in cleanupShiftAssignments:', error);
      return 0;
    }

    const deletedCount = data as number;
    
    if (deletedCount > 0) {
      toast.info(`${deletedCount} asignación(es) de turno eliminada(s)`, {
        description: `Se eliminaron turnos en conflicto con ${absenceType}`,
      });
    }

    return deletedCount;
  } catch (err) {
    console.error('Unexpected error in cleanupShiftAssignments:', err);
    return 0;
  }
}

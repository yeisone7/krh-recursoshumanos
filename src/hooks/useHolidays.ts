import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface Holiday {
  id: string;
  company_id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  is_national: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface HolidayFormData {
  holiday_date: string;
  name: string;
  description?: string;
  is_national?: boolean;
  is_active?: boolean;
}

// =============================================
// HOLIDAYS QUERIES
// =============================================

export function useHolidays(year?: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['company_holidays', currentCompanyId, year],
    queryFn: async () => {
      let query = supabase
        .from('company_holidays')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('holiday_date', { ascending: true });

      if (year) {
        query = query
          .gte('holiday_date', `${year}-01-01`)
          .lte('holiday_date', `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Holiday[];
    },
    enabled: !!currentCompanyId,
  });
}

// Get all active holidays as a Set for quick lookup
export function useHolidaysSet() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['company_holidays_set', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('holiday_date')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true);

      if (error) throw error;
      
      return new Set(data.map(h => h.holiday_date));
    },
    enabled: !!currentCompanyId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Get holidays as a map for calendar display (date -> name)
export function useHolidaysMap() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['company_holidays_map', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('holiday_date, name')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true);

      if (error) throw error;
      
      const map: Record<string, string> = {};
      data.forEach(h => {
        map[h.holiday_date] = h.name;
      });
      return map;
    },
    enabled: !!currentCompanyId,
    staleTime: 1000 * 60 * 5,
  });
}

// =============================================
// HOLIDAYS MUTATIONS
// =============================================

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const { data: result, error } = await supabase
        .from('company_holidays')
        .insert({
          company_id: currentCompanyId!,
          created_by: user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_holidays'] });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<HolidayFormData>) => {
      const { data: result, error } = await supabase
        .from('company_holidays')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_holidays'] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_holidays'] });
    },
  });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Check if a date is a holiday
 * Use with the holidays set from useHolidaysSet
 */
export function isHoliday(date: Date, holidaysSet: Set<string>): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidaysSet.has(dateStr);
}

/**
 * Get holiday name for a date
 * Use with the holidays map from useHolidaysMap
 */
export function getHolidayName(date: Date, holidaysMap: Record<string, string>): string | null {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidaysMap[dateStr] || null;
}

/**
 * Calculate business days excluding weekends and holidays
 */
export function calculateBusinessDaysWithHolidays(
  startDate: Date,
  endDate: Date,
  holidaysSet: Set<string>
): number {
  let count = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = format(current, 'yyyy-MM-dd');
    
    // Check if it's a weekday and not a holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (!holidaysSet.has(dateStr)) {
        count++;
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

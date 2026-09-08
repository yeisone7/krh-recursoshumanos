/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TimeClockAction, TimeClockCorrection, TimeClockDay, TimeClockEvent, TimeClockPoint } from '@/types/timeClock';

const db = supabase as any;

export function useMyTimeClockEmployee() {
  const { user } = useAuth();
  return useQuery<{ id: string; company_id: string; first_name: string; last_name: string } | null>({
    queryKey: ['my-time-clock-employee', user?.id],
    queryFn: async () => {
      const { data, error } = await db.from('employee_user_links')
        .select('employee_id, employees_v2(id,company_id,first_name,last_name,is_active)')
        .eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (error) throw error;
      const employee = data?.employees_v2;
      return employee?.is_active ? employee : null;
    },
    enabled: !!user?.id,
  });
}

export function useTimeClockPoints() {
  const { currentCompanyId } = useAuth();
  return useQuery<TimeClockPoint[]>({
    queryKey: ['time-clock-points', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await db.from('time_clock_points')
        .select('*, operation_centers(id,name)')
        .eq('company_id', currentCompanyId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId,
  });
}

export function useTimeClockPoint(pointId?: string | null) {
  return useQuery<TimeClockPoint | null>({
    queryKey: ['time-clock-point', pointId],
    queryFn: async () => {
      const { data, error } = await db.from('time_clock_points')
        .select('*, operation_centers(id,name)').eq('id', pointId).eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!pointId,
  });
}

export function useSaveTimeClockPoint() {
  const { currentCompanyId, user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (point: Partial<TimeClockPoint> & Pick<TimeClockPoint, 'name' | 'operation_center_id' | 'latitude' | 'longitude'>) => {
      const payload = {
        company_id: currentCompanyId, operation_center_id: point.operation_center_id, name: point.name,
        latitude: point.latitude, longitude: point.longitude, radius_meters: point.radius_meters ?? 100,
        max_accuracy_meters: point.max_accuracy_meters ?? 50,
        late_tolerance_minutes: point.late_tolerance_minutes ?? 5,
        require_break_punches: point.require_break_punches ?? false,
        is_active: point.is_active ?? true, created_by: user?.id,
      };
      const updatePayload = { ...payload };
      delete updatePayload.created_by;
      const query = point.id
        ? db.from('time_clock_points').update(updatePayload).eq('id', point.id)
        : db.from('time_clock_points').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['time-clock-points'] }),
  });
}

export function useTimeClockDays(from: string, to: string) {
  const { currentCompanyId } = useAuth();
  return useQuery<TimeClockDay[]>({
    queryKey: ['time-clock-days', currentCompanyId, from, to],
    queryFn: async () => {
      const start = new Date(`${from}T00:00:00Z`);
      const end = new Date(`${to}T00:00:00Z`);
      const dates: string[] = [];
      for (let cursor = start; cursor <= end && dates.length < 31; cursor = new Date(cursor.getTime() + 86_400_000)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      await Promise.all(dates.map(workDate => db.rpc('time_clock_refresh_absences', {
        _company_id: currentCompanyId, _work_date: workDate,
      })));
      const { data, error } = await db.from('time_clock_days')
        .select('*, employees_v2(first_name,last_name,document_number), operation_centers(name)')
        .eq('company_id', currentCompanyId).gte('work_date', from).lte('work_date', to)
        .order('work_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId,
    refetchInterval: 30_000,
  });
}

export function useTimeClockEvents(limit = 100, employeeId?: string) {
  const { currentCompanyId } = useAuth();
  return useQuery<TimeClockEvent[]>({
    queryKey: ['time-clock-events', currentCompanyId, employeeId, limit],
    queryFn: async () => {
      let query = db.from('time_clock_events')
        .select('*, employees_v2(first_name,last_name,document_number), operation_centers(name)')
        .order('occurred_at', { ascending: false }).limit(limit);
      if (currentCompanyId) query = query.eq('company_id', currentCompanyId);
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId || !!employeeId,
    refetchInterval: 30_000,
  });
}

export function useTimeClockCorrections(employeeId?: string) {
  const { currentCompanyId } = useAuth();
  return useQuery<TimeClockCorrection[]>({
    queryKey: ['time-clock-corrections', currentCompanyId, employeeId],
    queryFn: async () => {
      let query = db.from('time_clock_correction_requests')
        .select('*, employees_v2(first_name,last_name,document_number)')
        .order('created_at', { ascending: false });
      if (currentCompanyId) query = query.eq('company_id', currentCompanyId);
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId || !!employeeId,
  });
}

export function useIssueTimeClockQr() {
  return useMutation({
    mutationFn: async (pointId: string) => {
      const { data, error } = await db.rpc('time_clock_issue_qr', { _point_id: pointId });
      if (error) throw error;
      return data as { token: string; expires_at: string; point_id: string };
    },
  });
}

export function useRegisterTimeClockEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      action: TimeClockAction; pointId?: string | null; source: 'qr' | 'web' | 'supervised';
      latitude?: number | null; longitude?: number | null; accuracy?: number | null;
      positionCapturedAt?: string | null;
      qrToken?: string | null; employeeId?: string | null; reason?: string | null; idempotencyKey?: string;
    }) => {
      const { data, error } = await db.rpc('time_clock_register_event', {
        _action: input.action,
        _point_id: input.pointId || null,
        _latitude: input.latitude ?? null,
        _longitude: input.longitude ?? null,
        _accuracy_meters: input.accuracy ?? null,
        _position_captured_at: input.positionCapturedAt || null,
        _source: input.source,
        _qr_token: input.qrToken || null,
        _employee_id: input.employeeId || null,
        _supervisor_reason: input.reason || null,
        _idempotency_key: input.idempotencyKey || crypto.randomUUID(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['time-clock-days'] });
      client.invalidateQueries({ queryKey: ['time-clock-events'] });
    },
  });
}

export function useRequestTimeClockCorrection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: TimeClockAction; requestedAt: string; reason: string; eventId?: string | null }) => {
      const { data, error } = await db.rpc('time_clock_request_correction', {
        _requested_action: input.action, _requested_at: input.requestedAt,
        _reason: input.reason, _event_id: input.eventId || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['time-clock-corrections'] }),
  });
}

export function useResolveTimeClockCorrection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; notes?: string }) => {
      const { data, error } = await db.rpc('time_clock_resolve_correction', {
        _request_id: input.id, _approve: input.approve, _notes: input.notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['time-clock-corrections'] });
      client.invalidateQueries({ queryKey: ['time-clock-days'] });
      client.invalidateQueries({ queryKey: ['time-clock-events'] });
    },
  });
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000,
  }));
}

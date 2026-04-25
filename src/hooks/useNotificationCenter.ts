import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification } from '@/hooks/useNotifications';

export interface NotificationDeliveryLog {
  id: string;
  company_id: string | null;
  notification_id: string | null;
  recipient_user_id: string | null;
  recipient_email: string | null;
  channel: 'email' | 'in_app' | 'whatsapp' | 'telegram' | string;
  provider: string | null;
  template_name: string | null;
  subject: string | null;
  status: string;
  error_message: string | null;
  triggered_by_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserDisplayMap {
  [userId: string]: string;
}

const asAnySupabase = supabase as any;

export function useNotificationCenter() {
  const { user, currentCompanyId, isAdmin, isRRHH } = useAuth();
  const queryClient = useQueryClient();
  const canManageCompanyHistory = isAdmin || isRRHH;

  const notificationsQuery = useQuery({
    queryKey: ['notification-center', 'notifications', currentCompanyId, user?.id, canManageCompanyHistory],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (canManageCompanyHistory && currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      } else {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Notification[];
    },
  });

  const deliveryLogsQuery = useQuery({
    queryKey: ['notification-center', 'delivery-logs', currentCompanyId, user?.id, canManageCompanyHistory],
    enabled: !!user,
    queryFn: async () => {
      let query = asAnySupabase
        .from('notification_delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (canManageCompanyHistory && currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      } else {
        query = query.eq('recipient_user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NotificationDeliveryLog[];
    },
  });

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    notificationsQuery.data?.forEach((notification) => ids.add(notification.user_id));
    deliveryLogsQuery.data?.forEach((log) => {
      if (log.recipient_user_id) ids.add(log.recipient_user_id);
      if (log.triggered_by_user_id) ids.add(log.triggered_by_user_id);
    });
    return Array.from(ids);
  }, [notificationsQuery.data, deliveryLogsQuery.data]);

  const usersQuery = useQuery({
    queryKey: ['notification-center', 'users', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, display_name')
        .in('id', userIds);

      if (error) throw error;

      return (data || []).reduce<UserDisplayMap>((acc, profile) => {
        acc[profile.id] = profile.full_name || profile.display_name || profile.id;
        return acc;
      }, {});
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-center'] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-center'] }),
  });

  return {
    notifications: notificationsQuery.data || [],
    deliveryLogs: deliveryLogsQuery.data || [],
    userDisplayMap: usersQuery.data || {},
    canManageCompanyHistory,
    isLoading: notificationsQuery.isLoading || deliveryLogsQuery.isLoading || usersQuery.isLoading,
    error: notificationsQuery.error || deliveryLogsQuery.error || usersQuery.error,
    markAsRead: markAsRead.mutateAsync,
    deleteNotification: deleteNotification.mutateAsync,
    refetch: () => {
      notificationsQuery.refetch();
      deliveryLogsQuery.refetch();
      usersQuery.refetch();
    },
  };
}

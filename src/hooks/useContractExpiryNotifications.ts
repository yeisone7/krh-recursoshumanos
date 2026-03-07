import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUnifiedAlerts } from '@/hooks/useUnifiedAlerts';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shows proactive toast and push notifications for contracts expiring soon.
 * Runs once per session (uses sessionStorage to avoid repeated alerts).
 */
export function useContractExpiryNotifications() {
  const { user } = useAuth();
  const { data: alerts } = useUnifiedAlerts();
  const { sendNotification, permission } = usePushNotifications();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (!user || !alerts || hasNotified.current) return;

    // Check sessionStorage to avoid repeating on every render
    const sessionKey = `contract_expiry_notified_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasNotified.current = true;
      return;
    }

    const contractAlerts = alerts.filter(
      (a) => (a.type === 'contract' || a.type === 'extension') && a.level !== 'info'
    );

    if (contractAlerts.length === 0) return;

    hasNotified.current = true;
    sessionStorage.setItem(sessionKey, 'true');

    const critical = contractAlerts.filter((a) => a.level === 'critical');
    const warning = contractAlerts.filter((a) => a.level === 'warning');

    // Toast notification
    if (critical.length > 0) {
      toast.error(`${critical.length} contrato${critical.length > 1 ? 's' : ''} vencido${critical.length > 1 ? 's' : ''} o por vencer`, {
        description: critical.slice(0, 3).map((a) => `${a.entityName}: ${a.description}`).join(' · '),
        duration: 8000,
        action: {
          label: 'Ver alertas',
          onClick: () => window.location.href = '/alertas',
        },
      });
    }

    if (warning.length > 0) {
      toast.warning(`${warning.length} contrato${warning.length > 1 ? 's' : ''} próximo${warning.length > 1 ? 's' : ''} a vencer`, {
        description: warning.slice(0, 3).map((a) => `${a.entityName}: ${a.description}`).join(' · '),
        duration: 6000,
        action: {
          label: 'Ver alertas',
          onClick: () => window.location.href = '/alertas',
        },
      });
    }

    // Push notification
    if (permission === 'granted') {
      const total = contractAlerts.length;
      sendNotification(
        `⚠️ ${total} contrato${total > 1 ? 's' : ''} requiere${total > 1 ? 'n' : ''} atención`,
        {
          body: contractAlerts.slice(0, 3).map((a) => `${a.entityName}: ${a.description}`).join('\n'),
          tag: 'contract-expiry',
        }
      );
    }
  }, [user, alerts, sendNotification, permission]);
}

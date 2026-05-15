import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Smartphone, Tablet, Globe, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SessionLog {
  id: string;
  user_id: string;
  user_email: string | null;
  login_at: string;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  city: string | null;
  country: string | null;
  is_current: boolean | null;
}

const deviceIcon = (type: string | null) => {
  switch (type) {
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
};

export function SessionHistory() {
  const { user } = useAuth();

  const { data: sessions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['session_logs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('login_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Historial de Sesiones</CardTitle>
              <CardDescription>
                Últimos 50 inicios de sesión de tu cuenta
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay registros de sesiones aún</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-background transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center shrink-0">
                    {deviceIcon(s.device_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {s.browser || 'Navegador desconocido'} · {s.os || 'SO desconocido'}
                      </span>
                      {s.is_current && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">Actual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{s.ip_address || 'IP desconocida'}</span>
                      {(s.city || s.country) && (
                        <>
                          <span>·</span>
                          <span>{[s.city, s.country].filter(Boolean).join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <div>{format(new Date(s.login_at), 'dd MMM yyyy', { locale: es })}</div>
                    <div>{format(new Date(s.login_at), 'HH:mm', { locale: es })}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

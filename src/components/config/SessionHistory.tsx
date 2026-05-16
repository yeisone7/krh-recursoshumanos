import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Smartphone, Tablet, Globe, Clock, RefreshCw, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { MobileCardList } from '@/components/shared/MobileCardList';

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
    <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] bg-white border border-slate-100 shadow-none overflow-hidden">
      <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm transition-transform hover:rotate-6">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight">Historial de Sesiones</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Monitorización de los últimos 50 accesos
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className="h-10 w-10 rounded-xl border-slate-200 hover:bg-white transition-all shadow-sm active:scale-90"
          >
            <RefreshCw className={cn("h-4 w-4 text-primary stroke-[3]", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Sincronizando bitácora...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 rounded-[1.75rem] bg-slate-50 flex items-center justify-center text-slate-200">
              <Clock className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sin actividad reciente</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No se han registrado inicios de sesión aún.</p>
            </div>
          </div>
        ) : (
          <div className="p-2 sm:p-6">
            <MobileCardList
              className="md:hidden"
              items={sessions.map(s => ({
                id: s.id,
                title: `${s.browser || 'Navegador'} · ${s.os || 'SO'}`,
                subtitle: format(new Date(s.login_at), "d 'de' MMMM, HH:mm", { locale: es }),
                badge: s.is_current ? <Badge className="bg-primary text-white text-[8px] font-black uppercase rounded-md shadow-sm">Sesión Actual</Badge> : null,
                fields: [
                  { label: 'IP', value: <span className="font-mono text-[10px] font-bold">{s.ip_address}</span> },
                  { label: 'Ubicación', value: <span className="text-[10px] font-bold">{[s.city, s.country].filter(Boolean).join(', ') || 'Desconocida'}</span> }
                ],
                icon: deviceIcon(s.device_type)
              }))}
            />

            <div className="hidden md:block">
              <ScrollArea className="h-[500px] px-2">
                <div className="space-y-3 pb-4">
                  {sessions.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                        s.is_current 
                          ? "bg-primary/[0.02] border-primary/10 shadow-sm" 
                          : "bg-white border-slate-50 hover:border-slate-200 hover:bg-slate-50/50"
                      )}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        s.is_current ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 group-hover:bg-white border border-transparent group-hover:border-slate-100"
                      )}>
                        {deviceIcon(s.device_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                            {s.browser || 'Navegador'} <span className="text-slate-300 mx-1">·</span> {s.os || 'Sistema Operativo'}
                          </span>
                          {s.is_current && (
                            <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] px-1.5 py-0 rounded uppercase tracking-widest shadow-sm">
                              ACTUAL
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span className="font-mono">{s.ip_address || 'IP PRIVADA'}</span>
                          </div>
                          {(s.city || s.country) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              <span>{[s.city, s.country].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-lg shadow-sm mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-tighter">
                              {format(new Date(s.login_at), 'HH:mm')}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {format(new Date(s.login_at), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

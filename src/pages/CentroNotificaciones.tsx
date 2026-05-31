import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Check, RefreshCw, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Alertas from '@/pages/Alertas';
import { AlertProtocolSettings } from '@/components/notifications/AlertProtocolSettings';
import { NotificationEngineManager } from '@/components/notifications/NotificationEngineManager';
import { NotificationRulesManager } from '@/components/notifications/NotificationRulesManager';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusStyles: Record<string, string> = {
  sent: 'bg-success/10 text-success border-success/20',
  success: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  dlq: 'bg-destructive/10 text-destructive border-destructive/20',
  suppressed: 'bg-warning/10 text-warning border-warning/20',
};

const typeLabels: Record<string, string> = {
  info: 'Info',
  warning: 'Advertencia',
  error: 'Crítica',
  success: 'Éxito',
};

function formatDate(value: string) {
  return format(new Date(value), "dd MMM yyyy, h:mm a", { locale: es });
}

function normalizeTab(tab: string | null) {
  if (tab === 'radar' || tab === 'alerts' || tab === 'deliveries' || tab === 'rules' || tab === 'engine' || tab === 'settings') {
    return tab;
  }
  return 'radar';
}

export default function CentroNotificaciones() {
  const { hasPermission, permissionsLoaded } = useAuth();
  const [searchParams] = useSearchParams();
  const {
    notifications,
    deliveryLogs,
    userDisplayMap,
    canManageCompanyHistory,
    isLoading,
    error,
    markAsRead,
    markAsAttended,
    deleteNotification,
    refetch,
  } = useNotificationCenter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(() => normalizeTab(searchParams.get('tab')));
  const canViewEngine = hasPermission('motor_notificaciones', 'view') || hasPermission('alertas', 'view');
  const canManageAlertSettings =
    hasPermission('alertas', 'update') ||
    hasPermission('configuracion', 'update') ||
    hasPermission('motor_notificaciones', 'update');

  const handleTabChange = useCallback((next: string) => {
    setActiveTab(next);
  }, []);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (activeTab === 'engine' && !canViewEngine) {
      handleTabChange('radar');
    }
    if (activeTab === 'rules' && !canManageCompanyHistory) {
      handleTabChange('radar');
    }
    if (activeTab === 'settings' && !canManageAlertSettings) {
      handleTabChange('radar');
    }
  }, [activeTab, canManageAlertSettings, canManageCompanyHistory, canViewEngine, handleTabChange, permissionsLoaded]);

  const filteredNotifications = useMemo(() => {
    const term = search.toLowerCase();
    return notifications.filter((item) => {
      const matchesSearch = !term || [item.title, item.message, item.category, userDisplayMap[item.user_id]]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'read' && item.is_read) ||
        (statusFilter === 'unread' && !item.is_read) ||
        (statusFilter === 'attended' && item.is_attended);
      return matchesSearch && matchesStatus;
    });
  }, [notifications, search, statusFilter, userDisplayMap]);

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase();
    return deliveryLogs.filter((item) => {
      const matchesSearch = !term || [item.subject, item.recipient_email, item.template_name, item.provider, userDisplayMap[item.recipient_user_id || '']]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [deliveryLogs, search, statusFilter, channelFilter, userDisplayMap]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    toast.success('Notificación marcada como leída');
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    toast.success('Notificación eliminada');
  };

  const handleMarkAttended = async (id: string) => {
    await markAsAttended(id);
    toast.success('Alerta marcada como atendida');
  };

  if (error) {
    return <div className="text-destructive">No se pudo cargar el centro de notificaciones.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-border shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-md shadow-primary/10">
              <Bell className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase leading-tight">
                Centro de <span className="text-primary">Notificaciones</span>
              </h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                {canManageCompanyHistory ? 'Historial de alertas y envíos de la empresa por usuario' : 'Historial de tus alertas y envíos'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={refetch} 
            disabled={isLoading} 
            className="h-12 px-6 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} /> 
            Actualizar
          </Button>
        </div>
        {/* Decorative elements */}
        
        
      </div>

      <div className="rounded-[2.5rem] border-2 border-border/50 bg-background p-8">
        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Consola Operativa</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Visualiza alertas, envios, reglas y configuracion desde un solo modulo.</p>
        </div>
      {activeTab !== 'radar' && activeTab !== 'rules' && activeTab !== 'engine' && activeTab !== 'settings' && (
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-4 bg-background p-3 rounded-[2rem] border border-border/50 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Buscar por usuario, asunto o mensaje..."
              className="h-14 pl-12 bg-transparent border-none shadow-none focus-visible:ring-0 text-base font-medium placeholder:text-muted-foreground/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3 pr-2">
            <div className="h-10 w-px bg-border/40 hidden md:block mx-2" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-full md:w-[180px] rounded-2xl bg-background border-none shadow-none font-black uppercase tracking-widest text-[10px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-background">
                <SelectItem value="all">TODOS</SelectItem>
                <SelectItem value="unread">SIN LEER</SelectItem>
                <SelectItem value="read">LEÍDAS</SelectItem>
                <SelectItem value="attended">ATENDIDAS</SelectItem>
                <SelectItem value="sent">ENVIADO</SelectItem>
                <SelectItem value="pending">PENDIENTE</SelectItem>
                <SelectItem value="failed">FALLIDO</SelectItem>
                <SelectItem value="suppressed">SUPRIMIDO</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-12 w-full md:w-[180px] rounded-2xl bg-background border-none shadow-none font-black uppercase tracking-widest text-[10px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-background">
                <SelectItem value="all">TODOS CANALES</SelectItem>
                <SelectItem value="email">CORREO</SelectItem>
                <SelectItem value="in_app">APP</SelectItem>
                <SelectItem value="whatsapp">WHATSAPP</SelectItem>
                <SelectItem value="telegram">TELEGRAM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="mb-6 overflow-x-auto rounded-[1.75rem] border border-border/70 bg-white p-1.5 shadow-sm">
          <TabsList className="grid h-auto min-w-max grid-cols-6 gap-1 bg-transparent p-0">
            {[
              { value: 'radar', label: 'RADAR DE ALERTAS' },
              { value: 'alerts', label: 'ALERTAS EN APP' },
              { value: 'deliveries', label: 'CORREOS Y ENVÍOS' },
              ...(canManageCompanyHistory ? [{ value: 'rules', label: 'REGLAS INTELIGENTES' }] : []),
              ...(canViewEngine ? [{ value: 'engine', label: 'MOTOR EMPRESARIAL' }] : []),
              ...(canManageAlertSettings ? [{ value: 'settings', label: 'CONFIGURACION' }] : []),
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-10 rounded-2xl px-6 py-2.5 font-black uppercase tracking-widest text-[10px] text-muted-foreground shadow-none transition-all whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
            <TabsContent value="radar" className="mt-0">
              <Alertas embedded />
            </TabsContent>
            {canManageCompanyHistory && (
              <TabsContent value="rules" className="mt-0">
                <NotificationRulesManager />
              </TabsContent>
            )}
            {canViewEngine && (
              <TabsContent value="engine" className="mt-0">
                <NotificationEngineManager />
              </TabsContent>
            )}
            {canManageAlertSettings && (
              <TabsContent value="settings" className="mt-0">
                <AlertProtocolSettings />
              </TabsContent>
            )}
            <TabsContent value="alerts">
              <div className="space-y-3 md:hidden">
                {filteredNotifications.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground break-words">{userDisplayMap[item.user_id] || item.user_id}</p>
                      <p className="font-medium break-words">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                      <Badge variant={item.is_attended ? 'default' : 'outline'}>{item.is_attended ? 'Atendida' : 'Pendiente'}</Badge>
                      <Badge variant={item.is_read ? 'secondary' : 'default'}>{item.is_read ? 'Leída' : 'Sin leer'}</Badge>
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>{formatDate(item.created_at)}</span>
                      <div className="flex gap-2">
                        {!item.is_read && <Button variant="outline" size="sm" className="flex-1" onClick={() => handleMarkRead(item.id)}><Check className="h-4 w-4" /> Leer</Button>}
                        {!item.is_attended && <Button variant="outline" size="sm" className="flex-1" onClick={() => handleMarkAttended(item.id)}><Check className="h-4 w-4" /> Atendida</Button>}
                        <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /> Eliminar</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredNotifications.length === 0 && <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No hay alertas con estos filtros.</div>}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Alerta</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredNotifications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{userDisplayMap[item.user_id] || item.user_id}</TableCell>
                      <TableCell><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground line-clamp-1">{item.message}</p></TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                        <Badge variant={item.is_attended ? 'default' : 'outline'}>{item.is_attended ? 'Atendida' : 'Pendiente'}</Badge>
                      </TableCell>
                      <TableCell><Badge variant={item.is_read ? 'secondary' : 'default'}>{item.is_read ? 'Leída' : 'Sin leer'}</Badge></TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {!item.is_read && <Button variant="ghost" size="icon" onClick={() => handleMarkRead(item.id)}><Check className="h-4 w-4" /></Button>}
                        {!item.is_attended && <Button variant="ghost" size="icon" onClick={() => handleMarkAttended(item.id)} title="Marcar como atendida"><Check className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredNotifications.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay alertas con estos filtros.</TableCell></TableRow>}
                </TableBody>
              </Table>
              </div>
            </TabsContent>
            <TabsContent value="deliveries">
              <div className="space-y-3 md:hidden">
                {filteredLogs.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground break-words">{item.recipient_user_id ? userDisplayMap[item.recipient_user_id] || item.recipient_user_id : '-'}</p>
                      <p className="font-medium break-words">{item.subject || item.template_name || '-'}</p>
                      {item.recipient_email && <p className="text-sm text-muted-foreground break-words">{item.recipient_email}</p>}
                      {item.error_message && <p className="text-sm text-destructive line-clamp-2">{item.error_message}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.channel}</Badge>
                      <Badge variant="outline" className={statusStyles[item.status] || 'bg-background text-muted-foreground'}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                ))}
                {filteredLogs.length === 0 && <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No hay envíos registrados con estos filtros.</div>}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Destinatario</TableHead><TableHead>Canal</TableHead><TableHead>Asunto</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredLogs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.recipient_user_id ? userDisplayMap[item.recipient_user_id] || item.recipient_user_id : '-'}</TableCell>
                      <TableCell>{item.recipient_email || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{item.channel}</Badge></TableCell>
                      <TableCell><p className="font-medium">{item.subject || item.template_name || '-'}</p>{item.error_message && <p className="text-sm text-destructive line-clamp-1">{item.error_message}</p>}</TableCell>
                      <TableCell><Badge variant="outline" className={statusStyles[item.status] || 'bg-background text-muted-foreground'}>{item.status}</Badge></TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay envíos registrados con estos filtros.</TableCell></TableRow>}
                </TableBody>
              </Table>
              </div>
            </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

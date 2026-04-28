import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Mail, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function CentroNotificaciones() {
  const {
    notifications,
    deliveryLogs,
    userDisplayMap,
    canManageCompanyHistory,
    isLoading,
    error,
    markAsRead,
    deleteNotification,
    refetch,
  } = useNotificationCenter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const filteredNotifications = useMemo(() => {
    const term = search.toLowerCase();
    return notifications.filter((item) => {
      const matchesSearch = !term || [item.title, item.message, item.category, userDisplayMap[item.user_id]]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'read' ? item.is_read : !item.is_read);
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

  const stats = useMemo(() => ({
    totalNotifications: notifications.length,
    unread: notifications.filter((item) => !item.is_read).length,
    emails: deliveryLogs.filter((item) => item.channel === 'email').length,
    failed: deliveryLogs.filter((item) => ['failed', 'error', 'dlq'].includes(item.status)).length,
  }), [notifications, deliveryLogs]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    toast.success('Notificación marcada como leída');
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    toast.success('Notificación eliminada');
  };

  if (error) {
    return <div className="text-destructive">No se pudo cargar el centro de notificaciones.</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Centro de Notificaciones</h1>
          <p className="text-muted-foreground mt-1">
            {canManageCompanyHistory ? 'Historial de alertas y envíos de la empresa por usuario' : 'Historial de tus alertas y envíos'}
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} /> Actualizar
        </Button>
      </motion.div>

      <div className="hidden gap-4 md:grid md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Bell className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.totalNotifications}</p><p className="text-sm text-muted-foreground">Alertas</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-warning" /><div><p className="text-2xl font-bold">{stats.unread}</p><p className="text-sm text-muted-foreground">Sin leer</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Mail className="h-5 w-5 text-info" /><div><p className="text-2xl font-bold">{stats.emails}</p><p className="text-sm text-muted-foreground">Correos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Mail className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-sm text-muted-foreground">Fallidos</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Filtra por usuario, estado, canal, correo o asunto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar historial..." className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unread">Sin leer</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="suppressed">Suprimido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                <SelectItem value="email">Correo</SelectItem>
                <SelectItem value="in_app">App</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="alerts">
            <TabsList>
              <TabsTrigger value="alerts">Alertas en app</TabsTrigger>
              <TabsTrigger value="deliveries">Correos y envíos</TabsTrigger>
            </TabsList>
            <TabsContent value="alerts">
              <Table>
                <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Alerta</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredNotifications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{userDisplayMap[item.user_id] || item.user_id}</TableCell>
                      <TableCell><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground line-clamp-1">{item.message}</p></TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[item.type] || item.type}</Badge></TableCell>
                      <TableCell><Badge variant={item.is_read ? 'secondary' : 'default'}>{item.is_read ? 'Leída' : 'Sin leer'}</Badge></TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {!item.is_read && <Button variant="ghost" size="icon" onClick={() => handleMarkRead(item.id)}><Check className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredNotifications.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay alertas con estos filtros.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="deliveries">
              <Table>
                <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Destinatario</TableHead><TableHead>Canal</TableHead><TableHead>Asunto</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredLogs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.recipient_user_id ? userDisplayMap[item.recipient_user_id] || item.recipient_user_id : '-'}</TableCell>
                      <TableCell>{item.recipient_email || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{item.channel}</Badge></TableCell>
                      <TableCell><p className="font-medium">{item.subject || item.template_name || '-'}</p>{item.error_message && <p className="text-sm text-destructive line-clamp-1">{item.error_message}</p>}</TableCell>
                      <TableCell><Badge variant="outline" className={statusStyles[item.status] || 'bg-muted text-muted-foreground'}>{item.status}</Badge></TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay envíos registrados con estos filtros.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

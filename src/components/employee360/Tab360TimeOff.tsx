import { motion } from 'framer-motion';
import { Umbrella, Calendar, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';

interface Tab360TimeOffProps {
  vacations: { balances: any[]; requests: any[] } | undefined;
  leaves: any[];
  isLoadingVacations: boolean;
  isLoadingLeaves: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente: { label: 'Pendiente', color: 'bg-warning-light text-warning', icon: <Loader2 className="w-3 h-3" /> },
  aprobado: { label: 'Aprobado', color: 'bg-success-light text-success', icon: <CheckCircle2 className="w-3 h-3" /> },
  rechazado: { label: 'Rechazado', color: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-3 h-3" /> },
  cancelado: { label: 'Cancelado', color: 'bg-background text-muted-foreground', icon: <XCircle className="w-3 h-3" /> },
  disfrutado: { label: 'Disfrutado', color: 'bg-primary-light text-primary', icon: <CheckCircle2 className="w-3 h-3" /> },
};

const leaveTypeLabels: Record<string, string> = {
  calamidad: 'Calamidad Doméstica',
  licencia_maternidad: 'Licencia de Maternidad',
  licencia_paternidad: 'Licencia de Paternidad',
  licencia_luto: 'Licencia de Luto',
  cita_medica: 'Cita Médica',
  personal: 'Permiso Personal',
  estudio: 'Permiso de Estudio',
  otro: 'Otro',
};

function RequestCard({ request, type }: { request: any; type: 'vacation' | 'leave' }) {
  const status = statusConfig[request.status] || statusConfig.pendiente;

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {type === 'vacation' ? (
            <Umbrella className="w-4 h-4 text-primary" />
          ) : (
            <Clock className="w-4 h-4 text-primary" />
          )}
          <span className="break-words font-medium">
            {type === 'vacation' 
              ? (request.request_type === 'vacaciones' ? 'Vacaciones' : 'Vacaciones en Dinero')
              : (leaveTypeLabels[request.leave_type] || request.leave_type)
            }
          </span>
        </div>
        <Badge variant="outline" className={cn('flex items-center gap-1', status.color)}>
          {status.icon}
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Desde</p>
          <p className="font-medium">
            {formatDateOnly(request.start_date, "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Hasta</p>
          <p className="font-medium">
            {formatDateOnly(request.end_date, "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Días</p>
          <p className="font-medium">{request.total_days || request.days_requested}</p>
        </div>
      </div>

      {request.reason && (
        <p className="text-sm text-muted-foreground line-clamp-2">{request.reason}</p>
      )}
    </div>
  );
}

export function Tab360TimeOff({ vacations, leaves, isLoadingVacations, isLoadingLeaves }: Tab360TimeOffProps) {
  const currentYear = new Date().getFullYear();

  if (isLoadingVacations && isLoadingLeaves) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const balance = vacations?.balances?.[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Vacation Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {balance?.days_entitled || 0}
                </p>
                <p className="text-sm text-muted-foreground">Días Causados {currentYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {balance?.days_taken || 0}
                </p>
                <p className="text-sm text-muted-foreground">Días Disfrutados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {balance?.days_scheduled || 0}
                </p>
                <p className="text-sm text-muted-foreground">Días Programados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success-light/50 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Umbrella className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {balance?.days_pending || 0}
                </p>
                <p className="text-sm text-muted-foreground">Días Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Tabs */}
      <Tabs defaultValue="vacations" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="vacations" className="min-h-10 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
            <Umbrella className="w-4 h-4" />
            Vacaciones ({vacations?.requests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="leaves" className="min-h-10 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
            <Clock className="w-4 h-4" />
            Permisos ({leaves.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacations" className="mt-4">
          {vacations?.requests && vacations.requests.length > 0 ? (
            <div className="space-y-3">
              {vacations.requests.map((request) => (
                <RequestCard key={request.id} request={request} type="vacation" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Umbrella className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay solicitudes de vacaciones registradas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          {leaves.length > 0 ? (
            <div className="space-y-3">
              {leaves.map((request) => (
                <RequestCard key={request.id} request={request} type="leave" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay solicitudes de permisos registradas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2, MapPin, Phone, User, Calendar, FileText,
  Users, Clock, Layers, AlertTriangle, Briefcase
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { useCenterDetail } from '@/hooks/useCenterDetail';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
];

function ContractDaysBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return <Badge variant="secondary">Sin fecha fin</Badge>;
  const days = differenceInDays(new Date(endDate), new Date());
  if (days < 0) return <Badge variant="destructive">Vencido hace {Math.abs(days)} días</Badge>;
  if (days <= 7) return <Badge variant="destructive">{days} días restantes</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500 text-white border-0">{days} días restantes</Badge>;
  return <Badge className="bg-emerald-600 text-white border-0">{days} días restantes</Badge>;
}

interface Props {
  center: any;
  companyTotalEmployees?: number;
}

export function CenterAnalyticalCard({ center }: Props) {
  const { isLoading, totalEmployees, positionCounts, shifts, areas, expiringContracts } =
    useCenterDetail(center.id);

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 bg-muted/30 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{center.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {center.code && <Badge variant="outline" className="text-xs">{center.code}</Badge>}
                <Badge variant={center.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                  {center.is_active !== false ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-primary">{isLoading ? '—' : totalEmployees}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Empleados</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* General Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground">Cliente Principal</p>
            <p className="font-medium truncate">{center.main_client || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Ciudad</p>
            <p className="font-medium truncate">
              {[center.city, center.department].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Responsable</p>
            <p className="font-medium truncate">{center.manager_name || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Teléfono</p>
            <p className="font-medium truncate">{center.phone || '—'}</p>
          </div>
        </div>

        <Separator />

        {/* Contract Info */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> INFORMACIÓN CONTRACTUAL
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">Inicio Contrato</p>
              <p className="font-medium">{formatDate(center.contract_start_date)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Terminación Comercial</p>
              <p className="font-medium">{formatDate(center.contract_commercial_date)}</p>
            </div>
          </div>
          <div className="mt-2">
            <ContractDaysBadge endDate={center.contract_commercial_date} />
          </div>
        </div>

        <Separator />

        {/* Employees by Position */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> EMPLEADOS POR CARGO
          </p>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : positionCounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sin empleados asignados</p>
          ) : (
            <div className="space-y-3">
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionCounts} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="position_name" type="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [`${value}`, 'Cantidad']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {positionCounts.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {positionCounts.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {p.position_name}: {p.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Shifts */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> TURNOS / HORARIOS
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : shifts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sin turnos configurados</p>
          ) : (
            <div className="space-y-1.5">
              {shifts.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-xs">{s.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {s.type === 'schedule' ? 'Horario' : 'Ciclo'}
                    </Badge>
                  </div>
                  <Badge className="text-[10px]">{s.employeeCount}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Indicators */}
        {(areas.length > 0 || expiringContracts > 0) && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> INDICADORES
              </p>
              {areas.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] text-muted-foreground mb-1">Áreas Operativas</p>
                  <div className="flex flex-wrap gap-1">
                    {areas.map(a => (
                      <Badge key={a.id} variant="secondary" className="text-[10px]">
                        {a.name} ({a.employeeCount})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {expiringContracts > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs">
                    <strong>{expiringContracts}</strong> contrato{expiringContracts !== 1 ? 's' : ''} por vencer (30 días)
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {center.notes && (
          <>
            <Separator />
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Nota</p>
              <p className="text-xs text-foreground">{center.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

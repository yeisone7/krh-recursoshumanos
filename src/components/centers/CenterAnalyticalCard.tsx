import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ElementType, ReactNode } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Layers,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
  if (!endDate) {
    return <Badge variant="secondary">Sin fecha fin</Badge>;
  }

  const days = differenceInDays(new Date(endDate), new Date());

  if (days < 0) {
    return <Badge variant="destructive">Vencido hace {Math.abs(days)} días</Badge>;
  }

  if (days <= 7) {
    return <Badge variant="destructive">{days} días restantes</Badge>;
  }

  if (days <= 30) {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700">{days} días restantes</Badge>;
  }

  return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{days} días restantes</Badge>;
}

function InfoTile({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/80 bg-muted/20 p-3', className)}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="min-h-5 truncate text-sm font-semibold text-foreground">
        {value || <span className="font-normal text-muted-foreground">No definido</span>}
      </div>
    </div>
  );
}

interface Props {
  center: any;
  companyTotalEmployees?: number;
  onOpenDetail?: () => void;
}

export function CenterAnalyticalCard({ center, companyTotalEmployees = 0, onOpenDetail }: Props) {
  const {
    isLoading,
    totalEmployees,
    positionCounts,
    shifts,
    areas,
    expiringContracts,
  } = useCenterDetail(center.id);

  const employeePercentage =
    companyTotalEmployees > 0 ? `${((totalEmployees / companyTotalEmployees) * 100).toFixed(1)}%` : null;

  const formatDate = (date: string | null) =>
    date ? format(new Date(date), 'dd MMM yyyy', { locale: es }) : 'No definida';

  const visiblePositions = positionCounts.slice(0, 5);
  const visibleAreas = areas.slice(0, 5);
  const visibleShifts = shifts.slice(0, 3);

  return (
    <Card className="overflow-hidden rounded-lg border-border/80 bg-background shadow-sm transition-colors hover:border-primary/30">
      <div className="border-b bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {center.code && (
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    {center.code}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    center.is_active !== false
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600',
                  )}
                >
                  {center.is_active !== false ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <h2 className="truncate text-lg font-bold text-foreground">{center.name}</h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {[center.city, center.department].filter(Boolean).join(', ') || 'Ubicación no definida'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[190px]">
            <div className="rounded-lg border border-border/80 bg-background p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {isLoading ? '...' : totalEmployees}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Personas
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-background p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {employeePercentage || '-'}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Participación
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoTile icon={User} label="Cliente" value={center.main_client} />
          <InfoTile icon={Briefcase} label="Responsable" value={center.manager_name} />
          <InfoTile icon={Phone} label="Contacto" value={center.phone} />
          <InfoTile icon={Layers} label="Áreas" value={areas.length ? `${areas.length} activas` : null} />
        </div>

        <section className="rounded-lg border border-border/80 bg-background p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Contrato comercial</h3>
            </div>
            <ContractDaysBadge endDate={center.contract_commercial_date} />
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Fecha de inicio</p>
              <p className="font-semibold text-foreground">{formatDate(center.contract_start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terminación comercial</p>
              <p className="font-semibold text-foreground">{formatDate(center.contract_commercial_date)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/80 bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Distribución por cargo</h3>
            </div>
            <Badge variant="outline">{totalEmployees} total</Badge>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ) : visiblePositions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin personal vinculado
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[170px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visiblePositions} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 8 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      dataKey="position_name"
                      type="category"
                      width={120}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        boxShadow: 'none',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {visiblePositions.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {positionCounts.length > visiblePositions.length && (
                <p className="text-xs text-muted-foreground">
                  +{positionCounts.length - visiblePositions.length} cargos adicionales en la ficha completa.
                </p>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-lg border border-border/80 bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Turnos activos</h3>
            </div>
            {visibleShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin turnos configurados</p>
            ) : (
              <div className="space-y-2">
                {visibleShifts.map((shift, index) => (
                  <div key={`${shift.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                    <span className="truncate text-sm font-medium text-foreground">{shift.name}</span>
                    <Badge variant="outline">{shift.employeeCount}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border/80 bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
            </div>
            {expiringContracts > 0 ? (
              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">
                  {expiringContracts} contrato{expiringContracts !== 1 ? 's' : ''} por vencer en 30 días.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">Sin vencimientos contractuales próximos.</p>
              </div>
            )}
          </section>
        </div>

        {visibleAreas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleAreas.map((area) => (
              <Badge key={area.id} variant="secondary" className="bg-muted text-muted-foreground">
                {area.name} ({area.employeeCount})
              </Badge>
            ))}
            {areas.length > visibleAreas.length && (
              <Badge variant="outline">+{areas.length - visibleAreas.length}</Badge>
            )}
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onOpenDetail}>
            Ver ficha completa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

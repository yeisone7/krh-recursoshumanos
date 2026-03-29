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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

import { useCenterDetail } from '@/hooks/useCenterDetail';

interface CenterDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: any | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
      </div>
    </div>
  );
}

function ContractDaysBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return <Badge variant="secondary">Sin fecha fin</Badge>;
  const days = differenceInDays(new Date(endDate), new Date());
  if (days < 0) return <Badge variant="destructive">Vencido hace {Math.abs(days)} días</Badge>;
  if (days <= 7) return <Badge variant="destructive">{days} días restantes</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500 text-white border-0">{days} días restantes</Badge>;
  return <Badge className="bg-emerald-600 text-white border-0">{days} días restantes</Badge>;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
];

export function CenterDetailSheet({ open, onOpenChange, center }: CenterDetailSheetProps) {
  const { isLoading, totalEmployees, positionCounts, shifts, areas, expiringContracts } =
    useCenterDetail(center?.id);

  if (!center) return null;

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[620px] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b bg-muted/30">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">{center.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  Ficha técnica del centro de operación
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {center.code && <Badge variant="outline">{center.code}</Badge>}
              <Badge variant={center.is_active !== false ? 'default' : 'secondary'}>
                {center.is_active !== false ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Información General */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1">
              <InfoRow icon={FileText} label="Código (N° de Contrato)" value={center.code} />
              <InfoRow icon={Briefcase} label="Cliente Principal" value={center.main_client} />
              <InfoRow icon={MapPin} label="Ciudad / Departamento"
                value={[center.city, center.department].filter(Boolean).join(', ') || null} />
              <InfoRow icon={MapPin} label="Dirección" value={center.address} />
              <InfoRow icon={Phone} label="Teléfono" value={center.phone} />
              <InfoRow icon={User} label="Responsable" value={center.manager_name} />
            </CardContent>
          </Card>

          {/* Section 2: Información Contractual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Información Contractual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow icon={Calendar} label="Fecha Inicio del Contrato"
                  value={formatDate(center.contract_start_date)} />
                <InfoRow icon={Calendar} label="Fecha Terminación Comercial"
                  value={formatDate(center.contract_commercial_date)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vencimiento:</span>
                <ContractDaysBadge endDate={center.contract_commercial_date} />
              </div>
              {center.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nota</p>
                    <p className="text-sm">{center.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Empleados por Cargo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> Empleados por Cargo
                <Badge variant="outline" className="ml-auto">{totalEmployees} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              ) : positionCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay empleados asignados a este centro
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Chart */}
                  {positionCounts.length > 0 && (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={positionCounts} layout="vertical"
                          margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="position_name" type="category" width={140}
                            tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => [`${value} empleado${value !== 1 ? 's' : ''}`, 'Cantidad']}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {positionCounts.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {/* Table */}
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">Cargo</th>
                          <th className="text-right px-3 py-2 font-medium">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positionCounts.map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{p.position_name}</td>
                            <td className="px-3 py-2 text-right font-semibold">{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Turnos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Turnos / Horarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay turnos configurados
                </p>
              ) : (
                <div className="space-y-2">
                  {shifts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{s.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {s.type === 'schedule' ? 'Horario' : 'Ciclo'}
                        </Badge>
                      </div>
                      <Badge>{s.employeeCount}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Indicadores Adicionales */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" /> Indicadores Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Areas */}
              {areas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Áreas Operativas</p>
                  <div className="flex flex-wrap gap-2">
                    {areas.map(a => (
                      <Badge key={a.id} variant="secondary">
                        {a.name} ({a.employeeCount})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Expiring contracts */}
              <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <AlertTriangle className={`w-4 h-4 ${expiringContracts > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Contratos por vencer (30 días)</p>
                  <p className="text-sm font-semibold">{expiringContracts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

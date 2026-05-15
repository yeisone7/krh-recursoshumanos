import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2, MapPin, Phone, User, Calendar, FileText,
  Users, Clock, Layers, AlertTriangle, Briefcase, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function CenterAnalyticalCard({ center, companyTotalEmployees = 0 }: Props) {
  const { isLoading, totalEmployees, positionCounts, shifts, areas, expiringContracts } =
    useCenterDetail(center.id);

  const employeePercentage = companyTotalEmployees > 0
    ? ((totalEmployees / companyTotalEmployees) * 100).toFixed(1)
    : null;

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—';

  return (
    <Card className="group relative overflow-hidden border border-border shadow-2xl hover:shadow-primary/10 transition-all duration-700 bg-background rounded-[2.5rem]">
      {/* Decorative element */}
      
      
      {/* Header Section */}
      <div className="relative p-8 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/30 transform group-hover:-rotate-6 transition-all duration-500">
                <Building2 className="w-7 h-7" />
              </div>
              {center.is_active !== false && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-background shadow-lg animate-pulse" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                 <Badge variant="outline" className="text-primary border-border font-black uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                    ID: {center.code || 'S/N'}
                 </Badge>
                 {center.is_active === false && (
                    <Badge variant="secondary" className="bg-background text-muted-foreground font-black uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                       Inactivo
                    </Badge>
                 )}
              </div>
              <h3 className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors leading-none">
                 {center.name}
              </h3>
              <div className="flex items-center gap-2 mt-2 opacity-60">
                 <MapPin className="w-3.5 h-3.5 text-primary" />
                 <span className="text-[11px] font-bold uppercase tracking-widest truncate">{center.city || 'Ubicación no definida'}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
             <div className="p-4 rounded-3xl border border-border shadow-inner">
                <p className="text-4xl font-black text-primary tracking-tighter leading-none tabular-nums">
                   {isLoading ? '—' : totalEmployees}
                </p>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Colaboradores</p>
             </div>
          </div>
        </div>
      </div>

      <Separator className="" />

      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          <div className="p-8 pt-6 space-y-8">
            {/* Quick Metadata */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Cliente', value: center.main_client, icon: User, color: 'text-blue-500' },
                { label: 'Responsable', value: center.manager_name, icon: Briefcase, color: 'text-amber-500' },
                { label: 'Contacto', value: center.phone, icon: Phone, color: 'text-emerald-500' },
                { label: 'Ocupación', value: employeePercentage ? `${employeePercentage}%` : '—', icon: Layers, color: 'text-primary' },
              ].map((item, i) => (
                <div key={i} className="group/item relative p-4 rounded-[1.5rem] bg-background border border-border hover:border-primary/20 hover:bg-background transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded-lg bg-background shadow-sm", item.color.replace('text', 'text-opacity-20 bg'))}>
                       <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</span>
                  </div>
                  <p className="text-xs font-black truncate text-foreground/90">{item.value || 'N/A'}</p>
                </div>
              ))}
            </div>

            {/* Contract Timeline Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> 
                  Estado Contractual
                </h4>
              </div>
              <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border ">
                <div className="flex justify-between items-end mb-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Inicio</p>
                    <p className="text-sm font-black tracking-tight">{formatDate(center.contract_start_date)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Vencimiento</p>
                    <p className="text-sm font-black tracking-tight text-primary">{formatDate(center.contract_commercial_date)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center mb-1">
                      <ContractDaysBadge endDate={center.contract_commercial_date} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Progreso Contrato</span>
                   </div>
                   <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: '70%' }} />
                   </div>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="space-y-5">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> 
                Distribución de Talento
              </h4>
              
              {isLoading ? (
                <div className="space-y-3">
                   <Skeleton className="h-20 w-full rounded-2xl" />
                   <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : positionCounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-background /10 rounded-[2rem] border-2 border-dashed border-border ">
                  <Users className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Sin personal vinculado</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-[220px] w-full bg-background rounded-[2rem] p-4 border border-border ">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={positionCounts} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="position_name" 
                          type="category" 
                          width={120} 
                          tick={{ fontSize: 9, fontWeight: 900, fill: 'currentColor', textAnchor: 'start' }}
                          dx={-110}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--primary) / 0.05)', radius: 10 }}
                          contentStyle={{ borderRadius: '20px', border: '1px solid hsl(var(--primary) / 0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '10px' }}
                        />
                        <Bar dataKey="count" radius={[0, 20, 20, 0]} barSize={24}>
                          {positionCounts.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} className="opacity-90 hover:opacity-100 transition-opacity" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {positionCounts.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border shadow-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80">{p.position_name}</span>
                        <span className="text-[10px] font-black text-primary">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Operational Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> 
                  Horarios Activos
                </h4>
                {shifts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-background /10 border border-dashed text-center">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sin turnos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shifts.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-background p-3 rounded-2xl border border-border shadow-sm group/sh hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-tight">{s.name}</span>
                        </div>
                        <Badge className="h-6 rounded-lg bg-primary text-primary-foreground font-black text-[10px] px-2">
                          {s.employeeCount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 
                  Indicadores SSTA
                </h4>
                <div className="space-y-3">
                  {expiringContracts > 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200/50 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Riesgo Contractual</p>
                        <p className="text-[11px] font-bold text-amber-700 leading-tight">
                          {expiringContracts} personas con contratos por vencer.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-200/50 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Estatus Óptimo</p>
                        <p className="text-[11px] font-bold text-emerald-700 leading-tight">Vigencias administrativas al día.</p>
                      </div>
                    </div>
                  )}

                  {areas.length > 0 && (
                    <div className="p-4 rounded-2xl border border-border ">
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Distribución Áreas</p>
                       <div className="flex flex-wrap gap-1.5">
                          {areas.slice(0, 4).map(a => (
                             <Badge key={a.id} variant="secondary" className="text-[9px] font-black bg-background border-border text-primary">
                                {a.name}
                             </Badge>
                          ))}
                          {areas.length > 4 && <span className="text-[9px] font-black text-muted-foreground">+{areas.length - 4}</span>}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      {/* Footer Branding */}
      <div className="p-6 bg-gradient-to-t from-muted/30 to-transparent flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 bg-background text-[9px] font-black text-primary">V.1.2.0</Badge>
         </div>
         <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
            Ver Detalle Completo
         </Button>
      </div>
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Eye,
  TrendingUp,
  Calendar,
  Building2,
  UserPlus,
  Filter,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { useVacancies } from '@/hooks/useVacancies';
import { useCandidates } from '@/hooks/useCandidates';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { VacancyFormDialog } from '@/components/vacancies/VacancyFormDialog';
import { VacancyDetailDialog } from '@/components/vacancies/VacancyDetailDialog';
import { CandidateFormDialog } from '@/components/vacancies/CandidateFormDialog';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import {
  VacancyStatus,
  vacancyStatusLabels,
  vacancyStatusConfig,
} from '@/types/vacancy';

export default function Seleccion() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  
  // Dialogs
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [showVacancyDetail, setShowVacancyDetail] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [candidateFormVacancyId, setCandidateFormVacancyId] = useState<string | null>(null);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const { data: vacancies = [], isLoading: loadingVacancies } = useVacancies();
  const { data: candidates = [] } = useCandidates();
  const { data: operationCenters = [] } = useOperationCenters();
  const { isAdmin, isRRHH, isSuperAdmin, isPsicologo, canCreate } = useAuth();
  const canCreateVacancy = isAdmin || isRRHH || isSuperAdmin || isPsicologo || canCreate('seleccion');

  // Stats
  const stats = useMemo(() => {
    const openVacancies = vacancies.filter((v) => v.status === 'open').length;
    const inProcessVacancies = vacancies.filter((v) => v.status === 'in_process').length;
    const totalCandidates = candidates.length;
    const inProcessCandidates = candidates.filter((c) =>
      !['hired', 'not_selected', 'withdrawn'].includes(c.status)
    ).length;
    const hiredCandidates = candidates.filter((c) => c.status === 'hired').length;
    const selectedCandidates = candidates.filter((c) => c.status === 'selected').length;

    return {
      openVacancies,
      inProcessVacancies,
      totalCandidates,
      inProcessCandidates,
      hiredCandidates,
      selectedCandidates,
    };
  }, [vacancies, candidates]);

  // Filter vacancies
  const filteredVacancies = useMemo(() => {
    return vacancies.filter((vacancy) => {
      const matchesSearch =
        vacancy.position_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vacancy.department_area?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vacancy.status === statusFilter;
      const matchesCenter =
        centerFilter === 'all' || vacancy.operation_center_id === centerFilter;

      return matchesSearch && matchesStatus && matchesCenter;
    });
  }, [vacancies, searchQuery, statusFilter, centerFilter]);

  const vacancyItems = useMemo(
    () => filteredVacancies.map((vacancy) => {
      const status = vacancy.status as VacancyStatus;
      const statusStyle = vacancyStatusConfig[status];
      const candidateCount = (vacancy as any).candidates?.length || 0;
      const centerName = (vacancy as any).operation_centers?.name || 'General';

      return {
        id: vacancy.id,
        title: vacancy.position_title,
        subtitle: `${vacancy.department_area || 'Sin área'} • ${vacancy.positions_count} posicion${vacancy.positions_count > 1 ? 'es' : ''}`,
        badge: (
          <Badge variant="outline" className={cn('max-w-full truncate font-black uppercase tracking-widest text-[9px] px-2', statusStyle.bg, statusStyle.text, statusStyle.border)}>
            {vacancyStatusLabels[status]}
          </Badge>
        ),
        fields: [
          { label: 'Centro', value: centerName },
          { label: 'Candidatos', value: candidateCount },
          { label: 'Apertura', value: formatDateOnly(vacancy.open_date, 'dd MMM yyyy', { locale: es }) },
        ],
        onClick: () => openVacancyDetail(vacancy.id),
        actions: (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 rounded-xl hover:bg-primary/20 text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setCandidateFormVacancyId(vacancy.id);
                setShowCandidateForm(true);
              }}
              disabled={vacancy.status !== 'in_process'}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 rounded-xl bg-background hover:bg-background text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                openVacancyDetail(vacancy.id);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ),
      };
    }),
    [filteredVacancies]
  );

  const openVacancyDetail = (vacancyId: string) => {
    setSelectedVacancyId(vacancyId);
    setShowVacancyDetail(true);
  };

  const kpis = useMemo(() => ([
    { label: 'VACANTES ABIERTAS', value: stats.openVacancies, desc: 'Nuevas solicitudes', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'EN PROCESO', value: stats.inProcessVacancies, desc: 'Reclutamiento activo', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'CANDIDATOS', value: stats.totalCandidates, desc: 'Base de datos total', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'CONTRATADOS', value: stats.hiredCandidates, desc: 'Cierres exitosos', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ]), [stats]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
        
        
        
        <div className="relative flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/10 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div className="[&_h1]:!mt-0 [&_h1]:!text-xl sm:[&_h1]:!text-2xl">
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[8px] px-2 py-0">
                  Gestión de Talento
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Selección y Reclutamiento</h1>
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground max-w-xl leading-snug">
              Administración de vacantes, evaluación de candidatos y seguimiento de procesos de contratación.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:min-w-[500px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl bg-background border border-border px-3 py-2 shadow-sm hover:shadow-md hover:border-border transition-all duration-500">
                <div className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3 h-3" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-base sm:text-lg font-black tracking-tighter leading-none ${stat.color}`}>{stat.value}</p>
                  <p className="text-[8px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 px-4 py-2 sm:px-6 bg-background border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar vacantes por cargo o área..."
              className="h-9 rounded-lg border-border bg-background pl-8 text-xs font-bold transition-all placeholder:font-normal focus:bg-background focus:ring-4 focus:ring-primary/5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background text-[11px] font-bold uppercase tracking-wider sm:w-[150px]">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-md">
                <SelectItem value="all" className="p-2.5 text-xs font-bold uppercase">Todos los estados</SelectItem>
                <SelectItem value="open" className="p-2.5 text-xs font-bold uppercase text-emerald-600">Abierta</SelectItem>
                <SelectItem value="in_process" className="p-2.5 text-xs font-bold uppercase text-amber-600">En Proceso</SelectItem>
                <SelectItem value="closed" className="p-2.5 text-xs font-bold uppercase text-blue-600">Cerrada</SelectItem>
                <SelectItem value="cancelled" className="p-2.5 text-xs font-bold uppercase text-destructive">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background text-[11px] font-bold uppercase tracking-wider sm:w-[170px]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <SelectValue placeholder="Centro" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-md">
                <SelectItem value="all" className="p-2.5 text-xs font-bold uppercase">Todos los centros</SelectItem>
                {operationCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id} className="p-2.5 text-xs font-bold uppercase">
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canCreateVacancy && (
          <Button className="h-9 w-full rounded-lg bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-md shadow-primary/10 lg:w-auto" onClick={() => setShowVacancyForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nueva Vacante
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-3 sm:px-6 sm:py-4">
        <div className="max-w-full mx-auto w-full">
          {loadingVacancies ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredVacancies.length === 0 ? (
            <div className="text-center py-32 bg-background rounded-[3rem] border-2 border-dashed border-border ">
               <Briefcase className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
               <p className="text-xl font-black uppercase tracking-[0.2em] text-muted-foreground/40">Sin vacantes registradas</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <MobileCardList
                className="md:hidden"
                items={vacancyItems}
                emptyMessage="No hay vacantes"
              />

              {/* Desktop Table View */}
              <div className="hidden overflow-hidden rounded-2xl border border-foreground/20 bg-background shadow-md md:block">
                <Table className="w-full table-fixed">
                  <TableHeader className="[&_th]:h-10 [&_th]:px-2 [&_th]:text-[9px] [&_th]:tracking-[0.18em]">
                    <TableRow className="border-b border-foreground/20 bg-muted/30 hover:bg-muted/30">
                      <TableHead className="h-10 w-[30%] px-3 text-[9px] font-black uppercase tracking-[0.18em]">Vacante</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[18%]">Ubicación</TableHead>
                      <TableHead className="h-10 w-[15%] px-2 text-[9px] font-black uppercase tracking-[0.18em]">Candidatos</TableHead>
                      <TableHead className="h-10 w-[12%] px-2 text-[9px] font-black uppercase tracking-[0.18em]">Apertura</TableHead>
                      <TableHead className="h-10 w-[12%] px-2 text-[9px] font-black uppercase tracking-[0.18em]">Estado</TableHead>
                      <TableHead className="h-10 w-[13%] px-3 text-right text-[9px] font-black uppercase tracking-[0.18em]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVacancies.map((vacancy) => {
                      const status = vacancy.status as VacancyStatus;
                      const statusStyle = vacancyStatusConfig[status];
                      const candidateCount = (vacancy as any).candidates?.length || 0;
                      const centerName = (vacancy as any).operation_centers?.name || 'General';

                      return (
                        <TableRow
                          key={vacancy.id}
                          className="group cursor-pointer border-b border-foreground/15 transition-colors hover:bg-primary/[0.03]"
                          onClick={() => openVacancyDetail(vacancy.id)}
                        >
                          <TableCell className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary transition-transform duration-500 group-hover:scale-110">
                                <Briefcase className="h-[18px] w-[18px]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-0.5 truncate text-sm font-black leading-tight tracking-tight text-foreground">{vacancy.position_title}</p>
                                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {vacancy.department_area || 'Sin área'} • {vacancy.positions_count} {vacancy.positions_count > 1 ? 'Posiciones' : 'Posición'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-primary/60" />
                                <span className="text-[11px] font-black tracking-tight text-foreground/80 truncate">{centerName}</span>
                              </div>
                          </TableCell>
                          <TableCell className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">
                                {candidateCount}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Candidatos</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-2.5">
                            <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-foreground/80">
                                  {formatDateOnly(vacancy.open_date, 'dd MMM yyyy', { locale: es })}
                               </span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Fecha Apertura</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn('inline-flex h-6 min-w-[5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border-border px-2.5 text-[8px] font-black uppercase tracking-wide shadow-sm', statusStyle.bg, statusStyle.text, statusStyle.border)}
                            >
                              {vacancyStatusLabels[status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 transition-all duration-300" onClick={e => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg text-primary shadow-sm transition-all hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCandidateFormVacancyId(vacancy.id);
                                  setShowCandidateForm(true);
                                }}
                                disabled={vacancy.status !== 'in_process'}
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg bg-background transition-all hover:bg-foreground hover:text-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVacancyDetail(vacancy.id);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <VacancyFormDialog open={showVacancyForm} onOpenChange={setShowVacancyForm} />
      {selectedVacancyId && <VacancyDetailDialog open={showVacancyDetail} onOpenChange={setShowVacancyDetail} vacancyId={selectedVacancyId} />}
      <CandidateFormDialog open={showCandidateForm} onOpenChange={(open) => { setShowCandidateForm(open); if (!open) { setTimeout(() => setCandidateFormVacancyId(null), 200); } }} vacancyId={candidateFormVacancyId || undefined} />
      {selectedCandidateId && <CandidateDetailDialog open={showCandidateDetail} onOpenChange={setShowCandidateDetail} candidateId={selectedCandidateId} />}
    </div>
  );
}


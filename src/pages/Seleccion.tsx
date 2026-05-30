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
      <div className="relative shrink-0 overflow-hidden px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-md shadow-primary/10 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Gestión de Talento
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Selección y Reclutamiento</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Administración de vacantes, evaluación de candidatos y seguimiento de procesos de contratación.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-md hover:border-border transition-all duration-500">
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar vacantes por cargo o área..."
              className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-md">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los estados</SelectItem>
                <SelectItem value="open" className="font-bold text-xs uppercase p-3 text-emerald-600">Abierta</SelectItem>
                <SelectItem value="in_process" className="font-bold text-xs uppercase p-3 text-amber-600">En Proceso</SelectItem>
                <SelectItem value="closed" className="font-bold text-xs uppercase p-3 text-blue-600">Cerrada</SelectItem>
                <SelectItem value="cancelled" className="font-bold text-xs uppercase p-3 text-destructive">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Centro" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-md">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los centros</SelectItem>
                {operationCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id} className="font-bold text-xs uppercase p-3">
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canCreateVacancy && (
          <Button className="h-12 w-full lg:w-auto px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-md shadow-primary/10" onClick={() => setShowVacancyForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Vacante
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        <div className="max-w-full mx-auto w-full">
          {loadingVacancies ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />
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
              <div className="hidden md:block rounded-[2.5rem] border border-border shadow-md bg-background ">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-background border-b border-border hover:bg-background">
                      <TableHead className="px-4 h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[30%]">Vacante</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[18%]">Ubicación</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[15%]">Candidatos</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[12%]">Apertura</TableHead>
                      <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] w-[12%]">Estado</TableHead>
                      <TableHead className="px-4 h-16 text-right font-black text-[10px] uppercase tracking-[0.2em] w-[13%]">Acciones</TableHead>
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
                          className="group border-b border-border hover:bg-primary/[0.02] transition-colors cursor-pointer"
                          onClick={() => openVacancyDetail(vacancy.id)}
                        >
                          <TableCell className="px-4 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shrink-0">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-black tracking-tight text-foreground text-sm leading-none mb-1 truncate">{vacancy.position_title}</p>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                  {vacancy.department_area || 'Sin área'} • {vacancy.positions_count} {vacancy.positions_count > 1 ? 'Posiciones' : 'Posición'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-primary/60" />
                                <span className="text-[11px] font-black tracking-tight text-foreground/80 truncate">{centerName}</span>
                              </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs">
                                {candidateCount}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Candidatos</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-foreground/80">
                                  {formatDateOnly(vacancy.open_date, 'dd MMM yyyy', { locale: es })}
                               </span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Fecha Apertura</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border shadow-sm', statusStyle.bg, statusStyle.text, statusStyle.border)}
                            >
                              {vacancyStatusLabels[status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 text-right">
                            <div className="flex items-center justify-end gap-2 transition-all duration-300" onClick={e => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-xl hover:bg-primary text-primary hover:text-primary-foreground shadow-sm transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCandidateFormVacancyId(vacancy.id);
                                  setShowCandidateForm(true);
                                }}
                                disabled={vacancy.status !== 'in_process'}
                              >
                                <UserPlus className="w-5 h-5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-xl bg-background hover:bg-foreground hover:text-background transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVacancyDetail(vacancy.id);
                                }}
                              >
                                <Eye className="w-5 h-5" />
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


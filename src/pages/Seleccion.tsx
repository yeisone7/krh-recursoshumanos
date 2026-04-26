import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { MobileCardList } from '@/components/shared/MobileCardList';
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
          <Badge variant="outline" className={cn('max-w-full truncate', statusStyle.bg, statusStyle.text, statusStyle.border)}>
            {vacancyStatusLabels[status]}
          </Badge>
        ),
        fields: [
          { label: 'Centro', value: centerName },
          { label: 'Candidatos', value: candidateCount },
          { label: 'Apertura', value: format(new Date(vacancy.open_date), 'dd MMM yyyy', { locale: es }) },
        ],
        onClick: () => openVacancyDetail(vacancy.id),
        actions: (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 bg-info/10 hover:bg-info/20 text-info"
              onClick={(e) => {
                e.stopPropagation();
                setCandidateFormVacancyId(vacancy.id);
                setShowCandidateForm(true);
              }}
              disabled={vacancy.status !== 'in_process'}
              aria-label={`Agregar candidato a vacante ${vacancy.position_title}`}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 bg-indigo-light hover:bg-indigo/20 text-indigo"
              onClick={(e) => {
                e.stopPropagation();
                openVacancyDetail(vacancy.id);
              }}
              aria-label={`Ver detalle de vacante ${vacancy.position_title}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </>
        ),
      };
    }),
    [filteredVacancies]
  );

  const openVacancyDetail = (vacancyId: string) => {
    setSelectedVacancyId(vacancyId);
    setShowVacancyDetail(true);
  };

  const openCandidateDetail = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setShowCandidateDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Selección y Reclutamiento
          </h1>
          <p className="text-muted-foreground">
            Gestiona vacantes y el proceso de selección
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowVacancyForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Vacante
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openVacancies}</p>
                <p className="text-xs text-muted-foreground">Vacantes Abiertas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProcessVacancies}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-light">
                <Users className="w-5 h-5 text-violet" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
                <p className="text-xs text-muted-foreground">Total Candidatos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProcessCandidates}</p>
                <p className="text-xs text-muted-foreground">En Evaluación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-light">
                <CheckCircle className="w-5 h-5 text-indigo" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.selectedCandidates}</p>
                <p className="text-xs text-muted-foreground">Seleccionados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hiredCandidates}</p>
                <p className="text-xs text-muted-foreground">Contratados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Vacantes
              </h2>

              {/* Filters */}
              <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
                <div className="relative col-span-2 flex-1 sm:col-span-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar vacantes..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-w-0 w-full sm:w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Abierta</SelectItem>
                    <SelectItem value="in_process">En Proceso</SelectItem>
                    <SelectItem value="closed">Cerrada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={centerFilter} onValueChange={setCenterFilter}>
                  <SelectTrigger className="min-w-0 w-full sm:w-[180px]">
                    <SelectValue placeholder="Centro" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todos los centros</SelectItem>
                    {operationCenters.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              {loadingVacancies ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredVacancies.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No hay vacantes</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No se encontraron vacantes con esos filtros.'
                      : 'Crea tu primera vacante para comenzar.'}
                  </p>
                  <Button onClick={() => setShowVacancyForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Vacante
                  </Button>
                </div>
              ) : (
                <>
                <MobileCardList
                  className="md:hidden"
                  items={vacancyItems}
                  emptyMessage="No hay vacantes"
                />
                <div className="hidden rounded-md border md:block md:overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vacante</TableHead>
                        <TableHead>Centro</TableHead>
                        <TableHead>Candidatos</TableHead>
                        <TableHead>Fecha Apertura</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
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
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openVacancyDetail(vacancy.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Briefcase className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{vacancy.position_title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {vacancy.department_area || 'Sin área'} • {vacancy.positions_count} posicion{vacancy.positions_count > 1 ? 'es' : ''}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-secondary-light flex items-center justify-center">
                                  <Building2 className="w-3.5 h-3.5 text-secondary" />
                                </div>
                                <span className="text-sm">{centerName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-violet-light flex items-center justify-center">
                                  <Users className="w-3.5 h-3.5 text-violet" />
                                </div>
                                <span className="font-medium">{candidateCount}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-tertiary/10 flex items-center justify-center">
                                  <Calendar className="w-3.5 h-3.5 text-tertiary" />
                                </div>
                                <span className="text-sm">
                                  {format(new Date(vacancy.open_date), 'dd MMM yyyy', { locale: es })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(statusStyle.bg, statusStyle.text, statusStyle.border)}
                              >
                                {vacancyStatusLabels[status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" role="group" aria-label="Acciones de vacante">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-info/10 hover:bg-info/20 text-info"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCandidateFormVacancyId(vacancy.id);
                                    setShowCandidateForm(true);
                                  }}
                                  disabled={vacancy.status !== 'in_process'}
                                  title={vacancy.status !== 'in_process' ? 'Solo se pueden agregar candidatos cuando la vacante está En Proceso' : undefined}
                                  aria-label={`Agregar candidato a vacante ${vacancy.position_title}`}
                                  data-testid={`add-candidate-${vacancy.id}`}
                                >
                                  <UserPlus className="w-4 h-4" />
                                  <span className="sr-only">Nuevo Candidato</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-indigo-light hover:bg-indigo/20 text-indigo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVacancyDetail(vacancy.id);
                                  }}
                                  aria-label={`Ver detalle de vacante ${vacancy.position_title}`}
                                  data-testid={`view-vacancy-${vacancy.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                  <span className="sr-only">Ver Detalle</span>
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
          </CardHeader>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <VacancyFormDialog
        open={showVacancyForm}
        onOpenChange={setShowVacancyForm}
      />
      
      {selectedVacancyId && (
        <VacancyDetailDialog
          open={showVacancyDetail}
          onOpenChange={setShowVacancyDetail}
          vacancyId={selectedVacancyId}
        />
      )}

      <CandidateFormDialog
        open={showCandidateForm}
        onOpenChange={(open) => {
          setShowCandidateForm(open);
          if (!open) {
            // Delay clearing vacancyId to avoid unmount during Dialog close animation
            setTimeout(() => setCandidateFormVacancyId(null), 200);
          }
        }}
        vacancyId={candidateFormVacancyId || undefined}
      />

      {selectedCandidateId && (
        <CandidateDetailDialog
          open={showCandidateDetail}
          onOpenChange={setShowCandidateDetail}
          candidateId={selectedCandidateId}
        />
      )}
    </div>
  );
}

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
  Filter,
  Eye,
  TrendingUp,
  Calendar,
  Building2,
  UserPlus,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { useVacancies } from '@/hooks/useVacancies';
import { useCandidates } from '@/hooks/useCandidates';
import { useOperationCenters } from '@/hooks/useCompanies';
import { VacancyFormDialog } from '@/components/vacancies/VacancyFormDialog';
import { VacancyDetailDialog } from '@/components/vacancies/VacancyDetailDialog';
import { CandidateFormDialog } from '@/components/vacancies/CandidateFormDialog';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import {
  VacancyStatus,
  vacancyStatusLabels,
  vacancyStatusConfig,
  CandidateStatus,
  candidateStatusLabels,
  candidateStatusConfig,
} from '@/types/vacancy';

export default function Seleccion() {
  const [activeView, setActiveView] = useState<'vacancies' | 'candidates'>('vacancies');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  
  // Dialogs
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [showVacancyDetail, setShowVacancyDetail] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const { data: vacancies = [], isLoading: loadingVacancies } = useVacancies();
  const { data: candidates = [], isLoading: loadingCandidates } = useCandidates();
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

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        candidate.document_number.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchQuery, statusFilter]);

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
            Gestiona vacantes, candidatos y el proceso de selección
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCandidateForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Candidato
          </Button>
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
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
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

        <Card>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
                <p className="text-xs text-muted-foreground">Total Candidatos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.selectedCandidates}</p>
                <p className="text-xs text-muted-foreground">Seleccionados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserPlus className="w-5 h-5 text-success" />
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
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'vacancies' | 'candidates')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="vacancies" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    Vacantes
                  </TabsTrigger>
                  <TabsTrigger value="candidates" className="gap-2">
                    <Users className="w-4 h-4" />
                    Candidatos
                  </TabsTrigger>
                </TabsList>

                {/* Filters */}
                <div className="flex gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={activeView === 'vacancies' ? 'Buscar vacantes...' : 'Buscar candidatos...'}
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="all">Todos</SelectItem>
                      {activeView === 'vacancies' ? (
                        <>
                          <SelectItem value="open">Abierta</SelectItem>
                          <SelectItem value="in_process">En Proceso</SelectItem>
                          <SelectItem value="closed">Cerrada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="applied">Postulado</SelectItem>
                          <SelectItem value="in_interview">En Entrevista</SelectItem>
                          <SelectItem value="in_psycho_test">Prueba Psico</SelectItem>
                          <SelectItem value="in_validation">En Validación</SelectItem>
                          <SelectItem value="selected">Seleccionado</SelectItem>
                          <SelectItem value="not_selected">No Seleccionado</SelectItem>
                          <SelectItem value="hired">Contratado</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {activeView === 'vacancies' && (
                    <Select value={centerFilter} onValueChange={setCenterFilter}>
                      <SelectTrigger className="w-[180px]">
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
                  )}
                </div>
              </div>

              {/* Vacancies Tab */}
              <TabsContent value="vacancies" className="mt-4">
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
                  <div className="rounded-md border">
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
                                <div>
                                  <p className="font-medium">{vacancy.position_title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {vacancy.department_area || 'Sin área'} • {vacancy.positions_count} posicion{vacancy.positions_count > 1 ? 'es' : ''}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">{centerName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{candidateCount}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVacancyDetail(vacancy.id);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="mt-4">
                {loadingCandidates ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay candidatos</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== 'all'
                        ? 'No se encontraron candidatos con esos filtros.'
                        : 'Registra tu primer candidato para comenzar.'}
                    </p>
                    <Button onClick={() => setShowCandidateForm(true)} className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Nuevo Candidato
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidato</TableHead>
                          <TableHead>Vacante</TableHead>
                          <TableHead>Fecha Postulación</TableHead>
                          <TableHead>Etapa Actual</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCandidates.map((candidate) => {
                          const status = candidate.status as CandidateStatus;
                          const statusStyle = candidateStatusConfig[status];
                          const vacancy = (candidate as any).vacancies;
                          const stepsCount = (candidate as any).selection_steps?.length || 0;
                          const passedSteps = (candidate as any).selection_steps?.filter(
                            (s: any) => s.status === 'passed'
                          ).length || 0;

                          return (
                            <TableRow
                              key={candidate.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openCandidateDetail(candidate.id)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="font-medium text-primary text-sm">
                                      {candidate.first_name[0]}{candidate.last_name[0]}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {candidate.first_name} {candidate.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {candidate.document_type} {candidate.document_number}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{vacancy?.position_title || '-'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {vacancy?.operation_centers?.name || 'General'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {format(new Date(candidate.application_date), 'dd MMM yyyy', { locale: es })}
                                </span>
                              </TableCell>
                              <TableCell>
                                {stepsCount > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${(passedSteps / stepsCount) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {passedSteps}/{stepsCount}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin etapas</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn('text-xs', statusStyle.bg, statusStyle.text)}>
                                  {candidateStatusLabels[status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCandidateDetail(candidate.id);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
        onOpenChange={setShowCandidateForm}
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

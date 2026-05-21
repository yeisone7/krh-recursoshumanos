import { useState, useEffect } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  HeartPulse,
  History,
  IdCard,
  Loader2,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  UserRound,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { cn } from '@/lib/utils';
import {
  Employee360Header,
  Employee360KPIs,
  Employee360Alerts,
  Employee360ExecutiveSummary,
  Employee360DataQuality,
  Tab360Profile,
  Tab360Labor,
  Tab360Contracts,
  Tab360TimeOff,
  Tab360Incapacities,
  Tab360Training,
  Tab360Evaluations,
  Tab360Health,
  Tab360Dotation,
  Tab360Overtime,
  Tab360Disciplinary,
  Tab360Documents,
  Tab360Schedules,
  Tab360Audit,
  Tab360Timeline,
} from '@/components/employee360';

const navSections = [
  {
    title: 'Expediente',
    items: [
      { value: 'profile', label: 'Perfil', icon: UserRound },
      { value: 'labor', label: 'Laboral', icon: IdCard },
      { value: 'contracts', label: 'Contratos', icon: BriefcaseBusiness },
      { value: 'timeline', label: 'Linea de Tiempo', icon: History },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { value: 'timeoff', label: 'Tiempo Libre', icon: CalendarDays },
      { value: 'incapacities', label: 'Incapacidades', icon: HeartPulse },
      { value: 'training', label: 'Capacitacion', icon: GraduationCap },
      { value: 'evaluations', label: 'Evaluaciones', icon: ClipboardList },
      { value: 'health', label: 'Salud', icon: ShieldCheck },
      { value: 'dotation', label: 'Dotacion', icon: Shirt },
      { value: 'overtime', label: 'Horas Extra', icon: Clock },
    ],
  },
  {
    title: 'Control',
    items: [
      { value: 'disciplinary', label: 'Disciplinarios', icon: ShieldAlert },
      { value: 'schedules', label: 'Horarios', icon: Activity },
      { value: 'documents', label: 'Documentos', icon: FileText },
      { value: 'audit', label: 'Auditoria', icon: ScrollText },
    ],
  },
];

const flatNavItems = navSections.flatMap((section) => section.items);

export default function Empleado360() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'profile');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const data = useEmployee360(id, activeTab);

  if (!id) {
    return <Navigate to="/empleados" replace />;
  }

  if (data.isLoadingEmployee) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.employee) {
    return <Navigate to="/empleados" replace />;
  }

  const activeNavLabel = flatNavItems.find((item) => item.value === activeTab)?.label || 'Expediente';
  const qualityScore = data.dataQuality?.score ?? 0;
  const qualityIssues = data.dataQuality?.issues.length ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Employee360Header employee={data.employee} />

      <Employee360KPIs kpis={data.kpis} isLoading={data.isLoadingEmployee} />

      <Employee360ExecutiveSummary
        employee={data.employee}
        contracts={data.summaryContracts}
        latestTermination={data.latestTermination}
        dataQuality={data.dataQuality}
        isLoading={data.isLoadingExecutiveSummary}
      />

      <Employee360Alerts employeeId={id} />

      <Employee360DataQuality dataQuality={data.dataQuality} isLoading={data.isLoadingDataQuality} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="-mx-3 overflow-x-auto px-3 pb-1 lg:hidden">
          <TabsList className="inline-flex h-auto w-max flex-nowrap justify-start gap-1.5 rounded-lg border bg-card p-2 shadow-sm">
            {flatNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="shrink-0 rounded-md bg-background/60 px-3 py-2 text-xs font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-background"
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Consulta 360</p>
                  <h2 className="text-lg font-semibold text-foreground">{activeNavLabel}</h2>
                </div>

                <TabsList className="flex h-auto w-full flex-col items-stretch gap-4 bg-transparent p-0">
                  {navSections.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {section.title}
                      </p>
                      {section.items.map((item) => {
                        const Icon = item.icon;

                        return (
                          <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className={cn(
                              'h-10 w-full justify-start gap-2 rounded-lg px-3 text-sm font-medium transition-all',
                              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                              'data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background data-[state=inactive]:hover:text-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </TabsTrigger>
                        );
                      })}
                    </div>
                  ))}
                </TabsList>
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expediente</p>
                    <p className="font-semibold text-foreground">Completitud</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      qualityScore >= 80
                        ? 'border-success/20 bg-success-light text-success'
                        : 'border-warning/20 bg-warning/10 text-warning'
                    )}
                  >
                    {qualityScore}%
                  </Badge>
                </div>
                <Progress value={qualityScore} className="h-2" />
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-background p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs text-muted-foreground">
                    {qualityIssues
                      ? `${qualityIssues} dato(s) por revisar en el expediente.`
                      : 'El expediente no tiene alertas de completitud.'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            <TabsContent value="profile" className="m-0">
              <Tab360Profile employee={data.employee} />
            </TabsContent>
            <TabsContent value="labor" className="m-0">
              <Tab360Labor employee={data.employee} />
            </TabsContent>
            <TabsContent value="contracts" className="m-0">
              <Tab360Contracts
                contracts={data.contracts}
                terminations={data.terminations}
                isLoading={data.isLoadingContracts || data.isLoadingTerminations}
              />
            </TabsContent>
            <TabsContent value="timeline" className="m-0">
              <Tab360Timeline events={data.timeline} isLoading={data.isLoadingTimeline} />
            </TabsContent>
            <TabsContent value="timeoff" className="m-0">
              <Tab360TimeOff
                vacations={data.vacations}
                leaves={data.leaves}
                isLoadingVacations={data.isLoadingVacations}
                isLoadingLeaves={data.isLoadingLeaves}
              />
            </TabsContent>
            <TabsContent value="incapacities" className="m-0">
              <Tab360Incapacities incapacities={data.incapacities} isLoading={data.isLoadingIncapacities} />
            </TabsContent>
            <TabsContent value="training" className="m-0">
              <Tab360Training training={data.training} isLoading={data.isLoadingTraining} />
            </TabsContent>
            <TabsContent value="evaluations" className="m-0">
              <Tab360Evaluations evaluations={data.evaluations} isLoading={data.isLoadingEvaluations} />
            </TabsContent>
            <TabsContent value="health" className="m-0">
              <Tab360Health employee={data.employee} exams={data.exams} isLoading={data.isLoadingExams} />
            </TabsContent>
            <TabsContent value="dotation" className="m-0">
              <Tab360Dotation dotation={data.dotation} isLoading={data.isLoadingDotation} />
            </TabsContent>
            <TabsContent value="overtime" className="m-0">
              <Tab360Overtime overtime={data.overtime} isLoading={data.isLoadingOvertime} />
            </TabsContent>
            <TabsContent value="disciplinary" className="m-0">
              <Tab360Disciplinary disciplinary={data.disciplinary} isLoading={data.isLoadingDisciplinary} />
            </TabsContent>
            <TabsContent value="schedules" className="m-0">
              <Tab360Schedules timeConfigs={data.timeConfigs} isLoading={data.isLoadingTimeConfigs} />
            </TabsContent>
            <TabsContent value="documents" className="m-0">
              <Tab360Documents employee={data.employee} />
            </TabsContent>
            <TabsContent value="audit" className="m-0">
              <Tab360Audit auditLogs={data.auditLogs} isLoading={data.isLoadingAudit} />
            </TabsContent>
          </main>
        </div>
      </Tabs>
    </div>
  );
}

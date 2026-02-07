import { useState, useEffect } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useEmployee360 } from '@/hooks/useEmployee360';
import {
  Employee360Header,
  Employee360KPIs,
  Employee360Alerts,
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
} from '@/components/employee360';

export default function Empleado360() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'profile');

  // Sync tab with URL parameter
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
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.employee) {
    return <Navigate to="/empleados" replace />;
  }

  return (
    <div className="space-y-6">
      <Employee360Header employee={data.employee} />
      
      {/* KPIs - Full width row */}
      <Employee360KPIs kpis={data.kpis} isLoading={data.isLoadingEmployee} />
      
      {/* Alerts - Separate row below KPIs */}
      <Employee360Alerts employeeId={id} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card shadow-sm">
          <TabsList className="inline-flex w-max gap-1 bg-transparent p-1.5 pb-3">
            <TabsTrigger value="profile" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Perfil
            </TabsTrigger>
            <TabsTrigger value="labor" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Laboral
            </TabsTrigger>
            <TabsTrigger value="contracts" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Contratos
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Tiempo Libre
            </TabsTrigger>
            <TabsTrigger value="incapacities" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Incapacidades
            </TabsTrigger>
            <TabsTrigger value="training" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Capacitación
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="health" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Salud
            </TabsTrigger>
            <TabsTrigger value="dotation" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Dotación
            </TabsTrigger>
            <TabsTrigger value="overtime" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Horas Extra
            </TabsTrigger>
            <TabsTrigger value="disciplinary" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Disciplinarios
            </TabsTrigger>
            <TabsTrigger value="schedules" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Horarios
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Documentos
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted">
              Auditoría
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-6">
          <TabsContent value="profile" className="m-0">
            <Tab360Profile employee={data.employee} />
          </TabsContent>
          <TabsContent value="labor" className="m-0">
            <Tab360Labor employee={data.employee} />
          </TabsContent>
          <TabsContent value="contracts" className="m-0">
            <Tab360Contracts contracts={data.contracts} isLoading={data.isLoadingContracts} />
          </TabsContent>
          <TabsContent value="timeoff" className="m-0">
            <Tab360TimeOff vacations={data.vacations} leaves={data.leaves} isLoadingVacations={data.isLoadingVacations} isLoadingLeaves={data.isLoadingLeaves} />
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
        </div>
      </Tabs>
    </div>
  );
}

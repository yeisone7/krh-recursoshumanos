import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useEmployee360 } from '@/hooks/useEmployee360';
import {
  Employee360Header,
  Employee360KPIs,
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
  Tab360Audit,
} from '@/components/employee360';

export default function Empleado360() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('profile');

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
      
      <Employee360KPIs kpis={data.kpis} isLoading={data.isLoadingEmployee} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="labor">Laboral</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="timeoff">Tiempo Libre</TabsTrigger>
            <TabsTrigger value="incapacities">Incapacidades</TabsTrigger>
            <TabsTrigger value="training">Capacitación</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
            <TabsTrigger value="health">Salud</TabsTrigger>
            <TabsTrigger value="dotation">Dotación</TabsTrigger>
            <TabsTrigger value="overtime">Horas Extra</TabsTrigger>
            <TabsTrigger value="disciplinary">Disciplinarios</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="audit">Auditoría</TabsTrigger>
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

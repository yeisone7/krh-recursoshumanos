import { FileBarChart, Users, FileText, Palmtree, Clock, GraduationCap, Scale, Stethoscope, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmployeeReport,
  IncapacityReport,
  CesantiasReport,
  DotationReport,
  ContractExtensionsReport,
  ContractsExpiringSoonReport,
  InventoryMovementsReport,
  VacationReport,
  LeavesReport,
  OvertimeReport,
  TrainingReport,
  DisciplinaryReport,
  MedicalExamsReport,
} from '@/components/reports';

const TABS = [
  { value: 'personal', label: 'Personal', icon: Users },
  { value: 'contratos', label: 'Contratos', icon: FileText },
  { value: 'ausencias', label: 'Ausencias', icon: Palmtree },
  { value: 'nomina', label: 'Nómina', icon: Clock },
  { value: 'desarrollo', label: 'Desarrollo', icon: GraduationCap },
  { value: 'dotacion', label: 'Dotación', icon: Package },
] as const;

export default function Reportes() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileBarChart className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground">
            Genera y exporta reportes en Excel y PDF por categoría
          </p>
        </div>
      </div>

      {/* Categorized Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Personal */}
        <TabsContent value="personal">
          <div className="grid gap-6 md:grid-cols-2">
            <EmployeeReport />
            <MedicalExamsReport />
          </div>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contratos">
          <div className="grid gap-6 md:grid-cols-2">
            <ContractsExpiringSoonReport />
            <ContractExtensionsReport />
          </div>
        </TabsContent>

        {/* Ausencias */}
        <TabsContent value="ausencias">
          <div className="grid gap-6 md:grid-cols-2">
            <VacationReport />
            <LeavesReport />
            <IncapacityReport />
          </div>
        </TabsContent>

        {/* Nómina */}
        <TabsContent value="nomina">
          <div className="grid gap-6 md:grid-cols-2">
            <OvertimeReport />
            <CesantiasReport />
          </div>
        </TabsContent>

        {/* Desarrollo */}
        <TabsContent value="desarrollo">
          <div className="grid gap-6 md:grid-cols-2">
            <TrainingReport />
            <DisciplinaryReport />
          </div>
        </TabsContent>

        {/* Dotación */}
        <TabsContent value="dotacion">
          <div className="grid gap-6 md:grid-cols-2">
            <DotationReport />
            <InventoryMovementsReport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

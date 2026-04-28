import { FileBarChart, Users, FileText, Palmtree, Clock, GraduationCap, Scale, Stethoscope, Package, ClipboardCheck, Users2, Landmark } from 'lucide-react';
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
  SelectionProcessReport,
  SelectionDiversityReport,
  LoansReport,
  DeductionsReport,
} from '@/components/reports';

const TABS = [
  { value: 'personal', label: 'Personal', icon: Users },
  { value: 'seleccion', label: 'Selección', icon: ClipboardCheck },
  { value: 'contratos', label: 'Contratos', icon: FileText },
  { value: 'ausencias', label: 'Ausencias', icon: Palmtree },
  { value: 'nomina', label: 'Nómina', icon: Clock },
  { value: 'desarrollo', label: 'Desarrollo', icon: GraduationCap },
  { value: 'dotacion', label: 'Dotación', icon: Package },
] as const;

export default function Reportes() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
          <FileBarChart className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Reportes</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Genera y exporta reportes en Excel y PDF por categoría
          </p>
        </div>
      </div>

      {/* Categorized Tabs */}
      <Tabs defaultValue="personal" className="w-full min-w-0">
        <div className="min-w-0 overflow-hidden">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:grid-cols-3 lg:grid-cols-7">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-w-0 justify-start gap-1.5 px-2 text-xs sm:px-3 sm:text-sm data-[state=active]:bg-background"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        </div>

        {/* Personal */}
        <TabsContent value="personal">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <EmployeeReport />
            <MedicalExamsReport />
          </div>
        </TabsContent>

        {/* Selección */}
        <TabsContent value="seleccion">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <SelectionProcessReport />
            <SelectionDiversityReport />
          </div>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contratos">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <ContractsExpiringSoonReport />
            <ContractExtensionsReport />
          </div>
        </TabsContent>

        {/* Ausencias */}
        <TabsContent value="ausencias">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <VacationReport />
            <LeavesReport />
            <IncapacityReport />
          </div>
        </TabsContent>

        {/* Nómina */}
        <TabsContent value="nomina">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <OvertimeReport />
            <CesantiasReport />
            <LoansReport />
            <DeductionsReport />
          </div>
        </TabsContent>

        {/* Desarrollo */}
        <TabsContent value="desarrollo">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <TrainingReport />
            <DisciplinaryReport />
          </div>
        </TabsContent>

        {/* Dotación */}
        <TabsContent value="dotacion">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <DotationReport />
            <InventoryMovementsReport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

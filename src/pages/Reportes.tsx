import { FileBarChart, Users, FileText, Palmtree, Clock, GraduationCap, Package, ClipboardCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmployeeReport,
  GeneralEmployeeReport,
  EmployeeInformationCompletionReport,
  EmployeeManagementReport,
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
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileBarChart className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-primary">Información para decidir</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Centro de reportes</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Consulta, personaliza y exporta la información de tu equipo.
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground lg:inline-flex">
          <FileBarChart className="h-4 w-4 text-primary" aria-hidden="true" />
          Exportación en Excel y PDF
        </span>
      </header>

      <Tabs defaultValue="personal" className="w-full min-w-0">
        <div className="sticky top-0 z-20 mb-5 overflow-x-auto border-b border-border bg-background pt-1 [scrollbar-width:thin]">
          <TabsList aria-label="Categorías de reportes" className="flex h-auto w-max min-w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="relative gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:bg-primary/5 hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Personal */}
        <TabsContent value="personal">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <GeneralEmployeeReport />
            <EmployeeManagementReport />
            <EmployeeReport />
            <EmployeeInformationCompletionReport />
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

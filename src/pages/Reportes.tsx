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
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 sm:p-10 border border-border shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/20">
            <FileBarChart className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase">
              Centro de <span className="text-primary">Reportes</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
              Analítica y exportación de datos en tiempo real. Genera reportes inteligentes en Excel y PDF estructurados por categoría.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        
        
      </div>

      {/* Categorized Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background ">
          <TabsList className="flex h-auto w-fit gap-2 bg-background p-1.5 rounded-[1.5rem] border border-border/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-2xl px-6 py-2.5 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm transition-all whitespace-nowrap"
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
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

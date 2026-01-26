import { FileBarChart } from 'lucide-react';
import {
  EmployeeReport,
  IncapacityReport,
  CesantiasReport,
  DotationReport,
  ContractExtensionsReport,
  ContractsExpiringSoonReport,
} from '@/components/reports';

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
            Genera y exporta reportes en Excel y PDF
          </p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <EmployeeReport />
        <ContractsExpiringSoonReport />
        <ContractExtensionsReport />
        <IncapacityReport />
        <CesantiasReport />
        <DotationReport />
      </div>
    </div>
  );
}

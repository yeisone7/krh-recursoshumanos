import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download, Loader2 } from 'lucide-react';
import { generateLaborCertificatePdf } from '@/lib/laborCertificatePdfGenerator';
import type { EmployeeV2WithRelations } from '@/types/employee';

interface PortalCertificatesProps {
  employee: EmployeeV2WithRelations;
  companyName: string;
  companyNit: string;
}

export function PortalCertificates({ employee, companyName, companyNit }: PortalCertificatesProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateLaborCertificatePdf({
        employeeName: `${employee.first_name} ${employee.middle_name || ''} ${employee.last_name} ${employee.second_last_name || ''}`.replace(/\s+/g, ' ').trim(),
        documentType: employee.document_type || 'CC',
        documentNumber: employee.document_number || '',
        position: employee.positions?.name || employee.work_info?.position_name || 'N/A',
        hireDate: employee.work_info?.hire_date || '',
        salary: employee.work_info?.salary || 0,
        contractType: employee.work_info?.contract_type || 'Término indefinido',
        companyName,
        companyNit,
        isActive: employee.is_active !== false,
        terminationDate: employee.work_info?.termination_date || undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certificados Laborales
        </CardTitle>
        <CardDescription>Genera tu certificado laboral al instante</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Certificado Laboral</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Documento oficial que certifica tu vinculación laboral con {companyName}.
              Incluye cargo, fecha de ingreso y salario.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generar y Descargar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

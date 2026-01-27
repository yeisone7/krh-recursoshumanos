import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download, Loader2, FileDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import { supabase } from '@/integrations/supabase/client';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useCompany } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { documentTypeLabels } from '@/types/employee';
import {
  generateContractFromTemplate,
  generateBasicContractPDF,
  downloadDocument,
  downloadPDF,
  ContractDocumentData,
  calculateMonthsDifference,
} from '@/lib/contractDocumentGenerator';

interface ContractData {
  id: string;
  employee_id: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  salary_type: string | null;
  transport_allowance: number | null;
  trial_period_days: number | null;
  work_city: string | null;
  work_address: string | null;
  has_non_compete_clause: boolean | null;
  has_confidentiality_clause: boolean | null;
  special_clauses: string | null;
  employees: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    second_last_name?: string | null;
    document_number: string;
    document_type?: string;
    operation_centers?: { name: string } | null;
  };
}

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractData | null;
}

// Helper function to get full name from employee data
function getEmployeeName(emp: ContractData['employees']): string {
  return [emp.first_name, emp.middle_name, emp.last_name, emp.second_last_name]
    .filter(Boolean)
    .join(' ');
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  contract,
}: GenerateContractDialogProps) {
  const { currentCompanyId } = useAuth();
  const { data: company } = useCompany(currentCompanyId || undefined);
  const { data: contractTypes = [] } = useContractTypes();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationCity, setGenerationCity] = useState('Bogotá D.C.');

  // Fetch employee contact info
  const { data: employeeContact } = useQuery({
    queryKey: ['employee-contact', contract?.employee_id],
    queryFn: async () => {
      if (!contract?.employee_id) return null;
      const { data, error } = await supabase
        .from('employee_contact')
        .select('email, phone, mobile, residence_address, residence_city, residence_department')
        .eq('employee_id', contract.employee_id)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!contract?.employee_id,
  });

  // Fetch employee work info
  const { data: employeeWorkInfo } = useQuery({
    queryKey: ['employee-work-info', contract?.employee_id],
    queryFn: async () => {
      if (!contract?.employee_id) return null;
      const { data, error } = await supabase
        .from('employee_work_info')
        .select(`
          position_name,
          operation_center_id,
          operation_centers (name)
        `)
        .eq('employee_id', contract.employee_id)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!contract?.employee_id,
  });

  if (!contract) return null;

  const contractTypeConfig = contractTypes.find(
    ct => ct.contract_type === contract.contract_type
  );
  
  const hasTemplate = contractTypeConfig?.template_url && contractTypeConfig.template_url.length > 0;
  const employeeName = getEmployeeName(contract.employees);

  const handleGenerateWord = async () => {
    if (!hasTemplate) {
      toast.error('Este tipo de contrato no tiene plantilla configurada');
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      const documentData = prepareDocumentData();
      setProgress(30);

      const blob = await generateContractFromTemplate(
        contractTypeConfig!.template_url!,
        documentData
      );
      setProgress(80);

      const filename = `Contrato_${contract.contract_type}_${contract.employees.document_number}_${format(new Date(), 'yyyyMMdd')}.docx`;
      downloadDocument(blob, filename);
      setProgress(100);

      toast.success('Contrato generado exitosamente', {
        description: `El documento se ha descargado como ${filename}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setProgress(0);
      }, 500);
    } catch (error: any) {
      console.error('Error generating contract:', error);
      toast.error('Error al generar el contrato', {
        description: error.message || 'Por favor intente de nuevo',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setProgress(10);

    try {
      const documentData = prepareDocumentData();
      setProgress(50);

      const pdf = generateBasicContractPDF(documentData);
      setProgress(80);

      const filename = `Contrato_${contract.contract_type}_${contract.employees.document_number}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      downloadPDF(pdf, filename);
      setProgress(100);

      toast.success('Contrato PDF generado exitosamente', {
        description: `El documento se ha descargado como ${filename}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setProgress(0);
      }, 500);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF', {
        description: error.message || 'Por favor intente de nuevo',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const prepareDocumentData = (): ContractDocumentData => {
    const employee = contract.employees;
    const docType = employee.document_type as keyof typeof documentTypeLabels;

    // Calculate contract duration in months
    const startDate = new Date(contract.start_date + 'T00:00:00');
    const endDate = contract.end_date ? new Date(contract.end_date + 'T00:00:00') : null;
    const durationMonths = endDate ? calculateMonthsDifference(startDate, endDate) : undefined;

    // Get position and operation center from work info
    const position = employeeWorkInfo?.position_name || 'No especificado';
    const operationCenter = employeeWorkInfo?.operation_centers?.name || 
      contract.employees.operation_centers?.name || undefined;

    return {
      // Company
      companyName: company?.name || 'Empresa',
      companyNit: company?.nit || '',
      companyAddress: company?.address || undefined,
      companyPhone: company?.phone || undefined,
      companyEmail: company?.email || undefined,

      // Employee
      employeeFullName: employeeName,
      employeeFirstName: employee.first_name,
      employeeLastName: employee.last_name,
      employeeDocumentType: docType ? documentTypeLabels[docType] || 'C.C.' : 'C.C.',
      employeeDocumentNumber: employee.document_number,
      employeeAddress: employeeContact?.residence_address || undefined,
      employeeCity: employeeContact?.residence_city || undefined,
      employeePhone: employeeContact?.phone || employeeContact?.mobile || undefined,
      employeeEmail: employeeContact?.email || undefined,
      employeePosition: position,
      employeeOperationCenter: operationCenter,

      // Contract
      contractType: contract.contract_type,
      contractTypeDisplay: contractTypeConfig?.display_name || contract.contract_type,
      startDate: startDate,
      endDate: endDate,
      salary: contract.salary,
      salaryType: contract.salary_type || 'mensual',
      transportAllowance: (contract.transport_allowance || 0) > 0,
      transportAllowanceAmount: contract.transport_allowance || 0,
      trialPeriodDays: contract.trial_period_days || undefined,
      workCity: contract.work_city || undefined,
      workAddress: contract.work_address || undefined,
      contractDurationMonths: durationMonths,

      // Clauses
      hasNonCompeteClause: contract.has_non_compete_clause || false,
      hasConfidentialityClause: contract.has_confidentiality_clause || false,
      specialClauses: contract.special_clauses || undefined,

      // Generation
      generationDate: new Date(),
      generationCity: generationCity,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generar Documento de Contrato
          </DialogTitle>
          <DialogDescription>
            Genere el documento del contrato usando la plantilla configurada o en formato PDF básico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contract Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Empleado:</span>
                <p className="font-medium">{employeeName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Documento:</span>
                <p className="font-medium">{contract.employees.document_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo de Contrato:</span>
                <p className="font-medium">{contractTypeConfig?.display_name || contract.contract_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Inicio:</span>
                <p className="font-medium">{format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es })}</p>
              </div>
            </div>
          </div>

          {/* City Input */}
          <div className="space-y-2">
            <Label htmlFor="generationCity">Ciudad de Generación</Label>
            <Input
              id="generationCity"
              value={generationCity}
              onChange={(e) => setGenerationCity(e.target.value)}
              placeholder="Bogotá D.C."
            />
          </div>

          {/* Template Status */}
          {hasTemplate ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Este tipo de contrato tiene una plantilla configurada: <strong>{contractTypeConfig?.template_file_name}</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay plantilla configurada para este tipo de contrato. Solo se puede generar en formato PDF básico.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Generando documento... {progress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Generar PDF Básico
          </Button>
          <Button
            onClick={handleGenerateWord}
            disabled={isGenerating || !hasTemplate}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Generar Word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

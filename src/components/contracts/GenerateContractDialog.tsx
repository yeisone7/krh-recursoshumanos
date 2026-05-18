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
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { documentTypeLabels } from '@/types/employee';
import {
  generateContractFromTemplate,
  generateBasicContractPDF,
  downloadDocument,
  downloadPDF,
  generateHighFidelityPDFFromDocx,
  showContractPrintPreview,
  ContractDocumentData,
  calculateMonthsDifference,
} from '@/lib/contractDocumentGenerator';

interface ContractData {
  id: string;
  employee_id: string;
  contract_type: string;
  contract_number: string | null; // Consecutivo del contrato
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
  work_labor_description?: string | null; // Objeto/labor para contratos obra_labor
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
  const { data: systemConfig } = useSystemConfig();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationCity, setGenerationCity] = useState('Bucaramanga');

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

  // Fetch employee schedule info (for payroll type)
  const { data: employeeSchedule } = useQuery({
    queryKey: ['employee-schedule', contract?.employee_id],
    queryFn: async () => {
      if (!contract?.employee_id) return null;
      const { data, error } = await supabase
        .from('employee_schedule')
        .select('payroll_type')
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

  const sanitizeFilename = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
  };

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

      const typeLabel = contractTypeConfig?.display_name || contract.contract_type;
      const filename = `Contrato_${sanitizeFilename(typeLabel)}_${sanitizeFilename(contract.employees.document_number)}_${format(new Date(), 'yyyyMMdd')}.docx`;
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
      const typeLabel = contractTypeConfig?.display_name || contract.contract_type;
      const filename = `Contrato_${sanitizeFilename(typeLabel)}_${sanitizeFilename(contract.employees.document_number)}_${format(new Date(), 'yyyyMMdd')}.pdf`;

      if (hasTemplate && contractTypeConfig?.template_url) {
        setProgress(30);
        // Generate contract DOCX blob first
        const docxBlob = await generateContractFromTemplate(
          contractTypeConfig.template_url,
          documentData
        );
        setProgress(70);
        
        // Open print preview window
        await showContractPrintPreview(docxBlob, documentData);
        setProgress(100);

        toast.success('Vista previa abierta', {
          description: 'Se ha abierto la vista previa de impresión en una ventana flotante.',
        });
      } else {
        setProgress(50);
        // Fallback to basic programmatic PDF
        const pdf = await generateBasicContractPDF(documentData);
        setProgress(80);
        downloadPDF(pdf, filename);
        setProgress(100);

        toast.success('Contrato PDF Básico generado exitosamente', {
          description: `El documento se ha descargado como ${filename}`,
        });
      }

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

    // Parse dates safely - handle potential null/undefined/empty values
    // Note: start_date can come as ISO string (2026-01-25T00:00:00.000Z) or date string (2026-01-25)
    let startDate: Date;
    let endDate: Date | null = null;
    let durationMonths: number | undefined = undefined;

    // Validate and parse start date
    if (contract.start_date && contract.start_date.trim() !== '') {
      // Handle both ISO format and simple date format
      const dateStr = contract.start_date.includes('T') 
        ? contract.start_date 
        : contract.start_date + 'T00:00:00';
      startDate = new Date(dateStr);
      if (isNaN(startDate.getTime())) {
        throw new Error('Fecha de inicio inválida');
      }
    } else {
      throw new Error('La fecha de inicio del contrato es requerida');
    }

    // Validate and parse end date if present
    if (contract.end_date && contract.end_date.trim() !== '') {
      // Handle both ISO format and simple date format
      const dateStr = contract.end_date.includes('T') 
        ? contract.end_date 
        : contract.end_date + 'T00:00:00';
      endDate = new Date(dateStr);
      if (isNaN(endDate.getTime())) {
        endDate = null; // Invalid end date, treat as null
      } else {
        durationMonths = calculateMonthsDifference(startDate, endDate);
      }
    }

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
      logoUrl: company?.horizontal_logo_url || company?.logo_url,
      representativeName: systemConfig?.legal_signature_config?.signer_name || undefined,
      representativePosition: systemConfig?.legal_signature_config?.signer_position || undefined,
      representativeSignatureUrl: systemConfig?.legal_signature_config?.signature_url || undefined,

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
      employeePayrollType: employeeSchedule?.payroll_type || 'quincenal', // Default to quincenal if no schedule record

      // Contract
      contractNumber: contract.contract_number || undefined, // Consecutivo (ej: PC-2024-0001)
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
      workLaborDescription: contract.work_labor_description || undefined, // Objeto/labor para contratos obra_labor

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
      <DialogContent className="w-[95%] sm:max-w-xl rounded-xl max-h-[95vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 bg-white border border-slate-100 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
            <FileText className="w-5 h-5 text-primary" />
            Generar Documento de Contrato
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            Genere el documento del contrato usando la plantilla configurada o en formato PDF básico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 sm:py-3">
          {/* Contract Summary */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100/80 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Detalles del Contrato
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-sm">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 font-medium">Empleado</span>
                <p className="font-semibold text-slate-800 break-words leading-tight">{employeeName}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 font-medium">N° Documento</span>
                <p className="font-semibold text-slate-700 leading-tight">{contract.employees.document_number}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 font-medium">Tipo de Contrato</span>
                <p className="font-semibold text-primary break-words leading-tight">
                  {contractTypeConfig?.display_name || contract.contract_type}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 font-medium">Fecha de Inicio</span>
                <p className="font-semibold text-slate-700 leading-tight">
                  {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* City Input */}
          <div className="space-y-1.5">
            <Label htmlFor="generationCity" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ciudad de Generación
            </Label>
            <Input
              id="generationCity"
              value={generationCity}
              onChange={(e) => setGenerationCity(e.target.value)}
              placeholder="Ej. Bucaramanga"
              className="w-full text-xs sm:text-sm border-slate-200 focus:border-primary focus:ring-primary rounded-lg transition-all h-10 px-3"
            />
          </div>

          {/* Template Status Banner */}
          {hasTemplate ? (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-semibold text-blue-800">Plantilla Vinculada</h5>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Este contrato se generará usando la plantilla: <strong className="font-semibold text-blue-900 break-all">{contractTypeConfig?.template_file_name}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-xs font-semibold text-amber-800">Sin Plantilla Configurada</h5>
                <p className="text-xs text-amber-700 leading-relaxed">
                  No hay plantilla configurada para este contrato. Se generará usando el formato programático PDF básico.
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2 pt-2">
              <Progress value={progress} className="h-1.5 bg-slate-100" />
              <p className="text-xs text-slate-500 text-center font-medium">
                Generando documento... {progress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="w-full sm:w-auto order-3 sm:order-1 text-xs sm:text-sm hover:bg-slate-50 text-slate-600 transition-colors h-10"
          >
            Cancelar
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full sm:w-auto text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/5 transition-all h-10 px-4"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              {hasTemplate ? 'Vista Previa e Imprimir' : 'Generar PDF Básico'}
            </Button>
            <Button
              onClick={handleGenerateWord}
              disabled={isGenerating || !hasTemplate}
              className="w-full sm:w-auto text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white shadow-sm transition-all h-10 px-4 font-semibold"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Generar Word
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

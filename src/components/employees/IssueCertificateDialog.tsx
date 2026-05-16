import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileBadge, Wand2, PenTool, Loader2, Calendar, Briefcase, DollarSign, X } from 'lucide-react';
import { generateLaborCertificatePdf } from '@/lib/laborCertificatePdfGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import { getEmployeeFullName } from '@/types/employee';

interface IssueCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

export function IssueCertificateDialog({ open, onOpenChange, employee }: IssueCertificateDialogProps) {
  const { currentCompanyId, user } = useAuth();
  const { data: company } = useCompany(currentCompanyId || '');
  const { data: systemConfig } = useSystemConfig();
  const { toast } = useToast();

  const [generationType, setGenerationType] = useState<'automatic' | 'manual'>('automatic');
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual fields
  const [salaryAmount, setSalaryAmount] = useState('');
  const [positionName, setPositionName] = useState('');
  const [contractType, setContractType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-fill from employee when opened
  useEffect(() => {
    if (open && employee) {
      setGenerationType('automatic');
      const salary = employee.work_info?.base_salary || 0;
      setSalaryAmount(salary.toString());
      setPositionName(employee.work_info?.position_name || '');
      setContractType(employee.contracts?.[0]?.contract_type || 'Término Indefinido');
      setStartDate(employee.work_info?.hire_date || '');
      setEndDate(employee.work_info?.end_date || '');
    } else {
      setSalaryAmount('');
      setPositionName('');
      setContractType('');
      setStartDate('');
      setEndDate('');
    }
  }, [open, employee]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !company) return;

    try {
      setIsGenerating(true);

      const usedSalary = generationType === 'automatic' ? (employee.work_info?.base_salary || 0) : Number(salaryAmount);
      const usedPosition = generationType === 'automatic' ? (employee.work_info?.position_name || '') : positionName;
      const usedContractType = generationType === 'automatic' ? (employee.contracts?.[0]?.contract_type || 'Término Indefinido') : contractType;
      const usedStartDate = generationType === 'automatic' ? (employee.work_info?.hire_date || '') : startDate;
      const usedEndDate = generationType === 'automatic' ? (employee.work_info?.end_date || null) : (endDate || null);

      if (!usedStartDate) {
        toast({ title: 'Faltan datos', description: 'La fecha de ingreso es obligatoria.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      // Generate a new verification token
      const verificationToken = crypto.randomUUID();

      // Get next consecutive for company
      // Supabase does not have an easy way to just get a sequence value securely via JS without an RPC if it's per company.
      // Since it's a serial column, we can just insert and let Postgres generate it, then read it back.
      const contentData = {
        salaryAmount: usedSalary,
        positionName: usedPosition,
        contractType: usedContractType,
        startDate: usedStartDate,
        endDate: usedEndDate,
      };

      const { data: certRecord, error: insertError } = await supabase
        .from('work_certificates')
        .insert({
          employee_id: employee.id,
          company_id: currentCompanyId,
          generation_type: generationType,
          content_data: contentData,
          verification_token: verificationToken,
          folio: 'PENDING', // Will update right after
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update folio based on consecutive
      const currentYear = new Date().getFullYear();
      const paddedConsecutive = certRecord.consecutive.toString().padStart(4, '0');
      const folio = `CERT-${currentYear}-${paddedConsecutive}`;

      const { error: updateError } = await supabase
        .from('work_certificates')
        .update({ folio })
        .eq('id', certRecord.id);

      if (updateError) throw updateError;

      const verificationUrl = `${window.location.origin}/verificar-certificado/${verificationToken}`;
      
      const signatureConfig = systemConfig?.legal_signature_config;
      const watermarkConfig = systemConfig?.watermark_config;

      // Ensure the PDF generator receives the required params
      const doc = await generateLaborCertificatePdf({
        employee,
        company,
        data: contentData,
        folio,
        verificationUrl,
        signatureConfig,
        watermarkConfig
      });

      doc.save(`Certificacion_Laboral_${getEmployeeFullName(employee).replace(/\s+/g, '_')}.pdf`);
      
      toast({ title: 'Éxito', description: 'Certificado generado y descargado correctamente.' });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo generar el certificado.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col [&>button:last-child]:hidden">
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-slate-100 bg-background relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute right-6 top-6 h-8 w-8 rounded-full bg-slate-100/50 hover:bg-slate-200/50 z-10"
          >
            <X className="w-4 h-4 text-slate-500" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <FileBadge className="w-7 h-7 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
                Expedir Certificación
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground">{getEmployeeFullName(employee)}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="flex flex-col flex-1 min-h-0">
          <div className="px-8 py-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setGenerationType('automatic')}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all overflow-hidden ${
                  generationType === 'automatic' 
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' 
                    : 'border-transparent bg-white shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${generationType === 'automatic' ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <h3 className={`font-bold ${generationType === 'automatic' ? 'text-primary' : 'text-slate-700'}`}>Automática</h3>
                </div>
                <p className="text-xs text-muted-foreground">Extrae los datos actuales directamente del sistema.</p>
                {generationType === 'automatic' && (
                  <motion.div layoutId="active-indicator" className="absolute top-0 right-0 w-12 h-12 bg-primary/10 -mr-6 -mt-6 rotate-45" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setGenerationType('manual')}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all overflow-hidden ${
                  generationType === 'manual' 
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' 
                    : 'border-transparent bg-white shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${generationType === 'manual' ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <PenTool className="w-4 h-4" />
                  </div>
                  <h3 className={`font-bold ${generationType === 'manual' ? 'text-primary' : 'text-slate-700'}`}>Manual</h3>
                </div>
                <p className="text-xs text-muted-foreground">Permite personalizar los datos del certificado.</p>
                {generationType === 'manual' && (
                  <motion.div layoutId="active-indicator" className="absolute top-0 right-0 w-12 h-12 bg-primary/10 -mr-6 -mt-6 rotate-45" />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {generationType === 'manual' ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-2 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Cargo
                    </Label>
                    <Input
                      value={positionName}
                      onChange={(e) => setPositionName(e.target.value)}
                      required
                      className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Salario Mensual
                    </Label>
                    <Input
                      type="number"
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(e.target.value)}
                      required
                      className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Tipo de Contrato
                    </Label>
                    <Input
                      value={contractType}
                      onChange={(e) => setContractType(e.target.value)}
                      required
                      className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Fecha de Ingreso
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Fecha Fin (Opcional)
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-muted-foreground"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Resumen de Datos</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">Cargo</span>
                      <span className="text-sm font-bold text-slate-900">{employee.work_info?.position_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">Salario</span>
                      <span className="text-sm font-bold text-slate-900">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(employee.work_info?.base_salary || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">Contrato</span>
                      <span className="text-sm font-bold text-slate-900">{employee.contracts?.[0]?.contract_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">Ingreso</span>
                      <span className="text-sm font-bold text-slate-900">
                        {employee.work_info?.hire_date ? new Date(employee.work_info.hire_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          <div className="px-8 py-6 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-between gap-4 rounded-b-[2.5rem]">
            <p className="text-[10px] text-muted-foreground font-medium max-w-[200px] leading-tight">
              Se generará un documento con folio, marca de agua y código QR de verificación.
            </p>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all bg-primary text-primary-foreground"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileBadge className="w-4 h-4 mr-2" />}
                {isGenerating ? 'Generando...' : 'Generar PDF'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

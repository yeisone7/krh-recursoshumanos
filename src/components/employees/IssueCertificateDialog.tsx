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
import { FileBadge, Wand2, PenTool, Loader2, Calendar, Briefcase, DollarSign, X, CheckCircle, Link2, Lock } from 'lucide-react';
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
  onGenerated?: () => void;
}

export function IssueCertificateDialog({ open, onOpenChange, employee, onGenerated }: IssueCertificateDialogProps) {
  const { currentCompanyId, user } = useAuth();
  const { data: company } = useCompany(currentCompanyId || '');
  const { data: systemConfig } = useSystemConfig();
  const { toast } = useToast();

  const [generationType, setGenerationType] = useState<'automatic' | 'manual'>('automatic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSalary, setShowSalary] = useState(true);

  // Programmable sharing link states
  const [isProgrammable, setIsProgrammable] = useState(false);
  const [maxUses, setMaxUses] = useState<string>('unlimited');
  const [validityDays, setValidityDays] = useState<string>('unlimited');

  // Success view states
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedFolio, setGeneratedFolio] = useState('');
  const [linkLimitInfo, setLinkLimitInfo] = useState({ uses: '', validity: '' });

  // Manual period structure
  interface ManualPeriod {
    positionName: string;
    salaryAmount: string;
    contractType: string;
    startDate: string;
    endDate: string;
  }

  const [periods, setPeriods] = useState<ManualPeriod[]>([
    { positionName: '', salaryAmount: '', contractType: '', startDate: '', endDate: '' }
  ]);

  // Auto-fill from employee when opened
  useEffect(() => {
    if (open && employee) {
      setGenerationType('automatic');
      setShowSalary(true);
      setIsProgrammable(false);
      setMaxUses('unlimited');
      setValidityDays('unlimited');
      setShowSuccessView(false);
      setGeneratedLink('');
      setGeneratedFolio('');
      const salary = employee.work_info?.base_salary || 0;
      setPeriods([
        {
          positionName: employee.work_info?.position_name || '',
          salaryAmount: salary.toString(),
          contractType: employee.contracts?.[0]?.contract_type || 'Término Indefinido',
          startDate: employee.work_info?.hire_date || '',
          endDate: employee.work_info?.end_date || '',
        }
      ]);
    } else {
      setShowSalary(true);
      setIsProgrammable(false);
      setMaxUses('unlimited');
      setValidityDays('unlimited');
      setShowSuccessView(false);
      setGeneratedLink('');
      setGeneratedFolio('');
      setPeriods([
        { positionName: '', salaryAmount: '', contractType: '', startDate: '', endDate: '' }
      ]);
    }
  }, [open, employee]);

  const handleAddPeriod = () => {
    setPeriods([...periods, { positionName: '', salaryAmount: '', contractType: '', startDate: '', endDate: '' }]);
  };

  const handleRemovePeriod = (index: number) => {
    setPeriods(periods.filter((_, i) => i !== index));
  };

  const handlePeriodChange = (index: number, field: keyof ManualPeriod, value: string) => {
    const updated = [...periods];
    updated[index] = { ...updated[index], [field]: value };
    setPeriods(updated);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !company) return;

    try {
      setIsGenerating(true);

      // Validate all periods if generation type is manual
      if (generationType === 'manual') {
        for (let i = 0; i < periods.length; i++) {
          const p = periods[i];
          if (!p.startDate || !p.positionName || !p.contractType || !p.salaryAmount) {
            toast({
              title: 'Datos incompletos',
              description: `Por favor complete todos los campos requeridos para el Período #${i + 1}.`,
              variant: 'destructive'
            });
            setIsGenerating(false);
            return;
          }
        }
      } else {
        // Automatic mode validation
        if (!employee.work_info?.hire_date) {
          toast({ title: 'Faltan datos', description: 'El empleado no tiene fecha de ingreso registrada en el sistema.', variant: 'destructive' });
          setIsGenerating(false);
          return;
        }
      }

      // Generate a new verification token
      const verificationToken = crypto.randomUUID();

      // Expiration date if programmable & not unlimited
      let expiresAt = null;
      if (isProgrammable && validityDays !== 'unlimited') {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(validityDays, 10));
        expiresAt = date.toISOString();
      }

      const signatureConfig = systemConfig?.legal_signature_config;
      const watermarkConfigRaw = systemConfig?.watermark_config;
      const watermarkConfig = watermarkConfigRaw?.enabled && watermarkConfigRaw?.logo_url
        ? {
            url: watermarkConfigRaw.logo_url,
            opacity: watermarkConfigRaw.opacity || 20,
            position: watermarkConfigRaw.position || 'center'
          }
        : undefined;

      // Structure content data for backward compatibility and multi-period rendering
      const contentData = {
        salaryAmount: generationType === 'automatic' ? (employee.work_info?.base_salary || 0) : Number(periods[0].salaryAmount),
        positionName: generationType === 'automatic' ? (employee.work_info?.position_name || '') : periods[0].positionName,
        contractType: generationType === 'automatic' ? (employee.contracts?.[0]?.contract_type || 'Término Indefinido') : periods[0].contractType,
        startDate: generationType === 'automatic' ? (employee.work_info?.hire_date || '') : periods[0].startDate,
        endDate: generationType === 'automatic' ? (employee.work_info?.end_date || null) : (periods[0].endDate || null),
        showSalary,
        signatureConfig,
        watermarkConfig,
        linkConfig: {
          isProgrammable,
          maxUses: maxUses === 'unlimited' ? null : parseInt(maxUses, 10),
          usesCount: 0,
          expiresAt
        },
        periods: generationType === 'automatic'
          ? [{
              salaryAmount: employee.work_info?.base_salary || 0,
              positionName: employee.work_info?.position_name || '',
              contractType: employee.contracts?.[0]?.contract_type || 'Término Indefinido',
              startDate: employee.work_info?.hire_date || '',
              endDate: employee.work_info?.end_date || null,
            }]
          : periods.map(p => ({
              salaryAmount: Number(p.salaryAmount),
              positionName: p.positionName,
              contractType: p.contractType,
              startDate: p.startDate,
              endDate: p.endDate || null,
            }))
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
      onGenerated?.();
      
      toast({ title: 'Éxito', description: 'Certificado generado y descargado correctamente.' });

      if (isProgrammable) {
        setGeneratedLink(verificationUrl);
        setGeneratedFolio(folio);
        setLinkLimitInfo({
          uses: maxUses === 'unlimited' ? 'Sin límite' : `${maxUses} descarga${maxUses === '1' ? '' : 's'}`,
          validity: validityDays === 'unlimited' 
            ? 'Sin límite de tiempo' 
            : `Expira en ${validityDays} día${validityDays === '1' ? '' : 's'} (${new Date(expiresAt!).toLocaleDateString('es-CO')})`
        });
        setShowSuccessView(true);
      } else {
        onOpenChange(false);
      }
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
      <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col [&>button:last-child]:hidden">
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

        {showSuccessView ? (
          <div className="flex flex-col flex-1 p-8 text-center bg-[#f8fafc] relative justify-between">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 mt-4 shadow-sm border border-emerald-200">
                <CheckCircle className="w-8 h-8" />
              </div>

              <DialogTitle className="text-2xl font-black text-slate-900 mb-1">
                ¡Enlace de Descarga Creado!
              </DialogTitle>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                Se ha expedido la certificación con folio <span className="font-bold text-slate-700">{generatedFolio}</span>. El empleado podrá descargar el PDF directamente usando este link.
              </p>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-4 mb-6 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" /> Enlace Programable
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="h-12 bg-slate-50 border border-slate-200 text-xs font-bold rounded-2xl flex-1 text-slate-600 focus-visible:ring-0 select-all"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles.' });
                    }}
                    className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-white hover:scale-105 transition-all shadow-md shadow-primary/10"
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                    <FileBadge className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Descargas</p>
                    <p className="font-bold text-xs text-slate-700 leading-tight">{linkLimitInfo.uses}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vigencia</p>
                    <p className="font-bold text-xs text-slate-700 leading-tight">{linkLimitInfo.validity}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200 bg-[#f1f5f9] -mx-8 -mb-8 px-8 py-6 rounded-b-[2.5rem] flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cerrar Ventana
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  toast({ title: 'Enlace Copiado', description: '¡Compártelo con el empleado!' });
                  onOpenChange(false);
                }}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Listo / Copiar y Cerrar
              </Button>
            </div>
          </div>
        ) : (
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

              {/* Incluir Salario Toggle */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Incluir salario en la certificación
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Desactívalo si deseas omitir la información del salario básico del documento.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSalary}
                    onChange={(e) => setShowSalary(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Enlace Compartible Programable */}
              <div className="flex flex-col gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="text-primary">✨</span> Generar Enlace Compartible
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Permite al empleado descargar el PDF desde un link con límite de usos y fecha de vencimiento.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isProgrammable}
                      onChange={(e) => setIsProgrammable(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {isProgrammable && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100"
                  >
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Número Máximo de Usos
                      </Label>
                      <select
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="unlimited">Sin límite (Descargas ilimitadas)</option>
                        <option value="1">1 descarga (Seguridad máxima)</option>
                        <option value="3">3 descargas</option>
                        <option value="5">5 descargas</option>
                        <option value="10">10 descargas</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Fecha de Vigencia
                      </Label>
                      <select
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="unlimited">Sin límite de tiempo</option>
                        <option value="1">1 día (24 horas)</option>
                        <option value="3">3 días</option>
                        <option value="7">7 días</option>
                        <option value="15">15 días</option>
                        <option value="30">30 días</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {generationType === 'manual' ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 pt-2 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Períodos Laborados
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPeriod}
                        className="text-xs font-bold text-primary border-primary/25 bg-white hover:bg-primary/5 rounded-xl h-9 px-4"
                      >
                        + Agregar Período
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {periods.map((period, index) => (
                        <div key={index} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-4 relative">
                          {periods.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePeriod(index)}
                              className="absolute right-4 top-4 h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Período #{index + 1}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3" /> Cargo
                              </Label>
                              <Input
                                value={period.positionName}
                                onChange={(e) => handlePeriodChange(index, 'positionName', e.target.value)}
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
                                value={period.salaryAmount}
                                onChange={(e) => handlePeriodChange(index, 'salaryAmount', e.target.value)}
                                required
                                className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" /> Tipo de Contrato
                            </Label>
                            <Input
                              value={period.contractType}
                              onChange={(e) => handlePeriodChange(index, 'contractType', e.target.value)}
                              required
                              className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Fecha de Ingreso
                              </Label>
                              <Input
                                type="date"
                                value={period.startDate}
                                onChange={(e) => handlePeriodChange(index, 'startDate', e.target.value)}
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
                                value={period.endDate}
                                onChange={(e) => handlePeriodChange(index, 'endDate', e.target.value)}
                                className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-muted-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

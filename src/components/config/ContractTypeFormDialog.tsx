import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Download, ShieldCheck, Clock, Layers, CalendarRange, Loader2, CheckCircle2, Info, FileStack, Settings2 } from 'lucide-react';
import type { ContractTypeConfig } from '@/hooks/useContractTypes';
import { cn } from '@/lib/utils';

interface ContractTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<ContractTypeConfig>, file?: File) => Promise<void>;
  onDownloadTemplate?: (url: string, fileName: string) => void;
  isLoading?: boolean;
  editItem?: ContractTypeConfig | null;
}

export function ContractTypeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  onDownloadTemplate,
  isLoading,
  editItem,
}: ContractTypeFormDialogProps) {
  const [contractType, setContractType] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [maxDurationMonths, setMaxDurationMonths] = useState<string>('');
  const [maxExtensions, setMaxExtensions] = useState<string>('');
  const [defaultTrialDays, setDefaultTrialDays] = useState<string>('60');
  const [requiresEndDate, setRequiresEndDate] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [existingTemplateFileName, setExistingTemplateFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedFormKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedFormKeyRef.current = null;
      return;
    }

    const formKey = editItem?.id ?? 'new';
    if (initializedFormKeyRef.current === formKey) return;
    initializedFormKeyRef.current = formKey;

    if (editItem) {
      setContractType(editItem.contract_type || '');
      setDisplayName(editItem.display_name || '');
      setDescription(editItem.description || '');
      setMaxDurationMonths(editItem.max_duration_months?.toString() || '');
      setMaxExtensions(editItem.max_extensions?.toString() || '');
      setDefaultTrialDays(editItem.default_trial_days?.toString() || '60');
      setRequiresEndDate(editItem.requires_end_date ?? true);
      setIsActive(editItem.is_active ?? true);
      setExistingTemplateFileName(editItem.template_file_name || null);
      setTemplateFile(null);
    } else {
      setContractType('');
      setDisplayName('');
      setDescription('');
      setMaxDurationMonths('');
      setMaxExtensions('');
      setDefaultTrialDays('60');
      setRequiresEndDate(true);
      setIsActive(true);
      setExistingTemplateFileName(null);
      setTemplateFile(null);
    }
  }, [editItem?.id, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'application/msword'
      ];
      if (!allowedTypes.includes(file.type)) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setTemplateFile(file);
    }
  };

  const handleRemoveFile = () => {
    setTemplateFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Partial<ContractTypeConfig> = {
      contract_type: contractType.toLowerCase().replace(/\s+/g, '_'),
      display_name: displayName,
      description: description || null,
      max_duration_months: maxDurationMonths ? parseInt(maxDurationMonths) : null,
      max_extensions: maxExtensions ? parseInt(maxExtensions) : null,
      default_trial_days: defaultTrialDays ? parseInt(defaultTrialDays) : 0,
      requires_end_date: requiresEndDate,
      is_active: isActive,
    };

    if (editItem) {
      data.id = editItem.id;
    }

    await onSubmit(data, templateFile || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-none rounded-3xl focus:outline-none flex flex-col">
        <DialogDescription className="sr-only">
          Formulario para crear o modificar un tipo de contrato y su plantilla documental.
        </DialogDescription>
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* Header Premium Flat Design */}
          <DialogHeader className="relative px-6 py-6 sm:px-8 sm:py-7 bg-slate-50/50 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden">
                <FileStack className="relative w-7 h-7 text-primary stroke-[2.5]" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "font-black text-[9px] px-2.5 py-0.5 rounded-lg border-none uppercase tracking-[0.15em]",
                    editItem ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                  )}>
                    {editItem ? 'PROTOCOLO DE EDICIÓN' : 'REGISTRO INICIAL'}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Configuración Maestra</span>
                </div>
                <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none truncate uppercase">
                  {editItem ? 'Modificar Tipo' : 'Nuevo Tipo'}
                </DialogTitle>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Arquitectura de contratación y plantillas legales</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 space-y-7 custom-scrollbar bg-slate-50/30">
              
              {/* Sección: Identificación del Tipo */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Identidad Corporativa</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="contractType" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Técnico del Sistema *</Label>
                    <div className="relative">
                      <Input
                        id="contractType"
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                        placeholder="ej: término_fijo_un_año"
                        required
                        disabled={!!editItem}
                        className="h-11 rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-black text-slate-900 placeholder:text-slate-300 placeholder:font-bold text-xs uppercase"
                      />
                      {!editItem && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-2 py-1 rounded-lg">ID Único</div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Comercial *</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ej: Contrato Fijo Inferior a 1 Año"
                      required
                      className="h-11 rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-black text-slate-900 placeholder:text-slate-300 placeholder:font-bold text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Especificaciones Legales</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe los alcances, condiciones y marco legal de este tipo de vinculación..."
                    className="min-h-[88px] rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-bold text-slate-600 resize-none placeholder:text-slate-300 p-4 text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Sección: Configuración Operativa */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Settings2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Parámetros Operativos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Meses Límite
                    </Label>
                    <Input
                      type="number"
                      value={maxDurationMonths}
                      onChange={(e) => setMaxDurationMonths(e.target.value)}
                      placeholder="∞"
                      className="h-11 rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-black text-slate-900 text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" /> Prórrogas
                    </Label>
                    <Input
                      type="number"
                      value={maxExtensions}
                      onChange={(e) => setMaxExtensions(e.target.value)}
                      placeholder="∞"
                      className="h-11 rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-black text-slate-900 text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-primary" /> Días Prueba
                    </Label>
                    <Input
                      type="number"
                      value={defaultTrialDays}
                      onChange={(e) => setDefaultTrialDays(e.target.value)}
                      placeholder="60"
                      className="h-11 rounded-xl bg-white border border-slate-200 focus-visible:ring-0 focus-visible:border-primary transition-all font-black text-slate-900 text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 transition-all">
                    <div className="space-y-1">
                      <Label htmlFor="requiresEndDate" className="text-[10px] font-black uppercase tracking-widest text-slate-900 block">Vencimiento Fijo</Label>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Requiere fecha de terminación</p>
                    </div>
                    <Switch
                      id="requiresEndDate"
                      checked={requiresEndDate}
                      onCheckedChange={setRequiresEndDate}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 transition-all">
                    <div className="space-y-1">
                      <Label htmlFor="isActive" className="text-[10px] font-black uppercase tracking-widest text-slate-900 block">Habilitado</Label>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Disponible para contratación</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Plantilla Documental */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <FileText className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Motor de Generación (DOCX/PDF)</h3>
                </div>

                <AnimatePresence mode="wait">
                  {existingTemplateFileName && !templateFile ? (
                    <motion.div
                      key="existing-template"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white border border-primary/20"
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-primary/5 text-primary">
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest text-primary truncate">{existingTemplateFileName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Documento actualmente vinculado</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editItem?.template_url && onDownloadTemplate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDownloadTemplate(editItem.template_url!, existingTemplateFileName)}
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                          >
                            <Download className="w-5 h-5 stroke-[2.5]" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setExistingTemplateFileName(null)}
                          className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : templateFile ? (
                    <motion.div
                      key="new-template"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                          <Upload className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-600 truncate">{templateFile.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nuevo: {(templateFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <X className="w-5 h-5 stroke-[2.5]" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-template"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative"
                    >
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer overflow-hidden group/drop"
                      >
                        <div className="relative mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 transition-all">
                          <Upload className="w-7 h-7 text-slate-350 stroke-[2.5]" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 group-hover/drop:text-primary transition-colors">Vincular Plantilla DOCX/PDF</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8">Explorar archivos o arrastra directamente (Máximo 10MB)</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

            </div>

            {/* Footer de Acciones Premium Flat */}
            <div className="shrink-0 px-6 py-5 sm:px-8 border-t border-slate-200 bg-white flex items-center justify-between gap-4 rounded-b-3xl">
              <div className="hidden sm:flex items-center gap-2 text-slate-400">
                <Info className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest italic">Campos con * son obligatorios</span>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)} 
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-450 hover:bg-slate-50 transition-all flex-1 sm:flex-none"
                >
                  DESCARTAR
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !contractType.trim() || !displayName.trim()} 
                  className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all flex-1 sm:flex-none"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : editItem ? (
                    'SINCRONIZAR CAMBIOS'
                  ) : (
                    'CONFIRMAR REGISTRO'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

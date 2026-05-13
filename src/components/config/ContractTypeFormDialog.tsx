import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, X, Download, ShieldCheck, Clock, Layers, CalendarRange, Loader2, CheckCircle2 } from 'lucide-react';
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

  useEffect(() => {
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
  }, [editItem, open]);

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
      <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* Header Decorativo */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          
          <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-2 bg-primary/5 rounded-3xl blur-xl" />
                <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden group">
                  <div className="absolute inset-0 bg-slate-50 group-hover:bg-primary/5 transition-colors" />
                  <span className="relative text-2xl font-black text-primary leading-none">CO</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/50 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {editItem ? 'Editando Registro' : 'Nuevo Registro'}
                </div>
                <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                  {editItem ? 'Editar Tipo' : 'Nuevo Tipo'}
                </DialogTitle>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Configuración Legal
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Layers className="w-3.5 h-3.5" />
                    Plantilla Vinculada
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
              
              {/* Sección: Información General */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Datos de Identificación</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contractType" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código de Sistema *</Label>
                    <div className="relative group">
                      <Input
                        id="contractType"
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                        placeholder="ej: fijo_menor_1"
                        required
                        disabled={!!editItem}
                        className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                      />
                      {!editItem && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40 uppercase tracking-tighter">Único</div>}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 font-medium ml-1">Sin espacios ni caracteres especiales.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Comercial *</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ej: Término Fijo < 1 Año"
                      required
                      className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción Legal / Notas</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles sobre las condiciones de este contrato..."
                    className="min-h-[120px] rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 resize-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Sección: Configuración Técnica */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Parámetros de Duración</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Meses Máximos
                    </Label>
                    <Input
                      type="number"
                      value={maxDurationMonths}
                      onChange={(e) => setMaxDurationMonths(e.target.value)}
                      placeholder="Sin límite"
                      className="h-12 rounded-2xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Prórrogas Máx.
                    </Label>
                    <Input
                      type="number"
                      value={maxExtensions}
                      onChange={(e) => setMaxExtensions(e.target.value)}
                      placeholder="Sin límite"
                      className="h-12 rounded-2xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                      <CalendarRange className="w-3 h-3" /> Días Prueba
                    </Label>
                    <Input
                      type="number"
                      value={defaultTrialDays}
                      onChange={(e) => setDefaultTrialDays(e.target.value)}
                      placeholder="60"
                      className="h-12 rounded-2xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-4 group">
                    <Switch
                      id="requiresEndDate"
                      checked={requiresEndDate}
                      onCheckedChange={setRequiresEndDate}
                      className="data-[state=checked]:bg-primary"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="requiresEndDate" className="text-xs font-black uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">Fecha Fin Obligatoria</Label>
                      <p className="text-[9px] text-muted-foreground font-bold italic">Determina si el contrato es término fijo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="isActive" className="text-xs font-black uppercase tracking-widest cursor-pointer group-hover:text-emerald-500 transition-colors">Tipo Habilitado</Label>
                      <p className="text-[9px] text-muted-foreground font-bold italic">Disponible para nuevos empleados</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Plantilla */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Documento de Plantilla</h3>
                </div>

                <AnimatePresence mode="wait">
                  {existingTemplateFileName && !templateFile ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 group hover:bg-primary/10 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-background border border-primary/20 shadow-lg">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-primary truncate">{existingTemplateFileName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground tracking-wide italic">Archivo actualmente vinculado</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editItem?.template_url && onDownloadTemplate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDownloadTemplate(editItem.template_url!, existingTemplateFileName)}
                            className="h-10 w-10 rounded-xl hover:bg-primary/20 hover:text-primary transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setExistingTemplateFileName(null)}
                          className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : templateFile ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-background border border-emerald-500/20 shadow-lg">
                          <Upload className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-600 truncate">{templateFile.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground tracking-wide">Nuevo archivo: {(templateFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group relative"
                    >
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center py-10 rounded-[2rem] border-2 border-dashed border-border/50 bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative mb-4 p-4 rounded-2xl bg-background border border-border group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          <Upload className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Subir Plantilla DOCX/PDF</p>
                        <p className="text-[10px] font-bold text-muted-foreground/60 tracking-tighter">Click para buscar o arrastra el archivo (Máx 10MB)</p>
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

            {/* Footer de Acciones */}
            <div className="shrink-0 px-10 py-8 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-6 rounded-b-[2.5rem]">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-600 hover:bg-slate-200 transition-all"
              >
                DESCARTAR
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !contractType.trim() || !displayName.trim()} 
                className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-[#004a7c] hover:bg-[#003a61] text-white shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : editItem ? (
                  'GUARDAR CAMBIOS'
                ) : (
                  'CONFIRMAR REGISTRO'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}


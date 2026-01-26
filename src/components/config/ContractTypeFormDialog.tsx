import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, X, Download } from 'lucide-react';
import type { ContractTypeConfig } from '@/hooks/useContractTypes';

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
        alert('Solo se permiten archivos DOCX, DOC o PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar 10MB');
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? 'Editar Tipo de Contrato' : 'Nuevo Tipo de Contrato'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">Código *</Label>
              <Input
                id="contractType"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                placeholder="ej: fijo_menor_1"
                required
                disabled={!!editItem}
              />
              <p className="text-xs text-muted-foreground">
                Identificador único, sin espacios
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre a Mostrar *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ej: Término Fijo < 1 Año"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del tipo de contrato..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDurationMonths">Duración Máx. (meses)</Label>
              <Input
                id="maxDurationMonths"
                type="number"
                min="0"
                value={maxDurationMonths}
                onChange={(e) => setMaxDurationMonths(e.target.value)}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxExtensions">Máx. Prórrogas</Label>
              <Input
                id="maxExtensions"
                type="number"
                min="0"
                value={maxExtensions}
                onChange={(e) => setMaxExtensions(e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTrialDays">Días Período Prueba</Label>
              <Input
                id="defaultTrialDays"
                type="number"
                min="0"
                max="60"
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="requiresEndDate"
                checked={requiresEndDate}
                onCheckedChange={setRequiresEndDate}
              />
              <Label htmlFor="requiresEndDate">Requiere Fecha Fin</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Activo</Label>
            </div>
          </div>

          {/* Template Upload Section */}
          <div className="space-y-2 border-t pt-4">
            <Label>Plantilla de Contrato</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Suba un archivo DOCX o PDF que servirá como plantilla para generar contratos de este tipo.
            </p>
            
            {existingTemplateFileName && !templateFile && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{existingTemplateFileName}</span>
                </div>
                <div className="flex gap-2">
                  {editItem?.template_url && onDownloadTemplate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownloadTemplate(editItem.template_url!, existingTemplateFileName)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExistingTemplateFileName(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {templateFile && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{templateFile.name}</span>
                  <span className="text-xs text-emerald-500">
                    ({(templateFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {!templateFile && !existingTemplateFileName && (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Haga clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground/70">
                  DOCX, DOC o PDF (máx. 10MB)
                </p>
              </div>
            )}

            {!templateFile && existingTemplateFileName === null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Nueva Plantilla
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !contractType.trim() || !displayName.trim()}>
              {isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

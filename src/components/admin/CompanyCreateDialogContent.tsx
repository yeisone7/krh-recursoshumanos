import { useEffect, useId, useRef, useState } from 'react';
import { Building2, CheckCircle2, ImageIcon, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanyDraft {
  name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  contract_prefix: string;
}

interface CompanyCreateDialogContentProps {
  company: CompanyDraft;
  onCompanyChange: (company: CompanyDraft) => void;
  logoFile: File | null;
  onLogoChange: (file: File | null) => void;
  horizontalLogoFile: File | null;
  onHorizontalLogoChange: (file: File | null) => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function BrandFilePicker({ label, hint, file, onChange }: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="min-w-0">
      <button type="button" className="company-brand-picker group" onClick={() => inputRef.current?.click()} aria-label={`${file ? 'Cambiar' : 'Subir'} ${label.toLowerCase()}`}>
        <span className="company-brand-preview">
          {preview ? <img src={preview} alt={`Vista previa: ${label.toLowerCase()}`} /> : <ImageIcon className="h-6 w-6 text-muted-foreground/60" />}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="mt-1 block truncate text-xs text-muted-foreground" title={file?.name}>{file ? file.name : hint}</span>
          <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary"><Upload className="h-3.5 w-3.5" />{file ? 'Cambiar imagen' : 'Subir imagen'}</span>
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label={`Archivo de ${label.toLowerCase()}`} onChange={event => onChange(event.target.files?.[0] || null)} />
    </div>
  );
}

export function CompanyCreateDialogContent({ company, onCompanyChange, logoFile, onLogoChange, horizontalLogoFile, onHorizontalLogoChange, pending, onSubmit, onCancel }: CompanyCreateDialogContentProps) {
  const id = useId();
  const update = (field: keyof CompanyDraft, value: string) => onCompanyChange({ ...company, [field]: value });
  return (
    <DialogContent className="company-create-dialog w-[calc(100vw-1.5rem)] sm:max-w-[800px]">
      <DialogHeader className="company-create-header">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></span>
        <div className="min-w-0 space-y-1.5">
          <DialogTitle className="text-xl font-semibold tracking-tight">Configuración maestra</DialogTitle>
          <DialogDescription>Registre los datos y la identidad visual de la nueva empresa.</DialogDescription>
        </div>
      </DialogHeader>
      <form className="company-create-form" onSubmit={event => { event.preventDefault(); if (!pending) onSubmit(); }}>
        <div className="company-create-body scrollbar-themed">
          <section aria-labelledby={`${id}-identity`}>
            <h3 id={`${id}-identity`} className="company-create-section-title"><span>01</span> Identificación de la empresa</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`${id}-name`}>Razón social jurídica <span className="text-primary">*</span></Label>
                <Input id={`${id}-name`} placeholder="Nombre legal de la empresa" value={company.name} onChange={event => update('name', event.target.value)} required autoComplete="organization" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-nit`}>NIT / Tax ID <span className="text-primary">*</span></Label>
                <Input id={`${id}-nit`} placeholder="Número de identificación tributaria" value={company.nit} onChange={event => update('nit', event.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-prefix`}>Prefijo de contratos</Label>
                <Input id={`${id}-prefix`} value={company.contract_prefix} onChange={event => update('contract_prefix', event.target.value.toUpperCase())} maxLength={5} placeholder="CT" aria-describedby={`${id}-prefix-help`} />
                <p id={`${id}-prefix-help`} className="text-xs text-muted-foreground">Hasta 5 caracteres para identificar sus contratos.</p>
              </div>
            </div>
          </section>
          <section aria-labelledby={`${id}-contact`}>
            <h3 id={`${id}-contact`} className="company-create-section-title"><span>02</span> Información de contacto</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-email`}>Correo institucional</Label>
                <Input id={`${id}-email`} type="email" placeholder="contacto@empresa.com" value={company.email} onChange={event => update('email', event.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-phone`}>Línea telefónica</Label>
                <Input id={`${id}-phone`} type="tel" placeholder="Número de contacto" value={company.phone} onChange={event => update('phone', event.target.value)} autoComplete="tel" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`${id}-address`}>Dirección principal</Label>
                <Input id={`${id}-address`} placeholder="Dirección de la sede principal" value={company.address} onChange={event => update('address', event.target.value)} autoComplete="street-address" />
              </div>
            </div>
          </section>
          <section aria-labelledby={`${id}-brand`}>
            <h3 id={`${id}-brand`} className="company-create-section-title"><span>03</span> Identidad visual <small>Opcional</small></h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BrandFilePicker label="Avatar de marca" hint="Imagen cuadrada" file={logoFile} onChange={onLogoChange} />
              <BrandFilePicker label="Logo institucional" hint="Imagen horizontal" file={horizontalLogoFile} onChange={onHorizontalLogoChange} />
            </div>
          </section>
        </div>
        <div className="company-create-footer">
          <span className="mr-auto hidden text-xs text-muted-foreground sm:block"><span className="text-primary">*</span> Campos obligatorios</span>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancelar</Button>
          <Button type="submit" disabled={!company.name || !company.nit || pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {pending ? 'Creando empresa…' : 'Crear empresa'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

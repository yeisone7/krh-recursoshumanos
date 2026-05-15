import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  ShieldCheck, 
  Info, 
  MapPin, 
  Phone, 
  Hash, 
  Loader2,
  Briefcase
} from 'lucide-react';
import type { CatalogItem, CatalogIPS } from '@/hooks/useSocialSecurityCatalogs';

interface SocialSecurityCatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<CatalogItem | CatalogIPS>) => void;
  isLoading?: boolean;
  editItem?: CatalogItem | CatalogIPS | null;
  title: string;
  showIPSFields?: boolean;
}

export function SocialSecurityCatalogFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  editItem,
  title,
  showIPSFields = false,
}: SocialSecurityCatalogFormDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name || '');
      setCode(editItem.code || '');
      setNit(editItem.nit || '');
      setIsActive(editItem.is_active ?? true);
      if (showIPSFields && 'address' in editItem) {
        setAddress((editItem as CatalogIPS).address || '');
        setCity((editItem as CatalogIPS).city || '');
        setPhone((editItem as CatalogIPS).phone || '');
      }
    } else {
      setName('');
      setCode('');
      setNit('');
      setAddress('');
      setCity('');
      setPhone('');
      setIsActive(true);
    }
  }, [editItem, open, showIPSFields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<CatalogItem | CatalogIPS> = {
      name,
      code: code || null,
      nit: nit || null,
      is_active: isActive,
    };

    if (showIPSFields) {
      (data as Partial<CatalogIPS>).address = address || null;
      (data as Partial<CatalogIPS>).city = city || null;
      (data as Partial<CatalogIPS>).phone = phone || null;
    }

    if (editItem) {
      (data as Partial<CatalogItem | CatalogIPS> & { id: string }).id = editItem.id;
    }

    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* Header Decorativo */}
          
          
          <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-background">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl blur-xl" />
                <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden group">
                  <div className="absolute inset-0 bg-background group-hover:transition-colors" />
                  <Briefcase className="relative w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/50 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {editItem ? 'Editando Registro' : 'Nuevo Registro'}
                </div>
                <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                  {editItem ? `Editar ${title}` : `Nueva ${title}`}
                </DialogTitle>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Catálogo Oficial
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Building2 className="w-3.5 h-3.5" />
                    Parámetro Global
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
              
              {/* Sección: Información General */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre de la Entidad *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`ej: ${title} Colombia`}
                    required
                    className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Código Interno / Nacional</Label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="ej: EPS001"
                        className="h-14 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nit" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Número de NIT</Label>
                    <Input
                      id="nit"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="ej: 900.123.456-7"
                      className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {showIPSFields && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Dirección de Sede</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="ej: Calle 100 # 15-20"
                          className="h-14 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ciudad / Municipio</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="ej: Bogotá D.C."
                          className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Teléfono de Contacto</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="ej: (601) 123 4567"
                            className="h-14 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Habilitar Entidad</Label>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Permitir que esta entidad sea seleccionada en los contratos de empleados</p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 px-10 py-8 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-6 rounded-b-[2.5rem]">
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
                disabled={isLoading || !name.trim()} 
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

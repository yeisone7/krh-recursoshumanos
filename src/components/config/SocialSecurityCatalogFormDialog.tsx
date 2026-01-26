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
      (data as any).id = editItem.id;
    }

    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? `Editar ${title}` : `Nueva ${title}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Nombre de la ${title}`}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nit">NIT</Label>
              <Input
                id="nit"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="NIT"
              />
            </div>
          </div>

          {showIPSFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Teléfono"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { ClipboardList, Package, CheckCircle2, Circle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { Profesiograma } from '@/hooks/useDotationProfesiograma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Profesiograma | null;
  centerName?: string;
  positionName?: string;
}

export function ProfesiogramaDetailDialog({ open, onOpenChange, data, centerName, positionName }: Props) {
  if (!data) return null;

  const cName = data.operation_centers?.name || centerName || '—';
  const pName = data.positions?.name || positionName || '—';
  const requiredItems = data.items.filter(i => (i as any).is_required !== false);
  const optionalItems = data.items.filter(i => (i as any).is_required === false);

  const groupByCategory = (items: typeof data.items) => {
    const map = new Map<string, typeof data.items>();
    items.forEach(item => {
      const cat = item.dotation_item_types?.category || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Detalle de Profesiograma
          </DialogTitle>
          <DialogDescription>
            Vista previa de los artículos asignados
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Centro de Operación</p>
              <p className="text-sm font-semibold">{cName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cargo</p>
              <p className="text-sm font-semibold">{pName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Creado: {format(new Date(data.created_at), "dd MMM yyyy", { locale: es })}</span>
            <span>•</span>
            <span>Actualizado: {format(new Date(data.updated_at), "dd MMM yyyy", { locale: es })}</span>
          </div>

          <Separator />

          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Package className="w-3 h-3" />
              {data.items.length} artículo{data.items.length !== 1 ? 's' : ''}
            </Badge>
            {requiredItems.length > 0 && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                <CheckCircle2 className="w-3 h-3" />
                {requiredItems.length} obligatorio{requiredItems.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {optionalItems.length > 0 && (
              <Badge variant="outline" className="gap-1 border-dashed">
                <Circle className="w-3 h-3" />
                {optionalItems.length} opcional{optionalItems.length !== 1 ? 'es' : ''}
              </Badge>
            )}
          </div>

          {/* Items table */}
          {data.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Este profesiograma no tiene artículos asignados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead className="w-16 text-center">Cant.</TableHead>
                  <TableHead className="w-24 text-center">Tipo</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupByCategory(data.items).map(([category, catItems]) => (
                  <>
                    <TableRow key={`cat-${category}`} className="bg-muted/30">
                      <TableCell colSpan={4} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {category}
                      </TableCell>
                    </TableRow>
                    {catItems.map((item) => {
                      const isReq = (item as any).is_required !== false;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{item.dotation_item_types?.name || '—'}</span>
                              {item.dotation_item_types?.code && (
                                <span className="text-xs text-muted-foreground">({item.dotation_item_types.code})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={isReq ? 'secondary' : 'outline'} className={`text-xs ${!isReq ? 'border-dashed' : ''}`}>
                              {isReq ? 'Obligatorio' : 'Opcional'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                            {item.notes || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { ClipboardList, Package, CheckCircle2, Circle, Building2, Briefcase, Calendar } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

  const categoryColors: Record<string, string> = {
    'EPP': 'bg-amber-500/10 text-amber-700 border-amber-200',
    'Uniforme': 'bg-blue-500/10 text-blue-700 border-blue-200',
    'Herramientas': 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    'Sin categoría': 'bg-muted text-muted-foreground border-border',
  };

  const getCategoryStyle = (cat: string) => {
    return categoryColors[cat] || 'bg-primary/5 text-primary border-primary/20';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Hero header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-xl flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              Profesiograma
            </DialogTitle>
            <DialogDescription className="sr-only">
              Vista previa de los artículos asignados
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Centro</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">{cName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Cargo</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">{pName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Creado {format(new Date(data.created_at), "dd MMM yyyy", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado {format(new Date(data.updated_at), "dd MMM yyyy", { locale: es })}
            </span>
          </div>
        </div>

        {/* Summary strip */}
        <div className="px-6 py-3 border-y border-border bg-muted/20 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 py-1">
            <Package className="w-3.5 h-3.5" />
            {data.items.length} artículo{data.items.length !== 1 ? 's' : ''}
          </Badge>
          {requiredItems.length > 0 && (
            <Badge className="gap-1.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-200 hover:bg-emerald-500/15">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {requiredItems.length} obligatorio{requiredItems.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {optionalItems.length > 0 && (
            <Badge variant="outline" className="gap-1.5 py-1 border-dashed">
              <Circle className="w-3.5 h-3.5" />
              {optionalItems.length} opcional{optionalItems.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>

        {/* Items */}
        <div className="px-6 pb-6 max-h-[45vh] overflow-y-auto">
          {data.items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                <Package className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">Sin artículos asignados</p>
              <p className="text-xs mt-1">Este profesiograma aún no tiene artículos configurados.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {groupByCategory(data.items).map(([category, catItems]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${getCategoryStyle(category)}`}>
                      {category}
                    </Badge>
                    <Separator className="flex-1" />
                    <span className="text-[10px] text-muted-foreground font-medium">{catItems.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {catItems.map((item) => {
                      const isReq = (item as any).is_required !== false;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent/30 transition-colors group"
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isReq ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {item.dotation_item_types?.name || '—'}
                              </span>
                              {item.dotation_item_types?.code && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {item.dotation_item_types.code}
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold font-mono tabular-nums bg-muted/50 px-2 py-0.5 rounded">
                              ×{item.quantity}
                            </span>
                            {!isReq && (
                              <Badge variant="outline" className="text-[10px] border-dashed px-1.5 py-0">
                                Opcional
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

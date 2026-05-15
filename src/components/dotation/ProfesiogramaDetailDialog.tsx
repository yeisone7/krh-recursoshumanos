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
    'Sin categoría': 'bg-background text-muted-foreground border-border',
  };

  const getCategoryStyle = (cat: string) => {
    return categoryColors[cat] || 'text-primary border-primary/20';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <ClipboardList className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                Profesiograma
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                Artículos asignados por perfil
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-background p-4 rounded-2xl border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Centro Operativo
              </div>
              <p className="font-bold text-sm leading-tight text-foreground">{cName}</p>
            </div>
            <div className="bg-background p-4 rounded-2xl border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> Cargo Asignado
              </div>
              <p className="font-bold text-sm leading-tight text-foreground">{pName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-background border-border/50 font-bold text-[10px] uppercase tracking-widest">
              <Package className="w-3.5 h-3.5 text-primary" />
              {data.items.length} Ítems
            </Badge>
            {requiredItems.length > 0 && (
              <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold text-[10px] uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {requiredItems.length} Obligatorios
              </Badge>
            )}
            {optionalItems.length > 0 && (
              <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 border-dashed font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                <Circle className="w-3.5 h-3.5" />
                {optionalItems.length} Opcionales
              </Badge>
            )}
          </div>

          <Separator className="bg-border/50" />

          {data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-background">
                <Package className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-muted-foreground">Sin artículos</p>
                <p className="text-xs text-muted-foreground/60 max-w-[200px]">Este perfil no tiene dotación configurada aún.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupByCategory(data.items).map(([category, catItems]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border-0 shadow-sm",
                      getCategoryStyle(category).split(' ').find(c => c.startsWith('bg-')) || 'bg-background ',
                      getCategoryStyle(category).split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground'
                    )}>
                      {category}
                    </Badge>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {catItems.map((item) => {
                      const isReq = (item as any).is_required !== false;
                      return (
                        <div
                          key={item.id}
                          className="group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border/50 bg-background hover:bg-primary/[0.02] hover:border-primary/20 transition-all duration-300"
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                            isReq ? "bg-emerald-500 shadow-emerald-500/20" : "bg-background -foreground/30"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold truncate text-foreground">
                                {item.dotation_item_types?.name || '—'}
                              </span>
                              {item.dotation_item_types?.code && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded bg-background border-0 font-mono text-muted-foreground">
                                  {item.dotation_item_types.code}
                                </Badge>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate italic">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="flex h-7 w-12 items-center justify-center rounded-lg bg-background font-black text-xs tabular-nums text-primary">
                              ×{item.quantity}
                            </span>
                            {!isReq && (
                              <Badge variant="outline" className="text-[9px] border-dashed rounded-lg px-2 text-muted-foreground">
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

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border/50 bg-background /10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Última actualización</span>
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(data.updated_at), "dd MMM yyyy", { locale: es })}
            </span>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-background transition-all"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

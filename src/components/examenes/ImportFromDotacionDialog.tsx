import { useState, useMemo } from 'react';
import { Download, Loader2, CheckCircle2, AlertTriangle, Search, Filter, Sparkles, Building2, Briefcase } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useProfesiogramas, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { useExamProfesiogramas, useCreateExamProfesiograma } from '@/hooks/useExamProfesiograma';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ImportFromDotacionDialog({ open, onOpenChange, centers, positions }: Props) {
  const { data: dotacionProfs, isLoading: loadingDot } = useProfesiogramas();
  const { data: examProfs } = useExamProfesiogramas();
  const createMutation = useCreateExamProfesiograma();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'existing'>('all');

  const existingExamKeys = useMemo(() => {
    return new Set(
      (examProfs || []).map(p => `${p.operation_center_id}|${p.position_id}`)
    );
  }, [examProfs]);

  const availableProfs = useMemo(() => {
    if (!dotacionProfs) return [];
    return dotacionProfs.map(p => ({
      ...p,
      alreadyExists: existingExamKeys.has(`${p.operation_center_id}|${p.position_id}`),
    }));
  }, [dotacionProfs, existingExamKeys]);

  const usedCenters = useMemo(() => {
    if (!availableProfs.length) return [];
    const ids = [...new Set(availableProfs.map(p => p.operation_center_id))];
    return centers.filter(c => ids.includes(c.id));
  }, [availableProfs, centers]);

  const filteredProfs = useMemo(() => {
    return availableProfs.filter(p => {
      const cName = (p.operation_centers?.name || centers.find(c => c.id === p.operation_center_id)?.name || '').toLowerCase();
      const pName = (p.positions?.name || positions.find(pos => pos.id === p.position_id)?.name || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || cName.includes(query) || pName.includes(query);
      const matchesCenter = centerFilter === 'all' || p.operation_center_id === centerFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'existing' ? p.alreadyExists : !p.alreadyExists);
      return matchesSearch && matchesCenter && matchesStatus;
    });
  }, [availableProfs, searchQuery, centerFilter, statusFilter, centers, positions]);

  const selectableFiltered = filteredProfs.filter(p => !p.alreadyExists);

  const getCenterName = (id: string) =>
    centers.find(c => c.id === id)?.name || 'Desconocido';
  const getPositionName = (id: string) =>
    positions.find(p => p.id === id)?.name || 'Desconocido';

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAllFiltered = () => {
    if (selectableFiltered.every(p => selectedIds.has(p.id))) {
      const next = new Set(selectedIds);
      selectableFiltered.forEach(p => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      selectableFiltered.forEach(p => next.add(p.id));
      setSelectedIds(next);
    }
  };

  const handleImport = async () => {
    const toImport = availableProfs.filter(p => selectedIds.has(p.id) && !p.alreadyExists);
    if (toImport.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let errors = 0;

    for (const prof of toImport) {
      try {
        await createMutation.mutateAsync({
          operation_center_id: prof.operation_center_id,
          position_id: prof.position_id,
          items: [],
        });
        success++;
      } catch {
        errors++;
      }
    }

    setIsImporting(false);
    setSelectedIds(new Set());

    if (success > 0) {
      toast.success(`${success} profesiograma${success > 1 ? 's' : ''} importado${success > 1 ? 's' : ''} exitosamente`);
    }
    if (errors > 0) {
      toast.error(`${errors} fallaron al importar`);
    }
    if (success > 0) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-hidden p-0 sm:w-full rounded-[2.5rem] border-0 shadow-2xl bg-background ">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border relative overflow-hidden">
          
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Download className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">
                Importar Dotaciones
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" /> Clonar Estructuras Existentes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
          {loadingDot ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-border border-t-primary animate-spin" />
                <Download className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando con Dotaciones...</p>
            </div>
          ) : availableProfs.length === 0 ? (
            <div className="text-center py-16 rounded-[2rem] border border-dashed border-border/50 bg-background">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground leading-relaxed px-8">No se encontraron profesiogramas en el módulo de Dotación para importar.</p>
            </div>
          ) : (
            <>
              {/* Filters Section */}
              <div className="space-y-4 bg-background p-4 rounded-2xl border border-border/40">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por centro o cargo..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none text-xs font-medium transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={centerFilter} onValueChange={setCenterFilter}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/50 text-[10px] font-black uppercase tracking-widest">
                      <SelectValue placeholder="Centro" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos los centros</SelectItem>
                      {usedCenters.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase tracking-widest">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/50 text-[10px] font-black uppercase tracking-widest">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos</SelectItem>
                      <SelectItem value="available" className="text-[10px] font-black uppercase tracking-widest">Disponibles</SelectItem>
                      <SelectItem value="existing" className="text-[10px] font-black uppercase tracking-widest">Ya Importados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selection Summary */}
              {selectableFiltered.length > 0 && (
                <div className="flex items-center justify-between px-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                      checked={selectableFiltered.length > 0 && selectableFiltered.every(p => selectedIds.has(p.id))}
                      onCheckedChange={toggleAllFiltered}
                      className="rounded-md data-[state=checked]:bg-primary"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                      Seleccionar todos ({selectableFiltered.length})
                    </span>
                  </label>
                  <Badge variant="outline" className="h-6 px-3 rounded-xl text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest">
                    {selectedIds.size} Marcados
                  </Badge>
                </div>
              )}

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[300px]">
                {filteredProfs.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-medium text-muted-foreground">No hay registros que coincidan</p>
                  </div>
                ) : (
                  filteredProfs.map((prof) => {
                    const centerName = prof.operation_centers?.name || getCenterName(prof.operation_center_id);
                    const positionName = prof.positions?.name || getPositionName(prof.position_id);
                    const disabled = prof.alreadyExists;
                    const isSelected = selectedIds.has(prof.id);

                    return (
                      <div
                        key={prof.id}
                        className={cn(
                          "group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300",
                          disabled 
                            ? "opacity-40 grayscale bg-background border-border/40" 
                            : isSelected
                              ? "bg-primary/[0.04] border-primary/30 shadow-md shadow-primary/5"
                              : "bg-background border-border/50 hover:border-primary/20 hover:bg-background"
                        )}
                      >
                        {!disabled && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(prof.id)}
                            className="rounded-md data-[state=checked]:bg-primary"
                          />
                        )}
                        {disabled && <CheckCircle2 className="w-4 h-4 text-primary opacity-40 shrink-0" />}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{centerName}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-foreground" />
                            <p className="text-sm font-black tracking-tight text-foreground truncate">{positionName}</p>
                          </div>
                        </div>

                        {disabled ? (
                          <Badge variant="outline" className="h-6 px-2 rounded-lg text-[8px] font-black uppercase tracking-tighter text-primary border-primary/20">
                            Sincronizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-6 px-2 rounded-lg text-[8px] font-black uppercase tracking-tighter border-border bg-background">
                            {prof.items.length} Refs
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-8 bg-background border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Información Importante</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">Los profesiogramas se clonarán sin procedimientos asociados.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 sm:px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || selectedIds.size === 0}
                className="h-11 flex-[2] sm:px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all gap-2"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isImporting ? 'Sincronizando...' : `Importar ${selectedIds.size} Registros`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

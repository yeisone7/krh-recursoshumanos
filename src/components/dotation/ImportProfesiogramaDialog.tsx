import { useState, useMemo } from 'react';
import { Upload, Loader2, FileSpreadsheet, RefreshCw, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useCreateProfesiograma, useUpdateProfesiograma, useProfesiogramas, type Profesiograma } from '@/hooks/useDotationProfesiograma';

export interface ParsedProfesiograma {
  centerName: string;
  positionName: string;
  centerId: string | null;
  positionId: string | null;
  items: { dotation_item_type_id: string; name: string; quantity: number; notes?: string }[];
  status: 'new' | 'update' | 'skip_invalid';
  existingProfId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
  itemTypes: any[];
}

export function ImportProfesiogramaDialog({ open, onOpenChange, centers, positions, itemTypes }: Props) {
  const [parsedData, setParsedData] = useState<ParsedProfesiograma[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [upsertMode, setUpsertMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const createMutation = useCreateProfesiograma();
  const updateMutation = useUpdateProfesiograma();
  const { data: existingProfesiogramas } = useProfesiogramas();

  const existingMap = useMemo(() => {
    const map = new Map<string, Profesiograma>();
    (existingProfesiogramas || []).forEach(p => {
      map.set(`${p.operation_center_id}|${p.position_id}`, p);
    });
    return map;
  }, [existingProfesiogramas]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (rows.length === 0) {
        toast.error('El archivo está vacío');
        return;
      }

      // Build lookup maps
      const centerMap = new Map(centers.map(c => [c.name.toLowerCase().trim(), c]));
      const positionMap = new Map(positions.map(p => [p.name.toLowerCase().trim(), p]));
      const itemTypeByCode = new Map((itemTypes as any[]).map((t: any) => [(t.code || '').toLowerCase().trim(), t]));
      const itemTypeByName = new Map((itemTypes as any[]).map((t: any) => [t.name.toLowerCase().trim(), t]));

      // Group rows by center+position
      const grouped = new Map<string, {
        centerName: string; positionName: string;
        centerId: string | null; positionId: string | null;
        items: { dotation_item_type_id: string; name: string; quantity: number; notes?: string }[];
      }>();

      for (const row of rows) {
        const rawCenter = String(row['Centro de Operación'] || row['Centro de Operación (nombre exacto)'] || '').trim();
        const rawPosition = String(row['Cargo'] || row['Cargo (nombre exacto)'] || '').trim();
        const rawItemCode = String(row['Código Artículo'] || row['Código'] || '').trim();
        const rawItemName = String(row['Artículo'] || '').trim();
        const quantity = parseInt(row['Cantidad']) || 1;
        const notes = String(row['Notas'] || '');

        const center = centerMap.get(rawCenter.toLowerCase());
        const position = positionMap.get(rawPosition.toLowerCase());
        const itemType = itemTypeByCode.get(rawItemCode.toLowerCase()) || itemTypeByName.get(rawItemName.toLowerCase());

        const key = `${rawCenter.toLowerCase()}|${rawPosition.toLowerCase()}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            centerName: rawCenter,
            positionName: rawPosition,
            centerId: center?.id || null,
            positionId: position?.id || null,
            items: [],
          });
        }

        if (itemType) {
          const group = grouped.get(key)!;
          if (!group.items.some(i => i.dotation_item_type_id === itemType.id)) {
            group.items.push({ dotation_item_type_id: itemType.id, name: itemType.name, quantity, notes: notes || undefined });
          }
        }
      }

      // Determine status for each group
      const parsed: ParsedProfesiograma[] = [];
      for (const group of grouped.values()) {
        if (!group.centerId || !group.positionId || group.items.length === 0) {
          parsed.push({ ...group, status: 'skip_invalid' });
          continue;
        }
        const existingKey = `${group.centerId}|${group.positionId}`;
        const existing = existingMap.get(existingKey);
        if (existing) {
          parsed.push({ ...group, status: 'update', existingProfId: existing.id });
        } else {
          parsed.push({ ...group, status: 'new' });
        }
      }

      setParsedData(parsed);
      setIsParsed(true);
    } catch (error) {
      toast.error('Error al leer el archivo Excel');
      console.error(error);
    }

    e.target.value = '';
  };

  const newCount = parsedData.filter(p => p.status === 'new').length;
  const updateCount = parsedData.filter(p => p.status === 'update').length;
  const invalidCount = parsedData.filter(p => p.status === 'skip_invalid').length;

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const prof of parsedData) {
      if (prof.status === 'skip_invalid') continue;
      if (prof.status === 'update' && !upsertMode) continue;

      const items = prof.items.map(i => ({
        dotation_item_type_id: i.dotation_item_type_id,
        quantity: i.quantity,
        notes: i.notes,
      }));

      try {
        if (prof.status === 'new') {
          await createMutation.mutateAsync({
            operation_center_id: prof.centerId!,
            position_id: prof.positionId!,
            items,
          });
          created++;
        } else if (prof.status === 'update' && upsertMode && prof.existingProfId) {
          await updateMutation.mutateAsync({ id: prof.existingProfId, items });
          updated++;
        }
      } catch {
        errors++;
      }
    }

    setIsImporting(false);

    const msgs: string[] = [];
    if (created > 0) msgs.push(`${created} creado${created > 1 ? 's' : ''}`);
    if (updated > 0) msgs.push(`${updated} actualizado${updated > 1 ? 's' : ''}`);
    if (errors > 0) msgs.push(`${errors} error${errors > 1 ? 'es' : ''}`);

    if (created > 0 || updated > 0) {
      toast.success('Importación completada', { description: msgs.join(', ') });
      onOpenChange(false);
      resetState();
    } else {
      toast.info('No se realizaron cambios', { description: msgs.join(', ') });
    }
  };

  const resetState = () => {
    setParsedData([]);
    setIsParsed(false);
    setFileName('');
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const actionableCount = newCount + (upsertMode ? updateCount : 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-2xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background/95 backdrop-blur-xl">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <FileSpreadsheet className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                Importación Masiva
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                Sincroniza profesiogramas desde Excel
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {!isParsed ? (
            <div className="space-y-6">
              <label className="group relative flex flex-col items-center justify-center py-16 border-2 border-dashed border-border/50 rounded-[2rem] cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300">
                <div className="p-5 rounded-2xl bg-muted/20 group-hover:bg-primary/10 transition-colors">
                  <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="mt-4 text-center">
                  <p className="font-black text-sm uppercase tracking-widest text-foreground">Seleccionar Archivo Excel</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Soporta formatos .xlsx y .xls</p>
                </div>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              </label>
              
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Estructura del Archivo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Centro de Operación', 'Cargo', 'Código Artículo', 'Cantidad'].map((col) => (
                    <div key={col} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/50 border border-border/30">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-background border-border/50 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> {fileName}
                </Badge>
                {newCount > 0 && (
                  <Badge className="h-8 rounded-xl px-3 gap-2 bg-green-500/10 text-green-600 border-0 font-bold text-[10px] uppercase tracking-widest">
                    <Plus className="w-3.5 h-3.5" /> {newCount} Nuevos
                  </Badge>
                )}
                {updateCount > 0 && (
                  <Badge className="h-8 rounded-xl px-3 gap-2 bg-primary/10 text-primary border-0 font-bold text-[10px] uppercase tracking-widest">
                    <RefreshCw className="w-3.5 h-3.5" /> {updateCount} Existentes
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge className="h-8 rounded-xl px-3 gap-2 bg-destructive/10 text-destructive border-0 font-bold text-[10px] uppercase tracking-widest">
                    <XCircle className="w-3.5 h-3.5" /> {invalidCount} Inválidos
                  </Badge>
                )}
              </div>

              {/* Upsert toggle */}
              {updateCount > 0 && (
                <div className="flex items-center justify-between p-5 rounded-[2rem] border border-border/50 bg-primary/[0.02]">
                  <div className="space-y-1">
                    <p className="font-black text-[11px] uppercase tracking-widest text-foreground">Modo Actualización (Upsert)</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Sobrescribe dotación en registros existentes</p>
                  </div>
                  <Switch 
                    checked={upsertMode} 
                    onCheckedChange={setUpsertMode}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              )}

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 px-4">Estado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 px-4">Localización / Cargo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 px-4">Dotación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((prof, idx) => (
                      <TableRow key={idx} className={cn(
                        "hover:bg-primary/[0.01] border-border/50 transition-colors",
                        prof.status === 'skip_invalid' && 'opacity-50 grayscale bg-muted/5'
                      )}>
                        <TableCell className="px-4 py-3">
                          {prof.status === 'new' && (
                            <Badge className="h-6 rounded-lg bg-green-500/10 text-green-600 font-black text-[8px] uppercase tracking-widest border-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Nuevo
                            </Badge>
                          )}
                          {prof.status === 'update' && (
                            <Badge className={cn(
                              "h-6 rounded-lg font-black text-[8px] uppercase tracking-widest border-0",
                              upsertMode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              <RefreshCw className="w-3 h-3 mr-1" /> {upsertMode ? 'Actualizar' : 'Omitir'}
                            </Badge>
                          )}
                          {prof.status === 'skip_invalid' && (
                            <Badge className="h-6 rounded-lg bg-destructive/10 text-destructive font-black text-[8px] uppercase tracking-widest border-0">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Inválido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className={cn("text-xs font-bold truncate", !prof.centerId && 'text-destructive')}>
                              {prof.centerName || '—'}
                            </p>
                            <p className={cn("text-[9px] font-black uppercase tracking-widest truncate text-muted-foreground", !prof.positionId && 'text-destructive/70')}>
                              {prof.positionName || 'Cargo no mapeado'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {prof.items.slice(0, 2).map((item, i) => (
                              <Badge key={i} variant="secondary" className="h-5 px-1.5 rounded bg-muted/50 font-bold text-[8px] uppercase tracking-tight text-foreground">
                                {item.name} <span className="ml-1 text-primary">×{item.quantity}</span>
                              </Badge>
                            ))}
                            {prof.items.length > 2 && (
                              <Badge variant="outline" className="h-5 px-1.5 rounded border-border/50 font-bold text-[8px]">
                                +{prof.items.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            {isParsed ? (
              <>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resumen de Carga</span>
                <p className="text-xs font-bold text-muted-foreground">
                  {actionableCount} registros preparados para procesar
                </p>
              </>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                Asegúrate que los nombres coincidan exactamente
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isParsed && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetState} 
                className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-background"
              >
                Cambiar Archivo
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => handleClose(false)}
              className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest border-border/50"
            >
              Cancelar
            </Button>
            {isParsed && (
              <Button 
                size="lg"
                onClick={handleConfirmImport} 
                disabled={isImporting || actionableCount === 0} 
                className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Ejecutar Importación
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Profesiogramas desde Excel
          </DialogTitle>
          <DialogDescription>
            {isParsed
              ? 'Revisa los datos antes de confirmar la importación'
              : 'Selecciona un archivo .xlsx con los profesiogramas a importar'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!isParsed ? (
            /* File upload area */
            <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Haz clic para seleccionar archivo</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx o .xls</p>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            </label>
          ) : (
            <>
              {/* Summary badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <FileSpreadsheet className="w-3 h-3" /> {fileName}
                </Badge>
                {newCount > 0 && (
                  <Badge className="bg-success/10 text-success border-success/20 gap-1">
                    <Plus className="w-3 h-3" /> {newCount} nuevo{newCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {updateCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                    <RefreshCw className="w-3 h-3" /> {updateCount} existente{updateCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                    <XCircle className="w-3 h-3" /> {invalidCount} inválido{invalidCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Upsert toggle */}
              {updateCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Modo actualización (upsert)</p>
                    <p className="text-xs text-muted-foreground">
                      Actualiza los artículos de {updateCount} profesiograma{updateCount > 1 ? 's' : ''} que ya existen
                    </p>
                  </div>
                  <Switch checked={upsertMode} onCheckedChange={setUpsertMode} />
                </div>
              )}

              {/* Preview table */}
              <ScrollArea className="max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Artículos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((prof, idx) => (
                      <TableRow key={idx} className={prof.status === 'skip_invalid' ? 'opacity-50' : ''}>
                        <TableCell>
                          {prof.status === 'new' && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Nuevo
                            </Badge>
                          )}
                          {prof.status === 'update' && (
                            <Badge variant="outline" className={`text-xs gap-1 ${upsertMode ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                              <RefreshCw className="w-3 h-3" /> {upsertMode ? 'Actualizar' : 'Omitir'}
                            </Badge>
                          )}
                          {prof.status === 'skip_invalid' && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" /> Inválido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={!prof.centerId ? 'text-destructive' : ''}>
                            {prof.centerName || '—'}
                          </span>
                          {!prof.centerId && <span className="text-xs text-destructive ml-1">(no encontrado)</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={!prof.positionId ? 'text-destructive' : ''}>
                            {prof.positionName || '—'}
                          </span>
                          {!prof.positionId && <span className="text-xs text-destructive ml-1">(no encontrado)</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prof.items.slice(0, 2).map((item, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {item.name}{item.quantity > 1 && ` x${item.quantity}`}
                              </Badge>
                            ))}
                            {prof.items.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{prof.items.length - 2}</Badge>
                            )}
                            {prof.items.length === 0 && (
                              <span className="text-xs text-destructive">Sin artículos válidos</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-2">
          {isParsed ? (
            <>
              <Button variant="ghost" size="sm" onClick={resetState} className="text-muted-foreground">
                Cambiar archivo
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting || actionableCount === 0}
                  className="gap-2"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isImporting ? 'Importando...' : `Importar ${actionableCount} profesiograma${actionableCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

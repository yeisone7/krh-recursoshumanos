import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Plus, Edit2, Trash2, Loader2, Check, X, Filter, FileSpreadsheet, FileText, ZoomIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

import { useDotationItemTypes, useDeleteDotationItemType, useUpdateDotationItemType } from '@/hooks/useSystemConfig';
import { DotationItemTypeFormDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { DOTATION_CATEGORIES } from '@/types/config';
import type { DotationItemType } from '@/types/config';
import { supabase } from '@/integrations/supabase/client';

const getCategoryLabel = (value: string) =>
  DOTATION_CATEGORIES.find(c => c.value === value)?.label || value;

export default function CatalogosTiposDotacion() {
  const [showDotationForm, setShowDotationForm] = useState(false);
  const [selectedDotationItem, setSelectedDotationItem] = useState<DotationItemType | null>(null);
  const [deleteItem, setDeleteItem] = useState<DotationItemType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ url: string; name: string } | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'code' } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const { data: dotationTypes = [], isLoading } = useDotationItemTypes();
  const deleteMutation = useDeleteDotationItemType();
  const updateMutation = useUpdateDotationItemType();

  // Filtered data
  const filteredTypes = dotationTypes.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterStatus === 'active' && !item.is_active) return false;
    if (filterStatus === 'inactive' && item.is_active) return false;
    return true;
  });

  const handleEdit = (item: DotationItemType) => {
    setSelectedDotationItem(item);
    setShowDotationForm(true);
  };

  const handleCreate = () => {
    setSelectedDotationItem(null);
    setShowDotationForm(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const { count: profCount } = await supabase
        .from('dotation_profesiograma_items')
        .select('id', { count: 'exact', head: true })
        .eq('dotation_item_type_id', deleteItem.id);

      if (profCount && profCount > 0) {
        toast.error('No se puede eliminar', {
          description: `Este tipo de dotación está asociado a ${profCount} profesiograma(s). Elimínelo primero de los profesiogramas.`,
        });
        setDeleteItem(null);
        setDeleteLoading(false);
        return;
      }

      await deleteMutation.mutateAsync(deleteItem.id);
      toast.success('Tipo de dotación eliminado');
    } catch (error: any) {
      toast.error('Error al eliminar', {
        description: error.message || 'No se pudo eliminar el tipo de dotación',
      });
    } finally {
      setDeleteItem(null);
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (item: DotationItemType) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        is_active: !item.is_active,
      });
      toast.success(item.is_active ? 'Tipo desactivado' : 'Tipo activado');
    } catch (error: any) {
      toast.error('Error al cambiar estado', { description: error.message });
    }
  };

  // Inline editing handlers
  const startInlineEdit = (item: DotationItemType, field: 'name' | 'code') => {
    setEditingCell({ id: item.id, field });
    setEditingValue(field === 'name' ? item.name : (item.code || ''));
  };

  const saveInlineEdit = useCallback(async () => {
    if (!editingCell) return;
    const trimmed = editingValue.trim();
    if (editingCell.field === 'name' && !trimmed) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingCell.id,
        [editingCell.field]: trimmed || null,
      });
      toast.success('Actualizado');
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message });
    } finally {
      setEditingCell(null);
    }
  }, [editingCell, editingValue, updateMutation]);

  const cancelInlineEdit = () => setEditingCell(null);

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveInlineEdit();
    if (e.key === 'Escape') cancelInlineEdit();
  };

  // ── Export helpers ──
  const getExportRows = () =>
    filteredTypes.map((item) => ({
      Nombre: item.name,
      Código: item.code || '',
      Categoría: getCategoryLabel(item.category),
      'Requiere Talla': item.requires_size ? 'Sí' : 'No',
      Estado: item.is_active ? 'Activo' : 'Inactivo',
    }));

  const handleExportExcel = () => {
    const rows = getExportRows();
    if (!rows.length) { toast.error('No hay datos para exportar'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tipos de Dotación');
    XLSX.writeFile(wb, `tipos_dotacion_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exportado');
  };

  const handleExportPDF = () => {
    const rows = getExportRows();
    if (!rows.length) { toast.error('No hay datos para exportar'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Catálogo de Tipos de Dotación', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}  |  ${rows.length} registros`, 14, 25);

    const headers = ['Nombre', 'Código', 'Categoría', 'Req. Talla', 'Estado'];
    const colWidths = [80, 30, 55, 30, 25];
    let y = 34;
    // Header row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x + 2, y); x += colWidths[i]; });
    y += 6;
    doc.setFont('helvetica', 'normal');
    rows.forEach((row) => {
      if (y > 190) { doc.addPage(); y = 20; }
      x = 14;
      const vals = [row.Nombre, row.Código, row.Categoría, row['Requiere Talla'], row.Estado];
      vals.forEach((v, i) => { doc.text(String(v).substring(0, 45), x + 2, y); x += colWidths[i]; });
      y += 6;
    });
    doc.save(`tipos_dotacion_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exportado');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2">
            <Shirt className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Tipos de Dotación</h1>
            <p className="text-muted-foreground mt-1">Catálogo de artículos de dotación</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Tipos</CardTitle>
            <CardDescription>Artículos disponibles para entrega de dotación</CardDescription>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="w-full sm:w-auto">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a Excel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="w-full sm:w-auto">
                    <FileText className="w-4 h-4 mr-2" />PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleCreate} className="col-span-2 w-full sm:col-span-1 sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />Nuevo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground sm:w-auto">
              <Filter className="w-4 h-4" />
              Filtros:
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {DOTATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            {(filterCategory !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}>
                Limpiar filtros
              </Button>
            )}
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {filteredTypes.length} de {dotationTypes.length} registros
            </span>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {dotationTypes.length === 0
                ? 'No hay tipos de dotación registrados. Crea el primero.'
                : 'No se encontraron resultados con los filtros aplicados.'}
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              emptyMessage="No se encontraron tipos de dotación"
              items={filteredTypes.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: item.description || getCategoryLabel(item.category),
                badge: <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Activo' : 'Inactivo'}</Badge>,
                itemClassName: !item.is_active ? 'opacity-70' : undefined,
                fields: [
                  { label: 'Código', value: item.code || '-', className: 'col-span-1' },
                  { label: 'Categoría', value: getCategoryLabel(item.category), className: 'col-span-1' },
                  { label: 'Requiere talla', value: item.requires_size ? 'Sí' : 'No', className: 'col-span-1' },
                  { label: 'Imagen', value: (item as any).image_url ? 'Disponible' : 'Sin imagen', className: 'col-span-1' },
                ],
                actions: (
                  <div className="grid w-full grid-cols-3 gap-2">
                    {(item as any).image_url && (
                      <Button variant="outline" size="sm" onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}>
                        <ZoomIn className="mr-2 h-4 w-4" />
                        Ver
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className={(item as any).image_url ? '' : 'col-span-2'}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteItem(item)} className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                ),
              }))}
            />
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Requiere Talla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      {(item as any).image_url ? (
                        <div
                          className="relative group w-10 h-10 cursor-pointer"
                          onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}
                        >
                          <img src={(item as any).image_url} alt={item.name} className="w-10 h-10 rounded object-cover border" />
                          <div className="absolute inset-0 bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Shirt className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    {/* Inline editable: Name */}
                    <TableCell className="font-medium">
                      {editingCell?.id === item.id && editingCell.field === 'name' ? (
                        <div className="flex items-center gap-1">
                          <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyDown={handleInlineKeyDown} className="h-8 text-sm" autoFocus />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-muted-foreground/40" onClick={() => startInlineEdit(item, 'name')} title="Clic para editar">
                          {item.name}
                        </span>
                      )}
                    </TableCell>
                    {/* Inline editable: Code */}
                    <TableCell>
                      {editingCell?.id === item.id && editingCell.field === 'code' ? (
                        <div className="flex items-center gap-1">
                          <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyDown={handleInlineKeyDown} className="h-8 text-sm w-24" autoFocus />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-muted-foreground/40" onClick={() => startInlineEdit(item, 'code')} title="Clic para editar">
                          {item.code || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getCategoryLabel(item.category)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={item.requires_size ? 'bg-accent/20 text-accent-foreground border-accent/30' : 'bg-muted text-muted-foreground border-muted'}>
                        {item.requires_size ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => handleToggleActive(item)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={200}>
                        <div className="flex justify-end gap-1">
                          <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Editar completo</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteItem(item)}><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Eliminar</TooltipContent></Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <DotationItemTypeFormDialog
        key={selectedDotationItem?.id || 'new'}
        open={showDotationForm}
        onOpenChange={setShowDotationForm}
        itemType={selectedDotationItem}
      />

      {/* Image zoom dialog */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-lg p-2">
          <DialogTitle className="sr-only">{zoomImage?.name}</DialogTitle>
          {zoomImage && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={zoomImage.url}
                alt={zoomImage.name}
                className="max-h-[70vh] w-auto rounded-lg object-contain"
              />
              <p className="text-sm font-medium text-foreground">{zoomImage.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de dotación?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{deleteItem?.name}</strong>.
              Si este tipo está asociado a entregas, inventario o profesiogramas, no se podrá eliminar.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

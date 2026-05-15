import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Plus, Edit2, Trash2, Loader2, Check, X, Filter, FileSpreadsheet, FileText, ZoomIn, ShieldCheck, Box } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-border shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-md shadow-primary/10">
              <Shirt className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase leading-tight">
                Tipos de <span className="text-primary">Dotación</span>
              </h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                Gestión centralizada de artículos, tallas y categorías de suministro.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-12 w-12 rounded-xl border-2 p-0">
                    <FileSpreadsheet className="w-5 h-5 text-success" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a Excel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-12 w-12 rounded-xl border-2 p-0">
                    <FileText className="w-5 h-5 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              onClick={handleCreate}
              className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> 
              Nuevo Tipo
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        
        
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Artículos', value: dotationTypes.length, icon: Box, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
          { label: 'Activos', value: dotationTypes.filter(p => p.is_active).length, icon: Check, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
          { label: 'Con Talla', value: dotationTypes.filter(p => p.requires_size).length, icon: Shirt, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
          { label: 'Inactivos', value: dotationTypes.filter(p => !p.is_active).length, icon: X, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 bg-background p-6 transition-all duration-300 hover:shadow-sm",
              stat.border
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                </h2>
              </div>
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 h-12 rounded-2xl bg-background border-2 border-border/50 ">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtros</span>
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-12 w-full lg:w-[220px] rounded-2xl bg-background border-2 border-border/50">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-background">
              <SelectItem value="all" className="font-bold">Todas las categorías</SelectItem>
              {DOTATION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="font-bold">{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-12 w-full lg:w-[160px] rounded-2xl bg-background border-2 border-border/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-background">
              <SelectItem value="all" className="font-bold">Todos</SelectItem>
              <SelectItem value="active" className="font-bold">Activos</SelectItem>
              <SelectItem value="inactive" className="font-bold">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {(filterCategory !== 'all' || filterStatus !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-destructive/10 hover:text-destructive" 
              onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>
          )}
        </div>
        <div className="lg:ml-auto">
          <Badge variant="outline" className="h-8 rounded-xl font-black uppercase tracking-widest text-[10px] px-4 border-2">
            {filteredTypes.length} de {dotationTypes.length} registros
          </Badge>
        </div>
      </div>

      <div className="rounded-[2.5rem] border-2 border-border/50 bg-background p-8">
        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Listado de Artículos</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gestión detallada de tipos de dotación, suministros e imagen corporativa.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : filteredTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-[2rem] border-border/50">
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
                badge: (
                  <Badge 
                    variant="outline" 
                    className={cn("rounded-lg border-2", item.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-background border-muted-foreground/10')}
                  >
                    {item.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
                itemClassName: !item.is_active ? 'opacity-70' : undefined,
                fields: [
                  { label: 'Código', value: item.code || '-', className: 'col-span-1 font-bold' },
                  { label: 'Categoría', value: getCategoryLabel(item.category), className: 'col-span-1 font-bold' },
                  { label: 'Requiere talla', value: item.requires_size ? 'Sí' : 'No', className: 'col-span-1' },
                ],
                actions: (
                  <div className="grid w-full grid-cols-3 gap-2">
                    {(item as any).image_url && (
                      <Button variant="outline" size="sm" className="rounded-xl border-2" onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className={cn("rounded-xl border-2", (item as any).image_url ? "" : "col-span-2")} onClick={() => handleEdit(item)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-2 text-destructive hover:bg-destructive/10" onClick={() => setDeleteItem(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              }))}
            />
            
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="w-20 font-black uppercase tracking-widest text-[10px]">Imagen</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Nombre</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Código</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Categoría</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Req. Talla</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Estado</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((item) => (
                    <TableRow key={item.id} className={cn("group transition-colors hover:bg-primary/[0.02] border-b border-border/50", !item.is_active ? 'opacity-60' : '')}>
                      <TableCell className="py-4">
                        {(item as any).image_url ? (
                          <div
                            className="relative group/img w-12 h-12 cursor-pointer shadow-sm rounded-xl overflow-hidden border-2 border-border/50"
                            onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}
                          >
                            <img src={(item as any).image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-background border-2 border-dashed flex items-center justify-center">
                            <Shirt className="w-5 h-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {editingCell?.id === item.id && editingCell.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyDown={handleInlineKeyDown} className="h-9 rounded-xl bg-background border-none font-bold" autoFocus />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10" onClick={saveInlineEdit}><Check className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={cancelInlineEdit}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-primary transition-colors underline decoration-dashed underline-offset-4 decoration-primary/30" 
                            onClick={() => startInlineEdit(item, 'name')} 
                            title="Clic para editar"
                          >
                            {item.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        {editingCell?.id === item.id && editingCell.field === 'code' ? (
                          <div className="flex items-center gap-1">
                            <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyDown={handleInlineKeyDown} className="h-9 w-24 rounded-xl bg-background border-none font-bold" autoFocus />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10" onClick={saveInlineEdit}><Check className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={cancelInlineEdit}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-primary transition-colors font-bold opacity-80" 
                            onClick={() => startInlineEdit(item, 'code')} 
                            title="Clic para editar"
                          >
                            {item.code || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                        {getCategoryLabel(item.category)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("rounded-lg border-2 font-bold", item.requires_size ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background text-muted-foreground border-transparent')}>
                          {item.requires_size ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive(item)}
                          className="data-[state=checked]:bg-success"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setDeleteItem(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <DotationItemTypeFormDialog
        key={selectedDotationItem?.id || 'new'}
        open={showDotationForm}
        onOpenChange={setShowDotationForm}
        itemType={selectedDotationItem}
      />

      {/* Image zoom dialog */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden p-0 border-none bg-transparent shadow-none">
          <div className="rounded-[2.5rem] border-2 border-primary/20 bg-background -2xl p-6 shadow-2xl">
            <DialogTitle className="sr-only">{zoomImage?.name}</DialogTitle>
            {zoomImage && (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border-2 border-border bg-background">
                  <img
                    src={zoomImage.url}
                    alt={zoomImage.name}
                    className="w-full h-full object-contain p-4 transition-transform hover:scale-105 duration-500"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">{zoomImage.name}</h3>
                  <Badge variant="secondary" className="mt-2 rounded-lg font-bold">Vista Previa de Dotación</Badge>
                </div>
                <Button variant="outline" onClick={() => setZoomImage(null)} className="rounded-xl border-2 font-bold px-8">Cerrar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-2 border-destructive/20 bg-background -2xl p-8 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground mt-4 leading-relaxed">
              Estás a punto de eliminar <span className="text-foreground font-bold">{deleteItem?.name}</span>.
              <br /><br />
              Esta acción no se puede deshacer y fallará si existen registros históricos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-4">
            <AlertDialogCancel disabled={deleteLoading} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] border-2">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteLoading} 
              className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 border-none"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

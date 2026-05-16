import { useState, useCallback, useMemo } from 'react';
import { 
  Shirt, Plus, Edit2, Trash2, Loader2, Check, X, 
  Filter, FileSpreadsheet, FileText, ZoomIn, Box, 
  Settings2, Download, Search
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

import { Card, CardContent } from '@/components/ui/card';
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
  const [zoomImage, setZoomImage] = useState<{ url: string; name: string } | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'code' } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const { data: dotationTypes = [], isLoading } = useDotationItemTypes();
  const deleteMutation = useDeleteDotationItemType();
  const updateMutation = useUpdateDotationItemType();

  // Filtered data
  const filteredTypes = useMemo(() => {
    return dotationTypes.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterStatus === 'active' && !item.is_active) return false;
      if (filterStatus === 'inactive' && item.is_active) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(item.code || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [dotationTypes, filterCategory, filterStatus, searchQuery]);

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

  const stats = useMemo(() => ({
    total: dotationTypes.length,
    active: dotationTypes.filter(p => p.is_active).length,
    withSize: dotationTypes.filter(p => p.requires_size).length,
    inactive: dotationTypes.filter(p => !p.is_active).length,
  }), [dotationTypes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Gestión de Suministros</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Tipos de Dotación
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Gestión centralizada de artículos, tallas y categorías de suministro para el personal.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleExportExcel} className="h-10 w-10 rounded-lg border-slate-200 hover:bg-slate-50 transition-colors">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar Excel</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleExportPDF} className="h-10 w-10 rounded-lg border-slate-200 hover:bg-slate-50 transition-colors">
                      <FileText className="w-4 h-4 text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button 
              onClick={handleCreate}
              className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              NUEVO TIPO
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Estadísticas - Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Artículos', value: stats.total, icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activos', value: stats.active, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Con Talla', value: stats.withSize, icon: Shirt, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Inactivos', value: stats.inactive, icon: X, color: 'text-slate-400', bg: 'bg-slate-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : kpi.value}
                  </p>
                </div>
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado - Flat Style */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-4xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white transition-all text-sm"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-10 w-full sm:w-[200px] rounded-lg bg-white border-slate-200 text-sm font-medium">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">Todas las categorías</SelectItem>
                {DOTATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="font-medium text-sm">{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 w-full sm:w-[150px] rounded-lg bg-white border-slate-200 text-sm font-medium">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">Todos</SelectItem>
                <SelectItem value="active" className="font-medium text-sm">Activos</SelectItem>
                <SelectItem value="inactive" className="font-medium text-sm">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {(filterCategory !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 rounded-lg font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs tracking-wider"
                onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearchQuery(''); }}
              >
                <X className="w-3.5 h-3.5 mr-2" />
                LIMPIAR FILTROS
              </Button>
            )}
            <Badge variant="outline" className="h-8 rounded-lg font-bold text-[10px] px-3 bg-slate-50 border-slate-200 text-slate-500 uppercase tracking-widest whitespace-nowrap">
              {filteredTypes.length} de {dotationTypes.length} artículos
            </Badge>
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <Box className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No se encontraron artículos</h3>
                <p className="text-slate-500 text-sm font-medium">
                  Prueba ajustando los filtros o creando un nuevo tipo de dotación.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="w-20 font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-6 py-4 text-center">Imagen</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-4">Artículo</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Código</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Categoría</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Req. Talla</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((item) => (
                    <TableRow key={item.id} className={cn("group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors", !item.is_active && "bg-slate-50/30")}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex justify-center">
                          {(item as any).image_url ? (
                            <div
                              className="relative group/img w-11 h-11 cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-white"
                              onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}
                            >
                              <img src={(item as any).image_url} alt={item.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center">
                              <Shirt className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pl-4">
                        {editingCell?.id === item.id && editingCell.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <Input 
                              value={editingValue} 
                              onChange={(e) => setEditingValue(e.target.value)} 
                              onKeyDown={handleInlineKeyDown} 
                              className="h-8 rounded-md bg-white border-blue-200 text-sm font-bold w-full max-w-[200px]" 
                              autoFocus 
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span 
                              className="font-bold text-sm text-slate-900 cursor-pointer hover:text-blue-600 transition-colors" 
                              onClick={() => startInlineEdit(item, 'name')}
                            >
                              {item.name}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 line-clamp-1 max-w-[200px]">{item.description || 'Sin descripción'}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.id === item.id && editingCell.field === 'code' ? (
                          <div className="flex items-center gap-1">
                            <Input 
                              value={editingValue} 
                              onChange={(e) => setEditingValue(e.target.value)} 
                              onKeyDown={handleInlineKeyDown} 
                              className="h-8 rounded-md bg-white border-blue-200 text-xs font-bold w-24" 
                              autoFocus 
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className="h-6 rounded-md bg-slate-100 text-slate-600 border-none font-bold text-[10px] cursor-pointer hover:bg-slate-200 transition-colors"
                            onClick={() => startInlineEdit(item, 'code')}
                          >
                            {item.code || 'SIN CÓDIGO'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{getCategoryLabel(item.category)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                            item.requires_size ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-400"
                          )}
                        >
                          {item.requires_size ? 'SÍ' : 'NO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => handleToggleActive(item)}
                            className="scale-90 data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
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
          )}
        </div>
      </Card>

      <DotationItemTypeFormDialog
        key={selectedDotationItem?.id || 'new'}
        open={showDotationForm}
        onOpenChange={setShowDotationForm}
        itemType={selectedDotationItem}
      />

      {/* Image zoom dialog */}
      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border border-slate-200 rounded-xl bg-white">
          <DialogTitle className="sr-only">{zoomImage?.name}</DialogTitle>
          {zoomImage && (
            <div className="flex flex-col">
              <div className="bg-slate-50 p-4 border-b border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{zoomImage.name}</h3>
              </div>
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={zoomImage.url}
                    alt={zoomImage.name}
                    className="w-full h-full object-contain p-4"
                  />
                </div>
                <Button variant="outline" onClick={() => setZoomImage(null)} className="rounded-lg border-slate-200 font-bold px-8 h-10 text-slate-600">Cerrar Vista</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white p-0 overflow-hidden max-w-md">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">¿Eliminar artículo?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Estás a punto de eliminar <span className="text-slate-900 font-bold">{deleteItem?.name}</span>.
                Esta acción no se puede deshacer y puede fallar si existen registros vinculados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <AlertDialogCancel disabled={deleteLoading} className="flex-1 h-12 rounded-lg font-bold border-slate-200 bg-white uppercase text-xs tracking-widest shadow-none">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteLoading} 
              className="flex-1 h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest shadow-none"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              ELIMINAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

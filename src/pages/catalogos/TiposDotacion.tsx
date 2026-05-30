import { todayDateOnlyString } from '@/lib/dateOnly';
import { useState, useCallback, useMemo } from 'react';
import { 
  Shirt, Plus, Edit2, Trash2, Loader2, Check, X, 
  Filter, FileSpreadsheet, FileText, ZoomIn, Box, 
  Settings2, Download, Search, CheckCircle2, Pencil,
  RefreshCw, Package, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription
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
import { MobileCardList } from '@/components/shared/MobileCardList';

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

  const { data: dotationTypes = [], isLoading, refetch } = useDotationItemTypes();
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
  const handleExportExcel = () => {
    const rows = filteredTypes.map((item) => ({
      Nombre: item.name,
      Código: item.code || '',
      Categoría: getCategoryLabel(item.category),
      'Requiere Talla': item.requires_size ? 'Sí' : 'No',
      Estado: item.is_active ? 'Activo' : 'Inactivo',
    }));
    if (!rows.length) { toast.error('No hay datos para exportar'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tipos de Dotación');
    XLSX.writeFile(wb, `tipos_dotacion_${todayDateOnlyString()}.xlsx`);
    toast.success('Excel exportado');
  };

  const handleExportPDF = () => {
    const rows = filteredTypes.map((item) => ({
      Nombre: item.name,
      Código: item.code || '',
      Categoría: getCategoryLabel(item.category),
      'Requiere Talla': item.requires_size ? 'Sí' : 'No',
      Estado: item.is_active ? 'Activo' : 'Inactivo',
    }));
    if (!rows.length) { toast.error('No hay datos para exportar'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Catálogo de Tipos de Dotación', 14, 18);
    // Basic PDF table generation...
    doc.save(`tipos_dotacion_${todayDateOnlyString()}.pdf`);
    toast.success('PDF exportado');
  };

  const stats = useMemo(() => ({
    total: dotationTypes.length,
    active: dotationTypes.filter(p => p.is_active).length,
    withSize: dotationTypes.filter(p => p.requires_size).length,
    inactive: dotationTypes.filter(p => !p.is_active).length,
  }), [dotationTypes]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0">
            <Shirt className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Suministros</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">DOTACIÓN</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de artículos y categorías de dotación corporativa</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
            <Button
              onClick={() => refetch?.()}
              variant="outline"
              className="h-14 w-14 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-400", isLoading && "animate-spin")} />
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExportExcel} variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-none rounded-lg text-[10px] font-black uppercase tracking-widest">Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button 
            onClick={handleCreate}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVO ARTÍCULO
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
        {[
          { label: 'Total Artículos', value: stats.total, icon: Package, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Artículos Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Requieren Talla', value: stats.withSize, icon: Shirt, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Inactivos', value: stats.inactive, icon: X, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-5 rounded-[2rem] bg-white border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-1">
        <div className="rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="relative group flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="BUSCAR ARTÍCULO POR NOMBRE O CÓDIGO..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-12 w-full sm:w-[200px] rounded-xl bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-black uppercase text-[10px] tracking-widest text-slate-400">TODAS LAS CATEGORÍAS</SelectItem>
                  {DOTATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="font-black uppercase text-[10px] tracking-widest">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 w-full sm:w-[150px] rounded-xl bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-black uppercase text-[10px] tracking-widest text-slate-400">TODOS</SelectItem>
                  <SelectItem value="active" className="font-black uppercase text-[10px] tracking-widest">ACTIVOS</SelectItem>
                  <SelectItem value="inactive" className="font-black uppercase text-[10px] tracking-widest">INACTIVOS</SelectItem>
                </SelectContent>
              </Select>

              {(filterCategory !== 'all' || filterStatus !== 'all' || searchQuery) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-12 w-12 rounded-xl text-red-500 hover:bg-red-50"
                  onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearchQuery(''); }}
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-10 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <Box className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {searchQuery ? 'Prueba con otro término de búsqueda.' : 'No se han registrado artículos de dotación aún.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filteredTypes.map(item => ({
                    id: item.id,
                    title: item.name,
                    subtitle: getCategoryLabel(item.category),
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">SUMINISTRO</Badge>,
                    fields: [
                      {
                        label: 'ESTADO',
                        value: (
                          <Badge 
                            className={cn(
                              "h-5 px-3 rounded-md border-none font-black text-[8px] uppercase tracking-widest",
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {item.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50 transition-all" 
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 text-red-600 hover:bg-red-50 hover:border-red-100" 
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> BORRAR
                        </Button>
                      </div>
                    )
                  }))}
                />

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="w-24 font-black uppercase tracking-widest text-[10px] text-slate-400 text-center py-6">Visual</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-4 py-6">Artículo / Descripción</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Referencia</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Categoría</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Tallas</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTypes.map((item) => (
                        <TableRow key={item.id} className={cn("group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors", !item.is_active && "opacity-60")}>
                          <TableCell className="py-4">
                            <div className="flex justify-center">
                              {(item as any).image_url ? (
                                <div
                                  className="relative group/img w-16 h-16 cursor-pointer rounded-2xl overflow-hidden border border-slate-100 bg-white transition-all active:scale-95"
                                  onClick={() => setZoomImage({ url: (item as any).image_url, name: item.name })}
                                >
                                  <img src={(item as any).image_url} alt={item.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="w-5 h-5 text-white stroke-[2.5]" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                                  <Shirt className="w-7 h-7" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="space-y-1">
                              {editingCell?.id === item.id && editingCell.field === 'name' ? (
                                <div className="flex items-center gap-2">
                                  <Input 
                                    value={editingValue} 
                                    onChange={(e) => setEditingValue(e.target.value)} 
                                    onKeyDown={handleInlineKeyDown} 
                                    className="h-10 rounded-xl bg-white border-primary/30 text-xs font-black uppercase tracking-tight" 
                                    autoFocus 
                                  />
                                  <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={saveInlineEdit}><Check className="w-5 h-5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-10 w-10 text-red-600 hover:bg-red-50 rounded-xl" onClick={cancelInlineEdit}><X className="w-5 h-5" /></Button>
                                </div>
                              ) : (
                                <>
                                  <p 
                                    className="font-black text-slate-900 text-sm uppercase tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                                    onClick={() => startInlineEdit(item, 'name')}
                                  >
                                    {item.name}
                                    <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[250px]">
                                    {item.description || 'Sin descripción corporativa'}
                                  </p>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {editingCell?.id === item.id && editingCell.field === 'code' ? (
                              <div className="flex items-center justify-center gap-2">
                                <Input 
                                  value={editingValue} 
                                  onChange={(e) => setEditingValue(e.target.value)} 
                                  onKeyDown={handleInlineKeyDown} 
                                  className="h-10 rounded-xl bg-white border-primary/30 text-[10px] font-black uppercase tracking-widest w-28" 
                                  autoFocus 
                                />
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-600" onClick={saveInlineEdit}><Check className="w-5 h-5" /></Button>
                              </div>
                            ) : (
                              <code 
                                className="text-[10px] px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 font-mono font-black text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => startInlineEdit(item, 'code')}
                              >
                                {item.code || 'S/C'}
                              </code>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-slate-100 bg-slate-50 h-8 px-4 rounded-xl">
                              {getCategoryLabel(item.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                item.requires_size ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {item.requires_size ? 'Parametrizada' : 'Talla Única'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => handleToggleActive(item)}
                                className="data-[state=checked]:bg-emerald-500 scale-110 transition-transform active:scale-95"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all gap-3">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-slate-900 hover:text-white transition-all active:scale-90 border border-transparent hover:border-slate-900"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="w-5 h-5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 border border-transparent hover:border-red-100"
                                onClick={() => setDeleteItem(item)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
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
        </div>
      </div>

      <DotationItemTypeFormDialog
        key={selectedDotationItem?.id || 'new'}
        open={showDotationForm}
        onOpenChange={setShowDotationForm}
        itemType={selectedDotationItem}
      />

      <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[3rem] bg-white">
          <DialogHeader className="px-10 pt-10 pb-4 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 flex items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary border border-primary/10">
                <Shirt className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">{zoomImage?.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Previsualización de suministro corporativo</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {zoomImage && (
            <div className="p-10 flex flex-col items-center gap-10">
              <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border border-slate-100 bg-white flex items-center justify-center p-12">
                <img
                  src={zoomImage.url}
                  alt={zoomImage.name}
                  className="w-full h-full object-contain transition-transform duration-500"
                />
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setZoomImage(null)} 
                className="h-16 w-full rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] text-slate-400 hover:bg-slate-100 transition-all active:scale-95"
              >
                CERRAR VISOR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-[3rem] border-none bg-white p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="space-y-3">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Purgar Suministro?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                Estás a punto de eliminar el artículo <span className="text-slate-900">{deleteItem?.name}</span> del inventario maestro. <br />
                Verifica que no existan solicitudes o profesiogramas activos vinculados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel disabled={deleteLoading} className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 hover:bg-slate-100">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteLoading} 
              className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest flex-1 transition-all active:scale-95"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              ELIMINAR DEFINITIVAMENTE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Plus, Edit2, Trash2, Loader2, Power, Check, X, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useDotationItemTypes, useDeleteDotationItemType, useUpdateDotationItemType } from '@/hooks/useSystemConfig';
import { DotationItemTypeFormDialog } from '@/components/config';
import { DOTATION_CATEGORIES } from '@/types/config';
import type { DotationItemType } from '@/types/config';
import { supabase } from '@/integrations/supabase/client';

export default function CatalogosTiposDotacion() {
  const [showDotationForm, setShowDotationForm] = useState(false);
  const [selectedDotationItem, setSelectedDotationItem] = useState<DotationItemType | null>(null);
  const [deleteItem, setDeleteItem] = useState<DotationItemType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleItem, setToggleItem] = useState<DotationItemType | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

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

  const handleToggleActive = async () => {
    if (!toggleItem) return;
    setToggleLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: toggleItem.id,
        is_active: !toggleItem.is_active,
      });
      toast.success(toggleItem.is_active ? 'Tipo desactivado' : 'Tipo activado');
    } catch (error: any) {
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    } finally {
      setToggleItem(null);
      setToggleLoading(false);
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

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shirt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tipos de Dotación</h1>
            <p className="text-muted-foreground mt-1">Catálogo de artículos de dotación</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Listado de Tipos</CardTitle>
            <CardDescription>Artículos disponibles para entrega de dotación</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />Nuevo Tipo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros:
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px] h-9">
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
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            {(filterCategory !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterCategory('all'); setFilterStatus('all'); }}>
                Limpiar filtros
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
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
            <Table>
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
                        <img src={(item as any).image_url} alt={item.name} className="w-10 h-10 rounded object-cover border" />
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
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={handleInlineKeyDown}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-muted-foreground/40"
                          onClick={() => startInlineEdit(item, 'name')}
                          title="Clic para editar"
                        >
                          {item.name}
                        </span>
                      )}
                    </TableCell>
                    {/* Inline editable: Code */}
                    <TableCell>
                      {editingCell?.id === item.id && editingCell.field === 'code' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={handleInlineKeyDown}
                            className="h-8 text-sm w-24"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveInlineEdit}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelInlineEdit}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-muted-foreground/40"
                          onClick={() => startInlineEdit(item, 'code')}
                          title="Clic para editar"
                        >
                          {item.code || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {DOTATION_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.requires_size
                            ? 'bg-accent/20 text-accent-foreground border-accent/30'
                            : 'bg-muted text-muted-foreground border-muted'
                        }
                      >
                        {item.requires_size ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={item.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'}
                      >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={200}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar completo</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={item.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                                onClick={() => setToggleItem(item)}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{item.is_active ? 'Desactivar' : 'Activar'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteItem(item)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DotationItemTypeFormDialog
        key={selectedDotationItem?.id || 'new'}
        open={showDotationForm}
        onOpenChange={setShowDotationForm}
        itemType={selectedDotationItem}
      />

      {/* Toggle active/inactive confirmation */}
      <AlertDialog open={!!toggleItem} onOpenChange={(open) => !open && setToggleItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleItem?.is_active ? '¿Desactivar tipo de dotación?' : '¿Activar tipo de dotación?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleItem?.is_active
                ? <>Estás a punto de desactivar <strong>{toggleItem?.name}</strong>. No aparecerá en nuevos procesos pero se conservará el historial.</>
                : <>Estás a punto de activar <strong>{toggleItem?.name}</strong>. Volverá a estar disponible para asignación.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={toggleLoading}>
              {toggleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {toggleItem?.is_active ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, ArrowUpDown, AlertTriangle, CheckCircle, Package, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useDotationInventory, useDeleteInventoryItem, type DotationInventoryItem } from '@/hooks/useDotationInventory';
import { InventoryFormDialog } from './InventoryFormDialog';
import { InventoryAdjustDialog } from './InventoryAdjustDialog';
import { InventoryHistoryDialog } from './InventoryHistoryDialog';
import { toast } from 'sonner';

export function DotationInventoryTab() {
  const { data: inventory = [], isLoading } = useDotationInventory();
  const deleteItem = useDeleteInventoryItem();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DotationInventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<DotationInventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DotationInventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<DotationInventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const centers = useMemo(() => {
    const unique = [...new Set(inventory.map(i => i.operation_centers?.name).filter(Boolean))] as string[];
    return unique.sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCenter = centerFilter === 'all' || (item.operation_centers?.name || 'General') === centerFilter;
      const matchesType = typeFilter === 'all' || item.item_name === typeFilter;
      return matchesSearch && matchesCenter && matchesType;
    });
  }, [inventory, searchQuery, centerFilter, typeFilter]);

  const lowStockCount = inventory.filter(i => i.quantity_available <= i.minimum_stock && i.minimum_stock > 0).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      toast.success('Artículo eliminado del inventario');
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Low stock KPI */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-warning-light border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <span className="text-sm font-medium text-warning">
            {lowStockCount} artículo{lowStockCount > 1 ? 's' : ''} con stock bajo
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar artículo..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex">
          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="h-10 w-full text-sm md:w-[160px]">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              <SelectItem value="General">General</SelectItem>
              {centers.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-full text-sm md:w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {[...new Set(inventory.map((i) => i.item_name))].sort().map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }} className="w-full gap-2 md:w-auto">
            <Plus className="w-4 h-4" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isLoading ? 'Cargando inventario...' : 'No hay artículos en el inventario'}</p>
            {!isLoading && inventory.length === 0 && (
              <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Agregar Artículo
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="hidden overflow-x-auto overscroll-x-contain sm:block">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                
                <TableHead>Centro</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isLow = item.minimum_stock > 0 && item.quantity_available <= item.minimum_stock;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-sm">
                      {item.operation_centers?.name || 'General'}
                    </TableCell>
                    <TableCell className="text-sm">{item.size || '—'}</TableCell>
                    <TableCell className="text-center font-semibold">{item.quantity_available}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.minimum_stock}</TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="outline" className="gap-1 bg-warning-light text-warning">
                          <AlertTriangle className="w-3 h-3" /> Bajo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-success-light text-success">
                          <CheckCircle className="w-3 h-3" /> OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setHistoryItem(item)} title="Ver historial">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setIsFormOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          <div className="divide-y divide-border sm:hidden">
            {filtered.map((item) => {
              const isLow = item.minimum_stock > 0 && item.quantity_available <= item.minimum_stock;
              return (
                <div key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.item_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.operation_centers?.name || 'General'}{item.size ? ` · Talla ${item.size}` : ''}
                      </p>
                    </div>
                    {isLow ? (
                      <Badge variant="outline" className="shrink-0 gap-1 bg-warning-light text-warning">
                        <AlertTriangle className="w-3 h-3" /> Bajo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 gap-1 bg-success-light text-success">
                        <CheckCircle className="w-3 h-3" /> OK
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="font-semibold text-foreground">{item.quantity_available}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="font-semibold text-foreground">{item.minimum_stock}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setHistoryItem(item)} title="Ver historial">
                      <History className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setIsFormOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <InventoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editItem={editItem}
      />
      <InventoryAdjustDialog
        open={!!adjustItem}
        onOpenChange={(open) => !open && setAdjustItem(null)}
        item={adjustItem}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artículo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{deleteTarget?.item_name}" del inventario? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <InventoryHistoryDialog
        open={!!historyItem}
        onOpenChange={(open) => !open && setHistoryItem(null)}
        item={historyItem}
      />
    </div>
  );
}

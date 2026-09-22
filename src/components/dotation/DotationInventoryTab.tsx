import { Fragment, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowRightLeft, AlertTriangle, CheckCircle, Package, History, ChevronDown, ChevronRight } from 'lucide-react';

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
import { InventoryTransferDialog } from './InventoryTransferDialog';
import { toast } from 'sonner';

interface DotationInventoryTabProps {
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

interface InventoryGroup {
  key: string;
  name: string;
  centerName: string;
  items: DotationInventoryItem[];
  totalStock: number;
  totalMinimum: number;
  lowStockItems: number;
  sizeCount: number;
}

export function DotationInventoryTab({
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: DotationInventoryTabProps) {
  const { data: inventory = [], isLoading } = useDotationInventory();
  const deleteItem = useDeleteInventoryItem();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DotationInventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<DotationInventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DotationInventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<DotationInventoryItem | null>(null);
  const [transferItem, setTransferItem] = useState<DotationInventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

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

  const groupedInventory = useMemo<InventoryGroup[]>(() => {
    const groups = new Map<string, DotationInventoryItem[]>();

    filtered.forEach((item) => {
      const centerKey = item.operation_center_id || 'general';
      const articleKey = item.item_name.trim().toLocaleLowerCase('es');
      const key = `${centerKey}::${articleKey}`;
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });

    return [...groups.entries()]
      .map(([key, items]) => {
        const sortedItems = [...items].sort((a, b) => {
          const centerComparison = (a.operation_centers?.name || 'General').localeCompare(
            b.operation_centers?.name || 'General',
            'es',
          );
          if (centerComparison !== 0) return centerComparison;
          return (a.size || '').localeCompare(b.size || '', 'es', { numeric: true });
        });

        return {
          key,
          name: items[0].item_name.trim(),
          centerName: items[0].operation_centers?.name || 'General',
          items: sortedItems,
          totalStock: items.reduce((total, item) => total + item.quantity_available, 0),
          totalMinimum: items.reduce((total, item) => total + item.minimum_stock, 0),
          lowStockItems: items.filter(
            (item) => item.minimum_stock > 0 && item.quantity_available <= item.minimum_stock,
          ).length,
          sizeCount: new Set(items.map((item) => item.size).filter(Boolean)).size,
        };
      })
      .sort((a, b) => {
        const centerComparison = a.centerName.localeCompare(b.centerName, 'es');
        return centerComparison !== 0 ? centerComparison : a.name.localeCompare(b.name, 'es');
      });
  }, [filtered]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const lowStockCount = inventory.filter(i => i.quantity_available <= i.minimum_stock && i.minimum_stock > 0).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      toast.success('Artículo eliminado del inventario');
    } catch (error: unknown) {
      toast.error('Error al eliminar', {
        description: error instanceof Error ? error.message : 'No fue posible eliminar el artículo.',
      });
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
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-background border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
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
          {canCreate && (
            <Button onClick={() => { setEditItem(null); setIsFormOpen(true); }} className="w-full gap-2 md:w-auto">
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isLoading ? 'Cargando inventario...' : 'No hay artículos en el inventario'}</p>
            {!isLoading && inventory.length === 0 && canCreate && (
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
              {groupedInventory.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <TableRow className="border-t-2 border-border bg-muted/60 hover:bg-muted/80">
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="h-auto max-w-full justify-start gap-2 px-0 py-1 font-semibold hover:bg-transparent"
                          onClick={() => toggleGroup(group.key)}
                          aria-expanded={!isCollapsed}
                          aria-label={`${isCollapsed ? 'Mostrar' : 'Ocultar'} detalle de ${group.name}`}
                        >
                          {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                          <span className="truncate">{group.name}</span>
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            {group.items.length} {group.items.length === 1 ? 'registro' : 'registros'}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        {group.centerName}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        {group.sizeCount > 0 ? `${group.sizeCount} ${group.sizeCount === 1 ? 'talla' : 'tallas'}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-base font-bold text-foreground">{group.totalStock}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground">{group.totalMinimum}</TableCell>
                      <TableCell>
                        {group.lowStockItems > 0 ? (
                          <Badge variant="outline" className="gap-1 bg-warning-light text-warning">
                            <AlertTriangle className="w-3 h-3" /> {group.lowStockItems} {group.lowStockItems === 1 ? 'bajo' : 'bajos'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 bg-success-light text-success">
                            <CheckCircle className="w-3 h-3" /> OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {!isCollapsed && group.items.map((item) => {
                      const isLow = item.minimum_stock > 0 && item.quantity_available <= item.minimum_stock;
                      return (
                        <TableRow key={item.id} className="bg-background/60">
                          <TableCell className="pl-12 text-xs font-medium uppercase tracking-wide text-muted-foreground">Detalle</TableCell>
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
                              <Button aria-label="Ver historial" variant="ghost" size="sm" onClick={() => setHistoryItem(item)} title="Ver historial">
                                <History className="w-4 h-4" />
                              </Button>
                              {canUpdate && (
                                <>
                                  <Button aria-label="Ajustar existencias" title="Ajustar existencias" variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>
                                    <ArrowUpDown className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTransferItem(item)}
                                    disabled={item.quantity_available === 0}
                                    aria-label="Trasladar a otro centro"
                                    title="Trasladar a otro centro"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </Button>
                                  <Button aria-label="Editar artículo" title="Editar artículo" variant="ghost" size="sm" onClick={() => { setEditItem(item); setIsFormOpen(true); }}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {canDelete && (
                                <Button aria-label="Eliminar artículo" title="Eliminar artículo" variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          </div>
          <div className="divide-y divide-border sm:hidden">
            {groupedInventory.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key);
              return (
                <div key={group.key} className="p-4">
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-between gap-3 px-0 py-0 text-left hover:bg-transparent"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                      <span className="truncate font-semibold">{group.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-bold text-foreground">{group.totalStock}</span>
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
                    </span>
                  </Button>
                  <div className="mt-2 flex items-center justify-between gap-2 pl-6">
                    <span className="text-xs text-muted-foreground">
                      {group.centerName} · {group.items.length} {group.items.length === 1 ? 'talla' : 'tallas'}
                    </span>
                    {group.lowStockItems > 0 ? (
                      <Badge variant="outline" className="shrink-0 gap-1 bg-warning-light text-warning">
                        <AlertTriangle className="w-3 h-3" /> {group.lowStockItems} {group.lowStockItems === 1 ? 'bajo' : 'bajos'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 gap-1 bg-success-light text-success">
                        <CheckCircle className="w-3 h-3" /> OK
                      </Badge>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
                      {group.items.map((item) => {
                        const isLow = item.minimum_stock > 0 && item.quantity_available <= item.minimum_stock;
                        return (
                          <div key={item.id} className="space-y-3 rounded-lg bg-background p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="truncate text-xs text-muted-foreground">
                                {item.operation_centers?.name || 'General'}{item.size ? ` · Talla ${item.size}` : ''}
                              </p>
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
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Stock</p>
                                <p className="font-semibold text-foreground">{item.quantity_available}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Mínimo</p>
                                <p className="font-semibold text-foreground">{item.minimum_stock}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <Button aria-label="Ver historial" variant="ghost" size="sm" onClick={() => setHistoryItem(item)} title="Ver historial">
                                <History className="w-4 h-4" />
                              </Button>
                              {canUpdate && (
                                <>
                                  <Button aria-label="Ajustar existencias" title="Ajustar existencias" variant="ghost" size="sm" onClick={() => setAdjustItem(item)}>
                                    <ArrowUpDown className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setTransferItem(item)} disabled={item.quantity_available === 0} aria-label="Trasladar a otro centro" title="Trasladar a otro centro">
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </Button>
                                  <Button aria-label="Editar artículo" title="Editar artículo" variant="ghost" size="sm" onClick={() => { setEditItem(item); setIsFormOpen(true); }}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {canDelete && (
                                <Button aria-label="Eliminar artículo" title="Eliminar artículo" variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
      <InventoryTransferDialog
        open={!!transferItem}
        onOpenChange={(open) => !open && setTransferItem(null)}
        item={transferItem}
      />
    </div>
  );
}

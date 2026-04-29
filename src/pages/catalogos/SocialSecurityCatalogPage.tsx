import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { SocialSecurityCatalogFormDialog } from '@/components/config/SocialSecurityCatalogFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { CatalogItem, CatalogIPS } from '@/hooks/useSocialSecurityCatalogs';

interface SocialSecurityCatalogPageProps {
  title: string;
  description: string;
  data: (CatalogItem | CatalogIPS)[];
  isLoading: boolean;
  onCreate: (item: Partial<CatalogItem | CatalogIPS>) => void;
  onUpdate: (item: Partial<CatalogItem | CatalogIPS> & { id: string }) => void;
  onDelete: (id: string) => void;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  showIPSFields?: boolean;
}

export function SocialSecurityCatalogPage({
  title,
  description,
  data,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
  isDeleting,
  showIPSFields = false,
}: SocialSecurityCatalogPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | CatalogIPS | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (item: CatalogItem | CatalogIPS) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = (formData: Partial<CatalogItem | CatalogIPS>) => {
    if (editItem) {
      onUpdate({ ...formData, id: editItem.id } as Partial<CatalogItem | CatalogIPS> & { id: string });
    } else {
      onCreate(formData);
    }
    setEditItem(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva {title}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, código o NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron resultados' : `No hay ${title.toLowerCase()}s registradas`}
            </div>
          ) : (
            <>
              <MobileCardList
                className="md:hidden"
                items={filteredData.map((item) => ({
                  id: item.id,
                  title: item.name,
                  subtitle: item.nit ? `NIT: ${item.nit}` : 'Sin NIT registrado',
                  badge: (
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  ),
                  fields: [
                    { label: 'Código', value: item.code || '-' },
                    ...(showIPSFields ? [{ label: 'Ciudad', value: (item as CatalogIPS).city || '-' }] : []),
                  ],
                  actions: (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                        Eliminar
                      </Button>
                    </>
                  ),
                }))}
              />

              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>NIT</TableHead>
                      {showIPSFields && <TableHead>Ciudad</TableHead>}
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.code || '-'}</TableCell>
                        <TableCell>{item.nit || '-'}</TableCell>
                        {showIPSFields && <TableCell>{(item as CatalogIPS).city || '-'}</TableCell>}
                        <TableCell>
                          <Badge variant={item.is_active ? 'default' : 'secondary'}>
                            {item.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
        </CardContent>
      </Card>

      <SocialSecurityCatalogFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditItem(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
        editItem={editItem}
        title={title}
        showIPSFields={showIPSFields}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

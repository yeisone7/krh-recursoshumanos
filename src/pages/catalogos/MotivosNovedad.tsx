import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useNoveltyReasons, useDeleteNoveltyReason, type NoveltyReason } from '@/hooks/useNoveltyReasons';
import { NoveltyReasonFormDialog } from '@/components/config/NoveltyReasonFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { toast } from '@/hooks/use-toast';

export default function MotivosNovedad() {
  const { data: reasons = [], isLoading } = useNoveltyReasons();
  const deleteReason = useDeleteNoveltyReason();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<NoveltyReason | null>(null);
  const [search, setSearch] = useState('');
  const nextItemNumber = Math.max(0, ...reasons.map(r => r.item_number || 0)) + 1;

  const filtered = reasons.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteReason.mutateAsync(id);
      toast({ title: 'Motivo eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Motivos de Novedad</h1>
          <p className="text-muted-foreground">Catálogo de motivos para novedades de nómina</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditing(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Motivo
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar motivo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Card className="md:hidden">
          <CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : (
        <MobileCardList
          className="md:hidden"
          emptyMessage="No se encontraron motivos"
          items={filtered.map(r => ({
            id: r.id,
            title: r.name,
            subtitle: r.description || 'Sin descripción',
            badge: (
              <Badge variant={r.is_active ? 'default' : 'secondary'}>
                {r.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            ),
            actions: (
              <>
                <Button size="sm" variant="outline" onClick={() => { setEditing(r); setShowDialog(true); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Eliminar
                </Button>
              </>
            ),
          }))}
        />
      )}

      <Card className="hidden md:block">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No se encontraron motivos
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                      {r.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'default' : 'secondary'}>
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setShowDialog(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NoveltyReasonFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        reason={editing}
        nextItemNumber={nextItemNumber}
      />
    </div>
  );
}

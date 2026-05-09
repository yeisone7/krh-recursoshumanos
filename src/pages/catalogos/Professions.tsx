import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from "@/components/ui/alert-dialog";

import { useProfessions, Profession } from '@/hooks/useProfessions';
import { ProfessionFormDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function CatalogosProfessions() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null);
  const [professionToDelete, setProfessionToDelete] = useState<string | null>(null);

  const { data: professions = [], isLoading, delete: deleteProfession, isDeleting } = useProfessions();

  const handleDelete = async () => {
    if (professionToDelete) {
      await deleteProfession(professionToDelete);
      setProfessionToDelete(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3 sm:items-center">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Profesiones</h1>
            <p className="text-muted-foreground mt-1">Gestiona el catálogo de profesiones y ocupaciones</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Profesiones</CardTitle>
            <CardDescription>Configura las profesiones disponibles en la plataforma</CardDescription>
          </div>
          <Button onClick={() => { setSelectedProfession(null); setShowForm(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />Nueva Profesión
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : professions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay profesiones registradas. Crea la primera.
            </div>
          ) : (
            <>
              <MobileCardList
                className="md:hidden"
                items={professions.map((profession) => ({
                  id: profession.id,
                  title: profession.name,
                  subtitle: profession.is_active ? 'Activa' : 'Inactiva',
                  badge: (
                    <Badge
                      variant="outline"
                      className={profession.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                    >
                      {profession.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  ),
                  fields: [],
                  actions: (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedProfession(profession); setShowForm(true); }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setProfessionToDelete(profession.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  ),
                }))}
              />
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre de la Profesión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professions.map((profession) => (
                      <TableRow key={profession.id}>
                        <TableCell className="font-medium">{profession.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={profession.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                          >
                            {profession.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setSelectedProfession(profession); setShowForm(true); }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setProfessionToDelete(profession.id)}
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
        </CardContent>
      </Card>

      <ProfessionFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        profession={selectedProfession} 
      />

      <AlertDialog open={!!professionToDelete} onOpenChange={(open) => !open && setProfessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la profesión permanentemente. Asegúrate de que no esté siendo utilizada por ningún empleado o candidato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

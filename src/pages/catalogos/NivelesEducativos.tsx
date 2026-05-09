import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Edit2, Trash2 } from 'lucide-react';

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

import { useEducationLevels, EducationLevel } from '@/hooks/useEducationLevels';
import { EducationLevelFormDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function CatalogosNivelesEducativos() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<string | null>(null);

  const { data: levels = [], isLoading, delete: deleteLevel, isDeleting } = useEducationLevels();

  const handleDelete = async () => {
    if (levelToDelete) {
      await deleteLevel(levelToDelete);
      setLevelToDelete(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3 sm:items-center">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Niveles Educativos</h1>
            <p className="text-muted-foreground mt-1">Gestiona el catálogo de formación académica</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Niveles</CardTitle>
            <CardDescription>Configura los niveles de estudio disponibles en la plataforma</CardDescription>
          </div>
          <Button onClick={() => { setSelectedLevel(null); setShowForm(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />Nuevo Nivel
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : levels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay niveles educativos registrados. Crea el primero.
            </div>
          ) : (
            <>
              <MobileCardList
                className="md:hidden"
                items={levels.map((level) => ({
                  id: level.id,
                  title: level.name,
                  subtitle: level.is_active ? 'Activo' : 'Inactivo',
                  badge: (
                    <Badge
                      variant="outline"
                      className={level.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                    >
                      {level.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  ),
                  fields: [],
                  actions: (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedLevel(level); setShowForm(true); }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setLevelToDelete(level.id)}
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
                      <TableHead>Nombre del Nivel</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((level) => (
                      <TableRow key={level.id}>
                        <TableCell className="font-medium">{level.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={level.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                          >
                            {level.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setSelectedLevel(level); setShowForm(true); }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setLevelToDelete(level.id)}
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

      <EducationLevelFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        educationLevel={selectedLevel} 
      />

      <AlertDialog open={!!levelToDelete} onOpenChange={(open) => !open && setLevelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el nivel educativo permanentemente. Asegúrate de que no esté siendo utilizado por ningún empleado o candidato.
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

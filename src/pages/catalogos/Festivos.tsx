import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarDays, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MobileCardList } from '@/components/shared/MobileCardList';

import { 
  useHolidays, 
  useCreateHoliday, 
  useUpdateHoliday, 
  useDeleteHoliday,
  Holiday,
  HolidayFormData,
} from '@/hooks/useHolidays';

export default function Festivos() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<HolidayFormData>({
    holiday_date: '',
    name: '',
    description: '',
    is_national: true,
    is_active: true,
  });

  const { data: holidays, isLoading } = useHolidays(selectedYear);
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const handleOpenCreate = () => {
    setSelectedHoliday(null);
    setFormData({
      holiday_date: `${selectedYear}-01-01`,
      name: '',
      description: '',
      is_national: true,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      holiday_date: holiday.holiday_date,
      name: holiday.name,
      description: holiday.description || '',
      is_national: holiday.is_national,
      is_active: holiday.is_active,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.holiday_date || !formData.name.trim()) {
      toast.error('La fecha y el nombre son requeridos');
      return;
    }

    // Check for duplicates in the global list before creating
    if (!selectedHoliday) {
      const isDuplicate = holidays?.some(h => h.holiday_date === formData.holiday_date);
      if (isDuplicate) {
        toast.error('Ya existe un festivo configurado para esta fecha en el sistema global');
        return;
      }
    }

    try {
      if (selectedHoliday) {
        await updateHoliday.mutateAsync({
          id: selectedHoliday.id,
          ...formData,
        });
        toast.success('Festivo actualizado globalmente');
      } else {
        await createHoliday.mutateAsync(formData);
        toast.success('Festivo agregado al catálogo global');
      }
      setDialogOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ya existe un festivo en esa fecha');
      } else {
        toast.error('Error al guardar el festivo');
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedHoliday) return;

    try {
      await deleteHoliday.mutateAsync(selectedHoliday.id);
      toast.success('Festivo eliminado');
      setDeleteDialogOpen(false);
    } catch {
      toast.error('Error al eliminar el festivo');
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl flex items-center gap-2">
            Días Festivos
            <Badge variant="secondary" className="text-[10px] uppercase font-black bg-primary/10 text-primary border-none">
              Catálogo Global
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los días festivos compartidos para todas las empresas del sistema.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Festivo
        </Button>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Festivos {selectedYear}
              </CardTitle>
              <CardDescription>
                {holidays?.length || 0} días festivos configurados
              </CardDescription>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0"
                onClick={() => setSelectedYear(y => y - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium flex-1 text-center sm:w-16 sm:flex-none">{selectedYear}</span>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0"
                onClick={() => setSelectedYear(y => y + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !holidays?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay festivos configurados para {selectedYear}</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar el primer festivo
              </Button>
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              emptyMessage={`No hay festivos configurados para ${selectedYear}`}
              items={holidays.map((holiday) => ({
                id: holiday.id,
                title: holiday.name,
                subtitle: formatDate(holiday.holiday_date),
                badge: <Badge variant={holiday.is_active ? 'outline' : 'secondary'}>{holiday.is_active ? 'Activo' : 'Inactivo'}</Badge>,
                fields: [
                  {
                    label: 'Fecha',
                    value: format(new Date(holiday.holiday_date + 'T00:00:00'), 'd MMM yyyy', { locale: es }),
                  },
                  {
                    label: 'Tipo',
                    value: holiday.is_national ? 'Nacional' : 'Empresa',
                  },
                  ...(holiday.description ? [{ label: 'Descripción', value: holiday.description, className: 'col-span-2' }] : []),
                ],
                actions: (
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(holiday)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDelete(holiday)} className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                ),
              }))}
            />
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(holiday.holiday_date + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {format(new Date(holiday.holiday_date + 'T00:00:00'), 'EEEE', { locale: es })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{holiday.name}</div>
                        {holiday.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {holiday.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant={holiday.is_national ? 'default' : 'secondary'}>
                              {holiday.is_national ? (
                                <><Globe className="w-3 h-3 mr-1" />Nacional</>
                              ) : (
                                <><Building2 className="w-3 h-3 mr-1" />Empresa</>
                              )}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {holiday.is_national 
                              ? 'Festivo nacional de Colombia' 
                              : 'Festivo específico de la empresa'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant={holiday.is_active ? 'outline' : 'secondary'}>
                        {holiday.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(holiday)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenDelete(holiday)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle>
              {selectedHoliday ? 'Editar Festivo' : 'Agregar Festivo'}
            </DialogTitle>
            <DialogDescription>
              {selectedHoliday 
                ? 'Modifica los datos del día festivo' 
                : 'Agrega un nuevo día festivo al calendario'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="holiday_date">Fecha *</Label>
                <Input
                  id="holiday_date"
                  type="date"
                  value={formData.holiday_date}
                  onChange={(e) => setFormData(f => ({ ...f, holiday_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Día de la Independencia"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descripción del festivo..."
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0 space-y-0.5">
                <Label>Festivo Nacional</Label>
                <p className="text-xs text-muted-foreground">
                  Marca si es un festivo oficial de Colombia
                </p>
              </div>
              <Switch
                checked={formData.is_national}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_national: checked }))}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0 space-y-0.5">
                <Label>Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Los festivos inactivos no se cuentan en los cálculos
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:gap-0 sm:px-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createHoliday.isPending || updateHoliday.isPending}
              className="w-full sm:w-auto"
            >
              {(createHoliday.isPending || updateHoliday.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedHoliday ? 'Guardar Cambios' : 'Agregar Festivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle>¿Eliminar festivo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{selectedHoliday?.name}"? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {deleteHoliday.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

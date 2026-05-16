import { useState } from 'react';
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
  Calendar as CalendarIcon,
  Search,
  Filter,
  ShieldCheck,
  Flag,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const filteredHolidays = holidays?.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.holiday_date.includes(searchTerm)
  );

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

    try {
      if (selectedHoliday) {
        await updateHoliday.mutateAsync({
          id: selectedHoliday.id,
          ...formData,
        });
        toast.success('Festivo actualizado correctamente');
      } else {
        await createHoliday.mutateAsync(formData);
        toast.success('Festivo agregado al calendario');
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error('Error al guardar el festivo');
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

  return (
    <div className="min-h-screen pb-20 space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Plano */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Gestión de Calendario</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Días Festivos
            </h1>
            <p className="text-slate-500 font-medium max-w-xl text-sm">
              Administra los festivos nacionales y corporativos para el cálculo preciso de nómina y turnos.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-white transition-all"
                onClick={() => setSelectedYear(y => y - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4">
                <span className="text-sm font-bold text-slate-700">{selectedYear}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-white transition-all"
                onClick={() => setSelectedYear(y => y + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={handleOpenCreate} 
              className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              AGREGAR FESTIVO
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Festivos', value: holidays?.length || 0, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Nacionales', value: holidays?.filter(h => h.is_national).length || 0, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Corporativos', value: holidays?.filter(h => !h.is_national).length || 0, icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-xl border border-slate-200 shadow-none bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", stat.bg, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado de Festivos */}
      <Card className="rounded-xl border border-slate-200 shadow-none bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar festivo..." 
              className="pl-10 h-10 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-lg border-slate-200 font-bold text-slate-600 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !filteredHolidays?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                <CalendarDays className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No se encontraron festivos</h3>
                <p className="text-slate-500 text-sm">Ajusta tu búsqueda o agrega uno nuevo para {selectedYear}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Información</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Tipo</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHolidays.map((holiday) => (
                    <TableRow key={holiday.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center leading-none">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                              {format(new Date(holiday.holiday_date + 'T00:00:00'), 'MMM', { locale: es })}
                            </span>
                            <span className="text-lg font-black text-slate-900 tracking-tighter">
                              {format(new Date(holiday.holiday_date + 'T00:00:00'), 'dd')}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 capitalize text-sm">
                              {format(new Date(holiday.holiday_date + 'T00:00:00'), 'EEEE', { locale: es })}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase">
                              {format(new Date(holiday.holiday_date + 'T00:00:00'), 'yyyy')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-sm">{holiday.name}</div>
                          {holiday.description && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">{holiday.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Badge className={cn(
                          "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                          holiday.is_national 
                            ? "bg-emerald-50 text-emerald-700" 
                            : "bg-blue-50 text-blue-700"
                        )}>
                          {holiday.is_national ? 'Nacional' : 'Empresa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            holiday.is_active ? "bg-emerald-500" : "bg-slate-300"
                          )} />
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            holiday.is_active ? "text-emerald-700" : "text-slate-400"
                          )}>
                            {holiday.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(holiday)} className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(holiday)} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600">
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
        </CardContent>
      </Card>

      {/* Dialogo: Agregar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-2xl">
          <DialogHeader className="px-6 py-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 uppercase">
                  {selectedHoliday ? 'Editar Festivo' : 'Nuevo Festivo'}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500">
                  Configura los detalles del día festivo en el calendario.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="holiday_date" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Fecha *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="holiday_date"
                    type="date"
                    value={formData.holiday_date}
                    onChange={(e) => setFormData(f => ({ ...f, holiday_date: e.target.value }))}
                    className="h-10 pl-10 rounded-lg bg-slate-50 border-slate-200 focus:bg-white text-sm font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Batalla de Boyacá"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-lg bg-slate-50 border-slate-200 focus:bg-white text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Opcional..."
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                className="min-h-[100px] rounded-lg bg-slate-50 border-slate-200 focus:bg-white text-sm font-medium resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-slate-700 uppercase">Festivo Nacional</Label>
                  <p className="text-[9px] text-slate-400">¿Aplica para todo el país?</p>
                </div>
                <Switch
                  checked={formData.is_national}
                  onCheckedChange={(checked) => setFormData(f => ({ ...f, is_national: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-slate-700 uppercase">Estado Activo</Label>
                  <p className="text-[9px] text-slate-400">Habilitar en el sistema</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setDialogOpen(false)} 
              className="font-bold text-xs uppercase tracking-widest text-slate-500"
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createHoliday.isPending || updateHoliday.isPending || !formData.name.trim()} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest px-8 rounded-lg h-10 shadow-none"
            >
              {(createHoliday.isPending || updateHoliday.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'GUARDAR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white shadow-2xl p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-slate-900 uppercase">¿Eliminar Festivo?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-500 font-medium">
                Esta acción eliminará <span className="font-bold text-slate-900">"{selectedHoliday?.name}"</span> del calendario. No se puede deshacer.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel className="flex-1 rounded-lg border-slate-200 font-bold uppercase text-[10px] tracking-widest">CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-none"
            >
              ELIMINAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

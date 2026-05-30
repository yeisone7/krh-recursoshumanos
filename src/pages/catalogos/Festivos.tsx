import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
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
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<HolidayFormData>({
    holiday_date: '',
    name: '',
    description: '',
    is_national: true,
    is_active: true,
  });

  const { data: holidays = [], isLoading, refetch } = useHolidays(selectedYear);
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const filteredHolidays = holidays.filter(h => 
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
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-8 h-8 stroke-[2.5] text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Festivos</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">CALENDARIO</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de jornadas y días no laborables</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-white border border-slate-100 rounded-2xl p-1.5 group">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-11 w-11 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-primary active:scale-90"
              onClick={() => setSelectedYear(y => y - 1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="px-6 flex items-center gap-3">
              <span className="text-xl font-black text-slate-900 tracking-tighter">{selectedYear}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-11 w-11 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-primary active:scale-90"
              onClick={() => setSelectedYear(y => y + 1)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          
          <Button 
            onClick={handleOpenCreate} 
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            AGREGAR FESTIVO
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-1">
        {[
          { label: 'Total Festivos', value: holidays.length, icon: CalendarDays, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Nacionales', value: holidays.filter(h => h.is_national).length, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Corporativos', value: holidays.filter(h => !h.is_national).length, icon: Building2, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-[2rem] bg-white border border-slate-100 flex flex-col items-center text-center space-y-2"
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
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative group flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="BUSCAR FESTIVO POR NOMBRE O FECHA..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all text-slate-400"
                onClick={() => refetch()}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-10 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <CalendarDays className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {searchTerm ? 'Prueba con otro término.' : `No hay festivos registrados para el año ${selectedYear}.`}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filteredHolidays.map(item => ({
                    id: item.id,
                    title: item.name,
                    subtitle: formatDateOnly(item.holiday_date + 'T00:00:00', 'EEEE, d de MMMM', { locale: es }),
                    badge: <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none h-6 px-3 rounded-lg", item.is_national ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{item.is_national ? 'Nacional' : 'Corporativo'}</Badge>,
                    fields: [
                      { 
                        label: 'ESTADO', 
                        value: (
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", item.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", item.is_active ? "text-emerald-700" : "text-slate-400")}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
                          </div>
                        ) 
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50" onClick={() => handleOpenEdit(item)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 text-red-600 hover:bg-red-50 hover:border-red-100" onClick={() => handleOpenDelete(item)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> ELIMINAR
                        </Button>
                      </div>
                    )
                  }))}
                />

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Fecha del Festivo</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Identificación / Nombre</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Tipo</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHolidays.map((holiday) => (
                        <TableRow key={holiday.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex flex-col items-center justify-center leading-none group-hover:scale-110 transition-transform">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mb-1">
                                  {formatDateOnly(holiday.holiday_date + 'T00:00:00', 'MMM', { locale: es })}
                                </span>
                                <span className="text-2xl font-black text-primary tracking-tighter">
                                  {formatDateOnly(holiday.holiday_date + 'T00:00:00', 'dd')}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight capitalize">
                                  {formatDateOnly(holiday.holiday_date + 'T00:00:00', 'EEEE', { locale: es })}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedYear}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{holiday.name}</p>
                              {holiday.description && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-sm">{holiday.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                              holiday.is_national 
                                ? "bg-emerald-50 text-emerald-700" 
                                : "bg-blue-50 text-blue-700"
                            )}>
                              {holiday.is_national ? 'NACIONAL' : 'EMPRESA'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className={cn(
                                "h-2 w-2 rounded-full animate-pulse",
                                holiday.is_active ? "bg-emerald-500" : "bg-slate-300"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                holiday.is_active ? "text-emerald-700" : "text-slate-400"
                              )}>
                                {holiday.is_active ? 'ACTIVO' : 'INACTIVO'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all gap-3">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                onClick={() => handleOpenEdit(holiday)}
                              >
                                <Pencil className="w-5 h-5 text-slate-400" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 border border-transparent hover:border-red-100"
                                onClick={() => handleOpenDelete(holiday)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-100 rounded-[3rem]">
          <DialogHeader className="px-10 pt-10 pb-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 flex items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary shrink-0">
                <CalendarIcon className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {selectedHoliday ? 'Fijar Edición' : 'Inscribir Festivo'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Configuración estratégica del día no laboral
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="holiday_date" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ejecución *</Label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="holiday_date"
                    type="date"
                    value={formData.holiday_date}
                    onChange={(e) => setFormData(f => ({ ...f, holiday_date: e.target.value }))}
                    className="h-14 pl-14 rounded-2xl bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador *</Label>
                <Input
                  id="name"
                  placeholder="EJ: BATALLA DE BOYACÁ"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="h-14 rounded-2xl bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas de Contexto</Label>
              <Textarea
                id="description"
                placeholder="REGISTRE DETALLES ADICIONALES PARA NÓMINA..."
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                className="min-h-[120px] rounded-[1.5rem] bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest resize-none p-5 focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100 group">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Nacional</Label>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">¿APLICA PAÍS COMPLETO?</p>
                </div>
                <Switch
                  checked={formData.is_national}
                  onCheckedChange={(checked) => setFormData(f => ({ ...f, is_national: checked }))}
                  className="data-[state=checked]:bg-primary scale-110"
                />
              </div>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100 group">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Estado</Label>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HABILITAR VISIBILIDAD</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
                  className="data-[state=checked]:bg-emerald-500 scale-110"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-10 py-8 bg-slate-50/50 border-t border-slate-50">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setDialogOpen(false)} 
              className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all"
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createHoliday.isPending || updateHoliday.isPending || !formData.name.trim()} 
              className="h-14 px-12 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              {(createHoliday.isPending || updateHoliday.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-3" />
              ) : null}
              {selectedHoliday ? 'GUARDAR CAMBIOS' : 'CONFIRMAR FESTIVO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[3rem] border-none bg-white p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="space-y-3">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Eliminar Festivo?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                Estás a punto de purgar <span className="text-red-600">"{selectedHoliday?.name}"</span> del calendario estratégico. Esta acción afectará los cálculos de nómina y es irreversible.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 hover:bg-slate-100">CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest flex-1 transition-all active:scale-95"
            >
              ELIMINAR DEFINITIVAMENTE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

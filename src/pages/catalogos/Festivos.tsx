import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MoreHorizontal,
  Info,
  ShieldCheck,
  Flag,
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

    if (!selectedHoliday) {
      const isDuplicate = holidays?.some(h => h.holiday_date === formData.holiday_date);
      if (isDuplicate) {
        toast.error('Ya existe un festivo configurado para esta fecha');
        return;
      }
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

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es });
  };

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[3rem] bg-gradient-to-br from-primary/10 via-background to-background border border-primary/10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Gestión de Calendario</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">
                Días Festivos
              </h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl">
                Administra los festivos nacionales y corporativos para el cálculo preciso de nómina y turnos.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/50 backdrop-blur-md border border-slate-200 rounded-2xl p-1 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-white transition-all"
                onClick={() => setSelectedYear(y => y - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="px-6 py-2">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{selectedYear}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-white transition-all"
                onClick={() => setSelectedYear(y => y + 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button 
              onClick={handleOpenCreate} 
              className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              AGREGAR FESTIVO
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Grid de Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Festivos</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{holidays?.length || 0}</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform">
                <CalendarDays className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[10px] font-black text-blue-600 uppercase italic">Calendario {selectedYear}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nacionales</p>
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                  {holidays?.filter(h => h.is_national).length || 0}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:rotate-12 transition-transform">
                <Globe className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${((holidays?.filter(h => h.is_national).length || 0) / (holidays?.length || 1)) * 100}%` }} 
                />
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase italic">Oficiales</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporativos</p>
                <p className="text-4xl font-black text-amber-600 tracking-tighter">
                  {holidays?.filter(h => !h.is_national).length || 0}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:rotate-12 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${((holidays?.filter(h => !h.is_national).length || 0) / (holidays?.length || 1)) * 100}%` }} 
                />
              </div>
              <span className="text-[10px] font-black text-amber-600 uppercase italic">Internos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Festivos */}
      <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white/70 backdrop-blur-xl">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar festivo por nombre o fecha..." 
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white shadow-sm font-bold text-slate-600">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-3xl" />
              ))}
            </div>
          ) : !filteredHolidays?.length ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
              <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200">
                <CalendarDays className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">No se encontraron festivos</h3>
                <p className="text-slate-500 font-medium">Intenta ajustar tu búsqueda o agrega uno nuevo para {selectedYear}</p>
              </div>
              <Button variant="outline" className="h-12 px-8 rounded-2xl border-primary/20 text-primary font-black uppercase tracking-widest text-[10px]" onClick={handleOpenCreate}>
                AGREGAR PRIMER FESTIVO
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Información del Festivo</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredHolidays.map((holiday, idx) => (
                      <motion.tr 
                        key={holiday.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50/50 border-slate-100 transition-colors"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center leading-none group-hover:scale-110 transition-transform">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {format(new Date(holiday.holiday_date + 'T00:00:00'), 'MMM', { locale: es })}
                              </span>
                              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                {format(new Date(holiday.holiday_date + 'T00:00:00'), 'dd')}
                              </span>
                            </div>
                            <div>
                              <div className="font-black text-slate-800 capitalize leading-none">
                                {format(new Date(holiday.holiday_date + 'T00:00:00'), 'EEEE', { locale: es })}
                              </div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {format(new Date(holiday.holiday_date + 'T00:00:00'), 'yyyy')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <div className="space-y-1">
                            <div className="font-black text-slate-900 leading-none">{holiday.name}</div>
                            {holiday.description ? (
                              <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-sm italic">
                                "{holiday.description}"
                              </p>
                            ) : (
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin descripción adicional</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <Badge className={cn(
                            "h-7 px-3 rounded-lg border-none font-black text-[10px] uppercase tracking-widest",
                            holiday.is_national 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-blue-50 text-blue-600"
                          )}>
                            {holiday.is_national ? (
                              <><Globe className="w-3 h-3 mr-1.5" /> Nacional</>
                            ) : (
                              <><Building2 className="w-3 h-3 mr-1.5" /> Empresa</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "h-2 w-2 rounded-full mr-2",
                              holiday.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                            )} />
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              holiday.is_active ? "text-emerald-600" : "text-slate-400"
                            )}>
                              {holiday.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(holiday)} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar Festivo</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(holiday)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar del Sistema</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo: Agregar/Editar Festivo (Premium SaaS Light Style) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Header Decorativo */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            
            <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-primary/5 rounded-3xl blur-xl" />
                  <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-50 group-hover:bg-primary/5 transition-colors" />
                    <span className="relative text-2xl font-black text-primary leading-none">FE</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/50 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {selectedHoliday ? 'Editando Festivo' : 'Nuevo Festivo'}
                  </div>
                  <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                    {selectedHoliday ? 'Editar Registro' : 'Agregar Día'}
                  </DialogTitle>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Calendario Global
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Flag className="w-3.5 h-3.5" />
                      Control de Nómina
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="holiday_date" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Fecha del Festivo *</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input
                        id="holiday_date"
                        type="date"
                        value={formData.holiday_date}
                        onChange={(e) => setFormData(f => ({ ...f, holiday_date: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre Identificativo *</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Batalla de Boyacá"
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descripción Estratégica (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalles sobre este festivo o su aplicación..."
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="min-h-[120px] rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Festivo Nacional</Label>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Marcar como feriado oficial en todo el país</p>
                    </div>
                    <Switch
                      checked={formData.is_national}
                      onCheckedChange={(checked) => setFormData(f => ({ ...f, is_national: checked }))}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Estado Activo</Label>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Habilitar este día para cálculos de sistema</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 px-10 py-8 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-6 rounded-b-[2.5rem]">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDialogOpen(false)} 
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-600 hover:bg-slate-200 transition-all"
              >
                DESCARTAR
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createHoliday.isPending || updateHoliday.isPending || !formData.name.trim()} 
                className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-[#004a7c] hover:bg-[#003a61] text-white shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {(createHoliday.isPending || updateHoliday.isPending) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : selectedHoliday ? (
                  'GUARDAR CAMBIOS'
                ) : (
                  'CONFIRMAR REGISTRO'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Premium */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md bg-white">
          <div className="p-8 space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight">¿Eliminar Festivo?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Estás a punto de eliminar <span className="font-bold text-slate-900">"{selectedHoliday?.name}"</span>. 
                Esta acción impactará los cálculos de nómina del año {selectedYear}.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 flex gap-3 sm:gap-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-slate-200">CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 font-bold shadow-lg shadow-destructive/20"
            >
              ELIMINAR AHORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

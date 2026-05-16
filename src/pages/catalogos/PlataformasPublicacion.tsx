import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Globe, 
  Link, 
  CheckCircle2, 
  XCircle, 
  Filter,
  ExternalLink,
  Loader2,
  Settings2
} from 'lucide-react';
import { useVacancyPlatforms, type VacancyPublicationPlatform } from '@/hooks/useVacancyPlatforms';
import { cn } from '@/lib/utils';

export default function PlataformasPublicacion() {
  const { data = [], isLoading, create, update, delete: deleteItem, isCreating, isUpdating } = useVacancyPlatforms();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VacancyPublicationPlatform | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    return data.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setUrl('');
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (item: VacancyPublicationPlatform) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || '');
    setUrl(item.url || '');
    setIsActive(item.is_active);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      await update({ id: editing.id, name, description, url, is_active: isActive });
    } else {
      await create({ name, description, url, is_active: isActive });
    }
    setFormOpen(false);
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter(p => p.is_active).length,
    withUrl: data.filter(p => p.url).length,
  }), [data]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Módulo de Reclutamiento</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Plataformas de Publicación
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Configura los canales y portales externos para la publicación de vacantes.
            </p>
          </div>
          
          <Button 
            onClick={openCreate}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVA PLATAFORMA
          </Button>
        </div>
      </div>

      {/* Grid de Estadísticas - Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Canales', value: stats.total, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Canales Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Con Enlace', value: stats.withUrl, icon: Link, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : kpi.value}
                  </p>
                </div>
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado - Flat Style */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white transition-all text-sm"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-lg border-slate-200 font-bold text-slate-600 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <Globe className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No se encontraron plataformas</h3>
                <p className="text-slate-500 text-sm font-medium">
                  {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Comienza registrando la primera plataforma.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-6 py-4">Canal de Publicación</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Enlace</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{item.description || 'Sin descripción'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.url ? (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver Portal
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No configurada</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                            item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {item.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => setDeleteId(item.id)}
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
          )}
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-200 rounded-xl">
          <DialogHeader className="px-6 py-6 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Globe className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {editing ? 'Editar Plataforma' : 'Nueva Plataforma'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Portal *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: LinkedIn, Indeed..."
                  className="h-11 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Enlace de Acceso (URL)</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://portal.com/vacantes"
                    className="h-11 pl-10 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre el alcance o uso de esta plataforma..."
                  className="min-h-[100px] rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white font-medium text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Habilitar Plataforma</Label>
                  <p className="text-[10px] text-slate-400 font-medium">Permitir publicaciones en este canal</p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-blue-600 scale-90"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setFormOpen(false)} 
                className="flex-1 h-11 rounded-lg font-bold border-slate-200 uppercase text-xs tracking-widest"
              >
                CANCELAR
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim() || isCreating || isUpdating} 
                className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs tracking-widest shadow-none"
              >
                {isCreating || isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editing ? (
                  'GUARDAR CAMBIOS'
                ) : (
                  'CREAR CANAL'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white p-0 overflow-hidden max-w-md">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">¿Eliminar Plataforma?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Esta acción eliminará la plataforma permanentemente. Asegúrate de que no haya vacantes activas vinculadas.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <AlertDialogCancel className="flex-1 h-12 rounded-lg font-bold border-slate-200 bg-white uppercase text-xs tracking-widest shadow-none">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); } }}
              className="flex-1 h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest shadow-none"
            >
              ELIMINAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

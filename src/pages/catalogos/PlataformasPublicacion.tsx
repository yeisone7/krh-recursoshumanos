import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
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
  Settings2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useVacancyPlatforms, type VacancyPublicationPlatform } from '@/hooks/useVacancyPlatforms';
import { cn } from '@/lib/utils';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function PlataformasPublicacion() {
  const { data = [], isLoading, create, update, delete: deleteItem, isCreating, isUpdating, refetch } = useVacancyPlatforms();
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
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0">
            <Globe className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Canales</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">RECLUTAMIENTO</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de portales y plataformas de publicación</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => refetch?.()}
            variant="outline"
            className="h-14 w-14 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0"
          >
            <RefreshCw className={cn("w-5 h-5 text-slate-400", isLoading && "animate-spin")} />
          </Button>
          <Button 
            onClick={openCreate}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVA PLATAFORMA
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
        {[
          { label: 'Total Canales', value: stats.total, icon: Globe, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Canales Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Con Enlace', value: stats.withUrl, icon: Link, color: 'text-orange-500', bg: 'bg-orange-50' },
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
                placeholder="BUSCAR CANAL POR NOMBRE O PORTAL..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-10 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <Globe className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Comienza registrando portales de reclutamiento corporativo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filtered.map(item => ({
                    id: item.id,
                    title: item.name,
                    subtitle: item.description || 'Sin descripción corporativa',
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">PORTAL</Badge>,
                    fields: [
                      {
                        label: 'ESTADO',
                        value: (
                          <Badge 
                            className={cn(
                              "h-5 px-3 rounded-md border-none font-black text-[8px] uppercase tracking-widest",
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {item.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50 transition-all" 
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 text-red-600 hover:bg-red-50 hover:border-red-100" 
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> BORRAR
                        </Button>
                      </div>
                    )
                  }))}
                />

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Canal de Publicación</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Direccionamiento / Portal</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((item) => (
                        <TableRow key={item.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-xl transition-transform">
                                <Globe className="w-6 h-6 stroke-[2.5]" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[250px]">{item.description || 'Sin descripción corporativa'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.url ? (
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-primary/5 text-[10px] font-black text-primary hover:bg-primary/10 transition-all uppercase tracking-widest border border-primary/10"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                PORTAL WEB
                              </a>
                            ) : (
                              <Badge variant="outline" className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-slate-100 bg-slate-50 h-7 px-3 rounded-lg">SIN VÍNCULO</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {item.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end transition-all gap-3">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="w-5 h-5 text-slate-400" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 border border-transparent hover:border-red-100"
                                onClick={() => setDeleteId(item.id)}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-100 rounded-[3rem]">
          <DialogHeader className="px-10 pt-10 pb-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 flex items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary shrink-0 border border-primary/10">
                <Globe className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {editing ? 'Fijar Edición' : 'Inscribir Plataforma'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Configuración estratégica del canal de reclutamiento
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="EJ: LINKEDIN TALENT"
                  className="h-14 rounded-2xl bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direccionamiento URL</Label>
                <div className="relative group">
                  <Link className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="HTTPS://PORTAL.COM"
                    className="h-14 pl-14 rounded-2xl bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas de Contexto</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="REGISTRE DETALLES SOBRE EL ALCANCE DE ESTE CANAL..."
                className="min-h-[120px] rounded-[1.5rem] bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest resize-none p-5 focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100 group">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Visibilidad</Label>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HABILITAR PARA PUBLICACIONES</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-primary scale-110"
              />
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setFormOpen(false)} 
                className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all flex-1"
              >
                CANCELAR
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim() || isCreating || isUpdating} 
                className="h-14 px-12 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest transition-all flex-1"
              >
                {isCreating || isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-3" />
                ) : null}
                {editing ? 'GUARDAR CAMBIOS' : 'CONFIRMAR CANAL'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-[3rem] border-none bg-white p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="space-y-3">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Eliminar Plataforma?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                Estás a punto de purgar permanentemente este canal de reclutamiento. Verifica que no existan vacantes activas vinculadas antes de proceder.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 hover:bg-slate-100">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); } }}
              className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest flex-1 transition-all"
            >
              ELIMINAR DEFINITIVAMENTE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Filter,
  ShieldCheck,
  Building2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useVacancyPlatforms, type VacancyPublicationPlatform } from '@/hooks/useVacancyPlatforms';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { cn } from '@/lib/utils';

export default function PlataformasPublicacion() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating } = useVacancyPlatforms();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VacancyPublicationPlatform | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const filtered = data.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[3rem] bg-gradient-to-br from-indigo-500/10 via-background to-background border border-indigo-500/10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Catálogo de Reclutamiento</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">
                Plataformas de Publicación
              </h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl">
                Configura los canales y portales externos para la publicación de vacantes.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={openCreate} 
            className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            NUEVA PLATAFORMA
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8 group hover:scale-[1.02] transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Plataformas</p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{data.length}</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform">
              <Globe className="w-7 h-7" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8 group hover:scale-[1.02] transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activas</p>
              <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                {data.filter(p => p.is_active).length}
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:rotate-12 transition-transform">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8 group hover:scale-[1.02] transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlaces Configurados</p>
              <p className="text-4xl font-black text-amber-600 tracking-tighter">
                {data.filter(p => p.url).length}
              </p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:rotate-12 transition-transform">
              <Link className="w-7 h-7" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white/70 backdrop-blur-xl">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre..." 
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 shadow-sm transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white shadow-sm font-bold text-slate-600">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar Canales
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Cargando Plataformas...</div>
          ) : filtered.length === 0 ? (
            <div className="py-32 text-center space-y-6">
              <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                <Globe className="w-10 h-10" />
              </div>
              <p className="text-slate-500 font-bold">No se encontraron plataformas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataforma</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlace de Acceso</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((item, idx) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 font-black group-hover:scale-110 transition-transform">
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-black text-slate-900 leading-none">{item.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-[200px]">
                                {item.description || 'Sin descripción adicional'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          {item.url ? (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              VER PORTAL
                            </a>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin URL configurada</span>
                          )}
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <Badge className={cn(
                            "h-7 px-3 rounded-lg border-none font-black text-[10px] uppercase tracking-widest",
                            item.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {item.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
            
            <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl">
                  <Globe className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/50 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {editing ? 'Actualizando Canal' : 'Nuevo Canal de Publicación'}
                  </div>
                  <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                    {editing ? 'Editar Plataforma' : 'Nueva Plataforma'}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre del Portal *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: LinkedIn, Indeed, Portal Corporativo..."
                      className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-indigo-500/5 transition-all font-bold text-slate-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descripción Breve</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Agrega detalles sobre este canal de reclutamiento..."
                      className="min-h-[100px] pt-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all font-medium text-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Enlace Directo (URL)</Label>
                    <div className="relative">
                      <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://plataforma.com/vacantes"
                        className="h-14 pl-12 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-indigo-500/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Habilitar Plataforma</Label>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Define si este canal estará disponible para nuevas publicaciones</p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 px-10 py-8 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-6 rounded-b-[2.5rem]">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setFormOpen(false)} 
                  className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-600 hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </Button>
                <Button 
                  type="submit" 
                  disabled={!name.trim() || isCreating || isUpdating} 
                  className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isCreating || isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : editing ? (
                    'GUARDAR CAMBIOS'
                  ) : (
                    'CREAR PLATAFORMA'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md bg-white">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight">¿Eliminar Plataforma?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Esta acción no se puede deshacer. Se eliminará permanentemente del catálogo de reclutamiento.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 flex gap-3 sm:gap-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-slate-200">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); } }}
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

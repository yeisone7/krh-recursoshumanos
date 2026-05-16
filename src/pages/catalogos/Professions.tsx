import { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, Pencil, Trash2, Search, Filter, 
  CheckCircle2, XCircle, Settings2, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import { ProfessionFormDialog } from '@/components/config/ProfessionFormDialog';
import { cn } from '@/lib/utils';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function CatalogosProfessions() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null);
  const [professionToDelete, setProfessionToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: professions = [], isLoading, delete: deleteProfession, isDeleting, refetch } = useProfessions();

  const filtered = useMemo(() => {
    return professions.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [professions, search]);

  const handleDelete = async () => {
    if (professionToDelete) {
      await deleteProfession(professionToDelete);
      setProfessionToDelete(null);
    }
  };

  const stats = useMemo(() => ({
    total: professions.length,
    active: professions.filter(p => p.is_active).length,
    inactive: professions.filter(p => !p.is_active).length,
  }), [professions]);

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
            <Briefcase className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Profesiones</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">TALENTO</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión del catálogo de ocupaciones registradas</p>
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
            onClick={() => { setSelectedProfession(null); setShowForm(true); }}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVA PROFESIÓN
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
        {[
          { label: 'Total Profesiones', value: stats.total, icon: Briefcase, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Profesiones Activas', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'En Desuso', value: stats.inactive, icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
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
                placeholder="BUSCAR PROFESIÓN POR NOMBRE..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none transition-all font-black text-[10px] uppercase tracking-widest"
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
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <Briefcase className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {search ? 'Prueba con otro término de búsqueda.' : 'Comienza registrando las profesiones del catálogo corporativo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filtered.map(p => ({
                    id: p.id,
                    title: p.name,
                    subtitle: 'Profesión / Ocupación',
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">ID: {p.id.split('-')[0]}</Badge>,
                    fields: [
                      {
                        label: 'ESTADO',
                        value: (
                          <Badge 
                            className={cn(
                              "h-5 px-3 rounded-md border-none font-black text-[8px] uppercase tracking-widest",
                              p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {p.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50 transition-all" 
                          onClick={() => { setSelectedProfession(p); setShowForm(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 text-red-600 hover:bg-red-50 hover:border-red-100" 
                          onClick={() => setProfessionToDelete(p.id)}
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
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Nombre de Profesión</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Identificador / Referencia</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-xl transition-transform">
                                {p.name.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{p.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROFESIÓN CORPORATIVA</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">{p.id}</code>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {p.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end transition-all gap-3">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                onClick={() => { setSelectedProfession(p); setShowForm(true); }}
                              >
                                <Pencil className="w-5 h-5 text-slate-400" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 border border-transparent hover:border-red-100"
                                onClick={() => setProfessionToDelete(p.id)}
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

      <ProfessionFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        profession={selectedProfession} 
      />

      <AlertDialog open={!!professionToDelete} onOpenChange={(open) => !open && setProfessionToDelete(null)}>
        <AlertDialogContent className="rounded-[3rem] border-none bg-white p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="space-y-3">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Eliminar Profesión?</AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                Estás a punto de purgar esta profesión del catálogo corporativo. Verifica que no existan registros vinculados en hojas de vida antes de proceder.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 hover:bg-slate-100">CANCELAR</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest flex-1 transition-all"
              disabled={isDeleting}
            >
              {isDeleting ? 'ELIMINANDO...' : 'ELIMINAR DEFINITIVAMENTE'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Filter,
  ShieldCheck,
  Building2,
  Award
} from 'lucide-react';
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
import { useEducationLevels, EducationLevel } from '@/hooks/useEducationLevels';
import { EducationLevelFormDialog } from '@/components/config/EducationLevelFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { cn } from '@/lib/utils';

export default function CatalogosNivelesEducativos() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: levels = [], isLoading, delete: deleteLevel, isDeleting } = useEducationLevels();

  const filtered = levels.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (levelToDelete) {
      await deleteLevel(levelToDelete);
      setLevelToDelete(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2.5rem] bg-card border border-border/50 overflow-hidden shadow-xl shadow-primary/5"
      >
        
        
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-foreground rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-card border border-border/50 shadow-lg overflow-hidden group-hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <GraduationCap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase sm:text-4xl">
                Niveles Educativos
              </h1>
              <p className="text-muted-foreground font-medium mt-1 tracking-wide">
                Gestión de categorías de formación académica del sistema
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => { setSelectedLevel(null); setShowForm(true); }} 
            className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2 stroke-[3]" />
            NUEVO NIVEL
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative rounded-[2rem] bg-card border border-border/50 p-6 shadow-md hover:shadow-lg transition-all hover:border-primary/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 transition-transform group-hover:scale-110 duration-300">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Niveles Totales</p>
              <p className="text-2xl font-black">{levels.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="group relative rounded-[2rem] bg-card border border-border/50 p-6 shadow-md hover:shadow-lg transition-all hover:border-emerald-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 transition-transform group-hover:scale-110 duration-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Activos</p>
              <p className="text-2xl font-black">{levels.filter(l => l.is_active).length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative rounded-[2rem] bg-card border border-border/50 p-6 shadow-md hover:shadow-lg transition-all hover:border-destructive/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-destructive/10 transition-transform group-hover:scale-110 duration-300">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">En Desuso</p>
              <p className="text-2xl font-black">{levels.filter(l => !l.is_active).length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <Card className="rounded-[2.5rem] bg-card border border-border/50 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por nivel..." 
              className="pl-11 h-12 rounded-2xl bg-card border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-32 text-center space-y-6">
              <div className="h-20 w-20 bg-card rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                <GraduationCap className="w-10 h-10" />
              </div>
              <p className="text-slate-500 font-bold">No se encontraron niveles educativos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Grado Académico</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Estado</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((level, idx) => (
                      <motion.tr 
                        key={level.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:transition-colors border-border/50"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="font-black text-foreground leading-none uppercase tracking-tight group-hover:text-primary transition-colors">{level.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                            level.is_active 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-card text-muted-foreground border-border"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", level.is_active ? "bg-emerald-500" : "bg-card -foreground")} />
                            {level.is_active ? 'Activo' : 'Inactivo'}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedLevel(level); setShowForm(true); }} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setLevelToDelete(level.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive">
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

      <EducationLevelFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        educationLevel={selectedLevel} 
      />

      <AlertDialog open={!!levelToDelete} onOpenChange={(open) => !open && setLevelToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md bg-white">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight">¿Eliminar Nivel?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Se eliminará el nivel permanentemente. Asegúrate de que no haya perfiles asociados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-card flex gap-3 sm:gap-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-slate-200">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 font-bold"
              disabled={isDeleting}
            >
              {isDeleting ? 'ELIMINANDO...' : 'ELIMINAR AHORA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

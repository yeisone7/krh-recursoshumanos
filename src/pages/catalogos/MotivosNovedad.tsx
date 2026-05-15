import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Settings2, 
  Info,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useNoveltyReasons, useDeleteNoveltyReason, type NoveltyReason } from '@/hooks/useNoveltyReasons';
import { NoveltyReasonFormDialog } from '@/components/config/NoveltyReasonFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MotivosNovedad() {
  const { data: reasons = [], isLoading } = useNoveltyReasons();
  const deleteReason = useDeleteNoveltyReason();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<NoveltyReason | null>(null);
  const [search, setSearch] = useState('');
  const nextItemNumber = Math.max(0, ...reasons.map(r => r.item_number || 0)) + 1;

  const filtered = reasons.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteReason.mutateAsync(id);
      toast({ title: 'Motivo eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[3rem] bg-gradient-to-br from-primary/10 via-background to-background border border-border overflow-hidden"
      >
        
        
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Configuración de Nómina</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">
                Motivos de Novedad
              </h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl">
                Gestiona las razones predefinidas para las novedades y ajustes de nómina.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => { setEditing(null); setShowDialog(true); }} 
            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            NUEVO MOTIVO
          </Button>
        </div>
      </motion.div>

      {/* Grid de Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivos Registrados</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{reasons.length}</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos</p>
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                  {reasons.filter(r => r.is_active).length}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:rotate-12 transition-transform">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inactivos</p>
                <p className="text-4xl font-black text-slate-300 tracking-tighter">
                  {reasons.filter(r => !r.is_active).length}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center text-slate-300 group-hover:rotate-12 transition-transform">
                <XCircle className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado */}
      <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white/70 ">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar motivo..." 
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white shadow-sm font-bold text-slate-600">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 w-full bg-background rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
              <div className="h-24 w-24 rounded-[2.5rem] bg-background flex items-center justify-center text-slate-200">
                <Search className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Sin resultados</h3>
                <p className="text-slate-500 font-medium">No se encontraron motivos que coincidan con tu búsqueda.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Información del Motivo</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción Detallada</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((r, idx) => (
                      <motion.tr 
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-background border-slate-100 transition-colors"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform text-primary font-black">
                              {r.item_number}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 leading-none">{r.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <div className="text-sm font-medium text-slate-500 max-w-[400px] truncate">
                            {r.description || 'Sin descripción adicional'}
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <Badge className={cn(
                            "h-7 px-3 rounded-lg border-none font-black text-[10px] uppercase tracking-widest",
                            r.is_active ? "bg-emerald-50 text-emerald-600" : "bg-background text-slate-400"
                          )}>
                            {r.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setShowDialog(true); }} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive">
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

      <NoveltyReasonFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        reason={editing}
        nextItemNumber={nextItemNumber}
      />
    </div>
  );
}

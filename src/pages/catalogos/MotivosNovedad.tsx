import { useState } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Settings2, 
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
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
    <div className="min-h-screen pb-20 space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Plano */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Configuración de Nómina</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Motivos de Novedad
            </h1>
            <p className="text-slate-500 font-medium max-w-xl text-sm">
              Gestiona las razones predefinidas para las novedades y ajustes de nómina.
            </p>
          </div>
          
          <Button 
            onClick={() => { setEditing(null); setShowDialog(true); }} 
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-5 h-5 mr-2" />
            NUEVO MOTIVO
          </Button>
        </div>
      </div>

      {/* Grid de Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Motivos Registrados', value: reasons.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activos', value: reasons.filter(r => r.is_active).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactivos', value: reasons.filter(r => !r.is_active).length, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
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

      {/* Listado */}
      <Card className="rounded-xl border border-slate-200 shadow-none bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar motivo..." 
              className="pl-10 h-10 rounded-lg bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Sin resultados</h3>
                <p className="text-slate-500 text-sm">No se encontraron motivos que coincidan con tu búsqueda.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Información del Motivo</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descripción</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm">
                            {r.item_number}
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-500 max-w-[400px] truncate">
                          {r.description || 'Sin descripción adicional'}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Badge className={cn(
                          "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                          r.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                        )}>
                          {r.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setShowDialog(true); }} className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600">
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

      <NoveltyReasonFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        reason={editing}
        nextItemNumber={nextItemNumber}
      />
    </div>
  );
}

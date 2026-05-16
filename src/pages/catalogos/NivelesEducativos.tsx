import { useState, useMemo } from 'react';
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
  Settings2
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
import { cn } from '@/lib/utils';

export default function CatalogosNivelesEducativos() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: levels = [], isLoading, delete: deleteLevel, isDeleting } = useEducationLevels();

  const filtered = useMemo(() => {
    return levels.filter(l => 
      l.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [levels, search]);

  const handleDelete = async () => {
    if (levelToDelete) {
      await deleteLevel(levelToDelete);
      setLevelToDelete(null);
    }
  };

  const stats = useMemo(() => ({
    total: levels.length,
    active: levels.filter(l => l.is_active).length,
    inactive: levels.filter(l => !l.is_active).length,
  }), [levels]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Configuración de Perfiles</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Niveles Educativos
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Gestión de categorías de formación académica para perfiles de cargo y hojas de vida.
            </p>
          </div>
          
          <Button 
            onClick={() => { setSelectedLevel(null); setShowForm(true); }}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVO NIVEL
          </Button>
        </div>
      </div>

      {/* Grid de Estadísticas - Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Niveles Totales', value: stats.total, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Niveles Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'En Desuso', value: stats.inactive, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
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
              placeholder="Buscar por nivel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No se encontraron niveles</h3>
                <p className="text-slate-500 text-sm font-medium">
                  {search ? 'Prueba con otro término de búsqueda.' : 'Comienza creando el primer nivel educativo.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-6 py-4">Nivel de Formación</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((level) => (
                    <TableRow key={level.id} className="group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm">
                            {level.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm text-slate-900">{level.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                            level.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {level.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => { setSelectedLevel(level); setShowForm(true); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => setLevelToDelete(level.id)}
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

      <EducationLevelFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        educationLevel={selectedLevel} 
      />

      <AlertDialog open={!!levelToDelete} onOpenChange={(open) => !open && setLevelToDelete(null)}>
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white p-0 overflow-hidden max-w-md">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">¿Eliminar Nivel?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Esta acción eliminará el nivel permanentemente. Asegúrate de que no haya perfiles asociados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <AlertDialogCancel className="flex-1 h-12 rounded-lg font-bold border-slate-200 bg-white uppercase text-xs tracking-widest shadow-none">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="flex-1 h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest shadow-none"
              disabled={isDeleting}
            >
              {isDeleting ? 'ELIMINANDO...' : 'ELIMINAR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

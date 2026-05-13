import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Building2, 
  ShieldCheck, 
  Info,
  Filter,
  CheckCircle2,
  XCircle,
  Briefcase
} from 'lucide-react';
import { SocialSecurityCatalogFormDialog } from '@/components/config/SocialSecurityCatalogFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { CatalogItem, CatalogIPS } from '@/hooks/useSocialSecurityCatalogs';
import { cn } from '@/lib/utils';

interface SocialSecurityCatalogPageProps {
  title: string;
  description: string;
  data: (CatalogItem | CatalogIPS)[];
  isLoading: boolean;
  onCreate: (item: Partial<CatalogItem | CatalogIPS>) => void;
  onUpdate: (item: Partial<CatalogItem | CatalogIPS> & { id: string }) => void;
  onDelete: (id: string) => void;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  showIPSFields?: boolean;
}

export function SocialSecurityCatalogPage({
  title,
  description,
  data,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
  isDeleting,
  showIPSFields = false,
}: SocialSecurityCatalogPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | CatalogIPS | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (item: CatalogItem | CatalogIPS) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = (formData: Partial<CatalogItem | CatalogIPS>) => {
    if (editItem) {
      onUpdate({ ...formData, id: editItem.id } as Partial<CatalogItem | CatalogIPS> & { id: string });
    } else {
      onCreate(formData);
    }
    setEditItem(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
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
        
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Catálogo de Configuración</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">
                {title}
              </h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl">
                {description}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => { setEditItem(null); setDialogOpen(true); }} 
            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            NUEVA {title.toUpperCase()}
          </Button>
        </div>
      </motion.div>

      {/* Grid de Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registros</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{data.length}</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidades Activas</p>
                <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                  {data.filter(i => i.is_active).length}
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Desuso</p>
                <p className="text-4xl font-black text-slate-300 tracking-tighter">
                  {data.filter(i => !i.is_active).length}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:rotate-12 transition-transform">
                <XCircle className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado */}
      <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white/70 backdrop-blur-xl">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder={`Buscar por nombre, NIT o código...`} 
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <div key={i} className="h-20 w-full bg-slate-50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
              <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200">
                <Search className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">No hay resultados</h3>
                <p className="text-slate-500 font-medium">{searchTerm ? 'Ajusta los términos de búsqueda' : `Inicia agregando una nueva ${title.toLowerCase()}`}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Básica</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Código / NIT</TableHead>
                    {showIPSFields && <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ubicación</TableHead>}
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredData.map((item, idx) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50/50 border-slate-100 transition-colors"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-black text-slate-900 leading-none">{item.name}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registrado el {new Date(item.created_at || '').toLocaleDateString()}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-center">
                          <div className="space-y-1">
                            <div className="text-xs font-black text-slate-700">{item.nit || 'Sin NIT'}</div>
                            <Badge variant="outline" className="text-[10px] border-slate-200 font-bold px-2 rounded-md">
                              {item.code || 'S/C'}
                            </Badge>
                          </div>
                        </TableCell>
                        {showIPSFields && (
                          <TableCell className="px-8 py-6 text-center">
                            <div className="text-xs font-bold text-slate-600">{(item as CatalogIPS).city || '-'}</div>
                          </TableCell>
                        )}
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
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
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

      <SocialSecurityCatalogFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditItem(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
        editItem={editItem}
        title={title}
        showIPSFields={showIPSFields}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md bg-white">
          <div className="p-8 space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tight">¿Eliminar Registro?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium">
                Esta acción eliminará permanentemente la entidad del catálogo. Asegúrate de que no haya empleados vinculados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 flex gap-3 sm:gap-0">
            <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-slate-200">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 font-bold shadow-lg shadow-destructive/20">
              ELIMINAR AHORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

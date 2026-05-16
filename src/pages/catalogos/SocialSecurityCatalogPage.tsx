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
    <div className="space-y-6">
      {/* Header Premium - Clean Sky Style */}
      <div className="bg-card border-none shadow-sm rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-10 bg-primary rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Catálogo de Configuración</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed font-medium">
              {description}
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              onClick={() => { setEditItem(null); setDialogOpen(true); }} 
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              NUEVA {title.toUpperCase()}
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Estadísticas - Clean Sky Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Registros', value: data.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Entidades Activas', value: data.filter(i => i.is_active).length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'En Desuso', value: data.filter(i => !i.is_active).length, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-100' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black tracking-tight truncate leading-none mb-1">{kpi.value}</p>
                  <p className="text-[11px] font-bold text-foreground/80 leading-tight uppercase tracking-widest">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado - Clean Sky Style */}
      <div className="bg-card border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={`Buscar por nombre, NIT o código...`} 
              className="pl-11 h-10 bg-background border-none rounded-xl shadow-sm focus-visible:ring-primary/20 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 px-5 rounded-xl border-border bg-background shadow-sm font-bold text-muted-foreground hover:text-primary transition-all">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-muted/20 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground/30">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No hay resultados</h3>
                <p className="text-muted-foreground text-sm font-medium">{searchTerm ? 'Prueba con otros términos' : `Agrega una nueva ${title.toLowerCase()}`}</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="px-6 py-4">Información Básica</TableHead>
                  <TableHead className="px-6 py-4 text-center">Código / NIT</TableHead>
                  {showIPSFields && <TableHead className="px-6 py-4 text-center">Ubicación</TableHead>}
                  <TableHead className="px-6 py-4 text-center">Estado</TableHead>
                  <TableHead className="px-6 py-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredData.map((item, idx) => (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-muted/10 border-border/50 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{item.name}</div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ref: {item.id.split('-')[0]}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-foreground">{item.nit || 'Sin NIT'}</div>
                          {item.code && (
                            <Badge variant="outline">
                              {item.code}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showIPSFields && (
                        <TableCell className="px-6 py-4 text-center">
                          <div className="text-xs font-bold text-muted-foreground">{(item as CatalogIPS).city || '-'}</div>
                        </TableCell>
                      )}
                      <TableCell className="px-6 py-4 text-center">
                        <Badge variant={item.is_active ? "success" : "secondary"}>
                          {item.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </div>
      </div>

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
          <AlertDialogFooter className="p-6 bg-card flex gap-3 sm:gap-0">
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

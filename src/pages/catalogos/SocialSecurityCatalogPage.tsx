import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Filter,
  CheckCircle2,
  XCircle,
  Briefcase,
  Settings2,
  AlertTriangle,
  MapPin,
  Code,
  LayoutGrid,
  MoreHorizontal
} from 'lucide-react';
import { SocialSecurityCatalogFormDialog } from '@/components/config/SocialSecurityCatalogFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { CatalogItem, CatalogIPS } from '@/hooks/useSocialSecurityCatalogs';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 stroke-[2.5] text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{title}</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">CATÁLOGO</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{description}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => { setEditItem(null); setDialogOpen(true); }}
          className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all group w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-3 stroke-[3] group-hover:rotate-90 transition-transform" />
          REGISTRAR ENTIDAD
        </Button>
      </motion.div>

      {/* Stats Summary - Flat Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {[
          { label: 'Población Total', value: data.length, icon: LayoutGrid, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Entidades Activas', value: data.filter(i => i.is_active).length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Entidades Inactivas', value: data.filter(i => !i.is_active).length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Identificadas', value: data.filter(i => !!i.code).length, icon: Code, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-5 rounded-[2rem] bg-white border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">{isLoading ? '...' : stat.value}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="relative group px-1">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors stroke-[2.5]" />
        </div>
        <Input
          placeholder={`BUSCAR POR NOMBRE, NIT O CÓDIGO EN EL CATÁLOGO DE ${title.toUpperCase()}...`}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="h-14 pl-14 rounded-2xl bg-white border-slate-100 transition-all font-black text-[10px] uppercase tracking-widest"
        />
      </div>

      <div className="px-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 animate-pulse flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indexando base de datos...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Sin Coincidencias</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-xs">No se localizaron registros bajo el criterio de búsqueda establecido.</p>
          </div>
        ) : (
          <>
            <MobileCardList
              className="md:hidden"
              items={filteredData.map(item => ({
                id: item.id,
                title: <span className="font-black text-slate-900 uppercase tracking-tight">{item.name}</span>,
                subtitle: item.nit ? `NIT: ${item.nit}` : 'Sin Identificación Fiscal',
                badge: item.code ? <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] uppercase px-1.5 py-0.5 rounded-lg">{item.code}</Badge> : null,
                fields: [
                  {
                    label: 'Operatividad',
                    value: (
                      <Badge 
                        className={cn(
                          "font-black text-[8px] uppercase tracking-widest border-none px-2 py-0.5 rounded",
                          item.is_active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        )}
                      >
                        {item.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                      </Badge>
                    ),
                  },
                  ...(showIPSFields ? [{ label: 'Ubicación', value: <span className="text-[9px] font-black uppercase text-slate-500">{(item as CatalogIPS).city || 'SIN CIUDAD'}</span> }] : [])
                ],
                actions: (
                  <div className="flex gap-3 w-full mt-4 pt-4 border-t border-slate-50">
                    <Button onClick={() => handleEdit(item)} className="flex-1 h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[9px] gap-2 border-none">
                      <Pencil className="w-3.5 h-3.5" />
                      EDITAR
                    </Button>
                    <Button onClick={() => setDeleteId(item.id)} className="h-12 w-12 rounded-xl bg-red-50 text-red-600 font-black border-none shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              }))}
            />

            <div className="hidden md:block rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-slate-50/50 border-slate-100">
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidad Corporativa</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Identidad Fiscal</TableHead>
                    {showIPSFields && <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nodo Geográfico</TableHead>}
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group border-slate-50 hover:bg-primary/[0.02] transition-colors"
                    >
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-lg transition-transform">
                            {item.name.charAt(0)}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="font-black text-slate-900 uppercase tracking-tight truncate leading-none">{item.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IDENTIFICADOR: {item.id.split('-')[0].toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-900 uppercase">{item.nit || 'NO DISPONIBLE'}</span>
                          {item.code && (
                            <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] px-2 py-0.5 rounded-lg uppercase tracking-widest">
                              CÓDIGO: {item.code}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showIPSFields && (
                        <TableCell className="px-8 py-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary/50" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">{(item as CatalogIPS).city || '—'}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="px-8 py-6 text-center">
                        <Badge 
                          className={cn(
                            "h-7 px-3 rounded-lg border-none font-black text-[9px] uppercase tracking-widest",
                            item.is_active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {item.is_active ? 'OPERATIVO' : 'SUSPENDIDO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-11 w-11 rounded-xl hover:bg-primary hover:text-white transition-all border border-transparent hover:border-primary/20"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-4.5 h-4.5 stroke-[2.5]" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="w-4.5 h-4.5 stroke-[2.5]" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
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
        <AlertDialogContent className="rounded-[2.5rem] border-slate-100 bg-white p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-[1.25rem] bg-red-50 text-red-500 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">¿Depurar Registro?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                  Esta acción eliminará la entidad del catálogo permanentemente. <br />
                  Verifica que no existan vínculos contractuales activos.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-14 rounded-2xl border-slate-200 font-black uppercase text-[10px] tracking-widest flex-1">DESCARTAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] flex-1">
              CONFIRMAR ELIMINACIÓN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
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
  Settings2
} from 'lucide-react';
import { SocialSecurityCatalogFormDialog } from '@/components/config/SocialSecurityCatalogFormDialog';
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Plano */}
      <div className="bg-white border border-slate-200 shadow-none rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Catálogo de Configuración</span>
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              {title}
            </h1>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
              {description}
            </p>
          </div>
          
          <Button 
            onClick={() => { setEditItem(null); setDialogOpen(true); }} 
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVA {title.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Registros', value: data.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Entidades Activas', value: data.filter(i => i.is_active).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'En Desuso', value: data.filter(i => !i.is_active).length, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight truncate leading-none">{kpi.value}</p>
                </div>
                <div className={cn("p-3 rounded-lg flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado */}
      <Card className="bg-white border border-slate-200 shadow-none rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder={`Buscar...`} 
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-lg shadow-none focus:bg-white transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-lg border-slate-200 bg-white font-bold text-slate-600 hover:text-blue-600 text-sm transition-all">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No hay resultados</h3>
                <p className="text-slate-500 text-sm">{searchTerm ? 'Prueba con otros términos' : `Agrega una nueva ${title.toLowerCase()}`}</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Información Básica</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">NIT / Código</TableHead>
                  {showIPSFields && <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Ubicación</TableHead>}
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Estado</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate text-sm">{item.name}</div>
                          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ref: {item.id.split('-')[0]}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700">{item.nit || 'Sin NIT'}</div>
                        {item.code && (
                          <Badge variant="outline" className="text-[9px] h-5 rounded px-1.5 border-slate-200 bg-slate-50">
                            {item.code}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {showIPSFields && (
                      <TableCell className="px-6 py-4 text-center">
                        <div className="text-xs font-bold text-slate-500">{(item as CatalogIPS).city || '-'}</div>
                      </TableCell>
                    )}
                    <TableCell className="px-6 py-4 text-center">
                      <Badge className={cn(
                        "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                        item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                      )}>
                        {item.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white shadow-2xl p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-black text-slate-900 uppercase">¿Eliminar Registro?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-500 font-medium">
                Esta acción eliminará permanentemente la entidad del catálogo. Asegúrate de que no haya empleados vinculados.
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel className="flex-1 rounded-lg border-slate-200 font-bold uppercase text-[10px] tracking-widest">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-none">
              ELIMINAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

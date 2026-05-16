import { useState, useMemo } from 'react';
import { CreditCard, Plus, Pencil, Settings2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useIdentificationTypes } from '@/hooks/useSystemConfig';
import { IdentificationTypeFormDialog } from '@/components/config/IdentificationTypeFormDialog';
import { cn } from '@/lib/utils';
import type { IdentificationType } from '@/types/config';

export default function CatalogosTiposIdentificacion() {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<IdentificationType | null>(null);

  const { data: types = [], isLoading } = useIdentificationTypes();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Identificación Legal</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Tipos de Identificación
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Gestiona los documentos de identidad permitidos para registros de empleados y terceros.
            </p>
          </div>
          
          <Button 
            onClick={() => { setSelectedType(null); setShowForm(true); }}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVO TIPO
          </Button>
        </div>
      </div>

      {/* Listado - Flat Style */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none">
        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : types.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <CreditCard className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No hay tipos registrados</h3>
                <p className="text-slate-500 text-sm font-medium">Comienza creando el primer tipo de identificación legal.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-6 py-4">Documento / Tipo</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Código</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id} className="group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">{type.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="h-6 rounded-md bg-slate-100 text-slate-600 border-none font-bold text-[10px]">
                          {type.code || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                            type.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {type.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => { setSelectedType(type); setShowForm(true); }}
                          >
                            <Pencil className="w-4 h-4" />
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

      <IdentificationTypeFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        type={selectedType} 
      />
    </div>
  );
}

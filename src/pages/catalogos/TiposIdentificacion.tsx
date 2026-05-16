import { useState, useMemo } from 'react';
import { CreditCard, Plus, Pencil, Settings2, RefreshCw, Filter, Search } from 'lucide-react';
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

import { useIdentificationTypes } from '@/hooks/useSystemConfig';
import { IdentificationTypeFormDialog } from '@/components/config/IdentificationTypeFormDialog';
import { cn } from '@/lib/utils';
import type { IdentificationType } from '@/types/config';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function CatalogosTiposIdentificacion() {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<IdentificationType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: types = [], isLoading } = useIdentificationTypes();

  const filteredTypes = useMemo(() => {
    return types.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [types, searchTerm]);

  const stats = useMemo(() => ({
    total: types.length,
    active: types.filter(t => t.is_active).length,
    inactive: types.filter(t => !t.is_active).length,
  }), [types]);

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
            <CreditCard className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Identidad</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">LEGAL</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de documentos de identificación nacional</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={() => { setSelectedType(null); setShowForm(true); }}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVO TIPO
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-1">
        {[
          { label: 'Total Documentos', value: stats.total, icon: CreditCard, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Tipos Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Tipos Inactivos', value: stats.inactive, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
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
                placeholder="BUSCAR TIPO DE DOCUMENTO O CÓDIGO..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
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
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <CreditCard className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {searchTerm ? 'Prueba con otro término de búsqueda.' : 'No se han registrado tipos de identificación legal.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filteredTypes.map(type => ({
                    id: type.id,
                    title: type.name,
                    subtitle: `Código Legal: ${type.code || '—'}`,
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">DOCUMENTO</Badge>,
                    fields: [
                      {
                        label: 'ESTADO',
                        value: (
                          <Badge 
                            className={cn(
                              "h-5 px-3 rounded-md border-none font-black text-[8px] uppercase tracking-widest",
                              type.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {type.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50 transition-all" 
                          onClick={() => { setSelectedType(type); setShowForm(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                      </div>
                    )
                  }))}
                />

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Tipo de Identificación</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Referencia / Código</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTypes.map((type) => (
                        <TableRow key={type.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-xl group-hover:scale-110 transition-transform">
                                <CreditCard className="w-6 h-6 stroke-[2.5]" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{type.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[250px]">Identificación Oficial</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[10px] px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 font-black uppercase">
                              {type.code || '—'}
                            </code>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                type.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {type.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all gap-3">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                onClick={() => { setSelectedType(type); setShowForm(true); }}
                              >
                                <Pencil className="w-5 h-5 text-slate-400" />
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

      <IdentificationTypeFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        type={selectedType} 
      />
    </div>
  );
}

// Sub-components icons for consistency
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

import { useAreas } from '@/hooks/useSystemConfig';
import { AreaFormDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { Area } from '@/types/config';

export default function CatalogosAreas() {
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const { data: areas = [], isLoading } = useAreas();

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-primary/10 shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-md shadow-primary/10">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase leading-tight">
                Áreas / <span className="text-primary">Departamentos</span>
              </h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                Gestiona la estructura organizacional y jerárquica de tu empresa.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => { setSelectedArea(null); setShowAreaForm(true); }}
            className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105 shadow-lg shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" /> 
            Nueva Área
          </Button>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Áreas', value: areas.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
          { label: 'Activas', value: areas.filter(a => a.is_active).length, icon: Users, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
          { label: 'Inactivas', value: areas.filter(a => !a.is_active).length, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-muted/20' },
          { label: 'Jerarquías', value: areas.filter(a => a.parent_id).length, icon: Users, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 bg-background/50 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-sm",
              stat.border
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                </h2>
              </div>
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[2.5rem] border-2 border-border/50 bg-background/50 backdrop-blur-xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Estructura Organizacional</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Listado detallado de departamentos y códigos internos.</p>
          </div>
        </div>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : areas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay áreas registradas. Crea la primera.
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              items={areas.map((area) => ({
                id: area.id,
                title: area.name,
                subtitle: area.description || 'Sin descripción',
                badge: (
                  <Badge
                    variant="outline"
                    className={area.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                  >
                    {area.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                ),
                fields: [
                  { label: 'Código', value: area.code || '—' },
                  { label: 'Estado', value: area.is_active ? 'Activa' : 'Inactiva' },
                ],
                actions: (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedArea(area); setShowAreaForm(true); }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ),
              }))}
            />
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>{area.code || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{area.description || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={area.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                      >
                        {area.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setSelectedArea(area); setShowAreaForm(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}

      </div>

      <AreaFormDialog 
        open={showAreaForm} 
        onOpenChange={setShowAreaForm} 
        area={selectedArea} 
      />
    </div>
  );
}

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

import { useAreas } from '@/hooks/useSystemConfig';
import { AreaFormDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { Area } from '@/types/config';

export default function CatalogosAreas() {
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const { data: areas = [], isLoading } = useAreas();

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3 sm:items-center">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Áreas / Departamentos</h1>
            <p className="text-muted-foreground mt-1">Gestiona la estructura organizacional</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Áreas</CardTitle>
            <CardDescription>Áreas y departamentos de la organización</CardDescription>
          </div>
          <Button onClick={() => { setSelectedArea(null); setShowAreaForm(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />Nueva Área
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <AreaFormDialog 
        open={showAreaForm} 
        onOpenChange={setShowAreaForm} 
        area={selectedArea} 
      />
    </div>
  );
}

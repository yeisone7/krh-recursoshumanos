import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Edit2 } from 'lucide-react';

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

import { useIdentificationTypes } from '@/hooks/useSystemConfig';
import { IdentificationTypeFormDialog } from '@/components/config/IdentificationTypeFormDialog';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { IdentificationType } from '@/types/config';

export default function CatalogosTiposIdentificacion() {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<IdentificationType | null>(null);

  const { data: types = [], isLoading } = useIdentificationTypes();

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3 sm:items-center">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Tipos de Identificación</h1>
            <p className="text-muted-foreground mt-1">Gestiona los documentos de identidad permitidos</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Tipos</CardTitle>
            <CardDescription>Documentos configurados para la empresa</CardDescription>
          </div>
          <Button onClick={() => { setSelectedType(null); setShowForm(true); }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />Nuevo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : types.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay tipos de identificación registrados.
            </div>
          ) : (
            <>
            <MobileCardList
              className="md:hidden"
              items={types.map((type) => ({
                id: type.id,
                title: type.name,
                subtitle: type.code || 'Sin código',
                badge: (
                  <Badge
                    variant="outline"
                    className={type.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-background '}
                  >
                    {type.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                ),
                fields: [
                  { label: 'Código', value: type.code || '—' },
                  { label: 'Estado', value: type.is_active ? 'Activo' : 'Inactivo' },
                ],
                actions: (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedType(type); setShowForm(true); }}
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
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.code || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={type.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-background '}
                      >
                        {type.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setSelectedType(type); setShowForm(true); }}
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

      <IdentificationTypeFormDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        type={selectedType} 
      />
    </div>
  );
}

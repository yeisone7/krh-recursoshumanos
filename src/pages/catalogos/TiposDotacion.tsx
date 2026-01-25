import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Plus, Edit2 } from 'lucide-react';

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

import { useDotationItemTypes } from '@/hooks/useSystemConfig';
import { DotationItemTypeFormDialog } from '@/components/config';
import { DOTATION_CATEGORIES } from '@/types/config';
import type { DotationItemType } from '@/types/config';

export default function CatalogosTiposDotacion() {
  const [showDotationForm, setShowDotationForm] = useState(false);
  const [selectedDotationItem, setSelectedDotationItem] = useState<DotationItemType | null>(null);

  const { data: dotationTypes = [], isLoading } = useDotationItemTypes();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shirt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tipos de Dotación</h1>
            <p className="text-muted-foreground mt-1">Catálogo de artículos de dotación</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Listado de Tipos</CardTitle>
            <CardDescription>Artículos disponibles para entrega de dotación</CardDescription>
          </div>
          <Button onClick={() => { setSelectedDotationItem(null); setShowDotationForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />Nuevo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : dotationTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay tipos de dotación registrados. Crea el primero.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Requiere Talla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dotationTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code || '-'}</TableCell>
                    <TableCell>
                      {DOTATION_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </TableCell>
                    <TableCell>{item.default_validity_months} meses</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={item.requires_size ? 'bg-primary/10 text-primary' : ''}>
                        {item.requires_size ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={item.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                      >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setSelectedDotationItem(item); setShowDotationForm(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DotationItemTypeFormDialog 
        open={showDotationForm} 
        onOpenChange={setShowDotationForm} 
        itemType={selectedDotationItem} 
      />
    </div>
  );
}

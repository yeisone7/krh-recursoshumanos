import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Edit2, FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { usePositions } from '@/hooks/useSystemConfig';
import { usePositionProfiles } from '@/hooks/usePositionProfiles';
import { PositionFormDialog, PositionProfileDetailDialog } from '@/components/config';
import type { Position } from '@/types/config';

export default function CatalogosCargos() {
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ id: string; name: string; area?: string } | null>(null);

  const { data: positions = [], isLoading } = usePositions();
  const { data: allProfiles = [] } = usePositionProfiles();

  const hasProfile = (posId: string) => allProfiles.some((p: any) => p.position_id === posId && p.is_current);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Cargos</h1>
            <p className="text-muted-foreground mt-1">Gestiona los cargos de la organización</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Listado de Cargos</CardTitle>
            <CardDescription>Cargos y posiciones disponibles</CardDescription>
          </div>
          <Button onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />Nuevo Cargo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cargos registrados. Crea el primero.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos: any) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>{pos.code || '-'}</TableCell>
                    <TableCell>{pos.areas?.name || '-'}</TableCell>
                    <TableCell>{pos.level}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={hasProfile(pos.id) ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                      >
                        {hasProfile(pos.id) ? 'Configurado' : 'Sin perfil'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                      >
                        {pos.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver/Crear Perfil</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Cargo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PositionFormDialog 
        open={showPositionForm} 
        onOpenChange={setShowPositionForm} 
        position={selectedPosition} 
      />

      {profileTarget && (
        <PositionProfileDetailDialog
          open={!!profileTarget}
          onOpenChange={(open) => { if (!open) setProfileTarget(null); }}
          positionId={profileTarget.id}
          positionName={profileTarget.name}
          areaName={profileTarget.area}
        />
      )}
    </div>
  );
}

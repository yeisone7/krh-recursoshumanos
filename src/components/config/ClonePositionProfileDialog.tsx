import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { usePositions } from '@/hooks/useSystemConfig';
import { useCreatePositionProfile, usePositionProfiles } from '@/hooks/usePositionProfiles';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProfile: any;
  sourcePositionName: string;
}

export function ClonePositionProfileDialog({ open, onOpenChange, sourceProfile, sourcePositionName }: Props) {
  const [targetPositionId, setTargetPositionId] = useState('');
  const { data: positions = [] } = usePositions();
  const { data: targetVersions = [] } = usePositionProfiles(targetPositionId || undefined);
  const createProfile = useCreatePositionProfile();

  const activePositions = positions.filter((p: any) => p.is_active && p.id !== sourceProfile?.position_id);

  const handleClone = async () => {
    if (!targetPositionId || !sourceProfile) {
      toast.error('Selecciona un cargo destino');
      return;
    }

    const nextVersion = targetVersions.length > 0
      ? Math.max(...targetVersions.map((v: any) => v.version)) + 1
      : 1;

    try {
      await createProfile.mutateAsync({
        positionId: targetPositionId,
        data: {
          purpose: sourceProfile.purpose || '',
          reports_to: sourceProfile.reports_to || '',
          supervises: sourceProfile.supervises || '',
          num_positions: sourceProfile.num_positions || 1,
          education_level: sourceProfile.education_level || '',
          education_detail: sourceProfile.education_detail || '',
          experience: sourceProfile.experience || '',
          specific_knowledge: sourceProfile.specific_knowledge || [],
          skills: sourceProfile.skills || [],
          functions: sourceProfile.functions || [],
          responsibilities: sourceProfile.responsibilities || {},
          working_conditions: sourceProfile.working_conditions || {},
          elaborated_by: sourceProfile.elaborated_by || '',
          reviewed_by: sourceProfile.reviewed_by || '',
          approved_by: sourceProfile.approved_by || '',
          effective_date: new Date().toISOString().split('T')[0],
        },
        nextVersion,
      });

      const targetName = activePositions.find((p: any) => p.id === targetPositionId)?.name || '';
      toast.success(`Perfil clonado exitosamente a "${targetName}"`);
      setTargetPositionId('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Clonar Perfil de Cargo</DialogTitle>
          <DialogDescription>
            Duplicar el perfil de <strong>{sourcePositionName}</strong> a otro cargo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
          <div>
            <Label>Cargo destino</Label>
            <Select value={targetPositionId} onValueChange={setTargetPositionId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
              <SelectContent>
                {activePositions.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.areas?.name ? `(${p.areas.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleClone} disabled={!targetPositionId || createProfile.isPending} className="w-full sm:w-auto">
            {createProfile.isPending ? 'Clonando...' : 'Clonar Perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

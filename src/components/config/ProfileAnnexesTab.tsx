import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { useProfileAnnexes, useDeleteProfileAnnex } from '@/hooks/useProfileAnnexes';
import { ProfileAnnexForm } from './ProfileAnnexForm';
import { toast } from 'sonner';
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

interface Props {
  profileId: string;
  baseProfile: any;
}

const OVERRIDE_LABELS: Record<string, string> = {
  purpose: 'Objetivo',
  reports_to: 'Reporta a',
  supervises: 'Supervisa a',
  num_positions: 'N° cargos',
  education_level: 'Educación',
  education_detail: 'Formación',
  experience: 'Experiencia',
  specific_knowledge: 'Conocimientos',
  skills: 'Competencias',
  functions: 'Funciones',
  responsibilities: 'Responsabilidades',
  working_conditions: 'Condiciones',
};

function getOverriddenFields(annex: any): string[] {
  return Object.keys(OVERRIDE_LABELS).filter(key => {
    const val = annex[key];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    if (typeof val === 'string') return val.trim() !== '';
    return true;
  });
}

export function ProfileAnnexesTab({ profileId, baseProfile }: Props) {
  const { data: annexes = [], isLoading } = useProfileAnnexes(profileId);
  const deleteAnnex = useDeleteProfileAnnex();
  const [showForm, setShowForm] = useState(false);
  const [editingAnnex, setEditingAnnex] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAnnex.mutateAsync(deletingId);
      toast.success('Anexo eliminado');
    } catch {
      toast.error('Error al eliminar el anexo');
    }
    setDeletingId(null);
  };

  const handleEdit = (annex: any) => {
    setEditingAnnex(annex);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAnnex(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando anexos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Anexos por Centro de Operación</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personaliza campos específicos del perfil para centros de operación particulares.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Agregar Anexo
        </Button>
      </div>

      {annexes.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay anexos configurados. Los campos del perfil base se aplican a todos los centros.
            </p>
          </CardContent>
        </Card>
      )}

      {annexes.map((annex: any) => {
        const overrides = getOverriddenFields(annex);
        return (
          <Card key={annex.id} className="border-l-4 border-l-primary/40">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">
                      {annex.operation_centers?.name || 'Centro desconocido'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {overrides.map(field => (
                      <Badge key={field} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {OVERRIDE_LABELS[field]}
                      </Badge>
                    ))}
                    {overrides.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Sin campos personalizados</span>
                    )}
                  </div>
                  {annex.notes && (
                    <div className="flex items-start gap-1 mt-1">
                      <FileText className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{annex.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(annex)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(annex.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <ProfileAnnexForm
        open={showForm}
        onOpenChange={handleCloseForm}
        profileId={profileId}
        baseProfile={baseProfile}
        existingAnnex={editingAnnex}
        existingCenterIds={annexes.map((a: any) => a.operation_center_id)}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las personalizaciones para este centro de operación. El perfil base seguirá aplicando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

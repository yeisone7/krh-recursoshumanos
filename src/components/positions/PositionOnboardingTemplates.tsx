import { useState } from 'react';
import { CheckCircle2, ListChecks, Loader2, Plus, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useOnboardingTemplates,
  useAddOnboardingTemplate,
  useDeleteOnboardingTemplate,
  useImportPredefinedTemplates,
} from '@/hooks/useOnboardingTemplates';
import { toast } from 'sonner';

interface Props {
  positionId: string;
  positionName: string;
}

export function PositionOnboardingTemplates({ positionId, positionName }: Props) {
  const { data: templates, isLoading } = useOnboardingTemplates(positionId);
  const addTemplate = useAddOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();
  const importPredefined = useImportPredefinedTemplates();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleAdd = () => {
    if (!label.trim()) return;
    addTemplate.mutate(
      { positionId, label: label.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => { setLabel(''); setDescription(''); setShowForm(false); toast.success('Tarea agregada a la plantilla'); },
        onError: (err) => toast.error('Error', { description: err.message }),
      }
    );
  };

  const handleImport = () => {
    importPredefined.mutate(positionId, {
      onSuccess: () => toast.success('Plantilla predeterminada importada'),
      onError: (err) => toast.error('Error', { description: err.message }),
    });
  };

  const handleDelete = (templateId: string) => {
    deleteTemplate.mutate(
      { templateId, positionId },
      { onSuccess: () => toast.success('Tarea eliminada de la plantilla') }
    );
  };

  const hasTemplates = templates && templates.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Plantilla de Onboarding</h3>
          {hasTemplates && (
            <Badge variant="secondary" className="text-xs">{templates.length} tareas</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasTemplates && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleImport}
              disabled={importPredefined.isPending}
            >
              {importPredefined.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Importar predeterminadas
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Define las tareas que se generarán automáticamente al crear un empleado con el cargo <strong>{positionName}</strong>. Si no hay plantilla, se usarán las 8 tareas predeterminadas.
      </p>

      {showForm && (
        <div className="p-3 rounded-lg border border-dashed border-primary/30 space-y-2">
          <Input
            placeholder="Nombre de la tarea *"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowForm(false); setLabel(''); setDescription(''); }}>
              Cancelar
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!label.trim() || addTemplate.isPending}>
              {addTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Agregar
            </Button>
          </div>
        </div>
      )}

      {hasTemplates ? (
        <div className="space-y-1">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="group flex items-start gap-3 p-3 rounded-lg hover:bg-background transition-colors"
            >
              <CheckCircle2 className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{tpl.task_label}</p>
                {tpl.task_description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.task_description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(tpl.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 text-muted-foreground hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin plantilla personalizada</p>
          <p className="text-xs mt-1">Se usarán las 8 tareas predeterminadas al crear empleados con este cargo.</p>
        </div>
      )}
    </div>
  );
}

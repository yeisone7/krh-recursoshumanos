import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TemplateDialogSizeToggle({
  isMaximized,
  onToggle,
}: {
  isMaximized: boolean;
  onToggle: () => void;
}) {
  const label = isMaximized ? 'Restaurar tamaño' : 'Maximizar modal';
  const Icon = isMaximized ? Minimize2 : Maximize2;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 bg-background shadow-sm"
      aria-label={label}
      aria-pressed={isMaximized}
      title={label}
      onClick={onToggle}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

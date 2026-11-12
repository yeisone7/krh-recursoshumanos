import { Maximize2, Minimize2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function IncapacityDialogSizeToggle({
  isMaximized,
  onToggle,
}: {
  isMaximized: boolean;
  onToggle: () => void;
}) {
  const label = isMaximized ? 'Restablecer tamaño' : 'Maximizar';
  const Icon = isMaximized ? Minimize2 : Maximize2;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isMaximized}
      title={label}
      className="h-9 gap-2 px-2.5 text-xs"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}

import type { ReactNode } from 'react';
import { Stethoscope } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function IncapacityDialogHeader({ title, description, actions }: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <DialogHeader className="incapacity-dialog-header shrink-0 text-left">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-10">
          <Stethoscope className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <DialogTitle className="break-words text-lg font-bold leading-tight tracking-tight sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-snug sm:text-sm">{description}</DialogDescription>
        </div>
        {actions && <div className="ml-auto shrink-0">{actions}</div>}
      </div>
    </DialogHeader>
  );
}

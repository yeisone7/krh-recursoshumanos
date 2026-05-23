import { useState } from 'react';
import { ZoomIn } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EmployeeAvatarZoomProps {
  imageUrl?: string | null;
  name: string;
  initials: string;
  avatarClassName?: string;
  fallbackClassName?: string;
}

export function EmployeeAvatarZoom({
  imageUrl,
  name,
  initials,
  avatarClassName,
  fallbackClassName,
}: EmployeeAvatarZoomProps) {
  const [open, setOpen] = useState(false);
  const hasImage = Boolean(imageUrl);

  const avatar = (
    <Avatar className={avatarClassName}>
      <AvatarImage src={imageUrl || undefined} alt={name} />
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );

  return (
    <>
      {hasImage ? (
        <button
          type="button"
          className="group/avatar relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title="Ampliar foto"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          {avatar}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/0 text-white opacity-0 transition-all group-hover/avatar:bg-slate-950/35 group-hover/avatar:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        </button>
      ) : (
        avatar
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-xl overflow-hidden p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-base font-bold">{name}</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-950 p-4">
            <div className="flex max-h-[72dvh] items-center justify-center overflow-hidden rounded-lg bg-slate-900">
              <img
                src={imageUrl || ''}
                alt={name}
                className={cn('max-h-[72dvh] w-auto max-w-full object-contain')}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

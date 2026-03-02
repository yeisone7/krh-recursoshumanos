import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  if (!src) return null;

  return (
    <Dialog open={!!src} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95 flex items-center justify-center overflow-hidden [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:h-8 [&>button]:w-8 [&>button]:top-3 [&>button]:right-3">
        <img
          src={src}
          alt={alt || 'Vista ampliada'}
          className="max-w-full max-h-[90vh] object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
        {alt && (
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm px-4">
            {alt}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

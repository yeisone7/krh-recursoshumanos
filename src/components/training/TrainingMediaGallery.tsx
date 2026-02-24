import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Video, FileText, FileImage, ExternalLink } from 'lucide-react';
import type { TrainingMedia } from '@/types/training';

interface TrainingMediaGalleryProps {
  media: TrainingMedia[];
  onDelete?: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  imagen: <Image className="h-8 w-8" />,
  video: <Video className="h-8 w-8" />,
  documento: <FileText className="h-8 w-8" />,
  infografia: <FileImage className="h-8 w-8" />,
};

const typeColors: Record<string, string> = {
  imagen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  video: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  documento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  infografia: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function TrainingMediaGallery({ media, onDelete }: TrainingMediaGalleryProps) {
  if (media.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No hay multimedia asociada</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {media.map((item) => (
        <Card key={item.id} className="overflow-hidden group">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${typeColors[item.type] || 'bg-muted'}`}>
                {typeIcons[item.type] || <FileText className="h-8 w-8" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                  {item.file_size && (
                    <span className="text-xs text-muted-foreground">
                      {(item.file_size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              </div>
            </div>

            {item.type === 'imagen' && (
              <div className="mt-3 rounded-lg overflow-hidden bg-muted">
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
              {onDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-destructive hover:underline ml-auto"
                >
                  Eliminar
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

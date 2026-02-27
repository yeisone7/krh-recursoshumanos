import { format, parseISO } from 'date-fns';
import { ExternalLink, Trash2, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TrainingMedia } from '@/types/training';

interface MediaTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: TrainingMedia[];
  isGenerating: boolean;
  onGenerate: () => void;
  onDelete: (id: string) => void;
  children?: React.ReactNode;
}

export function MediaTypeCard({
  icon,
  title,
  description,
  items,
  isGenerating,
  onGenerate,
  onDelete,
  children,
}: MediaTypeCardProps) {
  return (
    <Card className="border">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{title}</span>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {items.length} generado{items.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {children}

        {items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(item.created_at), 'dd/M/yyyy')}
                  </span>
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-destructive hover:text-destructive/80 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" /> {items.length > 0 ? 'Generar otro' : 'Generar'}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

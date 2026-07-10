import React from 'react';
import { format, parseISO } from 'date-fns';
import { ExternalLink, Trash2, Plus, Loader2, Upload, Link2, Presentation, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TrainingMedia } from '@/types/training';
import { isSlideDeck, SlideDeckViewer } from './SlideDeckViewer';

interface MediaTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: TrainingMedia[];
  isGenerating: boolean;
  onGenerate: () => void;
  onDelete: (id: string) => void;
  uploadAccept?: string;
  isUploading?: boolean;
  onUpload?: (file: File) => void;
  isAddingLink?: boolean;
  onAddLink?: (url: string, title?: string) => Promise<void> | void;
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
  uploadAccept,
  isUploading = false,
  onUpload,
  isAddingLink = false,
  onAddLink,
  children,
}: MediaTypeCardProps) {
  const [showLinkForm, setShowLinkForm] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkTitle, setLinkTitle] = React.useState('');
  const [expandedSlideDeckId, setExpandedSlideDeckId] = React.useState<string | null>(null);

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !onAddLink) return;
    await onAddLink(linkUrl.trim(), linkTitle.trim() || undefined);
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkForm(false);
  };

  return (
    <Card className="border">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-background ">
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
            {items.map((item) => {
              const slideDeck = (item.metadata as any)?.slide_deck;
              const canPreviewSlides = (item.metadata as any)?.is_slide_deck && isSlideDeck(slideDeck);
              const isExpanded = expandedSlideDeckId === item.id;

              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(item.created_at), 'dd/M/yyyy')}
                      </span>
                      <span className="max-w-[180px] truncate text-xs font-medium">
                        {item.title}
                      </span>
                      {canPreviewSlides ? (
                        <Button
                          type="button"
                          variant={isExpanded ? 'secondary' : 'outline'}
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => setExpandedSlideDeckId(isExpanded ? null : item.id)}
                        >
                          {isExpanded ? <Presentation className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {isExpanded ? 'Ocultar' : 'Ver'}
                        </Button>
                      ) : item.file_url?.endsWith('.mp3') || item.file_url?.endsWith('.wav') ? (
                        <audio controls className="h-8 max-w-[180px]" src={item.file_url}>
                          Tu navegador no soporta audio.
                        </audio>
                      ) : (
                        <button
                          onClick={() => {
                            if (item.file_url.startsWith('data:')) {
                              const w = window.open();
                              if (w) {
                                w.document.write(`<img src="${item.file_url}" style="max-width:100%;height:auto;" />`);
                                w.document.title = 'Vista previa';
                              }
                            } else {
                              window.open(item.file_url, '_blank');
                            }
                          }}
                          className="text-primary hover:text-primary/80 p-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {canPreviewSlides && isExpanded && (
                    <div className="rounded-lg border bg-background p-3">
                      <SlideDeckViewer deck={slideDeck} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onGenerate}
            disabled={isGenerating || isUploading}
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> {items.length > 0 ? 'Generar otro' : 'Generar'}</>
            )}
          </Button>
          {onUpload && uploadAccept && (
            <Button asChild variant="outline" className="w-full" disabled={isGenerating || isUploading}>
              <label className={(isGenerating || isUploading) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Subir</>
                )}
                <input
                  type="file"
                  accept={uploadAccept}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) onUpload(file);
                  }}
                  disabled={isGenerating || isUploading}
                />
              </label>
            </Button>
          )}
          {onAddLink && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:col-span-2"
              disabled={isGenerating || isUploading || isAddingLink}
              onClick={() => setShowLinkForm(value => !value)}
            >
              {isAddingLink ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando link...</>
              ) : (
                <><Link2 className="h-4 w-4 mr-2" /> Agregar link</>
              )}
            </Button>
          )}
        </div>

        {showLinkForm && onAddLink && (
          <div className="space-y-2 rounded-lg border bg-background p-3">
            <Input
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
              placeholder="Nombre del recurso (opcional)"
              disabled={isAddingLink}
            />
            <Input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={isAddingLink}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!linkUrl.trim() || isAddingLink}
                onClick={handleAddLink}
              >
                Guardar link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="flex-1"
                disabled={isAddingLink}
                onClick={() => setShowLinkForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

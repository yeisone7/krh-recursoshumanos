import { useState } from 'react';
import { FileText, Download, Eye, Clock, User, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useDocumentVersions,
  useCurrentDocument,
  useDocumentUrl,
  downloadDocument,
  type EntityType,
  type DocumentVersion,
} from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface DocumentViewerProps {
  entityType: EntityType;
  entityId: string;
  showVersionHistory?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function DocumentItem({ 
  doc, 
  isCurrent = false 
}: { 
  doc: DocumentVersion; 
  isCurrent?: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: signedUrl } = useDocumentUrl(doc.file_path);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDocument(doc.file_path, doc.file_name);
      toast.success('Documento descargado');
    } catch (error) {
      toast.error('Error al descargar el documento');
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const isPdf = doc.mime_type === 'application/pdf';
  const isImage = doc.mime_type.startsWith('image/');

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card',
        isCurrent && 'border-primary/50 bg-accent/50'
      )}
    >
      <div className="flex-shrink-0">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          isPdf ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        )}>
          <FileText className="h-5 w-5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{doc.file_name}</p>
          {isCurrent && (
            <Badge variant="default" className="text-xs">
              Actual
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(doc.uploaded_at), "d MMM yyyy, HH:mm", { locale: es })}
          </span>
          <span>{formatFileSize(doc.file_size)}</span>
          <span>v{doc.version}</span>
        </div>
        {doc.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {doc.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {(isPdf || isImage) && signedUrl && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreview}
            title="Ver documento"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          disabled={isDownloading}
          title="Descargar"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function DocumentViewer({
  entityType,
  entityId,
  showVersionHistory = false,
  className,
}: DocumentViewerProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const { data: currentDoc, isLoading: loadingCurrent } = useCurrentDocument(entityType, entityId);
  const { data: versions, isLoading: loadingVersions } = useDocumentVersions(entityType, entityId);

  if (loadingCurrent) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground', className)}>
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay documento adjunto</p>
      </div>
    );
  }

  const previousVersions = versions?.filter((v) => !v.is_current) || [];

  return (
    <div className={cn('space-y-3', className)}>
      <DocumentItem doc={currentDoc} isCurrent />

      {showVersionHistory && previousVersions.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs text-muted-foreground">
                {previousVersions.length} versiones anteriores
              </span>
              {historyOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {previousVersions.map((doc) => (
              <DocumentItem key={doc.id} doc={doc} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// Compact version for inline display
export function DocumentBadge({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { data: currentDoc } = useCurrentDocument(entityType, entityId);
  const { data: signedUrl } = useDocumentUrl(currentDoc?.file_path);

  if (!currentDoc) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sin documento
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="cursor-pointer hover:bg-secondary/80"
      onClick={() => signedUrl && window.open(signedUrl, '_blank')}
    >
      <FileText className="h-3 w-3 mr-1" />
      Ver documento
      <ExternalLink className="h-3 w-3 ml-1" />
    </Badge>
  );
}

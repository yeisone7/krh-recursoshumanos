import { useState } from 'react';
import { FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DocumentUpload } from './DocumentUpload';
import { DocumentViewer } from './DocumentViewer';
import { useCurrentDocument, type EntityType } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

interface DocumentSectionProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
  allowUpload?: boolean;
  showVersionHistory?: boolean;
  compact?: boolean;
  className?: string;
}

export function DocumentSection({
  entityType,
  entityId,
  title = 'Documento de Soporte',
  allowUpload = true,
  showVersionHistory = true,
  compact = false,
  className,
}: DocumentSectionProps) {
  const [showUpload, setShowUpload] = useState(false);
  const { data: currentDoc } = useCurrentDocument(entityType, entityId);

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </span>
          {allowUpload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="h-4 w-4 mr-1" />
              {currentDoc ? 'Nueva versión' : 'Subir'}
            </Button>
          )}
        </div>
        
        {showUpload && (
          <DocumentUpload
            entityType={entityType}
            entityId={entityId}
            onUploadComplete={() => setShowUpload(false)}
            compact
          />
        )}
        
        <DocumentViewer
          entityType={entityType}
          entityId={entityId}
          showVersionHistory={showVersionHistory}
        />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {allowUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="h-4 w-4 mr-1" />
              {currentDoc ? 'Nueva versión' : 'Subir documento'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showUpload && (
          <DocumentUpload
            entityType={entityType}
            entityId={entityId}
            onUploadComplete={() => setShowUpload(false)}
          />
        )}
        
        <DocumentViewer
          entityType={entityType}
          entityId={entityId}
          showVersionHistory={showVersionHistory}
        />
      </CardContent>
    </Card>
  );
}

// Inline document indicator for tables/lists
export function DocumentIndicator({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { data: currentDoc, isLoading } = useCurrentDocument(entityType, entityId);

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">...</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        currentDoc ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <FileText className="h-3 w-3" />
      {currentDoc ? 'Adjunto' : 'Sin documento'}
    </span>
  );
}

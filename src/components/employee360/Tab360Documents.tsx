import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Folder,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  EmployeeV2WithRelations,
  employeeDocumentFolderOrder,
  employeeDocumentTypeLabels,
  normalizeEmployeeDocumentFolder,
} from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tab360DocumentsProps {
  employee: EmployeeV2WithRelations;
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <File className="h-4 w-4" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4 text-success" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractStoragePath(fileUrl: string): string {
  if (fileUrl.includes('storage/v1/object/public/documents/')) {
    return fileUrl.split('storage/v1/object/public/documents/')[1];
  }
  if (fileUrl.includes('storage/v1/object/documents/')) {
    return fileUrl.split('storage/v1/object/documents/')[1];
  }
  if (fileUrl.startsWith('documents/')) {
    return fileUrl.replace('documents/', '');
  }
  return fileUrl;
}

function DocumentTreeItem({ doc }: { doc: any }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleView = async () => {
    if (!doc.file_url) return;

    setIsLoading(true);
    try {
      const storagePath = extractStoragePath(doc.file_url);
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);

      if (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Error al acceder al documento');
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Error al acceder al documento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!doc.file_url) return;

    setIsLoading(true);
    try {
      const storagePath = extractStoragePath(doc.file_url);
      const { data, error } = await supabase.storage.from('documents').download(storagePath);

      if (error) {
        console.error('Error downloading document:', error);
        toast.error('Error al descargar el documento');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative py-1.5 before:absolute before:-left-3 before:top-5 before:h-px before:w-3 before:bg-border">
      <div className="flex flex-col gap-2 rounded-lg bg-background p-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
            {getFileIcon(doc.mime_type)}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {doc.document_name || doc.file_name || 'Documento'}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(doc.upload_date), 'PP', { locale: es })}
              {doc.file_size ? <span>| {formatFileSize(doc.file_size)}</span> : null}
            </span>
            {doc.observations && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.observations}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
          {doc.expiry_date && (
            <Badge variant={new Date(doc.expiry_date) < new Date() ? 'destructive' : 'outline'} className="text-[11px]">
              Vence: {format(new Date(doc.expiry_date), 'PP', { locale: es })}
            </Badge>
          )}
          {doc.file_url && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleView} disabled={isLoading} title="Ver documento">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} disabled={isLoading} title="Descargar documento">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tab360Documents({ employee }: Tab360DocumentsProps) {
  const documents = employee.documents || [];
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(
    () => Object.fromEntries(employeeDocumentFolderOrder.map((folder) => [folder, true]))
  );

  const grouped = employeeDocumentFolderOrder.reduce(
    (acc, folder) => ({ ...acc, [folder]: [] as any[] }),
    {} as Record<string, any[]>
  );

  documents.forEach((doc) => {
    const type = normalizeEmployeeDocumentFolder(doc.document_type || 'otro');
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(doc);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <h3 className="font-semibold text-foreground">Documentos del Empleado</h3>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-1">
        {employeeDocumentFolderOrder.map((folder) => {
          const docs = grouped[folder] || [];
          const isOpen = openFolders[folder] ?? true;

          return (
            <div key={folder} className="relative">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                onClick={() => setOpenFolders((current) => ({ ...current, [folder]: !isOpen }))}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{employeeDocumentTypeLabels[folder]}</span>
                {docs.length > 0 && <Badge variant="secondary" className="h-5 text-[10px]">{docs.length}</Badge>}
              </button>

              {isOpen && (
                <div className="ml-5 border-l border-border pl-3">
                  {docs.length > 0 ? (
                    docs.map((doc) => <DocumentTreeItem key={doc.id} doc={doc} />)
                  ) : (
                    <div className="relative py-2 pl-1 text-xs text-muted-foreground before:absolute before:-left-3 before:top-4 before:h-px before:w-3 before:bg-border">
                      Sin documentos
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

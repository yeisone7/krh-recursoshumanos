import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Calendar, FileImage, File, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeV2WithRelations, employeeDocumentTypeLabels } from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tab360DocumentsProps {
  employee: EmployeeV2WithRelations;
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <File className="w-5 h-5" />;
  if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5 text-success" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-destructive" />;
  return <File className="w-5 h-5" />;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Extract storage path from a full URL or return the path if it's already a path
function extractStoragePath(fileUrl: string): string {
  // If it's a full URL, extract the path after the bucket name
  if (fileUrl.includes('storage/v1/object/public/documents/')) {
    return fileUrl.split('storage/v1/object/public/documents/')[1];
  }
  if (fileUrl.includes('storage/v1/object/documents/')) {
    return fileUrl.split('storage/v1/object/documents/')[1];
  }
  // If it starts with 'documents/', remove it
  if (fileUrl.startsWith('documents/')) {
    return fileUrl.replace('documents/', '');
  }
  return fileUrl;
}

function DocumentCard({ doc, index }: { doc: any; index: number }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleView = async () => {
    if (!doc.file_url) return;
    
    setIsLoading(true);
    try {
      const storagePath = extractStoragePath(doc.file_url);
      
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

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
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (error) {
        console.error('Error downloading document:', error);
        toast.error('Error al descargar el documento');
        return;
      }

      // Create download link
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {getFileIcon(doc.mime_type)}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-sm line-clamp-1">
                    {doc.document_name || doc.file_name || 'Documento'}
                  </h4>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {employeeDocumentTypeLabels[doc.document_type] || doc.document_type}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(doc.upload_date), "d MMM yyyy", { locale: es })}</span>
                </div>
                {doc.file_size && (
                  <span>• {formatFileSize(doc.file_size)}</span>
                )}
              </div>

              {doc.expiry_date && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Vence: </span>
                  <span className={cn(
                    new Date(doc.expiry_date) < new Date() && 'text-destructive'
                  )}>
                    {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: es })}
                  </span>
                </p>
              )}

              {doc.observations && (
                <p className="text-xs text-muted-foreground line-clamp-2">{doc.observations}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {doc.file_url && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleView}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3 mr-1" />
                      )}
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleDownload}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      Descargar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function Tab360Documents({ employee }: Tab360DocumentsProps) {
  const documents = employee.documents || [];

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin documentos</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene documentos cargados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group documents by type
  const grouped = documents.reduce((acc: Record<string, any[]>, doc) => {
    const type = doc.document_type || 'otro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{documents.length} documento{documents.length !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{Object.keys(grouped).length} categoría{Object.keys(grouped).length !== 1 ? 's' : ''}</span>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc, index) => (
          <DocumentCard key={doc.id} doc={doc} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

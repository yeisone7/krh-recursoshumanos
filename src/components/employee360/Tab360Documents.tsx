import { motion } from 'framer-motion';
import { FileText, Download, Eye, Calendar, FileImage, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeV2WithRelations, employeeDocumentTypeLabels } from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
          <motion.div
            key={doc.id}
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
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            asChild
                          >
                            <a href={doc.file_url} download>
                              <Download className="w-3 h-3 mr-1" />
                              Descargar
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

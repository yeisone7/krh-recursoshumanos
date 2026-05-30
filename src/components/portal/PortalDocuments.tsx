import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, FileWarning } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { employeeDocumentTypeLabels } from '@/types/employee';
import type { EmployeeDocument } from '@/types/employee';

interface PortalDocumentsProps {
  documents: EmployeeDocument[];
  isLoading: boolean;
}

export function PortalDocuments({ documents, isLoading }: PortalDocumentsProps) {
  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_url.replace('documents/', ''));

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el documento',
        variant: 'destructive',
      });
    }
  };

  const handleView = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_url.replace('documents/', ''), 300);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo abrir el documento',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Cargando documentos...</p>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Sin documentos</h3>
          <p className="text-muted-foreground">
            Aún no tienes documentos registrados en el sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by document type
  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, EmployeeDocument[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mis Documentos
          </CardTitle>
          <CardDescription>
            Documentos laborales disponibles para consulta y descarga
          </CardDescription>
        </CardHeader>
      </Card>

      {Object.entries(groupedDocs).map(([type, docs]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {employeeDocumentTypeLabels[type as keyof typeof employeeDocumentTypeLabels] || type}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {doc.document_name || doc.file_name || 'Documento'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDateOnly(doc.upload_date, 'PPP', { locale: es })}
                        {doc.expiry_date && (
                          <Badge variant="outline" className="text-xs">
                            Vence: {formatDateOnly(doc.expiry_date, 'PP', { locale: es })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(doc)}
                      title="Ver documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc)}
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

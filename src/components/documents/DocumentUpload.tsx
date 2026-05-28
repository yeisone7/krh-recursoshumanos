import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useUploadDocument, type EntityType } from '@/hooks/useDocuments';
import { toast } from 'sonner';

interface DocumentUploadProps {
  entityType: EntityType;
  entityId: string;
  onUploadComplete?: () => void;
  className?: string;
  compact?: boolean;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({
  entityType,
  entityId,
  onUploadComplete,
  className,
  compact = false,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadDocument = useUploadDocument();

  const handleFileSelect = (selectedFile: File) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error('Tipo de archivo no permitido. Use PDF, JPG, PNG o WebP.');
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      toast.error('El archivo excede el límite de 10MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await uploadDocument.mutateAsync({
        file,
        entityType,
        entityId,
        notes: notes || undefined,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Documento subido correctamente');
      setFile(null);
      setNotes('');
      setUploadProgress(0);
      onUploadComplete?.();
    } catch (error) {
      setUploadProgress(0);
      const message = error instanceof Error ? error.message : 'Error al subir el documento';
      toast.error(message);
      console.error('Upload error:', error);
    }
  };

  const clearFile = () => {
    setFile(null);
    setNotes('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
          }}
          className="cursor-pointer"
        />
        {file && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate flex-1">{file.name}</span>
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={uploadDocument.isPending}
            >
              {uploadDocument.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-primary '
            : 'border-muted-foreground/25 hover:border-border 0 hover:bg-background',
          file && 'border-primary '
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
          }}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Arrastre un archivo aquí o haga clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG o WebP (máx. 10MB)
            </p>
          </>
        )}
      </div>

      {/* Notes field */}
      {file && (
        <div className="space-y-2">
          <Label htmlFor="upload-notes">Notas (opcional)</Label>
          <Textarea
            id="upload-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregue notas sobre este documento..."
            rows={2}
          />
        </div>
      )}

      {/* Progress bar */}
      {uploadDocument.isPending && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Subiendo documento...
          </p>
        </div>
      )}

      {/* Upload button */}
      {file && !uploadDocument.isPending && (
        <Button onClick={handleUpload} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Subir Documento
        </Button>
      )}

      {/* Success state */}
      {uploadProgress === 100 && !uploadDocument.isPending && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <Check className="h-5 w-5" />
          <span className="text-sm font-medium">Documento subido correctamente</span>
        </div>
      )}
    </div>
  );
}

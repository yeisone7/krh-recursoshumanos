import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileText, Loader2, Upload, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCreateDocument } from '@/hooks/useEmployeeHealth';
import { useCreateCandidateDocument } from '@/hooks/useCandidates';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { employeeDocumentFolderOrder, employeeDocumentTypeLabels } from '@/types/employee';

const formSchema = z.object({
  documentType: z.enum(employeeDocumentFolderOrder, { required_error: 'Seleccione la carpeta' }),
  documentName: z.string().max(100).optional(),
  hasExpiry: z.boolean().default(false),
  expiryDate: z.date().optional(),
  observations: z.string().max(500).optional(),
}).refine((data) => !data.hasExpiry || !!data.expiryDate, {
  message: 'Seleccione la fecha de vencimiento',
  path: ['expiryDate'],
});

type FormData = z.infer<typeof formSchema>;

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: 'employee' | 'candidate';
  companyId: string;
  entityName: string;
  onSuccess?: () => void;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name);
  return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  companyId,
  entityName,
  onSuccess,
}: DocumentFormDialogProps) {
  const { toast } = useToast();
  const { isAdmin, isRRHH, isSuperAdmin, isPsicologo, canCreate, canUpdate } = useAuth();
  const canManageDocs = entityType === 'candidate'
    ? isAdmin || isRRHH || isSuperAdmin || isPsicologo || canCreate('seleccion') || canUpdate('seleccion')
    : isAdmin || isRRHH || isSuperAdmin || canCreate('empleados') || canUpdate('empleados');
  const createEmployeeDocument = useCreateDocument();
  const createCandidateDocument = useCreateCandidateDocument();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: undefined,
      documentName: '',
      hasExpiry: false,
      observations: '',
    },
  });

  const hasExpiry = form.watch('hasExpiry');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (!isAllowedFile(file)) {
        toast({
          title: 'Tipo de archivo no permitido',
          description: `${file.name}: solo se permiten PDF, JPG, PNG o WebP`,
          variant: 'destructive',
        });
        return false;
      }

      if (file.size > MAX_SIZE) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name}: el tamaño máximo permitido es 10MB`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    });

    setSelectedFiles((current) => [...current, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const onSubmit = async (data: FormData) => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Archivos requeridos',
        description: 'Debe seleccionar al menos un archivo para subir',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      for (const [index, file] of selectedFiles.entries()) {
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const folderPath = entityType === 'employee' ? 'employees' : 'candidates';
        const filePath = `${companyId}/${folderPath}/${entityId}/${data.documentType}_${Date.now()}_${index}_${sanitizedFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        if (entityType === 'employee') {
          await createEmployeeDocument.mutateAsync({
            employeeId: entityId,
            companyId,
            documentType: data.documentType,
            documentName: data.documentName || employeeDocumentTypeLabels[data.documentType],
            fileUrl: filePath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            expiryDate: data.hasExpiry ? data.expiryDate : undefined,
            observations: data.observations,
          });
        } else {
          await createCandidateDocument.mutateAsync({
            candidateId: entityId,
            companyId,
            documentType: data.documentType,
            documentName: data.documentName || employeeDocumentTypeLabels[data.documentType],
            fileUrl: filePath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            expiryDate: data.hasExpiry ? data.expiryDate : undefined,
            observations: data.observations,
          });
        }
      }

      toast({
        title: selectedFiles.length === 1 ? 'Documento guardado' : 'Documentos guardados',
        description: `${selectedFiles.length} archivo${selectedFiles.length !== 1 ? 's' : ''} cargado${selectedFiles.length !== 1 ? 's' : ''} correctamente`,
      });

      form.reset();
      clearFiles();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el documento';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-background px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Cargar Documento
          </DialogTitle>
          <DialogDescription>
            Subir documento para {entityName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-themed">
            {/* Document Type */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carpeta *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar carpeta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {employeeDocumentFolderOrder.map((value) => (
                        <SelectItem key={value} value={value}>
                          {employeeDocumentTypeLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Archivos *</FormLabel>
              <div className="rounded-lg border-2 border-dashed p-5 text-center transition-colors hover:bg-muted/40">
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clic para seleccionar uno o varios archivos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG o WebP (máx. 10MB por archivo)
                  </p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFiles}>
                      Limpiar
                    </Button>
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto p-2 scrollbar-themed">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md bg-background p-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFile(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="hasExpiry"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Este documento tiene vencimiento</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {hasExpiry && (
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: es })
                          ) : (
                            <span>Sin vencimiento</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      collisionPadding={16}
                      className="z-[90] w-[min(calc(100vw-2rem),20rem)] overflow-visible rounded-xl border-border bg-background p-0 shadow-2xl"
                    >
                      <DatePickerWithDropdowns
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        fromYear={new Date().getFullYear() - 5}
                        toYear={new Date().getFullYear() + 30}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Observations */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el documento..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-5 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canManageDocs || uploading || createEmployeeDocument.isPending || createCandidateDocument.isPending}
                title={!canManageDocs ? 'No tienes permiso para guardar documentos' : undefined}
              >
                {(uploading || createEmployeeDocument.isPending || createCandidateDocument.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

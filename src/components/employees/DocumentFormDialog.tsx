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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCreateDocument } from '@/hooks/useEmployeeHealth';
import { supabase } from '@/integrations/supabase/client';
import { employeeDocumentTypeLabels, type EmployeeDocumentType } from '@/types/employee';

const formSchema = z.object({
  documentType: z.enum([
    'contrato', 'hoja_vida', 'cedula', 'certificado_laboral',
    'certificado_estudio', 'antecedentes', 'carta_residencia', 'carta_banco', 'otro'
  ] as const, { required_error: 'Seleccione el tipo de documento' }),
  documentName: z.string().max(100).optional(),
  expiryDate: z.date().optional(),
  observations: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  companyId: string;
  employeeName: string;
  onSuccess?: () => void;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentFormDialog({
  open,
  onOpenChange,
  employeeId,
  companyId,
  employeeName,
  onSuccess,
}: DocumentFormDialogProps) {
  const { toast } = useToast();
  const createDocument = useCreateDocument();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: undefined,
      documentName: '',
      observations: '',
    },
  });

  const watchType = form.watch('documentType');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no permitido',
        description: 'Solo se permiten archivos PDF, JPG, PNG o WebP',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo permitido es 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      toast({
        title: 'Archivo requerido',
        description: 'Debe seleccionar un archivo para subir',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage - path must start with company_id for RLS policy
      const fileExt = selectedFile.name.split('.').pop();
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${companyId}/employees/${employeeId}/${data.documentType}_${Date.now()}_${sanitizedFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      await createDocument.mutateAsync({
        employeeId,
        companyId,
        documentType: data.documentType,
        documentName: data.documentName || employeeDocumentTypeLabels[data.documentType],
        fileUrl: urlData.publicUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        expiryDate: data.expiryDate,
        observations: data.observations,
      });

      toast({
        title: 'Documento guardado',
        description: 'El documento se ha cargado correctamente',
      });

      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Cargar Documento
          </DialogTitle>
          <DialogDescription>
            Subir documento para {employeeName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Document Type */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {Object.entries(employeeDocumentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Name (for "otro" type) */}
            {watchType === 'otro' && (
              <FormField
                control={form.control}
                name="documentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Carta de recomendación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Archivo *</FormLabel>
              {selectedFile ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={clearFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clic para seleccionar o arrastrar archivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG o WebP (máx. 10MB)
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Expiry Date */}
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
                    <PopoverContent className="w-auto p-0 bg-background" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || createDocument.isPending}>
                {(uploading || createDocument.isPending) && (
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

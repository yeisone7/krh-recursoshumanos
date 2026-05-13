import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAddEvidence } from '@/hooks/useDisciplinaryProcesses';
import { evidenceFormSchema, EvidenceFormData } from '@/types/disciplinary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const evidenceTypes = [
  { value: 'documento', label: 'Documento' },
  { value: 'testimonio', label: 'Testimonio' },
  { value: 'video', label: 'Video' },
  { value: 'foto', label: 'Fotografía' },
  { value: 'correo', label: 'Correo Electrónico' },
  { value: 'otro', label: 'Otro' },
];

interface EvidenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
}

export function EvidenceFormDialog({
  open,
  onOpenChange,
  processId,
}: EvidenceFormDialogProps) {
  const addEvidence = useAddEvidence();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<EvidenceFormData>({
    resolver: zodResolver(evidenceFormSchema),
    defaultValues: {
      evidence_type: '',
      description: '',
      collected_date: new Date(),
      collected_by: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'El archivo no puede superar los 10MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${processId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name };
  };

  const onSubmit = async (data: EvidenceFormData) => {
    try {
      setUploading(true);
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if (file) {
        const uploaded = await uploadFile();
        if (uploaded) {
          fileUrl = uploaded.url;
          fileName = uploaded.name;
        }
      }

      await addEvidence.mutateAsync({
        processId,
        data,
        fileUrl,
        fileName,
      });

      form.reset();
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading evidence:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10 flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            Agregar Evidencia
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Adjunta pruebas documentales o testimoniales al caso
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <FormField
                control={form.control}
                name="evidence_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Evidencia *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/50 shadow-xl">
                        {evidenceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="rounded-lg py-3">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa brevemente en qué consiste esta prueba..."
                        className="min-h-[100px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="collected_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Recolección *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-left px-4 justify-start',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccione fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 shadow-2xl" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collected_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Recolectada por</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre responsable" 
                          className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Archivo Adjunto</FormLabel>
                <div className="relative group">
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[1.5rem] cursor-pointer bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-bold text-foreground block">
                        {file ? file.name : 'Haga clic para seleccionar'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, Imagen o Video (Máx. 10MB)
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.avi"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 bg-background/80 backdrop-blur-md p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:bg-muted/50 transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={uploading || addEvidence.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {uploading ? 'Subiendo...' : 'Agregar Evidencia'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

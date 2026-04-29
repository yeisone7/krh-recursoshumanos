import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDotationItemType, useUpdateDotationItemType } from '@/hooks/useSystemConfig';
import { DOTATION_CATEGORIES, STANDARD_SIZES, SHOE_SIZES } from '@/types/config';
import type { DotationItemType } from '@/types/config';
import { supabase } from '@/integrations/supabase/client';

const dotationItemTypeSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  category: z.string().min(1, 'La categoría es requerida'),
  default_validity_months: z.number().min(1).max(60).default(12),
  requires_size: z.boolean().default(true),
  sizes_available: z.array(z.string()).optional(),
  description: z.string().optional(),
});

type DotationItemTypeFormData = z.infer<typeof dotationItemTypeSchema>;

interface DotationItemTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType?: DotationItemType | null;
}

async function uploadDotationImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('dotation-images')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('dotation-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export function DotationItemTypeFormDialog({ 
  open, 
  onOpenChange, 
  itemType 
}: DotationItemTypeFormDialogProps) {
  const isEditing = !!itemType;
  const createItemType = useCreateDotationItemType();
  const updateItemType = useUpdateDotationItemType();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    (itemType as any)?.image_url || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<DotationItemTypeFormData>({
    resolver: zodResolver(dotationItemTypeSchema),
    defaultValues: itemType ? {
      name: itemType.name,
      code: itemType.code || '',
      category: itemType.category,
      default_validity_months: itemType.default_validity_months,
      requires_size: itemType.requires_size,
      sizes_available: itemType.sizes_available || [],
      description: itemType.description || '',
    } : {
      name: '',
      code: '',
      category: 'uniforme',
      default_validity_months: 12,
      requires_size: true,
      sizes_available: STANDARD_SIZES,
      description: '',
    },
  });

  const category = form.watch('category');
  const requiresSize = form.watch('requires_size');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: DotationItemTypeFormData) => {
    try {
      let image_url = (itemType as any)?.image_url || undefined;

      if (imageFile) {
        setUploadingImage(true);
        image_url = await uploadDotationImage(imageFile);
        setUploadingImage(false);
      } else if (!imagePreview) {
        image_url = null;
      }

      const payload = {
        name: data.name,
        code: data.code || undefined,
        category: data.category,
        default_validity_months: data.default_validity_months,
        requires_size: data.requires_size,
        sizes_available: data.requires_size ? data.sizes_available : undefined,
        description: data.description || undefined,
        image_url,
      };

      if (isEditing) {
        await updateItemType.mutateAsync({ id: itemType.id, ...payload });
        toast.success('Tipo de dotación actualizado');
      } else {
        await createItemType.mutateAsync(payload);
        toast.success('Tipo de dotación creado');
      }
      onOpenChange(false);
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      setUploadingImage(false);
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el tipo de dotación',
      });
    }
  };

  const getDefaultSizes = () => {
    if (category === 'calzado') return SHOE_SIZES;
    return STANDARD_SIZES;
  };

  const isPending = createItemType.isPending || updateItemType.isPending || uploadingImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Dotación' : 'Nuevo Tipo de Dotación'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <FormLabel>Imagen</FormLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {imagePreview ? (
                  <div className="relative w-20 h-20 rounded-lg border overflow-hidden bg-muted">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px]">Subir</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview && (
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                    Cambiar
                  </Button>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Camisa Polo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="CPOLO" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'calzado') {
                          form.setValue('sizes_available', SHOE_SIZES);
                        } else if (value !== 'epp' && value !== 'herramientas' && value !== 'otros') {
                          form.setValue('sizes_available', STANDARD_SIZES);
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {DOTATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requires_size"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Requiere Talla</FormLabel>
                    <FormDescription>
                      El artículo tiene variantes de talla
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requiresSize && (
              <FormField
                control={form.control}
                name="sizes_available"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tallas Disponibles</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {getDefaultSizes().map((size) => (
                        <Button
                          key={size}
                          type="button"
                          size="sm"
                          variant={field.value?.includes(size) ? 'default' : 'outline'}
                          onClick={() => {
                            const current = field.value || [];
                            if (current.includes(size)) {
                              field.onChange(current.filter((s) => s !== size));
                            } else {
                              field.onChange([...current, size]);
                            }
                          }}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del artículo..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

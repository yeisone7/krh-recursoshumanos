import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ImagePlus, X, Shirt, Box } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { cn } from '@/lib/utils';
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
      <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 border-none bg-transparent shadow-none">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border-2 border-border bg-background -2xl shadow-2xl">
          
          {/* Premium Header */}
          <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border-b border-border shrink-0">
            <div className="relative z-10 flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Shirt className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground leading-tight">
                  {isEditing ? 'Editar' : 'Nuevo'} <span className="text-primary">Tipo</span>
                </DialogTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  Gestión de artículos y suministros corporativos.
                </p>
              </div>
            </div>
            {/* Decorative blurs */}
            
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col p-8">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Image Upload Area */}
                <div className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Imagen del Artículo</FormLabel>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {imagePreview ? (
                      <div className="relative group w-32 h-32 rounded-[2rem] border-2 border-primary/20 overflow-hidden bg-background shadow-inner p-2">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-[1.5rem]" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-110 transition-transform"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all group"
                      >
                        <div className="p-3 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform">
                          <ImagePlus className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Subir Foto</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Sube una imagen representativa del artículo para facilitar su identificación en el inventario. Máx 5MB.
                      </p>
                      {imagePreview && (
                        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px]">
                          Cambiar Imagen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Artículo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej. Camisa Polo Institucional" 
                          className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código Interno</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CPOLO-01" 
                            maxLength={10} 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                            {...field} 
                          />
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoría</FormLabel>
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
                            <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border bg-background">
                            {DOTATION_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="font-bold">
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
                    <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] border-2 border-border/50 bg-background p-4 transition-all hover:border-primary/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-black uppercase tracking-widest">Requiere Talla</FormLabel>
                        <FormDescription className="text-[11px] font-medium">
                          Habilita la selección de variantes de talla para este artículo.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {requiresSize && (
                  <FormField
                    control={form.control}
                    name="sizes_available"
                    render={({ field }) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tallas Disponibles</FormLabel>
                        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-background border-2 border-dashed border-border/50">
                          {getDefaultSizes().map((size) => {
                            const isSelected = field.value?.includes(size);
                            return (
                              <Button
                                key={size}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => {
                                  const current = field.value || [];
                                  if (current.includes(size)) {
                                    field.onChange(current.filter((s: string) => s !== size));
                                  } else {
                                    field.onChange([...current, size]);
                                  }
                                }}
                                className={cn(
                                  "h-10 min-w-[3rem] rounded-xl font-black transition-all",
                                  isSelected ? "shadow-md shadow-primary/20 scale-105" : "bg-background border-2"
                                )}
                              >
                                {size}
                              </Button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </motion.div>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción / Especificaciones</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalles adicionales del artículo..."
                          className="min-h-[100px] rounded-2xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-8 mt-4 border-t border-border ">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-background "
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isEditing ? 'Guardar Cambios' : 'Crear Artículo'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

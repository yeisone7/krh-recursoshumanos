import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploaderProps {
  courseId: string;
  onUploaded: (url: string, fileName: string, fileSize: number) => void;
}

export function ImageUploader({ courseId, onUploaded }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${courseId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('training-media')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('training-media')
        .getPublicUrl(path);

      onUploaded(publicUrl, file.name, file.size);
      toast.success('Imagen subida exitosamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [courseId, onUploaded]);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" /> Subir Imagen
      </Label>

      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-24 rounded-lg border" />
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="max-w-xs"
        />
        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    </div>
  );
}

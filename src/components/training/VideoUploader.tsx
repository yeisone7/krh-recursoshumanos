import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploaderProps {
  courseId: string;
  onUploaded: (url: string, fileName: string, fileSize: number) => void;
}

export function VideoUploader({ courseId, onUploaded }: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Solo se permiten archivos de video');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('El video no debe superar 50MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${courseId}/videos/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('training-media')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('training-media')
        .getPublicUrl(path);

      onUploaded(publicUrl, file.name, file.size);
      toast.success('Video subido exitosamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir el video');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [courseId, onUploaded]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <Video className="h-4 w-4 text-primary" /> Video Complementario
        </Label>
        {isUploading && (
          <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20 gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Subiendo...
          </Badge>
        )}
      </div>

      {!preview ? (
        <div className="relative group">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/50 rounded-2xl bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group-hover:shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Haga clic o arrastre un video</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">MP4, WebM o Ogg (Max. 50MB)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="video/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black group shadow-lg">
          <video 
            src={preview} 
            className="w-full aspect-video max-h-48 object-contain" 
            controls 
          />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-xl shadow-lg"
              onClick={() => {
                setPreview(null);
                const input = document.getElementById('video-upload-input') as HTMLInputElement;
                if (input) input.value = '';
              }}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-primary">Procesando Video...</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <input 
        id="video-upload-input"
        type="file" 
        className="hidden" 
        accept="video/*"
        onChange={handleFileChange}
      />
    </div>
  );
}

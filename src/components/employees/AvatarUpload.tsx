import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  employeeId?: string;
  employeeName?: string;
  onAvatarChange: (url: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({
  currentAvatarUrl,
  employeeId,
  employeeName = 'Empleado',
  onAvatarChange,
  disabled = false,
  size = 'lg',
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  
  // Sync preview with prop changes
  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const initials = employeeName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no permitido',
        description: 'Solo se permiten imágenes JPG, PNG o WebP',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: 'Imagen muy grande',
        description: 'El tamaño máximo permitido es 5MB',
        variant: 'destructive',
      });
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = employeeId 
        ? `${employeeId}/avatar_${Date.now()}.${fileExt}`
        : `temp/avatar_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onAvatarChange(publicUrl);

      toast({
        title: 'Foto actualizada',
        description: 'La foto del empleado ha sido guardada',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error al subir foto',
        description: error.message || 'Intenta de nuevo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      setCameraOpen(true);
      
      // Wait for dialog to open and video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error: any) {
      console.error('Camera error:', error);
      toast({
        title: 'Error de cámara',
        description: 'No se pudo acceder a la cámara. Verifica los permisos.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  }, [stream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `camera_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        stopCamera();
        await uploadFile(file);
      },
      'image/jpeg',
      0.9
    );
  };

  const removePhoto = async () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-2 border-muted')}>
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt={employeeName} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials || <User className="w-8 h-8" />}
            </AvatarFallback>
          )}
        </Avatar>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {previewUrl && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={removePhoto}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            Subir
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCamera}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-1" />
            Cámara
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {/* Camera Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Tomar Foto
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-background rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={stopCamera}>
                Cancelar
              </Button>
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AvatarVideoPlayerProps {
  videoUrl?: string | null;
  videoId?: string | null;
  courseId: string;
  companyId: string;
  onVideoReady?: (url: string) => void;
}

export function AvatarVideoPlayer({ videoUrl, videoId, courseId, companyId, onVideoReady }: AvatarVideoPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>(
    videoUrl ? 'completed' : videoId ? 'processing' : 'idle'
  );
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(videoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoId && status === 'processing') {
      startPolling(videoId);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId]);

  const startPolling = (vid: string) => {
    let elapsed = 0;
    intervalRef.current = setInterval(async () => {
      elapsed += 10;
      // Simulate progress (HeyGen takes 2-10 min)
      setProgress(Math.min(90, (elapsed / 600) * 100));

      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-training-avatar', {
          body: { action: 'check_status', videoId: vid, courseId, companyId },
        });

        if (fnError) throw fnError;

        if (data?.status === 'completed' && data?.videoUrl) {
          setStatus('completed');
          setCurrentUrl(data.videoUrl);
          setProgress(100);
          onVideoReady?.(data.videoUrl);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (data?.status === 'failed') {
          setStatus('failed');
          setError(data?.error || 'Error al generar el video');
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 10000);
  };

  if (status === 'completed' && currentUrl) {
    return (
      <div className="rounded-lg overflow-hidden border bg-black">
        <video
          controls
          className="w-full max-h-[400px]"
          src={currentUrl}
          preload="metadata"
        >
          Tu navegador no soporta el reproductor de video.
        </video>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium text-sm">Generando video con avatar...</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          La generación puede tomar de 2 a 10 minutos. No cierres esta ventana.
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{error || 'Error al generar el video'}</p>
      </div>
    );
  }

  return null;
}


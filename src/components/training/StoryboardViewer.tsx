import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Mic, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Scene {
  title: string;
  narration: string;
  visual_description?: string;
}

interface StoryboardViewerProps {
  scenes: Scene[];
  imageUrls: string[];
  audioUrl?: string | null;
  /** Allow regenerating individual scenes */
  allowRegenerate?: boolean;
  /** Required for regeneration */
  courseId?: string;
  courseTitle?: string;
  companyId?: string;
  style?: string;
  contentText?: string;
  puntosClave?: string[];
  onSceneRegenerated?: (sceneIdx: number, newImageUrl: string, updatedScene: Scene) => void;
}

export function StoryboardViewer({
  scenes,
  imageUrls,
  audioUrl,
  allowRegenerate = false,
  courseId,
  courseTitle,
  companyId,
  style = 'clasico',
  contentText,
  puntosClave,
  onSceneRegenerated,
}: StoryboardViewerProps) {
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-advance scenes during playback
  useEffect(() => {
    if (!isPlaying || !scenes.length) return;
    const interval = setInterval(() => {
      setActiveSceneIdx(prev => {
        const next = prev + 1;
        if (next >= scenes.length) {
          setIsPlaying(false);
          audioRef.current?.pause();
          return 0;
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [isPlaying, scenes.length]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleRegenerateScene = async (idx: number) => {
    if (!courseId || !courseTitle || !companyId) return;
    setRegeneratingIdx(idx);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-training-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          courseId,
          style,
          title: courseTitle,
          content: contentText?.substring(0, 2000),
          puntosClave,
          companyId,
          regenerateScene: idx,
          existingScene: scenes[idx],
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status}`);
      }
      const data = await response.json();
      if (data.imageUrl && data.scene) {
        onSceneRegenerated?.(idx, data.imageUrl, data.scene);
        toast.success(`Escena ${idx + 1} regenerada exitosamente`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al regenerar escena');
    } finally {
      setRegeneratingIdx(null);
    }
  };

  if (!scenes.length) return null;

  return (
    <div className="space-y-3">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Storyboard Multimedia</p>
          <Badge variant="secondary" className="text-[10px]">{scenes.length} escenas</Badge>
        </div>
        {audioUrl ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="gap-1 text-[10px] bg-accent/20">
              <Volume2 className="h-3 w-3" /> Audio vinculado
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActiveSceneIdx(prev => Math.max(0, prev - 1))}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant={isPlaying ? "default" : "outline"} className="h-8 w-8" onClick={() => {
              if (!audioRef.current) {
                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                audio.addEventListener('timeupdate', () => {
                  if (audio.duration) setAudioProgress((audio.currentTime / audio.duration) * 100);
                });
                audio.addEventListener('ended', () => {
                  setIsPlaying(false);
                  setActiveSceneIdx(0);
                  setAudioProgress(0);
                });
              }
              togglePlayback();
            }}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActiveSceneIdx(prev => Math.min(scenes.length - 1, prev + 1))}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Mic className="h-3 w-3" /> Sin audio
          </Badge>
        )}
      </div>

      {/* Progress */}
      {isPlaying && <Progress value={audioProgress} className="h-1" />}

      {/* Scene cards */}
      {scenes.map((scene, idx) => (
        <motion.div
          key={idx}
          initial={false}
          animate={{
            scale: idx === activeSceneIdx ? 1 : 0.97,
            opacity: idx === activeSceneIdx ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
          className={`rounded-lg border overflow-hidden cursor-pointer transition-shadow ${idx === activeSceneIdx ? 'ring-2 ring-primary/50 shadow-md' : ''}`}
          onClick={() => setActiveSceneIdx(idx)}
        >
          {imageUrls[idx] && (
            <div className="bg-muted/30 flex items-center justify-center relative">
              <img
                src={imageUrls[idx]}
                alt={`Escena ${idx + 1}: ${scene.title}`}
                className="w-full max-h-64 object-contain"
                loading="lazy"
              />
              {idx === activeSceneIdx && isPlaying && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] animate-pulse gap-1">
                    <Volume2 className="h-3 w-3" /> Reproduciendo
                  </Badge>
                </div>
              )}
            </div>
          )}
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={idx === activeSceneIdx ? "default" : "secondary"} className="text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">{idx + 1}</Badge>
                <p className="text-sm font-semibold text-foreground">{scene.title}</p>
              </div>
              {allowRegenerate && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  disabled={regeneratingIdx !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateScene(idx);
                  }}
                  title={`Regenerar escena ${idx + 1}`}
                >
                  {regeneratingIdx === idx ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{scene.narration}</p>
            {scene.visual_description && (
              <p className="text-xs text-muted-foreground/70 italic">🎨 {scene.visual_description}</p>
            )}
          </div>
        </motion.div>
      ))}

      {imageUrls.length === 0 && (
        <p className="text-xs text-amber-600">⚠️ Las imágenes no pudieron generarse. Revise la configuración de IA o intente de nuevo.</p>
      )}
    </div>
  );
}

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Mic, RefreshCw, Loader2, Maximize, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageLightbox } from './ImageLightbox';

interface Scene {
  title: string;
  narration: string;
  visual_description?: string;
}

interface StoryboardViewerProps {
  scenes: Scene[];
  imageUrls: string[];
  audioUrl?: string | null;
  allowRegenerate?: boolean;
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fullscreenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Fullscreen auto-advance
  useEffect(() => {
    if (!isFullscreen) {
      if (fullscreenTimerRef.current) clearInterval(fullscreenTimerRef.current);
      return;
    }
    fullscreenTimerRef.current = setInterval(() => {
      setActiveSceneIdx(prev => {
        const next = prev + 1;
        if (next >= scenes.length) {
          setIsFullscreen(false);
          return 0;
        }
        return next;
      });
    }, 8000);
    return () => {
      if (fullscreenTimerRef.current) clearInterval(fullscreenTimerRef.current);
    };
  }, [isFullscreen, scenes.length]);

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
          courseId, style, title: courseTitle,
          content: contentText?.substring(0, 2000),
          puntosClave, companyId,
          regenerateScene: idx, existingScene: scenes[idx],
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

  // ─── Fullscreen Slideshow ────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white text-xs">{activeSceneIdx + 1} / {scenes.length}</Badge>
            <span className="text-sm font-medium truncate max-w-[50vw]">{scenes[activeSceneIdx]?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setActiveSceneIdx(prev => Math.max(0, prev - 1))}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setActiveSceneIdx(prev => Math.min(scenes.length - 1, prev + 1))}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsFullscreen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Progress value={((activeSceneIdx + 1) / scenes.length) * 100} className="h-1 rounded-none bg-white/10 [&>div]:bg-primary" />

        {/* Scene content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSceneIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-6 max-w-4xl w-full"
            >
              {imageUrls[activeSceneIdx] && (
                <img
                  src={imageUrls[activeSceneIdx]}
                  alt={scenes[activeSceneIdx]?.title}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg"
                />
              )}
              <div className="text-center px-4 max-w-2xl">
                <p className="text-white/90 text-base leading-relaxed">
                  {scenes[activeSceneIdx]?.narration}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot navigation */}
        <div className="flex items-center justify-center gap-2 py-3 bg-black/80">
          {scenes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSceneIdx(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${idx === activeSceneIdx ? 'bg-primary scale-125' : 'bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />

      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Storyboard Multimedia</p>
          <Badge variant="secondary" className="text-[10px]">{scenes.length} escenas</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Fullscreen button */}
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setIsFullscreen(true)}>
            <Maximize className="h-3 w-3" /> Presentación
          </Button>

          {audioUrl ? (
            <>
              <Badge variant="outline" className="gap-1 text-[10px] bg-accent/20">
                <Volume2 className="h-3 w-3" /> Audio
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
                  audio.addEventListener('ended', () => { setIsPlaying(false); setActiveSceneIdx(0); setAudioProgress(0); });
                }
                togglePlayback();
              }}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setActiveSceneIdx(prev => Math.min(scenes.length - 1, prev + 1))}>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Mic className="h-3 w-3" /> Sin audio
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      {isPlaying && <Progress value={audioProgress} className="h-1" />}

      {/* Scene cards */}
      {scenes.map((scene, idx) => (
        <motion.div
          key={idx}
          initial={false}
          animate={{ scale: idx === activeSceneIdx ? 1 : 0.97, opacity: idx === activeSceneIdx ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
          className={`rounded-lg border overflow-hidden cursor-pointer transition-shadow ${idx === activeSceneIdx ? 'ring-2 ring-primary/50 shadow-md' : ''}`}
          onClick={() => setActiveSceneIdx(idx)}
        >
          {imageUrls[idx] && (
            <div className="bg-background flex items-center justify-center relative group">
              <img
                src={imageUrls[idx]}
                alt={`Escena ${idx + 1}: ${scene.title}`}
                className="w-full max-h-64 object-contain cursor-zoom-in"
                loading="lazy"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSrc(imageUrls[idx]);
                  setLightboxAlt(`Escena ${idx + 1}: ${scene.title}`);
                }}
              />
              {/* Zoom hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <Maximize className="h-6 w-6 text-white drop-shadow-lg" />
              </div>
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
                  size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  disabled={regeneratingIdx !== null}
                  onClick={(e) => { e.stopPropagation(); handleRegenerateScene(idx); }}
                  title={`Regenerar escena ${idx + 1}`}
                >
                  {regeneratingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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

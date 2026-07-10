import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, X, Presentation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface TrainingSlide {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  footer?: string;
}

export interface TrainingSlideDeck {
  title: string;
  subtitle?: string;
  slides: TrainingSlide[];
}

interface SlideDeckViewerProps {
  deck: TrainingSlideDeck;
  compact?: boolean;
}

function normalizeDeck(deck: TrainingSlideDeck): TrainingSlideDeck {
  return {
    ...deck,
    slides: (deck.slides || []).filter((slide) => slide?.title || slide?.body || slide?.bullets?.length),
  };
}

export function isSlideDeck(value: unknown): value is TrainingSlideDeck {
  const deck = value as TrainingSlideDeck | undefined;
  return Boolean(deck?.title && Array.isArray(deck?.slides) && deck.slides.length > 0);
}

export function SlideDeckViewer({ deck, compact = false }: SlideDeckViewerProps) {
  const normalizedDeck = useMemo(() => normalizeDeck(deck), [deck]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const slides = normalizedDeck.slides;
  const activeSlide = slides[Math.min(activeIndex, Math.max(slides.length - 1, 0))];
  const progress = slides.length ? ((activeIndex + 1) / slides.length) * 100 : 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [deck]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(slides.length - 1, index + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, slides.length]);

  if (!slides.length) return null;

  const goPrev = () => setActiveIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveIndex((index) => Math.min(slides.length - 1, index + 1));

  const slideContent = (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-slate-950 text-white shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Presentation className="h-4 w-4 shrink-0 text-sky-300" />
          <span className="truncate text-sm font-bold">{normalizedDeck.title}</span>
        </div>
        <Badge className="shrink-0 bg-white/10 text-white hover:bg-white/10">
          {activeIndex + 1} / {slides.length}
        </Badge>
      </div>

      <Progress value={progress} className="h-1 rounded-none bg-white/10 [&>div]:bg-sky-400" />

      <div className="flex flex-1 flex-col justify-center gap-8 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.28),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.18),transparent_28%)] px-8 py-10 sm:px-14">
        <div className="space-y-4">
          {activeSlide.subtitle && (
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-200">{activeSlide.subtitle}</p>
          )}
          <h3 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {activeSlide.title}
          </h3>
          {activeSlide.body && (
            <p className="max-w-3xl text-base leading-relaxed text-slate-200 sm:text-xl">{activeSlide.body}</p>
          )}
        </div>

        {activeSlide.bullets?.length ? (
          <div className="grid gap-3">
            {activeSlide.bullets.slice(0, 5).map((bullet, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-100 sm:text-base">{bullet}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-4 py-3">
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={goPrev} disabled={activeIndex === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        {!compact && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setIsFullscreen(true)}>
            <Maximize className="mr-1 h-4 w-4" /> Pantalla completa
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={goNext} disabled={activeIndex >= slides.length - 1}>
          Siguiente <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {slideContent}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 p-3 sm:p-6">
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="mx-auto flex h-full max-w-6xl items-center">
            <div className="w-full">{slideContent}</div>
          </div>
        </div>
      )}
    </>
  );
}

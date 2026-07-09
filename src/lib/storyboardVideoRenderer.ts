interface StoryboardScene {
  title: string;
  narration: string;
}

export interface RenderStoryboardVideoOptions {
  scenes: StoryboardScene[];
  imageUrls: string[];
  audioUrl: string;
  title: string;
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderedStoryboardVideo {
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
}

const MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function getSupportedMimeType() {
  return MIME_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function extensionFromMimeType(mimeType: string) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) break;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawContainImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scenes: StoryboardScene[],
  images: Array<HTMLImageElement | null>,
  title: string,
  currentTime: number,
  duration: number
) {
  const safeDuration = Math.max(duration || 1, 1);
  const sceneDuration = safeDuration / Math.max(scenes.length, 1);
  const sceneIndex = Math.min(scenes.length - 1, Math.floor(currentTime / sceneDuration));
  const scene = scenes[sceneIndex] || scenes[0];
  const image = images[sceneIndex];

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.58, '#111827');
  gradient.addColorStop(1, '#082f49');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (image) {
    drawContainImage(ctx, image, 56, 70, width - 112, height - 245);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(56, 70, width - 112, height - 245);
  }

  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(0, height - 172, width, 172);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 24px Inter, Arial, sans-serif';
  drawCoverText(ctx, title, 56, 48, width - 112, 28, 1);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 22px Inter, Arial, sans-serif';
  ctx.fillText(`${sceneIndex + 1}. ${scene?.title || 'Escena'}`, 56, height - 118);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '400 28px Inter, Arial, sans-serif';
  drawCoverText(ctx, scene?.narration || '', 56, height - 74, width - 112, 34, 2);

  const progressWidth = (currentTime / safeDuration) * width;
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, height - 6, progressWidth, 6);
}

export async function renderStoryboardVideo({
  scenes,
  imageUrls,
  audioUrl,
  title,
  width = 1280,
  height = 720,
  fps = 30,
}: RenderStoryboardVideoOptions): Promise<RenderedStoryboardVideo> {
  if (!scenes.length) throw new Error('No hay escenas para renderizar.');
  if (!imageUrls.length) throw new Error('No hay imagenes para renderizar el video.');
  if (!audioUrl) throw new Error('No hay audio narrado para renderizar el video.');
  if (typeof MediaRecorder === 'undefined') throw new Error('Este navegador no soporta grabacion de video.');

  const mimeType = getSupportedMimeType();
  if (!mimeType) throw new Error('Este navegador no soporta un formato de video compatible.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el lienzo del video.');

  const images = await Promise.all(imageUrls.map(loadImage));
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = audioUrl;
  audio.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
    audio.addEventListener('error', () => reject(new Error('No se pudo cargar el audio narrado.')), { once: true });
    audio.load();
  });

  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : scenes.length * 8;
  const canvasStream = canvas.captureStream(fps);
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaElementSource(audio);
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);

  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true });
    recorder.addEventListener('error', () => reject(new Error('No se pudo grabar el video.')), { once: true });
  });

  const draw = () => {
    drawFrame(ctx, width, height, scenes, images, title, audio.currentTime, duration);
    if (!audio.ended && !audio.paused) requestAnimationFrame(draw);
  };

  recorder.start(1000);
  await audioContext.resume();
  drawFrame(ctx, width, height, scenes, images, title, 0, duration);
  await audio.play();
  requestAnimationFrame(draw);

  await new Promise<void>((resolve) => {
    audio.addEventListener('ended', () => resolve(), { once: true });
  });

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();

  return {
    blob: new Blob(chunks, { type: mimeType }),
    mimeType,
    extension: extensionFromMimeType(mimeType),
    duration,
  };
}

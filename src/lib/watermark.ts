/**
 * Applies a watermark logo to an image using Canvas 2D API.
 * Works with both base64 data URLs and remote URLs.
 */

export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface WatermarkConfig {
  enabled: boolean;
  position: WatermarkPosition;
  logo_url: string | null; // URL from storage or null for default
  opacity: number;
  scale: number; // fraction of image width, e.g. 0.15
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  position: 'bottom-right',
  logo_url: null,
  opacity: 0.7,
  scale: 0.15,
};

const DEFAULT_LOGO_PATH = '/images/petrocasinos-watermark.png';
const LOGO_PADDING = 20;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 80)}...`));
    img.src = src;
  });
}

export async function applyWatermark(
  imageSrc: string,
  config?: Partial<WatermarkConfig>
): Promise<Blob> {
  const cfg: WatermarkConfig = { ...DEFAULT_WATERMARK_CONFIG, ...config };

  if (!cfg.enabled) {
    // If disabled, just convert the image to blob without watermark
    const img = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
        'image/png'
      );
    });
  }

  const logoSrc = cfg.logo_url || DEFAULT_LOGO_PATH;

  const [mainImage, logo] = await Promise.all([
    loadImage(imageSrc),
    loadImage(logoSrc),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mainImage.naturalWidth;
  canvas.height = mainImage.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Draw main image
  ctx.drawImage(mainImage, 0, 0);

  // Calculate logo dimensions preserving aspect ratio
  const logoWidth = canvas.width * cfg.scale;
  const logoAspect = logo.naturalHeight / logo.naturalWidth;
  const logoHeight = logoWidth * logoAspect;

  // Calculate position
  let x: number, y: number;
  switch (cfg.position) {
    case 'top-left':
      x = LOGO_PADDING;
      y = LOGO_PADDING;
      break;
    case 'top-right':
      x = canvas.width - logoWidth - LOGO_PADDING;
      y = LOGO_PADDING;
      break;
    case 'bottom-left':
      x = LOGO_PADDING;
      y = canvas.height - logoHeight - LOGO_PADDING;
      break;
    case 'bottom-right':
    default:
      x = canvas.width - logoWidth - LOGO_PADDING;
      y = canvas.height - logoHeight - LOGO_PADDING;
      break;
  }

  // Draw logo with opacity
  ctx.globalAlpha = cfg.opacity;
  ctx.drawImage(logo, x, y, logoWidth, logoHeight);
  ctx.globalAlpha = 1.0;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      'image/png'
    );
  });
}

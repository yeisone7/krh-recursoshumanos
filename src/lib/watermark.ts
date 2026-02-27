/**
 * Applies a watermark logo to an image using Canvas 2D API.
 * Works with both base64 data URLs and remote URLs.
 */

const WATERMARK_LOGO_PATH = '/images/petrocasinos-watermark.png';
const LOGO_SCALE = 0.15; // 15% of image width
const LOGO_OPACITY = 0.7;
const LOGO_PADDING = 20; // px from edges

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 80)}...`));
    img.src = src;
  });
}

export async function applyWatermark(imageSrc: string): Promise<Blob> {
  const [mainImage, logo] = await Promise.all([
    loadImage(imageSrc),
    loadImage(WATERMARK_LOGO_PATH),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mainImage.naturalWidth;
  canvas.height = mainImage.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Draw main image
  ctx.drawImage(mainImage, 0, 0);

  // Calculate logo dimensions preserving aspect ratio
  const logoWidth = canvas.width * LOGO_SCALE;
  const logoAspect = logo.naturalHeight / logo.naturalWidth;
  const logoHeight = logoWidth * logoAspect;

  // Position: bottom-right corner
  const x = canvas.width - logoWidth - LOGO_PADDING;
  const y = canvas.height - logoHeight - LOGO_PADDING;

  // Draw logo with opacity
  ctx.globalAlpha = LOGO_OPACITY;
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

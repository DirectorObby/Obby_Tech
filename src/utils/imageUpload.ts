import { api } from '../services/api';

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif|jfif|tiff?|ico)$/i;

export interface ImageUploadOptions {
  maxDimension?: number;
  maxRawBytes?: number;
  quality?: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode image.'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read selected file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image compression failed.'));
      },
      mime,
      quality
    );
  });
}

function assertValidImageCandidate(file: File): void {
  const isExplicitNonImageMime =
    Boolean(file.type) &&
    !file.type.startsWith('image/') &&
    file.type !== 'application/octet-stream' &&
    !IMAGE_EXT_REGEX.test(file.name);

  if (isExplicitNonImageMime) {
    throw new Error('Please choose a photo/image file (JPG, PNG, WebP, etc.).');
  }
}

/**
 * Optimizes large mobile camera photos into a lightweight Blob using low-RAM ObjectURLs,
 * preventing mobile "out of memory / storage" errors when adding products or banners.
 */
async function processImageFileToBlob(
  file: File,
  options: ImageUploadOptions = {}
): Promise<Blob> {
  assertValidImageCandidate(file);

  const maxDimension = options.maxDimension ?? 1600;
  const maxRawBytes = options.maxRawBytes ?? 900_000;
  const quality = options.quality ?? 0.9;

  const isWebNativeMime =
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml';

  // Keep already-compact web-native files (including crisp banners & animated GIF/SVG) untouched
  if (isWebNativeMime && file.size <= maxRawBytes) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const srcWidth = img.naturalWidth || img.width || 1200;
    const srcHeight = img.naturalHeight || img.height || 1200;
    const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
    const targetWidth = Math.max(1, Math.round(srcWidth * scale));
    const targetHeight = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const keepPng =
      file.type === 'image/png' ||
      /\.png$/i.test(file.name);

    const outputBlob = await canvasToBlob(
      canvas,
      keepPng ? 'image/png' : 'image/jpeg',
      quality
    );

    // If PNG export stayed larger than maxRawBytes, fall back to crisp JPEG
    if (keepPng && outputBlob.size > maxRawBytes * 1.5) {
      return await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    return outputBlob;
  } catch {
    if (file.type.startsWith('image/')) {
      return file;
    }
    throw new Error('Selected file could not be loaded as an image. Please pick a valid photo.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses/normalizes a selected phone or desktop image and uploads it directly to the server's
 * `/uploads` file storage, returning a lightweight `/uploads/...` URL instead of storing megabytes in JSON.
 */
export async function uploadImageFile(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const blob = await processImageFileToBlob(file, options);
  return await api.uploadImage(blob);
}

/**
 * Legacy helper (kept for compatibility): reads/normalizes an image as a Data URL.
 */
export async function readImageFileAsDataUrl(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const blob = await processImageFileToBlob(file, options);
  return await readFileAsDataUrl(
    blob instanceof File ? blob : new File([blob], file.name || 'image.jpg', { type: blob.type })
  );
}

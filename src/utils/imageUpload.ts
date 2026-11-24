import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { api } from '../services/api';
import { auth, storage } from '../lib/firebase';

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

function blobToDataUrl(blob: Blob): Promise<string> {
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
    reader.readAsDataURL(blob);
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

    const keepPng = file.type === 'image/png' || /\.png$/i.test(file.name);

    const outputBlob = await canvasToBlob(
      canvas,
      keepPng ? 'image/png' : 'image/jpeg',
      quality
    );

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

async function compressForCloudFallback(file: File, maxBytes = 210_000): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const srcW = img.naturalWidth || img.width || 1200;
    const srcH = img.naturalHeight || img.height || 1200;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of [0.84, 0.72, 0.58]) {
      const blob = await canvasToBlob(canvas, 'image/webp', q).catch(() =>
        canvasToBlob(canvas, 'image/jpeg', q)
      );
      if (blob.size <= maxBytes) {
        return await blobToDataUrl(blob);
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads optimized images permanently:
 * 1) Tries Firebase Storage first when signed in (permanent HTTPS URL, 5GB+ cloud bucket).
 * 2) Falls back to compact WebP/JPEG cloud-safe string if Storage bucket isn't active yet
 *    so images survive Render / container restarts inside Firestore documents safely under 300KB.
 * 3) Falls back to /api/upload on local/server if needed.
 */
export async function uploadImageFile(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const blob = await processImageFileToBlob(file, options);

  if (auth.currentUser) {
    try {
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
      const storageRef = ref(
        storage,
        `obby_uploads/${auth.currentUser.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      );
      const snap = await Promise.race([
        uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Storage upload timeout')), 6000)
        ),
      ]);
      const downloadUrl = await getDownloadURL(snap.ref);
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch {
      // Storage bucket may not be enabled yet; continue to compact cloud/server fallback
    }
  }

  // If compact enough to fit safely in Firestore rules (< 340KB string), embed compact WebP/JPEG
  if (blob.size <= 220_000) {
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length <= 340_000) {
      return dataUrl;
    }
  }

  const compressedDataUrl = await compressForCloudFallback(file, 210_000);
  if (compressedDataUrl && compressedDataUrl.length <= 340_000) {
    return compressedDataUrl;
  }

  return await api.uploadImage(blob);
}

export async function readImageFileAsDataUrl(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const blob = await processImageFileToBlob(file, options);
  return await blobToDataUrl(blob);
}

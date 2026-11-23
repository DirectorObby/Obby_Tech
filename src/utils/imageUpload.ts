const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif|jfif|tiff?|ico)$/i;
const WEB_SAFE_IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i;

export interface ImageUploadOptions {
  maxDimension?: number;
  maxRawBytes?: number;
  quality?: number;
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

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode image.'));
    img.src = src;
  });
}

async function normalizeImageViaCanvas(
  file: File,
  rawDataUrl: string,
  maxDimension: number,
  quality: number
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImageElement(objectUrl);
    } catch {
      img = await loadImageElement(rawDataUrl);
    }

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
      throw new Error('Image processing is not supported in this browser.');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const hasAlphaCandidate =
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      /\.png$/i.test(file.name) ||
      /\.webp$/i.test(file.name);

    return hasAlphaCandidate
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Reads an image selected from any mobile gallery, WhatsApp folder, Downloads, or desktop.
 * Pairs with `<input type="file">` without restrictive `accept="image/*"` so mobile pickers
 * never gray out valid photos.
 */
export async function readImageFileAsDataUrl(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? 1920;
  const maxRawBytes = options.maxRawBytes ?? 2_500_000;
  const quality = options.quality ?? 0.92;

  const isExplicitNonImageMime =
    Boolean(file.type) &&
    !file.type.startsWith('image/') &&
    file.type !== 'application/octet-stream' &&
    !IMAGE_EXT_REGEX.test(file.name);

  if (isExplicitNonImageMime) {
    throw new Error('Please choose a photo/image file (JPG, PNG, WebP, etc.).');
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  if (
    /^data:image\/svg\+xml/i.test(rawDataUrl) &&
    file.size <= maxRawBytes
  ) {
    return rawDataUrl;
  }

  if (
    WEB_SAFE_IMAGE_DATA_URL_REGEX.test(rawDataUrl) &&
    file.size <= maxRawBytes
  ) {
    return rawDataUrl;
  }

  try {
    return await normalizeImageViaCanvas(file, rawDataUrl, maxDimension, quality);
  } catch {
    if (/^data:image\//i.test(rawDataUrl)) {
      return rawDataUrl;
    }
    throw new Error('Selected file could not be loaded as an image. Please pick a valid photo.');
  }
}

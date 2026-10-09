/** A photo attached to a report or draft. Kept in memory only, like the rest of this prototype's data. */
export interface ReportPhoto {
  readonly id: string;
  readonly name: string;
  /** Object URL of the downscaled JPEG; revoke it with releasePhoto when the photo is removed. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/** Longest edge after downscaling: enough to read markings, small enough to keep pages fast. */
export const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.82;

/** Size that fits within maxEdge on its longest side, keeping the aspect ratio; never upscales. */
export function scaledSize(width: number, height: number, maxEdge = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Decodes an image file (camera orientation applied) and re-encodes it as a downscaled JPEG. */
export async function downscalePhoto(file: File): Promise<ReportPhoto> {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const size = scaledSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not encode photo'))), 'image/jpeg', PHOTO_QUALITY);
    });
    return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(blob), ...size };
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function releasePhoto(photo: ReportPhoto): void {
  URL.revokeObjectURL(photo.url);
}

export interface CompressResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
}

/**
 * Client-side image compression for past-question uploads.
 */
export async function compressVaultImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size;
  if (!file.type.startsWith('image/')) {
    return { file, originalBytes, compressedBytes: originalBytes };
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 2000;
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { file, originalBytes, compressedBytes: originalBytes };
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) return { file, originalBytes, compressedBytes: originalBytes };

  const outName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  const compressed = new File([blob], outName, { type: 'image/jpeg' });
  return { file: compressed, originalBytes, compressedBytes: compressed.size };
}

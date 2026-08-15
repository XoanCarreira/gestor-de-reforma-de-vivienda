/**
 * Compresión de imaxes no cliente antes de gardalas en IndexedDB.
 */

export interface CompressImageOptions {
  /** Ancho máximo en píxeles. Nunca se amplía unha imaxe máis pequena. */
  maxWidth?: number;
  /** Alto máximo en píxeles. */
  maxHeight?: number;
  /** Calidade JPEG, 0-1. */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8
};

// Límite duro sobre o arquivo ORIXINAL (antes de comprimir). Cargar algo
// maior a isto en un <canvas> pode facer que un móvil de gama baixa se
// quede sen memoria antes de chegar a comprimirlo.
export const MAX_ORIGINAL_FILE_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * Redimensiona e recomprime unha imaxe (File) a JPEG, devolvendo un data
 * URL en base64 listo para gardar. Rechaza se o arquivo non é unha imaxe
 * ou se supera MAX_ORIGINAL_FILE_BYTES.
 */
export function compressImage(file: File, options: CompressImageOptions = {}): Promise<string> {
  const { maxWidth, maxHeight, quality } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo non é unha imaxe.'));
      return;
    }
    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      reject(new Error(`A imaxe pesa ${formatBytes(file.size)}. O máximo admitido son ${formatBytes(MAX_ORIGINAL_FILE_BYTES)}.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Non se puido ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Non se puido decodificar a imaxe.'));
      img.onload = () => {
        // Escala mantendo proporción, sen ampliar imaxes pequenas
        // (Math.min(1, ...) evita que unha miniatura de 200px se estire a 1600px).
        let { width, height } = img;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Non se puido preparar o lenzo de compresión.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Úsase sempre JPEG: máis lixeiro que PNG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Tamaño aproximado en bytes dun data URL base64 (para mostrar al usuario). */
export function estimateBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  const padding = (base64.match(/=+$/) || [''])[0].length;
  // Cada 4 caracteres base64 codifican 3 bytes reais; se resta o padding.
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

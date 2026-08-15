/**
 * Compresión de imágenes en el cliente antes de guardarlas en IndexedDB.
 *
 * Una foto de cámara de móvil moderna pesa fácilmente 3-8 MB sin comprimir.
 * Guardarla tal cual como base64 en IndexedDB dispara el tamaño de la base
 * de datos, hincha el backup JSON y ralentiza cualquier operación que tenga
 * que traer varias fotos a memoria (listar la galería, por ejemplo).
 * Redimensionar a un máximo razonable y recomprimir a JPEG con calidad
 * moderada reduce el peso típico en un 80-95% sin pérdida perceptible en
 * pantalla (esto es una app de seguimiento de obra, no un archivo fotográfico).
 */

export interface CompressImageOptions {
  /** Ancho máximo en píxeles. Nunca se amplía una imagen más pequeña. */
  maxWidth?: number;
  /** Alto máximo en píxeles. */
  maxHeight?: number;
  /** Calidad JPEG, 0-1. */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8
};

// Límite duro sobre el archivo ORIGINAL (antes de comprimir). Cargar algo
// mayor a esto en un <canvas> puede hacer que un móvil de gama baja se
// quede sin memoria antes de llegar a comprimirlo.
export const MAX_ORIGINAL_FILE_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * Redimensiona y recomprime una imagen (File) a JPEG, devolviendo un data
 * URL en base64 listo para guardar. Rechaza si el archivo no es una imagen
 * o si supera MAX_ORIGINAL_FILE_BYTES.
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
        // Escala manteniendo proporción, sin ampliar imágenes ya pequeñas
        // (Math.min(1, ...) evita que una miniatura de 200px se estire a 1600px).
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

        // Se usa sempre JPEG: máis lixeiro que PNG e esta app non necesita
        // transparencia (son fotos de obra, non capturas de pantalla).
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Tamaño aproximado en bytes de un data URL base64 (para mostrar al usuario). */
export function estimateBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  const padding = (base64.match(/=+$/) || [''])[0].length;
  // Cada 4 caracteres base64 codifican 3 bytes reales; se resta el padding.
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

import { supabase, handleAuthError } from '../../core/config/supabase';
import imageCompression from 'browser-image-compression';

const BUCKET_NAME = 'productos';
const PROMOCIONES_BUCKET_NAME = 'productos';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
};

/**
 * Comprime una imagen antes de subirla
 */
async function compressImage(file: File): Promise<File> {
  // Solo comprimir imágenes (no SVG, GIF, etc.)
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS);
  } catch {
    console.warn('No se pudo comprimir la imagen, se subirá sin comprimir.');
    return file;
  }
}

/**
 * Subir una imagen al storage de Supabase
 */
export async function uploadProductImage(file: File, productId: number): Promise<string> {
  const compressed = await compressImage(file);

  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error al subir imagen:', error);
    await handleAuthError(error);
    throw error;
  }

  return filePath;
}

/**
 * Obtener la URL pública de una imagen
 */
export function getProductImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

/**
 * Eliminar una imagen del storage
 */
export async function deleteProductImage(imagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([imagePath]);

  if (error) {
    console.error('Error al eliminar imagen:', error);
    await handleAuthError(error);
    throw error;
  }
}

/**
 * Actualizar imagen de un producto (elimina la anterior si existe y sube la nueva)
 */
export async function updateProductImage(
  file: File,
  productId: number,
  oldImagePath?: string | null
): Promise<string> {
  if (oldImagePath) {
    try {
      await deleteProductImage(oldImagePath);
    } catch (error) {
      console.warn('No se pudo eliminar la imagen anterior:', error);
    }
  }

  return uploadProductImage(file, productId);
}

// ========== Funciones para Promociones ==========

/**
 * Subir una imagen de promoción al storage de Supabase
 */
export async function uploadPromocionImage(file: File, promocionId: number): Promise<string> {
  const compressed = await compressImage(file);

  const fileExt = file.name.split('.').pop();
  const fileName = `promo_${promocionId}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(PROMOCIONES_BUCKET_NAME)
    .upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error al subir imagen de promoción:', error);
    await handleAuthError(error);
    throw error;
  }

  return filePath;
}

/**
 * Obtener la URL pública de una imagen de promoción
 */
export function getPromocionImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;

  const { data } = supabase.storage
    .from(PROMOCIONES_BUCKET_NAME)
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

/**
 * Eliminar una imagen de promoción del storage
 */
export async function deletePromocionImage(imagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(PROMOCIONES_BUCKET_NAME)
    .remove([imagePath]);

  if (error) {
    console.error('Error al eliminar imagen de promoción:', error);
    await handleAuthError(error);
    throw error;
  }
}

/**
 * Actualizar imagen de una promoción (elimina la anterior si existe y sube la nueva)
 */
export async function updatePromocionImage(
  file: File,
  promocionId: number,
  oldImagePath?: string | null
): Promise<string> {
  if (oldImagePath) {
    try {
      await deletePromocionImage(oldImagePath);
    } catch (error) {
      console.warn('No se pudo eliminar la imagen anterior de promoción:', error);
    }
  }

  return uploadPromocionImage(file, promocionId);
}

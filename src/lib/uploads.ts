// Evidence-file upload helpers (image compression + Supabase Storage).
// Pure browser utilities — no React state involved.
import { supabase } from './supabase';
import { MAX_UPLOAD_SIZE, ALLOWED_UPLOAD_TYPES } from '../config/constants';

export function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadFile(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB)`);
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type) && !file.type.startsWith('image/')) {
    throw new Error('ประเภทไฟล์ไม่รองรับ (อนุญาตเฉพาะรูปภาพ)');
  }

  const compressed = await compressImage(file);
  const fileExt = compressed.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `evidence/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, compressed, {
    contentType: compressed.type || 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return data.publicUrl;
}

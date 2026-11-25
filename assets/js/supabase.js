import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

function normalizeSupabaseUrl(raw) {
  if (typeof raw !== 'string') return '';
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:' ? parsed.origin : '';
  } catch {
    return '';
  }
}

const cleanUrl = normalizeSupabaseUrl(SUPABASE_URL);
const hasKey = typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.trim().length > 20;

export const isSupabaseConfigured = Boolean(cleanUrl && hasKey);

let supabase = null;
let supabaseClientError = null;

if (isSupabaseConfigured) {
  try {
    // Pin exact 2.x release for reproducible CDN loading
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm');
    supabase = createClient(cleanUrl, SUPABASE_ANON_KEY.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    supabaseClientError = error;
    console.error('Could not initialize the Supabase client:', error);
  }
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/svg+xml'
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an image file to the public `portfolio-assets` Supabase Storage bucket.
 * Requires the authenticated user to pass the `is_admin()` storage RLS policy.
 */
export async function uploadPortfolioImage(file, folder = 'uploads') {
  if (!supabase) throw new Error('Supabase is not connected.');
  if (!(file instanceof File)) throw new Error('Please choose a valid image file.');
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only PNG, JPEG, WebP, AVIF, or SVG images are allowed.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '') || 'uploads';
  const filePath = `${safeFolder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('portfolio-assets')
    .upload(filePath, file, { cacheControl: '31536000', upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('portfolio-assets').getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Could not resolve uploaded image URL.');
  return data.publicUrl;
}

export { supabase, supabaseClientError };

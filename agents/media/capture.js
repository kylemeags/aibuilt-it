/**
 * capture.js
 *
 * Media capture module for downloading images, optimizing them with sharp,
 * and uploading to Cloudflare R2 (S3-compatible object storage).
 *
 * If R2 credentials are not configured, all functions gracefully fall back
 * to returning original URLs without uploading.
 *
 * Usage:
 *   import { captureImage, captureOgImage, captureMediaFromItem } from './capture.js';
 *
 *   const r2Url = await captureImage('https://example.com/photo.jpg', 'my-article');
 *   const ogUrl = await captureOgImage('https://example.com/page', 'my-article');
 *   const updatedItem = await captureMediaFromItem(item);
 */

import { config } from 'dotenv';
config({ override: true });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// R2 configuration
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const R2_CONFIGURED =
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET_NAME &&
  R2_PUBLIC_URL;

let s3Client = null;

/**
 * Lazily initialize the S3 client for R2.
 * Only created on first use when R2 is configured.
 */
function getS3Client() {
  if (!R2_CONFIGURED) return null;

  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_AGENT = 'Mozilla/5.0 (compatible; aibuilt-it-bot/1.0)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_IMAGE_WIDTH = 1200;

/**
 * Generate today's date string in YYYY-MM-DD format for the R2 path.
 */
function todayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Derive a short filename from a URL. Falls back to a hash if the URL
 * doesn't contain a recognizable filename.
 */
function deriveFilename(imageUrl) {
  try {
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    // Grab the last path segment, strip extension
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const name = last.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-');
    if (name && name.length > 2 && name.length < 80) return name;
  } catch {
    // URL parsing failed; fall through to hash
  }

  // Fallback: short hash of the URL
  return createHash('md5').update(imageUrl).digest('hex').slice(0, 12);
}

/**
 * Download an image from a URL with timeout.
 * Returns the image as a Buffer, or null on failure.
 */
async function downloadImage(imageUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[capture] Download failed (${response.status}): ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeout);
    console.warn(`[capture] Download error for ${imageUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Resize and convert an image buffer to WebP using sharp.
 * Returns the optimized buffer or null on failure.
 */
async function optimizeImage(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Only resize if wider than MAX_IMAGE_WIDTH
    if (metadata.width && metadata.width > MAX_IMAGE_WIDTH) {
      return await image
        .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    }

    return await image.webp({ quality: 80 }).toBuffer();
  } catch (error) {
    console.warn(`[capture] Image optimization failed: ${error.message}`);
    return null;
  }
}

/**
 * Upload a buffer to R2 and return the public URL.
 */
async function uploadToR2(buffer, key) {
  const client = getS3Client();
  if (!client) return null;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    // Build the public URL
    const publicUrl = R2_PUBLIC_URL.replace(/\/+$/, '');
    return `${publicUrl}/${key}`;
  } catch (error) {
    console.warn(`[capture] R2 upload failed for ${key}: ${error.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Download an image, optimize it to WebP, and upload to R2.
 *
 * If R2 is not configured, returns the original URL unchanged.
 *
 * @param {string} imageUrl - The source image URL to capture.
 * @param {string} slug - A slug for organizing the R2 path.
 * @returns {Promise<string>} The R2 public URL, or the original URL on failure.
 */
export async function captureImage(imageUrl, slug) {
  if (!imageUrl) return null;

  // If R2 is not configured, pass through the original URL
  if (!R2_CONFIGURED) {
    return imageUrl;
  }

  // Download
  const rawBuffer = await downloadImage(imageUrl);
  if (!rawBuffer) return imageUrl;

  // Optimize
  const optimized = await optimizeImage(rawBuffer);
  if (!optimized) return imageUrl;

  // Build R2 key: {date}/{slug}/{filename}.webp
  const date = todayDateString();
  const filename = deriveFilename(imageUrl);
  const safeSlug = (slug || 'media').replace(/[^a-z0-9_-]/gi, '-').slice(0, 60);
  const key = `${date}/${safeSlug}/${filename}.webp`;

  // Upload
  const r2Url = await uploadToR2(optimized, key);
  return r2Url || imageUrl;
}

/**
 * Fetch a page's HTML, extract the og:image meta tag, and capture that image.
 *
 * @param {string} pageUrl - The web page URL to scrape for og:image.
 * @param {string} slug - A slug for organizing the R2 path.
 * @returns {Promise<string|null>} The R2 URL of the captured OG image, or null.
 */
export async function captureOgImage(pageUrl, slug) {
  if (!pageUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[capture] OG fetch failed (${response.status}): ${pageUrl}`);
      return null;
    }

    // Only read the first ~100 KB to find the og:image in <head>
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();
    const MAX_BYTES = 100 * 1024;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Early exit once we're past <head>
      if (html.includes('</head>')) break;
    }

    reader.cancel().catch(() => {});

    // Try property="og:image" content="..." (most common order)
    let match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );

    // Some sites put content before property
    if (!match) {
      match = html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );
    }

    if (!match) return null;

    const ogImageUrl = match[1];
    return await captureImage(ogImageUrl, slug);
  } catch (error) {
    clearTimeout(timeout);
    console.warn(`[capture] OG extraction error for ${pageUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Process all media in a standardized result item.
 *
 * - Captures each URL in item.mediaUrls through captureImage
 * - If mediaUrls is empty, tries captureOgImage on item.toolUrl
 * - Returns a new item object with R2 URLs replacing originals
 *
 * @param {Object} item - A standardized result object with mediaUrls, toolUrl, title, etc.
 * @returns {Promise<Object>} A copy of the item with captured media URLs.
 */
export async function captureMediaFromItem(item) {
  const slug = (item.title || 'media')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const updatedItem = { ...item };

  // Process existing mediaUrls
  if (item.mediaUrls && item.mediaUrls.length > 0) {
    const capturedUrls = [];

    for (const mediaUrl of item.mediaUrls) {
      try {
        const captured = await captureImage(mediaUrl, slug);
        capturedUrls.push(captured || mediaUrl);
      } catch (error) {
        console.warn(`[capture] Failed to capture media ${mediaUrl}: ${error.message}`);
        capturedUrls.push(mediaUrl);
      }
    }

    updatedItem.mediaUrls = capturedUrls;
  } else if (item.toolUrl) {
    // No existing media — try to grab the OG image from toolUrl
    try {
      const ogUrl = await captureOgImage(item.toolUrl, slug);
      if (ogUrl) {
        updatedItem.mediaUrls = [ogUrl];
      }
    } catch (error) {
      console.warn(`[capture] Failed to capture OG image from ${item.toolUrl}: ${error.message}`);
    }
  }

  return updatedItem;
}

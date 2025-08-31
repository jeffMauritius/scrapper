import { put } from '@vercel/blob';
import axios from 'axios';

export async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Erreur lors du téléchargement de l'image ${url}:`, error);
    throw error;
  }
}

export async function uploadToVercelBlob(imageBuffer: Buffer, filename: string): Promise<string> {
  try {
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      addRandomSuffix: true
    });

    return blob.url;
  } catch (error) {
    console.error(`Erreur lors de l'upload vers Vercel Blob:`, error);
    throw error;
  }
}

export function generateUniqueFilename(url: string, venueId: string, index: number): string {
  const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
  return `venues/${venueId}/image-${index}.${extension}`;
}
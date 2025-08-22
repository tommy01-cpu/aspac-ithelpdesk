import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ProcessedImages {
  processedHtml: string;
  imageCount: number;
  savedImages: string[];
}

/**
 * Process HTML content for email by converting base64 images to public URLs
 * @param htmlContent - The HTML content containing base64 images
 * @param requestId - The request ID to use for image file naming
 * @returns ProcessedImages object with processed HTML and metadata
 */
export async function processImagesForEmail(
  htmlContent: string, 
  requestId: number | string
): Promise<ProcessedImages> {
  if (!htmlContent) {
    return {
      processedHtml: htmlContent,
      imageCount: 0,
      savedImages: []
    };
  }

  const savedImages: string[] = [];
  let imageCount = 0;

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'request-images');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Regular expression to find base64 images in HTML
    const base64ImageRegex = /<img[^>]+src="data:image\/([a-zA-Z]*);base64,([^"]+)"[^>]*>/gi;
    
    let processedHtml = htmlContent;
    let match;

    while ((match = base64ImageRegex.exec(htmlContent)) !== null) {
      try {
        const [fullMatch, imageType, base64Data] = match;
        imageCount++;

        // Generate unique filename
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(base64Data.substring(0, 100)).digest('hex').substring(0, 8);
        const filename = `request_${requestId}_img_${imageCount}_${timestamp}_${hash}.${imageType}`;
        const filepath = path.join(uploadsDir, filename);

        // Decode base64 and save file
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(filepath, new Uint8Array(buffer));

        // Generate public URL
        const publicUrl = `/uploads/request-images/${filename}`;
        
        // Replace base64 data URL with public URL in HTML
        const newImgTag = fullMatch.replace(
          /src="data:image\/[a-zA-Z]*;base64,[^"]+"/,
          `src="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${publicUrl}"`
        );
        
        processedHtml = processedHtml.replace(fullMatch, newImgTag);
        savedImages.push(filename);
        
        console.log(`✅ Processed image for email: ${filename}`);
      } catch (imageError) {
        console.error('Error processing individual image:', imageError);
        // Continue processing other images if one fails
      }
    }

    console.log(`📧 Email image processing completed: ${imageCount} images processed for request ${requestId}`);

    return {
      processedHtml,
      imageCount,
      savedImages
    };

  } catch (error) {
    console.error('Error processing images for email:', error);
    // Return original HTML if processing fails
    return {
      processedHtml: htmlContent,
      imageCount: 0,
      savedImages: []
    };
  }
}

/**
 * Clean up old request images to save disk space
 * @param maxAgeHours - Maximum age of images in hours (default: 168 = 1 week)
 */
export async function cleanupOldRequestImages(maxAgeHours: number = 168): Promise<number> {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'request-images');
    
    try {
      await fs.access(uploadsDir);
    } catch {
      // Directory doesn't exist, nothing to clean
      return 0;
    }

    const files = await fs.readdir(uploadsDir);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️  Deleted old request image: ${file}`);
        }
      } catch (fileError) {
        console.warn(`Warning: Could not process file ${file}:`, fileError);
      }
    }

    console.log(`🧹 Cleanup completed: ${deletedCount} old request images deleted`);
    return deletedCount;

  } catch (error) {
    console.error('Error during request image cleanup:', error);
    return 0;
  }
}

/**
 * Strip images from HTML content (fallback for email clients that don't support images)
 * @param htmlContent - The HTML content
 * @returns HTML content with images removed and replaced with placeholder text
 */
export function stripImagesFromHtml(htmlContent: string): string {
  if (!htmlContent) return htmlContent;

  // Replace image tags with placeholder text
  return htmlContent.replace(
    /<img[^>]*>/gi,
    '<div style="border: 1px solid #ccc; padding: 8px; margin: 4px 0; background: #f5f5f5; color: #666; font-size: 12px;">[Image attachment - view full request for images]</div>'
  );
}

/**
 * Get the base URL for the application
 * @returns The base URL from environment or localhost fallback
 */
export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

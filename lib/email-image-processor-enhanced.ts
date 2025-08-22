import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ProcessedImages {
  processedHtml: string;
  imageCount: number;
  savedImages: string[];
  embedCount: number;
}

/**
 * Process HTML content for email by handling base64 images
 * @param htmlContent - The HTML content containing base64 images
 * @param requestId - The request ID to use for image file naming
 * @param embedSmallImages - Whether to embed small images (< 50KB) directly in email
 * @returns ProcessedImages object with processed HTML and metadata
 */
export async function processImagesForEmailWithOptions(
  htmlContent: string, 
  requestId: number | string,
  embedSmallImages: boolean = false,
  maxEmbedSize: number = 50 * 1024 // 50KB
): Promise<ProcessedImages> {
  if (!htmlContent) {
    return {
      processedHtml: htmlContent,
      imageCount: 0,
      savedImages: [],
      embedCount: 0
    };
  }

  const savedImages: string[] = [];
  let imageCount = 0;
  let embedCount = 0;

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

        // Decode base64 to get image size
        const buffer = Buffer.from(base64Data, 'base64');
        const imageSize = buffer.length;

        console.log(`📊 Image ${imageCount}: ${imageSize} bytes (${(imageSize / 1024).toFixed(1)}KB)`);

        if (embedSmallImages && imageSize <= maxEmbedSize) {
          // Keep small images as base64 (embedded)
          console.log(`📎 Embedding small image ${imageCount} (${(imageSize / 1024).toFixed(1)}KB)`);
          embedCount++;
          // Keep the original base64 image in the HTML
          continue;
        } else {
          // Save larger images as files and use HTTP URLs
          const timestamp = Date.now();
          const hash = crypto.createHash('md5').update(base64Data.substring(0, 100)).digest('hex').substring(0, 8);
          const filename = `request_${requestId}_img_${imageCount}_${timestamp}_${hash}.${imageType}`;
          const filepath = path.join(uploadsDir, filename);

          // Save file
          await fs.writeFile(filepath, new Uint8Array(buffer));

          // Generate public URL
          const publicUrl = `/uploads/request-images/${filename}`;
          const fullUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${publicUrl}`;
          
          // Replace base64 data URL with public URL in HTML
          const newImgTag = fullMatch.replace(
            /src="data:image\/[a-zA-Z]*;base64,[^"]+"/,
            `src="${fullUrl}"`
          );
          
          processedHtml = processedHtml.replace(fullMatch, newImgTag);
          savedImages.push(filename);
          
          console.log(`💾 Saved large image ${imageCount} as: ${filename} (${(imageSize / 1024).toFixed(1)}KB)`);
        }
      } catch (imageError) {
        console.error('Error processing individual image:', imageError);
        // Continue processing other images if one fails
      }
    }

    console.log(`📧 Email image processing completed: ${imageCount} total, ${embedCount} embedded, ${savedImages.length} saved as files`);

    return {
      processedHtml,
      imageCount,
      savedImages,
      embedCount
    };

  } catch (error) {
    console.error('Error processing images for email:', error);
    // Return original HTML if processing fails
    return {
      processedHtml: htmlContent,
      imageCount: 0,
      savedImages: [],
      embedCount: 0
    };
  }
}

/**
 * Determine the best image processing strategy based on environment
 * @param htmlContent - The HTML content containing base64 images
 * @param requestId - The request ID to use for image file naming
 * @returns ProcessedImages object with processed HTML and metadata
 */
export async function processImagesForEmailAuto(
  htmlContent: string, 
  requestId: number | string
): Promise<ProcessedImages> {
  if (!htmlContent) {
    return {
      processedHtml: htmlContent,
      imageCount: 0,
      savedImages: [],
      embedCount: 0
    };
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Determine if we have a public domain or internal network
  const isPublicDomain = baseUrl.includes('aspacphils.com.ph') || 
                         baseUrl.startsWith('https://') ||
                         (!baseUrl.includes('localhost') && !baseUrl.includes('192.168.') && !baseUrl.includes('127.0.'));
  
  console.log(`🌐 Image processing mode: ${isPublicDomain ? 'PUBLIC DOMAIN' : 'INTERNAL NETWORK'}`);
  console.log(`🔗 Base URL: ${baseUrl}`);
  
  if (isPublicDomain) {
    // For public domains, use HTTP URLs (smaller emails, better performance)
    console.log('📡 Using HTTP URLs for public domain');
    return processImagesForEmailWithOptions(htmlContent, requestId, false);
  } else {
    // For internal networks, embed small images for better compatibility
    console.log('🏠 Using embedded images for internal network');
    return processImagesForEmailWithOptions(htmlContent, requestId, true, 100 * 1024); // 100KB limit for internal
  }
}

// Keep the original function for backwards compatibility
export async function processImagesForEmail(
  htmlContent: string, 
  requestId: number | string
): Promise<Omit<ProcessedImages, 'embedCount'>> {
  const result = await processImagesForEmailWithOptions(htmlContent, requestId, false);
  return {
    processedHtml: result.processedHtml,
    imageCount: result.imageCount,
    savedImages: result.savedImages
  };
}

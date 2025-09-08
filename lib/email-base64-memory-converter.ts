/**
 * Email Base64 Memory Converter
 * Converts base64 images to email attachments WITHOUT saving files
 * Everything happens in memory only
 */

interface Base64Attachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
}

export class EmailBase64MemoryConverter {
  private attachments: Base64Attachment[] = [];
  private cidCounter = 0;

  /**
   * Convert base64 images in HTML to CID references for email
   * No files are created - everything in memory
   */
  convertBase64ToEmailCids(htmlContent: string): {
    htmlContent: string;
    attachments: Base64Attachment[];
  } {
    this.attachments = [];
    this.cidCounter = 0;

    console.log('🔍 Starting base64 image conversion...');
    
    // Simpler, more reliable regex pattern
    const base64ImageRegex = /<img[^>]*src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi;
    
    let convertedHtml = htmlContent;
    const matches = Array.from(htmlContent.matchAll(base64ImageRegex));
    
    console.log(`📸 Found ${matches.length} base64 images to convert`);

    matches.forEach((match, index) => {
      const [fullMatch, imageType, base64Data] = match;
      
      console.log(`📸 Processing image ${index + 1}: ${imageType}, data length: ${base64Data.length}`);
      
      try {
        // Simple CID like the working test
        const cid = `img${++this.cidCounter}`;
        
        // Convert base64 to buffer (in memory only)
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log(`🔄 Converted to buffer: ${imageBuffer.length} bytes`);
        
        // Create attachment object (no file creation)
        const attachment: Base64Attachment = {
          filename: `image${this.cidCounter}.${imageType}`,
          content: imageBuffer,
          cid: cid,
          contentType: `image/${imageType}`,
        };
        
        this.attachments.push(attachment);
        
        // Simple replacement like the working test with responsive styling
        const cidReference = `cid:${cid}`;
        let newImgTag = fullMatch.replace(/src="data:image\/[^"]+"/gi, `src="${cidReference}"`);
        
        // Add responsive styling if not already present
        if (!newImgTag.includes('style=')) {
          newImgTag = newImgTag.replace('<img', '<img style="max-width: 100%; height: auto; display: block; margin: 10px 0;"');
        } else {
          // Update existing style to include responsive properties
          newImgTag = newImgTag.replace(/style="([^"]*)"/, 'style="$1; max-width: 100%; height: auto; display: block; margin: 10px 0;"');
        }
        
        convertedHtml = convertedHtml.replace(fullMatch, newImgTag);
        
        console.log(`📎 Converted image ${index + 1} to CID: ${cid}`);
        
      } catch (error) {
        console.error(`❌ Error converting image ${index + 1}:`, error);
        // Keep original base64 if conversion fails
      }
    });

    console.log(`✅ Conversion complete. Generated ${this.attachments.length} CID attachments`);
    
    return {
      htmlContent: convertedHtml,
      attachments: this.attachments
    };
  }

  /**
   * Get attachments in nodemailer format
   */
  getNodemailerAttachments() {
    return this.attachments.map((att, index) => ({
      filename: att.filename,
      content: att.content,
      cid: att.cid,
      contentType: att.contentType,
      contentDisposition: 'inline',
      encoding: 'base64'
    }));
  }

  /**
   * Clear memory (no files to delete)
   */
  cleanup() {
    this.attachments = [];
    this.cidCounter = 0;
    console.log('🧹 Memory attachments cleared (no files were created)');
  }
}

/**
 * Quick function to process HTML with base64 images for email
 */
export function convertBase64ImagesForEmail(htmlContent: string) {
  const converter = new EmailBase64MemoryConverter();
  const result = converter.convertBase64ToEmailCids(htmlContent);
  
  return {
    html: result.htmlContent,
    attachments: converter.getNodemailerAttachments(),
    cleanup: () => converter.cleanup()
  };
}

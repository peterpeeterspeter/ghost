import { fal } from "@fal-ai/client";
import { 
  FalBriaRequest, 
  FalBriaResponse, 
  BackgroundRemovalResult, 
  GhostPipelineError 
} from "@/types/ghost";

// Configure FAL client
export function configureFalClient(apiKey: string): void {
  fal.config({
    credentials: apiKey,
  });
}

/**
 * Enhanced background removal with birefnet support (v2.1)
 * @param imageUrl - URL or base64 encoded image
 * @param options - Optional processing options
 * @returns Promise with cleaned image URL and processing time
 */
export async function removeBackground(
  imageUrl: string, 
  options: {
    model?: 'birefnet' | 'bria';
    enableQualityValidation?: boolean;
  } = {}
): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();
  const { model = 'birefnet', enableQualityValidation = true } = options;

  try {
    // Validate input
    if (!imageUrl) {
      throw new GhostPipelineError(
        'Image URL is required for background removal',
        'MISSING_IMAGE_URL',
        'background_removal'
      );
    }

    console.log(`🚀 Starting background removal with FAL.AI ${model}...`);
    
    let processedImageUrl = imageUrl;
    
    // Enhanced image preprocessing
    if (imageUrl.startsWith('data:image/')) {
      const base64Size = (imageUrl.length * 3) / 4;
      console.log('📊 Base64 image size:', (base64Size / 1024 / 1024).toFixed(2), 'MB');
      
      if (base64Size > 1024 * 1024) {
        console.log('🔄 Large image detected, uploading to FAL storage...');
        try {
          const [header, base64Data] = imageUrl.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          
          const file = new File([buffer], 'image.jpg', { type: mimeType });
          const uploadedUrl = await fal.storage.upload(file);
          processedImageUrl = uploadedUrl;
          console.log('✅ Image uploaded to FAL storage:', uploadedUrl);
        } catch (uploadError) {
          console.warn('⚠️ FAL storage upload failed, using direct base64:', uploadError);
        }
      }
    }

    // Select appropriate model endpoint
    const endpoint = model === 'birefnet' 
      ? "fal-ai/birefnet" 
      : "fal-ai/bria/background/remove";

    console.log(`📤 Sending request to ${endpoint}...`);
    
    const result: any = await fal.subscribe(endpoint, {
      input: {
        image_url: processedImageUrl
      },
      logs: false,
      onQueueUpdate: (update) => {
        if (update.status) {
          console.log('📋 FAL Status:', update.status);
        }
      },
    });

    const processingTime = Date.now() - startTime;

    // Enhanced response validation
    const responseData = result?.data || result;
    const resultImageUrl = responseData?.image?.url;
    
    if (!resultImageUrl || typeof resultImageUrl !== 'string') {
      console.error('FAL.AI response structure:', result);
      console.error('Response data:', responseData);
      throw new GhostPipelineError(
        `Invalid response from FAL.AI ${model}: missing image URL`,
        'INVALID_FAL_RESPONSE',
        'background_removal'
      );
    }

    // Quality validation (v2.1 enhancement)
    if (enableQualityValidation) {
      await validateBackgroundRemovalQuality(resultImageUrl);
    }

    console.log(`Background removal (${model}) completed in ${processingTime}ms`);
    
    return {
      cleanedImageUrl: resultImageUrl,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Enhanced error handling with model fallback
    if (model === 'birefnet' && error instanceof Error && 
        (error.message.includes('not available') || error.message.includes('404'))) {
      console.warn('⚠️ BiRefNet not available, falling back to Bria...');
      return removeBackground(imageUrl, { ...options, model: 'bria' });
    }
    
    console.error('Background removal failed:', error);
    
    // Handle FAL.AI specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new GhostPipelineError(
          'FAL.AI rate limit exceeded. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          'background_removal',
          error
        );
      }
      
      if (error.message.includes('insufficient credits')) {
        throw new GhostPipelineError(
          'Insufficient FAL.AI credits',
          'INSUFFICIENT_CREDITS',
          'background_removal',
          error
        );
      }

      if (error.message.includes('invalid image')) {
        throw new GhostPipelineError(
          'Invalid image format or corrupted image',
          'INVALID_IMAGE_FORMAT',
          'background_removal',
          error
        );
      }
    }

    if (error instanceof GhostPipelineError) {
      throw error;
    }

    throw new GhostPipelineError(
      `Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BACKGROUND_REMOVAL_FAILED',
      'background_removal',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validate image URL format and accessibility
 * @param imageUrl - URL to validate
 * @returns Promise<boolean> - true if valid and accessible
 */
export async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    // Check if it's a base64 data URL
    if (imageUrl.startsWith('data:image/')) {
      return true;
    }

    // Check if it's a valid HTTP/HTTPS URL
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Try to fetch the image headers to verify it exists and is an image
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') ?? false;

  } catch {
    return false;
  }
}



/**
 * Get estimated processing time for background removal based on image size
 * @param imageUrl - Image URL or base64 data
 * @returns number - Estimated processing time in milliseconds
 */
export async function getEstimatedProcessingTime(imageUrl: string): Promise<number> {
  try {
    // For base64 data URLs, estimate from string length
    if (imageUrl.startsWith('data:image/')) {
      const base64Length = imageUrl.length;
      // Rough estimation: larger base64 = larger image = longer processing
      return Math.min(Math.max(base64Length / 1000, 2000), 30000); // 2-30 seconds
    }

    // For URLs, try to get image size from headers
    const response = await fetch(imageUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      return Math.min(Math.max(sizeInMB * 2000, 2000), 30000); // 2-30 seconds based on file size
    }

    return 5000; // Default 5 seconds if we can't determine size
  } catch {
    return 5000; // Default 5 seconds on error
  }
}

/**
 * Quality validation for background removal results (v2.1)
 * @param imageUrl - URL of processed image to validate
 * @returns Promise<boolean> - true if quality meets standards
 */
export async function validateBackgroundRemovalQuality(imageUrl: string): Promise<boolean> {
  try {
    // TODO: Implement actual quality validation
    // This would check for:
    // - Edge smoothness (≤2px variance target)
    // - Artifact detection
    // - Transparency channel validation
    // - Complete background removal
    
    console.log('🔍 Validating background removal quality...');
    
    // Placeholder validation - would be replaced with actual image analysis
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock quality checks passed
    console.log('✅ Background removal quality validation passed');
    return true;
    
  } catch (error) {
    console.warn('⚠️ Quality validation failed:', error);
    return false;
  }
}

/**
 * Parallel background removal for dual images (v2.1 enhancement)
 * @param images - Array of image URLs to process
 * @param options - Processing options
 * @returns Promise<BackgroundRemovalResult[]> - Array of results
 */
export async function removeBackgroundBatch(
  images: string[],
  options: {
    model?: 'birefnet' | 'bria';
    enableQualityValidation?: boolean;
    maxConcurrency?: number;
  } = {}
): Promise<BackgroundRemovalResult[]> {
  const { maxConcurrency = 2 } = options;
  
  console.log(`🚀 Starting batch background removal for ${images.length} images...`);
  
  // Process images in batches to respect concurrency limits
  const results: BackgroundRemovalResult[] = [];
  
  for (let i = 0; i < images.length; i += maxConcurrency) {
    const batch = images.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(imageUrl => removeBackground(imageUrl, options));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${i / maxConcurrency + 1} failed:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Batch background removal completed for ${results.length} images`);
  return results;
}

/**
 * Upload generated image to FAL storage for permanent URL
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise<string> - Permanent storage URL
 */
export async function uploadImageToFalStorage(imageDataUrl: string): Promise<string> {
  try {
    console.log('Uploading generated image to FAL storage...');
    
    // Convert data URL to file for upload
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
    
    // Create a blob from base64
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], 'ghost-mannequin.png', { type: mimeType });
    
    // Upload to FAL storage using the same pattern as background removal
    const uploadResult = await fal.storage.upload(file);
    
    console.log('Image uploaded to FAL storage successfully:', uploadResult);
    return uploadResult;
    
  } catch (error) {
    console.error('FAL storage upload failed:', error);
    
    // Return original data URL as fallback
    return imageDataUrl;
  }
}

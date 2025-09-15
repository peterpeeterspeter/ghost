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
 * Remove background from image using FAL.AI Bria 2.0 model
 * @param imageUrl - URL or base64 encoded image
 * @returns Promise with cleaned image URL and processing time
 */
export async function removeBackground(imageUrl: string): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!imageUrl) {
      throw new GhostPipelineError(
        'Image URL is required for background removal',
        'MISSING_IMAGE_URL',
        'background_removal'
      );
    }

    // Prepare request
    const request: FalBriaRequest = {
      image_url: imageUrl,
    };

    console.log('Starting background removal with FAL.AI Bria 2.0...');
    
    // Call FAL.AI Bria background removal endpoint
    const result = await fal.subscribe("fal-ai/bria/background/remove", {
      input: request,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('FAL.AI Queue Update:', update);
      },
    }) as FalBriaResponse;

    const processingTime = Date.now() - startTime;

    // Validate response
    if (!result?.image?.url) {
      throw new GhostPipelineError(
        'Invalid response from FAL.AI: missing image URL',
        'INVALID_FAL_RESPONSE',
        'background_removal'
      );
    }

    console.log(`Background removal completed in ${processingTime}ms`);
    
    return {
      cleanedImageUrl: result.image.url,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
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

    // Re-throw if already a GhostPipelineError
    if (error instanceof GhostPipelineError) {
      throw error;
    }

    // Generic error handling
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
 * Convert base64 image to temporary URL for FAL.AI processing
 * Note: In production, you might want to upload to a temporary storage first
 * @param base64Data - Base64 encoded image data
 * @returns string - URL that can be used by FAL.AI
 */
export function prepareImageForFal(base64Data: string): string {
  // If it's already a URL, return as-is
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }

  // If it's a base64 data URL, return as-is (FAL.AI should handle this)
  if (base64Data.startsWith('data:image/')) {
    return base64Data;
  }

  // If it's just base64 data without the data URL prefix, add it
  return `data:image/jpeg;base64,${base64Data}`;
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

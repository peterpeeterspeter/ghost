/**
 * Background Removal using BRIA API via FAL.AI
 */

import { removeBackground, configureFalClient } from "@/lib/ghost/fal";

export async function cleanBackground(imageUrl: string): Promise<string> {
  console.log(`[Bria] Starting real background removal for: ${imageUrl.startsWith('data:') ? 'base64 data URL' : imageUrl}`);
  
  try {
    // Configure FAL client if API key is available
    const falApiKey = process.env.FAL_KEY;
    if (!falApiKey) {
      console.warn('[Bria] No FAL_KEY found in environment variables');
      throw new Error('FAL.AI API key not configured');
    }
    
    // Configure the FAL client
    configureFalClient(falApiKey);
    
    // Use the real FAL.AI background removal with BRIA model
    const result = await removeBackground(imageUrl, {
      model: 'bria',
      enableQualityValidation: true
    });
    
    console.log(`[Bria] ✅ Real background removal completed in ${result.processingTime}ms`);
    console.log(`[Bria] Result URL: ${result.cleanedImageUrl}`);
    
    return result.cleanedImageUrl;
    
  } catch (error) {
    console.error('[Bria] ❌ Real background removal failed:', error);
    
    // For development/testing, fall back to pass-through for base64
    if (imageUrl.startsWith('data:')) {
      console.warn('[Bria] Falling back to pass-through for base64 data URL');
      return imageUrl;
    }
    
    // Re-throw the error for proper error handling upstream
    throw error;
  }
}
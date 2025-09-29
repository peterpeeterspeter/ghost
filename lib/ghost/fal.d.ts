import { BackgroundRemovalResult } from "@/types/ghost";
export declare function configureFalClient(apiKey: string): void;
/**
 * Remove background from image using FAL.AI Bria 2.0 model
 * @param imageUrl - URL or base64 encoded image
 * @returns Promise with cleaned image URL and processing time
 */
export declare function removeBackground(imageUrl: string): Promise<BackgroundRemovalResult>;
/**
 * Validate image URL format and accessibility
 * @param imageUrl - URL to validate
 * @returns Promise<boolean> - true if valid and accessible
 */
export declare function validateImageUrl(imageUrl: string): Promise<boolean>;
/**
 * Get estimated processing time for background removal based on image size
 * @param imageUrl - Image URL or base64 data
 * @returns number - Estimated processing time in milliseconds
 */
export declare function getEstimatedProcessingTime(imageUrl: string): Promise<number>;
/**
 * Upload generated image to FAL storage for permanent URL
 * @param imageDataUrl - Base64 data URL of the image
 * @returns Promise<string> - Permanent storage URL
 */
export declare function uploadImageToFalStorage(imageDataUrl: string): Promise<string>;

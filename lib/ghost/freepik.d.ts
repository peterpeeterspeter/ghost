/**
 * Generate ghost mannequin image using Freepik's Gemini 2.5 Flash API
 */
/**
 * Test function to verify Freepik API behavior with minimal payload
 */
export declare function testFreepikImageGeneration(testImage: string): Promise<{
    taskId: string;
    result: any;
}>;
/**
 * Test function with minimal prompt to debug Freepik API failures
 */
export declare function testFreepikWithSimplePrompt(imageUrl1: string, imageUrl2: string): Promise<{
    taskId: string;
    success: boolean;
    error?: string;
}>;
export declare function generateImageWithFreepikGemini(prompt: string, inputImage: string, referenceImage?: string): Promise<{
    imageBase64: string;
    processingTime: number;
}>;
/**
 * Generate ghost mannequin image using Freepik's Gemini 2.5 Flash API with JSON payload
 * This version accepts a structured JSON payload as the prompt
 *
 * @param jsonPrompt - The JSON payload as a string (stringified FlashImagePromptPayload)
 * @param inputImage - The input image (cleaned flatlay or base64)
 * @param referenceImage - Optional reference image (on-model or base64)
 * @returns Promise<{ imageBase64: string; processingTime: number }>
 */
export declare function generateImageWithFreepikGeminiJson(jsonPrompt: string, inputImage: string, referenceImage?: string): Promise<{
    imageBase64: string;
    processingTime: number;
}>;
/**
 * Alternative method using Freepik's Mystic API endpoint
 * This provides more flexibility and potentially different content policies
 */
export declare function generateImageWithFreepikMystic(prompt: string, inputImage: string, referenceImage?: string): Promise<{
    imageBase64: string;
    processingTime: number;
}>;
/**
 * Health check for Freepik API
 */
export declare function checkFreepikHealth(): Promise<{
    status: string;
    message: string;
}>;

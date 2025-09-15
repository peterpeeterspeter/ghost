import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  AnalysisJSON, 
  AnalysisJSONSchema,
  GarmentAnalysisResult, 
  GhostMannequinResult,
  GeminiAnalysisRequest,
  GeminiRenderRequest,
  GhostPipelineError,
  ANALYSIS_PROMPT,
  GHOST_MANNEQUIN_PROMPT
} from "@/types/ghost";

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;

export function configureGeminiClient(apiKey: string): void {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Convert image URL or base64 to base64 data for Gemini
 * @param imageInput - URL or base64 string
 * @returns Promise<string> - base64 data
 */
async function prepareImageForGemini(imageInput: string): Promise<string> {
  if (imageInput.startsWith('data:image/')) {
    // Extract base64 from data URL
    return imageInput.split(',')[1];
  }
  
  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    // Fetch image and convert to base64
    try {
      const response = await fetch(imageInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      throw new GhostPipelineError(
        `Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_FETCH_FAILED',
        'analysis',
        error instanceof Error ? error : undefined
      );
    }
  }
  
  // Assume it's already base64
  return imageInput;
}

/**
 * Get MIME type from image data or URL
 * @param imageInput - Image URL, data URL, or base64
 * @returns string - MIME type
 */
function getImageMimeType(imageInput: string): string {
  if (imageInput.startsWith('data:image/')) {
    const mimeMatch = imageInput.match(/data:(image\/[^;]+)/);
    return mimeMatch ? mimeMatch[1] : 'image/jpeg';
  }
  
  if (imageInput.includes('.png')) return 'image/png';
  if (imageInput.includes('.webp')) return 'image/webp';
  
  // Default to JPEG
  return 'image/jpeg';
}

/**
 * Analyze garment using Gemini Pro model with structured output
 * @param imageUrl - Clean garment image URL or base64
 * @returns Promise with structured analysis and processing time
 */
export async function analyzeGarment(imageUrl: string): Promise<GarmentAnalysisResult> {
  const startTime = Date.now();

  if (!genAI) {
    throw new GhostPipelineError(
      'Gemini client not configured. Call configureGeminiClient first.',
      'CLIENT_NOT_CONFIGURED',
      'analysis'
    );
  }

  try {
    console.log('Starting garment analysis with Gemini Pro...');

    // Get the Gemini Pro model with structured output
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: AnalysisJSONSchema,
      },
    });

    // Prepare image data
    const imageData = await prepareImageForGemini(imageUrl);
    const mimeType = getImageMimeType(imageUrl);

    // Create the prompt with image
    const result = await model.generateContent([
      {
        text: ANALYSIS_PROMPT,
      },
      {
        inlineData: {
          data: imageData,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const responseText = response.text();
    
    if (!responseText) {
      throw new GhostPipelineError(
        'Empty response from Gemini Pro analysis',
        'EMPTY_ANALYSIS_RESPONSE',
        'analysis'
      );
    }

    // Parse and validate the JSON response
    let analysis: AnalysisJSON;
    try {
      const parsedResponse = JSON.parse(responseText);
      analysis = AnalysisJSONSchema.parse(parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse analysis response:', responseText);
      throw new GhostPipelineError(
        'Invalid JSON structure in analysis response',
        'INVALID_ANALYSIS_JSON',
        'analysis',
        parseError instanceof Error ? parseError : undefined
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`Garment analysis completed in ${processingTime}ms`);

    return {
      analysis,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Garment analysis failed:', error);

    // Re-throw if already a GhostPipelineError
    if (error instanceof GhostPipelineError) {
      throw error;
    }

    // Handle Gemini-specific errors
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new GhostPipelineError(
          'Gemini API quota exceeded or rate limit hit',
          'GEMINI_QUOTA_EXCEEDED',
          'analysis',
          error
        );
      }

      if (error.message.includes('safety') || error.message.includes('blocked')) {
        throw new GhostPipelineError(
          'Content blocked by Gemini safety filters',
          'CONTENT_BLOCKED',
          'analysis',
          error
        );
      }
    }

    throw new GhostPipelineError(
      `Garment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ANALYSIS_FAILED',
      'analysis',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate ghost mannequin image using Gemini Flash model
 * @param flatlayImage - Clean flatlay image (base64 or URL)
 * @param onModelImage - Optional on-model reference image
 * @param analysis - Structured garment analysis
 * @returns Promise with rendered image URL and processing time
 */
export async function generateGhostMannequin(
  flatlayImage: string,
  analysis: AnalysisJSON,
  onModelImage?: string
): Promise<GhostMannequinResult> {
  const startTime = Date.now();

  if (!genAI) {
    throw new GhostPipelineError(
      'Gemini client not configured. Call configureGeminiClient first.',
      'CLIENT_NOT_CONFIGURED',
      'rendering'
    );
  }

  try {
    console.log('Starting ghost mannequin generation with Gemini Flash...');

    // Get the Gemini Flash model for image generation
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2, // Slightly higher for creative generation
      },
    });

    // Prepare images
    const flatlayData = await prepareImageForGemini(flatlayImage);
    const flatlayMimeType = getImageMimeType(flatlayImage);
    
    // Build the content array
    const contentParts: any[] = [
      {
        text: `${GHOST_MANNEQUIN_PROMPT}\n\nGarment Analysis Data:\n${JSON.stringify(analysis, null, 2)}`,
      },
      {
        inlineData: {
          data: flatlayData,
          mimeType: flatlayMimeType,
        },
      },
    ];

    // Add on-model image if provided
    if (onModelImage) {
      const onModelData = await prepareImageForGemini(onModelImage);
      const onModelMimeType = getImageMimeType(onModelImage);
      
      contentParts.splice(1, 0, {
        text: "Reference on-model image:",
      });
      contentParts.splice(2, 0, {
        inlineData: {
          data: onModelData,
          mimeType: onModelMimeType,
        },
      });
    }

    // Generate the ghost mannequin image
    const result = await model.generateContent(contentParts);
    const response = await result.response;

    // Note: Gemini Flash doesn't directly generate images in the current API
    // This is a placeholder implementation. In practice, you might need to:
    // 1. Use a different endpoint/model that supports image generation
    // 2. Or use the analysis to create a detailed prompt for another image generation service
    // 3. Or combine multiple AI services for the final rendering
    
    // For now, we'll return a placeholder response
    // In a real implementation, you'd extract the generated image URL from the response
    const renderUrl = "placeholder-ghost-mannequin-url.png"; // This would be the actual generated image URL
    
    const processingTime = Date.now() - startTime;
    console.log(`Ghost mannequin generation completed in ${processingTime}ms`);

    return {
      renderUrl,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Ghost mannequin generation failed:', error);

    // Re-throw if already a GhostPipelineError
    if (error instanceof GhostPipelineError) {
      throw error;
    }

    // Handle Gemini-specific errors
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new GhostPipelineError(
          'Gemini API quota exceeded or rate limit hit',
          'GEMINI_QUOTA_EXCEEDED',
          'rendering',
          error
        );
      }

      if (error.message.includes('safety') || error.message.includes('blocked')) {
        throw new GhostPipelineError(
          'Content blocked by Gemini safety filters',
          'CONTENT_BLOCKED',
          'rendering',
          error
        );
      }
    }

    throw new GhostPipelineError(
      `Ghost mannequin generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'RENDERING_FAILED',
      'rendering',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Enhanced ghost mannequin generation with custom prompting based on analysis
 * @param flatlayImage - Clean flatlay image
 * @param analysis - Structured garment analysis
 * @param onModelImage - Optional on-model reference
 * @returns Promise with detailed rendering result
 */
export async function generateEnhancedGhostMannequin(
  flatlayImage: string,
  analysis: AnalysisJSON,
  onModelImage?: string
): Promise<GhostMannequinResult> {
  // Create a more detailed prompt based on the analysis
  const enhancedPrompt = createEnhancedPrompt(analysis);
  
  // This would use the enhanced prompt with the generation logic
  // For now, we'll call the base function
  return generateGhostMannequin(flatlayImage, analysis, onModelImage);
}

/**
 * Create an enhanced prompt based on garment analysis
 * @param analysis - Structured garment analysis
 * @returns string - Enhanced prompt for ghost mannequin generation
 */
function createEnhancedPrompt(analysis: AnalysisJSON): string {
  let prompt = GHOST_MANNEQUIN_PROMPT + "\n\nSpecific Instructions:\n";
  
  // Add garment-specific instructions
  const { construction_details, special_handling } = analysis;
  
  if (construction_details.garment_type === 'shirt' || construction_details.garment_type === 'top') {
    prompt += "- Ensure the torso area maintains proper shirt structure with natural chest and shoulder shaping.\n";
  }
  
  if (construction_details.sleeve_type && construction_details.sleeve_type !== 'sleeveless') {
    prompt += `- The ${construction_details.sleeve_type} sleeves should appear naturally positioned as if on arms.\n`;
  }
  
  if (special_handling.requires_structure) {
    prompt += "- Pay extra attention to maintaining the garment's structural integrity and shape.\n";
  }
  
  if (special_handling.complex_draping) {
    prompt += "- Carefully preserve the natural draping and flow of the fabric.\n";
  }
  
  if (special_handling.embellishments) {
    prompt += "- Ensure all embellishments, sequins, or decorative elements are clearly visible and well-defined.\n";
  }
  
  if (analysis.labels_found.length > 0) {
    prompt += `- Preserve these visible labels/text: ${analysis.labels_found.join(', ')}\n`;
  }
  
  return prompt;
}

/**
 * Validate Gemini API configuration
 * @returns Promise<boolean> - true if API is accessible
 */
export async function validateGeminiApi(): Promise<boolean> {
  if (!genAI) {
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    const result = await model.generateContent("Hello");
    return !!result.response;
  } catch {
    return false;
  }
}

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { 
  GhostMannequinResult,
  GhostPipelineError,
} from "@/types/ghost";
import type { ConsolidationOutput } from './consolidation';
import { generateDynamicPrompt, configurePromptGenerator } from './prompt-generator';

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;

export function configureAiStudioClient(apiKey: string): void {
  genAI = new GoogleGenerativeAI(apiKey);
  // Also configure the prompt generator
  configurePromptGenerator(apiKey);
}

/**
 * Convert image URL or base64 to base64 data for AI Studio
 * @param imageInput - URL or base64 string
 * @returns Promise<string> - base64 data
 */
async function prepareImageForAiStudio(imageInput: string): Promise<string> {
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
        'rendering',
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
 * Generate ghost mannequin image using AI Studio (Gemini 2.5 Flash) with complete payload integration
 * @param flatlayImage - Clean flatlay image (base64 or URL)
 * @param consolidation - Complete consolidation output with FactsV3 and ControlBlock
 * @param originalImage - Optional on-model reference image
 * @param sessionId - Session ID for tracking
 * @returns Promise with rendered image URL and processing time
 */
export async function generateGhostMannequinWithAiStudio(
  flatlayImage: string,
  consolidation: ConsolidationOutput,
  originalImage?: string,
  sessionId?: string
): Promise<GhostMannequinResult> {
  const startTime = Date.now();
  
  if (!genAI) {
    throw new GhostPipelineError(
      'AI Studio client not configured. Call configureAiStudioClient first.',
      'CLIENT_NOT_CONFIGURED',
      'rendering'
    );
  }

  try {
    console.log('🎯 Starting AI Studio ghost mannequin generation...');
    console.log(`📊 FactsV3 fields: ${Object.keys(consolidation.facts_v3).length}`);
    console.log(`📝 ControlBlock fields: ${Object.keys(consolidation.control_block).length}`);
    
    // Step 1: Generate dynamic prompt using FactsV3 and ControlBlock data
    console.log('🔄 Generating dynamic prompt...');
    const promptResult = await generateDynamicPrompt(
      consolidation.facts_v3,
      consolidation.control_block,
      sessionId || 'ai-studio-gen'
    );
    
    console.log(`✅ Dynamic prompt generated in ${promptResult.processingTime}ms`);
    console.log(`📏 Prompt length: ${promptResult.prompt.length} characters`);
    console.log('🔍 Prompt preview:', promptResult.prompt.substring(0, 200) + '...');

    // Step 2: Configure Gemini 2.5 Flash Image model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        temperature: 0.05, // Very low temperature for consistent results
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Step 3: Prepare images
    console.log('🖼️ Preparing images for AI Studio...');
    const flatlayData = await prepareImageForAiStudio(flatlayImage);
    const flatlayMimeType = getImageMimeType(flatlayImage);
    
    // Build content parts for generation
    const contentParts: any[] = [
      {
        text: promptResult.prompt,
      },
      {
        text: "Primary Image (Detail Source - Main visual reference for colors, patterns, and construction):",
      },
      {
        inlineData: {
          data: flatlayData,
          mimeType: flatlayMimeType,
        },
      },
    ];

    // Add original image if provided (Shape Reference)
    if (originalImage) {
      console.log('📸 Adding shape reference image...');
      const originalData = await prepareImageForAiStudio(originalImage);
      const originalMimeType = getImageMimeType(originalImage);
      
      contentParts.splice(1, 0, {
        text: "Shape Reference (For proportions and fit - visual details come from Primary Image):",
      });
      contentParts.splice(2, 0, {
        inlineData: {
          data: originalData,
          mimeType: originalMimeType,
        },
      });
    }

    console.log(`🚀 Calling AI Studio with ${contentParts.length} content parts...`);
    
    // Step 4: Generate the ghost mannequin image
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    
    console.log('✅ AI Studio generation completed!');
    
    // Step 5: Extract generated image from response
    let renderUrl: string;
    
    // Check if response contains generated images
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        console.log(`📦 Found ${candidate.content.parts.length} content parts in response`);
        
        // Look for inline image data
        const imagePart = candidate.content.parts.find(part => 
          part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')
        );
        
        if (imagePart && imagePart.inlineData) {
          console.log('🎨 Generated image found! Processing...');
          
          // Convert base64 image to data URL
          const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
          
          // Upload to FAL storage for permanent URL
          console.log('☁️ Uploading to FAL storage...');
          const { uploadImageToFalStorage } = await import('./fal');
          renderUrl = await uploadImageToFalStorage(imageDataUrl);
          
          console.log('✅ Generated image uploaded to FAL storage:', renderUrl);
        } else {
          console.warn('⚠️ No generated image found in AI Studio response');
          throw new GhostPipelineError(
            'AI Studio did not generate an image',
            'RENDERING_FAILED',
            'rendering'
          );
        }
      } else {
        console.warn('⚠️ No content found in AI Studio response');
        throw new GhostPipelineError(
          'AI Studio response contains no content',
          'RENDERING_FAILED',
          'rendering'
        );
      }
    } else {
      console.warn('⚠️ No candidates found in AI Studio response');
      throw new GhostPipelineError(
        'AI Studio response contains no candidates',
        'RENDERING_FAILED',
        'rendering'
      );
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`🎯 AI Studio ghost mannequin generation completed in ${processingTime}ms`);
    
    return {
      renderUrl,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ AI Studio ghost mannequin generation failed:', error);
    
    // Re-throw if already a GhostPipelineError
    if (error instanceof GhostPipelineError) {
      throw error;
    }
    
    // Handle AI Studio-specific errors
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new GhostPipelineError(
          'AI Studio API quota exceeded or rate limit hit',
          'GEMINI_QUOTA_EXCEEDED',
          'rendering',
          error
        );
      }

      if (error.message.includes('safety') || error.message.includes('blocked')) {
        throw new GhostPipelineError(
          'Content blocked by AI Studio safety filters',
          'CONTENT_BLOCKED',
          'rendering',
          error
        );
      }
    }

    throw new GhostPipelineError(
      `AI Studio ghost mannequin generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'RENDERING_FAILED',
      'rendering',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Alternative generation method with simplified prompt (fallback)
 * @param flatlayImage - Clean flatlay image
 * @param consolidation - Consolidation output
 * @param originalImage - Optional on-model reference
 * @param sessionId - Session ID
 */
export async function generateGhostMannequinWithAiStudioSimple(
  flatlayImage: string,
  consolidation: ConsolidationOutput,
  originalImage?: string,
  sessionId?: string
): Promise<GhostMannequinResult> {
  const startTime = Date.now();
  
  if (!genAI) {
    throw new GhostPipelineError(
      'AI Studio client not configured. Call configureAiStudioClient first.',
      'CLIENT_NOT_CONFIGURED',
      'rendering'
    );
  }

  try {
    console.log('🎯 Starting AI Studio simple ghost mannequin generation...');
    
    // Use a simplified but effective prompt
    const simplePrompt = `Create professional e-commerce ghost mannequin photography showing a ${consolidation.control_block.category_generic || 'garment'} with perfect dimensional form against a pristine white studio background. 

This is invisible mannequin product photography where the garment displays natural fit and drape with no visible person, mannequin, or model. The garment appears filled with invisible human form, showing realistic volume and structure.

Colors: ${consolidation.facts_v3.palette?.dominant_hex || '#CCCCCC'} (primary), ${consolidation.facts_v3.palette?.accent_hex || '#CCCCCC'} (accent)
Material: ${consolidation.facts_v3.material || 'fabric'} with ${consolidation.facts_v3.surface_sheen || 'matte'} finish
Construction: ${consolidation.facts_v3.required_components?.join(', ') || 'standard construction'}

The ghost mannequin effect creates perfect e-commerce presentation - the garment floats naturally with proper dimensional form, displaying how the fabric moves and falls when worn, but with complete transparency of any supporting structure.

Preserve every original color, pattern, and design element exactly as shown in the reference image. Maintain any visible brand labels, care labels, or text elements with perfect clarity and readability.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        temperature: 0.1,
      },
    });

    // Prepare image
    const flatlayData = await prepareImageForAiStudio(flatlayImage);
    const flatlayMimeType = getImageMimeType(flatlayImage);
    
    const contentParts: any[] = [
      { text: simplePrompt },
      {
        inlineData: {
          data: flatlayData,
          mimeType: flatlayMimeType,
        },
      },
    ];

    if (originalImage) {
      const originalData = await prepareImageForAiStudio(originalImage);
      const originalMimeType = getImageMimeType(originalImage);
      contentParts.push({
        inlineData: {
          data: originalData,
          mimeType: originalMimeType,
        },
      });
    }

    const result = await model.generateContent(contentParts);
    const response = await result.response;
    
    // Extract image (same logic as main function)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      const imagePart = candidates[0].content.parts.find(part => 
        part.inlineData?.mimeType?.startsWith('image/')
      );
      
      if (imagePart?.inlineData) {
        const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        const { uploadImageToFalStorage } = await import('./fal');
        const renderUrl = await uploadImageToFalStorage(imageDataUrl);
        
        return {
          renderUrl,
          processingTime: Date.now() - startTime,
        };
      }
    }
    
    throw new GhostPipelineError(
      'AI Studio simple generation failed to produce image',
      'RENDERING_FAILED',
      'rendering'
    );

  } catch (error) {
    console.error('❌ AI Studio simple generation failed:', error);
    throw error instanceof GhostPipelineError ? error : new GhostPipelineError(
      `AI Studio simple generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'RENDERING_FAILED',
      'rendering',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Health check for AI Studio integration
 */
export async function checkAiStudioHealth(): Promise<{ status: string; message: string }> {
  if (!genAI) {
    return {
      status: 'error',
      message: 'AI Studio client not configured'
    };
  }

  try {
    // Test with a simple generation request
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    const testResult = await model.generateContent("Generate a simple test image of a red circle on white background");
    
    if (testResult.response) {
      return {
        status: 'healthy',
        message: 'AI Studio client is accessible and functional'
      };
    } else {
      return {
        status: 'warning',
        message: 'AI Studio client accessible but no response received'
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `AI Studio health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get AI Studio client status and configuration
 */
export function getAiStudioStatus(): {
  configured: boolean;
  model: string;
  capabilities: string[];
} {
  return {
    configured: !!genAI,
    model: 'gemini-2.5-flash-image-preview',
    capabilities: [
      'Image Generation',
      'Multi-modal Input (Text + Images)',
      'Dynamic Prompt Integration',
      'FactsV3 Consolidation Support',
      'Professional Ghost Mannequin Generation'
    ]
  };
}
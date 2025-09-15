import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  AnalysisJSON, 
  AnalysisJSONSchema,
  AnalysisJSONSchemaObject,
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
 * @param sessionId - Session ID for tracking
 * @returns Promise with structured analysis and processing time
 */
export async function analyzeGarment(imageUrl: string, sessionId: string): Promise<GarmentAnalysisResult> {
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

    // Try structured output first, with fallback to unstructured if it fails
    let analysis: AnalysisJSON;
    let processingTime: number;

    try {
      const result = await analyzeWithStructuredOutput(imageUrl, sessionId);
      analysis = result.analysis;
      processingTime = result.processingTime;
    } catch (structuredError) {
      console.warn('Structured output failed, falling back to unstructured analysis:', structuredError);
      const result = await analyzeWithFallbackMode(imageUrl, sessionId);
      analysis = result.analysis;
      processingTime = result.processingTime;
    }

    console.log(`Garment analysis completed in ${processingTime}ms`);

    return {
      analysis,
      processingTime: Date.now() - startTime,
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
 * Try analysis with structured output (responseSchema)
 */
async function analyzeWithStructuredOutput(imageUrl: string, sessionId: string): Promise<{ analysis: AnalysisJSON, processingTime: number }> {
  const startTime = Date.now();
  
  console.log('Attempting structured output analysis...');
  
  // Get the Gemini Pro model with structured output
  const model = genAI!.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: AnalysisJSONSchemaObject,
    },
  });

  // Prepare image data
  const imageData = await prepareImageForGemini(imageUrl);
  const mimeType = getImageMimeType(imageUrl);

  // Create the prompt with session context and image
  const enhancedPrompt = `${ANALYSIS_PROMPT}

Session ID: ${sessionId}
Ensure the response includes this session ID in the meta.session_id field.

IMPORTANT: Return a valid JSON response that exactly matches the specified schema structure.`;
  
  const result = await model.generateContent([
    {
      text: enhancedPrompt,
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
    throw new Error('Empty response from Gemini Pro structured analysis');
  }

  // Parse and validate the JSON response
  const parsedResponse = JSON.parse(responseText);
  const analysis = AnalysisJSONSchema.parse(parsedResponse);
  
  return {
    analysis,
    processingTime: Date.now() - startTime
  };
}

/**
 * Fallback analysis without structured output constraints
 */
async function analyzeWithFallbackMode(imageUrl: string, sessionId: string): Promise<{ analysis: AnalysisJSON, processingTime: number }> {
  const startTime = Date.now();
  
  console.log('Attempting fallback analysis without structured output...');
  
  // Get the Gemini Pro model without structured output constraints
  const model = genAI!.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      // No responseSchema - let Gemini generate freely
    },
  });

  // Prepare image data
  const imageData = await prepareImageForGemini(imageUrl);
  const mimeType = getImageMimeType(imageUrl);

  // Simplified prompt for fallback
  const fallbackPrompt = `Analyze this garment image and return a JSON response with the following structure:

{
  "type": "garment_analysis",
  "meta": {
    "schema_version": "4.1",
    "session_id": "${sessionId}"
  },
  "labels_found": [],
  "preserve_details": [
    {
      "element": "description of detail",
      "priority": "critical|important|nice_to_have",
      "notes": "preservation notes"
    }
  ]
}

Analyze the garment for important details that need to be preserved during ghost mannequin processing. Focus on:
1. Any visible labels, tags, or text
2. Important construction details like seams, hems, collars
3. Texture and material characteristics

Return only valid JSON.`;
  
  const result = await model.generateContent([
    {
      text: fallbackPrompt,
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
    throw new Error('Empty response from Gemini Pro fallback analysis');
  }

  // Parse JSON and create a minimal valid analysis
  let parsedResponse: any;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (parseError) {
    // If JSON parsing fails, create a minimal fallback
    parsedResponse = createMinimalAnalysis(sessionId);
  }

  // Ensure the response has required fields
  const validatedResponse = ensureRequiredFields(parsedResponse, sessionId);
  
  // Validate against schema
  const analysis = AnalysisJSONSchema.parse(validatedResponse);
  
  return {
    analysis,
    processingTime: Date.now() - startTime
  };
}

/**
 * Create a minimal valid analysis when all else fails
 */
function createMinimalAnalysis(sessionId: string): any {
  return {
    type: "garment_analysis",
    meta: {
      schema_version: "4.1",
      session_id: sessionId
    },
    labels_found: [],
    preserve_details: [
      {
        element: "garment structure",
        priority: "important",
        notes: "Preserve overall garment shape and proportions"
      }
    ]
  };
}

/**
 * Ensure response has all required fields for schema validation
 */
function ensureRequiredFields(response: any, sessionId: string): any {
  return {
    type: response.type || "garment_analysis",
    meta: {
      schema_version: response.meta?.schema_version || "4.1",
      session_id: response.meta?.session_id || sessionId
    },
    labels_found: Array.isArray(response.labels_found) ? response.labels_found : [],
    preserve_details: Array.isArray(response.preserve_details) ? response.preserve_details : [
      {
        element: "garment structure",
        priority: "important",
        notes: "Preserve overall garment shape and proportions"
      }
    ],
    hollow_regions: response.hollow_regions,
    construction_details: response.construction_details,
    image_b_priority: response.image_b_priority,
    special_handling: response.special_handling
  };
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
  originalImage?: string
): Promise<GhostMannequinResult> {
  const startTime = Date.now();
  let analysisFilePath: string | null = null;
  let fs: any;

  if (!genAI) {
    throw new GhostPipelineError(
      'Gemini client not configured. Call configureGeminiClient first.',
      'CLIENT_NOT_CONFIGURED',
      'rendering'
    );
  }

  try {
    console.log('Starting ghost mannequin generation with Gemini Flash...');

    // Get Gemini 2.5 Flash Image Preview for image generation
    // This model specifically supports image generation capabilities
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        temperature: 0.05, // Very low temperature for precise, consistent generation
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE', // Per docs: BLOCK_NONE is default for newer models
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH', 
          threshold: 'BLOCK_NONE', // Per docs: BLOCK_NONE is default for newer models
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE', // Per docs: BLOCK_NONE is default for newer models
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE', // Per docs: BLOCK_NONE is default for newer models
        },
        {
          category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
          threshold: 'BLOCK_NONE', // Per docs: BLOCK_NONE is default for newer models
        },
      ],
    });

    // Prepare images
    const flatlayData = await prepareImageForGemini(flatlayImage);
    const flatlayMimeType = getImageMimeType(flatlayImage);
    
    // Create temporary JSON file with analysis data
    fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const analysisFileName = `analysis_${Date.now()}.json`;
    analysisFilePath = path.join(tempDir, analysisFileName);
    
    // Write complete JSON analysis to temporary file
    await fs.writeFile(analysisFilePath, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`Created analysis JSON file: ${analysisFilePath}`);
    
    // Read the JSON file as text content to send to Gemini
    const analysisJsonContent = await fs.readFile(analysisFilePath, 'utf-8');
    const analysisJsonBase64 = Buffer.from(analysisJsonContent, 'utf-8').toString('base64');
    
    // Your comprehensive ghost mannequin prompt
    const imageGenPrompt = `Create a professional three-dimensional ghost mannequin photograph for e-commerce product display, transforming flat garment images into a dimensional presentation that shows how the clothing would appear when worn by an invisible person.

## DETAILED SCENE NARRATIVE:

Imagine a high-end photography studio with perfect white cyclorama background and professional lighting equipment. In the center of this space, a garment floats in three-dimensional space, filled with the volume and shape of an invisible human body. The fabric drapes naturally with realistic weight and movement, showing natural creases and folds exactly as clothing would appear on a person. The garment maintains its authentic colors and patterns while displaying proper fit and dimensional form. This is captured with studio-quality photography equipment using an 85mm portrait lens with even, shadow-free lighting.

## MULTI-IMAGE COMPOSITION AUTHORITY:

**Image B (Detail Source)** - This is your primary visual reference containing the absolute truth for all colors, patterns, textures, construction details, and material properties. Copy these elements with complete fidelity.

**JSON Analysis Data** - Contains mandatory preservation rules for specific elements, their coordinates, and structural requirements that must be followed exactly.

**Image A (Model Reference)** - Use only for understanding basic proportions and spatial relationships; all visual details should come from Image B.

## STEP-BY-STEP CONSTRUCTION PROCESS:

**First, establish the invisible body framework:** Create a three-dimensional human torso form with natural anatomical proportions - realistic shoulder width spanning approximately 18 inches, natural chest projection forward from the spine, gradual waist taper, and proper arm positioning with slight outward angle from the body. This invisible form should suggest a person of average build standing in a relaxed, professional pose.

**Second, map the garment onto this form:** Take the exact visual information from Image B - every color, pattern element, texture detail, and construction feature - and wrap it seamlessly around the three-dimensional body form. Maintain perfect color fidelity using the precise hues visible in Image B. Preserve all pattern continuity and directional flow exactly as shown in the detail image.

**Third, create natural hollow openings:** Generate clean, realistic openings where human body parts would be - a natural neck opening showing the interior construction without adding invented elements, armhole openings that reveal the garment's internal structure only if visible in Image B, and for open-front garments like kimonos or cardigans, maintain the front opening exactly as designed without artificially closing it.

**Fourth, apply JSON preservation requirements:** Locate each element marked with "critical" priority in the JSON data and ensure it appears sharp and clearly readable within its specified bounding box coordinates. For elements marked "preserve: true" in labels_found, maintain perfect legibility without repainting or altering the text. Follow any construction_details rules for structural requirements like maintaining wide sleeves or open fronts.

**Finally, perfect the dimensional presentation:** Ensure the garment displays realistic fabric physics with natural drape, appropriate weight, and authentic material behavior. The final result should show perfect bilateral symmetry while maintaining the organic quality of how fabric naturally falls and moves.

## TECHNICAL PHOTOGRAPHY SPECIFICATIONS:

Capture this scene using professional product photography standards: pure white seamless background achieving perfect #FFFFFF color value, high-key studio lighting with multiple soft sources eliminating all shadows and hot spots, tack-sharp focus throughout the entire garment with no depth-of-field blur, high resolution suitable for detailed e-commerce viewing, and flawless color accuracy matching the source materials.

## CONSTRUCTION GUIDELINES FOR DIFFERENT GARMENT TYPES:

For upper body garments like shirts and jackets, emphasize proper shoulder structure and natural sleeve hang. For dresses and full-length pieces, show realistic torso-to-hem proportions with natural fabric flow. For outerwear, display appropriate volume and structure while showing closure details clearly. For open-front styles like kimonos, cardigans, or jackets, never artificially close the front opening - maintain the designed silhouette exactly.

## HOLLOW REGION HANDLING:

Create authentic empty spaces at neck and armhole openings. If Image B shows visible interior fabric, lining, or construction details, reproduce these exactly. If no interior details are visible in Image B, leave these areas as clean hollow space with no invented content - no skin tones, undershirts, generic gray fill, or artificial inner surfaces.

## DETAIL FIDELITY REQUIREMENTS:

Maintain razor-sharp clarity for all brand logos, text elements, decorative details, hardware components like buttons or zippers, stitching patterns, and trim elements. Preserve the exact spatial relationships and proportions of these details as they appear in Image B. For labels and text marked as critical in the JSON, ensure perfect legibility within their specified coordinate boundaries.

## QUALITY VALIDATION CRITERIA:

The final image must demonstrate three-dimensional volume rather than flat arrangement, show realistic fabric drape and weight, maintain absolute color accuracy to Image B, preserve all JSON-specified critical elements in sharp detail, present professional e-commerce photography quality, display perfect structural accuracy for the garment type, and create an authentic ghost mannequin effect suitable for online retail presentation.

Generate this professional three-dimensional ghost mannequin product photograph with complete attention to these comprehensive specifications.`;
    
    const contentParts: any[] = [
      {
        text: imageGenPrompt,
      },
      {
        text: "analysis.json (JSON Analysis Data):",
      },
      {
        inlineData: {
          data: analysisJsonBase64,
          mimeType: 'application/json',
        },
      },
      {
        text: "Image B (Detail Source - Primary visual reference):",
      },
      {
        inlineData: {
          data: flatlayData,
          mimeType: flatlayMimeType,
        },
      },
    ];

    // Add original image if provided (Image A)
    if (originalImage) {
      const originalData = await prepareImageForGemini(originalImage);
      const originalMimeType = getImageMimeType(originalImage);
      
      // Insert Image A before Image B
      contentParts.splice(1, 0, {
        text: "Image A (Shape Reference - For proportions and spatial relationships):",
      });
      contentParts.splice(2, 0, {
        inlineData: {
          data: originalData,
          mimeType: originalMimeType,
        },
      });
    }

    // Generate the ghost mannequin image using Gemini 2.5 Flash
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    
    console.log('Gemini 2.5 Flash completed generation...');
    
    // Debug: Log the complete response with safety ratings
    console.log('Full Gemini response (first 1500 chars):', JSON.stringify(response, null, 2).substring(0, 1500));
    
    // Check for prompt feedback and safety ratings
    if (response.promptFeedback) {
      console.log('Prompt feedback:', JSON.stringify(response.promptFeedback, null, 2));
      if (response.promptFeedback.blockReason) {
        console.error('Prompt blocked reason:', response.promptFeedback.blockReason);
      }
      if (response.promptFeedback.safetyRatings) {
        console.log('Safety ratings:', JSON.stringify(response.promptFeedback.safetyRatings, null, 2));
      }
    }
    
    // Check candidate safety ratings
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.safetyRatings) {
        console.log('Candidate safety ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      }
      if (candidate.finishReason === 'PROHIBITED_CONTENT') {
        console.log('Content was blocked due to safety filters');
      }
    }
    
    // Also try to get text response to see what Gemini actually returns
    try {
      const textResponse = response.text();
      console.log('Text response from Gemini:', textResponse.substring(0, 500));
    } catch (textError) {
      console.log('No text response available:', textError.message);
    }
    
    // Extract generated image from response
    let renderUrl: string;
    
    // Check if response contains generated images
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];
      console.log('Candidate content:', candidate.content ? 'present' : 'missing');
      if (candidate.content && candidate.content.parts) {
        console.log('Parts found:', candidate.content.parts.length);
        candidate.content.parts.forEach((part, index) => {
          console.log(`Part ${index}:`, {
            hasText: !!part.text,
            hasInlineData: !!part.inlineData,
            mimeType: part.inlineData?.mimeType
          });
        });
        // Look for inline data (generated images)
        const imagePart = candidate.content.parts.find(part => 
          part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')
        );
        
        if (imagePart && imagePart.inlineData) {
          console.log('Generated image found in response, uploading to FAL storage...');
          
          // Convert base64 image to data URL
          const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
          
          // Upload to FAL storage for permanent URL using existing FAL integration
          const { uploadImageToFalStorage } = await import('./fal');
          renderUrl = await uploadImageToFalStorage(imageDataUrl);
          
          console.log('Generated ghost mannequin image uploaded successfully:', renderUrl);
        } else {
          console.warn('No generated image found in response, using fallback...');
          renderUrl = await generateFallbackGhostMannequin(flatlayImage, analysis);
        }
      } else {
        console.warn('No content found in response, using fallback...');
        renderUrl = await generateFallbackGhostMannequin(flatlayImage, analysis);
      }
    } else {
      console.warn('No candidates found in response, using fallback...');
      renderUrl = await generateFallbackGhostMannequin(flatlayImage, analysis);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Ghost mannequin generation completed in ${processingTime}ms`);
    
    // Cleanup temporary JSON file
    if (analysisFilePath && fs) {
      try {
        await fs.unlink(analysisFilePath);
        console.log(`Cleaned up temporary analysis file: ${analysisFilePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temporary file ${analysisFilePath}:`, cleanupError);
      }
    }

    return {
      renderUrl,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Ghost mannequin generation failed:', error);
    
    // Cleanup temporary JSON file on error
    if (analysisFilePath && fs) {
      try {
        await fs.unlink(analysisFilePath);
        console.log(`Cleaned up temporary analysis file after error: ${analysisFilePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temporary file on error ${analysisFilePath}:`, cleanupError);
      }
    }

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
  let prompt = GHOST_MANNEQUIN_PROMPT + "\n\n## ANALYSIS-SPECIFIC REQUIREMENTS:\n\n";
  
  // Add critical label preservation from JSON analysis
  if (analysis.labels_found && analysis.labels_found.length > 0) {
    const criticalLabels = analysis.labels_found.filter(label => label.preserve && label.readable);
    if (criticalLabels.length > 0) {
      prompt += "**CRITICAL LABEL PRESERVATION:**\n";
      criticalLabels.forEach(label => {
        if (label.bbox_norm && label.bbox_norm.length === 4) {
          prompt += `- Preserve "${label.text || label.type}" at coordinates [${label.bbox_norm.join(', ')}] with perfect legibility\n`;
        } else {
          prompt += `- Preserve ${label.type} label "${label.text || ''}" at ${label.location} with perfect legibility\n`;
        }
      });
      prompt += "\n";
    }
  }
  
  // Add critical detail preservation
  if (analysis.preserve_details && analysis.preserve_details.length > 0) {
    const criticalDetails = analysis.preserve_details.filter(detail => detail.priority === 'critical');
    if (criticalDetails.length > 0) {
      prompt += "**CRITICAL DETAIL PRESERVATION:**\n";
      criticalDetails.forEach(detail => {
        if (detail.region_bbox_norm && detail.region_bbox_norm.length === 4) {
          prompt += `- Preserve "${detail.element}" at coordinates [${detail.region_bbox_norm.join(', ')}] - ${detail.notes || ''}\n`;
        } else {
          prompt += `- Preserve "${detail.element}" at ${detail.location || 'specified location'} - ${detail.notes || ''}\n`;
        }
        if (detail.material_notes) {
          prompt += `  Material: ${detail.material_notes}\n`;
        }
      });
      prompt += "\n";
    }
  }
  
  // Add hollow region specific instructions
  if (analysis.hollow_regions && analysis.hollow_regions.length > 0) {
    prompt += "**HOLLOW REGION REQUIREMENTS:**\n";
    analysis.hollow_regions.forEach(region => {
      if (region.keep_hollow) {
        prompt += `- Keep ${region.region_type} hollow as specified\n`;
        if (region.inner_visible && region.inner_description) {
          prompt += `  Inner details: ${region.inner_description}\n`;
        }
        if (region.edge_sampling_notes) {
          prompt += `  Edge handling: ${region.edge_sampling_notes}\n`;
        }
      }
    });
    prompt += "\n";
  }
  
  // Add construction-specific requirements
  if (analysis.construction_details && analysis.construction_details.length > 0) {
    prompt += "**CONSTRUCTION REQUIREMENTS:**\n";
    analysis.construction_details.forEach(detail => {
      if (detail.critical_for_structure) {
        prompt += `- CRITICAL: ${detail.feature} - ${detail.silhouette_rule}\n`;
      } else {
        prompt += `- ${detail.feature} - ${detail.silhouette_rule}\n`;
      }
    });
    prompt += "\n";
  }
  
  // Add special handling instructions
  if (analysis.special_handling) {
    prompt += `**SPECIAL HANDLING:** ${analysis.special_handling}\n\n`;
  }
  
  // Add image priority settings
  if (analysis.image_b_priority) {
    prompt += "**IMAGE PROCESSING PRIORITY:**\n";
    if (analysis.image_b_priority.is_ground_truth) {
      prompt += "- Image B is ground truth for all visual details\n";
    }
    if (analysis.image_b_priority.edge_fidelity_required) {
      prompt += "- Maintain exact edge fidelity from source\n";
    }
    if (analysis.image_b_priority.color_authority) {
      prompt += "- Image B colors are authoritative - match exactly\n";
    }
    if (analysis.image_b_priority.print_direction_notes) {
      prompt += `- Print direction: ${analysis.image_b_priority.print_direction_notes}\n`;
    }
    prompt += "\n";
  }
  
  prompt += "Follow these analysis-derived requirements with absolute precision while maintaining the professional ghost mannequin photography standards specified above.";
  
  return prompt;
}

/**
 * Fallback ghost mannequin generation when Gemini image generation fails
 */
async function generateFallbackGhostMannequin(flatlayImage: string, analysis: AnalysisJSON): Promise<string> {
  console.log('Using fallback ghost mannequin generation...');
  
  // For now, return the cleaned flatlay image as fallback
  // In a production system, you might integrate with other image generation services
  // like DALL-E, Midjourney, or Stable Diffusion here
  
  return flatlayImage; // Return the cleaned background-removed image
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

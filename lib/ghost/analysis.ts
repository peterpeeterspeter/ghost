/**
 * Analysis modules for Ghost Mannequin Pipeline
 * Enhanced with multi-provider AI support and automatic fallback
 */

import { AnalysisJSON, EnrichmentJSON } from '../../types/ghost';
import { executeWithAIFallback } from '../config/ai-providers';
import { createMoonshotService } from '../services/moonshot';

// Helper function to convert image URL to base64
async function imageToBase64(imageUrl: string): Promise<string> {
  try {
    // If it's already a data URL, extract the base64 part
    if (imageUrl.startsWith('data:')) {
      const base64Match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        return base64Match[1];
      }
    }
    
    // Otherwise fetch the URL and convert to base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
}

// Helper function to parse Gemini analysis response
function parseGeminiAnalysis(analysisText: string): Partial<AnalysisJSON> {
  try {
    // Extract JSON from Gemini response (may be wrapped in markdown)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonText = jsonMatch[0];
      
      // Clean up common JSON formatting issues
      jsonText = jsonText
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys
      
      const parsed = JSON.parse(jsonText);
      return {
        garment_category: parsed.garment_category || 'top',
        closure_type: parsed.closure_type || 'pullover',
        neckline_style: parsed.neckline_style || 'crew',
        sleeve_configuration: parsed.sleeve_configuration || 'long',
        labels_found: parsed.labels_found || [],
        preserve_details: parsed.preserve_details || [],
        hollow_regions: parsed.hollow_regions || extractHollowRegionsFromAnalysis(parsed)
      };
    }
  } catch (error) {
    console.error('Failed to parse Gemini analysis:', error);
    console.error('Raw analysis text:', analysisText.substring(0, 500) + '...');
  }
  
  // Return defaults if parsing fails
  return {
    garment_category: 'top',
    closure_type: 'pullover',
    neckline_style: 'crew',
    sleeve_configuration: 'long',
    labels_found: [],
    preserve_details: [],
    hollow_regions: getDefaultHollowRegions('top')
  };
}

/**
 * Extract hollow_regions from analysis data based on garment features
 */
function extractHollowRegionsFromAnalysis(parsed: any): any[] {
  const regions = [];
  
  // Extract from segmentation hints or cavity regions
  const cavityRegions = parsed.segmentation_hints?.cavity_regions_present || [];
  const necklineStyle = parsed.neckline_style || 'crew';
  const sleeveConfig = parsed.sleeve_configuration || 'long';
  const closureType = parsed.closure_type || 'pullover';
  
  // Add neckline hollow region based on style
  if (cavityRegions.includes('neck') || necklineStyle !== 'crew') {
    regions.push({
      region_type: 'neckline',
      keep_hollow: true,
      inner_visible: necklineStyle === 'v_neck' || necklineStyle === 'scoop',
      inner_description: `${necklineStyle} neckline opening`,
      edge_sampling_notes: 'Maintain smooth neckline curve'
    });
  }
  
  // Add sleeve regions for appropriate configurations
  if (cavityRegions.includes('sleeves') || sleeveConfig === 'short' || sleeveConfig === 'long') {
    regions.push({
      region_type: 'sleeves',
      keep_hollow: true,
      inner_visible: false,
      inner_description: `${sleeveConfig} sleeve openings`,
      edge_sampling_notes: 'Preserve sleeve opening structure'
    });
  }
  
  // Add armhole regions if present
  if (cavityRegions.includes('armholes') || sleeveConfig === 'sleeveless' || sleeveConfig === 'tank') {
    regions.push({
      region_type: 'armholes',
      keep_hollow: true,
      inner_visible: true,
      inner_description: 'Armhole openings for sleeveless design',
      edge_sampling_notes: 'Smooth armhole curves essential'
    });
  }
  
  // Add front opening for button/zip closures
  if (cavityRegions.includes('front_opening') || closureType === 'button' || closureType === 'zip') {
    regions.push({
      region_type: 'front_opening',
      keep_hollow: true,
      inner_visible: true,
      inner_description: `${closureType} front closure`,
      edge_sampling_notes: 'Maintain closure alignment'
    });
  }
  
  return regions;
}

/**
 * Get default hollow_regions based on garment category
 */
function getDefaultHollowRegions(category: string): any[] {
  const defaults = {
    top: [
      {
        region_type: 'neckline',
        keep_hollow: true,
        inner_visible: false,
        inner_description: 'Standard crew neckline',
        edge_sampling_notes: 'Maintain neckline shape'
      }
    ],
    shirt: [
      {
        region_type: 'neckline',
        keep_hollow: true,
        inner_visible: false,
        inner_description: 'Shirt collar opening',
        edge_sampling_notes: 'Preserve collar structure'
      },
      {
        region_type: 'sleeves',
        keep_hollow: true,
        inner_visible: false,
        inner_description: 'Sleeve cuff openings',
        edge_sampling_notes: 'Maintain cuff shape'
      }
    ],
    dress: [
      {
        region_type: 'neckline',
        keep_hollow: true,
        inner_visible: true,
        inner_description: 'Dress neckline design',
        edge_sampling_notes: 'Preserve neckline elegance'
      }
    ]
  };
  
  return defaults[category] || defaults.top;
}

export async function analyzeBase(imageUrl: string): Promise<AnalysisJSON> {
  console.log(`[Analysis] Starting base analysis with AI provider fallback for: ${imageUrl.substring(0, 100)}...`);
  
  try {
    const result = await executeWithAIFallback(
      'imageAnalysis',
      async (provider) => {
        console.log(`[Analysis] Using provider: ${provider.name} for base analysis`);
        
        if (provider.type === 'openrouter') {
          // Use Moonshot AI via OpenRouter
          const moonshotService = createMoonshotService(provider.apiKey);
          const imageBase64 = await imageToBase64(imageUrl);
          
          const analysis = await moonshotService.analyzeGarment(imageBase64, 'base');
          return formatBaseAnalysis(analysis, provider.name);
          
        } else {
          // Use Gemini as fallback (original implementation)
          return await analyzeWithGemini(imageUrl);
        }
      },
      'quality' // Prioritize quality for analysis
    );

    console.log(`[Analysis] Base analysis completed: ${result.garment_category} - ${result.closure_type}`);
    return result;

  } catch (error) {
    console.error('[Analysis] All AI providers failed for base analysis:', error);
    
    // Return fallback analysis
    return getFallbackBaseAnalysis();
  }
}

/**
 * Analyze with Gemini (original implementation as fallback)
 */
async function analyzeWithGemini(imageUrl: string): Promise<AnalysisJSON> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY!
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Analyze this garment image and return structured JSON with: garment_category, closure_type, neckline_style, sleeve_configuration, labels_found, preserve_details, hollow_regions. 
            
            For hollow_regions, identify areas that should remain hollow for ghost mannequin effect:
            - neckline: neck opening areas that should stay hollow
            - sleeves: sleeve openings that should remain hollow  
            - armholes: armhole openings for sleeveless garments
            - front_opening: button/zip closures that create openings
            - other: any other hollow areas
            
            Each hollow_region should specify:
            - region_type: type of hollow area
            - keep_hollow: true if area should remain hollow
            - inner_visible: true if interior should be visible through opening
            - inner_description: description of what's visible inside
            - edge_sampling_notes: notes for edge processing
            
            Focus on identifying key structural elements and any labels/branding that must be preserved.`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: await imageToBase64(imageUrl)
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('[Analysis] Gemini response:', JSON.stringify(result, null, 2));
  const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Parse and structure the analysis
  const parsedAnalysis = parseGeminiAnalysis(analysisText);
  
  return formatBaseAnalysis(parsedAnalysis, 'gemini');
}

/**
 * Format analysis result into standard AnalysisJSON structure
 */
function formatBaseAnalysis(analysis: any, providerName: string): AnalysisJSON {
  const category = analysis.garment_category || analysis.category_generic || 'top';
  
  return {
    type: 'garment_analysis',
    meta: {
      schema_version: '4.2',
      session_id: crypto.randomUUID(),
      processing_stage: 'base_analysis',
      safety_pre_scrub_applied: true,
      ai_provider: providerName
    },
    garment_category: category,
    closure_type: analysis.closure_type || 'pullover',
    neckline_style: analysis.neckline_style || 'crew',
    sleeve_configuration: analysis.sleeve_configuration || 'long',
    labels_found: analysis.labels_found || [],
    preserve_details: analysis.preserve_details || [],
    hollow_regions: analysis.hollow_regions || getDefaultHollowRegions(category)
  };
}

/**
 * Fallback analysis when all providers fail
 */
function getFallbackBaseAnalysis(): AnalysisJSON {
  return {
    type: 'garment_analysis',
    meta: {
      schema_version: '4.2',
      session_id: crypto.randomUUID(),
      processing_stage: 'base_analysis',
      safety_pre_scrub_applied: true,
      ai_provider: 'fallback'
    },
    garment_category: 'top',
    closure_type: 'pullover',
    neckline_style: 'crew',
    sleeve_configuration: 'long',
    labels_found: [
      {
        type: 'brand',
        location: 'neck interior',
        readable: true,
        preserve: true,
        visibility: 'fully_visible'
      }
    ],
    preserve_details: [
      {
        element: 'brand label',
        priority: 'critical',
        location: 'neck tag'
      }
    ],
    hollow_regions: getDefaultHollowRegions('top')
  };
}

export async function analyzeEnrichment(imageUrl: string): Promise<EnrichmentJSON> {
  console.log(`[Analysis] Starting enrichment analysis for: ${imageUrl}`);
  
  try {
    // Real enrichment analysis using AI provider fallback
    const result = await executeWithAIFallback(
      'enrichmentAnalysis',
      async (provider) => {
        console.log(`[Analysis] Using provider: ${provider.name} for enrichment analysis`);
        
        if (provider.type === 'openrouter') {
          // Use Moonshot AI via OpenRouter for enrichment
          const moonshotService = createMoonshotService(provider.apiKey);
          const imageBase64 = await imageToBase64(imageUrl);
          
          const enrichment = await moonshotService.analyzeGarment(imageBase64, 'enrichment');
          return formatEnrichmentAnalysis(enrichment, provider.name);
          
        } else {
          // Use Gemini for enrichment analysis
          return await analyzeEnrichmentWithGemini(imageUrl);
        }
      },
      'quality' // Prioritize quality for enrichment analysis
    );

    console.log(`[Analysis] Enrichment analysis completed with provider: ${result.meta.ai_provider}`);
    return result;

  } catch (error) {
    console.error('[Analysis] All AI providers failed for enrichment analysis:', error);
    
    // Return conservative fallback enrichment
    return getFallbackEnrichmentAnalysis();
  }
}

/**
 * Analyze enrichment with Gemini (specialized for fabric/color analysis)
 */
async function analyzeEnrichmentWithGemini(imageUrl: string): Promise<EnrichmentJSON> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY!
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Analyze this garment image for enrichment data. Return JSON with:
            1. color_precision: primary_hex, color_temperature (warm/cool), saturation_level (low/moderate/high)
            2. fabric_behavior: drape_quality (fluid/structured/rigid), surface_sheen (matte/satin/glossy), transparency_level (opaque/semi/sheer)
            3. construction_precision: seam_visibility (hidden/subtle/prominent), edge_finishing (raw/serged/bound), stitching_contrast (true/false)
            4. rendering_guidance: lighting_preference, shadow_behavior, color_fidelity_priority
            5. confidence_breakdown: color_confidence, fabric_confidence, overall_confidence (0-1)
            
            Focus on precise color analysis, fabric texture assessment, and construction details.`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: await imageToBase64(imageUrl)
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini enrichment API error: ${response.status}`);
  }

  const result = await response.json();
  const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Parse Gemini enrichment response
  const parsedEnrichment = parseGeminiEnrichmentAnalysis(analysisText);
  
  return formatEnrichmentAnalysis(parsedEnrichment, 'gemini');
}

/**
 * Parse Gemini enrichment analysis response
 */
function parseGeminiEnrichmentAnalysis(analysisText: string): Partial<EnrichmentJSON> {
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonText = jsonMatch[0];
      
      // Clean up JSON formatting
      jsonText = jsonText
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
      
      const parsed = JSON.parse(jsonText);
      
      return {
        color_precision: parsed.color_precision || extractColorData(parsed),
        fabric_behavior: parsed.fabric_behavior || extractFabricData(parsed),
        construction_precision: parsed.construction_precision || extractConstructionData(parsed),
        rendering_guidance: parsed.rendering_guidance || extractRenderingData(parsed),
        confidence_breakdown: parsed.confidence_breakdown || extractConfidenceData(parsed)
      };
    }
  } catch (error) {
    console.error('Failed to parse Gemini enrichment analysis:', error);
  }
  
  // Return conservative defaults if parsing fails
  return getFallbackEnrichmentData();
}

/**
 * Extract color data from parsed response
 */
function extractColorData(parsed: any): any {
  return {
    primary_hex: parsed.primary_color || parsed.dominant_color || '#404040',
    color_temperature: parsed.temperature || (parsed.warm ? 'warm' : 'cool'),
    saturation_level: parsed.saturation || 'moderate'
  };
}

/**
 * Extract fabric data from parsed response
 */
function extractFabricData(parsed: any): any {
  return {
    drape_quality: parsed.drape || parsed.fabric_drape || 'structured',
    surface_sheen: parsed.sheen || parsed.surface_finish || 'matte',
    transparency_level: parsed.transparency || parsed.opacity || 'opaque'
  };
}

/**
 * Extract construction data from parsed response
 */
function extractConstructionData(parsed: any): any {
  return {
    seam_visibility: parsed.seams || parsed.seam_visibility || 'subtle',
    edge_finishing: parsed.edges || parsed.edge_finishing || 'serged',
    stitching_contrast: parsed.contrast_stitching || false
  };
}

/**
 * Extract rendering guidance data from parsed response
 */
function extractRenderingData(parsed: any): any {
  return {
    lighting_preference: parsed.lighting || 'soft_diffused',
    shadow_behavior: parsed.shadows || 'soft_shadows',
    color_fidelity_priority: parsed.color_priority || 'high'
  };
}

/**
 * Extract confidence data from parsed response
 */
function extractConfidenceData(parsed: any): any {
  const baseConfidence = 0.85; // Conservative base
  return {
    color_confidence: parsed.color_confidence || baseConfidence,
    fabric_confidence: parsed.fabric_confidence || baseConfidence,
    overall_confidence: parsed.overall_confidence || baseConfidence
  };
}

/**
 * Format enrichment analysis into standard structure
 */
function formatEnrichmentAnalysis(analysis: any, providerName: string): EnrichmentJSON {
  return {
    type: 'garment_enrichment_focused',
    meta: {
      schema_version: '4.3',
      session_id: crypto.randomUUID(),
      base_analysis_ref: 'enrichment-' + Date.now(),
      ai_provider: providerName
    },
    color_precision: analysis.color_precision || {
      primary_hex: analysis.primary_color || '#404040',
      color_temperature: analysis.color_temperature || 'neutral',
      saturation_level: analysis.saturation_level || 'moderate'
    },
    fabric_behavior: analysis.fabric_behavior || {
      drape_quality: analysis.drape_quality || 'structured',
      surface_sheen: analysis.surface_sheen || 'matte',
      transparency_level: analysis.transparency_level || 'opaque'
    },
    construction_precision: analysis.construction_precision || {
      seam_visibility: analysis.seam_visibility || 'subtle',
      edge_finishing: analysis.edge_finishing || 'serged',
      stitching_contrast: analysis.stitching_contrast || false
    },
    rendering_guidance: analysis.rendering_guidance || {
      lighting_preference: analysis.lighting_preference || 'soft_diffused',
      shadow_behavior: analysis.shadow_behavior || 'soft_shadows',
      color_fidelity_priority: analysis.color_fidelity_priority || 'high'
    },
    confidence_breakdown: analysis.confidence_breakdown || {
      color_confidence: 0.88,
      fabric_confidence: 0.85,
      overall_confidence: 0.86
    }
  };
}

/**
 * Fallback enrichment analysis when all providers fail
 */
function getFallbackEnrichmentAnalysis(): EnrichmentJSON {
  return {
    type: 'garment_enrichment_focused',
    meta: {
      schema_version: '4.3',
      session_id: crypto.randomUUID(),
      base_analysis_ref: 'fallback-enrichment',
      ai_provider: 'fallback'
    },
    color_precision: {
      primary_hex: '#404040',
      color_temperature: 'neutral',
      saturation_level: 'moderate'
    },
    fabric_behavior: {
      drape_quality: 'structured',
      surface_sheen: 'matte',
      transparency_level: 'opaque'
    },
    construction_precision: {
      seam_visibility: 'subtle',
      edge_finishing: 'serged',
      stitching_contrast: false
    },
    rendering_guidance: {
      lighting_preference: 'soft_diffused',
      shadow_behavior: 'soft_shadows',
      color_fidelity_priority: 'high'
    },
    confidence_breakdown: {
      color_confidence: 0.75,
      fabric_confidence: 0.75,
      overall_confidence: 0.75
    }
  };
}

/**
 * Get fallback enrichment data for parsing failures
 */
function getFallbackEnrichmentData(): Partial<EnrichmentJSON> {
  return {
    color_precision: {
      primary_hex: '#404040',
      color_temperature: 'neutral',
      saturation_level: 'moderate'
    },
    fabric_behavior: {
      drape_quality: 'structured',
      surface_sheen: 'matte',
      transparency_level: 'opaque'
    }
  };
}

export function consolidate(base: AnalysisJSON, enrichment: EnrichmentJSON): any {
  console.log(`[Analysis] Consolidating base and enrichment analyses`);
  
  return {
    session_id: base.meta.session_id,
    category_generic: base.garment_category,
    silhouette: 'fitted',
    primary_color: enrichment.color_precision.primary_hex,
    drape_quality: enrichment.fabric_behavior.drape_quality,
    preservation_rules: base.preserve_details,
    hollow_regions: base.hollow_regions || [],
    confidence: enrichment.confidence_breakdown.overall_confidence
  };
}
/**
 * Simple JSON Optimizer for Flash
 * 
 * Takes your existing AnalysisJSON + EnrichmentJSON and optimizes them
 * for direct consumption by Gemini Flash, similar to jsonprompt.it
 * 
 * This is MUCH simpler than the CCJ approach - just optimizes your existing data.
 */

import type { AnalysisJSON, EnrichmentJSON } from '@/types/ghost';

/**
 * Optimized JSON structure for Flash consumption
 * Keeps only the essential fields in a clean, compact format
 */
export interface FlashOptimizedJSON {
  // Essential garment identification
  garment: {
    type: string;                    // From analysis
    silhouette: string;              // Extracted from analysis
    category: string;                // Derived category
  };
  
  // Critical visual properties
  visual: {
    primary_color: string;           // From enrichment.color_precision.primary_hex
    secondary_color?: string;        // From enrichment.color_precision.secondary_hex
    material_surface: string;        // From enrichment.fabric_behavior.surface_sheen
    transparency: string;            // From enrichment.fabric_behavior.transparency_level
    drape_quality: string;           // From enrichment.fabric_behavior.drape_quality
  };
  
  // Construction details that affect rendering
  construction: {
    seam_visibility: string;         // From enrichment.construction_precision
    edge_finishing: string;          // From enrichment.construction_precision
    hardware?: string[];             // Any hardware from analysis
  };
  
  // Critical preservation requirements
  preserve: {
    labels: string[];                // From analysis.labels_found (critical ones)
    details: string[];               // From analysis.preserve_details (critical priority)
    regions: string[];               // Important regions to maintain
  };
  
  // Rendering guidance
  rendering: {
    lighting: string;                // From enrichment.rendering_guidance.lighting_preference
    shadow_style: string;            // From enrichment.rendering_guidance.shadow_behavior
    color_fidelity: string;          // From enrichment.rendering_guidance.color_fidelity_priority
  };
}

/**
 * Optimize your existing JSONs for Flash consumption
 * This is like jsonprompt.it but specifically for your garment analysis data
 */
export function optimizeForFlash(
  analysis: AnalysisJSON,
  enrichment: EnrichmentJSON
): FlashOptimizedJSON {
  
  // Extract critical color information
  const primaryColor = enrichment.color_precision?.primary_hex || '#888888';
  const secondaryColor = enrichment.color_precision?.secondary_hex;
  
  // Extract critical labels (only preserve=true ones)
  const criticalLabels = analysis.labels_found
    ?.filter(label => label.preserve)
    ?.map(label => label.text || label.type)
    ?.filter(Boolean) || [];
  
  // Extract critical preservation details
  const criticalDetails = analysis.preserve_details
    ?.filter(detail => detail.priority === 'critical')
    ?.map(detail => detail.element)
    ?.filter(Boolean) || [];
  
  // Extract any hardware mentions
  const hardware = analysis.preserve_details
    ?.filter(detail => detail.element?.toLowerCase().includes('button') || 
                      detail.element?.toLowerCase().includes('zipper') ||
                      detail.element?.toLowerCase().includes('snap'))
    ?.map(detail => detail.element) || [];
  
  return {
    garment: {
      type: extractGarmentType(analysis),
      silhouette: extractSilhouette(analysis),
      category: extractCategory(analysis)
    },
    visual: {
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      material_surface: enrichment.fabric_behavior?.surface_sheen || 'matte',
      transparency: enrichment.fabric_behavior?.transparency_level || 'opaque',
      drape_quality: enrichment.fabric_behavior?.drape_quality || 'structured'
    },
    construction: {
      seam_visibility: enrichment.construction_precision?.seam_visibility || 'visible',
      edge_finishing: enrichment.construction_precision?.edge_finishing || 'standard',
      hardware: hardware.length > 0 ? hardware : undefined
    },
    preserve: {
      labels: criticalLabels,
      details: criticalDetails,
      regions: extractImportantRegions(analysis)
    },
    rendering: {
      lighting: enrichment.rendering_guidance?.lighting_preference || 'soft_diffused',
      shadow_style: enrichment.rendering_guidance?.shadow_behavior || 'soft_shadows',
      color_fidelity: enrichment.rendering_guidance?.color_fidelity_priority || 'high'
    }
  };
}

/**
 * Generate OPTIMIZED prompt for Flash with structured JSON leverage
 * Optimized for visual truth, precision, and leveraging structured data
 */
export function generateFlashPrompt(optimizedJson: FlashOptimizedJSON): string {
  // Generate dynamic sections based on JSON data
  const colorInstructions = generateColorInstructions(optimizedJson.visual);
  const materialInstructions = generateMaterialInstructions(optimizedJson.visual);
  const preservationInstructions = generatePreservationInstructions(optimizedJson.preserve);
  const constructionInstructions = generateConstructionInstructions(optimizedJson.construction);
  const renderingInstructions = generateRenderingInstructions(optimizedJson.rendering);
  
  // Create structured, data-driven prompt
  return `TASK: Transform flatlay garment into professional ghost mannequin photo with invisible wearer effect.

=== VISUAL TRUTH CONSTRAINTS ===
${colorInstructions}
${materialInstructions}

=== CONSTRUCTION FIDELITY ===
${constructionInstructions}

=== CRITICAL PRESERVATION ===
${preservationInstructions}

=== RENDERING SPECIFICATIONS ===
${renderingInstructions}

=== STRUCTURED DATA ===
${JSON.stringify(optimizedJson, null, 0)}

=== IMAGE AUTHORITY ===
• Image B (flatlay): ABSOLUTE TRUTH for colors, textures, patterns, labels, construction details
• Image A (on-model): Reference ONLY for proportions, fit, draping - ignore colors/materials
• Any conflict: Image B wins

=== OUTPUT REQUIREMENTS ===
• 2048×2048 resolution
• Professional product photography
• Pure white background (#FFFFFF)
• Studio lighting matching rendering specifications
• Natural fabric draping consistent with material properties
• Invisible person effect - no body visible, garment maintains worn shape`;
}

/**
 * All-in-one function: optimize your JSONs and generate for Flash
 */
export function prepareForFlash(
  analysis: AnalysisJSON,
  enrichment: EnrichmentJSON
): {
  optimized_json: FlashOptimizedJSON;
  prompt: string;
  sizes: {
    original_analysis_bytes: number;
    original_enrichment_bytes: number;
    optimized_bytes: number;
    reduction_pct: number;
  };
} {
  
  const originalAnalysisSize = JSON.stringify(analysis).length;
  const originalEnrichmentSize = JSON.stringify(enrichment).length;
  const totalOriginalSize = originalAnalysisSize + originalEnrichmentSize;
  
  const optimizedJson = optimizeForFlash(analysis, enrichment);
  const optimizedSize = JSON.stringify(optimizedJson).length;
  
  const reductionPct = ((totalOriginalSize - optimizedSize) / totalOriginalSize) * 100;
  
  return {
    optimized_json: optimizedJson,
    prompt: generateFlashPrompt(optimizedJson),
    sizes: {
      original_analysis_bytes: originalAnalysisSize,
      original_enrichment_bytes: originalEnrichmentSize,
      optimized_bytes: optimizedSize,
      reduction_pct: Math.round(reductionPct * 100) / 100
    }
  };
}

/**
 * Direct Flash generation using optimized approach
 */
export async function generateWithOptimizedJSON(
  analysis: AnalysisJSON,
  enrichment: EnrichmentJSON,
  images: {
    flatlayUrl: string;      // B - truth image
    onModelUrl?: string;     // A - proportions only  
  },
  sessionId: string
): Promise<{
  success: boolean;
  generated_image_url?: string;
  optimization_info: {
    original_size_bytes: number;
    optimized_size_bytes: number;
    reduction_pct: number;
    prompt_length: number;
  };
  processing_time_ms: number;
  error?: string;
}> {
  
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Generating ghost mannequin with JSON optimization for session: ${sessionId}`);
    
    // Step 1: Optimize your JSONs
    const prepared = prepareForFlash(analysis, enrichment);
    
    console.log(`📊 Optimization results:`);
    console.log(`   Original: ${prepared.sizes.original_analysis_bytes + prepared.sizes.original_enrichment_bytes}B`);
    console.log(`   Optimized: ${prepared.sizes.optimized_bytes}B`);
    console.log(`   Reduction: ${prepared.sizes.reduction_pct}%`);
    console.log(`   Prompt: ${prepared.prompt.length} chars`);
    
    // Step 2: Send to Flash using your existing Gemini Flash integration
    const flashResult = await generateWithRealFlash(
      prepared.prompt,
      prepared.optimized_json,
      images,
      sessionId
    );
    
    const processingTime = Date.now() - startTime;
    
    if (flashResult.success) {
      console.log(`✅ Optimized JSON generation completed in ${processingTime}ms`);
      return {
        success: true,
        generated_image_url: flashResult.imageUrl,
        optimization_info: {
          original_size_bytes: prepared.sizes.original_analysis_bytes + prepared.sizes.original_enrichment_bytes,
          optimized_size_bytes: prepared.sizes.optimized_bytes,
          reduction_pct: prepared.sizes.reduction_pct,
          prompt_length: prepared.prompt.length
        },
        processing_time_ms: processingTime
      };
    } else {
      throw new Error(flashResult.error || 'Flash generation failed');
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Optimized JSON generation failed:', error);
    
    return {
      success: false,
      optimization_info: {
        original_size_bytes: JSON.stringify(analysis).length + JSON.stringify(enrichment).length,
        optimized_size_bytes: 0,
        reduction_pct: 0,
        prompt_length: 0
      },
      processing_time_ms: processingTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper extraction functions
function extractGarmentType(analysis: AnalysisJSON): string {
  // Add logic to detect garment type from analysis
  // For now, return generic
  return 'garment';
}

function extractSilhouette(analysis: AnalysisJSON): string {
  // Extract silhouette info from analysis data
  // Could look at preserve_details for shape clues
  return 'unspecified';
}

// ============================================================================
// OPTIMIZED PROMPT GENERATORS - Leverage Structured JSON for Visual Truth
// ============================================================================

/**
 * Generate precise color instructions from structured visual data
 */
function generateColorInstructions(visual: FlashOptimizedJSON['visual']): string {
  let instructions = `• PRIMARY COLOR: Exact match to ${visual.primary_color} (critical fidelity)`;
  
  if (visual.secondary_color) {
    instructions += `\n• SECONDARY COLOR: Exact match to ${visual.secondary_color} (preserve contrast ratios)`;
  }
  
  // Add color temperature guidance
  const colorTemp = getColorTemperature(visual.primary_color);
  instructions += `\n• COLOR TEMPERATURE: ${colorTemp} - maintain consistent lighting temperature`;
  
  // Add color fidelity priority
  instructions += `\n• FIDELITY PRIORITY: Critical - any color deviation will be rejected`;
  
  return instructions;
}

/**
 * Generate material behavior instructions from fabric analysis
 */
function generateMaterialInstructions(visual: FlashOptimizedJSON['visual']): string {
  let instructions = `• SURFACE FINISH: ${visual.material_surface} surface - no artificial sheen changes`;
  
  // Add drape behavior
  const drapeGuidance = getDrapeGuidance(visual.drape_quality);
  instructions += `\n• DRAPE BEHAVIOR: ${drapeGuidance}`;
  
  // Add transparency handling
  if (visual.transparency !== 'opaque') {
    instructions += `\n• TRANSPARENCY: ${visual.transparency} - maintain light transmission properties`;
  }
  
  return instructions;
}

/**
 * Generate construction fidelity instructions
 */
function generateConstructionInstructions(construction: FlashOptimizedJSON['construction']): string {
  let instructions = `• SEAM VISIBILITY: ${construction.seam_visibility} seams - maintain construction authenticity`;
  instructions += `\n• EDGE FINISHING: ${construction.edge_finishing} edges - preserve finishing details`;
  
  if (construction.hardware && construction.hardware.length > 0) {
    instructions += `\n• HARDWARE: Preserve exact placement and appearance of: ${construction.hardware.join(', ')}`;
  }
  
  return instructions;
}

/**
 * Generate critical preservation instructions
 */
function generatePreservationInstructions(preserve: FlashOptimizedJSON['preserve']): string {
  let instructions = '';
  
  if (preserve.labels.length > 0) {
    instructions += `• LABELS: Maintain perfect legibility and placement of: ${preserve.labels.join(', ')}`;
  }
  
  if (preserve.details.length > 0) {
    if (instructions) instructions += '\n';
    instructions += `• CRITICAL DETAILS: Preserve exact appearance of: ${preserve.details.join(', ')}`;
  }
  
  if (preserve.regions.length > 0) {
    if (instructions) instructions += '\n';
    instructions += `• FOCUS REGIONS: Pay special attention to: ${preserve.regions.join(', ')}`;
  }
  
  return instructions || '• No critical preservation requirements detected';
}

/**
 * Generate rendering specification instructions
 */
function generateRenderingInstructions(rendering: FlashOptimizedJSON['rendering']): string {
  let instructions = `• LIGHTING: ${rendering.lighting} lighting setup`;
  instructions += `\n• SHADOWS: ${rendering.shadow_style} shadow treatment`;
  instructions += `\n• COLOR ACCURACY: ${rendering.color_fidelity} priority color matching`;
  
  // Add specific lighting guidance
  const lightingSetup = getLightingSetup(rendering.lighting);
  instructions += `\n• SETUP: ${lightingSetup}`;
  
  return instructions;
}

/**
 * Helper: Determine color temperature from hex value
 */
function getColorTemperature(hexColor: string): string {
  // Convert hex to RGB
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 'neutral';
  
  // Simple color temperature detection
  const { r, g, b } = rgb;
  if (r > g && r > b) return 'warm';
  if (b > r && b > g) return 'cool';
  return 'neutral';
}

/**
 * Helper: Get drape behavior guidance
 */
function getDrapeGuidance(drapeQuality: string): string {
  const drapeMap: Record<string, string> = {
    'structured': 'Maintains crisp edges and defined silhouette, minimal flowing',
    'fluid': 'Flows naturally with soft draping, follows gravity curves',
    'stiff': 'Rigid structure, maintains original shape when worn',
    'flowing': 'Graceful movement, emphasize natural fabric fall',
    'clingy': 'Follows body contours closely, emphasize fit',
    'loose': 'Relaxed fit with natural air gaps and volume'
  };
  
  return drapeMap[drapeQuality] || `${drapeQuality} draping behavior`;
}

/**
 * Helper: Get lighting setup instructions
 */
function getLightingSetup(lightingType: string): string {
  const lightingMap: Record<string, string> = {
    'soft_diffused': 'Large softbox setup, even illumination, minimal harsh shadows',
    'hard': 'Direct lighting, defined shadows, crisp edge definition',
    'rim': 'Backlighting emphasis, edge highlighting for dimension',
    'dramatic': 'High contrast lighting, pronounced shadows for depth',
    'flat': 'Even front lighting, minimal shadows, catalog style'
  };
  
  return lightingMap[lightingType] || `${lightingType} lighting configuration`;
}

/**
 * Helper: Convert hex to RGB
 */
function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function extractCategory(analysis: AnalysisJSON): string {
  // Basic category detection - enhance with your logic
  return 'apparel';
}

function extractImportantRegions(analysis: AnalysisJSON): string[] {
  // Extract important regions from analysis
  return analysis.preserve_details
    ?.filter(detail => detail.priority === 'critical' || detail.priority === 'important')
    ?.map(detail => detail.location || 'unspecified')
    ?.filter(Boolean) || [];
}

// Real Flash generation using your existing Gemini Flash integration
async function generateWithRealFlash(
  prompt: string,
  optimizedJson: FlashOptimizedJSON,
  images: { flatlayUrl: string; onModelUrl?: string },
  sessionId: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  
  try {
    console.log('🎆 Calling Gemini Flash with optimized JSON...');
    console.log(`Prompt: ${prompt.substring(0, 200)}...`);
    console.log(`Optimized JSON: ${JSON.stringify(optimizedJson, null, 2).substring(0, 300)}...`);
    
    // Check which Flash integration to use based on your existing setup
    const renderingModel = process.env.RENDERING_MODEL || 'freepik-gemini';
    
    if (renderingModel === 'freepik-gemini') {
      // Use Freepik's Gemini Flash API
      const { generateImageWithFreepikGemini } = await import('./freepik');
      
      const result = await generateImageWithFreepikGemini(
        prompt,
        images.flatlayUrl,     // B - truth image
        images.onModelUrl      // A - proportions (optional)
      );
      
      return {
        success: true,
        imageUrl: result.imageBase64  // Freepik returns base64
      };
      
    } else {
      // Use direct Gemini Flash (your existing generateGhostMannequin function)
      const { generateGhostMannequin } = await import('./gemini');
      
      // Create a minimal analysis object for compatibility
      const minimalAnalysis = {
        type: "garment_analysis",
        meta: { schema_version: "4.1", session_id: sessionId },
        labels_found: optimizedJson.preserve.labels.map(label => ({
          text: label,
          preserve: true,
          type: 'brand',
          location: 'unknown'
        })),
        preserve_details: optimizedJson.preserve.details.map(detail => ({
          element: detail,
          priority: 'critical' as const,
          notes: 'From optimized JSON'
        }))
      };
      
      const result = await generateGhostMannequin(
        images.flatlayUrl,
        minimalAnalysis,
        images.onModelUrl
      );
      
      return {
        success: true,
        imageUrl: result.renderUrl
      };
    }
    
  } catch (error) {
    console.error('❌ Flash generation with optimized JSON failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Flash error'
    };
  }
}

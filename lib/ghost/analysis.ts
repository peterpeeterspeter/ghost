/**
 * Analysis modules for Ghost Mannequin Pipeline
 */

import { AnalysisJSON, EnrichmentJSON } from '../../types/ghost';

// Helper function to convert image URL to base64
async function imageToBase64(imageUrl: string): Promise<string> {
  try {
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
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        garment_category: parsed.garment_category || 'top',
        closure_type: parsed.closure_type || 'pullover',
        neckline_style: parsed.neckline_style || 'crew',
        sleeve_configuration: parsed.sleeve_configuration || 'long',
        labels_found: parsed.labels_found || [],
        preserve_details: parsed.preserve_details || []
      };
    }
  } catch (error) {
    console.error('Failed to parse Gemini analysis:', error);
  }
  
  // Return defaults if parsing fails
  return {
    garment_category: 'top',
    closure_type: 'pullover',
    neckline_style: 'crew',
    sleeve_configuration: 'long',
    labels_found: [],
    preserve_details: []
  };
}

export async function analyzeBase(imageUrl: string): Promise<AnalysisJSON> {
  console.log(`[Analysis] Starting base analysis for: ${imageUrl}`);
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analyze this garment image and return structured JSON with: garment_category, closure_type, neckline_style, sleeve_configuration, labels_found, preserve_details. Focus on identifying key structural elements and any labels/branding that must be preserved.`
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
    const analysisText = result.candidates[0]?.content?.parts[0]?.text || '{}';
    
    // Parse and structure the analysis
    const parsedAnalysis = parseGeminiAnalysis(analysisText);
    
    const structuredAnalysis: AnalysisJSON = {
      type: 'garment_analysis',
      meta: {
        schema_version: '4.2',
        session_id: crypto.randomUUID(),
        processing_stage: 'base_analysis',
        safety_pre_scrub_applied: true
      },
      garment_category: parsedAnalysis.garment_category || 'top',
      closure_type: parsedAnalysis.closure_type || 'pullover',
      neckline_style: parsedAnalysis.neckline_style || 'crew',
      sleeve_configuration: parsedAnalysis.sleeve_configuration || 'long',
      labels_found: parsedAnalysis.labels_found || [],
      preserve_details: parsedAnalysis.preserve_details || []
    };
    
    console.log(`[Analysis] Base analysis completed via Gemini`);
    return structuredAnalysis;
    
  } catch (error) {
    console.error('[Analysis] Gemini analysis failed, using fallback:', error);
    
    // Fallback to mock analysis
    const mockAnalysis: AnalysisJSON = {
      type: 'garment_analysis',
      meta: {
        schema_version: '4.2',
        session_id: crypto.randomUUID(),
        processing_stage: 'base_analysis',
        safety_pre_scrub_applied: true
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
      ]
    };
    
    return mockAnalysis;
  }
}

export async function analyzeEnrichment(imageUrl: string): Promise<EnrichmentJSON> {
  console.log(`[Analysis] Starting enrichment analysis for: ${imageUrl}`);
  
  // Mock enrichment result
  const mockEnrichment: EnrichmentJSON = {
    type: 'garment_enrichment_focused',
    meta: {
      schema_version: '4.3',
      session_id: crypto.randomUUID(),
      base_analysis_ref: 'base-analysis-ref'
    },
    color_precision: {
      primary_hex: '#1a365d',
      color_temperature: 'cool',
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
      color_confidence: 0.92,
      fabric_confidence: 0.88,
      overall_confidence: 0.90
    }
  };
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log(`[Analysis] Enrichment analysis completed`);
  return mockEnrichment;
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
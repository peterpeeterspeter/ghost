/**
 * Amazon-Ready Structured Prompt Generator
 * 
 * Based on clockmaker test results showing 70% success rate with JSON structure
 * vs 0% success with narrative prompts for complex, detailed requirements.
 * 
 * Enhanced for Amazon marketplace compliance with 32+ structured fields:
 * - Amazon technical standards (85% frame fill, shadowless lighting)
 * - Prohibited elements (props, branding, watermarks, text)
 * - Styling requirements (no bunching, proper fit, sleeve drape)
 * - Color fidelity (critical accuracy for marketplace)
 * - Multiple view angles (front, back, three-quarter, detail shots)
 * 
 * This approach breaks down Amazon's complex requirements into discrete,
 * machine-readable components that AI models handle more reliably than
 * narrative instructions.
 */

import { FactsV3, ControlBlock } from '../../types/ghost';

export interface StructuredGhostPrompt {
  scene: {
    type: "professional_ecommerce_photography";
    effect: "ghost_mannequin";
    background: "pure_white" | "light_grey";
    lighting: "soft_even_shadowless" | "soft_professional_studio";
  };
  garment: {
    category: string;
    view_angle: "front_centered" | "back_centered" | "three_quarter_left" | "three_quarter_right" | "detail_shot" | "flat_lay" | "interior_neckline_shot";
    form: "invisible_human_silhouette";
    detail_shot_focus?: string;
  };
  colors: {
    dominant_hex: string;
    accent_hex?: string;
    color_temperature: "warm" | "cool" | "neutral";
    saturation: "muted" | "moderate" | "vibrant";
  };
  fabric: {
    material: string;
    drape_quality: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
    surface_sheen: "matte" | "subtle_sheen" | "glossy" | "metallic";
    transparency: "opaque" | "semi_opaque" | "translucent" | "sheer";
    drape_stiffness: number; // 0-1 scale
  };
  construction: {
    silhouette: string;
    required_visible_elements: string[];
    seam_visibility: "hidden" | "subtle" | "visible" | "decorative";
    edge_finishing: "raw" | "serged" | "bound" | "rolled" | "pinked";
  };
  styling: {
    garment_fit: "perfectly_fitted_no_bunching" | "tailored" | "relaxed";
    sleeve_drape: "natural_at_sides" | "slightly_forward";
  };
  quality_requirements: {
    detail_sharpness: "natural" | "sharp" | "ultra_sharp";
    texture_emphasis: "subtle" | "enhance" | "maximize";
    color_fidelity: "high" | "critical";
    market_tier: "budget" | "mid_range" | "premium" | "luxury";
  };
  technical_specs: {
    resolution: "high_detail_4k";
    perspective: "straight_frontal_orthographic";
    dimensional_form: true;
    no_visible_mannequin: true;
    frame_fill_percentage: number;
    negative_constraints: string[];
    commercial_license_required: true;
  };
}

/**
 * Convert FactsV3 and ControlBlock data into structured prompt format
 */
export function buildStructuredPrompt(facts: FactsV3, controlBlock: ControlBlock): StructuredGhostPrompt {
  return {
    scene: {
      type: "professional_ecommerce_photography",
      effect: "ghost_mannequin", 
      background: "pure_white", // Amazon prefers pure white (#FFFFFF)
      lighting: "soft_even_shadowless" // Amazon prohibits harsh shadows
    },
    garment: {
      category: facts.category_generic || "garment",
      view_angle: "front_centered", // Default to front view for Amazon
      form: "invisible_human_silhouette",
      detail_shot_focus: undefined // Only used when view_angle is "detail_shot"
    },
    colors: {
      dominant_hex: facts.palette?.dominant_hex || controlBlock.palette?.dominant_hex || "#CCCCCC",
      accent_hex: facts.palette?.accent_hex || controlBlock.palette?.accent_hex,
      color_temperature: facts.color_temperature || "neutral",
      saturation: facts.saturation_level || "moderate"
    },
    fabric: {
      material: facts.material || "fabric",
      drape_quality: facts.drape_quality || "flowing",
      surface_sheen: facts.surface_sheen || "matte",
      transparency: facts.transparency || "opaque",
      drape_stiffness: facts.drape_stiffness ?? 0.4
    },
    construction: {
      silhouette: facts.silhouette || "standard fit",
      required_visible_elements: facts.required_components || [],
      seam_visibility: facts.seam_visibility || "subtle",
      edge_finishing: facts.edge_finishing || "serged"
    },
    styling: {
      garment_fit: "perfectly_fitted_no_bunching", // Amazon requirement for proper fit
      sleeve_drape: "natural_at_sides" // Amazon guideline for sleeve positioning
    },
    quality_requirements: {
      detail_sharpness: "sharp", // Amazon requires high-resolution, sharp images
      texture_emphasis: facts.texture_emphasis || "subtle", 
      color_fidelity: "critical", // Amazon demands accurate color representation
      market_tier: facts.price_tier || "mid_range"
    },
    technical_specs: {
      resolution: "high_detail_4k", // Amazon prefers high resolution
      perspective: "straight_frontal_orthographic", // Reduces perspective distortion
      dimensional_form: true,
      no_visible_mannequin: true,
      frame_fill_percentage: 85, // Amazon's 85% frame fill requirement
      negative_constraints: ["props", "human_models", "branding", "watermarks", "text"], // Amazon prohibitions
      commercial_license_required: true
    }
  };
}

/**
 * Convert structured prompt to natural language for AI generation
 * Uses the clockmaker approach: structured data with narrative integration
 */
export function structuredPromptToText(structured: StructuredGhostPrompt): string {
  const prompt = `
{
  "scene_type": "${structured.scene.type}",
  "effect": "${structured.scene.effect}",
  "description": "Create a professional Amazon-ready e-commerce product photograph featuring the ${structured.scene.effect} effect. The image shows only the garment displaying dimensional form with no visible person or mannequin.",
  
  "background": "${structured.scene.background}",
  "lighting": "${structured.scene.lighting}",
  
  "garment_specifications": {
    "category": "${structured.garment.category}",
    "view_angle": "${structured.garment.view_angle}",
    "form": "${structured.garment.form}",
    "silhouette": "${structured.construction.silhouette}",
    "required_elements": ${JSON.stringify(structured.construction.required_visible_elements)},
    ${structured.garment.detail_shot_focus ? `"detail_focus": "${structured.garment.detail_shot_focus}",` : ''}
  },
  
  "color_requirements": {
    "dominant_color": "${structured.colors.dominant_hex}",
    ${structured.colors.accent_hex ? `"accent_color": "${structured.colors.accent_hex}",` : ''}
    "color_temperature": "${structured.colors.color_temperature}",
    "saturation_level": "${structured.colors.saturation}",
    "color_accuracy": "${structured.quality_requirements.color_fidelity}"
  },
  
  "fabric_physics": {
    "material_type": "${structured.fabric.material}",
    "drape_behavior": "${structured.fabric.drape_quality}",
    "drape_stiffness_level": ${structured.fabric.drape_stiffness},
    "surface_finish": "${structured.fabric.surface_sheen}",
    "transparency_level": "${structured.fabric.transparency}"
  },
  
  "construction_details": {
    "seam_treatment": "${structured.construction.seam_visibility}",
    "edge_finish": "${structured.construction.edge_finishing}"
  },
  
  "amazon_styling_requirements": {
    "garment_fit": "${structured.styling.garment_fit}",
    "sleeve_drape": "${structured.styling.sleeve_drape}"
  },
  
  "quality_standards": {
    "detail_level": "${structured.quality_requirements.detail_sharpness}",
    "texture_rendering": "${structured.quality_requirements.texture_emphasis}",
    "market_positioning": "${structured.quality_requirements.market_tier}",
    "commercial_license": ${structured.technical_specs.commercial_license_required}
  },
  
  "amazon_compliance": {
    "perspective": "${structured.technical_specs.perspective}",
    "dimensional_form": ${structured.technical_specs.dimensional_form},
    "invisible_support": ${structured.technical_specs.no_visible_mannequin},
    "resolution": "${structured.technical_specs.resolution}",
    "frame_fill_percentage": ${structured.technical_specs.frame_fill_percentage},
    "negative_constraints": ${JSON.stringify(structured.technical_specs.negative_constraints)}
  }
}

Generate this professional Amazon-compliant ghost mannequin photograph according to the structured specifications above. The garment must fill at least ${structured.technical_specs.frame_fill_percentage}% of the frame, appear fitted without bunching, and strictly avoid: ${structured.technical_specs.negative_constraints.join(", ")}. Use pure white (#FFFFFF) background with shadowless lighting for optimal Amazon marketplace presentation.`;

  return prompt.trim();
}

/**
 * Hybrid approach: JSON structure with natural narrative sections
 * Combines the precision of structured data with the creativity of natural language
 */
export function generateHybridStructuredPrompt(facts: FactsV3, controlBlock: ControlBlock): string {
  const structured = buildStructuredPrompt(facts, controlBlock);
  
  // Amazon-specific structured requirements (inspired by clockmaker test pattern)
  const amazonSpecs = `
AMAZON MARKETPLACE COMPLIANCE REQUIREMENTS:
{
  "ghost_mannequin_effect": {
    "must_show": "garment with dimensional human form",
    "must_not_show": "visible person, mannequin, or human body parts",
    "effect_type": "invisible support creating natural garment shape"
  },
  "amazon_technical_standards": {
    "background": "${structured.scene.background} (#FFFFFF)",
    "lighting": "${structured.scene.lighting}",
    "view_angle": "${structured.garment.view_angle}",
    "frame_fill": "${structured.technical_specs.frame_fill_percentage}% minimum",
    "resolution": "${structured.technical_specs.resolution}",
    "perspective": "${structured.technical_specs.perspective}"
  },
  "color_precision": {
    "dominant_hex": "${structured.colors.dominant_hex}",
    ${structured.colors.accent_hex ? `"accent_hex": "${structured.colors.accent_hex}",` : ''}
    "accuracy_level": "${structured.quality_requirements.color_fidelity}",
    "color_temperature": "${structured.colors.color_temperature}"
  },
  "amazon_styling_requirements": {
    "garment_fit": "${structured.styling.garment_fit}",
    "sleeve_drape": "${structured.styling.sleeve_drape}",
    "detail_sharpness": "${structured.quality_requirements.detail_sharpness}"
  },
  "fabric_physics": {
    "drape_stiffness": ${structured.fabric.drape_stiffness},
    "surface_sheen": "${structured.fabric.surface_sheen}",
    "drape_quality": "${structured.fabric.drape_quality}",
    "material_type": "${structured.fabric.material}"
  },
  "prohibited_elements": ${JSON.stringify(structured.technical_specs.negative_constraints)}
}`;

  // Amazon-focused narrative section
  const amazonNarrative = `
Create a professional Amazon marketplace-ready ghost mannequin photograph of this ${structured.garment.category}. The ${structured.fabric.material} garment must appear ${structured.styling.garment_fit.replace(/_/g, ' ')} without bunching, with sleeves draped ${structured.styling.sleeve_drape.replace(/_/g, ' ')}. Use ${structured.scene.lighting.replace(/_/g, ' ')} against a pure white (#FFFFFF) background. 

The garment should fill exactly ${structured.technical_specs.frame_fill_percentage}% of the frame with ${structured.quality_requirements.detail_sharpness} detail quality. Strictly avoid all prohibited elements: ${structured.technical_specs.negative_constraints.join(", ")}. 

Ensure ${structured.quality_requirements.color_fidelity} color fidelity matching the exact hex values specified, with ${structured.fabric.surface_sheen.replace(/_/g, ' ')} surface finish and ${structured.fabric.drape_quality} drape characteristics suitable for ${structured.quality_requirements.market_tier}-tier Amazon marketplace standards.`;

  return `${amazonSpecs}\n\n${amazonNarrative}`;
}

/**
 * Test function to validate structured prompt generation
 */
export function testStructuredPromptGeneration(facts: FactsV3, controlBlock: ControlBlock) {
  console.log('🧪 Testing structured prompt generation...');
  
  const structured = buildStructuredPrompt(facts, controlBlock);
  console.log('📊 Structured data:', JSON.stringify(structured, null, 2));
  
  const textPrompt = structuredPromptToText(structured);
  console.log('📝 Text prompt length:', textPrompt.length);
  
  const hybridPrompt = generateHybridStructuredPrompt(facts, controlBlock);
  console.log('🔄 Hybrid prompt length:', hybridPrompt.length);
  
  return {
    structured,
    textPrompt,
    hybridPrompt
  };
}
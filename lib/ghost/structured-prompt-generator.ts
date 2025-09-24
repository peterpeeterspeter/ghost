/**
 * Structured Prompt Generator
 * 
 * Based on clockmaker test results showing 70% success rate with JSON structure
 * vs 0% success with narrative prompts for complex, detailed requirements.
 * 
 * This approach breaks down ghost mannequin requirements into discrete,
 * parseable components that AI models handle more reliably.
 */

import { FactsV3, ControlBlock } from '../../types/ghost';

export interface StructuredGhostPrompt {
  scene: {
    type: "professional_ecommerce_photography";
    effect: "ghost_mannequin";
    background: "pure_white_studio";
    lighting: "soft_professional_studio";
  };
  garment: {
    category: string;
    position: "front_view_centered";
    form: "invisible_human_silhouette";
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
  quality_requirements: {
    detail_sharpness: "soft" | "natural" | "sharp" | "ultra_sharp";
    texture_emphasis: "minimize" | "subtle" | "enhance" | "maximize";
    color_fidelity: "low" | "medium" | "high" | "critical";
    market_tier: "budget" | "mid_range" | "premium" | "luxury";
  };
  technical_specs: {
    resolution: "high_detail";
    perspective: "straight_frontal";
    dimensional_form: true;
    no_visible_mannequin: true;
    commercial_ready: true;
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
      background: "pure_white_studio",
      lighting: "soft_professional_studio"
    },
    garment: {
      category: facts.category_generic || "garment",
      position: "front_view_centered",
      form: "invisible_human_silhouette"
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
    quality_requirements: {
      detail_sharpness: facts.detail_sharpness || "natural",
      texture_emphasis: facts.texture_emphasis || "subtle", 
      color_fidelity: facts.color_fidelity_priority || "high",
      market_tier: facts.price_tier || "mid_range"
    },
    technical_specs: {
      resolution: "high_detail",
      perspective: "straight_frontal",
      dimensional_form: true,
      no_visible_mannequin: true,
      commercial_ready: true
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
  "description": "Create a professional e-commerce product photograph featuring the ${structured.scene.effect} effect. The image shows only the garment displaying dimensional form with no visible person or mannequin.",
  
  "background": "${structured.scene.background}",
  "lighting": "${structured.scene.lighting}",
  
  "garment_specifications": {
    "category": "${structured.garment.category}",
    "position": "${structured.garment.position}",
    "form": "${structured.garment.form}",
    "silhouette": "${structured.construction.silhouette}",
    "required_elements": ${JSON.stringify(structured.construction.required_visible_elements)}
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
  
  "quality_standards": {
    "detail_level": "${structured.quality_requirements.detail_sharpness}",
    "texture_rendering": "${structured.quality_requirements.texture_emphasis}",
    "market_positioning": "${structured.quality_requirements.market_tier}",
    "commercial_grade": ${structured.technical_specs.commercial_ready}
  },
  
  "technical_execution": {
    "perspective": "${structured.technical_specs.perspective}",
    "dimensional_form": ${structured.technical_specs.dimensional_form},
    "invisible_support": ${structured.technical_specs.no_visible_mannequin},
    "resolution": "${structured.technical_specs.resolution}"
  }
}

Generate this professional ghost mannequin photograph according to the structured specifications above. The garment should appear filled with an invisible human form, showing natural drape and structure suitable for e-commerce display, with no visible person or mannequin present.`;

  return prompt.trim();
}

/**
 * Hybrid approach: JSON structure with natural narrative sections
 * Combines the precision of structured data with the creativity of natural language
 */
export function generateHybridStructuredPrompt(facts: FactsV3, controlBlock: ControlBlock): string {
  const structured = buildStructuredPrompt(facts, controlBlock);
  
  // Critical structured requirements (like your clockmaker test)
  const criticalSpecs = `
CRITICAL TECHNICAL REQUIREMENTS:
{
  "ghost_mannequin_effect": {
    "must_show": "garment with dimensional human form",
    "must_not_show": "visible person, mannequin, or human body parts",
    "effect_type": "invisible support creating natural garment shape"
  },
  "color_precision": {
    "dominant_hex": "${structured.colors.dominant_hex}",
    ${structured.colors.accent_hex ? `"accent_hex": "${structured.colors.accent_hex}",` : ''}
    "accuracy_level": "${structured.quality_requirements.color_fidelity}"
  },
  "fabric_physics": {
    "drape_stiffness": ${structured.fabric.drape_stiffness},
    "surface_sheen": "${structured.fabric.surface_sheen}",
    "drape_quality": "${structured.fabric.drape_quality}"
  },
  "positioning": {
    "view": "straight frontal perspective",
    "centering": "perfectly centered in frame",
    "form": "natural human proportions with invisible support"
  }
}`;

  // Natural narrative section for creativity
  const narrative = `
Create a professional e-commerce product photograph featuring this ${structured.garment.category} in a ghost mannequin style. The ${structured.fabric.material} garment appears filled with an invisible human silhouette, displaying the ${structured.construction.silhouette} naturally. The fabric demonstrates ${structured.fabric.drape_quality} drape characteristics with ${structured.fabric.surface_sheen} surface finish. Professional studio lighting illuminates the garment against a pure white background, ensuring the exact color values and ${structured.quality_requirements.market_tier}-tier commercial quality suitable for online retail.`;

  return `${criticalSpecs}\n\n${narrative}`;
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
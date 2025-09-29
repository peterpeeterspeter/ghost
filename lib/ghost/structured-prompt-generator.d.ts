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
        pattern_direction?: "horizontal" | "vertical" | "diagonal" | "random";
        pattern_repeat_size?: "micro" | "small" | "medium" | "large";
    };
    fabric: {
        material: string;
        drape_quality: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
        surface_sheen: "matte" | "subtle_sheen" | "glossy" | "metallic";
        transparency: "opaque" | "semi_opaque" | "translucent" | "sheer";
        drape_stiffness: number;
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
export declare function buildStructuredPrompt(facts: FactsV3, controlBlock: ControlBlock): StructuredGhostPrompt;
/**
 * Expert AI system prompt for direct JSON interpretation
 * More authoritative and directive than narrative approaches
 */
export declare function generateExpertAIPrompt(structured: StructuredGhostPrompt): string;
/**
 * Convert structured prompt to natural language for AI generation
 * Uses the clockmaker approach: structured data with narrative integration
 */
export declare function structuredPromptToText(structured: StructuredGhostPrompt): string;
/**
 * Hybrid approach: JSON structure with natural narrative sections
 * Combines the precision of structured data with the creativity of natural language
 */
export declare function generateHybridStructuredPrompt(facts: FactsV3, controlBlock: ControlBlock, useExpertPrompt?: boolean): string;
/**
 * Test function to validate structured prompt generation
 */
export declare function testStructuredPromptGeneration(facts: FactsV3, controlBlock: ControlBlock): {
    structured: StructuredGhostPrompt;
    textPrompt: string;
    hybridPrompt: string;
};

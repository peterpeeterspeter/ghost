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
 * LEGACY: Basic 18-field structure - TOO AGGRESSIVE for commercial use
 * Use CommercialOptimizedJSON instead for professional fashion photography
 */
export interface FlashOptimizedJSON {
    garment: {
        type: string;
        silhouette: string;
        category: string;
    };
    visual: {
        primary_color: string;
        secondary_color?: string;
        material_surface: string;
        transparency: string;
        drape_quality: string;
    };
    construction: {
        seam_visibility: string;
        edge_finishing: string;
        hardware?: string[];
    };
    preserve: {
        labels: string[];
        details: string[];
        regions: string[];
    };
    rendering: {
        lighting: string;
        shadow_style: string;
        color_fidelity: string;
    };
}
/**
 * ENHANCED: Commercial-grade structure (35-45 fields)
 * Preserves essential commercial data while staying efficient
 * Designed for professional fashion e-commerce photography
 */
export interface CommercialOptimizedJSON {
    garment: {
        type: string;
        silhouette: string;
        category: string;
        subcategory?: string;
    };
    color_precision: {
        primary_hex: string;
        secondary_hex?: string;
        tertiary_hex?: string;
        color_temperature: 'warm' | 'cool' | 'neutral';
        saturation_level: 'muted' | 'moderate' | 'vibrant';
        pattern_direction?: 'horizontal' | 'vertical' | 'diagonal' | 'random';
        pattern_scale?: 'micro' | 'small' | 'medium' | 'large';
        color_fidelity_priority: 'low' | 'medium' | 'high' | 'critical';
    };
    fabric_behavior: {
        drape_quality: 'crisp' | 'flowing' | 'structured' | 'fluid' | 'stiff';
        surface_sheen: 'matte' | 'subtle_sheen' | 'glossy' | 'metallic';
        transparency_level: 'opaque' | 'semi_opaque' | 'translucent' | 'sheer';
        texture_depth?: 'flat' | 'subtle_texture' | 'pronounced_texture' | 'heavily_textured';
        material_type: string;
        weave_structure?: string;
        drape_stiffness: number;
    };
    critical_labels: Array<{
        type: 'brand' | 'size' | 'care' | 'composition' | 'origin' | 'price';
        text?: string;
        position: string;
        visibility_required: boolean;
        ocr_confidence?: number;
        preserve_priority: 'critical' | 'important' | 'nice_to_have';
        dimensions?: {
            width: number;
            height: number;
        };
        color_hex?: string;
    }>;
    construction_precision: {
        seam_visibility: 'hidden' | 'subtle' | 'visible' | 'decorative';
        edge_finishing: 'raw' | 'serged' | 'bound' | 'rolled' | 'pinked';
        stitching_contrast: boolean;
        hardware_elements?: Array<{
            type: string;
            finish: 'matte_metal' | 'polished_metal' | 'plastic' | 'fabric_covered';
            placement: string;
            visibility: 'hidden' | 'functional' | 'decorative';
        }>;
    };
    interior_construction: {
        neckline_interior_visible: boolean;
        interior_construction_type?: string;
        collar_construction?: string;
        lining_visible?: boolean;
        hollow_regions: Array<{
            region_type: 'neckline' | 'sleeves' | 'front_opening' | 'armholes' | 'other';
            keep_hollow: boolean;
            interior_description?: string;
        }>;
    };
    rendering_guidance: {
        lighting_preference: 'soft_diffused' | 'directional' | 'high_key' | 'dramatic';
        shadow_behavior: 'minimal_shadows' | 'soft_shadows' | 'defined_shadows' | 'dramatic_shadows';
        texture_emphasis: 'minimize' | 'subtle' | 'enhance' | 'maximize';
        detail_sharpness: 'soft' | 'natural' | 'sharp' | 'ultra_sharp';
        background_style: 'pure_white' | 'soft_gradient' | 'textured';
    };
    quality_targets: {
        commercial_grade_required: boolean;
        brand_compliance_level: 'standard' | 'premium' | 'luxury';
        detail_preservation_priority: 'minimal' | 'standard' | 'maximum';
    };
}
/**
 * DEPRECATED: Use existing FactsV3 + ControlBlock system instead
 * The consolidation.ts already preserves all commercial-critical data
 */
export declare function optimizeForCommercialFlash(analysis: AnalysisJSON, enrichment: EnrichmentJSON): CommercialOptimizedJSON;
/**
 * LEGACY: Basic optimization (18 fields) - Use only for token-constrained scenarios
 * For commercial use, prefer optimizeForCommercialFlash() instead
 */
export declare function optimizeForFlash(analysis: AnalysisJSON, enrichment: EnrichmentJSON): FlashOptimizedJSON;
/**
 * Generate OPTIMIZED prompt for Flash with structured JSON leverage
 * Optimized for visual truth, precision, and leveraging structured data
 */
export declare function generateFlashPrompt(optimizedJson: FlashOptimizedJSON): string;
/**
 * ENHANCED: Commercial-grade preparation with comprehensive data preservation
 */
export declare function prepareForCommercialFlash(analysis: AnalysisJSON, enrichment: EnrichmentJSON): {
    commercial_json: CommercialOptimizedJSON;
    prompt: string;
    token_analysis: {
        original_analysis_bytes: number;
        original_enrichment_bytes: number;
        commercial_optimized_bytes: number;
        reduction_pct: number;
        estimated_tokens: number;
        token_efficiency_ratio: number;
        commercial_features_preserved: number;
    };
};
/**
 * Generate professional commercial-grade prompt with enhanced data integration
 */
export declare function generateCommercialFlashPrompt(commercialJson: CommercialOptimizedJSON): string;
/**
 * LEGACY: All-in-one function for basic optimization (18 fields)
 */
export declare function prepareForFlash(analysis: AnalysisJSON, enrichment: EnrichmentJSON): {
    optimized_json: FlashOptimizedJSON;
    prompt: string;
    sizes: {
        original_analysis_bytes: number;
        original_enrichment_bytes: number;
        optimized_bytes: number;
        reduction_pct: number;
    };
};
/**
 * Direct Flash generation using optimized approach
 */
export declare function generateWithOptimizedJSON(analysis: AnalysisJSON, enrichment: EnrichmentJSON, images: {
    flatlayUrl: string;
    onModelUrl?: string;
}, sessionId: string): Promise<{
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
}>;

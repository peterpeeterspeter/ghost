import type { FactsV3, ControlBlock } from './consolidation';
/**
 * JSON Schema Types for Flash Image Prompt Payload v1
 */
export interface FlashImagePromptPayload {
    type: "flash_image_prompt_payload_v1";
    meta: {
        schema_version: "1.0";
        session_id: string;
    };
    images: ImageReference[];
    prompt_block: {
        base_prompt: string;
        language?: string;
    };
    facts_v3: FlashFactsV3;
    control_block: FlashControlBlock;
    transport_guardrails?: {
        max_px?: number;
        max_mb?: number;
        jpeg_quality_hint?: number;
    };
}
export interface ImageReference {
    role: "detail_B" | "on_model_A";
    url: string;
    mime_type?: string;
}
export interface FlashFactsV3 {
    category_generic: "top" | "bottom" | "dress" | "outerwear" | "knitwear" | "underwear" | "accessory" | "unknown";
    silhouette: string;
    required_components: string[];
    forbidden_components: string[];
    palette: {
        dominant_hex: string;
        accent_hex?: string;
        trim_hex?: string;
        pattern_hexes?: string[];
        region_hints?: Record<string, string>;
    };
    material: string;
    weave_knit: "woven" | "knit" | "nonwoven" | "unknown";
    drape_stiffness: number;
    transparency: "opaque" | "semi_sheer" | "sheer" | "semi_opaque";
    surface_sheen: "matte" | "subtle_sheen" | "glossy" | "metallic";
    pattern: string;
    print_scale: string;
    edge_finish: string;
    view: "front" | "back" | "side";
    framing_margin_pct: number;
    shadow_style: "soft" | "medium" | "hard";
    qa_targets?: {
        deltaE_max?: number;
        edge_halo_max_pct?: number;
        symmetry_tolerance_pct?: number;
        min_resolution_px?: number;
    };
    safety: {
        must_not: string[];
    };
    notes: string;
    structural_asymmetry: {
        expected: boolean;
        regions: string[];
    };
    label_visibility: "required" | "optional";
    continuity_rules: Record<string, string>;
}
export interface FlashControlBlock {
    lighting_preference: "soft_diffused" | "directional" | "high_key" | "dramatic";
    shadow_behavior: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
    detail_sharpness: "soft" | "natural" | "sharp" | "ultra_sharp";
    texture_emphasis: "minimize" | "subtle" | "enhance" | "maximize";
    color_fidelity_priority: "low" | "medium" | "high" | "critical";
    hollow_regions: {
        region_type: "neckline" | "sleeves" | "front_opening" | "armholes" | "other";
        keep_hollow: boolean;
        inner_visible: boolean;
        inner_description?: string;
    }[];
    label_rules: {
        preserve_all_readable: boolean;
        min_ocr_conf: number;
    };
}
/**
 * Generate JSON payload for Flash 2.5 Image generation
 */
export declare function generateFlashJsonPayload(facts: FactsV3, controlBlock: ControlBlock, sessionId: string, images: {
    flatlayUrl: string;
    onModelUrl?: string;
}): FlashImagePromptPayload;

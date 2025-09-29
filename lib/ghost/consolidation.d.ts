import { z } from "zod";
import type { AnalysisJSON, EnrichmentJSON } from '@/types/ghost';
export declare const PaletteSchemaLoose: z.ZodObject<{
    dominant_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
    accent_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
    trim_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
    pattern_hexes: z.ZodEffects<z.ZodDefault<z.ZodArray<z.ZodString, "many">>, string[], unknown>;
    region_hints: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, Record<string, string[]>, unknown>>;
}, "strip", z.ZodTypeAny, {
    dominant_hex?: string;
    accent_hex?: string;
    trim_hex?: string;
    pattern_hexes?: string[];
    region_hints?: Record<string, string[]>;
}, {
    dominant_hex?: unknown;
    accent_hex?: unknown;
    trim_hex?: unknown;
    pattern_hexes?: unknown;
    region_hints?: unknown;
}>;
export declare const FactsV3SchemaLoose: z.ZodObject<{
    category_generic: z.ZodCatch<z.ZodEnum<["top", "bottom", "dress", "outerwear", "knitwear", "underwear", "accessory", "unknown"]>>;
    silhouette: z.ZodDefault<z.ZodString>;
    required_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    forbidden_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    labels_found: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["brand", "size", "care", "composition", "origin", "price", "security_tag", "rfid", "other"]>;
        location: z.ZodString;
        text: z.ZodOptional<z.ZodString>;
        readable: z.ZodDefault<z.ZodBoolean>;
        preserve: z.ZodDefault<z.ZodBoolean>;
        visibility: z.ZodOptional<z.ZodEnum<["fully_visible", "partially_occluded", "edge_visible"]>>;
        color_hex: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
        location?: string;
        text?: string;
        readable?: boolean;
        preserve?: boolean;
        visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
        color_hex?: string;
    }, {
        type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
        location?: string;
        text?: string;
        readable?: boolean;
        preserve?: boolean;
        visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
        color_hex?: string;
    }>, "many">>;
    preserve_details: z.ZodDefault<z.ZodArray<z.ZodObject<{
        element: z.ZodString;
        priority: z.ZodDefault<z.ZodEnum<["critical", "important", "nice_to_have"]>>;
        location: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        element?: string;
        priority?: "critical" | "important" | "nice_to_have";
        notes?: string;
    }, {
        location?: string;
        element?: string;
        priority?: "critical" | "important" | "nice_to_have";
        notes?: string;
    }>, "many">>;
    hollow_regions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        region_type: z.ZodEnum<["neckline", "sleeves", "front_opening", "armholes", "other"]>;
        keep_hollow: z.ZodDefault<z.ZodBoolean>;
        inner_visible: z.ZodDefault<z.ZodBoolean>;
        inner_description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
        keep_hollow?: boolean;
        inner_visible?: boolean;
        inner_description?: string;
    }, {
        region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
        keep_hollow?: boolean;
        inner_visible?: boolean;
        inner_description?: string;
    }>, "many">>;
    construction_details: z.ZodDefault<z.ZodArray<z.ZodObject<{
        feature: z.ZodString;
        silhouette_rule: z.ZodString;
        critical_for_structure: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        feature?: string;
        silhouette_rule?: string;
        critical_for_structure?: boolean;
    }, {
        feature?: string;
        silhouette_rule?: string;
        critical_for_structure?: boolean;
    }>, "many">>;
    palette: z.ZodObject<{
        dominant_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        accent_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        trim_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        pattern_hexes: z.ZodEffects<z.ZodDefault<z.ZodArray<z.ZodString, "many">>, string[], unknown>;
        region_hints: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, Record<string, string[]>, unknown>>;
    }, "strip", z.ZodTypeAny, {
        dominant_hex?: string;
        accent_hex?: string;
        trim_hex?: string;
        pattern_hexes?: string[];
        region_hints?: Record<string, string[]>;
    }, {
        dominant_hex?: unknown;
        accent_hex?: unknown;
        trim_hex?: unknown;
        pattern_hexes?: unknown;
        region_hints?: unknown;
    }>;
    pattern: z.ZodDefault<z.ZodString>;
    print_scale: z.ZodDefault<z.ZodString>;
    material: z.ZodDefault<z.ZodString>;
    weave_knit: z.ZodCatch<z.ZodEnum<["woven", "knit", "nonwoven", "unknown"]>>;
    drape_stiffness: z.ZodDefault<z.ZodNumber>;
    transparency: z.ZodCatch<z.ZodEnum<["opaque", "semi_sheer", "sheer"]>>;
    surface_sheen: z.ZodCatch<z.ZodEnum<["matte", "subtle_sheen", "glossy"]>>;
    edge_finish: z.ZodDefault<z.ZodString>;
    color_precision: z.ZodOptional<z.ZodObject<{
        primary_hex: z.ZodOptional<z.ZodString>;
        secondary_hex: z.ZodOptional<z.ZodString>;
        color_temperature: z.ZodOptional<z.ZodEnum<["warm", "cool", "neutral"]>>;
        saturation_level: z.ZodOptional<z.ZodEnum<["muted", "moderate", "vibrant"]>>;
    }, "strip", z.ZodTypeAny, {
        primary_hex?: string;
        secondary_hex?: string;
        color_temperature?: "warm" | "cool" | "neutral";
        saturation_level?: "muted" | "moderate" | "vibrant";
    }, {
        primary_hex?: string;
        secondary_hex?: string;
        color_temperature?: "warm" | "cool" | "neutral";
        saturation_level?: "muted" | "moderate" | "vibrant";
    }>>;
    fabric_behavior: z.ZodOptional<z.ZodObject<{
        drape_quality: z.ZodOptional<z.ZodEnum<["crisp", "flowing", "structured", "fluid", "stiff"]>>;
        surface_sheen_detailed: z.ZodOptional<z.ZodEnum<["matte", "subtle_sheen", "glossy", "metallic"]>>;
        texture_depth: z.ZodOptional<z.ZodEnum<["flat", "subtle_texture", "pronounced_texture", "heavily_textured"]>>;
        transparency_level: z.ZodOptional<z.ZodEnum<["opaque", "semi_opaque", "translucent", "sheer"]>>;
    }, "strip", z.ZodTypeAny, {
        drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
        surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
        texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
        transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
    }, {
        drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
        surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
        texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
        transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
    }>>;
    construction_precision: z.ZodOptional<z.ZodObject<{
        seam_visibility: z.ZodOptional<z.ZodEnum<["hidden", "subtle", "visible", "decorative"]>>;
        edge_finishing: z.ZodOptional<z.ZodEnum<["raw", "serged", "bound", "rolled", "pinked"]>>;
        stitching_contrast: z.ZodOptional<z.ZodBoolean>;
        hardware_finish: z.ZodOptional<z.ZodEnum<["none", "matte_metal", "polished_metal", "plastic", "fabric_covered"]>>;
    }, "strip", z.ZodTypeAny, {
        seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
        edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
        stitching_contrast?: boolean;
        hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
    }, {
        seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
        edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
        stitching_contrast?: boolean;
        hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
    }>>;
    view: z.ZodDefault<z.ZodString>;
    framing_margin_pct: z.ZodDefault<z.ZodNumber>;
    shadow_style: z.ZodCatch<z.ZodEnum<["soft", "medium", "hard"]>>;
    lighting_preference: z.ZodOptional<z.ZodEnum<["soft_diffused", "directional", "high_key", "dramatic"]>>;
    shadow_behavior: z.ZodOptional<z.ZodEnum<["minimal_shadows", "soft_shadows", "defined_shadows", "dramatic_shadows"]>>;
    qa_targets: z.ZodDefault<z.ZodObject<{
        deltaE_max: z.ZodDefault<z.ZodNumber>;
        edge_halo_max_pct: z.ZodDefault<z.ZodNumber>;
        symmetry_tolerance_pct: z.ZodDefault<z.ZodNumber>;
        min_resolution_px: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        deltaE_max?: number;
        edge_halo_max_pct?: number;
        symmetry_tolerance_pct?: number;
        min_resolution_px?: number;
    }, {
        deltaE_max?: number;
        edge_halo_max_pct?: number;
        symmetry_tolerance_pct?: number;
        min_resolution_px?: number;
    }>>;
    safety: z.ZodDefault<z.ZodEffects<z.ZodObject<{
        must_not: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        must_not?: string[];
    }, {
        must_not?: string[];
    }>, {
        must_not?: string[];
    }, unknown>>;
    visual_references: z.ZodOptional<z.ZodObject<{
        flatlay: z.ZodObject<{
            file_uri: z.ZodString;
            mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
            role: z.ZodLiteral<"ground_truth_source">;
            instructions: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        }, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        }>;
        on_model: z.ZodOptional<z.ZodObject<{
            file_uri: z.ZodString;
            mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
            role: z.ZodLiteral<"proportions_only">;
            instructions: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        }, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        }>>;
        interior_detail: z.ZodOptional<z.ZodObject<{
            file_uri: z.ZodString;
            mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
            role: z.ZodLiteral<"interior_construction_reference">;
            instructions: z.ZodDefault<z.ZodString>;
            focus_areas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        }, {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        flatlay?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        };
        on_model?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        };
        interior_detail?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        };
    }, {
        flatlay?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        };
        on_model?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        };
        interior_detail?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        };
    }>>;
    notes: z.ZodOptional<z.ZodString>;
    structural_asymmetry: z.ZodOptional<z.ZodObject<{
        expected: z.ZodDefault<z.ZodBoolean>;
        regions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        expected?: boolean;
        regions?: string[];
    }, {
        expected?: boolean;
        regions?: string[];
    }>>;
    label_visibility: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
    continuity_rules: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
}, "strip", z.ZodTypeAny, {
    category_generic?: "top" | "bottom" | "dress" | "outerwear" | "knitwear" | "underwear" | "accessory" | "unknown";
    silhouette?: string;
    required_components?: string[];
    forbidden_components?: string[];
    labels_found?: {
        type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
        location?: string;
        text?: string;
        readable?: boolean;
        preserve?: boolean;
        visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
        color_hex?: string;
    }[];
    notes?: string;
    preserve_details?: {
        location?: string;
        element?: string;
        priority?: "critical" | "important" | "nice_to_have";
        notes?: string;
    }[];
    hollow_regions?: {
        region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
        keep_hollow?: boolean;
        inner_visible?: boolean;
        inner_description?: string;
    }[];
    construction_details?: {
        feature?: string;
        silhouette_rule?: string;
        critical_for_structure?: boolean;
    }[];
    palette?: {
        dominant_hex?: string;
        accent_hex?: string;
        trim_hex?: string;
        pattern_hexes?: string[];
        region_hints?: Record<string, string[]>;
    };
    pattern?: string;
    print_scale?: string;
    material?: string;
    weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
    drape_stiffness?: number;
    transparency?: "opaque" | "sheer" | "semi_sheer";
    surface_sheen?: "matte" | "subtle_sheen" | "glossy";
    edge_finish?: string;
    color_precision?: {
        primary_hex?: string;
        secondary_hex?: string;
        color_temperature?: "warm" | "cool" | "neutral";
        saturation_level?: "muted" | "moderate" | "vibrant";
    };
    fabric_behavior?: {
        drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
        surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
        texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
        transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
    };
    construction_precision?: {
        seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
        edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
        stitching_contrast?: boolean;
        hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
    };
    view?: string;
    framing_margin_pct?: number;
    shadow_style?: "medium" | "soft" | "hard";
    lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
    shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
    qa_targets?: {
        deltaE_max?: number;
        edge_halo_max_pct?: number;
        symmetry_tolerance_pct?: number;
        min_resolution_px?: number;
    };
    safety?: {
        must_not?: string[];
    };
    visual_references?: {
        flatlay?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        };
        on_model?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        };
        interior_detail?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        };
    };
    structural_asymmetry?: {
        expected?: boolean;
        regions?: string[];
    };
    label_visibility?: "required" | "optional";
    continuity_rules?: Record<string, string> | Record<string, any>;
}, {
    category_generic?: unknown;
    silhouette?: string;
    required_components?: string[];
    forbidden_components?: string[];
    labels_found?: {
        type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
        location?: string;
        text?: string;
        readable?: boolean;
        preserve?: boolean;
        visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
        color_hex?: string;
    }[];
    notes?: string;
    preserve_details?: {
        location?: string;
        element?: string;
        priority?: "critical" | "important" | "nice_to_have";
        notes?: string;
    }[];
    hollow_regions?: {
        region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
        keep_hollow?: boolean;
        inner_visible?: boolean;
        inner_description?: string;
    }[];
    construction_details?: {
        feature?: string;
        silhouette_rule?: string;
        critical_for_structure?: boolean;
    }[];
    palette?: {
        dominant_hex?: unknown;
        accent_hex?: unknown;
        trim_hex?: unknown;
        pattern_hexes?: unknown;
        region_hints?: unknown;
    };
    pattern?: string;
    print_scale?: string;
    material?: string;
    weave_knit?: unknown;
    drape_stiffness?: number;
    transparency?: unknown;
    surface_sheen?: unknown;
    edge_finish?: string;
    color_precision?: {
        primary_hex?: string;
        secondary_hex?: string;
        color_temperature?: "warm" | "cool" | "neutral";
        saturation_level?: "muted" | "moderate" | "vibrant";
    };
    fabric_behavior?: {
        drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
        surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
        texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
        transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
    };
    construction_precision?: {
        seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
        edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
        stitching_contrast?: boolean;
        hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
    };
    view?: string;
    framing_margin_pct?: number;
    shadow_style?: unknown;
    lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
    shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
    qa_targets?: {
        deltaE_max?: number;
        edge_halo_max_pct?: number;
        symmetry_tolerance_pct?: number;
        min_resolution_px?: number;
    };
    safety?: unknown;
    visual_references?: {
        flatlay?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "ground_truth_source";
            instructions?: string;
        };
        on_model?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "proportions_only";
            instructions?: string;
        };
        interior_detail?: {
            file_uri?: string;
            mime_type?: "image/jpeg" | "image/png";
            role?: "interior_construction_reference";
            instructions?: string;
            focus_areas?: string[];
        };
    };
    structural_asymmetry?: {
        expected?: boolean;
        regions?: string[];
    };
    label_visibility?: "required" | "optional";
    continuity_rules?: Record<string, string> | Record<string, any>;
}>;
export declare const ControlBlockSchemaLoose: z.ZodObject<{
    category_generic: z.ZodDefault<z.ZodString>;
    silhouette: z.ZodDefault<z.ZodString>;
    required_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    forbidden_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    palette: z.ZodObject<{
        dominant_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        accent_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        trim_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
        pattern_hexes: z.ZodEffects<z.ZodDefault<z.ZodArray<z.ZodString, "many">>, string[], unknown>;
        region_hints: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, Record<string, string[]>, unknown>>;
    }, "strip", z.ZodTypeAny, {
        dominant_hex?: string;
        accent_hex?: string;
        trim_hex?: string;
        pattern_hexes?: string[];
        region_hints?: Record<string, string[]>;
    }, {
        dominant_hex?: unknown;
        accent_hex?: unknown;
        trim_hex?: unknown;
        pattern_hexes?: unknown;
        region_hints?: unknown;
    }>;
    material: z.ZodDefault<z.ZodString>;
    drape_stiffness: z.ZodDefault<z.ZodNumber>;
    edge_finish: z.ZodDefault<z.ZodString>;
    view: z.ZodDefault<z.ZodString>;
    framing_margin_pct: z.ZodDefault<z.ZodNumber>;
    shadow_style: z.ZodDefault<z.ZodString>;
    safety: z.ZodDefault<z.ZodEffects<z.ZodObject<{
        must_not: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        must_not?: string[];
    }, {
        must_not?: string[];
    }>, {
        must_not?: string[];
    }, unknown>>;
    label_visibility: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
    continuity_rules: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
    structural_asymmetry: z.ZodOptional<z.ZodObject<{
        expected: z.ZodDefault<z.ZodBoolean>;
        regions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        expected?: boolean;
        regions?: string[];
    }, {
        expected?: boolean;
        regions?: string[];
    }>>;
    weave_knit: z.ZodDefault<z.ZodEnum<["woven", "knit", "nonwoven", "unknown"]>>;
    transparency: z.ZodDefault<z.ZodEnum<["opaque", "semi_sheer", "sheer"]>>;
    surface_sheen: z.ZodDefault<z.ZodEnum<["matte", "subtle_sheen", "glossy"]>>;
}, "strip", z.ZodTypeAny, {
    category_generic?: string;
    silhouette?: string;
    required_components?: string[];
    forbidden_components?: string[];
    palette?: {
        dominant_hex?: string;
        accent_hex?: string;
        trim_hex?: string;
        pattern_hexes?: string[];
        region_hints?: Record<string, string[]>;
    };
    material?: string;
    weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
    drape_stiffness?: number;
    transparency?: "opaque" | "sheer" | "semi_sheer";
    surface_sheen?: "matte" | "subtle_sheen" | "glossy";
    edge_finish?: string;
    view?: string;
    framing_margin_pct?: number;
    shadow_style?: string;
    safety?: {
        must_not?: string[];
    };
    structural_asymmetry?: {
        expected?: boolean;
        regions?: string[];
    };
    label_visibility?: "required" | "optional";
    continuity_rules?: Record<string, string> | Record<string, any>;
}, {
    category_generic?: string;
    silhouette?: string;
    required_components?: string[];
    forbidden_components?: string[];
    palette?: {
        dominant_hex?: unknown;
        accent_hex?: unknown;
        trim_hex?: unknown;
        pattern_hexes?: unknown;
        region_hints?: unknown;
    };
    material?: string;
    weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
    drape_stiffness?: number;
    transparency?: "opaque" | "sheer" | "semi_sheer";
    surface_sheen?: "matte" | "subtle_sheen" | "glossy";
    edge_finish?: string;
    view?: string;
    framing_margin_pct?: number;
    shadow_style?: string;
    safety?: unknown;
    structural_asymmetry?: {
        expected?: boolean;
        regions?: string[];
    };
    label_visibility?: "required" | "optional";
    continuity_rules?: Record<string, string> | Record<string, any>;
}>;
export declare const ConflictSchema: z.ZodObject<{
    field: z.ZodString;
    json_a: z.ZodAny;
    json_b: z.ZodAny;
    resolution: z.ZodAny;
    source_of_truth: z.ZodEnum<["visual", "json_a", "json_b"]>;
    confidence: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    field?: string;
    json_a?: any;
    json_b?: any;
    resolution?: any;
    source_of_truth?: "json_a" | "json_b" | "visual";
    confidence?: number;
}, {
    field?: string;
    json_a?: any;
    json_b?: any;
    resolution?: any;
    source_of_truth?: "json_a" | "json_b" | "visual";
    confidence?: number;
}>;
export declare const QAReportSchema: z.ZodObject<{
    overall_quality_score: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, unknown>;
    deltas: z.ZodDefault<z.ZodArray<z.ZodObject<{
        metric: z.ZodString;
        current_value: z.ZodEffects<z.ZodNumber, number, unknown>;
        target_value: z.ZodEffects<z.ZodNumber, number, unknown>;
        correction_prompt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        metric?: string;
        current_value?: number;
        target_value?: number;
        correction_prompt?: string;
    }, {
        metric?: string;
        current_value?: unknown;
        target_value?: unknown;
        correction_prompt?: string;
    }>, "many">>;
    passed: z.ZodEffects<z.ZodDefault<z.ZodBoolean>, boolean, unknown>;
}, "strip", z.ZodTypeAny, {
    overall_quality_score?: number;
    deltas?: {
        metric?: string;
        current_value?: number;
        target_value?: number;
        correction_prompt?: string;
    }[];
    passed?: boolean;
}, {
    overall_quality_score?: unknown;
    deltas?: {
        metric?: string;
        current_value?: unknown;
        target_value?: unknown;
        correction_prompt?: string;
    }[];
    passed?: unknown;
}>;
export declare const ConsolidationOutputSchemaLoose: z.ZodObject<{
    conflicts_found: z.ZodDefault<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        json_a: z.ZodAny;
        json_b: z.ZodAny;
        resolution: z.ZodAny;
        source_of_truth: z.ZodEnum<["visual", "json_a", "json_b"]>;
        confidence: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        field?: string;
        json_a?: any;
        json_b?: any;
        resolution?: any;
        source_of_truth?: "json_a" | "json_b" | "visual";
        confidence?: number;
    }, {
        field?: string;
        json_a?: any;
        json_b?: any;
        resolution?: any;
        source_of_truth?: "json_a" | "json_b" | "visual";
        confidence?: number;
    }>, "many">>;
    facts_v3: z.ZodObject<{
        category_generic: z.ZodCatch<z.ZodEnum<["top", "bottom", "dress", "outerwear", "knitwear", "underwear", "accessory", "unknown"]>>;
        silhouette: z.ZodDefault<z.ZodString>;
        required_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        forbidden_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        labels_found: z.ZodDefault<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["brand", "size", "care", "composition", "origin", "price", "security_tag", "rfid", "other"]>;
            location: z.ZodString;
            text: z.ZodOptional<z.ZodString>;
            readable: z.ZodDefault<z.ZodBoolean>;
            preserve: z.ZodDefault<z.ZodBoolean>;
            visibility: z.ZodOptional<z.ZodEnum<["fully_visible", "partially_occluded", "edge_visible"]>>;
            color_hex: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }, {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }>, "many">>;
        preserve_details: z.ZodDefault<z.ZodArray<z.ZodObject<{
            element: z.ZodString;
            priority: z.ZodDefault<z.ZodEnum<["critical", "important", "nice_to_have"]>>;
            location: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }, {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }>, "many">>;
        hollow_regions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            region_type: z.ZodEnum<["neckline", "sleeves", "front_opening", "armholes", "other"]>;
            keep_hollow: z.ZodDefault<z.ZodBoolean>;
            inner_visible: z.ZodDefault<z.ZodBoolean>;
            inner_description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }, {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }>, "many">>;
        construction_details: z.ZodDefault<z.ZodArray<z.ZodObject<{
            feature: z.ZodString;
            silhouette_rule: z.ZodString;
            critical_for_structure: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }, {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }>, "many">>;
        palette: z.ZodObject<{
            dominant_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            accent_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            trim_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            pattern_hexes: z.ZodEffects<z.ZodDefault<z.ZodArray<z.ZodString, "many">>, string[], unknown>;
            region_hints: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, Record<string, string[]>, unknown>>;
        }, "strip", z.ZodTypeAny, {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        }, {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        }>;
        pattern: z.ZodDefault<z.ZodString>;
        print_scale: z.ZodDefault<z.ZodString>;
        material: z.ZodDefault<z.ZodString>;
        weave_knit: z.ZodCatch<z.ZodEnum<["woven", "knit", "nonwoven", "unknown"]>>;
        drape_stiffness: z.ZodDefault<z.ZodNumber>;
        transparency: z.ZodCatch<z.ZodEnum<["opaque", "semi_sheer", "sheer"]>>;
        surface_sheen: z.ZodCatch<z.ZodEnum<["matte", "subtle_sheen", "glossy"]>>;
        edge_finish: z.ZodDefault<z.ZodString>;
        color_precision: z.ZodOptional<z.ZodObject<{
            primary_hex: z.ZodOptional<z.ZodString>;
            secondary_hex: z.ZodOptional<z.ZodString>;
            color_temperature: z.ZodOptional<z.ZodEnum<["warm", "cool", "neutral"]>>;
            saturation_level: z.ZodOptional<z.ZodEnum<["muted", "moderate", "vibrant"]>>;
        }, "strip", z.ZodTypeAny, {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        }, {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        }>>;
        fabric_behavior: z.ZodOptional<z.ZodObject<{
            drape_quality: z.ZodOptional<z.ZodEnum<["crisp", "flowing", "structured", "fluid", "stiff"]>>;
            surface_sheen_detailed: z.ZodOptional<z.ZodEnum<["matte", "subtle_sheen", "glossy", "metallic"]>>;
            texture_depth: z.ZodOptional<z.ZodEnum<["flat", "subtle_texture", "pronounced_texture", "heavily_textured"]>>;
            transparency_level: z.ZodOptional<z.ZodEnum<["opaque", "semi_opaque", "translucent", "sheer"]>>;
        }, "strip", z.ZodTypeAny, {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        }, {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        }>>;
        construction_precision: z.ZodOptional<z.ZodObject<{
            seam_visibility: z.ZodOptional<z.ZodEnum<["hidden", "subtle", "visible", "decorative"]>>;
            edge_finishing: z.ZodOptional<z.ZodEnum<["raw", "serged", "bound", "rolled", "pinked"]>>;
            stitching_contrast: z.ZodOptional<z.ZodBoolean>;
            hardware_finish: z.ZodOptional<z.ZodEnum<["none", "matte_metal", "polished_metal", "plastic", "fabric_covered"]>>;
        }, "strip", z.ZodTypeAny, {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        }, {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        }>>;
        view: z.ZodDefault<z.ZodString>;
        framing_margin_pct: z.ZodDefault<z.ZodNumber>;
        shadow_style: z.ZodCatch<z.ZodEnum<["soft", "medium", "hard"]>>;
        lighting_preference: z.ZodOptional<z.ZodEnum<["soft_diffused", "directional", "high_key", "dramatic"]>>;
        shadow_behavior: z.ZodOptional<z.ZodEnum<["minimal_shadows", "soft_shadows", "defined_shadows", "dramatic_shadows"]>>;
        qa_targets: z.ZodDefault<z.ZodObject<{
            deltaE_max: z.ZodDefault<z.ZodNumber>;
            edge_halo_max_pct: z.ZodDefault<z.ZodNumber>;
            symmetry_tolerance_pct: z.ZodDefault<z.ZodNumber>;
            min_resolution_px: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        }, {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        }>>;
        safety: z.ZodDefault<z.ZodEffects<z.ZodObject<{
            must_not: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            must_not?: string[];
        }, {
            must_not?: string[];
        }>, {
            must_not?: string[];
        }, unknown>>;
        visual_references: z.ZodOptional<z.ZodObject<{
            flatlay: z.ZodObject<{
                file_uri: z.ZodString;
                mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
                role: z.ZodLiteral<"ground_truth_source">;
                instructions: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            }, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            }>;
            on_model: z.ZodOptional<z.ZodObject<{
                file_uri: z.ZodString;
                mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
                role: z.ZodLiteral<"proportions_only">;
                instructions: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            }, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            }>>;
            interior_detail: z.ZodOptional<z.ZodObject<{
                file_uri: z.ZodString;
                mime_type: z.ZodEnum<["image/jpeg", "image/png"]>;
                role: z.ZodLiteral<"interior_construction_reference">;
                instructions: z.ZodDefault<z.ZodString>;
                focus_areas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            }, {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        }, {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        }>>;
        notes: z.ZodOptional<z.ZodString>;
        structural_asymmetry: z.ZodOptional<z.ZodObject<{
            expected: z.ZodDefault<z.ZodBoolean>;
            regions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            expected?: boolean;
            regions?: string[];
        }, {
            expected?: boolean;
            regions?: string[];
        }>>;
        label_visibility: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
        continuity_rules: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
    }, "strip", z.ZodTypeAny, {
        category_generic?: "top" | "bottom" | "dress" | "outerwear" | "knitwear" | "underwear" | "accessory" | "unknown";
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        labels_found?: {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }[];
        notes?: string;
        preserve_details?: {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }[];
        hollow_regions?: {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }[];
        construction_details?: {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }[];
        palette?: {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        };
        pattern?: string;
        print_scale?: string;
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        color_precision?: {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        };
        fabric_behavior?: {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        };
        construction_precision?: {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        };
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: "medium" | "soft" | "hard";
        lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
        shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
        qa_targets?: {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        };
        safety?: {
            must_not?: string[];
        };
        visual_references?: {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    }, {
        category_generic?: unknown;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        labels_found?: {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }[];
        notes?: string;
        preserve_details?: {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }[];
        hollow_regions?: {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }[];
        construction_details?: {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }[];
        palette?: {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        };
        pattern?: string;
        print_scale?: string;
        material?: string;
        weave_knit?: unknown;
        drape_stiffness?: number;
        transparency?: unknown;
        surface_sheen?: unknown;
        edge_finish?: string;
        color_precision?: {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        };
        fabric_behavior?: {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        };
        construction_precision?: {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        };
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: unknown;
        lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
        shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
        qa_targets?: {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        };
        safety?: unknown;
        visual_references?: {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    }>;
    control_block: z.ZodObject<{
        category_generic: z.ZodDefault<z.ZodString>;
        silhouette: z.ZodDefault<z.ZodString>;
        required_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        forbidden_components: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        palette: z.ZodObject<{
            dominant_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            accent_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            trim_hex: z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>;
            pattern_hexes: z.ZodEffects<z.ZodDefault<z.ZodArray<z.ZodString, "many">>, string[], unknown>;
            region_hints: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, Record<string, string[]>, unknown>>;
        }, "strip", z.ZodTypeAny, {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        }, {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        }>;
        material: z.ZodDefault<z.ZodString>;
        drape_stiffness: z.ZodDefault<z.ZodNumber>;
        edge_finish: z.ZodDefault<z.ZodString>;
        view: z.ZodDefault<z.ZodString>;
        framing_margin_pct: z.ZodDefault<z.ZodNumber>;
        shadow_style: z.ZodDefault<z.ZodString>;
        safety: z.ZodDefault<z.ZodEffects<z.ZodObject<{
            must_not: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            must_not?: string[];
        }, {
            must_not?: string[];
        }>, {
            must_not?: string[];
        }, unknown>>;
        label_visibility: z.ZodDefault<z.ZodEnum<["required", "optional"]>>;
        continuity_rules: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodString>, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
        structural_asymmetry: z.ZodOptional<z.ZodObject<{
            expected: z.ZodDefault<z.ZodBoolean>;
            regions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            expected?: boolean;
            regions?: string[];
        }, {
            expected?: boolean;
            regions?: string[];
        }>>;
        weave_knit: z.ZodDefault<z.ZodEnum<["woven", "knit", "nonwoven", "unknown"]>>;
        transparency: z.ZodDefault<z.ZodEnum<["opaque", "semi_sheer", "sheer"]>>;
        surface_sheen: z.ZodDefault<z.ZodEnum<["matte", "subtle_sheen", "glossy"]>>;
    }, "strip", z.ZodTypeAny, {
        category_generic?: string;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        palette?: {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        };
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: string;
        safety?: {
            must_not?: string[];
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    }, {
        category_generic?: string;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        palette?: {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        };
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: string;
        safety?: unknown;
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    }>;
    processing_time: z.ZodOptional<z.ZodNumber>;
    session_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conflicts_found?: {
        field?: string;
        json_a?: any;
        json_b?: any;
        resolution?: any;
        source_of_truth?: "json_a" | "json_b" | "visual";
        confidence?: number;
    }[];
    facts_v3?: {
        category_generic?: "top" | "bottom" | "dress" | "outerwear" | "knitwear" | "underwear" | "accessory" | "unknown";
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        labels_found?: {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }[];
        notes?: string;
        preserve_details?: {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }[];
        hollow_regions?: {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }[];
        construction_details?: {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }[];
        palette?: {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        };
        pattern?: string;
        print_scale?: string;
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        color_precision?: {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        };
        fabric_behavior?: {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        };
        construction_precision?: {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        };
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: "medium" | "soft" | "hard";
        lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
        shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
        qa_targets?: {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        };
        safety?: {
            must_not?: string[];
        };
        visual_references?: {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    };
    control_block?: {
        category_generic?: string;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        palette?: {
            dominant_hex?: string;
            accent_hex?: string;
            trim_hex?: string;
            pattern_hexes?: string[];
            region_hints?: Record<string, string[]>;
        };
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: string;
        safety?: {
            must_not?: string[];
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    };
    processing_time?: number;
    session_id?: string;
}, {
    conflicts_found?: {
        field?: string;
        json_a?: any;
        json_b?: any;
        resolution?: any;
        source_of_truth?: "json_a" | "json_b" | "visual";
        confidence?: number;
    }[];
    facts_v3?: {
        category_generic?: unknown;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        labels_found?: {
            type?: "brand" | "size" | "care" | "composition" | "origin" | "price" | "security_tag" | "rfid" | "other";
            location?: string;
            text?: string;
            readable?: boolean;
            preserve?: boolean;
            visibility?: "fully_visible" | "partially_occluded" | "edge_visible";
            color_hex?: string;
        }[];
        notes?: string;
        preserve_details?: {
            location?: string;
            element?: string;
            priority?: "critical" | "important" | "nice_to_have";
            notes?: string;
        }[];
        hollow_regions?: {
            region_type?: "other" | "neckline" | "sleeves" | "front_opening" | "armholes";
            keep_hollow?: boolean;
            inner_visible?: boolean;
            inner_description?: string;
        }[];
        construction_details?: {
            feature?: string;
            silhouette_rule?: string;
            critical_for_structure?: boolean;
        }[];
        palette?: {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        };
        pattern?: string;
        print_scale?: string;
        material?: string;
        weave_knit?: unknown;
        drape_stiffness?: number;
        transparency?: unknown;
        surface_sheen?: unknown;
        edge_finish?: string;
        color_precision?: {
            primary_hex?: string;
            secondary_hex?: string;
            color_temperature?: "warm" | "cool" | "neutral";
            saturation_level?: "muted" | "moderate" | "vibrant";
        };
        fabric_behavior?: {
            drape_quality?: "crisp" | "flowing" | "structured" | "fluid" | "stiff";
            surface_sheen_detailed?: "matte" | "subtle_sheen" | "glossy" | "metallic";
            texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured";
            transparency_level?: "opaque" | "semi_opaque" | "translucent" | "sheer";
        };
        construction_precision?: {
            seam_visibility?: "hidden" | "subtle" | "visible" | "decorative";
            edge_finishing?: "raw" | "serged" | "bound" | "rolled" | "pinked";
            stitching_contrast?: boolean;
            hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered";
        };
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: unknown;
        lighting_preference?: "soft_diffused" | "directional" | "high_key" | "dramatic";
        shadow_behavior?: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows";
        qa_targets?: {
            deltaE_max?: number;
            edge_halo_max_pct?: number;
            symmetry_tolerance_pct?: number;
            min_resolution_px?: number;
        };
        safety?: unknown;
        visual_references?: {
            flatlay?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "ground_truth_source";
                instructions?: string;
            };
            on_model?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "proportions_only";
                instructions?: string;
            };
            interior_detail?: {
                file_uri?: string;
                mime_type?: "image/jpeg" | "image/png";
                role?: "interior_construction_reference";
                instructions?: string;
                focus_areas?: string[];
            };
        };
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    };
    control_block?: {
        category_generic?: string;
        silhouette?: string;
        required_components?: string[];
        forbidden_components?: string[];
        palette?: {
            dominant_hex?: unknown;
            accent_hex?: unknown;
            trim_hex?: unknown;
            pattern_hexes?: unknown;
            region_hints?: unknown;
        };
        material?: string;
        weave_knit?: "unknown" | "woven" | "knit" | "nonwoven";
        drape_stiffness?: number;
        transparency?: "opaque" | "sheer" | "semi_sheer";
        surface_sheen?: "matte" | "subtle_sheen" | "glossy";
        edge_finish?: string;
        view?: string;
        framing_margin_pct?: number;
        shadow_style?: string;
        safety?: unknown;
        structural_asymmetry?: {
            expected?: boolean;
            regions?: string[];
        };
        label_visibility?: "required" | "optional";
        continuity_rules?: Record<string, string> | Record<string, any>;
    };
    processing_time?: number;
    session_id?: string;
}>;
export type PaletteType = z.infer<typeof PaletteSchemaLoose>;
export type FactsV3 = z.infer<typeof FactsV3SchemaLoose>;
export type ControlBlock = z.infer<typeof ControlBlockSchemaLoose>;
export type ConflictDetection = z.infer<typeof ConflictSchema>;
export type QAReport = z.infer<typeof QAReportSchema>;
export type ConsolidationOutput = z.infer<typeof ConsolidationOutputSchemaLoose>;
export declare function normalizeFacts(f: FactsV3): FactsV3;
export declare function normalizeControlBlock(c: ControlBlock, factsFallback: FactsV3): ControlBlock;
export declare function stableHash(input: string): number;
export declare function consolidateAnalyses(jsonA: AnalysisJSON, jsonB: EnrichmentJSON, refs: {
    cleanedImageUrl: string;
    onModelUrl?: string;
}, sessionId: string): Promise<ConsolidationOutput>;
export declare function compileControlBlock(facts: FactsV3): ControlBlock;
/**
 * Dynamic Flash 2.5 prompt builder using Gemini Pro 2.5 for intelligent integration
 * This replaces the static template approach with AI-powered data weaving
 */
export declare function buildDynamicFlashPrompt(facts: FactsV3, control: ControlBlock, sessionId: string, useStructuredPrompt?: boolean, useExpertPrompt?: boolean): Promise<string>;
/**
 * Legacy static prompt builder (used as fallback)
 */
export declare function buildStaticFlashPrompt(control: ControlBlock): string;
/**
 * Legacy alias for backwards compatibility
 */
export declare function buildFlashPrompt(control: ControlBlock): string;
/**
 * Simple English prompt builder (Chinese version removed)
 */
export declare function buildSeeDreamPrompt(control: ControlBlock, facts?: FactsV3): string;
export declare function qaLoop(imageUrl: string, facts: FactsV3, sessionId: string): Promise<QAReport>;
export declare class RetriableError extends Error {
}
export declare class NonRetriableError extends Error {
}

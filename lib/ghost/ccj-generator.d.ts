import type { FactsV3, ControlBlock } from './consolidation';
/**
 * Core Contract JSON (CCJ) - Minimal but binding constraints
 * This is the small, rigid set of must-obey fields (0.8-1.5 KB)
 */
export interface CoreContractJSON {
    v: "gm-ccj-1.0";
    garment_id: string;
    category: string;
    silhouette: string;
    pattern: string;
    colors_hex: string[];
    parts: {
        neckline: {
            type: string;
            stance_deg?: number;
        };
        sleeves: {
            length: string;
            cuff?: string;
            gauntlet_placket?: boolean;
        };
        placket?: {
            buttons: number;
            spacing_mm: number;
        };
        hem: {
            shape: string;
            depth_mm: number;
        };
    };
    proportions: {
        shoulder_w: number;
        torso_l: number;
        sleeve_l: number;
    };
    rules: {
        texture_source: "B_flatlay_truth";
        proportion_source: "A_personless_only";
        bg: "#FFFFFF";
        ghost: true;
    };
}
/**
 * Hints JSON - Compressed additional data (optional to pass to model)
 * Contains the remaining ~70 fields with compressed keys
 */
export interface HintsJSON {
    v: "gm-hints-1.0";
    fab: {
        mat?: string;
        weave?: string;
        drape?: number;
        trans?: string;
        sheen?: string;
    };
    const: {
        edge_fin?: string;
        req_comp?: string[];
        forb_comp?: string[];
        stch_vis?: string;
        hrdw_fin?: string;
    };
    qa: {
        deltaE_max?: number;
        edge_halo_max?: number;
        sym_tol?: number;
        min_res?: number;
    };
    render: {
        light_pref?: string;
        shadow_bhv?: string;
        detail_sharp?: string;
        tex_emph?: string;
    };
    safety?: string[];
    meta?: {
        notes?: string;
        asym_exp?: boolean;
        asym_reg?: string[];
        label_vis?: string;
    };
}
/**
 * Generate Core Contract JSON from analysis data
 */
export declare function generateCoreContract(facts: FactsV3, sessionId: string): CoreContractJSON;
/**
 * Generate Hints JSON from analysis data
 */
export declare function generateHints(facts: FactsV3, controlBlock: ControlBlock): HintsJSON;
/**
 * Generate digest for CCJ (first 12 chars of SHA256)
 */
export declare function generateCCJDigest(ccj: CoreContractJSON): string;
/**
 * Generate the short prompt template with inlined CCJ
 */
export declare function generateShortPrompt(ccj: CoreContractJSON, digest: string): string;
/**
 * Complete CCJ generation package
 */
export interface CCJPackage {
    ccj: CoreContractJSON;
    hints: HintsJSON;
    digest: string;
    prompt: string;
    sizes: {
        ccj_bytes: number;
        hints_bytes: number;
        total_bytes: number;
    };
}
export declare function generateCCJPackage(facts: FactsV3, controlBlock: ControlBlock, sessionId: string): CCJPackage;

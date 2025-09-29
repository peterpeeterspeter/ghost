/**
 * CCJ Integration Adapter
 *
 * This adapter allows the CCJ pipeline to seamlessly integrate with the existing
 * Ghost Mannequin Pipeline by converting the existing AnalysisJSON and EnrichmentJSON
 * into CCJ format and orchestrating the CCJ-based generation.
 */
import type { AnalysisJSON, EnrichmentJSON } from '@/types/ghost';
import type { FactsV3, ControlBlock } from './consolidation';
import { type CCJPipelineConfig, type CCJPipelineResult } from './ccj-pipeline';
/**
 * Integration modes for CCJ pipeline
 */
export type CCJIntegrationMode = 'replace_consolidation' | 'parallel_comparison' | 'ccj_only';
/**
 * Configuration for CCJ integration
 */
export interface CCJIntegrationConfig extends CCJPipelineConfig {
    mode: CCJIntegrationMode;
    fallbackToLegacy: boolean;
    compareResults: boolean;
    preferCCJResults: boolean;
}
export declare const DEFAULT_CCJ_INTEGRATION_CONFIG: CCJIntegrationConfig;
/**
 * Adapter Result - combines CCJ with legacy pipeline result format
 */
export interface CCJIntegrationResult {
    ccj_result: CCJPipelineResult;
    legacy_compatible: {
        renderUrl: string;
        processingTime: number;
        facts_v3?: FactsV3;
        control_block?: ControlBlock;
    };
    integration_meta: {
        mode_used: CCJIntegrationMode;
        ccj_success: boolean;
        legacy_fallback_used: boolean;
        performance_comparison?: {
            ccj_time_ms: number;
            legacy_time_ms?: number;
            size_reduction_pct: number;
            qa_score_improvement?: number;
        };
    };
}
/**
 * Main CCJ Integration Function
 *
 * This function takes the SAME inputs as your existing consolidation step
 * and orchestrates CCJ processing while maintaining backward compatibility.
 *
 * @param analysis - Your existing AnalysisJSON from step 2 ✅
 * @param enrichment - Your existing EnrichmentJSON from step 3 ✅
 * @param imageRefs - Same image references from your pipeline
 * @param sessionId - Your existing session ID
 * @param config - CCJ integration configuration
 */
export declare function integrateCCJWithExistingPipeline(analysis: AnalysisJSON, // ✅ FROM YOUR EXISTING STEP 2
enrichment: EnrichmentJSON, // ✅ FROM YOUR EXISTING STEP 3
imageRefs: {
    cleanedImageUrl: string;
    onModelUrl?: string;
}, sessionId: string, config?: CCJIntegrationConfig): Promise<CCJIntegrationResult>;
/**
 * Check if CCJ integration is enabled via environment variable
 */
export declare function shouldUseCCJPipeline(): boolean;
/**
 * Get CCJ integration mode from environment
 */
export declare function getCCJIntegrationMode(): CCJIntegrationMode;

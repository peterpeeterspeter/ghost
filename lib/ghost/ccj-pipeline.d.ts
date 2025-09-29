import type { FactsV3, ControlBlock } from './consolidation';
import { type CCJPackage } from './ccj-generator';
import { type QAResult, type QAStorageRecord } from './ccj-qa';
/**
 * CCJ Pipeline Configuration
 */
export interface CCJPipelineConfig {
    enableQA: boolean;
    enableRetry: boolean;
    maxImageSize: number;
    retryImageSize: number;
    enableHintsPassthrough: boolean;
    forceShortPrompt: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export declare const DEFAULT_CCJ_CONFIG: CCJPipelineConfig;
/**
 * CCJ Pipeline Result
 */
export interface CCJPipelineResult {
    success: boolean;
    generated_image_url?: string;
    ccj_package: CCJPackage;
    qa_result?: QAResult;
    qa_storage_record?: QAStorageRecord;
    retry_used: boolean;
    execution_time_ms: number;
    error?: string;
    sizes: {
        ccj_bytes: number;
        hints_bytes: number;
        prompt_chars: number;
        total_payload_size: number;
    };
}
/**
 * Main CCJ Pipeline Orchestrator
 * Implements the two-tier JSON approach with Core Contract + Hints
 */
export declare function processCCJGhostMannequin(facts: FactsV3, controlBlock: ControlBlock, sessionId: string, images: {
    flatlayUrl: string;
    onModelUrl?: string;
}, config?: CCJPipelineConfig): Promise<CCJPipelineResult>;
/**
 * Utility function to downscale image URLs (if needed)
 */
export declare function prepareImageForSize(imageUrl: string, maxSize: number): string;
/**
 * Extract key metrics from CCJ pipeline result
 */
export declare function extractCCJMetrics(result: CCJPipelineResult): {
    ccj_efficiency: number;
    qa_score: number;
    retry_rate: number;
    execution_speed: number;
};

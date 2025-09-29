import type { CoreContractJSON } from './ccj-generator';
/**
 * QA Result structure mapped to CCJ constraints
 */
export interface QAResult {
    run_id: string;
    digest: string;
    deltaE00_mean: number;
    deltaE00_max: number;
    buttons: {
        expected: number;
        found: number;
        match: boolean;
    };
    cavities_ok: boolean;
    proportions_ok: boolean;
    retry_used: boolean;
    passed: boolean;
    errors: string[];
    execution_time_ms: number;
}
/**
 * QA Configuration for validation thresholds
 */
export interface QAConfig {
    deltaE00_mean_max: number;
    deltaE00_max_threshold: number;
    proportions_tolerance_pct: number;
    cavity_edge_threshold: number;
}
export declare const DEFAULT_QA_CONFIG: QAConfig;
/**
 * Lightweight QA validation against CCJ constraints
 */
export declare function validateAgainstCCJ(generatedImageUrl: string, flatlayImageUrl: string, ccj: CoreContractJSON, digest: string, config?: QAConfig): Promise<QAResult>;
/**
 * Generate retry parameters for failed QA
 */
export declare function generateRetryParameters(originalQA: QAResult): {
    downscaleImages: boolean;
    shortenPrompt: boolean;
    adjustParameters: boolean;
};
/**
 * Store QA results for audit trail
 */
export interface QAStorageRecord {
    session_id: string;
    ccj_digest: string;
    qa_result: QAResult;
    ccj_data: CoreContractJSON;
    generated_image_url: string;
    retry_attempt: number;
    timestamp: string;
}
export declare function createQAStorageRecord(sessionId: string, ccj: CoreContractJSON, qaResult: QAResult, generatedImageUrl: string, retryAttempt?: number): QAStorageRecord;

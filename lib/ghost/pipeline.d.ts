import { GhostRequest, GhostResult, GhostPipelineError, BackgroundRemovalResult, GarmentAnalysisResult, GarmentEnrichmentResult, GhostMannequinResult, ProcessingStage } from '@/types/ghost';
import { type ConsolidationOutput, type QAReport } from './consolidation';
interface PipelineOptions {
    falApiKey: string;
    geminiApiKey: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    enableLogging?: boolean;
    renderingModel?: 'freepik-gemini' | 'gemini-flash' | 'seedream' | 'ai-studio';
    timeouts?: {
        backgroundRemoval?: number;
        analysis?: number;
        enrichment?: number;
        consolidation?: number;
        rendering?: number;
        qa?: number;
    };
    enableQaLoop?: boolean;
    maxQaIterations?: number;
}
interface PipelineState {
    sessionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startTime: number;
    currentStage: ProcessingStage | null;
    originalRequest?: GhostRequest;
    stageResults: {
        backgroundRemovalFlatlay?: BackgroundRemovalResult;
        backgroundRemovalOnModel?: BackgroundRemovalResult;
        analysis?: GarmentAnalysisResult;
        enrichment?: GarmentEnrichmentResult;
        consolidation?: ConsolidationOutput;
        rendering?: GhostMannequinResult;
        qaReport?: QAReport;
    };
    error?: GhostPipelineError;
}
/**
 * Main Ghost Mannequin Pipeline class
 * Orchestrates the entire process from flatlay to ghost mannequin
 */
export declare class GhostMannequinPipeline {
    private options;
    private state;
    constructor(options: PipelineOptions);
    /**
     * Initialize API clients with provided keys
     */
    private initializeClients;
    /**
     * Process a ghost mannequin request through the entire pipeline
     * @param request - Ghost mannequin request with flatlay and optional on-model images
     * @returns Promise<GhostResult> - Complete processing result
     */
    process(request: GhostRequest): Promise<GhostResult>;
    /**
     * Execute a pipeline stage with error handling
     * @param stage - The stage being executed
     * @param executor - Function that executes the stage logic
     */
    private executeStage;
    /**
     * Execute a promise with timeout
     * @param promise - Promise to execute
     * @param timeout - Timeout in milliseconds
     * @param stage - Current processing stage for error context
     */
    private executeWithTimeout;
    /**
     * Validate the incoming request
     * @param request - Request to validate
     */
    private validateRequest;
    /**
     * Build the final result object
     */
    private buildResult;
    /**
     * Generate with OPTIMIZED JSON approach (SIMPLE - like jsonprompt.it)
     */
    private generateWithOptimizedJSON;
    /**
     * Generate with JSON payload approach (COMPLEX)
     */
    private generateWithJsonPayload;
    /**
     * Generate ghost mannequin using Control Block approach
     * @param controlBlockPrompt - Optimized prompt from Control Block
     * @param consolidation - Consolidation output with Facts_v3
     */
    private generateWithControlBlock;
    /**
     * Upload image to Files API for token optimization
     * @param imageUrl - URL of the image to upload
     * @param role - Role of the image (flatlay, reference, analysis)
     * @param sessionId - Session ID for tracking
     * @returns Promise<string> - Files API URI
     */
    private uploadImageToFilesAPI;
    /**
     * Log messages if logging is enabled
     * @param message - Message to log
     */
    private log;
    /**
     * Get current pipeline state (useful for monitoring)
     */
    getState(): Readonly<PipelineState>;
    /**
     * Get session ID
     */
    getSessionId(): string;
}
/**
 * Convenience function to process a single request
 * @param request - Ghost mannequin request
 * @param options - Pipeline options
 * @returns Promise<GhostResult> - Processing result
 */
export declare function processGhostMannequin(request: GhostRequest, options: PipelineOptions): Promise<GhostResult>;
/**
 * Batch processing function for multiple requests
 * @param requests - Array of ghost mannequin requests
 * @param options - Pipeline options
 * @param concurrency - Number of concurrent processing pipelines (default: 3)
 * @returns Promise<GhostResult[]> - Array of processing results
 */
export declare function processBatch(requests: GhostRequest[], options: PipelineOptions, concurrency?: number): Promise<GhostResult[]>;
/**
 * Pipeline health check function
 * @param options - Pipeline options to test
 * @returns Promise<boolean> - True if all services are accessible
 */
export declare function healthCheck(options: PipelineOptions): Promise<{
    healthy: boolean;
    services: {
        fal: boolean;
        gemini: boolean;
        freepik: boolean;
        aiStudio: boolean;
        supabase: boolean;
    };
    errors: string[];
}>;
export type { PipelineOptions, PipelineState };

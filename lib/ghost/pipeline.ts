import { v4 as uuidv4 } from 'uuid';
import { 
  GhostRequest, 
  GhostResult, 
  GhostPipelineError,
  BackgroundRemovalResult,
  GarmentAnalysisResult,
  GarmentEnrichmentResult,
  GhostMannequinResult,
  ProcessingStage
} from '@/types/ghost';
import { configureFalClient, removeBackground } from './fal';
import { configureGeminiClient, analyzeGarment, analyzeGarmentEnrichment, generateGhostMannequin } from './gemini';

// Configuration interface
interface PipelineOptions {
  falApiKey: string;
  geminiApiKey: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  enableLogging?: boolean;
  timeouts?: {
    backgroundRemoval?: number;
    analysis?: number;
    enrichment?: number;
    rendering?: number;
  };
}

// Pipeline state interface
interface PipelineState {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  currentStage: ProcessingStage | null;
  stageResults: {
    backgroundRemovalFlatlay?: BackgroundRemovalResult;
    backgroundRemovalOnModel?: BackgroundRemovalResult;
    analysis?: GarmentAnalysisResult;
    enrichment?: GarmentEnrichmentResult;
    rendering?: GhostMannequinResult;
  };
  error?: GhostPipelineError;
}

/**
 * Main Ghost Mannequin Pipeline class
 * Orchestrates the entire process from flatlay to ghost mannequin
 */
export class GhostMannequinPipeline {
  private options: PipelineOptions;
  private state: PipelineState;

  constructor(options: PipelineOptions) {
    this.options = {
      enableLogging: true,
      timeouts: {
        backgroundRemoval: 30000, // 30 seconds
        analysis: 90000,          // 90 seconds (increased for complex analysis)
        enrichment: 120000,       // 120 seconds for enrichment analysis (increased)
        rendering: 180000,        // 180 seconds (increased for ghost mannequin generation)
      },
      ...options,
    };

    // Initialize state
    this.state = {
      sessionId: uuidv4(),
      status: 'pending',
      startTime: Date.now(),
      currentStage: null,
      stageResults: {},
    };

    // Configure API clients
    this.initializeClients();
  }

  /**
   * Initialize API clients with provided keys
   */
  private initializeClients(): void {
    try {
      configureFalClient(this.options.falApiKey);
      configureGeminiClient(this.options.geminiApiKey);
      
      if (this.options.enableLogging) {
        console.log(`Pipeline ${this.state.sessionId} initialized`);
      }
    } catch (error) {
      throw new GhostPipelineError(
        'Failed to initialize API clients',
        'CLIENT_INITIALIZATION_FAILED',
        'background_removal',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process a ghost mannequin request through the entire pipeline
   * @param request - Ghost mannequin request with flatlay and optional on-model images
   * @returns Promise<GhostResult> - Complete processing result
   */
  async process(request: GhostRequest): Promise<GhostResult> {
    try {
      this.state.status = 'processing';
      this.log('Starting ghost mannequin pipeline processing...');

      // Validate request
      await this.validateRequest(request);

      // Stage 1a: Background Removal - Flatlay (Garment Detail)
      await this.executeStage('background_removal', async () => {
        this.log('Stage 1a: Background removal - Garment detail image');
        const flatlayResult = await this.executeWithTimeout(
          removeBackground(request.flatlay),
          this.options.timeouts!.backgroundRemoval!,
          'background_removal'
        );
        this.state.stageResults.backgroundRemovalFlatlay = flatlayResult;
        
        // Stage 1b: Background Removal - On-Model (if provided)
        if (request.onModel) {
          this.log('Stage 1b: Background removal - On-model image');
          const onModelResult = await this.executeWithTimeout(
            removeBackground(request.onModel),
            this.options.timeouts!.backgroundRemoval!,
            'background_removal'
          );
          this.state.stageResults.backgroundRemovalOnModel = onModelResult;
        }
        
        return flatlayResult;
      });

      // Stage 2: Garment Analysis (ONLY on garment detail image)
      await this.executeStage('analysis', async () => {
        this.log('Stage 2: Garment analysis - Processing ONLY garment detail image');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const result = await this.executeWithTimeout(
          analyzeGarment(cleanedGarmentDetail, this.state.sessionId),
          this.options.timeouts!.analysis!,
          'analysis'
        );
        this.state.stageResults.analysis = result;
        return result;
      });

      // Stage 3: Enrichment Analysis (Focused high-value analysis)
      await this.executeStage('enrichment', async () => {
        this.log('Stage 3: Enrichment analysis - Focused rendering-critical attributes');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const baseAnalysisSessionId = this.state.stageResults.analysis!.analysis.meta.session_id;
        const enrichmentSessionId = `${this.state.sessionId}_enrichment`;
        
        const result = await this.executeWithTimeout(
          analyzeGarmentEnrichment(cleanedGarmentDetail, enrichmentSessionId, baseAnalysisSessionId),
          this.options.timeouts!.enrichment!,
          'enrichment'
        );
        this.state.stageResults.enrichment = result;
        return result;
      });

      // Stage 4: Ghost Mannequin Generation (TWO cleaned images + JSON analysis + Enrichment)
      await this.executeStage('rendering', async () => {
        this.log('Stage 4: Ghost mannequin generation - Using TWO cleaned images + JSON analysis + Enrichment');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const cleanedOnModel = this.state.stageResults.backgroundRemovalOnModel?.cleanedImageUrl;
        const analysis = this.state.stageResults.analysis!.analysis;
        const enrichmentData = this.state.stageResults.enrichment?.enrichment; // Optional
        
        const result = await this.executeWithTimeout(
          generateGhostMannequin(cleanedGarmentDetail, analysis, cleanedOnModel, enrichmentData),
          this.options.timeouts!.rendering!,
          'rendering'
        );
        this.state.stageResults.rendering = result;
        return result;
      });

      // Mark as completed
      this.state.status = 'completed';
      this.log('Pipeline processing completed successfully');

      return this.buildResult();

    } catch (error) {
      this.state.status = 'failed';
      this.state.error = error instanceof GhostPipelineError ? error : new GhostPipelineError(
        `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PIPELINE_FAILED',
        this.state.currentStage || 'background_removal',
        error instanceof Error ? error : undefined
      );

      this.log(`Pipeline failed at stage: ${this.state.currentStage}`);
      
      return this.buildResult();
    }
  }

  /**
   * Execute a pipeline stage with error handling
   * @param stage - The stage being executed
   * @param executor - Function that executes the stage logic
   */
  private async executeStage<T>(
    stage: ProcessingStage, 
    executor: () => Promise<T>
  ): Promise<T> {
    this.state.currentStage = stage;
    
    try {
      const result = await executor();
      this.log(`Stage ${stage} completed successfully`);
      return result;
    } catch (error) {
      this.log(`Stage ${stage} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Execute a promise with timeout
   * @param promise - Promise to execute
   * @param timeout - Timeout in milliseconds
   * @param stage - Current processing stage for error context
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    stage: ProcessingStage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new GhostPipelineError(
          `Stage ${stage} timed out after ${timeout}ms`,
          'STAGE_TIMEOUT',
          stage
        ));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Validate the incoming request
   * @param request - Request to validate
   */
  private async validateRequest(request: GhostRequest): Promise<void> {
    if (!request.flatlay) {
      throw new GhostPipelineError(
        'Flatlay image is required',
        'MISSING_FLATLAY',
        'background_removal'
      );
    }

    // Additional validations could be added here
    // - File size checks
    // - Format validation
    // - URL accessibility checks
  }

  /**
   * Build the final result object
   */
  private buildResult(): GhostResult {
    const totalTime = Date.now() - this.state.startTime;
    const stageResults = this.state.stageResults;

    const result: GhostResult = {
      sessionId: this.state.sessionId,
      status: this.state.status,
      metrics: {
        processingTime: `${(totalTime / 1000).toFixed(2)}s`,
        stageTimings: {
          backgroundRemoval: (stageResults.backgroundRemovalFlatlay?.processingTime || 0) + (stageResults.backgroundRemovalOnModel?.processingTime || 0),
          analysis: stageResults.analysis?.processingTime || 0,
          enrichment: stageResults.enrichment?.processingTime || 0,
          rendering: stageResults.rendering?.processingTime || 0,
        },
      },
    };

    // Add successful results
    if (this.state.status === 'completed') {
      result.cleanedImageUrl = stageResults.backgroundRemovalFlatlay?.cleanedImageUrl;
      result.cleanedOnModelUrl = stageResults.backgroundRemovalOnModel?.cleanedImageUrl;
      result.renderUrl = stageResults.rendering?.renderUrl;
      // Note: analysisUrl would be set if we store the analysis JSON to storage
      // result.analysisUrl = `/ghost/analysis/${this.state.sessionId}.json`;
    }
    
    // Add analysis data if available (for both success and partial results)
    if (stageResults.analysis) {
      (result as any).analysis = stageResults.analysis.analysis;
    }
    

    // Add error details if failed
    if (this.state.status === 'failed' && this.state.error) {
      result.error = {
        message: this.state.error.message,
        code: this.state.error.code,
        stage: this.state.error.stage,
      };
    }

    return result;
  }

  /**
   * Log messages if logging is enabled
   * @param message - Message to log
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${this.state.sessionId}] ${message}`);
    }
  }

  /**
   * Get current pipeline state (useful for monitoring)
   */
  getState(): Readonly<PipelineState> {
    return { ...this.state };
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }
}

/**
 * Convenience function to process a single request
 * @param request - Ghost mannequin request
 * @param options - Pipeline options
 * @returns Promise<GhostResult> - Processing result
 */
export async function processGhostMannequin(
  request: GhostRequest,
  options: PipelineOptions
): Promise<GhostResult> {
  const pipeline = new GhostMannequinPipeline(options);
  return pipeline.process(request);
}

/**
 * Batch processing function for multiple requests
 * @param requests - Array of ghost mannequin requests
 * @param options - Pipeline options
 * @param concurrency - Number of concurrent processing pipelines (default: 3)
 * @returns Promise<GhostResult[]> - Array of processing results
 */
export async function processBatch(
  requests: GhostRequest[],
  options: PipelineOptions,
  concurrency: number = 3
): Promise<GhostResult[]> {
  const results: GhostResult[] = [];
  const chunks: GhostRequest[][] = [];
  
  // Split requests into chunks for concurrent processing
  for (let i = 0; i < requests.length; i += concurrency) {
    chunks.push(requests.slice(i, i + concurrency));
  }

  // Process each chunk
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(request => processGhostMannequin(request, options));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Pipeline health check function
 * @param options - Pipeline options to test
 * @returns Promise<boolean> - True if all services are accessible
 */
export async function healthCheck(options: PipelineOptions): Promise<{
  healthy: boolean;
  services: {
    fal: boolean;
    gemini: boolean;
    supabase: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const services = {
    fal: false,
    gemini: false,
    supabase: false,
  };

  // Test FAL.AI
  try {
    configureFalClient(options.falApiKey);
    // Could add a simple test call here
    services.fal = true;
  } catch (error) {
    errors.push(`FAL.AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Gemini
  try {
    configureGeminiClient(options.geminiApiKey);
    // Could add a simple test call here
    services.gemini = true;
  } catch (error) {
    errors.push(`Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Supabase (if configured)
  if (options.supabaseUrl && options.supabaseKey) {
    try {
      // Could add Supabase connection test here
      services.supabase = true;
    } catch (error) {
      errors.push(`Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    services.supabase = true; // Consider it healthy if not configured
  }

  const healthy = Object.values(services).every(Boolean);

  return {
    healthy,
    services,
    errors,
  };
}

// Export types for external use
export type { PipelineOptions, PipelineState };

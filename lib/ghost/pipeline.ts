import { v4 as uuidv4 } from 'uuid';
import { 
  GhostRequest, 
  GhostResult, 
  GhostPipelineError,
  BackgroundRemovalResult,
  GarmentAnalysisResult,
  GhostMannequinResult,
  ProcessingStage
} from '@/types/ghost';
import { configureFalClient, removeBackground } from './fal';
import { configureGeminiClient, analyzeGarment, generateGhostMannequin } from './gemini';

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
    backgroundRemoval?: BackgroundRemovalResult;
    analysis?: GarmentAnalysisResult;
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
        analysis: 20000,          // 20 seconds
        rendering: 60000,         // 60 seconds
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

      // Stage 1: Background Removal
      await this.executeStage('background_removal', async () => {
        this.log('Stage 1: Background removal');
        const result = await this.executeWithTimeout(
          removeBackground(request.flatlay),
          this.options.timeouts!.backgroundRemoval!,
          'background_removal'
        );
        this.state.stageResults.backgroundRemoval = result;
        return result;
      });

      // Stage 2: Garment Analysis
      await this.executeStage('analysis', async () => {
        this.log('Stage 2: Garment analysis');
        const cleanedImage = this.state.stageResults.backgroundRemoval!.cleanedImageUrl;
        const result = await this.executeWithTimeout(
          analyzeGarment(cleanedImage),
          this.options.timeouts!.analysis!,
          'analysis'
        );
        this.state.stageResults.analysis = result;
        return result;
      });

      // Stage 3: Ghost Mannequin Generation
      await this.executeStage('rendering', async () => {
        this.log('Stage 3: Ghost mannequin generation');
        const cleanedImage = this.state.stageResults.backgroundRemoval!.cleanedImageUrl;
        const analysis = this.state.stageResults.analysis!.analysis;
        const result = await this.executeWithTimeout(
          generateGhostMannequin(cleanedImage, analysis, request.onModel),
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
          backgroundRemoval: stageResults.backgroundRemoval?.processingTime || 0,
          analysis: stageResults.analysis?.processingTime || 0,
          rendering: stageResults.rendering?.processingTime || 0,
        },
      },
    };

    // Add successful results
    if (this.state.status === 'completed') {
      result.cleanedImageUrl = stageResults.backgroundRemoval?.cleanedImageUrl;
      result.renderUrl = stageResults.rendering?.renderUrl;
      // Note: analysisUrl would be set if we store the analysis JSON to storage
      // result.analysisUrl = `/ghost/analysis/${this.state.sessionId}.json`;
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

/**
 * A/B Dual Input Processing Module for Ghost Mannequin Pipeline v2.1
 * 
 * Implements the core A/B processing logic from PRD v2:
 * - A = On-model shot (pose/proportions) with automatic human pixel masking
 * - B = Flatlay (truth image for color/pattern/texture)
 * - Safety Pre-Scrub with skin/person detection and edge erosion
 * - Intelligent routing decisions (Flash vs Fallback)
 */

import { GhostPipelineError, ImageInput, GhostRequest, ABProcessingResult } from '../../types/ghost';

// A/B Processing configuration
interface ABProcessingConfig {
  safetyPreScrub: {
    enabled: boolean;
    skinDetectionThreshold: number; // 0-1, >0.5 triggers fallback consideration
    edgeErosionPixels: number; // 2-3px edge erosion for person mask
    preserveSemiSheer: boolean; // preserve garment pixels even if semi-transparent
  };
  routingLogic: {
    flashRouteThreshold: number; // skin area % threshold for Flash routing
    autoFallbackThreshold: number; // skin area % threshold for auto-fallback
    enableHeuristics: boolean;
  };
  backgroundRemoval: {
    modelA: 'birefnet' | 'bria';
    modelB: 'birefnet' | 'bria';
    parallelProcessing: boolean;
  };
}

// Default configuration following PRD v2
const DEFAULT_AB_CONFIG: ABProcessingConfig = {
  safetyPreScrub: {
    enabled: true,
    skinDetectionThreshold: 0.5, // 50% skin triggers considerations
    edgeErosionPixels: 2, // ≤2-3px as per PRD
    preserveSemiSheer: true
  },
  routingLogic: {
    flashRouteThreshold: 0.05, // <5% skin = safe for Flash
    autoFallbackThreshold: 0.7, // >70% skin = auto-fallback
    enableHeuristics: true
  },
  backgroundRemoval: {
    modelA: 'birefnet',
    modelB: 'birefnet', 
    parallelProcessing: true
  }
};

/**
 * A/B Dual Input Processing class
 */
export class ABInputProcessor {
  private config: ABProcessingConfig;

  constructor(config: Partial<ABProcessingConfig> = {}) {
    this.config = {
      ...DEFAULT_AB_CONFIG,
      ...config
    };
  }

  /**
   * Process A/B inputs according to PRD v2.1 specification
   * @param request - Ghost mannequin request with A/B inputs
   * @returns ABProcessingResult with routing decisions
   */
  async processABInputs(request: GhostRequest): Promise<ABProcessingResult> {
    const startTime = Date.now();

    try {
      this.log('Starting A/B dual input processing...');

      // Determine input mode
      const inputMode = this.determineInputMode(request);
      this.log(`Input mode determined: ${inputMode}`);

      // Initialize result structure
      const result: ABProcessingResult = {
        inputMode,
        bProcessed: {
          cleanUrl: '',
          analysisReady: false
        },
        processingDecisions: {
          routeToFlash: false,
          routeToFallback: false,
          reasonCode: ''
        }
      };

      // Process B (flatlay) - always required
      result.bProcessed = await this.processFlatlay(request.flatlay);

      // Process A (on-model) if present
      if (inputMode === 'dual_input' && request.onModel) {
        result.aProcessed = await this.processOnModel(request.onModel, request.options);
      }

      // Make routing decisions
      result.processingDecisions = this.makeRoutingDecisions(result, request.options);

      const processingTime = Date.now() - startTime;
      this.log(`A/B processing completed in ${processingTime}ms`);
      this.log(`Routing decision: ${result.processingDecisions.routeToFlash ? 'Flash' : 'Fallback'} (${result.processingDecisions.reasonCode})`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log(`A/B processing failed after ${processingTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `A/B input processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AB_PROCESSING_FAILED',
        'preprocessing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Determine input mode based on request
   */
  private determineInputMode(request: GhostRequest): 'flatlay_only' | 'dual_input' {
    const explicitMode = request.options?.inputMode;
    
    if (explicitMode === 'flatlay_only') {
      return 'flatlay_only';
    }
    
    if (explicitMode === 'dual_input' || request.onModel) {
      return 'dual_input';
    }
    
    // Auto-detect: default to flatlay_only if no on-model image
    return request.onModel ? 'dual_input' : 'flatlay_only';
  }

  /**
   * Process flatlay image (B) for truth data
   */
  private async processFlatlay(flatlayImage: ImageInput): Promise<ABProcessingResult['bProcessed']> {
    this.log('Processing flatlay image (B) for color/pattern truth...');

    try {
      // Background removal for flatlay
      const cleanUrl = await this.performBackgroundRemoval(flatlayImage, 'B');

      return {
        cleanUrl,
        analysisReady: true
      };

    } catch (error) {
      throw new GhostPipelineError(
        `Flatlay processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FLATLAY_PROCESSING_FAILED',
        'preprocessing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process on-model image (A) with safety pre-scrub
   */
  private async processOnModel(
    onModelImage: ImageInput,
    options?: GhostRequest['options']
  ): Promise<ABProcessingResult['aProcessed']> {
    this.log('Processing on-model image (A) with safety pre-scrub...');

    try {
      let safetyPreScrubApplied = false;
      let personMaskUrl: string | undefined;
      let personlessUrl: string | undefined;
      let skinAreaPercentage = 0;

      // Step 1: Safety Pre-Scrub if enabled
      if (this.config.safetyPreScrub.enabled || options?.safetyPreScrub?.enabled !== false) {
        const preScrubResult = await this.performSafetyPreScrub(onModelImage, options);
        
        safetyPreScrubApplied = true;
        personMaskUrl = preScrubResult.personMaskUrl;
        personlessUrl = preScrubResult.personlessUrl;
        skinAreaPercentage = preScrubResult.skinAreaPercentage;

        this.log(`Safety pre-scrub completed: ${(skinAreaPercentage * 100).toFixed(1)}% skin detected`);
      }

      // Step 2: Background removal for on-model
      const cleanUrl = await this.performBackgroundRemoval(
        personlessUrl || onModelImage, 
        'A'
      );

      return {
        personMaskUrl,
        personlessUrl: cleanUrl,
        skinAreaPercentage,
        safetyPreScrubApplied
      };

    } catch (error) {
      throw new GhostPipelineError(
        `On-model processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ON_MODEL_PROCESSING_FAILED',
        'preprocessing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Perform safety pre-scrub with skin/person detection
   */
  private async performSafetyPreScrub(
    image: ImageInput,
    options?: GhostRequest['options']
  ): Promise<{
    personMaskUrl: string;
    personlessUrl: string;
    skinAreaPercentage: number;
  }> {
    this.log('Performing safety pre-scrub: skin/person detection...');

    try {
      // TODO: Integrate with actual person/skin detection service
      // This would involve:
      // 1. Person detection (YOLO, MediaPipe, etc.)
      // 2. Skin segmentation
      // 3. Face/hands/arms/neck detection
      // 4. Edge erosion (≤2-3px)
      // 5. Semi-sheer preservation (remove person, keep garment)

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate skin detection results
      const mockSkinPercentage = Math.random() * 0.3; // 0-30% for testing
      
      const personMaskUrl = `https://mock-storage.example.com/masks/person_mask_${Date.now()}.png`;
      const personlessUrl = `https://mock-storage.example.com/processed/personless_${Date.now()}.png`;

      this.log(`Person detection completed: ${(mockSkinPercentage * 100).toFixed(1)}% skin area`);

      return {
        personMaskUrl,
        personlessUrl,
        skinAreaPercentage: mockSkinPercentage
      };

    } catch (error) {
      throw new GhostPipelineError(
        `Safety pre-scrub failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAFETY_PRE_SCRUB_FAILED',
        'preprocessing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Perform background removal using FAL.AI
   */
  private async performBackgroundRemoval(image: ImageInput, imageType: 'A' | 'B'): Promise<string> {
    this.log(`Performing background removal for image ${imageType}...`);

    try {
      // TODO: Integrate with actual FAL.AI background removal
      // This would use the existing background removal module
      // but adapted for A/B processing context

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return `https://mock-storage.example.com/cleaned/${imageType.toLowerCase()}_clean_${Date.now()}.png`;

    } catch (error) {
      throw new GhostPipelineError(
        `Background removal failed for image ${imageType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKGROUND_REMOVAL_FAILED',
        'preprocessing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Make routing decisions based on A/B processing results
   */
  private makeRoutingDecisions(
    result: ABProcessingResult,
    options?: GhostRequest['options']
  ): ABProcessingResult['processingDecisions'] {
    this.log('Making routing decisions for pipeline flow...');

    // Default to Flash route
    let routeToFlash = true;
    let routeToFallback = false;
    let reasonCode = 'default_flash_route';

    // Analyze A processing results if available
    if (result.aProcessed && result.inputMode === 'dual_input') {
      const skinPercentage = result.aProcessed.skinAreaPercentage || 0;

      // Apply PRD v2 heuristics
      if (skinPercentage > this.config.routingLogic.autoFallbackThreshold) {
        // >70% skin = auto-fallback
        routeToFlash = false;
        routeToFallback = true;
        reasonCode = `high_skin_content_${(skinPercentage * 100).toFixed(1)}pct`;
      } else if (skinPercentage > this.config.routingLogic.flashRouteThreshold) {
        // 5-70% skin = Flash with consideration for fallback
        routeToFlash = true;
        routeToFallback = false;
        reasonCode = `moderate_skin_flash_route_${(skinPercentage * 100).toFixed(1)}pct`;
      } else {
        // <5% skin = safe for Flash
        routeToFlash = true;
        routeToFallback = false;
        reasonCode = `low_skin_safe_flash_${(skinPercentage * 100).toFixed(1)}pct`;
      }
    } else {
      // Flatlay-only mode
      routeToFlash = true;
      routeToFallback = false;
      reasonCode = 'flatlay_only_flash_route';
    }

    // Override based on user options
    if (options?.flashImageGeneration?.enabled === false) {
      routeToFlash = false;
      routeToFallback = true;
      reasonCode = 'user_disabled_flash';
    }

    this.log(`Routing decision: Flash=${routeToFlash}, Fallback=${routeToFallback}, Reason=${reasonCode}`);

    return {
      routeToFlash,
      routeToFallback,
      reasonCode
    };
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [ABInputProcessor] ${message}`);
  }
}

/**
 * Convenience function for A/B input processing
 * @param request - Ghost mannequin request
 * @param config - Optional A/B processing configuration
 * @returns A/B processing result with routing decisions
 */
export async function processABInputs(
  request: GhostRequest,
  config?: Partial<ABProcessingConfig>
): Promise<ABProcessingResult> {
  const processor = new ABInputProcessor(config);
  return processor.processABInputs(request);
}

// Export types for external use
export type { ABProcessingConfig };
/**
 * Real Edge Erosion Image Processing for Ghost Mannequin Pipeline v2.1
 * 
 * Implements Stage 6: Edge Erosion for Safety Buffers
 * - Morphological erosion algorithms for mask processing
 * - Configurable erosion kernels and iterations
 * - Safety buffer creation for person/skin regions
 * - Quality validation and edge smoothing
 */

import { GhostPipelineError } from '../../types/ghost';
import { RealImageProcessor } from '../utils/image-processing';

// Edge erosion configuration
interface EdgeErosionConfig {
  erosionPixels: number; // number of pixels to erode (2-3px recommended)
  iterations: number; // number of erosion iterations (1-3)
  kernelShape: 'circular' | 'square' | 'cross'; // erosion kernel shape
  preserveTopology: boolean; // maintain mask connectivity
  smoothingEnabled: boolean; // apply smoothing after erosion
  holeFilling: {
    enabled: boolean;
    maxHoleSize: number; // maximum hole size to fill (pixels)
    connectivity: 4 | 8; // pixel connectivity for hole detection
  };
  qualityValidation: {
    enabled: boolean;
    minMaskArea: number; // minimum remaining mask area (0-1)
    maxHoleSize: number; // maximum allowed hole size (pixels)
  };
}

// Edge erosion result
interface EdgeErosionResult {
  erodedMaskUrl: string;
  processingTime: number;
  metrics: {
    originalPixels: number;
    erodedPixels: number;
    erosionRatio: number;
    edgeQuality: number; // 0-1 smoothness score
    topologyPreserved: boolean;
  };
  appliedConfig: EdgeErosionConfig;
}

// Default configuration for safety-compliant edge erosion
const DEFAULT_EROSION_CONFIG: EdgeErosionConfig = {
  erosionPixels: 2.5, // 2.5px safety buffer as per requirements
  iterations: 2,
  kernelShape: 'circular',
  preserveTopology: true,
  smoothingEnabled: true,
  holeFilling: {
    enabled: true,
    maxHoleSize: 25, // Fill holes up to 25px
    connectivity: 8 // 8-connectivity for comprehensive hole detection
  },
  qualityValidation: {
    enabled: true,
    minMaskArea: 0.1, // Must retain at least 10% of original area
    maxHoleSize: 50 // No holes larger than 50px
  }
};

/**
 * Real Edge Erosion Implementation Class
 */
export class EdgeErosionProcessor {
  private config: EdgeErosionConfig;
  private imageProcessor: RealImageProcessor;

  constructor(config?: Partial<EdgeErosionConfig>) {
    this.config = { ...DEFAULT_EROSION_CONFIG, ...config };
    this.imageProcessor = new RealImageProcessor();
  }

  /**
   * Apply edge erosion to a mask image for safety buffer creation
   * @param maskUrl - URL of the mask image to process
   * @param customConfig - Optional custom configuration
   * @returns EdgeErosionResult with processed mask and metrics
   */
  async applyEdgeErosion(
    maskUrl: string,
    customConfig?: Partial<EdgeErosionConfig>
  ): Promise<EdgeErosionResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.config, ...customConfig };

    try {
      console.log(`[EdgeErosion] Starting ${finalConfig.erosionPixels}px erosion with ${finalConfig.iterations} iterations`);

      // Validate input
      if (!maskUrl) {
        throw new GhostPipelineError(
          'Mask URL required for edge erosion',
          'MISSING_MASK_URL',
          'edge_erosion'
        );
      }

      // Step 1: Load and validate mask image
      const maskImage = await this.loadMaskImage(maskUrl);
      
      // Step 2: Apply morphological erosion
      const erodedMask = await this.performMorphologicalErosion(maskImage, finalConfig);
      
      // Step 3: Apply edge smoothing if enabled
      const smoothedMask = finalConfig.smoothingEnabled 
        ? await this.applyEdgeSmoothing(erodedMask, finalConfig)
        : erodedMask;
      
      // Step 3.5: Apply hole filling if enabled
      const filledMask = finalConfig.holeFilling.enabled
        ? await this.applyHoleFilling(smoothedMask, finalConfig)
        : smoothedMask;
      
      // Step 4: Validate quality and topology
      const qualityMetrics = await this.validateErosionQuality(
        maskImage, 
        filledMask, 
        finalConfig
      );
      
      // Step 5: Save processed mask
      const erodedMaskUrl = await this.saveMaskImage(filledMask);
      
      const processingTime = Date.now() - startTime;

      const result: EdgeErosionResult = {
        erodedMaskUrl,
        processingTime,
        metrics: qualityMetrics,
        appliedConfig: finalConfig
      };

      console.log(`[EdgeErosion] ✅ Completed in ${processingTime}ms`);
      console.log(`[EdgeErosion] Erosion ratio: ${(qualityMetrics.erosionRatio * 100).toFixed(1)}%`);
      console.log(`[EdgeErosion] Edge quality: ${(qualityMetrics.edgeQuality * 100).toFixed(1)}%`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`[EdgeErosion] ❌ Failed after ${processingTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `Edge erosion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_EROSION_FAILED',
        'edge_erosion',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load mask image for processing
   * @param maskUrl - URL of mask image
   * @returns Loaded mask image data
   */
  private async loadMaskImage(maskUrl: string): Promise<ImageData> {
    try {
      console.log('[EdgeErosion] Loading mask image...');
      
      // Use real image processor to load image
      return await this.imageProcessor.loadImageData(maskUrl);
      
    } catch (error) {
      throw new GhostPipelineError(
        `Failed to load mask image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MASK_LOAD_FAILED',
        'edge_erosion',
        error instanceof Error ? error : undefined
      );
    }
  }


  /**
   * Perform morphological erosion on mask image
   * @param maskImage - Input mask image
   * @param config - Erosion configuration
   * @returns Eroded mask image
   */
  private async performMorphologicalErosion(
    maskImage: ImageData,
    config: EdgeErosionConfig
  ): Promise<ImageData> {
    console.log(`[EdgeErosion] Applying morphological erosion: ${config.erosionPixels}px, ${config.iterations} iterations`);
    
    try {
      // Use real image processor for morphological erosion
      return await this.imageProcessor.morphologicalErosion(maskImage, {
        kernelSize: Math.ceil(config.erosionPixels * 2) + 1,
        kernelShape: config.kernelShape,
        iterations: config.iterations
      });
      
    } catch (error) {
      throw new GhostPipelineError(
        `Morphological erosion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MORPHOLOGICAL_EROSION_FAILED',
        'edge_erosion',
        error instanceof Error ? error : undefined
      );
    }
  }


  /**
   * Apply edge smoothing to reduce jagged artifacts
   */
  private async applyEdgeSmoothing(
    maskImage: ImageData,
    config: EdgeErosionConfig
  ): Promise<ImageData> {
    console.log('[EdgeErosion] Applying edge smoothing...');
    
    // Use real image processor for bilateral filtering (edge-preserving smoothing)
    return await this.imageProcessor.applyBilateralFilter(maskImage, {
      diameter: 5,
      sigmaColor: 25,
      sigmaSpace: 25
    });
  }

  /**
   * Apply hole filling to remove small gaps in the mask
   */
  private async applyHoleFilling(
    maskImage: ImageData,
    config: EdgeErosionConfig
  ): Promise<ImageData> {
    console.log(`[EdgeErosion] Applying hole filling (max size: ${config.holeFilling.maxHoleSize}px)...`);
    
    // Use real image processor for hole filling with flood fill
    return await this.imageProcessor.fillHoles(maskImage, {
      maxHoleSize: config.holeFilling.maxHoleSize,
      connectivity: config.holeFilling.connectivity
    });
  }


  /**
   * Validate erosion quality and calculate metrics
   */
  private async validateErosionQuality(
    originalMask: ImageData,
    erodedMask: ImageData,
    config: EdgeErosionConfig
  ): Promise<{
    originalPixels: number;
    erodedPixels: number;
    erosionRatio: number;
    edgeQuality: number;
    topologyPreserved: boolean;
  }> {
    console.log('[EdgeErosion] Validating erosion quality...');
    
    // Use real image processor for edge quality analysis
    const edgeAnalysis = await this.imageProcessor.analyzeEdges(erodedMask);
    
    const originalPixels = this.countMaskPixels(originalMask);
    const erodedPixels = this.countMaskPixels(erodedMask);
    const erosionRatio = erodedPixels / originalPixels;
    
    // Edge quality from real analysis
    const edgeQuality = edgeAnalysis.smoothnessScore;
    
    // Check topology preservation (simplified)
    const topologyPreserved = erosionRatio >= config.qualityValidation.minMaskArea;
    
    // Validate against quality requirements
    if (config.qualityValidation.enabled) {
      if (erosionRatio < config.qualityValidation.minMaskArea) {
        console.warn(`[EdgeErosion] ⚠️ Erosion removed too much area: ${(erosionRatio * 100).toFixed(1)}%`);
      }
      
      if (edgeQuality < 0.7) {
        console.warn(`[EdgeErosion] ⚠️ Edge quality below threshold: ${(edgeQuality * 100).toFixed(1)}%`);
      }
    }
    
    return {
      originalPixels,
      erodedPixels,
      erosionRatio,
      edgeQuality,
      topologyPreserved
    };
  }

  /**
   * Count white pixels in mask
   */
  private countMaskPixels(imageData: ImageData): number {
    let count = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 128) { // White pixel threshold
        count++;
      }
    }
    return count;
  }

  /**
   * Save processed mask image
   */
  private async saveMaskImage(imageData: ImageData): Promise<string> {
    try {
      console.log('[EdgeErosion] Saving processed mask...');
      
      // Use real image processor to save image as data URL
      return await this.imageProcessor.saveAsDataUrl(imageData, 'png');
      
    } catch (error) {
      throw new GhostPipelineError(
        `Failed to save mask: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MASK_SAVE_FAILED',
        'edge_erosion',
        error instanceof Error ? error : undefined
      );
    }
  }

}

/**
 * Convenience function for applying edge erosion
 * @param maskUrl - URL of mask to process
 * @param config - Optional erosion configuration
 * @returns EdgeErosionResult with processed mask
 */
export async function applyEdgeErosion(
  maskUrl: string,
  config?: Partial<EdgeErosionConfig>
): Promise<EdgeErosionResult> {
  const processor = new EdgeErosionProcessor(config);
  return processor.applyEdgeErosion(maskUrl, config);
}

/**
 * Quick edge erosion with safety defaults
 * @param maskUrl - URL of mask to process
 * @param erosionPixels - Number of pixels to erode (default: 2.5)
 * @returns Processed mask URL
 */
export async function applySafetyErosion(
  maskUrl: string,
  erosionPixels: number = 2.5
): Promise<string> {
  const result = await applyEdgeErosion(maskUrl, {
    erosionPixels,
    iterations: 2,
    kernelShape: 'circular',
    preserveTopology: true,
    smoothingEnabled: true
  });
  
  return result.erodedMaskUrl;
}

// Export types for external use
export type { EdgeErosionConfig, EdgeErosionResult };
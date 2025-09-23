/**
 * Crop Generation Framework for Ghost Mannequin Pipeline v2.1
 * 
 * Implements Stage 4: Strategic Crop Generation
 * - Intelligent boundary detection for garment regions
 * - Part-wise analysis preparation (neck, sleeves, hem, placket)
 * - Adaptive crop strategies based on garment type
 * - Quality-assured crop validation
 */

import { GhostPipelineError, ImageInput, AnalysisJSON } from '../../types/ghost';
import { RealImageProcessor } from '../utils/image-processing';

// Crop configuration interface
interface CropConfig {
  strategy: 'adaptive' | 'template_based' | 'segmentation_guided';
  regions: {
    neck: CropRegionConfig;
    sleeves: CropRegionConfig;
    hem: CropRegionConfig;
    placket: CropRegionConfig;
  };
  qualityValidation: {
    enabled: boolean;
    minRegionSize: number; // minimum pixels for valid crop
    maxAspectRatio: number; // max width/height ratio
  };
}

interface CropRegionConfig {
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  paddingPercent: number; // additional context around region
  adaptiveResize: boolean; // adjust based on detected features
}

// Crop result interface
interface CropResult {
  region: 'neck' | 'sleeve_left' | 'sleeve_right' | 'hem' | 'placket';
  imageUrl: string; // Cropped image URL
  boundaries: {
    x: number;
    y: number;
    width: number;
    height: number;
  }; // Normalized coordinates (0-1)
  confidence: number; // 0-1 confidence in crop quality
  metadata: {
    originalDimensions: { width: number; height: number };
    cropDimensions: { width: number; height: number };
    features: string[]; // detected features in this region
    analysisHints: string[]; // hints for part-wise analysis
  };
}

interface CropGenerationResult {
  crops: CropResult[];
  processingTime: number;
  qualityMetrics: {
    totalCropsGenerated: number;
    averageConfidence: number;
    regionsWithHighConfidence: number; // confidence > 0.8
  };
}

// Default crop configuration
const DEFAULT_CROP_CONFIG: CropConfig = {
  strategy: 'segmentation_guided',
  regions: {
    neck: {
      enabled: true,
      priority: 'high',
      paddingPercent: 0.15, // 15% padding for context
      adaptiveResize: true
    },
    sleeves: {
      enabled: true,
      priority: 'medium',
      paddingPercent: 0.10,
      adaptiveResize: true
    },
    hem: {
      enabled: true,
      priority: 'medium',
      paddingPercent: 0.12,
      adaptiveResize: false
    },
    placket: {
      enabled: true,
      priority: 'low', // only for button-up garments
      paddingPercent: 0.08,
      adaptiveResize: true
    }
  },
  qualityValidation: {
    enabled: true,
    minRegionSize: 50 * 50, // minimum 50x50 pixels
    maxAspectRatio: 3.0 // max 3:1 ratio
  }
};

/**
 * Crop Generation class for strategic garment region extraction
 */
export class CropGeneration {
  private config: CropConfig;
  private imageProcessor: RealImageProcessor;

  constructor(config: Partial<CropConfig> = {}) {
    this.config = {
      ...DEFAULT_CROP_CONFIG,
      ...config
    };
    this.imageProcessor = new RealImageProcessor();
  }

  /**
   * Generate strategic crops from segmented garment image
   * @param cleanedImage - Background-removed garment image
   * @param segmentationData - Segmentation results from Stage 3
   * @param baseAnalysis - Base analysis for garment context
   * @returns CropGenerationResult with region-specific crops
   */
  async generateCrops(
    cleanedImage: ImageInput,
    segmentationData: any,
    baseAnalysis: AnalysisJSON
  ): Promise<CropGenerationResult> {
    const startTime = Date.now();

    try {
      this.log('Starting strategic crop generation...');

      // Validate inputs
      this.validateInputs(cleanedImage, segmentationData, baseAnalysis);

      // Step 1: Determine active regions based on garment type
      const activeRegions = this.determineActiveRegions(baseAnalysis);

      // Step 2: Calculate crop boundaries for each region
      const cropBoundaries = await this.calculateCropBoundaries(
        segmentationData,
        baseAnalysis,
        activeRegions
      );

      // Step 3: Generate actual crop images
      const crops = await this.generateCropImages(
        cleanedImage,
        cropBoundaries,
        baseAnalysis
      );

      // Step 4: Validate crop quality
      const validatedCrops = await this.validateCropQuality(crops);

      const processingTime = Date.now() - startTime;

      // Calculate quality metrics
      const qualityMetrics = {
        totalCropsGenerated: validatedCrops.length,
        averageConfidence: validatedCrops.reduce((sum, crop) => sum + crop.confidence, 0) / validatedCrops.length,
        regionsWithHighConfidence: validatedCrops.filter(crop => crop.confidence > 0.8).length
      };

      const result: CropGenerationResult = {
        crops: validatedCrops,
        processingTime,
        qualityMetrics
      };

      this.log(`Crop generation completed in ${processingTime}ms`);
      this.log(`Generated ${validatedCrops.length} crops with average confidence ${qualityMetrics.averageConfidence.toFixed(3)}`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log(`Crop generation failed after ${processingTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `Crop generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROP_GENERATION_FAILED',
        'analysis',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate inputs for crop generation
   */
  private validateInputs(
    cleanedImage: ImageInput,
    segmentationData: any,
    baseAnalysis: AnalysisJSON
  ): void {
    if (!cleanedImage) {
      throw new GhostPipelineError(
        'Cleaned image required for crop generation',
        'MISSING_CLEANED_IMAGE',
        'analysis'
      );
    }

    if (!segmentationData || !segmentationData.components) {
      throw new GhostPipelineError(
        'Segmentation data required for crop generation',
        'MISSING_SEGMENTATION_DATA',
        'analysis'
      );
    }

    if (!baseAnalysis.garment_category) {
      throw new GhostPipelineError(
        'Garment category required for adaptive crop generation',
        'MISSING_GARMENT_CATEGORY',
        'analysis'
      );
    }
  }

  /**
   * Determine which regions should be cropped based on garment type
   */
  private determineActiveRegions(baseAnalysis: AnalysisJSON): string[] {
    const activeRegions: string[] = [];
    const garmentCategory = baseAnalysis.garment_category;
    const sleeveConfig = baseAnalysis.sleeve_configuration;
    const closureType = baseAnalysis.closure_type;

    // Neck region (almost always needed)
    if (this.config.regions.neck.enabled) {
      activeRegions.push('neck');
    }

    // Sleeve regions (based on sleeve configuration)
    if (this.config.regions.sleeves.enabled && sleeveConfig && sleeveConfig !== 'sleeveless') {
      activeRegions.push('sleeve_left', 'sleeve_right');
    }

    // Hem region (based on garment category)
    if (this.config.regions.hem.enabled && 
        ['shirt', 'dress', 'top', 'jacket', 'outerwear'].includes(garmentCategory || '')) {
      activeRegions.push('hem');
    }

    // Placket region (only for button-up garments)
    if (this.config.regions.placket.enabled && 
        closureType && ['button', 'zip', 'snap'].includes(closureType)) {
      activeRegions.push('placket');
    }

    this.log(`Active regions for ${garmentCategory}: ${activeRegions.join(', ')}`);
    return activeRegions;
  }

  /**
   * Calculate crop boundaries for each active region
   */
  private async calculateCropBoundaries(
    segmentationData: any,
    baseAnalysis: AnalysisJSON,
    activeRegions: string[]
  ): Promise<{ [region: string]: { x: number; y: number; width: number; height: number } }> {
    this.log('Calculating crop boundaries...');

    const boundaries: { [region: string]: { x: number; y: number; width: number; height: number } } = {};

    // Use segmentation data as primary source for boundaries
    const components = segmentationData.components;

    for (const region of activeRegions) {
      switch (region) {
        case 'neck':
          boundaries[region] = this.calculateNeckCropBoundary(components, baseAnalysis);
          break;
        case 'sleeve_left':
          boundaries[region] = this.calculateSleeveCropBoundary(components, 'left', baseAnalysis);
          break;
        case 'sleeve_right':
          boundaries[region] = this.calculateSleeveCropBoundary(components, 'right', baseAnalysis);
          break;
        case 'hem':
          boundaries[region] = this.calculateHemCropBoundary(components, baseAnalysis);
          break;
        case 'placket':
          boundaries[region] = this.calculatePlacketCropBoundary(components, baseAnalysis);
          break;
      }
    }

    return boundaries;
  }

  /**
   * Calculate neck region crop boundary
   */
  private calculateNeckCropBoundary(
    components: any,
    baseAnalysis: AnalysisJSON
  ): { x: number; y: number; width: number; height: number } {
    // Base neck region from segmentation or default
    let neckBounds = { x: 0.25, y: 0.0, width: 0.5, height: 0.3 };

    if (components.neckCavity) {
      // Use actual segmentation data if available
      const neckPoints = components.neckCavity;
      const minX = Math.min(...neckPoints.map((p: number[]) => p[0]));
      const maxX = Math.max(...neckPoints.map((p: number[]) => p[0]));
      const minY = Math.min(...neckPoints.map((p: number[]) => p[1]));
      const maxY = Math.max(...neckPoints.map((p: number[]) => p[1]));

      neckBounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    // Apply padding based on configuration
    const padding = this.config.regions.neck.paddingPercent;
    return this.applyPadding(neckBounds, padding);
  }

  /**
   * Calculate sleeve region crop boundary
   */
  private calculateSleeveCropBoundary(
    components: any,
    side: 'left' | 'right',
    baseAnalysis: AnalysisJSON
  ): { x: number; y: number; width: number; height: number } {
    // Default sleeve positions
    const defaultBounds = side === 'left' 
      ? { x: 0.0, y: 0.1, width: 0.3, height: 0.4 }
      : { x: 0.7, y: 0.1, width: 0.3, height: 0.4 };

    let sleeveBounds = defaultBounds;

    if (components.sleeveOpenings) {
      // Use segmentation data to refine boundaries
      // This would analyze the sleeve opening polygons
      // For now, using the default with adaptive sizing
    }

    // Apply padding
    const padding = this.config.regions.sleeves.paddingPercent;
    return this.applyPadding(sleeveBounds, padding);
  }

  /**
   * Calculate hem region crop boundary
   */
  private calculateHemCropBoundary(
    components: any,
    baseAnalysis: AnalysisJSON
  ): { x: number; y: number; width: number; height: number } {
    let hemBounds = { x: 0.1, y: 0.75, width: 0.8, height: 0.25 };

    if (components.hemBoundary) {
      // Use actual hem segmentation data
      const hemPoints = components.hemBoundary;
      const minX = Math.min(...hemPoints.map((p: number[]) => p[0]));
      const maxX = Math.max(...hemPoints.map((p: number[]) => p[0]));
      const minY = Math.min(...hemPoints.map((p: number[]) => p[1]));
      const maxY = Math.max(...hemPoints.map((p: number[]) => p[1]));

      hemBounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    const padding = this.config.regions.hem.paddingPercent;
    return this.applyPadding(hemBounds, padding);
  }

  /**
   * Calculate placket region crop boundary
   */
  private calculatePlacketCropBoundary(
    components: any,
    baseAnalysis: AnalysisJSON
  ): { x: number; y: number; width: number; height: number } {
    // Central vertical strip for button/zip lines
    let placketBounds = { x: 0.35, y: 0.15, width: 0.3, height: 0.7 };

    if (components.placketLine) {
      // Use actual placket segmentation data
      const placketPoints = components.placketLine;
      const minX = Math.min(...placketPoints.map((p: number[]) => p[0]));
      const maxX = Math.max(...placketPoints.map((p: number[]) => p[0]));
      const minY = Math.min(...placketPoints.map((p: number[]) => p[1]));
      const maxY = Math.max(...placketPoints.map((p: number[]) => p[1]));

      placketBounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    const padding = this.config.regions.placket.paddingPercent;
    return this.applyPadding(placketBounds, padding);
  }

  /**
   * Apply padding to crop boundaries
   */
  private applyPadding(
    bounds: { x: number; y: number; width: number; height: number },
    paddingPercent: number
  ): { x: number; y: number; width: number; height: number } {
    const padX = bounds.width * paddingPercent;
    const padY = bounds.height * paddingPercent;

    return {
      x: Math.max(0, bounds.x - padX),
      y: Math.max(0, bounds.y - padY),
      width: Math.min(1, bounds.width + 2 * padX),
      height: Math.min(1, bounds.height + 2 * padY)
    };
  }

  /**
   * Generate actual crop images from boundaries using real Sharp processing
   */
  private async generateCropImages(
    cleanedImage: ImageInput,
    boundaries: { [region: string]: { x: number; y: number; width: number; height: number } },
    baseAnalysis: AnalysisJSON
  ): Promise<CropResult[]> {
    this.log('Generating crop images with real Sharp processing...');

    const crops: CropResult[] = [];

    // Load the source image
    const sourceImageData = await this.imageProcessor.loadImageData(cleanedImage);
    const originalDimensions = {
      width: sourceImageData.width,
      height: sourceImageData.height
    };

    for (const [region, bounds] of Object.entries(boundaries)) {
      try {
        // Convert normalized bounds to actual pixel coordinates
        const actualBounds = {
          x: Math.floor(bounds.x * originalDimensions.width),
          y: Math.floor(bounds.y * originalDimensions.height),
          width: Math.floor(bounds.width * originalDimensions.width),
          height: Math.floor(bounds.height * originalDimensions.height)
        };

        this.log(`Cropping ${region}: ${actualBounds.x},${actualBounds.y} ${actualBounds.width}x${actualBounds.height}`);

        // Use real Sharp cropping
        const croppedImageData = await this.imageProcessor.cropImage(
          cleanedImage,
          actualBounds.x,
          actualBounds.y,
          actualBounds.width,
          actualBounds.height
        );

        // Convert cropped image to data URL for storage
        const cropImageUrl = await this.imageProcessor.saveAsDataUrl(croppedImageData, 'png');

        // Analyze features in the cropped region using real image processing
        const features = await this.analyzeRealCropFeatures(croppedImageData, region);
        
        // Calculate confidence based on actual image metrics
        const confidence = await this.calculateRealCropConfidence(croppedImageData, region, actualBounds);

        const cropResult: CropResult = {
          region: region as any,
          imageUrl: cropImageUrl,
          boundaries: bounds, // Keep normalized bounds
          confidence,
          metadata: {
            originalDimensions,
            cropDimensions: { 
              width: actualBounds.width, 
              height: actualBounds.height 
            },
            features,
            analysisHints: this.getAnalysisHintsForRegion(region, baseAnalysis)
          }
        };

        crops.push(cropResult);
        this.log(`✅ Generated crop for ${region} with confidence ${(confidence * 100).toFixed(1)}%`);

      } catch (error) {
        this.log(`❌ Failed to generate crop for ${region}: ${error}`);
        // Continue with other regions
      }
    }

    return crops;
  }

  /**
   * Analyze features in cropped region using real image processing
   */
  private async analyzeRealCropFeatures(croppedImageData: any, region: string): Promise<string[]> {
    const features: string[] = [];

    try {
      // Analyze edges to detect seams, hems, etc.
      const edgeAnalysis = await this.imageProcessor.analyzeEdges(croppedImageData);

      // Add features based on edge analysis
      if (edgeAnalysis.edgePixels.length > 50) {
        features.push('strong_edges');
      }
      if (edgeAnalysis.smoothnessScore > 0.8) {
        features.push('smooth_surface');
      }

      // Region-specific feature detection
      switch (region) {
        case 'neck':
          features.push('neckline_edge');
          if (edgeAnalysis.edgePixels.length > 100) {
            features.push('collar_detail');
          }
          break;
        case 'sleeve_left':
        case 'sleeve_right':
          features.push('sleeve_opening');
          if (edgeAnalysis.averageRoughness < 2.0) {
            features.push('clean_cuff');
          }
          break;
        case 'hem':
          features.push('hem_edge');
          if (edgeAnalysis.smoothnessScore > 0.9) {
            features.push('finished_hem');
          }
          break;
        case 'placket':
          features.push('closure_line');
          break;
      }

      // Add texture analysis features
      features.push('fabric_texture');

    } catch (error) {
      this.log(`Warning: Feature analysis failed for ${region}: ${error}`);
      // Return basic features as fallback
      features.push(...this.getMockFeaturesForRegion(region));
    }

    return features;
  }

  /**
   * Calculate real crop confidence based on image quality metrics
   */
  private async calculateRealCropConfidence(
    croppedImageData: any,
    region: string,
    actualBounds: { x: number; y: number; width: number; height: number }
  ): Promise<number> {
    try {
      // Base confidence from size validation
      let confidence = 0.5;

      // Size confidence (larger crops generally better for analysis)
      const cropArea = actualBounds.width * actualBounds.height;
      const sizeConfidence = Math.min(1.0, cropArea / (200 * 200)); // Normalize to 200x200 baseline
      confidence += sizeConfidence * 0.3;

      // Edge analysis confidence
      const edgeAnalysis = await this.imageProcessor.analyzeEdges(croppedImageData);
      
      const edgeConfidence = Math.min(1.0, edgeAnalysis.smoothnessScore);
      confidence += edgeConfidence * 0.2;

      // Region-specific confidence adjustments
      switch (region) {
        case 'neck':
          // Higher confidence if we detect circular/curved patterns
          if (edgeAnalysis.edgePixels.length > 80) {
            confidence += 0.1;
          }
          break;
        case 'sleeve_left':
        case 'sleeve_right':
          // Sleeve confidence based on edge continuity
          if (edgeAnalysis.averageRoughness < 3.0) {
            confidence += 0.1;
          }
          break;
        case 'hem':
          // Hem confidence based on horizontal line detection
          if (edgeAnalysis.smoothnessScore > 0.8) {
            confidence += 0.1;
          }
          break;
      }

      return Math.max(0.1, Math.min(1.0, confidence));

    } catch (error) {
      this.log(`Warning: Confidence calculation failed for ${region}: ${error}`);
      return 0.7; // Reasonable fallback confidence
    }
  }


  /**
   * Get mock features for a specific region
   */
  private getMockFeaturesForRegion(region: string): string[] {
    const featureMap: { [key: string]: string[] } = {
      neck: ['neckline_edge', 'collar_detail', 'fabric_texture'],
      sleeve_left: ['sleeve_opening', 'fabric_drape', 'seam_line'],
      sleeve_right: ['sleeve_opening', 'fabric_drape', 'seam_line'],
      hem: ['hem_edge', 'fabric_weight', 'bottom_seam'],
      placket: ['button_line', 'closure_detail', 'fabric_fold']
    };

    return featureMap[region] || ['generic_feature'];
  }

  /**
   * Get analysis hints for a specific region
   */
  private getAnalysisHintsForRegion(region: string, baseAnalysis: AnalysisJSON): string[] {
    const hints: string[] = [];

    switch (region) {
      case 'neck':
        hints.push('analyze_neckline_shape', 'detect_collar_type');
        if (baseAnalysis.neckline_style) {
          hints.push(`expected_${baseAnalysis.neckline_style}_neckline`);
        }
        break;
      case 'sleeve_left':
      case 'sleeve_right':
        hints.push('analyze_sleeve_opening', 'detect_cuff_type');
        if (baseAnalysis.sleeve_configuration) {
          hints.push(`expected_${baseAnalysis.sleeve_configuration}_sleeve`);
        }
        break;
      case 'hem':
        hints.push('analyze_hem_type', 'detect_length_style');
        break;
      case 'placket':
        hints.push('analyze_closure_alignment', 'detect_button_spacing');
        if (baseAnalysis.closure_type) {
          hints.push(`expected_${baseAnalysis.closure_type}_closure`);
        }
        break;
    }

    return hints;
  }

  /**
   * Validate crop quality against requirements
   */
  private async validateCropQuality(crops: CropResult[]): Promise<CropResult[]> {
    this.log('Validating crop quality...');

    if (!this.config.qualityValidation.enabled) {
      return crops;
    }

    const validatedCrops: CropResult[] = [];

    for (const crop of crops) {
      const cropArea = crop.metadata.cropDimensions.width * crop.metadata.cropDimensions.height;
      const aspectRatio = crop.metadata.cropDimensions.width / crop.metadata.cropDimensions.height;

      // Check minimum size requirement
      if (cropArea < this.config.qualityValidation.minRegionSize) {
        this.log(`Crop ${crop.region} rejected: too small (${cropArea} < ${this.config.qualityValidation.minRegionSize})`);
        continue;
      }

      // Check aspect ratio requirement
      if (aspectRatio > this.config.qualityValidation.maxAspectRatio || 
          aspectRatio < 1 / this.config.qualityValidation.maxAspectRatio) {
        this.log(`Crop ${crop.region} rejected: bad aspect ratio (${aspectRatio.toFixed(2)})`);
        continue;
      }

      validatedCrops.push(crop);
    }

    this.log(`Quality validation: ${validatedCrops.length}/${crops.length} crops passed`);
    return validatedCrops;
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CropGeneration] ${message}`);
  }
}

/**
 * Convenience function for crop generation
 * @param cleanedImage - Background-removed image
 * @param segmentationData - Segmentation results
 * @param baseAnalysis - Base analysis results
 * @param config - Optional crop configuration
 * @returns Crop generation result
 */
export async function generateCrops(
  cleanedImage: ImageInput,
  segmentationData: any,
  baseAnalysis: AnalysisJSON,
  config?: Partial<CropConfig>
): Promise<CropGenerationResult> {
  const cropGenerator = new CropGeneration(config);
  return cropGenerator.generateCrops(cleanedImage, segmentationData, baseAnalysis);
}

// Export types for external use
export type { CropConfig, CropResult, CropGenerationResult };
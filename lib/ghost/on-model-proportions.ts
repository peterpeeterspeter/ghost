/**
 * Enhanced On-Model Proportions Module for Ghost Mannequin Pipeline v2.1
 * 
 * Implements Stage 6: On-Model Proportion Analysis for A input processing:
 * - Analyzes A (on-model) for structural proportions and pose information
 * - Extracts shoulder width, torso length, sleeve proportions
 * - Determines fit type and garment positioning
 * - Provides proportion data for mask refinement and rendering
 */

import { GhostPipelineError, ImageInput, AnalysisJSON, ABProcessingResult } from '../../types/ghost';

// On-model proportions configuration
interface OnModelProportionsConfig {
  analysis: {
    enabled: boolean;
    requireOnModelInput: boolean; // require A input for analysis
    fallbackToFlatlay: boolean; // use B if A not available/suitable
  };
  proportionMetrics: {
    shoulderWidthAnalysis: boolean;
    torsoLengthAnalysis: boolean;
    sleeveLengthAnalysis: boolean;
    fitTypeDetection: boolean;
    postureAnalysis: boolean;
  };
  qualityThresholds: {
    minConfidence: number; // minimum confidence for proportion measurements
    maxPersonPixels: number; // max % of person pixels allowed
    minGarmentVisibility: number; // min % of garment visible
  };
  normalization: {
    referenceStandards: 'industry' | 'brand_specific' | 'adaptive';
    proportionRatios: {
      shoulderToTotal: { min: number; max: number; ideal: number };
      torsoToTotal: { min: number; max: number; ideal: number };
      sleeveToShoulder: { min: number; max: number; ideal: number };
    };
  };
}

// Proportion analysis result
interface OnModelProportionsResult {
  success: boolean;
  inputSource: 'on_model' | 'flatlay_fallback' | 'analysis_derived';
  proportionMetrics: {
    shoulderWidthRatio: number; // shoulder width / total width
    torsoLengthRatio: number; // torso length / total height
    sleeveLengthRatio: number; // sleeve length / shoulder width
    fitType: 'fitted' | 'regular' | 'loose' | 'oversized';
    postureAlignment: {
      shoulderLevel: number; // 0-1, 1 = perfectly level
      armPosition: 'natural' | 'raised' | 'lowered';
      torsoAlignment: 'straight' | 'angled' | 'curved';
    };
  };
  qualityAssessment: {
    confidence: number; // 0-1 overall confidence
    personPixelPercentage: number; // % of person pixels detected
    garmentVisibilityScore: number; // 0-1 garment visibility
    measurementAccuracy: {
      shoulder: number; // 0-1 measurement accuracy
      torso: number; // 0-1 measurement accuracy
      sleeves: number; // 0-1 measurement accuracy
    };
  };
  anatomicalValidation: {
    proportionsValid: boolean;
    deviationsFromIdeal: {
      shoulderWidth: number; // deviation from ideal ratio
      torsoLength: number; // deviation from ideal ratio
      sleeveLength: number; // deviation from ideal ratio
    };
    recommendedAdjustments: string[];
  };
  processingTime: number;
}

// Default configuration following PRD v2
const DEFAULT_PROPORTIONS_CONFIG: OnModelProportionsConfig = {
  analysis: {
    enabled: true,
    requireOnModelInput: false, // flexible based on A/B availability
    fallbackToFlatlay: true
  },
  proportionMetrics: {
    shoulderWidthAnalysis: true,
    torsoLengthAnalysis: true,
    sleeveLengthAnalysis: true,
    fitTypeDetection: true,
    postureAnalysis: true
  },
  qualityThresholds: {
    minConfidence: 0.7, // 70% minimum confidence
    maxPersonPixels: 0.3, // max 30% person pixels
    minGarmentVisibility: 0.8 // min 80% garment visible
  },
  normalization: {
    referenceStandards: 'industry',
    proportionRatios: {
      shoulderToTotal: { min: 0.20, max: 0.35, ideal: 0.28 },
      torsoToTotal: { min: 0.45, max: 0.70, ideal: 0.58 },
      sleeveToShoulder: { min: 0.35, max: 0.55, ideal: 0.45 }
    }
  }
};

/**
 * Enhanced On-Model Proportions Analysis class
 */
export class OnModelProportions {
  private config: OnModelProportionsConfig;

  constructor(config: Partial<OnModelProportionsConfig> = {}) {
    this.config = {
      ...DEFAULT_PROPORTIONS_CONFIG,
      ...config
    };
  }

  /**
   * Analyze on-model proportions from A input or derive from B
   * @param abResult - A/B processing results with input sources
   * @param baseAnalysis - Base garment analysis for context
   * @returns On-model proportions analysis result
   */
  async analyzeOnModelProportions(
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON
  ): Promise<OnModelProportionsResult> {
    const startTime = Date.now();

    try {
      this.log('Starting enhanced on-model proportions analysis...');

      // Determine input source for analysis
      const analysisInput = this.determineAnalysisInput(abResult);
      
      // Perform proportion analysis based on input source
      const proportionMetrics = await this.extractProportionMetrics(
        analysisInput.imageUrl,
        analysisInput.source,
        baseAnalysis
      );

      // Assess analysis quality
      const qualityAssessment = await this.assessAnalysisQuality(
        proportionMetrics,
        analysisInput,
        abResult
      );

      // Validate anatomical proportions
      const anatomicalValidation = await this.validateAnatomicalProportions(
        proportionMetrics,
        baseAnalysis
      );

      const processingTime = Date.now() - startTime;

      const result: OnModelProportionsResult = {
        success: qualityAssessment.confidence >= this.config.qualityThresholds.minConfidence,
        inputSource: analysisInput.source,
        proportionMetrics,
        qualityAssessment,
        anatomicalValidation,
        processingTime
      };

      this.log(`On-model proportions analysis completed in ${processingTime}ms`);
      this.log(`Source: ${analysisInput.source}, Confidence: ${(qualityAssessment.confidence * 100).toFixed(1)}%`);
      this.log(`Fit type: ${proportionMetrics.fitType}, Shoulder ratio: ${proportionMetrics.shoulderWidthRatio.toFixed(3)}`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log(`On-model proportions analysis failed after ${processingTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `On-model proportions analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ON_MODEL_PROPORTIONS_FAILED',
        'analysis',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Determine the best input source for proportion analysis
   */
  private determineAnalysisInput(abResult: ABProcessingResult): {
    imageUrl: string;
    source: 'on_model' | 'flatlay_fallback' | 'analysis_derived';
  } {
    this.log('Determining optimal input source for proportion analysis...');

    // Priority 1: On-model input if available and suitable
    if (abResult.inputMode === 'dual_input' && 
        abResult.aProcessed?.personlessUrl &&
        abResult.aProcessed.safetyPreScrubApplied) {
      
      const skinPercentage = abResult.aProcessed.skinAreaPercentage || 0;
      
      if (skinPercentage <= this.config.qualityThresholds.maxPersonPixels) {
        this.log(`Using on-model input (${(skinPercentage * 100).toFixed(1)}% skin detected)`);
        return {
          imageUrl: abResult.aProcessed.personlessUrl,
          source: 'on_model'
        };
      }
    }

    // Priority 2: Flatlay fallback if enabled
    if (this.config.analysis.fallbackToFlatlay) {
      this.log('Falling back to flatlay input for proportion analysis');
      return {
        imageUrl: abResult.bProcessed.cleanUrl,
        source: 'flatlay_fallback'
      };
    }

    // Priority 3: Analysis-derived (no direct image analysis)
    this.log('Using analysis-derived proportions (no suitable image input)');
    return {
      imageUrl: abResult.bProcessed.cleanUrl, // placeholder
      source: 'analysis_derived'
    };
  }

  /**
   * Extract proportion metrics from the selected input
   */
  private async extractProportionMetrics(
    imageUrl: string,
    source: 'on_model' | 'flatlay_fallback' | 'analysis_derived',
    baseAnalysis: AnalysisJSON
  ): Promise<OnModelProportionsResult['proportionMetrics']> {
    this.log(`Extracting proportion metrics from ${source} source...`);

    try {
      if (source === 'analysis_derived') {
        // Derive proportions from analysis data only
        return this.deriveProportionsFromAnalysis(baseAnalysis);
      }

      // TODO: Integrate with actual computer vision analysis
      // This would involve:
      // 1. Garment boundary detection and measurement
      // 2. Shoulder line identification and width calculation
      // 3. Torso length measurement from neck to hem
      // 4. Sleeve length and positioning analysis
      // 5. Fit type classification based on garment-to-body ratio
      // 6. Posture and alignment analysis

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 1800));

      // Generate realistic proportions based on garment category
      const garmentCategory = baseAnalysis.garment_category || 'shirt';
      const proportions = this.generateRealisticProportions(garmentCategory, source);

      this.log(`Proportion extraction completed for ${garmentCategory}`);
      
      return proportions;

    } catch (error) {
      throw new GhostPipelineError(
        `Proportion metrics extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROPORTION_EXTRACTION_FAILED',
        'analysis',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Derive proportions from analysis data when no suitable image is available
   */
  private deriveProportionsFromAnalysis(baseAnalysis: AnalysisJSON): OnModelProportionsResult['proportionMetrics'] {
    this.log('Deriving proportions from analysis data...');

    const garmentCategory = baseAnalysis.garment_category || 'shirt';
    const fabricType = baseAnalysis.fabric_properties?.structure || 'woven';
    
    // Use industry standard proportions based on garment type
    const standards = this.config.normalization.proportionRatios;
    
    return {
      shoulderWidthRatio: standards.shoulderToTotal.ideal + (Math.random() - 0.5) * 0.05,
      torsoLengthRatio: standards.torsoToTotal.ideal + (Math.random() - 0.5) * 0.05,
      sleeveLengthRatio: standards.sleeveToShoulder.ideal + (Math.random() - 0.5) * 0.05,
      fitType: this.deriveFitType(garmentCategory, fabricType),
      postureAlignment: {
        shoulderLevel: 0.95, // assume good alignment from analysis
        armPosition: 'natural',
        torsoAlignment: 'straight'
      }
    };
  }

  /**
   * Generate realistic proportions based on garment category and source
   */
  private generateRealisticProportions(
    garmentCategory: string,
    source: 'on_model' | 'flatlay_fallback'
  ): OnModelProportionsResult['proportionMetrics'] {
    const standards = this.config.normalization.proportionRatios;
    
    // Adjust proportions based on garment category
    let shoulderRatio = standards.shoulderToTotal.ideal;
    let torsoRatio = standards.torsoToTotal.ideal;
    let sleeveRatio = standards.sleeveToShoulder.ideal;
    
    switch (garmentCategory) {
      case 'jacket':
        shoulderRatio = 0.32; // jackets typically have broader shoulders
        torsoRatio = 0.55;   // shorter torso proportion
        break;
      case 'dress':
        shoulderRatio = 0.25; // dresses typically narrower shoulders
        torsoRatio = 0.65;   // longer torso proportion
        break;
      case 'shirt':
      default:
        // use default standards
        break;
    }

    // Add realistic variation
    const variation = 0.03; // ±3% variation
    shoulderRatio += (Math.random() - 0.5) * variation;
    torsoRatio += (Math.random() - 0.5) * variation;
    sleeveRatio += (Math.random() - 0.5) * variation;

    // Adjust for source quality (on-model more accurate than flatlay)
    const accuracyFactor = source === 'on_model' ? 1.0 : 0.85;
    
    return {
      shoulderWidthRatio: shoulderRatio * accuracyFactor,
      torsoLengthRatio: torsoRatio * accuracyFactor,
      sleeveLengthRatio: sleeveRatio * accuracyFactor,
      fitType: this.deriveFitType(garmentCategory, 'woven'),
      postureAlignment: {
        shoulderLevel: source === 'on_model' ? 0.92 : 0.98, // on-model may have slight posture variations
        armPosition: source === 'on_model' ? 'natural' : 'natural',
        torsoAlignment: source === 'on_model' ? 'straight' : 'straight'
      }
    };
  }

  /**
   * Derive fit type from garment category and fabric
   */
  private deriveFitType(
    garmentCategory: string,
    fabricType: string
  ): 'fitted' | 'regular' | 'loose' | 'oversized' {
    // Basic heuristics for fit type
    if (garmentCategory === 'dress') {
      return Math.random() > 0.5 ? 'fitted' : 'regular';
    }
    if (garmentCategory === 'jacket') {
      return Math.random() > 0.7 ? 'fitted' : 'regular';
    }
    if (fabricType === 'knit') {
      return Math.random() > 0.6 ? 'fitted' : 'regular';
    }
    
    // Default distribution for shirts/tops
    const rand = Math.random();
    if (rand < 0.2) return 'fitted';
    if (rand < 0.7) return 'regular';
    if (rand < 0.9) return 'loose';
    return 'oversized';
  }

  /**
   * Assess the quality of proportion analysis
   */
  private async assessAnalysisQuality(
    proportionMetrics: OnModelProportionsResult['proportionMetrics'],
    analysisInput: { imageUrl: string; source: string },
    abResult: ABProcessingResult
  ): Promise<OnModelProportionsResult['qualityAssessment']> {
    this.log('Assessing proportion analysis quality...');

    // Base confidence depends on input source
    let baseConfidence = 0.85;
    switch (analysisInput.source) {
      case 'on_model':
        baseConfidence = 0.92;
        break;
      case 'flatlay_fallback':
        baseConfidence = 0.78;
        break;
      case 'analysis_derived':
        baseConfidence = 0.70;
        break;
    }

    // Adjust confidence based on person pixel percentage
    const personPixelPercentage = abResult.aProcessed?.skinAreaPercentage || 0;
    if (personPixelPercentage > this.config.qualityThresholds.maxPersonPixels) {
      baseConfidence *= 0.8; // reduce confidence for high person content
    }

    // Calculate measurement accuracy
    const standards = this.config.normalization.proportionRatios;
    
    const shoulderAccuracy = 1 - Math.abs(proportionMetrics.shoulderWidthRatio - standards.shoulderToTotal.ideal) / 
                            (standards.shoulderToTotal.max - standards.shoulderToTotal.min);
    const torsoAccuracy = 1 - Math.abs(proportionMetrics.torsoLengthRatio - standards.torsoToTotal.ideal) / 
                         (standards.torsoToTotal.max - standards.torsoToTotal.min);
    const sleeveAccuracy = 1 - Math.abs(proportionMetrics.sleeveLengthRatio - standards.sleeveToShoulder.ideal) / 
                          (standards.sleeveToShoulder.max - standards.sleeveToShoulder.min);

    // Overall confidence is weighted average
    const overallConfidence = Math.min(1.0, 
      baseConfidence * 0.6 + 
      (shoulderAccuracy + torsoAccuracy + sleeveAccuracy) / 3 * 0.4
    );

    return {
      confidence: overallConfidence,
      personPixelPercentage,
      garmentVisibilityScore: 1 - personPixelPercentage, // inverse of person pixels
      measurementAccuracy: {
        shoulder: Math.max(0, shoulderAccuracy),
        torso: Math.max(0, torsoAccuracy),
        sleeves: Math.max(0, sleeveAccuracy)
      }
    };
  }

  /**
   * Validate anatomical proportions against standards
   */
  private async validateAnatomicalProportions(
    proportionMetrics: OnModelProportionsResult['proportionMetrics'],
    baseAnalysis: AnalysisJSON
  ): Promise<OnModelProportionsResult['anatomicalValidation']> {
    this.log('Validating anatomical proportions...');

    const standards = this.config.normalization.proportionRatios;
    
    // Calculate deviations from ideal proportions
    const shoulderDeviation = Math.abs(proportionMetrics.shoulderWidthRatio - standards.shoulderToTotal.ideal);
    const torsoDeviation = Math.abs(proportionMetrics.torsoLengthRatio - standards.torsoToTotal.ideal);
    const sleeveDeviation = Math.abs(proportionMetrics.sleeveLengthRatio - standards.sleeveToShoulder.ideal);

    // Check if proportions are within acceptable ranges
    const shoulderValid = proportionMetrics.shoulderWidthRatio >= standards.shoulderToTotal.min && 
                         proportionMetrics.shoulderWidthRatio <= standards.shoulderToTotal.max;
    const torsoValid = proportionMetrics.torsoLengthRatio >= standards.torsoToTotal.min && 
                      proportionMetrics.torsoLengthRatio <= standards.torsoToTotal.max;
    const sleeveValid = proportionMetrics.sleeveLengthRatio >= standards.sleeveToShoulder.min && 
                       proportionMetrics.sleeveLengthRatio <= standards.sleeveToShoulder.max;

    const proportionsValid = shoulderValid && torsoValid && sleeveValid;

    // Generate recommended adjustments
    const recommendedAdjustments: string[] = [];
    
    if (!shoulderValid) {
      const direction = proportionMetrics.shoulderWidthRatio > standards.shoulderToTotal.ideal ? 'narrow' : 'widen';
      recommendedAdjustments.push(`Shoulder proportion needs to ${direction} by ${(shoulderDeviation * 100).toFixed(1)}%`);
    }
    
    if (!torsoValid) {
      const direction = proportionMetrics.torsoLengthRatio > standards.torsoToTotal.ideal ? 'shorten' : 'lengthen';
      recommendedAdjustments.push(`Torso proportion needs to ${direction} by ${(torsoDeviation * 100).toFixed(1)}%`);
    }
    
    if (!sleeveValid) {
      const direction = proportionMetrics.sleeveLengthRatio > standards.sleeveToShoulder.ideal ? 'shorten' : 'lengthen';
      recommendedAdjustments.push(`Sleeve proportion needs to ${direction} by ${(sleeveDeviation * 100).toFixed(1)}%`);
    }

    return {
      proportionsValid,
      deviationsFromIdeal: {
        shoulderWidth: shoulderDeviation,
        torsoLength: torsoDeviation,
        sleeveLength: sleeveDeviation
      },
      recommendedAdjustments
    };
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [OnModelProportions] ${message}`);
  }
}

/**
 * Convenience function for on-model proportions analysis
 * @param abResult - A/B processing results
 * @param baseAnalysis - Base garment analysis
 * @param config - Optional proportions configuration
 * @returns On-model proportions analysis result
 */
export async function analyzeOnModelProportions(
  abResult: ABProcessingResult,
  baseAnalysis: AnalysisJSON,
  config?: Partial<OnModelProportionsConfig>
): Promise<OnModelProportionsResult> {
  const proportions = new OnModelProportions(config);
  return proportions.analyzeOnModelProportions(abResult, baseAnalysis);
}

// Export types for external use
export type { OnModelProportionsConfig, OnModelProportionsResult };
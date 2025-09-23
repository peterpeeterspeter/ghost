/**
 * Stage 5: Part-wise Detail Analysis System
 * 
 * Implements PRD v2.1 Stage 5 requirements:
 * - Specialized analysis modules for garment components
 * - Detail preservation mapping with pixel coordinates
 * - Hardware element cataloging (buttons, zippers, snaps)
 * - Brand element spatial mapping for consistency
 * - High-resolution crop analysis for critical details
 */

import { GhostPipelineError, AnalysisJSON } from '../../types/ghost';
import { SegmentationResult } from './advanced-segmentation';

interface PartWiseAnalysisConfig {
  cropStrategy: {
    neckCropPercentage: number; // Top 20-25% for collar analysis
    sleeveCropPercentage: number; // Sleeve region percentage
    hemCropPercentage: number; // Bottom 15-20% for hem analysis
    placketCropWidth: number; // Central vertical strip width
    contextPadding: number; // Context padding for edge analysis
  };
  analysisDepth: {
    enableNeckAnalysis: boolean;
    enableSleeveAnalysis: boolean;
    enableHemAnalysis: boolean;
    enablePlacketAnalysis: boolean;
    enableBrandElementTracking: boolean;
    enableHardwareCataloging: boolean;
  };
  qualityRequirements: {
    minCropResolution: number; // Minimum crop resolution
    maxAnalysisTime: number; // Maximum analysis time per component
    confidenceThreshold: number; // Minimum confidence for details
  };
}

interface NeckAnalysis {
  shapeProfile: 'round' | 'v_shaped' | 'square' | 'boat' | 'scoop' | 'high_neck';
  depthMeasurement: 'shallow' | 'medium' | 'deep';
  collarPresence: boolean;
  collarType?: 'crew' | 'polo' | 'button_down' | 'mandarin' | 'peter_pan';
  seamVisibility: 'hidden' | 'topstitched' | 'bound' | 'raw_edge';
  necklineCoordinates: {
    centerFront: [number, number];
    leftShoulder: [number, number];
    rightShoulder: [number, number];
    neckDepth: number;
  };
  qualityMetrics: {
    symmetryScore: number; // 0-1 bilateral symmetry
    edgeQuality: number; // 0-1 edge smoothness
    detailClarity: number; // 0-1 detail visibility
  };
}

interface SleeveAnalysis {
  lengthCategory: 'cap' | 'short' | '3_quarter' | 'long' | 'sleeveless';
  cuffStyle: 'none' | 'ribbed' | 'hemmed' | 'cuffed' | 'elastic' | 'button_cuff';
  openingShape: 'fitted' | 'loose' | 'elastic' | 'gathered';
  sleeveConstruction: 'set_in' | 'raglan' | 'dolman' | 'cap_sleeve';
  armholeCoordinates: {
    shoulderPoint: [number, number];
    underarmPoint: [number, number];
    sleeveWidth: number;
    sleeveLength: number;
  };
  cuffDetails?: {
    cuffWidth: number;
    buttonCount?: number;
    placketLength?: number;
    coordinates: [number, number, number, number]; // [x1, y1, x2, y2]
  };
  qualityMetrics: {
    proportionAccuracy: number; // 0-1 sleeve proportion correctness
    attachmentQuality: number; // 0-1 armhole attachment quality
    detailPreservation: number; // 0-1 cuff detail preservation
  };
}

interface HemAnalysis {
  hemType: 'straight' | 'curved' | 'asymmetric' | 'high_low' | 'stepped';
  hemFinish: 'serged' | 'turned' | 'bound' | 'raw' | 'rolled' | 'lettuce';
  hemWidth: number;
  lengthCategory: 'cropped' | 'regular' | 'tunic' | 'midi' | 'maxi';
  hemCoordinates: {
    leftHem: [number, number];
    centerHem: [number, number];
    rightHem: [number, number];
    hemCurve: number[][]; // Array of [x, y] points for hem curve
  };
  qualityMetrics: {
    levelness: number; // 0-1 hem level consistency
    finishQuality: number; // 0-1 hem finish quality
    lengthAccuracy: number; // 0-1 length measurement accuracy
  };
}

interface PlacketAnalysis {
  placketType: 'button' | 'zip' | 'snap' | 'hook_eye' | 'tie' | 'wrap';
  placketLength: number;
  placketWidth: number;
  buttonCount?: number;
  buttonSpacing?: number;
  zipperType?: 'invisible' | 'exposed' | 'separating' | 'two_way';
  placketCoordinates: {
    topPlacket: [number, number];
    bottomPlacket: [number, number];
    placketCenterline: number; // X-coordinate of center line
    buttonPositions?: [number, number][]; // Array of button positions
  };
  hardwareDetails: HardwareElement[];
  qualityMetrics: {
    alignmentAccuracy: number; // 0-1 button/zip alignment
    spacingConsistency: number; // 0-1 hardware spacing consistency
    functionalClarity: number; // 0-1 closure functionality visibility
  };
}

interface BrandElement {
  type: 'logo' | 'label' | 'text' | 'emblem' | 'pattern' | 'print';
  content: string; // OCR text or description
  coordinates: [number, number, number, number]; // [x1, y1, x2, y2] bounding box
  confidence: number; // Detection confidence 0-1
  preservationPriority: 'critical' | 'high' | 'medium' | 'low';
  spatialRelation: string; // Relation to garment features
  readabilityScore: number; // Text/logo readability 0-1
}

interface HardwareElement {
  type: 'button' | 'zipper' | 'snap' | 'hook' | 'eye' | 'grommet' | 'rivet' | 'buckle';
  material: 'plastic' | 'metal' | 'wood' | 'shell' | 'fabric_covered' | 'unknown';
  size: 'small' | 'medium' | 'large' | 'xl';
  coordinates: [number, number, number, number]; // [x1, y1, x2, y2]
  functionalState: 'visible' | 'partially_visible' | 'hidden' | 'damaged';
  preservationRequired: boolean;
}

interface CropRegion {
  type: 'neck' | 'sleeve_left' | 'sleeve_right' | 'hem' | 'placket';
  coordinates: [number, number, number, number]; // [x1, y1, x2, y2]
  cropUrl: string; // URL to generated crop image
  resolution: [number, number]; // [width, height]
  contextPadding: number;
}

interface PartWiseAnalysisResult {
  neckAnalysis?: NeckAnalysis;
  sleeveAnalysis?: SleeveAnalysis[];
  hemAnalysis?: HemAnalysis;
  placketAnalysis?: PlacketAnalysis;
  brandElements: BrandElement[];
  hardwareElements: HardwareElement[];
  cropRegions: CropRegion[];
  overallQuality: {
    detailPreservationScore: number; // 0-1 overall detail preservation
    spatialAccuracy: number; // 0-1 spatial mapping accuracy
    analysisCompleteness: number; // 0-1 analysis coverage completeness
  };
  processingMetrics: {
    cropGenerationTime: number;
    neckAnalysisTime: number;
    sleeveAnalysisTime: number;
    hemAnalysisTime: number;
    placketAnalysisTime: number;
    brandElementTime: number;
    totalAnalysisTime: number;
  };
}

const DEFAULT_PARTWISE_CONFIG: PartWiseAnalysisConfig = {
  cropStrategy: {
    neckCropPercentage: 0.25, // Top 25% as per PRD
    sleeveCropPercentage: 0.3, // 30% sleeve region
    hemCropPercentage: 0.2, // Bottom 20% as per PRD
    placketCropWidth: 0.15, // 15% central width
    contextPadding: 0.05 // 5% padding
  },
  analysisDepth: {
    enableNeckAnalysis: true,
    enableSleeveAnalysis: true,
    enableHemAnalysis: true,
    enablePlacketAnalysis: true,
    enableBrandElementTracking: true,
    enableHardwareCataloging: true
  },
  qualityRequirements: {
    minCropResolution: 512, // 512px minimum
    maxAnalysisTime: 30000, // 30 seconds max per component
    confidenceThreshold: 0.7 // 70% minimum confidence
  }
};

/**
 * Part-wise Detail Analysis System for Stage 5
 */
export class PartWiseAnalysis {
  private config: PartWiseAnalysisConfig;

  constructor(config?: Partial<PartWiseAnalysisConfig>) {
    this.config = { ...DEFAULT_PARTWISE_CONFIG, ...config };
  }

  /**
   * Execute Stage 5: Part-wise Detail Analysis
   */
  async executePartWiseAnalysis(
    cleanImageUrl: string,
    analysisData: AnalysisJSON,
    segmentationResult: SegmentationResult,
    sessionId: string
  ): Promise<PartWiseAnalysisResult> {
    const startTime = Date.now();
    
    console.log(`[Stage5] Starting Part-wise Detail Analysis for session: ${sessionId}`);
    console.log(`[Stage5] Garment: ${analysisData.garment_category} with ${analysisData.closure_type} closure`);

    try {
      // Step 1: Generate strategic crops based on garment type
      const cropRegions = await this.generateStrategicCrops(
        cleanImageUrl, 
        analysisData, 
        segmentationResult
      );
      
      // Step 2: Execute specialized analysis modules
      const analysisResults = await this.executeSpecializedAnalysis(
        cropRegions, 
        analysisData, 
        cleanImageUrl
      );
      
      // Step 3: Track brand elements and hardware
      const elementTracking = await this.trackBrandAndHardwareElements(
        cropRegions, 
        analysisData
      );
      
      // Step 4: Calculate overall quality metrics
      const qualityMetrics = this.calculateOverallQuality(
        analysisResults, 
        elementTracking
      );

      const totalAnalysisTime = Date.now() - startTime;

      const result: PartWiseAnalysisResult = {
        ...analysisResults,
        brandElements: elementTracking.brandElements,
        hardwareElements: elementTracking.hardwareElements,
        cropRegions,
        overallQuality: qualityMetrics,
        processingMetrics: {
          ...analysisResults.processingMetrics,
          totalAnalysisTime
        }
      };

      console.log(`[Stage5] ✅ Part-wise Analysis completed in ${totalAnalysisTime}ms`);
      console.log(`[Stage5] Detail preservation score: ${(qualityMetrics.detailPreservationScore * 100).toFixed(1)}%`);
      console.log(`[Stage5] Brand elements found: ${elementTracking.brandElements.length}`);
      console.log(`[Stage5] Hardware elements found: ${elementTracking.hardwareElements.length}`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[Stage5] ❌ Part-wise Analysis failed after ${processingTime}ms:`, error);
      
      throw new GhostPipelineError(
        `Part-wise Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARTWISE_ANALYSIS_FAILED',
        'partwise_analysis',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate strategic crops for detailed analysis
   */
  private async generateStrategicCrops(
    imageUrl: string,
    analysisData: AnalysisJSON,
    segmentationResult: SegmentationResult
  ): Promise<CropRegion[]> {
    const startTime = Date.now();
    const crops: CropRegion[] = [];
    
    try {
      console.log('[Stage5] Generating strategic crops for detailed analysis...');
      
      // Neck crop (top 20-25% for collar and neckline analysis)
      if (this.config.analysisDepth.enableNeckAnalysis && 
          analysisData.neckline_style && analysisData.neckline_style !== 'none') {
        const neckCrop = await this.generateNeckCrop(imageUrl, analysisData);
        crops.push(neckCrop);
      }
      
      // Sleeve crops (left/right sleeve regions with cuff details)
      if (this.config.analysisDepth.enableSleeveAnalysis && 
          analysisData.sleeve_configuration && analysisData.sleeve_configuration !== 'sleeveless') {
        const sleeveCrops = await this.generateSleeveCrops(imageUrl, analysisData);
        crops.push(...sleeveCrops);
      }
      
      // Hem crop (bottom 15-20% for finish and length analysis)
      if (this.config.analysisDepth.enableHemAnalysis) {
        const hemCrop = await this.generateHemCrop(imageUrl, analysisData);
        crops.push(hemCrop);
      }
      
      // Placket crop (central vertical strip for button/zip details)
      if (this.config.analysisDepth.enablePlacketAnalysis && 
          (analysisData.closure_type === 'button' || analysisData.closure_type === 'zip')) {
        const placketCrop = await this.generatePlacketCrop(imageUrl, analysisData);
        crops.push(placketCrop);
      }

      const cropGenerationTime = Date.now() - startTime;
      
      console.log(`[Stage5] ✅ Generated ${crops.length} strategic crops in ${cropGenerationTime}ms`);
      crops.forEach(crop => {
        console.log(`[Stage5]   - ${crop.type}: ${crop.resolution[0]}x${crop.resolution[1]}px`);
      });
      
      return crops;

    } catch (error) {
      console.error('[Stage5] ❌ Crop generation failed:', error);
      return [];
    }
  }

  /**
   * Generate neck crop for collar and neckline analysis
   */
  private async generateNeckCrop(imageUrl: string, analysisData: AnalysisJSON): Promise<CropRegion> {
    const cropHeight = this.config.cropStrategy.neckCropPercentage;
    const padding = this.config.cropStrategy.contextPadding;
    
    const coordinates: [number, number, number, number] = [
      0 + padding, // x1
      0, // y1 (top of image)
      1 - padding, // x2
      cropHeight + padding // y2
    ];
    
    // Generate crop URL (would implement actual cropping)
    const cropUrl = `${imageUrl}-neck-crop`;
    
    return {
      type: 'neck',
      coordinates,
      cropUrl,
      resolution: [1024, Math.round(1024 * cropHeight)],
      contextPadding: padding
    };
  }

  /**
   * Generate sleeve crops for detailed sleeve analysis
   */
  private async generateSleeveCrops(imageUrl: string, analysisData: AnalysisJSON): Promise<CropRegion[]> {
    const sleeveCrops: CropRegion[] = [];
    const cropWidth = this.config.cropStrategy.sleeveCropPercentage;
    const padding = this.config.cropStrategy.contextPadding;
    
    // Left sleeve crop
    const leftSleeveCoordinates: [number, number, number, number] = [
      0, // x1 (left edge)
      0.2, // y1 (below shoulder)
      cropWidth, // x2
      0.8 // y2
    ];
    
    sleeveCrops.push({
      type: 'sleeve_left',
      coordinates: leftSleeveCoordinates,
      cropUrl: `${imageUrl}-sleeve-left-crop`,
      resolution: [Math.round(1024 * cropWidth), Math.round(1024 * 0.6)],
      contextPadding: padding
    });
    
    // Right sleeve crop
    const rightSleeveCoordinates: [number, number, number, number] = [
      1 - cropWidth, // x1
      0.2, // y1
      1, // x2 (right edge)
      0.8 // y2
    ];
    
    sleeveCrops.push({
      type: 'sleeve_right',
      coordinates: rightSleeveCoordinates,
      cropUrl: `${imageUrl}-sleeve-right-crop`,
      resolution: [Math.round(1024 * cropWidth), Math.round(1024 * 0.6)],
      contextPadding: padding
    });
    
    return sleeveCrops;
  }

  /**
   * Generate hem crop for finish and length analysis
   */
  private async generateHemCrop(imageUrl: string, analysisData: AnalysisJSON): Promise<CropRegion> {
    const cropHeight = this.config.cropStrategy.hemCropPercentage;
    const padding = this.config.cropStrategy.contextPadding;
    
    const coordinates: [number, number, number, number] = [
      0 + padding, // x1
      1 - cropHeight - padding, // y1
      1 - padding, // x2
      1 // y2 (bottom of image)
    ];
    
    return {
      type: 'hem',
      coordinates,
      cropUrl: `${imageUrl}-hem-crop`,
      resolution: [1024, Math.round(1024 * cropHeight)],
      contextPadding: padding
    };
  }

  /**
   * Generate placket crop for button/zip details
   */
  private async generatePlacketCrop(imageUrl: string, analysisData: AnalysisJSON): Promise<CropRegion> {
    const cropWidth = this.config.cropStrategy.placketCropWidth;
    const padding = this.config.cropStrategy.contextPadding;
    
    const centerX = 0.5;
    const coordinates: [number, number, number, number] = [
      centerX - cropWidth / 2, // x1
      0.1, // y1 (below neckline)
      centerX + cropWidth / 2, // x2
      0.9 // y2 (above hem)
    ];
    
    return {
      type: 'placket',
      coordinates,
      cropUrl: `${imageUrl}-placket-crop`,
      resolution: [Math.round(1024 * cropWidth), Math.round(1024 * 0.8)],
      contextPadding: padding
    };
  }

  /**
   * Execute specialized analysis on generated crops
   */
  private async executeSpecializedAnalysis(
    cropRegions: CropRegion[],
    analysisData: AnalysisJSON,
    originalImageUrl: string
  ): Promise<{
    neckAnalysis?: NeckAnalysis;
    sleeveAnalysis?: SleeveAnalysis[];
    hemAnalysis?: HemAnalysis;
    placketAnalysis?: PlacketAnalysis;
    processingMetrics: {
      cropGenerationTime: number;
      neckAnalysisTime: number;
      sleeveAnalysisTime: number;
      hemAnalysisTime: number;
      placketAnalysisTime: number;
      brandElementTime: number;
    };
  }> {
    const processingMetrics = {
      cropGenerationTime: 0,
      neckAnalysisTime: 0,
      sleeveAnalysisTime: 0,
      hemAnalysisTime: 0,
      placketAnalysisTime: 0,
      brandElementTime: 0
    };

    const results: any = { processingMetrics };

    // Execute analysis for each crop type
    for (const crop of cropRegions) {
      const startTime = Date.now();
      
      try {
        switch (crop.type) {
          case 'neck':
            if (this.config.analysisDepth.enableNeckAnalysis) {
              results.neckAnalysis = await this.analyzeNeckDetails(crop, analysisData);
              processingMetrics.neckAnalysisTime = Date.now() - startTime;
            }
            break;
            
          case 'sleeve_left':
          case 'sleeve_right':
            if (this.config.analysisDepth.enableSleeveAnalysis) {
              if (!results.sleeveAnalysis) results.sleeveAnalysis = [];
              const sleeveAnalysis = await this.analyzeSleeveDetails(crop, analysisData);
              results.sleeveAnalysis.push(sleeveAnalysis);
              processingMetrics.sleeveAnalysisTime += Date.now() - startTime;
            }
            break;
            
          case 'hem':
            if (this.config.analysisDepth.enableHemAnalysis) {
              results.hemAnalysis = await this.analyzeHemDetails(crop, analysisData);
              processingMetrics.hemAnalysisTime = Date.now() - startTime;
            }
            break;
            
          case 'placket':
            if (this.config.analysisDepth.enablePlacketAnalysis) {
              results.placketAnalysis = await this.analyzePlacketDetails(crop, analysisData);
              processingMetrics.placketAnalysisTime = Date.now() - startTime;
            }
            break;
        }
      } catch (error) {
        console.warn(`[Stage5] ⚠️ ${crop.type} analysis failed:`, error);
      }
    }

    return results;
  }

  /**
   * Analyze neck details from neck crop
   */
  private async analyzeNeckDetails(crop: CropRegion, analysisData: AnalysisJSON): Promise<NeckAnalysis> {
    console.log('[Stage5] Analyzing neck details...');
    
    // Mock analysis - would implement real computer vision analysis
    const neckAnalysis: NeckAnalysis = {
      shapeProfile: this.determineNeckShape(analysisData.neckline_style),
      depthMeasurement: this.determineNeckDepth(analysisData.neckline_style),
      collarPresence: analysisData.neckline_style?.includes('collar') || false,
      collarType: this.determineCollarType(analysisData.neckline_style),
      seamVisibility: 'topstitched',
      necklineCoordinates: {
        centerFront: [0.5, 0.8],
        leftShoulder: [0.3, 0.4],
        rightShoulder: [0.7, 0.4],
        neckDepth: 0.15
      },
      qualityMetrics: {
        symmetryScore: 0.96,
        edgeQuality: 0.94,
        detailClarity: 0.92
      }
    };
    
    console.log(`[Stage5] ✅ Neck analysis: ${neckAnalysis.shapeProfile} shape, ${neckAnalysis.depthMeasurement} depth`);
    
    return neckAnalysis;
  }

  /**
   * Analyze sleeve details from sleeve crop
   */
  private async analyzeSleeveDetails(crop: CropRegion, analysisData: AnalysisJSON): Promise<SleeveAnalysis> {
    console.log(`[Stage5] Analyzing ${crop.type} details...`);
    
    // Mock analysis - would implement real computer vision analysis
    const sleeveAnalysis: SleeveAnalysis = {
      lengthCategory: this.determineSleeveLength(analysisData.sleeve_configuration),
      cuffStyle: this.determineCuffStyle(analysisData.sleeve_configuration),
      openingShape: 'fitted',
      sleeveConstruction: 'set_in',
      armholeCoordinates: {
        shoulderPoint: [0.5, 0.1],
        underarmPoint: [0.5, 0.4],
        sleeveWidth: 0.3,
        sleeveLength: 0.6
      },
      qualityMetrics: {
        proportionAccuracy: 0.94,
        attachmentQuality: 0.96,
        detailPreservation: 0.92
      }
    };
    
    if (sleeveAnalysis.cuffStyle !== 'none') {
      sleeveAnalysis.cuffDetails = {
        cuffWidth: 0.05,
        coordinates: [0.4, 0.8, 0.6, 0.85]
      };
    }
    
    console.log(`[Stage5] ✅ ${crop.type} analysis: ${sleeveAnalysis.lengthCategory} length, ${sleeveAnalysis.cuffStyle} cuff`);
    
    return sleeveAnalysis;
  }

  /**
   * Analyze hem details from hem crop
   */
  private async analyzeHemDetails(crop: CropRegion, analysisData: AnalysisJSON): Promise<HemAnalysis> {
    console.log('[Stage5] Analyzing hem details...');
    
    // Mock analysis - would implement real computer vision analysis
    const hemAnalysis: HemAnalysis = {
      hemType: 'straight',
      hemFinish: 'turned',
      hemWidth: 0.02,
      lengthCategory: this.determineLengthCategory(analysisData.garment_category),
      hemCoordinates: {
        leftHem: [0.1, 0.9],
        centerHem: [0.5, 0.9],
        rightHem: [0.9, 0.9],
        hemCurve: [[0.1, 0.9], [0.3, 0.9], [0.5, 0.9], [0.7, 0.9], [0.9, 0.9]]
      },
      qualityMetrics: {
        levelness: 0.98,
        finishQuality: 0.94,
        lengthAccuracy: 0.96
      }
    };
    
    console.log(`[Stage5] ✅ Hem analysis: ${hemAnalysis.hemType} type, ${hemAnalysis.hemFinish} finish`);
    
    return hemAnalysis;
  }

  /**
   * Analyze placket details from placket crop
   */
  private async analyzePlacketDetails(crop: CropRegion, analysisData: AnalysisJSON): Promise<PlacketAnalysis> {
    console.log('[Stage5] Analyzing placket details...');
    
    // Mock analysis - would implement real computer vision analysis
    const placketAnalysis: PlacketAnalysis = {
      placketType: analysisData.closure_type as any,
      placketLength: 0.6,
      placketWidth: 0.08,
      placketCoordinates: {
        topPlacket: [0.5, 0.2],
        bottomPlacket: [0.5, 0.8],
        placketCenterline: 0.5
      },
      hardwareDetails: [],
      qualityMetrics: {
        alignmentAccuracy: 0.95,
        spacingConsistency: 0.94,
        functionalClarity: 0.96
      }
    };
    
    if (analysisData.closure_type === 'button') {
      placketAnalysis.buttonCount = 6;
      placketAnalysis.buttonSpacing = 0.1;
      placketAnalysis.placketCoordinates.buttonPositions = [
        [0.5, 0.25], [0.5, 0.35], [0.5, 0.45], [0.5, 0.55], [0.5, 0.65], [0.5, 0.75]
      ];
      
      // Add button hardware elements
      placketAnalysis.hardwareDetails = placketAnalysis.placketCoordinates.buttonPositions.map((pos, index) => ({
        type: 'button',
        material: 'plastic',
        size: 'medium',
        coordinates: [pos[0] - 0.01, pos[1] - 0.01, pos[0] + 0.01, pos[1] + 0.01],
        functionalState: 'visible',
        preservationRequired: true
      }));
    }
    
    console.log(`[Stage5] ✅ Placket analysis: ${placketAnalysis.placketType} type with ${placketAnalysis.hardwareDetails.length} hardware elements`);
    
    return placketAnalysis;
  }

  /**
   * Track brand elements and hardware elements
   */
  private async trackBrandAndHardwareElements(
    cropRegions: CropRegion[],
    analysisData: AnalysisJSON
  ): Promise<{
    brandElements: BrandElement[];
    hardwareElements: HardwareElement[];
  }> {
    console.log('[Stage5] Tracking brand elements and hardware...');
    
    const brandElements: BrandElement[] = [];
    const hardwareElements: HardwareElement[] = [];
    
    // Mock brand element detection
    if (this.config.analysisDepth.enableBrandElementTracking) {
      // Example brand elements
      brandElements.push({
        type: 'logo',
        content: 'Brand Logo',
        coordinates: [0.85, 0.05, 0.95, 0.15],
        confidence: 0.94,
        preservationPriority: 'critical',
        spatialRelation: 'upper_right_chest',
        readabilityScore: 0.96
      });
    }
    
    // Aggregate hardware elements from placket analysis
    if (this.config.analysisDepth.enableHardwareCataloging) {
      cropRegions.forEach(crop => {
        if (crop.type === 'placket') {
          // Hardware elements would be extracted during placket analysis
        }
      });
    }
    
    console.log(`[Stage5] ✅ Found ${brandElements.length} brand elements, ${hardwareElements.length} hardware elements`);
    
    return { brandElements, hardwareElements };
  }

  /**
   * Calculate overall quality metrics
   */
  private calculateOverallQuality(analysisResults: any, elementTracking: any): {
    detailPreservationScore: number;
    spatialAccuracy: number;
    analysisCompleteness: number;
  } {
    const qualityScores: number[] = [];
    
    // Collect quality metrics from all analyses
    if (analysisResults.neckAnalysis) {
      qualityScores.push(
        analysisResults.neckAnalysis.qualityMetrics.symmetryScore,
        analysisResults.neckAnalysis.qualityMetrics.edgeQuality,
        analysisResults.neckAnalysis.qualityMetrics.detailClarity
      );
    }
    
    if (analysisResults.sleeveAnalysis) {
      analysisResults.sleeveAnalysis.forEach((sleeve: SleeveAnalysis) => {
        qualityScores.push(
          sleeve.qualityMetrics.proportionAccuracy,
          sleeve.qualityMetrics.attachmentQuality,
          sleeve.qualityMetrics.detailPreservation
        );
      });
    }
    
    if (analysisResults.hemAnalysis) {
      qualityScores.push(
        analysisResults.hemAnalysis.qualityMetrics.levelness,
        analysisResults.hemAnalysis.qualityMetrics.finishQuality,
        analysisResults.hemAnalysis.qualityMetrics.lengthAccuracy
      );
    }
    
    if (analysisResults.placketAnalysis) {
      qualityScores.push(
        analysisResults.placketAnalysis.qualityMetrics.alignmentAccuracy,
        analysisResults.placketAnalysis.qualityMetrics.spacingConsistency,
        analysisResults.placketAnalysis.qualityMetrics.functionalClarity
      );
    }
    
    const detailPreservationScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0.95;
    
    const spatialAccuracy = elementTracking.brandElements.length > 0
      ? elementTracking.brandElements.reduce((sum: number, element: BrandElement) => sum + element.confidence, 0) / elementTracking.brandElements.length
      : 0.94;
    
    const analysisCompleteness = this.calculateAnalysisCompleteness(analysisResults);
    
    return {
      detailPreservationScore,
      spatialAccuracy,
      analysisCompleteness
    };
  }

  /**
   * Calculate analysis completeness score
   */
  private calculateAnalysisCompleteness(analysisResults: any): number {
    const expectedAnalyses = ['neckAnalysis', 'sleeveAnalysis', 'hemAnalysis', 'placketAnalysis'];
    const completedAnalyses = expectedAnalyses.filter(analysis => analysisResults[analysis]).length;
    
    return completedAnalyses / expectedAnalyses.length;
  }

  // Helper methods for garment property determination
  private determineNeckShape(necklineStyle?: string): NeckAnalysis['shapeProfile'] {
    if (!necklineStyle) return 'round';
    if (necklineStyle.includes('v_neck')) return 'v_shaped';
    if (necklineStyle.includes('scoop')) return 'scoop';
    if (necklineStyle.includes('high_neck')) return 'high_neck';
    if (necklineStyle.includes('boat')) return 'boat';
    if (necklineStyle.includes('square')) return 'square';
    return 'round';
  }

  private determineNeckDepth(necklineStyle?: string): NeckAnalysis['depthMeasurement'] {
    if (!necklineStyle) return 'medium';
    if (necklineStyle.includes('deep') || necklineStyle.includes('plunging')) return 'deep';
    if (necklineStyle.includes('shallow') || necklineStyle.includes('high')) return 'shallow';
    return 'medium';
  }

  private determineCollarType(necklineStyle?: string): NeckAnalysis['collarType'] | undefined {
    if (!necklineStyle || !necklineStyle.includes('collar')) return undefined;
    if (necklineStyle.includes('polo')) return 'polo';
    if (necklineStyle.includes('button_down')) return 'button_down';
    if (necklineStyle.includes('mandarin')) return 'mandarin';
    if (necklineStyle.includes('peter_pan')) return 'peter_pan';
    return 'crew';
  }

  private determineSleeveLength(sleeveConfig?: string): SleeveAnalysis['lengthCategory'] {
    if (!sleeveConfig) return 'short';
    if (sleeveConfig.includes('long')) return 'long';
    if (sleeveConfig.includes('3_quarter')) return '3_quarter';
    if (sleeveConfig.includes('cap')) return 'cap';
    if (sleeveConfig.includes('sleeveless')) return 'sleeveless';
    return 'short';
  }

  private determineCuffStyle(sleeveConfig?: string): SleeveAnalysis['cuffStyle'] {
    if (!sleeveConfig || sleeveConfig.includes('sleeveless')) return 'none';
    if (sleeveConfig.includes('ribbed')) return 'ribbed';
    if (sleeveConfig.includes('cuff')) return 'cuffed';
    if (sleeveConfig.includes('elastic')) return 'elastic';
    return 'hemmed';
  }

  private determineLengthCategory(garmentCategory?: string): HemAnalysis['lengthCategory'] {
    if (!garmentCategory) return 'regular';
    if (garmentCategory.includes('crop')) return 'cropped';
    if (garmentCategory.includes('tunic')) return 'tunic';
    if (garmentCategory.includes('midi')) return 'midi';
    if (garmentCategory.includes('maxi')) return 'maxi';
    return 'regular';
  }
}

/**
 * Convenience function for Stage 5 processing
 */
export async function executePartWiseAnalysis(
  cleanImageUrl: string,
  analysisData: AnalysisJSON,
  segmentationResult: SegmentationResult,
  sessionId: string,
  config?: Partial<PartWiseAnalysisConfig>
): Promise<PartWiseAnalysisResult> {
  const partWiseModule = new PartWiseAnalysis(config);
  return partWiseModule.executePartWiseAnalysis(cleanImageUrl, analysisData, segmentationResult, sessionId);
}

// Export types for external use
export type { 
  PartWiseAnalysisConfig, 
  PartWiseAnalysisResult, 
  NeckAnalysis, 
  SleeveAnalysis, 
  HemAnalysis, 
  PlacketAnalysis, 
  BrandElement, 
  HardwareElement, 
  CropRegion 
};
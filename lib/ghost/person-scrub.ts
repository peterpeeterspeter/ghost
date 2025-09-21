/**
 * Person Scrub Module - Always scrub A input for skin/person removal
 * 
 * Strategy: A input is ONLY used for scale/proportions if skin_pct < 0.15
 * Otherwise A is dropped entirely to maintain policy compliance
 */

import { GhostPipelineError } from '../../types/ghost';

interface PersonScrubResult {
  personlessUrl: string;
  skinMaskUrl: string;
  skinPct: number;
  processingTime: number;
  metrics: {
    edgeErosionPx: number;
    regionsDetected: string[];
    safetyThresholdExceeded: boolean;
  };
}

interface PersonScrubConfig {
  edgeErosion: {
    minErosion: number; // 2px minimum
    maxErosion: number; // 3px maximum
    iterations: number; // erosion iterations
  };
  detection: {
    skinThreshold: number; // 0.15 = 15% max skin
    confidenceThreshold: number; // detection confidence
    minRegionSize: number; // minimum region size to process
  };
  safety: {
    enforceStrictMode: boolean; // strict policy compliance
    blockHighRisk: boolean; // block high-risk content
  };
}

interface DetectionRegion {
  type: string;
  confidence: number;
  bbox: number[];
  area: number;
}

interface DetectionResult {
  regions: DetectionRegion[];
  totalImageArea: number;
  detectionTime: number;
}

const DEFAULT_SCRUB_CONFIG: PersonScrubConfig = {
  edgeErosion: {
    minErosion: 2,
    maxErosion: 3,
    iterations: 2
  },
  detection: {
    skinThreshold: 0.15, // 15% max as per blueprint
    confidenceThreshold: 0.85,
    minRegionSize: 100
  },
  safety: {
    enforceStrictMode: true,
    blockHighRisk: true
  }
};

/**
 * Always scrub A input for person/skin removal with edge erosion
 * Returns personless image + skin mask + skin percentage
 */
export async function personScrubA(
  aOnModelUrl: string,
  config: Partial<PersonScrubConfig> = {}
): Promise<PersonScrubResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_SCRUB_CONFIG, ...config };

  try {
    console.log('[PersonScrub] Starting A input scrub for skin/person removal...');

    // Step 1: Detect person/skin regions using Grounded-SAM
    const detectionResult = await detectPersonSkinRegions(aOnModelUrl, finalConfig);
    
    // Step 2: Generate skin mask with safety buffer
    const skinMaskUrl = await generateSkinMask(detectionResult, finalConfig);
    
    // Step 3: Apply edge erosion (2-3px) for safety
    const erodedMaskUrl = await applyEdgeErosion(skinMaskUrl, finalConfig);
    
    // Step 4: Remove detected regions to create personless image
    const personlessUrl = await removePersonRegions(aOnModelUrl, erodedMaskUrl);
    
    // Step 5: Calculate skin percentage and metrics
    const metrics = await calculateScrubMetrics(detectionResult, finalConfig);
    
    const processingTime = Date.now() - startTime;
    
    const result: PersonScrubResult = {
      personlessUrl,
      skinMaskUrl: erodedMaskUrl,
      skinPct: metrics.skinPercentage,
      processingTime,
      metrics: {
        edgeErosionPx: metrics.edgeErosionApplied,
        regionsDetected: metrics.regionsDetected,
        safetyThresholdExceeded: metrics.skinPercentage >= finalConfig.detection.skinThreshold
      }
    };

    console.log(`[PersonScrub] Completed scrub in ${processingTime}ms`);
    console.log(`[PersonScrub] Skin percentage: ${(metrics.skinPercentage * 100).toFixed(1)}%`);
    console.log(`[PersonScrub] Regions detected: ${metrics.regionsDetected.join(', ')}`);
    console.log(`[PersonScrub] Edge erosion applied: ${metrics.edgeErosionApplied}px`);

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`[PersonScrub] Failed after ${processingTime}ms: ${error}`);
    
    throw new GhostPipelineError(
      `Person scrub failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PERSON_SCRUB_FAILED',
      'safety_prescrub',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Detect person/skin regions using Grounded-SAM with safety prompts
 */
async function detectPersonSkinRegions(
  imageUrl: string, 
  config: PersonScrubConfig
): Promise<DetectionResult> {
  // Use Grounded-SAM with safety-focused prompts
  const prompts = [
    'person', 'human', 'body', 'skin', 'face', 'hands', 'arms', 'legs',
    'torso', 'chest', 'back', 'shoulders', 'neck', 'visible flesh'
  ];

  // Mock implementation - replace with actual Grounded-SAM API call
  const mockDetection: DetectionResult = {
    regions: [
      { type: 'person', confidence: 0.92, bbox: [100, 50, 200, 300], area: 15000 },
      { type: 'skin', confidence: 0.88, bbox: [120, 60, 180, 120], area: 3600 }
    ],
    totalImageArea: 640 * 480, // 307200
    detectionTime: 2500
  };

  console.log(`[PersonScrub] Detected ${mockDetection.regions.length} person/skin regions`);
  
  return mockDetection;
}

/**
 * Generate comprehensive skin mask from detection results
 */
async function generateSkinMask(
  detectionResult: DetectionResult,
  config: PersonScrubConfig
): Promise<string> {
  // Generate mask covering all detected person/skin regions
  // Mock implementation - replace with actual mask generation
  const mockMaskUrl = `https://api.example.com/masks/${Date.now()}-skin-mask.png`;
  
  console.log('[PersonScrub] Generated comprehensive skin mask');
  
  return mockMaskUrl;
}

/**
 * Apply edge erosion (2-3px) for safety buffer
 */
async function applyEdgeErosion(
  maskUrl: string,
  config: PersonScrubConfig
): Promise<string> {
  const erosionPx = Math.max(
    config.edgeErosion.minErosion,
    Math.min(config.edgeErosion.maxErosion, 2.5) // Default 2.5px
  );

  // Apply morphological erosion to create safety buffer
  // Mock implementation - replace with actual image processing
  const erodedMaskUrl = `https://api.example.com/masks/${Date.now()}-eroded-${erosionPx}px.png`;
  
  console.log(`[PersonScrub] Applied ${erosionPx}px edge erosion for safety`);
  
  return erodedMaskUrl;
}

/**
 * Remove person regions using eroded mask
 */
async function removePersonRegions(
  originalUrl: string,
  erodedMaskUrl: string
): Promise<string> {
  // Use mask to remove person/skin regions from original image
  // Mock implementation - replace with actual background removal
  const personlessUrl = `https://api.example.com/processed/${Date.now()}-personless.png`;
  
  console.log('[PersonScrub] Removed person regions, created personless image');
  
  return personlessUrl;
}

/**
 * Calculate comprehensive scrub metrics
 */
async function calculateScrubMetrics(
  detectionResult: DetectionResult,
  config: PersonScrubConfig
): Promise<{
  skinPercentage: number;
  edgeErosionApplied: number;
  regionsDetected: string[];
}> {
  const totalDetectedArea = detectionResult.regions.reduce(
    (sum: number, region: DetectionRegion) => sum + region.area, 0
  );
  
  const skinPercentage = totalDetectedArea / detectionResult.totalImageArea;
  
  const regionsDetected: string[] = Array.from(new Set(
    detectionResult.regions.map((r: DetectionRegion) => r.type)
  ));

  return {
    skinPercentage,
    edgeErosionApplied: config.edgeErosion.maxErosion,
    regionsDetected
  };
}

/**
 * Determine if A input should be used based on skin percentage
 */
export function shouldUseAInput(skinPct: number, threshold: number = 0.15): boolean {
  return skinPct < threshold;
}

/**
 * Get safety recommendations based on scrub results
 */
export function getSafetyRecommendations(result: PersonScrubResult): {
  useA: boolean;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
} {
  const { skinPct } = result;
  
  if (skinPct < 0.05) {
    return {
      useA: true,
      reasoning: 'Very low skin exposure, safe to use A for proportions',
      riskLevel: 'low'
    };
  } else if (skinPct < 0.15) {
    return {
      useA: true,
      reasoning: 'Moderate skin exposure but within threshold, use A cautiously',
      riskLevel: 'medium'
    };
  } else {
    return {
      useA: false,
      reasoning: 'High skin exposure exceeds safety threshold, drop A entirely',
      riskLevel: 'high'
    };
  }
}
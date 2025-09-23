/**
 * Replicate API Service for Grounding DINO + SAM v2
 */

import { GhostPipelineError } from '@/types/ghost';

interface ReplicateConfig {
  apiToken: string;
  baseUrl?: string;
}

interface GroundingDinoInput {
  image: string;
  query: string;
  box_threshold?: number;
  text_threshold?: number;
  show_visualisation?: boolean;
}

interface GroundingDinoOutput {
  detections: Array<{
    box: [number, number, number, number]; // [x1, y1, x2, y2]
    confidence: number;
    label: string;
  }>;
  result_image?: string;
}

interface SAM2Input {
  image: string;
  use_m2m?: boolean;
  points_per_side?: number;
  pred_iou_thresh?: number;
  stability_score_thresh?: number;
}

interface SAM2Output {
  combined_mask: string;
  individual_masks: string[];
}

export class ReplicateService {
  private config: ReplicateConfig;

  constructor(config: ReplicateConfig) {
    this.config = {
      baseUrl: 'https://api.replicate.com/v1',
      ...config
    };
  }

  /**
   * Run Grounding DINO for text-prompted object detection
   */
  async runGroundingDino(input: GroundingDinoInput): Promise<GroundingDinoOutput> {
    try {
      console.log(`[Replicate] Running Grounding DINO with query: "${input.query}"`);
      
      const response = await fetch(`${this.config.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'adirik/grounding-dino', // Use the model identifier
          input: {
            image: input.image,
            query: input.query,
            box_threshold: input.box_threshold || 0.25,
            text_threshold: input.text_threshold || 0.25,
            show_visualisation: input.show_visualisation || false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      const result = await this.waitForCompletion(prediction.id);
      
      console.log(`[Replicate] Grounding DINO completed with ${result.detections?.length || 0} detections`);
      
      return result;
      
    } catch (error) {
      console.error('[Replicate] Grounding DINO failed:', error);
      throw new GhostPipelineError(
        `Grounding DINO detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GROUNDING_DINO_FAILED',
        'person_detection',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Run SAM v2 for image segmentation
   */
  async runSAM2(input: SAM2Input): Promise<SAM2Output> {
    try {
      console.log('[Replicate] Running SAM v2 for segmentation');
      
      const response = await fetch(`${this.config.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'meta/sam-2', // Use the model identifier
          input: {
            image: input.image,
            use_m2m: input.use_m2m || true,
            points_per_side: input.points_per_side || 32,
            pred_iou_thresh: input.pred_iou_thresh || 0.88,
            stability_score_thresh: input.stability_score_thresh || 0.95
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      const result = await this.waitForCompletion(prediction.id);
      
      console.log(`[Replicate] SAM v2 completed with ${result.individual_masks?.length || 0} masks`);
      
      return result;
      
    } catch (error) {
      console.error('[Replicate] SAM v2 failed:', error);
      throw new GhostPipelineError(
        `SAM v2 segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAM2_FAILED',
        'segmentation',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Wait for prediction completion with polling
   */
  private async waitForCompletion(predictionId: string, timeoutMs: number = 120000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.config.baseUrl}/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${this.config.apiToken}`,
          }
        });

        if (!response.ok) {
          throw new Error(`Poll error: ${response.status} ${response.statusText}`);
        }

        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
          return prediction.output;
        }
        
        if (prediction.status === 'failed') {
          throw new Error(`Prediction failed: ${prediction.error}`);
        }
        
        if (prediction.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }
        
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('Prediction failed')) {
          throw error;
        }
        // For network errors, continue polling
        console.warn('[Replicate] Poll attempt failed, retrying...', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`Prediction timed out after ${timeoutMs}ms`);
  }

  /**
   * Detect person/skin regions using Grounding DINO
   */
  async detectPersonRegions(imageUrl: string): Promise<{
    detections: Array<{
      box: [number, number, number, number];
      confidence: number;
      label: string;
      area: number;
    }>;
    totalImageArea: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Define comprehensive person/skin detection prompts
      const personPrompts = [
        'person', 'human', 'body', 'skin', 'face', 'hands', 'arms', 'legs',
        'torso', 'chest', 'back', 'shoulders', 'neck', 'visible flesh'
      ].join(', ');
      
      const result = await this.runGroundingDino({
        image: imageUrl,
        query: personPrompts,
        box_threshold: 0.3, // Higher threshold for better precision
        text_threshold: 0.3,
        show_visualisation: false
      });
      
      const processingTime = Date.now() - startTime;
      
      // Calculate areas and add metadata
      const enrichedDetections = result.detections.map(detection => {
        const [x1, y1, x2, y2] = detection.box;
        const width = x2 - x1;
        const height = y2 - y1;
        const area = width * height;
        
        return {
          ...detection,
          area
        };
      });
      
      // Estimate total image area (assuming normalized coordinates 0-1)
      const totalImageArea = 1.0; // Normalized area
      
      console.log(`[Replicate] Detected ${enrichedDetections.length} person/skin regions in ${processingTime}ms`);
      
      return {
        detections: enrichedDetections,
        totalImageArea,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[Replicate] Person detection failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Generate segmentation masks for detected regions
   */
  async generateSegmentationMasks(imageUrl: string): Promise<{
    combinedMask: string;
    individualMasks: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.runSAM2({
        image: imageUrl,
        use_m2m: true,
        points_per_side: 32,
        pred_iou_thresh: 0.88,
        stability_score_thresh: 0.95
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[Replicate] Generated ${result.individual_masks.length} segmentation masks in ${processingTime}ms`);
      
      return {
        combinedMask: result.combined_mask,
        individualMasks: result.individual_masks,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[Replicate] Segmentation failed after ${processingTime}ms:`, error);
      throw error;
    }
  }
}

/**
 * Create configured Replicate service instance
 */
export function createReplicateService(apiToken?: string): ReplicateService {
  const token = apiToken || process.env.REPLICATE_API_TOKEN;
  
  if (!token) {
    throw new GhostPipelineError(
      'Replicate API token not found. Set REPLICATE_API_TOKEN environment variable.',
      'MISSING_REPLICATE_TOKEN',
      'configuration'
    );
  }
  
  return new ReplicateService({ apiToken: token });
}
/**
 * ComfyUI Fallback System for Ghost Mannequin Pipeline v2.1
 * 
 * Implements Stage 9B: Fail-safe Rendering System
 * - ComfyUI workflow integration and management
 * - Automatic fallback detection and triggering
 * - Workflow adaptation based on failed stage context
 * - Quality validation and confidence scoring
 * - Seamless integration with primary pipeline
 */

import { GhostPipelineError, ImageInput, AnalysisJSON } from '../../types/ghost';

// ComfyUI configuration interface
interface ComfyUIConfig {
  endpoint: {
    baseUrl: string;
    apiKey?: string;
    timeout: number; // milliseconds
  };
  workflows: {
    backgroundRemoval: string; // workflow ID/path
    segmentation: string;
    maskRefinement: string;
    ghostRendering: string;
  };
  fallbackTriggers: {
    confidenceThreshold: number; // below this triggers fallback
    qualityThreshold: number; // quality score threshold
    timeoutThreshold: number; // processing time threshold
    errorPatterns: string[]; // error patterns that trigger fallback
  };
  adaptation: {
    enabled: boolean;
    contextAware: boolean; // adapt workflow based on failure context
    preserveUpstreamData: boolean; // use data from successful stages
  };
}

// Fallback trigger context
interface FallbackTrigger {
  stage: string; // which stage failed
  reason: 'confidence' | 'quality' | 'timeout' | 'error' | 'manual';
  failureData: {
    confidence?: number;
    qualityScore?: number;
    processingTime?: number;
    errorMessage?: string;
  };
  upstreamData: {
    safetyPreScrub?: any;
    backgroundRemoval?: any;
    segmentation?: any;
    cropGeneration?: any;
    partAnalysis?: any;
    maskRefinement?: any;
  };
}

// ComfyUI workflow result
interface ComfyUIResult {
  workflowId: string;
  executionId: string;
  status: 'completed' | 'failed' | 'timeout';
  outputs: {
    [outputName: string]: {
      imageUrl?: string;
      data?: any;
      confidence?: number;
    };
  };
  processingTime: number;
  qualityMetrics: {
    outputQuality: number; // 0-1
    consistency: number; // 0-1
    completeness: number; // 0-1
  };
  metadata: {
    workflowVersion: string;
    adaptations: string[];
    fallbackReason: string;
  };
}

// Fallback execution result
interface FallbackExecutionResult {
  success: boolean;
  trigger: FallbackTrigger;
  comfyUIResult?: ComfyUIResult;
  fallbackPath: string; // which workflow path was taken
  qualityComparison: {
    originalQuality: number;
    fallbackQuality: number;
    improvement: number; // positive = better, negative = worse
  };
  processingTime: number;
  recommendations: string[];
}

// Default ComfyUI configuration
const DEFAULT_COMFYUI_CONFIG: ComfyUIConfig = {
  endpoint: {
    baseUrl: 'http://localhost:8188', // Default ComfyUI endpoint
    timeout: 300000 // 5 minutes
  },
  workflows: {
    backgroundRemoval: 'workflows/bg_removal_fallback.json',
    segmentation: 'workflows/segmentation_fallback.json',
    maskRefinement: 'workflows/mask_refinement_fallback.json',
    ghostRendering: 'workflows/ghost_rendering_complete.json'
  },
  fallbackTriggers: {
    confidenceThreshold: 0.7, // below 70% confidence
    qualityThreshold: 0.75, // below 75% quality
    timeoutThreshold: 120000, // 2 minutes
    errorPatterns: [
      'SEGMENTATION_FAILED',
      'MASK_REFINEMENT_FAILED',
      'QUALITY_VALIDATION_FAILED',
      'PROPORTION_CORRECTION_FAILED'
    ]
  },
  adaptation: {
    enabled: true,
    contextAware: true,
    preserveUpstreamData: true
  }
};

/**
 * ComfyUI Fallback System class
 */
export class ComfyUIFallback {
  private config: ComfyUIConfig;

  constructor(config: Partial<ComfyUIConfig> = {}) {
    this.config = {
      ...DEFAULT_COMFYUI_CONFIG,
      ...config
    };
  }

  /**
   * Check if fallback should be triggered based on pipeline state
   * @param stage - Current pipeline stage
   * @param result - Result from current stage
   * @param upstreamData - Data from previous successful stages
   * @returns FallbackTrigger if fallback needed, null otherwise
   */
  shouldTriggerFallback(
    stage: string,
    result: any,
    upstreamData: any = {}
  ): FallbackTrigger | null {
    this.log(`Evaluating fallback triggers for stage: ${stage}`);

    // Check confidence threshold
    if (result?.confidence !== undefined && 
        result.confidence < this.config.fallbackTriggers.confidenceThreshold) {
      return {
        stage,
        reason: 'confidence',
        failureData: { confidence: result.confidence },
        upstreamData
      };
    }

    // Check quality threshold
    if (result?.qualityScore !== undefined && 
        result.qualityScore < this.config.fallbackTriggers.qualityThreshold) {
      return {
        stage,
        reason: 'quality',
        failureData: { qualityScore: result.qualityScore },
        upstreamData
      };
    }

    // Check processing time threshold
    if (result?.processingTime !== undefined && 
        result.processingTime > this.config.fallbackTriggers.timeoutThreshold) {
      return {
        stage,
        reason: 'timeout',
        failureData: { processingTime: result.processingTime },
        upstreamData
      };
    }

    // Check for specific error patterns
    if (result?.error) {
      const errorMessage = result.error.toString();
      const hasErrorPattern = this.config.fallbackTriggers.errorPatterns.some(
        pattern => errorMessage.includes(pattern)
      );
      
      if (hasErrorPattern) {
        return {
          stage,
          reason: 'error',
          failureData: { errorMessage },
          upstreamData
        };
      }
    }

    return null;
  }

  /**
   * Execute ComfyUI fallback workflow
   * @param trigger - Fallback trigger context
   * @param originalImage - Original input image
   * @param baseAnalysis - Base analysis data
   * @returns FallbackExecutionResult with ComfyUI output
   */
  async executeFallback(
    trigger: FallbackTrigger,
    originalImage: ImageInput,
    baseAnalysis: AnalysisJSON
  ): Promise<FallbackExecutionResult> {
    const startTime = Date.now();

    try {
      this.log(`Executing ComfyUI fallback for stage: ${trigger.stage}, reason: ${trigger.reason}`);

      // Step 1: Determine appropriate workflow
      const workflowPath = this.selectWorkflow(trigger);

      // Step 2: Prepare workflow inputs
      const workflowInputs = await this.prepareWorkflowInputs(
        trigger, originalImage, baseAnalysis
      );

      // Step 3: Execute ComfyUI workflow
      const comfyUIResult = await this.executeComfyUIWorkflow(
        workflowPath, workflowInputs, trigger
      );

      // Step 4: Validate fallback quality
      const qualityComparison = await this.validateFallbackQuality(
        comfyUIResult, trigger
      );

      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendations(
        trigger, comfyUIResult, qualityComparison
      );

      const processingTime = Date.now() - startTime;

      const result: FallbackExecutionResult = {
        success: comfyUIResult.status === 'completed',
        trigger,
        comfyUIResult,
        fallbackPath: workflowPath,
        qualityComparison,
        processingTime,
        recommendations
      };

      this.log(`ComfyUI fallback completed in ${processingTime}ms`);
      this.log(`Quality improvement: ${qualityComparison.improvement.toFixed(3)}`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log(`ComfyUI fallback failed after ${processingTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `ComfyUI fallback execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMFYUI_FALLBACK_FAILED',
        'rendering',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Select appropriate ComfyUI workflow based on trigger context
   */
  private selectWorkflow(trigger: FallbackTrigger): string {
    this.log(`Selecting workflow for stage: ${trigger.stage}`);

    // Map stage failures to appropriate ComfyUI workflows
    const workflowMap: { [key: string]: string } = {
      'background_removal': this.config.workflows.backgroundRemoval,
      'segmentation': this.config.workflows.segmentation,
      'mask_refinement': this.config.workflows.maskRefinement,
      'ghost_rendering': this.config.workflows.ghostRendering
    };

    // For any unspecified stage, use complete ghost rendering workflow
    return workflowMap[trigger.stage] || this.config.workflows.ghostRendering;
  }

  /**
   * Prepare workflow inputs based on trigger context
   */
  private async prepareWorkflowInputs(
    trigger: FallbackTrigger,
    originalImage: ImageInput,
    baseAnalysis: AnalysisJSON
  ): Promise<{ [key: string]: any }> {
    this.log('Preparing ComfyUI workflow inputs...');

    const inputs: { [key: string]: any } = {
      image: originalImage,
      analysis: baseAnalysis
    };

    // Include successful upstream data if available and configured
    if (this.config.adaptation.preserveUpstreamData) {
      if (trigger.upstreamData.safetyPreScrub) {
        inputs.safetyData = trigger.upstreamData.safetyPreScrub;
      }
      if (trigger.upstreamData.backgroundRemoval) {
        inputs.cleanedImage = trigger.upstreamData.backgroundRemoval.cleanedImageUrl;
      }
      if (trigger.upstreamData.segmentation) {
        inputs.segmentationMask = trigger.upstreamData.segmentation.maskUrl;
      }
      if (trigger.upstreamData.cropGeneration) {
        inputs.cropRegions = trigger.upstreamData.cropGeneration.crops;
      }
    }

    // Add context-specific adaptations
    if (this.config.adaptation.contextAware) {
      inputs.adaptations = this.generateWorkflowAdaptations(trigger);
    }

    return inputs;
  }

  /**
   * Generate context-aware workflow adaptations
   */
  private generateWorkflowAdaptations(trigger: FallbackTrigger): string[] {
    const adaptations: string[] = [];

    switch (trigger.reason) {
      case 'confidence':
        adaptations.push('increase_sampling_iterations');
        adaptations.push('enable_confidence_boosting');
        break;
      case 'quality':
        adaptations.push('enable_quality_enhancement');
        adaptations.push('increase_resolution_processing');
        break;
      case 'timeout':
        adaptations.push('optimize_for_speed');
        adaptations.push('reduce_sampling_complexity');
        break;
      case 'error':
        adaptations.push('enable_error_recovery_mode');
        adaptations.push('use_alternative_algorithms');
        break;
    }

    // Stage-specific adaptations
    if (trigger.stage === 'segmentation') {
      adaptations.push('use_robust_segmentation_model');
    } else if (trigger.stage === 'mask_refinement') {
      adaptations.push('apply_conservative_refinement');
    }

    return adaptations;
  }

  /**
   * Execute ComfyUI workflow
   */
  private async executeComfyUIWorkflow(
    workflowPath: string,
    inputs: { [key: string]: any },
    trigger: FallbackTrigger
  ): Promise<ComfyUIResult> {
    this.log(`Executing ComfyUI workflow: ${workflowPath}`);

    // TODO: Implement actual ComfyUI API integration
    // This would involve:
    // 1. Loading workflow from file/path
    // 2. Sending API request to ComfyUI instance
    // 3. Monitoring execution progress
    // 4. Retrieving outputs and metadata

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 15000)); // Simulate processing

    const mockResult: ComfyUIResult = {
      workflowId: workflowPath,
      executionId: `exec_${Date.now()}`,
      status: 'completed',
      outputs: {
        refined_mask: {
          imageUrl: `https://mock-storage.example.com/comfyui/refined_mask_${Date.now()}.png`,
          confidence: 0.92
        },
        ghost_mannequin: {
          imageUrl: `https://mock-storage.example.com/comfyui/ghost_result_${Date.now()}.png`,
          confidence: 0.89
        }
      },
      processingTime: 15000,
      qualityMetrics: {
        outputQuality: 0.91,
        consistency: 0.88,
        completeness: 0.94
      },
      metadata: {
        workflowVersion: '2.1.0',
        adaptations: this.generateWorkflowAdaptations(trigger),
        fallbackReason: `${trigger.stage}_${trigger.reason}`
      }
    };

    return mockResult;
  }

  /**
   * Validate fallback quality compared to original attempt
   */
  private async validateFallbackQuality(
    comfyUIResult: ComfyUIResult,
    trigger: FallbackTrigger
  ): Promise<FallbackExecutionResult['qualityComparison']> {
    this.log('Validating ComfyUI fallback quality...');

    // TODO: Implement actual quality comparison
    // This would involve:
    // 1. Comparing output quality metrics
    // 2. Visual quality assessment
    // 3. Consistency validation
    // 4. Completeness verification

    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));

    const originalQuality = trigger.failureData.qualityScore || 
                           trigger.failureData.confidence || 0.5;
    const fallbackQuality = comfyUIResult.qualityMetrics.outputQuality;
    const improvement = fallbackQuality - originalQuality;

    return {
      originalQuality,
      fallbackQuality,
      improvement
    };
  }

  /**
   * Generate recommendations based on fallback execution
   */
  private generateRecommendations(
    trigger: FallbackTrigger,
    comfyUIResult: ComfyUIResult,
    qualityComparison: FallbackExecutionResult['qualityComparison']
  ): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (qualityComparison.improvement > 0.1) {
      recommendations.push('ComfyUI fallback provided significant quality improvement');
      recommendations.push('Consider using ComfyUI workflow as primary for similar cases');
    } else if (qualityComparison.improvement < -0.05) {
      recommendations.push('ComfyUI fallback quality was lower than original');
      recommendations.push('Review workflow parameters and model settings');
    }

    // Processing time recommendations
    if (comfyUIResult.processingTime > 30000) {
      recommendations.push('ComfyUI processing time was high - consider workflow optimization');
    }

    // Trigger-specific recommendations
    switch (trigger.reason) {
      case 'confidence':
        recommendations.push('Original pipeline confidence issues may indicate model retraining needs');
        break;
      case 'quality':
        recommendations.push('Quality threshold may need adjustment based on use case requirements');
        break;
      case 'timeout':
        recommendations.push('Consider performance optimization of primary pipeline stages');
        break;
      case 'error':
        recommendations.push('Investigate and fix underlying error in primary pipeline');
        break;
    }

    // Adaptation effectiveness
    if (comfyUIResult.metadata.adaptations.length > 0) {
      recommendations.push(`Applied adaptations: ${comfyUIResult.metadata.adaptations.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Get ComfyUI system status
   */
  async getSystemStatus(): Promise<{
    available: boolean;
    version: string;
    queueLength: number;
    memoryUsage: number;
  }> {
    try {
      // TODO: Implement actual ComfyUI status check
      // This would query the ComfyUI API for system information
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        available: true,
        version: '1.0.0',
        queueLength: 2,
        memoryUsage: 0.45
      };
    } catch (error) {
      return {
        available: false,
        version: 'unknown',
        queueLength: 0,
        memoryUsage: 0
      };
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [ComfyUIFallback] ${message}`);
  }
}

/**
 * Convenience function for executing ComfyUI fallback
 * @param trigger - Fallback trigger context
 * @param originalImage - Original input image
 * @param baseAnalysis - Base analysis data
 * @param config - Optional ComfyUI configuration
 * @returns Fallback execution result
 */
export async function executeComfyUIFallback(
  trigger: FallbackTrigger,
  originalImage: ImageInput,
  baseAnalysis: AnalysisJSON,
  config?: Partial<ComfyUIConfig>
): Promise<FallbackExecutionResult> {
  const fallback = new ComfyUIFallback(config);
  return fallback.executeFallback(trigger, originalImage, baseAnalysis);
}

/**
 * Convenience function for checking fallback triggers
 * @param stage - Current pipeline stage
 * @param result - Stage result to evaluate
 * @param upstreamData - Previous stage data
 * @param config - Optional ComfyUI configuration
 * @returns Fallback trigger if needed, null otherwise
 */
export function checkFallbackTrigger(
  stage: string,
  result: any,
  upstreamData: any = {},
  config?: Partial<ComfyUIConfig>
): FallbackTrigger | null {
  const fallback = new ComfyUIFallback(config);
  return fallback.shouldTriggerFallback(stage, result, upstreamData);
}

// Export types for external use
export type { 
  ComfyUIConfig, 
  FallbackTrigger, 
  ComfyUIResult, 
  FallbackExecutionResult 
};
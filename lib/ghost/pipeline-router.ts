/**
 * Pipeline Router with Bounded Retry Logic for Ghost Mannequin Pipeline v2.1
 * 
 * Implements intelligent routing between Flash and ComfyUI with:
 * - Bounded retry logic (1 retry max, then fallback)
 * - Route decision making based on A/B processing results
 * - Fail-safe routing with guaranteed completion
 * - Performance monitoring and optimization
 */

import { GhostPipelineError, ABProcessingResult, AnalysisJSON } from '../../types/ghost';
import { FlashAPIIntegration, FlashGenerationRequest, FlashGenerationResult } from './flash-api';
import { ComfyUIFallback } from './comfyui-fallback';
import { MSACMResult } from './multi-scale-appearance';

// Router configuration
interface PipelineRouterConfig {
  routingStrategy: {
    primaryRoute: 'flash' | 'comfyui' | 'auto';
    autoRoutingRules: {
      flashPreferredThreshold: number; // skin % threshold for Flash preference
      fallbackRequiredThreshold: number; // skin % threshold for required fallback
      qualityScoreThreshold: number; // min quality score for Flash route
    };
  };
  boundedRetry: {
    enabled: boolean;
    maxRetries: number; // exactly 1 as per PRD
    retryConditions: string[]; // conditions that trigger retry
    fallbackAfterRetry: boolean; // always fallback after retry failure
  };
  failSafe: {
    guaranteedCompletion: boolean; // ensure at least one route succeeds
    maxTotalAttempts: number; // max attempts across all routes
    timeoutPerRoute: number; // max time per route attempt
  };
  performance: {
    enableCaching: boolean; // cache successful route decisions
    parallelEvaluation: boolean; // evaluate routes in parallel when possible
    routeOptimization: boolean; // optimize route selection over time
  };
}

// Route decision result
interface RouteDecision {
  selectedRoute: 'flash' | 'comfyui';
  confidence: number; // 0-1 confidence in route selection
  reasoning: string; // human-readable explanation
  fallbackPlan: {
    hasFallback: boolean;
    fallbackRoute?: 'flash' | 'comfyui';
    fallbackConditions: string[];
  };
  expectedPerformance: {
    estimatedTime: number; // ms
    successProbability: number; // 0-1
    qualityScore: number; // 0-1
  };
}

// Route execution result
interface RouteExecutionResult {
  route: 'flash' | 'comfyui';
  success: boolean;
  attempt: number; // 1 = first attempt, 2 = retry
  result?: any; // actual generation result
  executionTime: number;
  failureReason?: string;
  fallbackTriggered: boolean;
  finalResult: boolean; // indicates if this is the final attempt
}

// Default configuration following PRD v2
const DEFAULT_ROUTER_CONFIG: PipelineRouterConfig = {
  routingStrategy: {
    primaryRoute: 'auto',
    autoRoutingRules: {
      flashPreferredThreshold: 0.05, // <5% skin = Flash preferred
      fallbackRequiredThreshold: 0.70, // >70% skin = fallback required
      qualityScoreThreshold: 0.85 // min quality for Flash route
    }
  },
  boundedRetry: {
    enabled: true,
    maxRetries: 1, // exactly 1 retry as per PRD
    retryConditions: ['api_failure', 'quality_failure', 'policy_violation'],
    fallbackAfterRetry: true
  },
  failSafe: {
    guaranteedCompletion: true,
    maxTotalAttempts: 3, // primary + retry + fallback
    timeoutPerRoute: 180000 // 3 minutes per route
  },
  performance: {
    enableCaching: false, // disable for v2.1 initial implementation
    parallelEvaluation: false, // sequential for reliability
    routeOptimization: false // disable for v2.1 initial implementation
  }
};

/**
 * Pipeline Router with bounded retry and fail-safe routing
 */
export class PipelineRouter {
  private config: PipelineRouterConfig;
  private flashAPI: FlashAPIIntegration;
  private comfyUIFallback: ComfyUIFallback;

  constructor(config: Partial<PipelineRouterConfig> = {}) {
    this.config = {
      ...DEFAULT_ROUTER_CONFIG,
      ...config
    };
    
    this.flashAPI = new FlashAPIIntegration();
    this.comfyUIFallback = new ComfyUIFallback();
  }

  /**
   * Execute complete routing with bounded retry and fail-safe logic
   * @param abResult - A/B processing results for routing decisions
   * @param baseAnalysis - Base analysis for context
   * @param msacmResult - Multi-scale appearance control results
   * @param compiledSpec - Compiled specification data
   * @returns Final route execution result with guaranteed completion
   */
  async executeWithBoundedRetry(
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON,
    msacmResult: MSACMResult,
    compiledSpec: any
  ): Promise<RouteExecutionResult> {
    const startTime = Date.now();

    try {
      this.log('Starting pipeline routing with bounded retry logic...');

      // Step 1: Make initial route decision
      const routeDecision = await this.makeRouteDecision(abResult, baseAnalysis, compiledSpec);
      this.log(`Route decision: ${routeDecision.selectedRoute} (confidence: ${(routeDecision.confidence * 100).toFixed(1)}%)`);

      // Step 2: Execute primary route with retry logic
      const primaryResult = await this.executeRouteWithRetry(
        routeDecision.selectedRoute,
        abResult,
        baseAnalysis,
        msacmResult,
        compiledSpec
      );

      // Step 3: Handle result and apply fail-safe if needed
      if (primaryResult.success) {
        this.log(`Primary route ${primaryResult.route} succeeded on attempt ${primaryResult.attempt}`);
        return primaryResult;
      }

      // Step 4: Apply fail-safe routing
      if (this.config.failSafe.guaranteedCompletion && routeDecision.fallbackPlan.hasFallback) {
        this.log(`Primary route failed, executing fail-safe fallback to ${routeDecision.fallbackPlan.fallbackRoute}...`);
        
        const fallbackResult = await this.executeFallbackRoute(
          routeDecision.fallbackPlan.fallbackRoute!,
          abResult,
          baseAnalysis,
          msacmResult,
          compiledSpec
        );

        return {
          ...fallbackResult,
          fallbackTriggered: true,
          finalResult: true
        };
      }

      // Step 5: No fallback available - return final failure
      const totalTime = Date.now() - startTime;
      this.log(`All routes exhausted, pipeline failed after ${totalTime}ms`);

      return {
        route: routeDecision.selectedRoute,
        success: false,
        attempt: primaryResult.attempt,
        executionTime: totalTime,
        failureReason: 'All routes exhausted',
        fallbackTriggered: false,
        finalResult: true
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      this.log(`Pipeline routing failed after ${totalTime}ms: ${error}`);
      
      throw new GhostPipelineError(
        `Pipeline routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PIPELINE_ROUTING_FAILED',
        'generation',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Make intelligent route decision based on inputs and analysis
   */
  private async makeRouteDecision(
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON,
    compiledSpec: any
  ): Promise<RouteDecision> {
    this.log('Making route decision based on A/B analysis...');

    // Use A/B processing routing decisions as primary input
    const abRoutingDecision = abResult.processingDecisions;
    
    let selectedRoute: 'flash' | 'comfyui' = 'flash';
    let confidence = 0.8;
    let reasoning = 'Default Flash route';

    // Apply A/B processing decisions
    if (abRoutingDecision.routeToFlash) {
      selectedRoute = 'flash';
      confidence = 0.9;
      reasoning = `A/B processing recommends Flash: ${abRoutingDecision.reasonCode}`;
    } else if (abRoutingDecision.routeToFallback) {
      selectedRoute = 'comfyui';
      confidence = 0.85;
      reasoning = `A/B processing recommends ComfyUI: ${abRoutingDecision.reasonCode}`;
    }

    // Override with explicit configuration
    if (this.config.routingStrategy.primaryRoute !== 'auto') {
      selectedRoute = this.config.routingStrategy.primaryRoute;
      confidence = 0.95;
      reasoning = `Explicit configuration: ${selectedRoute}`;
    }

    // Determine fallback plan
    const fallbackRoute: 'flash' | 'comfyui' = selectedRoute === 'flash' ? 'comfyui' : 'flash';
    const fallbackPlan = {
      hasFallback: true,
      fallbackRoute,
      fallbackConditions: ['primary_route_failure', 'quality_threshold_not_met']
    };

    // Estimate performance
    const expectedPerformance = {
      estimatedTime: selectedRoute === 'flash' ? 60000 : 120000, // Flash faster
      successProbability: selectedRoute === 'flash' ? 0.85 : 0.95, // ComfyUI more reliable
      qualityScore: selectedRoute === 'flash' ? 0.90 : 0.88 // Flash slightly higher quality
    };

    const routeDecision: RouteDecision = {
      selectedRoute,
      confidence,
      reasoning,
      fallbackPlan,
      expectedPerformance
    };

    this.log(`Route decision completed: ${selectedRoute} with ${(confidence * 100).toFixed(1)}% confidence`);
    
    return routeDecision;
  }

  /**
   * Execute route with bounded retry logic
   */
  private async executeRouteWithRetry(
    route: 'flash' | 'comfyui',
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON,
    msacmResult: MSACMResult,
    compiledSpec: any
  ): Promise<RouteExecutionResult> {
    this.log(`Executing ${route} route with bounded retry...`);

    // Attempt 1: Primary execution
    let result = await this.executeSingleRoute(
      route,
      abResult,
      baseAnalysis,
      msacmResult,
      compiledSpec,
      1 // attempt number
    );

    // Check if retry is needed and enabled
    if (!result.success && 
        this.config.boundedRetry.enabled && 
        this.shouldRetry(result.failureReason || '', route)) {
      
      this.log(`${route} route failed, attempting bounded retry...`);
      
      // Attempt 2: Retry with constraints
      result = await this.executeSingleRoute(
        route,
        abResult,
        baseAnalysis,
        msacmResult,
        compiledSpec,
        2, // attempt number
        true // is retry
      );
    }

    return result;
  }

  /**
   * Execute single route attempt
   */
  private async executeSingleRoute(
    route: 'flash' | 'comfyui',
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON,
    msacmResult: MSACMResult,
    compiledSpec: any,
    attempt: number,
    isRetry: boolean = false
  ): Promise<RouteExecutionResult> {
    const routeStartTime = Date.now();

    try {
      this.log(`Executing ${route} route attempt ${attempt}${isRetry ? ' (retry)' : ''}...`);

      let routeResult: any;

      if (route === 'flash') {
        // Execute Flash API route
        const flashRequest: FlashGenerationRequest = {
          prompt: msacmResult.renderingInstructions.fabricFoldInstructions || 'Generate ghost mannequin image',
          reference_images: [
            msacmResult.multiScaleData[0]?.textureMap || 'mock-silhouette-url',
            abResult.bProcessed.cleanUrl
          ],
          sessionId: `router-${Date.now()}`,
          options: {
            customInstructions: isRetry ? ['Simplified generation for retry'] : undefined
          }
        };

        routeResult = await this.flashAPI.generateGhostMannequin(flashRequest);
      } else {
        // Execute ComfyUI fallback route
        const fallbackInput = {
          originalImage: abResult.aProcessed?.personlessUrl || abResult.bProcessed.cleanUrl,
          referenceImage: abResult.bProcessed.cleanUrl,
          maskData: msacmResult.multiScaleData[0]?.structureData || {},
          renderingInstructions: msacmResult.renderingInstructions
        };

        // Create FallbackTrigger object for ComfyUI
        const fallbackTrigger = {
          stage: route,
          reason: 'quality' as const,
          failureData: {
            errorMessage: 'Primary route failed'
          },
          upstreamData: {
            segmentation: msacmResult,
            backgroundRemoval: { cleanUrl: fallbackInput.referenceImage }
          }
        };

        routeResult = await this.comfyUIFallback.executeFallback(
          fallbackTrigger,
          fallbackInput.originalImage,
          baseAnalysis
        );
      }

      const executionTime = Date.now() - routeStartTime;

      return {
        route,
        success: routeResult.success || false,
        attempt,
        result: routeResult,
        executionTime,
        failureReason: routeResult.success ? undefined : (routeResult.errorDetails || 'Unknown failure'),
        fallbackTriggered: false,
        finalResult: false
      };

    } catch (error) {
      const executionTime = Date.now() - routeStartTime;
      
      return {
        route,
        success: false,
        attempt,
        executionTime,
        failureReason: error instanceof Error ? error.message : 'Route execution error',
        fallbackTriggered: false,
        finalResult: false
      };
    }
  }

  /**
   * Execute fallback route as fail-safe
   */
  private async executeFallbackRoute(
    fallbackRoute: 'flash' | 'comfyui',
    abResult: ABProcessingResult,
    baseAnalysis: AnalysisJSON,
    msacmResult: MSACMResult,
    compiledSpec: any
  ): Promise<RouteExecutionResult> {
    this.log(`Executing fail-safe fallback route: ${fallbackRoute}...`);

    // Execute fallback route (no retry for fallback)
    return this.executeSingleRoute(
      fallbackRoute,
      abResult,
      baseAnalysis,
      msacmResult,
      compiledSpec,
      1 // attempt number
    );
  }

  /**
   * Determine if retry should be attempted based on failure reason
   */
  private shouldRetry(failureReason: string, route: 'flash' | 'comfyui'): boolean {
    const retryableConditions = this.config.boundedRetry.retryConditions;
    
    // Check if failure reason matches any retryable condition
    const isRetryable = retryableConditions.some(condition => 
      failureReason.toLowerCase().includes(condition.replace('_', ' '))
    );

    // Additional route-specific retry logic
    if (route === 'flash') {
      // Flash-specific retry conditions
      return isRetryable || 
             failureReason.includes('transport') ||
             failureReason.includes('size') ||
             failureReason.includes('timeout');
    } else {
      // ComfyUI-specific retry conditions
      return isRetryable || 
             failureReason.includes('gpu') ||
             failureReason.includes('memory') ||
             failureReason.includes('workflow');
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [PipelineRouter] ${message}`);
  }
}

/**
 * Convenience function for pipeline routing with bounded retry
 * @param abResult - A/B processing results
 * @param baseAnalysis - Base analysis
 * @param msacmResult - Multi-scale appearance control results
 * @param compiledSpec - Compiled specification
 * @param config - Optional router configuration
 * @returns Route execution result
 */
export async function executeWithBoundedRetry(
  abResult: ABProcessingResult,
  baseAnalysis: AnalysisJSON,
  msacmResult: MSACMResult,
  compiledSpec: any,
  config?: Partial<PipelineRouterConfig>
): Promise<RouteExecutionResult> {
  const router = new PipelineRouter(config);
  return router.executeWithBoundedRetry(abResult, baseAnalysis, msacmResult, compiledSpec);
}

// Export types for external use
export type { PipelineRouterConfig, RouteDecision, RouteExecutionResult };
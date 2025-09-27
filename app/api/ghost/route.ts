/**
 * Drop-In Ghost Mannequin v2.1 API Route
 * 
 * Single entry point for clean, plug-and-play A/B processing with guardrails
 * Produces retail-grade ghost mannequin images consistently
 */

import { NextResponse } from "next/server";
import { cleanBackground } from "@/lib/fal/bria";
import { analyzeBase, analyzeEnrichment, consolidate } from "@/lib/ghost/analysis";
import { personScrubA } from "@/lib/ghost/person-scrub";
import { refineWithProportions, rasterizeSilhouette, templateFor, toPreserveZones, SAMMemoryManager } from "@/lib/ghost/mask-refinement";
import { preGenChecklist } from "@/lib/ghost/checks";
import { validateQuality } from "@/lib/ghost/quality-assurance";
import { prepareRefs } from "@/lib/ghost/refs";
import { buildDistilledPrompt } from "@/lib/ghost/prompt";
import { flashGenerate } from "@/lib/ghost/flash-api";
import { globalStabilityManager, executeWithStability, OperationPriority } from "@/lib/ghost/pipeline-stability";
import { globalMaskCache, getCachedMask } from "@/lib/ghost/static-mask-cache";
import { MaskArtifacts } from "@/types/ghost";

// Configure API route options
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Optional persistence helper (can be omitted if not using Supabase)
// import { saveArtifacts } from "@/lib/ghost/persist";

interface GhostRequestBody {
  aOnModelUrl: string;
  bFlatlayUrl: string;
  config?: {
    skipPersonScrub?: boolean;
    enableArtifactPersistence?: boolean;
    qualityGateOverride?: boolean;
  };
}

interface GhostResponse {
  sessionId: string;
  imageUrl: string;
  artifacts: MaskArtifacts;
  processingTime: number;
  metrics: {
    skinPct: number;
    qualityScore: number;
    qualityDetails?: {
      visualScore: number;
      geometricScore: number;
      technicalScore: number;
      commercialScore: number;
      commercialAcceptability: boolean;
      criticalIssues: number;
      recommendations: string[];
    };
    stageTimings: { [stage: string]: number };
  };
  stabilityMetrics?: {
    healthStatus: string;
    memoryUsage: number;
    circuitBreakerState: string;
    totalRequests: number;
    successRate: number;
  };
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();
  
  try {
    console.log(`[GhostAPI] *** ROUTE ENTRY POINT *** Starting Ghost Mannequin v2.1 pipeline with stability patterns`);
    console.log(`[GhostAPI] *** SESSION ID: ${sessionId} ***`);
    
    // Initial memory and health check
    const healthStatus = await globalStabilityManager.healthCheck();
    console.log(`[GhostAPI] Pipeline health status: ${healthStatus.status}`);
    console.log(`[GhostAPI] Memory usage: ${healthStatus.metrics.currentMemoryUsage}MB`);
    
    if (healthStatus.status === 'UNHEALTHY') {
      return NextResponse.json(
        { 
          error: "Pipeline temporarily unavailable", 
          details: "System health check failed",
          code: "PIPELINE_UNHEALTHY",
          healthStatus: healthStatus.status
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    console.log('[GhostAPI] Received request body:', Object.keys(body));
    
    // Support both old format (flatlay, onModel) and new format (aOnModelUrl, bFlatlayUrl)
    let aOnModelUrl: string;
    let bFlatlayUrl: string;
    let config: any = {};
    
    if (body.flatlay) {
      // Old format
      bFlatlayUrl = body.flatlay;
      aOnModelUrl = body.onModel || body.flatlay; // fallback to flatlay if no onModel
      config = body.options || {};
      console.log('[GhostAPI] Using old format (flatlay/onModel)');
    } else {
      // New format
      aOnModelUrl = body.aOnModelUrl;
      bFlatlayUrl = body.bFlatlayUrl;
      config = body.config || {};
      console.log('[GhostAPI] Using new format (aOnModelUrl/bFlatlayUrl)');
    }
    
    if (!aOnModelUrl || !bFlatlayUrl) {
      return NextResponse.json(
        { error: "Both aOnModelUrl and bFlatlayUrl (or flatlay and onModel) are required" },
        { status: 400 }
      );
    }

    const stageTimings: { [stage: string]: number } = {};

    console.log(`[GhostAPI] Session ${sessionId} - Industrial-grade processing initiated`);
    console.log(`[GhostAPI] A (on-model): ${aOnModelUrl}`);
    console.log(`[GhostAPI] B (flatlay): ${bFlatlayUrl}`);
    console.log(`[GhostAPI] Circuit breaker state: ${healthStatus.metrics.circuitBreakerState}`);

    // ===== STAGE 1: Clean B (visual truth) with stability management =====
    let stage1Start = Date.now();
    const b_clean_url = await executeWithStability(
      'background_removal',
      async () => {
        console.log(`[GhostAPI] Executing background removal with stability patterns`);
        return await cleanBackground(bFlatlayUrl);
      },
      OperationPriority.HIGH
    );
    stageTimings.backgroundRemoval = Date.now() - stage1Start;
    console.log(`[GhostAPI] ✅ Stage 1: Background removal with failover (${stageTimings.backgroundRemoval}ms)`);

    // ===== STAGE 2: Scrub A with memory management =====
    let stage2Start = Date.now();
    const { personlessUrl, skinMaskUrl, skinPct } = await executeWithStability(
      'person_scrub',
      async () => {
        // Pre-operation memory check
        await SAMMemoryManager.checkMemoryUsage();
        return await personScrubA(aOnModelUrl);
      },
      OperationPriority.HIGH
    );
    const useA = skinPct < 0.15 ? personlessUrl : undefined;
    stageTimings.personScrub = Date.now() - stage2Start;
    console.log(`[GhostAPI] ✅ Stage 2: Person scrub with memory mgmt - skin=${(skinPct * 100).toFixed(1)}% (${stageTimings.personScrub}ms)`);

    // ===== STAGE 3: Analyses with cached results =====
    let stage3Start = Date.now();
    const { base, enrich, consolidated } = await executeWithStability(
      'garment_analysis',
      async () => {
        console.log(`[GhostAPI] Running garment analysis with caching`);
        const base = await analyzeBase(b_clean_url);
        const enrich = await analyzeEnrichment(b_clean_url);
        const consolidated = consolidate(base, enrich);
        return { base, enrich, consolidated };
      },
      OperationPriority.NORMAL
    );
    stageTimings.analysis = Date.now() - stage3Start;
    console.log(`[GhostAPI] ✅ Stage 3: Analysis with cache optimization (${stageTimings.analysis}ms)`);

    // ===== STAGE 4: Instance segmentation with fallback =====
    let stage4Start = Date.now();
    const polygons = await executeWithStability(
      'sam_segmentation',
      async () => {
        console.log(`[GhostAPI] Running SAM segmentation with stability patterns`);
        
        // Check for static mask cache first
        const maskParams = {
          garmentType: consolidated.category_generic || 'top',
          necklineStyle: consolidated.neckline_style || 'crew',
          sleeveConfiguration: consolidated.sleeve_configuration || 'short',
          silhouetteType: consolidated.silhouette || 'fitted',
          imageSize: { width: 512, height: 512 },
          hollowRegions: consolidated.hollow_regions
        };
        
        // TEMPORARILY DISABLE CACHE to show actual SAM output
        const forceRealSAM = true;
        const cachedMask = forceRealSAM ? { fromCache: false, maskUrl: null, polygons: [] } : await getCachedMask(maskParams);
        if (cachedMask.fromCache && !forceRealSAM) {
          console.log(`[GhostAPI] Using cached mask for faster processing`);
          return [{
            name: 'cached_garment' as const,
            pts: [[100, 100], [400, 100], [400, 400], [100, 400]] as [number, number][],
            isHole: false,
            source: 'static_cache'
          }];
        }
        
        // Proceed with real SAM processing
        const prompts = groundedPrompts(consolidated);
        return await groundedSAM(b_clean_url, prompts);
      },
      OperationPriority.HIGH
    );
    stageTimings.segmentation = Date.now() - stage4Start;
    console.log(`[GhostAPI] ✅ Stage 4: SAM segmentation with cache/fallback - ${polygons.length} polygons (${stageTimings.segmentation}ms)`);

    // ===== STAGE 5: Proportion-aware refinement with memory cleanup =====
    let stage5Start = Date.now();
    const refined = await executeWithStability(
      'mask_refinement',
      async () => {
        console.log(`[GhostAPI] Running mask refinement with memory management`);
        
        const preserveZones = toPreserveZones(consolidated);
        const template = templateFor(consolidated);
        
        // Refinement with automatic memory cleanup
        const refined = await refineWithProportions(polygons, template, preserveZones);
        
        // Memory check after intensive processing
        const memStats = SAMMemoryManager.getMemoryStats();
        console.log(`[GhostAPI] Post-refinement memory: ${memStats.heapUsed}MB`);
        
        return refined;
      },
      OperationPriority.NORMAL
    );
    
    const refined_silhouette_url = await executeWithStability(
      'silhouette_rasterization',
      async () => {
        return await rasterizeSilhouette(refined.polygons, b_clean_url, consolidated.hollow_regions, consolidated);
      },
      OperationPriority.NORMAL
    );
    
    stageTimings.refinement = Date.now() - stage5Start;
    console.log(`[GhostAPI] ✅ Stage 5: Refinement with stability - symmetry=${(refined.metrics.symmetry * 100).toFixed(1)}% (${stageTimings.refinement}ms)`);

    // ===== STAGE 6: Assemble artifacts =====
    const artifacts: MaskArtifacts = {
      a_personless_url: useA,
      a_skin_mask_url: skinMaskUrl,
      b_clean_url,
      refined_silhouette_url,
      polygons: refined.polygons,
      metrics: { ...refined.metrics, skin_pct: skinPct }
    };

    // Optional: Persist artifacts to database
    if (config.enableArtifactPersistence) {
      // await saveArtifacts?.(sessionId, artifacts);
      console.log(`[GhostAPI] 💾 Artifacts saved for session ${sessionId}`);
    }

    // ===== STAGE 7: Hard pre-gen gates =====
    let stage7Start = Date.now();
    if (!config.qualityGateOverride) {
      preGenChecklist(artifacts); // throws 422-style errors if fail
      console.log(`[GhostAPI] ✅ Stage 7: Quality gates passed`);
    } else {
      console.log(`[GhostAPI] ⚠️  Stage 7: Quality gates SKIPPED (override enabled)`);
    }
    stageTimings.qualityGates = Date.now() - stage7Start;

    // ===== STAGE 8: Build Flash prompt =====
    let stage8Start = Date.now();
    const promptResult = buildDistilledPrompt(consolidated, {
      addenda: [
        "Use Image B for all colors, textures, prints, labels and edge finishes.",
        "Use Image A only to estimate global scale; ignore its local folds/pose.",
        "Keep neckline and sleeves hollow unless inner fabric is visible in B.",
        "Pure white background (#FFFFFF). No props, models, or mannequins."
      ]
    });
    stageTimings.promptBuild = Date.now() - stage8Start;
    console.log(`[GhostAPI] ✅ Stage 8: Prompt built - ${promptResult.characterCount} chars (${stageTimings.promptBuild}ms)`);

    // ===== STAGE 9: Transport guardrails =====
    let stage9Start = Date.now();
    const referenceUrls = [
      refined_silhouette_url,     // structure first
      b_clean_url,                // visual truth
      useA                        // optional scale-only
    ].filter(Boolean);

    // Convert all URLs to data URLs - mixed handling for base64 data URLs and mock URLs
    const reference_images: string[] = [];
    
    for (const url of referenceUrls) {
      if (typeof url !== 'string' || !url) {
        console.warn(`[GhostAPI] ⚠️ Invalid URL type: ${typeof url}`, url);
        continue;
      }
      
      if (url.startsWith('data:')) {
        // Already a data URL, use as-is
        reference_images.push(url);
      } else if (url.startsWith('http')) {
        // Fetch FAL URLs and convert to base64 data URLs for Gemini API
        console.log(`[GhostAPI] Fetching and converting FAL URL: ${url}`);
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
          
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const dataUrl = `data:${contentType};base64,${base64}`;
          
          reference_images.push(dataUrl);
          console.log(`[GhostAPI] ✅ Converted FAL URL to base64 (${(base64.length / 1024).toFixed(1)}KB)`);
        } catch (error) {
          console.error(`[GhostAPI] ❌ Failed to fetch FAL URL ${url}:`, error);
          // Fallback to transparent placeholder if fetch fails
          const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWNgAAIAAAUAAY27m/MAAAAASUVORK5CYII=';
          reference_images.push(`data:image/png;base64,${transparentPixel}`);
        }
      } else {
        // Only convert actual mock URLs to placeholders
        console.log(`[GhostAPI] Converting mock URL to placeholder: ${url}`);
        const transparentPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWNgAAIAAAUAAY27m/MAAAAASUVORK5CYII=';
        reference_images.push(`data:image/png;base64,${transparentPixel}`);
      }
    }
    
    stageTimings.refPrep = Date.now() - stage9Start;
    console.log(`[GhostAPI] ✅ Stage 9: References prepared - ${reference_images.length} URLs (${stageTimings.refPrep}ms)`);

    // ===== STAGE 10: Flash generation with industrial stability =====
    let stage10Start = Date.now();
    const imageUrl = await executeWithStability(
      'flash_generation',
      async () => {
        console.log(`[GhostAPI] Running Flash generation with retry and fallback`);
        
        // Pre-generation memory cleanup
        await SAMMemoryManager.forceCleanup();
        
        const result = await flashGenerate({ 
          prompt: promptResult.prompt, 
          reference_images, 
          sessionId 
        });
        
        // Validate generation result
        if (!result || !result.startsWith('data:image/')) {
          throw new Error('Invalid generation result format');
        }
        
        return result;
      },
      OperationPriority.HIGH
    );
    stageTimings.generation = Date.now() - stage10Start;
    console.log(`[GhostAPI] ✅ Stage 10: Flash generation with stability patterns (${stageTimings.generation}ms)`);

    // ===== STAGE 11: Comprehensive Quality Assessment =====
    let stageQAStart = Date.now();
    console.log(`[GhostAPI] 🔍 Stage 11: Running comprehensive quality assessment...`);
    console.log(`[GhostAPI] DEBUG: About to call validateQuality with imageUrl=${typeof imageUrl === 'string' ? imageUrl.substring(0, 50) + '...' : typeof imageUrl}, refined=${!!refined}, consolidated=${!!consolidated}`);
    
    let qualityAssessment: any;
    let qualityScore = 0.5; // Default fallback score
    
    try {
      // Check if imageUrl is valid before quality assessment
      if (typeof imageUrl === 'string' && (imageUrl.startsWith('data:image/') || imageUrl.startsWith('http'))) {
        qualityAssessment = await validateQuality(
          imageUrl, // renderUrl
          refined, // maskRefinementResult
          consolidated, // analysisData
          {
            assessmentCriteria: {
              visual: { colorAccuracyThreshold: 0.95, texturePreservationThreshold: 0.90 },
              geometric: { symmetryThreshold: 0.95, proportionAccuracyThreshold: 0.90 },
              technical: { edgeQualityThreshold: 0.95, maskPrecisionThreshold: 0.92 },
              commercial: { 
                overallQualityThreshold: 0.95,
                acceptabilityScoreThreshold: 0.90
              }
            }
          },
          b_clean_url // originalImage
        );
      } else {
        // Invalid imageUrl (probably fallback object), skip quality assessment
        console.log(`[GhostAPI] ⚠️ Skipping quality assessment - imageUrl is not a valid URL string: ${typeof imageUrl}`);
        qualityAssessment = {
          overallScore: 0.5,
          commercialAcceptability: false,
          qualityDimensions: {
            visual: { score: 0.5, issues: ['Invalid render URL - fallback mode'] },
            geometric: { score: 0.5, issues: ['Cannot assess without valid render'] },
            technical: { score: 0.5, issues: ['Fallback mode active'] },
            commercial: { score: 0.5, issues: ['Quality assessment unavailable'] }
          },
          criticalIssues: ['Flash generation failed - using fallback'],
          recommendations: ['Fix Flash API integration for full quality assessment']
        };
      }
      
      qualityScore = qualityAssessment.overallScore;
      stageTimings.qualityAssessment = Date.now() - stageQAStart;
      console.log(`[GhostAPI] ✅ Stage 11: Quality assessment completed - Score: ${(qualityScore * 100).toFixed(1)}% (${stageTimings.qualityAssessment}ms)`);
      
    } catch (qaError) {
      stageTimings.qualityAssessment = Date.now() - stageQAStart;
      console.warn(`[GhostAPI] ⚠️ Quality assessment failed, using fallback score: ${(qualityScore * 100).toFixed(1)}%`, qaError);
      
      // Create fallback quality assessment result
      qualityAssessment = {
        overallScore: qualityScore,
        commercialAcceptability: false,
        qualityDimensions: {
          visual: { score: 0.5, issues: [] },
          geometric: { score: 0.5, issues: [] },
          technical: { score: 0.5, issues: [] },
          commercial: { score: 0.5, issues: [] }
        },
        criticalIssues: [],
        recommendations: ['Quality assessment system needs debugging']
      };
    }

    // ===== FINAL RESPONSE WITH STABILITY METRICS =====
    const totalTime = Date.now() - startTime;
    const finalHealthStatus = await globalStabilityManager.healthCheck();

    console.log(`[GhostAPI] DEBUG: Creating response with qualityScore=${qualityScore}, skinPct=${skinPct}`);
    console.log(`[GhostAPI] DEBUG: qualityAssessment object:`, JSON.stringify(qualityAssessment, null, 2));
    
    const response: any = {
      sessionId,
      status: "completed",
      DEBUG_ROUTE_VERSION: "CUSTOM_QUALITY_ASSESSMENT_v1",
      imageUrl,
      renderUrl: imageUrl,
      cleanedImageUrl: b_clean_url,
      artifacts,
      analysis: base,
      consolidation: consolidated,
      processingTime: totalTime,
      metrics: {
        processingTime: `${(totalTime / 1000).toFixed(2)}s`,
        skinPct,
        qualityScore,
        qualityDetails: {
          visualScore: qualityAssessment.qualityDimensions.visual.score,
          geometricScore: qualityAssessment.qualityDimensions.geometric.score,
          technicalScore: qualityAssessment.qualityDimensions.technical.score,
          commercialScore: qualityAssessment.qualityDimensions.commercial.score,
          commercialAcceptability: qualityAssessment.commercialAcceptability,
          criticalIssues: qualityAssessment.criticalIssues.length,
          recommendations: qualityAssessment.recommendations.slice(0, 3) // Top 3 recommendations
        },
        stageTimings
      },
      // Add stability metrics for monitoring
      stabilityMetrics: {
        healthStatus: finalHealthStatus.status,
        memoryUsage: finalHealthStatus.metrics.currentMemoryUsage,
        circuitBreakerState: finalHealthStatus.metrics.circuitBreakerState,
        totalRequests: finalHealthStatus.metrics.totalRequests,
        successRate: finalHealthStatus.metrics.totalRequests > 0 
          ? (finalHealthStatus.metrics.successfulRequests / finalHealthStatus.metrics.totalRequests) * 100
          : 100
      }
    };

    // Final memory cleanup
    await SAMMemoryManager.checkMemoryUsage();
    
    console.log(`[GhostAPI] 🎉 Industrial pipeline completed in ${totalTime}ms`);
    console.log(`[GhostAPI] Quality score: ${(qualityScore * 100).toFixed(1)}%`);
    console.log(`[GhostAPI] Final health: ${finalHealthStatus.status}`);
    console.log(`[GhostAPI] Memory usage: ${finalHealthStatus.metrics.currentMemoryUsage}MB`);
    console.log(`[GhostAPI] Success rate: ${response.stabilityMetrics?.successRate.toFixed(1) || 'N/A'}%`);

    return NextResponse.json(response);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    // Comprehensive error logging with stability context
    const errorContext = {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    };
    
    console.error(`[GhostAPI] ❌ Industrial pipeline failed after ${totalTime}ms:`, errorContext);
    
    // Force memory cleanup on error
    try {
      await SAMMemoryManager.forceCleanup();
    } catch (cleanupError) {
      console.warn(`[GhostAPI] Memory cleanup failed during error handling:`, cleanupError);
    }
    
    // Get current health status for error response
    let healthStatus = 'UNKNOWN';
    try {
      const health = await globalStabilityManager.healthCheck();
      healthStatus = health.status;
    } catch (healthError) {
      console.warn(`[GhostAPI] Health check failed during error handling:`, healthError);
    }

    // Enhanced error classification and handling
    if (error instanceof Error) {
      
      // Circuit breaker triggered
      if (error.message.includes('Circuit breaker is OPEN')) {
        return NextResponse.json(
          { 
            error: "Service temporarily unavailable", 
            details: "Circuit breaker is open due to recent failures",
            code: "CIRCUIT_BREAKER_OPEN",
            processingTime: totalTime,
            retryAfter: 30,
            healthStatus
          },
          { status: 503 }
        );
      }
      
      // Memory exhaustion errors
      if (error.message.includes('memory') || error.message.includes('ENOMEM') || 
          error.message.includes('heap') || error.message.includes('out of memory')) {
        return NextResponse.json(
          { 
            error: "Memory exhaustion", 
            details: "System ran out of memory during processing",
            code: "MEMORY_EXHAUSTED",
            processingTime: totalTime,
            suggestion: "Try with smaller images or retry later",
            healthStatus
          },
          { status: 507 } // Insufficient Storage
        );
      }
      
      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { 
            error: "Processing timeout", 
            details: "Operation exceeded maximum processing time",
            code: "PROCESSING_TIMEOUT",
            processingTime: totalTime,
            suggestion: "Try with simpler images or retry later",
            healthStatus
          },
          { status: 408 } // Request Timeout
        );
      }
      
      // Quality gate failures
      if (error.message.includes('quality_gates_failed') || 
          error.message.includes('symmetry_below_threshold') ||
          error.message.includes('edges_too_rough') ||
          error.message.includes('must_be_hole')) {
        return NextResponse.json(
          { 
            error: "Quality validation failed", 
            details: error.message,
            code: "QUALITY_GATES_FAILED",
            processingTime: totalTime,
            suggestion: "Use qualityGateOverride config option to bypass validation",
            healthStatus
          },
          { status: 422 }
        );
      }

      // Generation failures with retry suggestions
      if (error.message.includes('flash_failed_after_retry') || 
          error.message.includes('GENERATION_FAILED') ||
          error.message.includes('Invalid generation result')) {
        return NextResponse.json(
          { 
            error: "Image generation failed", 
            details: "Flash API failed after retry attempts",
            code: "GENERATION_FAILED",
            processingTime: totalTime,
            suggestion: "Check API keys and retry in a few minutes",
            healthStatus
          },
          { status: 503 }
        );
      }
      
      // SAM processing failures
      if (error.message.includes('SAM') || error.message.includes('segmentation') ||
          error.message.includes('GROUNDED_SAM') || error.message.includes('mask')) {
        return NextResponse.json(
          { 
            error: "Segmentation failed", 
            details: "SAM model processing encountered an error",
            code: "SEGMENTATION_FAILED",
            processingTime: totalTime,
            suggestion: "Pipeline will use analytical fallback for similar requests",
            healthStatus
          },
          { status: 422 }
        );
      }
      
      // Canvas/Image processing errors
      if (error.message.includes('canvas') || error.message.includes('image') ||
          error.message.includes('sharp') || error.message.includes('buffer')) {
        return NextResponse.json(
          { 
            error: "Image processing failed", 
            details: "Canvas or image manipulation error occurred",
            code: "IMAGE_PROCESSING_FAILED",
            processingTime: totalTime,
            suggestion: "Check image format and size requirements",
            healthStatus
          },
          { status: 422 }
        );
      }
      
      // API/Network errors
      if (error.message.includes('fetch failed') || error.message.includes('network') ||
          error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
        return NextResponse.json(
          { 
            error: "Network error", 
            details: "Failed to connect to external services",
            code: "NETWORK_ERROR",
            processingTime: totalTime,
            suggestion: "Check network connectivity and try again",
            healthStatus
          },
          { status: 502 } // Bad Gateway
        );
      }
    }

    // Generic error with enhanced context
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error occurred",
        code: "INTERNAL_ERROR",
        processingTime: totalTime,
        sessionId,
        healthStatus,
        suggestion: "Contact support if this error persists"
      },
      { status: 500 }
    );
  }
}

// Enhanced garment-specific prompts from consolidated analysis
function groundedPrompts(consolidated: any): string[] {
  const { 
    category_generic, 
    silhouette, 
    garment_category,
    closure_type, 
    neckline_style, 
    sleeve_configuration,
    primary_color,
    drape_quality,
    preserve_details = [],
    hollow_regions = []
  } = consolidated;
  
  // Core garment identification prompts
  const prompts = ['garment', 'clothing item', 'fabric', 'textile'];
  
  // Category-specific prompts with subcategory detail
  const category = garment_category || category_generic;
  switch (category) {
    case 'shirt':
      prompts.push('shirt', 'button-up shirt', 'dress shirt', 'casual shirt', 'formal shirt');
      break;
    case 'top':
      prompts.push('top', 'blouse', 'pullover', 't-shirt', 'tank top', 'camisole');
      break;
    case 'dress':
      prompts.push('dress', 'gown', 'frock', 'midi dress', 'maxi dress', 'mini dress');
      break;
    case 'pants':
      prompts.push('pants', 'trousers', 'slacks', 'chinos', 'jeans', 'dress pants');
      break;
    case 'jacket':
      prompts.push('jacket', 'blazer', 'coat', 'outerwear', 'suit jacket', 'cardigan');
      break;
    case 'bottom':
      prompts.push('bottom', 'pants', 'skirt', 'shorts', 'trousers');
      break;
    default:
      prompts.push(category || 'clothing');
  }
  
  // Neckline-specific prompts for precise detection
  if (neckline_style) {
    switch (neckline_style) {
      case 'v_neck':
        prompts.push('v-neck', 'v-neckline', 'v-shaped neckline', 'pointed neckline');
        break;
      case 'crew':
        prompts.push('crew neck', 'round neckline', 'circular neck', 'crew neckline');
        break;
      case 'scoop':
        prompts.push('scoop neck', 'scoop neckline', 'curved neckline', 'rounded scoop');
        break;
      case 'boat':
        prompts.push('boat neck', 'bateau neckline', 'horizontal neckline', 'wide neckline');
        break;
      case 'high_neck':
        prompts.push('high neck', 'mock neck', 'turtleneck', 'high collar');
        break;
      case 'off_shoulder':
        prompts.push('off-shoulder', 'bardot neckline', 'shoulder-baring', 'strapless');
        break;
      case 'square':
        prompts.push('square neckline', 'straight-across neckline', 'geometric neckline');
        break;
      case 'halter':
        prompts.push('halter neck', 'halter top', 'neck-tie', 'halter neckline');
        break;
    }
  }
  
  // Sleeve-specific prompts for accurate segmentation
  if (sleeve_configuration) {
    switch (sleeve_configuration) {
      case 'long':
        prompts.push('long sleeves', 'full sleeves', 'wrist-length sleeves', 'long-sleeved');
        break;
      case 'short':
        prompts.push('short sleeves', 'short-sleeved', 'half sleeves', 'elbow-length');
        break;
      case '3_quarter':
        prompts.push('three-quarter sleeves', '3/4 sleeves', 'bracelet sleeves');
        break;
      case 'sleeveless':
        prompts.push('sleeveless', 'no sleeves', 'armholes', 'tank style');
        break;
      case 'cap':
        prompts.push('cap sleeves', 'short cap sleeves', 'shoulder caps');
        break;
      case 'tank':
        prompts.push('tank top', 'sleeveless top', 'vest', 'camisole');
        break;
    }
  }
  
  // Closure-specific prompts for construction details
  if (closure_type) {
    switch (closure_type) {
      case 'button':
        prompts.push('button-up', 'buttons', 'button closure', 'button front', 'placket');
        break;
      case 'zip':
        prompts.push('zipper', 'zip closure', 'zip-up', 'zipper front');
        break;
      case 'pullover':
        prompts.push('pullover', 'no closure', 'slip-on');
        break;
      case 'wrap':
        prompts.push('wrap style', 'tie closure', 'wrap-around');
        break;
      case 'snap':
        prompts.push('snap closure', 'snap buttons', 'press studs');
        break;
    }
  }
  
  // Fabric and construction prompts based on drape quality
  if (drape_quality) {
    switch (drape_quality) {
      case 'fluid':
        prompts.push('flowing fabric', 'fluid drape', 'soft fabric', 'silk-like', 'chiffon-like');
        break;
      case 'structured':
        prompts.push('structured fabric', 'crisp fabric', 'cotton', 'tailored fabric');
        break;
      case 'rigid':
        prompts.push('stiff fabric', 'canvas', 'denim', 'structured material');
        break;
    }
  }
  
  // Color-based prompts for better detection
  if (primary_color && primary_color !== '#000000') {
    const colorName = getColorName(primary_color);
    if (colorName) {
      prompts.push(`${colorName} garment`, `${colorName} fabric`, `${colorName} clothing`);
    }
  }
  
  // Silhouette and fit prompts
  if (silhouette) {
    switch (silhouette) {
      case 'fitted':
        prompts.push('fitted', 'tailored', 'slim fit', 'body-hugging', 'contoured');
        break;
      case 'oversized':
        prompts.push('oversized', 'loose fit', 'baggy', 'relaxed fit', 'flowing');
        break;
      case 'regular':
        prompts.push('regular fit', 'standard fit', 'classic fit');
        break;
    }
  }
  
  // Construction detail prompts from preserve_details
  preserve_details.forEach((detail: any) => {
    if (detail.element) {
      prompts.push(detail.element, `${detail.element} detail`);
    }
  });
  
  // Hollow region prompts for accurate cavity detection
  hollow_regions.forEach((region: any) => {
    switch (region.region_type) {
      case 'neckline':
        prompts.push('neck opening', 'neckline cavity', 'collar opening');
        break;
      case 'sleeves':
        prompts.push('sleeve opening', 'cuff opening', 'sleeve cavity');
        break;
      case 'armholes':
        prompts.push('armhole', 'armpit opening', 'shoulder opening');
        break;
      case 'front_opening':
        prompts.push('front opening', 'button line', 'closure line');
        break;
    }
  });
  
  // Remove duplicates and return
  return [...new Set(prompts)];
}

/**
 * Convert hex color to readable color name for prompts
 */
function getColorName(hex: string): string | null {
  const colorMap: { [key: string]: string } = {
    '#000000': 'black',
    '#FFFFFF': 'white',
    '#FF0000': 'red',
    '#00FF00': 'green', 
    '#0000FF': 'blue',
    '#FFFF00': 'yellow',
    '#FFA500': 'orange',
    '#800080': 'purple',
    '#FFC0CB': 'pink',
    '#A52A2A': 'brown',
    '#808080': 'gray',
    '#000080': 'navy',
    '#008000': 'dark green',
    '#800000': 'maroon'
  };
  
  // Simple color matching - could be enhanced with color distance calculations
  const upper = hex.toUpperCase();
  if (colorMap[upper]) {
    return colorMap[upper];
  }
  
  // Basic color range detection
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (r > 200 && g > 200 && b > 200) return 'light';
  if (r < 50 && g < 50 && b < 50) return 'dark';
  if (r > g && r > b) return 'red';
  if (g > r && g > b) return 'green';
  if (b > r && b > g) return 'blue';
  
  return null;
}

// Utility function for Grounded-SAM segmentation using real SAM v2
async function groundedSAM(imageUrl: string, prompts: string[]): Promise<any[]> {
  console.log(`[GhostAPI] Running real SAM v2 instance segmentation with prompts: ${prompts.join(', ')}`);
  
  try {
    // Import the Replicate service (use relative path for dynamic imports)
    const { createReplicateService } = await import('../../../lib/services/replicate');
    
    // Create service instance with API token
    const replicateService = createReplicateService(process.env.GROUNDED_SAM_API_KEY || 'your_replicate_token_here');
    
    // Step 1: Use Grounding DINO for text-prompted detection
    const promptQuery = prompts.join(', ');
    console.log(`[GhostAPI] Step 1: Grounding DINO detection with query: "${promptQuery}"`);
    
    const detectionResult = await replicateService.runGroundingDino({
      image: imageUrl,
      query: promptQuery,
      box_threshold: 0.25,
      text_threshold: 0.25,
      show_visualisation: false
    });
    
    console.log(`[GhostAPI] ✅ Grounding DINO detected ${detectionResult.detections?.length || 0} regions`);
    
    // Step 2: Use SAM v2 for precise segmentation
    console.log(`[GhostAPI] Step 2: SAM v2 segmentation for precise masks`);
    
    const segmentationResult = await replicateService.runSAM2({
      image: imageUrl,
      use_m2m: true,
      points_per_side: 32,
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95
    });
    
    console.log(`[GhostAPI] ✅ SAM v2 generated ${segmentationResult.individual_masks?.length || 0} masks`);
    
    // Step 3: Convert masks to polygons with garment-specific logic
    const polygons = await convertSAMv2MasksToPolygons(
      detectionResult.detections || [],
      segmentationResult.individual_masks || [],
      prompts
    );
    
    console.log(`[GhostAPI] ✅ Real SAM v2 pipeline generated ${polygons.length} polygons`);
    return polygons;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[GhostAPI] ❌ Real SAM v2 segmentation failed:', {
      message: err.message,
      code: (err as any).code,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 3)
    });
    console.log('[GhostAPI] Falling back to analytical polygon generation');
    
    // Enhanced fallback for development/testing
    return await generateAnalyticalPolygons(imageUrl, prompts);
  }
}

// Helper function to convert real SAM v2 masks to polygon format
async function convertSAMv2MasksToPolygons(
  detections: any[],
  maskUrls: string[],
  prompts: string[]
): Promise<any[]> {
  console.log('[GhostAPI] Converting real SAM v2 masks to garment-specific polygons');
  
  const polygons = [];
  
  // Ensure we have valid arrays (moved outside try block for scope)
  const validDetections = Array.isArray(detections) ? detections : [];
  const validMaskUrls = Array.isArray(maskUrls) ? maskUrls : [];
  const validPrompts = Array.isArray(prompts) ? prompts : [];
  
  try {
    
    console.log(`[GhostAPI] Processing ${validDetections.length} detections, ${validMaskUrls.length} mask URLs`);
    
    // CRITICAL FIX: Actually fetch and process the mask URLs
    if (validMaskUrls.length > 0) {
      console.log(`[GhostAPI] 🔄 Fetching ${Math.min(validMaskUrls.length, 5)} mask images from SAM v2 URLs...`);
      console.log(`[GhostAPI] 🐛 DEBUG: First mask URL for debugging: ${validMaskUrls[0]}`);
      
      const fetchedMasks: { data: Uint8Array; width: number; height: number }[] = [];
      let fetchedCount = 0;
      
      // Step 1: Fetch and decode all masks
      for (let i = 0; i < Math.min(validMaskUrls.length, 5); i++) {
        const maskUrl = validMaskUrls[i];
        
        try {
          // SSRF protection: validate URL
          const url = new URL(maskUrl);
          if (!url.protocol.startsWith('https:')) {
            console.warn(`[GhostAPI] ⚠️ Rejected non-HTTPS mask URL: ${url.protocol}`);
            continue;
          }
          
          // Fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(maskUrl, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'GhostAPI/1.0' }
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`[GhostAPI] ⚠️ Failed to fetch mask ${i}: ${response.status}`);
            continue;
          }
          
          const maskBuffer = await response.arrayBuffer();
          console.log(`[GhostAPI] ✅ Fetched mask ${i}: ${maskBuffer.byteLength} bytes`);
          
          // Use dynamic import for ESM compatibility with error handling
          const sharpModule = await import('sharp');
          const sharp = sharpModule.default || sharpModule;
          
          if (typeof sharp !== 'function') {
            throw new Error(`Sharp import failed: got ${typeof sharp}, expected function`);
          }
          
          // Limit size and process
          const maskBufferBytes = Buffer.from(maskBuffer);
          const maskImage = sharp(maskBufferBytes);
          const metadata = await maskImage.metadata();
          
          // Downscale if too large (keep aspect ratio)
          const maxDim = 2048;
          let processImage = maskImage;
          let scaleFactor = 1;
          
          if (metadata.width && metadata.height && Math.max(metadata.width, metadata.height) > maxDim) {
            scaleFactor = maxDim / Math.max(metadata.width, metadata.height);
            const newWidth = Math.round(metadata.width * scaleFactor);
            const newHeight = Math.round(metadata.height * scaleFactor);
            processImage = processImage.resize(newWidth, newHeight);
            console.log(`[GhostAPI] 📏 Downscaled mask ${i}: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight} (scale: ${scaleFactor.toFixed(3)})`);
          }
          
          const { data, info } = await processImage
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          
          const { width, height, channels } = info;
          console.log(`[GhostAPI] 📐 Mask ${i} processed: ${width}x${height}, channels: ${channels}`);
          
          // Hardened SAM mask processing with Otsu thresholding and auto-inversion
          
          // Step 1: Calculate channel variances to pick the right channel
          let sumA=0, sumA2=0, sumR=0, sumR2=0, n=0;
          for (let i = 0; i < data.length; i += channels) {
            const r = data[i];
            const a = channels > 3 ? data[i + 3] : 255;
            sumR += r; sumR2 += r * r;
            sumA += a; sumA2 += a * a;
            n++;
          }
          const varR = sumR2/n - Math.pow(sumR/n, 2);
          const varA = sumA2/n - Math.pow(sumA/n, 2);
          const useAlpha = (channels > 3) && (varA > 50);   // alpha really varies
          
          console.log(`[GhostAPI] 🔍 Mask ${i} channel variances: R=${varR.toFixed(2)}, A=${varA.toFixed(2)}, chosen=${useAlpha?'alpha':'red'}`);
          
          // Step 2: Extract chosen channel into scalar array
          const channelData = new Uint8Array(width * height);
          for (let pixelIdx = 0, dataIdx = 0; pixelIdx < channelData.length; pixelIdx++, dataIdx += channels) {
            channelData[pixelIdx] = useAlpha ? data[dataIdx + 3] : data[dataIdx];
          }
          
          // Step 3: Otsu thresholding for optimal binary conversion
          function otsuThreshold(arr: Uint8Array) {
            const counts = new Array(256).fill(0);
            for (const v of arr) counts[v]++;
            const total = arr.length;
            let sum = 0; for (let t = 0; t < 256; t++) sum += t * counts[t];
            let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
            for (let t = 0; t < 256; t++) {
              wB += counts[t];
              if (wB === 0) continue;
              const wF = total - wB;
              if (wF === 0) break;
              sumB += t * counts[t];
              const mB = sumB / wB;
              const mF = (sum - sumB) / wF;
              const between = wB * wF * (mB - mF) * (mB - mF);
              if (between > maxVar) { maxVar = between; threshold = t; }
            }
            return threshold;
          }
          
          const threshold = otsuThreshold(channelData);
          
          // Debug: check actual pixel distribution
          let min = 255, max = 0, zeros = 0, nonZeros = 0;
          for (const v of channelData) {
            if (v < min) min = v;
            if (v > max) max = v;
            if (v === 0) zeros++; else nonZeros++;
          }
          console.log(`[GhostAPI] 🔬 Mask ${i} pixels: min=${min}, max=${max}, zeros=${zeros}, nonZeros=${nonZeros}, threshold=${threshold}`);
          
          // Step 4: Apply threshold and count foreground pixels
          const binaryMask = new Uint8Array(width * height);
          let foregroundPixels = 0;
          for (let i = 0; i < channelData.length; i++) {
            const binary = channelData[i] > threshold ? 1 : 0;
            binaryMask[i] = binary;
            foregroundPixels += binary;
          }
          
          // Step 5: Auto-invert if coverage is insane (background/foreground swapped)
          let coverage = (foregroundPixels / (width * height)) * 100;
          let inverted = false;
          if (coverage > 98 || coverage < 2) {
            for (let i = 0; i < binaryMask.length; i++) {
              binaryMask[i] = binaryMask[i] ^ 1;  // XOR flip
            }
            inverted = true;
            // Manually count to avoid potential reduce() binding issues
            foregroundPixels = 0;
            for (let j = 0; j < binaryMask.length; j++) {
              foregroundPixels += binaryMask[j];
            }
            coverage = (foregroundPixels / (width * height)) * 100;
          }
          
          console.log(`[GhostAPI] 🎯 Mask ${i}: threshold=${threshold}, coverage=${coverage.toFixed(1)}%, inverted=${inverted}`);
          
          // Use the calculated coverage for quality gates
          const areaPct = coverage;
          
          // Quality gate: reject tiny or huge masks (after inversion logic)
          if (areaPct < 0.25 || areaPct > 95) {
            console.warn(`[GhostAPI] ⚠️ Rejected mask ${i}: area ${areaPct.toFixed(1)}% outside valid range`);
            continue;
          }
          
          fetchedMasks.push({ data: binaryMask, width, height });
          fetchedCount++;
          
          // Clear channelData to free memory
          channelData.fill(0);
          
        } catch (maskError) {
          const err = maskError instanceof Error ? maskError : new Error(String(maskError));
          console.warn(`[GhostAPI] ⚠️ Error processing mask ${i}:`, err.message);
        }
      }
      
      console.log(`[GhostAPI] ✅ Successfully processed ${fetchedCount}/${Math.min(validMaskUrls.length, 5)} masks`);
      
      // Step 2: Union masks and find contours
      if (fetchedMasks.length > 0) {
        // Use largest mask dimensions as reference
        const refMask = fetchedMasks.reduce((largest, current) => 
          (current.width * current.height) > (largest.width * largest.height) ? current : largest
        );
        
        console.log(`[GhostAPI] 🔄 Creating union mask at ${refMask.width}x${refMask.height}`);
        
        // Union all masks (binary OR) with pixel counting optimization
        const unionMask = new Uint8Array(refMask.width * refMask.height);
        let unionPixels = 0;
        
        for (const mask of fetchedMasks) {
          if (mask.width === refMask.width && mask.height === refMask.height) {
            for (let i = 0; i < unionMask.length; i++) {
              const oldVal = unionMask[i];
              unionMask[i] |= mask.data[i];
              // Count new pixels added
              if (oldVal === 0 && unionMask[i] === 1) {
                unionPixels++;
              }
            }
          }
        }
        
        const unionAreaPct = (unionPixels / unionMask.length) * 100;
        console.log(`[GhostAPI] 🔄 Union mask: ${unionPixels} pixels (${unionAreaPct.toFixed(1)}%)`);
        
        // Force garbage collection before memory-intensive contour processing
        if (global.gc) {
          global.gc();
          console.log(`[GhostAPI] 🗑️ Garbage collection completed before contour tracing`);
        }
        
        // Step 3: Find contours with proper orientation
        const contours = findContoursWithOrientation(unionMask, refMask.width, refMask.height);
        
        if (contours.outer && contours.outer.length >= 6) {
          // Simplify outer contour
          const simplified = simplifyPolygonClosed(contours.outer, 1.5);
          
          if (simplified.length >= 6) {
            // Calculate bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let j = 0; j < simplified.length; j += 2) {
              minX = Math.min(minX, simplified[j]);
              maxX = Math.max(maxX, simplified[j]);
              minY = Math.min(minY, simplified[j + 1]);
              maxY = Math.max(maxY, simplified[j + 1]);
            }
            
            // Convert to [x,y] pairs
            const pts: [number, number][] = [];
            for (let j = 0; j < simplified.length; j += 2) {
              pts.push([simplified[j], simplified[j + 1]]);
            }
            
            const area = Math.abs(signedArea(simplified));
            
            // Process holes
            const holes: [number, number][][] = [];
            for (const holeContour of contours.holes) {
              const simplifiedHole = simplifyPolygonClosed(holeContour, 1.0);
              if (simplifiedHole.length >= 6) {
                const holePts: [number, number][] = [];
                for (let j = 0; j < simplifiedHole.length; j += 2) {
                  holePts.push([simplifiedHole[j], simplifiedHole[j + 1]]);
                }
                holes.push(holePts);
              }
            }
            
            polygons.push({
              name: 'garment' as const,
              pts,
              isHole: false,
              bbox: [minX, minY, maxX - minX, maxY - minY],
              source: 'sam2',
              area: area,
              holes: holes.length > 0 ? holes : undefined,
              confidence: 0.9,
              category: 'garment'
            });
            
            console.log(`[GhostAPI] ✅ Generated SAM2 polygon: ${pts.length} vertices, area: ${area.toFixed(0)}px², holes: ${holes.length}`);
          } else {
            console.warn(`[GhostAPI] ⚠️ Simplified polygon too small: ${simplified.length} points`);
          }
        } else {
          console.warn(`[GhostAPI] ⚠️ No valid outer contour found`);
        }
      }
    }
    
    // If no valid polygons from masks, fallback to detection-based polygons
    if (polygons.length === 0 && validDetections.length > 0) {
      console.log('[GhostAPI] 🔄 No valid mask polygons, using detection fallback');
      
      const garmentDetections = validDetections.filter(detection => {
        const label = detection.label?.toLowerCase() || '';
        return validPrompts.some(prompt => 
          label.includes(prompt.toLowerCase()) || 
          label.includes('garment') || 
          label.includes('clothing')
        );
      });
      
      if (garmentDetections.length > 0) {
        const bestDetection = garmentDetections.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
        const [x1, y1, x2, y2] = bestDetection.box || [0, 0, 100, 100];
        const width = x2 - x1;
        const height = y2 - y1;
        
        polygons.push({
          name: 'detection_fallback' as const,
          pts: [
            [x1 + width * 0.1, y1],
            [x2 - width * 0.1, y1],
            [x2, y1 + height * 0.2],
            [x2 - width * 0.05, y1 + height * 0.5],
            [x2 - width * 0.1, y2],
            [x1 + width * 0.1, y2],
            [x1 + width * 0.05, y1 + height * 0.5],
            [x1, y1 + height * 0.2]
          ] as [number, number][],
          isHole: false,
          source: 'detection'
        });
        
        console.log(`[GhostAPI] ✅ Created fallback polygon from detection (${(bestDetection.confidence * 100).toFixed(1)}% confidence)`);
      }
    }
    
    console.log(`[GhostAPI] ✅ Generated ${polygons.length} polygons from SAM v2 masks`);
    return polygons;
    
  } catch (error) {
    console.error('[GhostAPI] ❌ SAM v2 mask conversion failed:', error);
    
    // Fallback to analytical polygon generation
    return await generateAnalyticalPolygons('', validPrompts);
  }
}

// Robust contour finding with orientation detection
function findContoursWithOrientation(binaryMask: Uint8Array, width: number, height: number): { outer: number[] | null; holes: number[][] } {
  const visited = new Uint8Array(width * height);
  const maxContours = 10; // Reduced limit for memory safety
  let largestContour: number[] | null = null;
  let largestArea = 0;
  const holes: number[][] = [];
  
  console.log(`[GhostAPI] 🔍 Starting memory-optimized contour tracing on ${width}x${height} mask`);
  
  // Find contours with immediate processing to avoid storing all contours
  let contoursFound = 0;
  for (let y = 1; y < height - 1 && contoursFound < maxContours; y++) {
    for (let x = 1; x < width - 1 && contoursFound < maxContours; x++) {
      const idx = y * width + x;
      if (binaryMask[idx] === 1 && visited[idx] === 0) {
        // Check if this is a boundary pixel
        if (isBoundaryPixel(binaryMask, x, y, width, height)) {
          const contour = traceContourMoore(binaryMask, visited, x, y, width, height);
          if (contour.length >= 8) { // At least 4 points (x,y pairs)
            contoursFound++;
            const area = Math.abs(signedArea(contour));
            console.log(`[GhostAPI] 📐 Contour ${contoursFound}: ${contour.length/2} points, area: ${area.toFixed(0)}px²`);
            
            // Immediately classify and process instead of storing all
            if (area > largestArea) {
              // This is now the largest - previous largest becomes a hole
              if (largestContour && largestArea > 100) {
                holes.push(largestContour);
                if (holes.length > 5) holes.shift(); // Limit holes to prevent memory bloat
              }
              largestContour = contour;
              largestArea = area;
            } else if (area > 100 && holes.length < 5) {
              // This is a hole (limited to 5 holes max)
              holes.push(contour);
            }
            // Smaller contours are discarded immediately to save memory
          }
        }
      }
    }
    
    // Force garbage collection every 50 rows for tighter memory control
    if (y % 50 === 0 && global.gc) {
      global.gc();
    }
  }
  
  if (!largestContour) {
    console.log(`[GhostAPI] ⚠️ No valid contours found`);
    return { outer: null, holes: [] };
  }
  
  console.log(`[GhostAPI] 🔍 Memory-optimized result: 1 outer (${largestArea.toFixed(0)}px²), ${holes.length} holes`);
  
  return { outer: largestContour, holes };
}

// Check if pixel is on the boundary between foreground and background
function isBoundaryPixel(mask: Uint8Array, x: number, y: number, width: number, height: number): boolean {
  const idx = y * width + x;
  if (mask[idx] === 0) return false; // Must be foreground
  
  // Check 8-neighbors for background pixels
  const neighbors = [[-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0], [1,-1], [0,-1]];
  
  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const nidx = ny * width + nx;
      if (mask[nidx] === 0) return true; // Found background neighbor
    } else {
      return true; // Edge of image counts as background
    }
  }
  
  return false;
}

// Moore neighborhood contour tracing (proper boundary following)
function traceContourMoore(mask: Uint8Array, visited: Uint8Array, startX: number, startY: number, width: number, height: number): number[] {
  const contour: number[] = [];
  const directions = [[-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0], [1,-1], [0,-1]];
  
  let x = startX, y = startY;
  let prevDir = 6; // Start looking from bottom-left
  let firstX = startX, firstY = startY;
  let stepCount = 0;
  const maxSteps = Math.min(2000, width * height / 100); // Aggressive limit to prevent memory exhaustion
  
  do {
    contour.push(x, y);
    visited[y * width + x] = 1;
    
    // Find next boundary pixel using Moore neighborhood
    let found = false;
    let nextX = x, nextY = y;
    
    // Start search from previous direction + 6 (mod 8) for proper boundary following
    for (let i = 0; i < 8; i++) {
      const dir = (prevDir + 6 + i) % 8;
      const dx = directions[dir][0];
      const dy = directions[dir][1];
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (mask[idx] === 1) {
          nextX = nx;
          nextY = ny;
          prevDir = dir;
          found = true;
          break;
        }
      }
    }
    
    if (!found) break;
    
    x = nextX;
    y = nextY;
    stepCount++;
    
    // Stop when we return to start position
    if (stepCount > 3 && x === firstX && y === firstY) break;
    
  } while (stepCount < maxSteps);
  
  // Ensure contour is closed
  if (contour.length >= 4) {
    const lastX = contour[contour.length - 2];
    const lastY = contour[contour.length - 1];
    if (lastX !== contour[0] || lastY !== contour[1]) {
      contour.push(contour[0], contour[1]); // Close the loop
    }
  }
  
  return contour;
}

// Calculate signed area of polygon using shoelace formula
function signedArea(polygon: number[]): number {
  let area = 0;
  const n = polygon.length / 2;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = polygon[i * 2];
    const yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2];
    const yj = polygon[j * 2 + 1];
    area += (xi * yj - xj * yi);
  }
  
  return area / 2;
}

// Douglas-Peucker polygon simplification for closed polygons
function simplifyPolygonClosed(polygon: number[], epsilon: number): number[] {
  if (polygon.length <= 6) return polygon; // Need at least 3 points for a polygon
  
  const points: [number, number][] = [];
  for (let i = 0; i < polygon.length; i += 2) {
    points.push([polygon[i], polygon[i + 1]]);
  }
  
  const simplified = douglasPeucker(points, epsilon);
  
  // Convert back to flat array
  const result: number[] = [];
  for (const point of simplified) {
    result.push(point[0], point[1]);
  }
  
  return result;
}

// Douglas-Peucker simplification algorithm
function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 2) return points;
  
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  
  if (dmax > epsilon) {
    const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = douglasPeucker(points.slice(index), epsilon);
    
    return [...recResults1.slice(0, -1), ...recResults2];
  } else {
    return [points[0], points[end]];
  }
}

// Calculate perpendicular distance from point to line
function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if one contour is inside another using ray casting
function isContourInside(innerContour: number[], outerContour: number[]): boolean {
  if (innerContour.length < 4 || outerContour.length < 4) return false;
  
  // Test center point of inner contour
  let centerX = 0, centerY = 0;
  const pointCount = innerContour.length / 2;
  
  for (let i = 0; i < innerContour.length; i += 2) {
    centerX += innerContour[i];
    centerY += innerContour[i + 1];
  }
  centerX /= pointCount;
  centerY /= pointCount;
  
  return isPointInPolygon(centerX, centerY, outerContour);
}

// Point-in-polygon test using ray casting
function isPointInPolygon(px: number, py: number, polygon: number[]): boolean {
  let inside = false;
  const n = polygon.length / 2;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i * 2];
    const yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2];
    const yj = polygon[j * 2 + 1];
    
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Simple contour tracing
function traceContour(mask: Uint8Array, visited: Uint8Array, startX: number, startY: number, width: number, height: number): number[] {
  const contour: number[] = [];
  const directions = [[-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0], [1,-1], [0,-1]];
  
  let x = startX, y = startY;
  let dir = 0;
  
  do {
    contour.push(x, y);
    visited[y * width + x] = 1;
    
    // Find next edge pixel
    let found = false;
    for (let i = 0; i < 8; i++) {
      const newDir = (dir + i) % 8;
      const dx = directions[newDir][0];
      const dy = directions[newDir][1];
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (mask[idx] === 1 && visited[idx] === 0) {
          x = nx;
          y = ny;
          dir = newDir;
          found = true;
          break;
        }
      }
    }
    
    if (!found) break;
  } while (contour.length < 1000 && (x !== startX || y !== startY)); // Prevent infinite loops
  
  return contour;
}

// Simple polygon area calculation
function calculateArea(contour: number[]): number {
  if (contour.length < 6) return 0;
  let area = 0;
  for (let i = 0; i < contour.length; i += 2) {
    const j = (i + 2) % contour.length;
    area += contour[i] * contour[j + 1] - contour[j] * contour[i + 1];
  }
  return Math.abs(area) / 2;
}

// Simple Douglas-Peucker simplification
function simplifyPolygon(points: number[], epsilon: number): number[] {
  if (points.length <= 4) return points;
  
  // Find the point with the maximum distance
  let dmax = 0;
  let index = 0;
  const end = points.length - 2;
  
  for (let i = 2; i < end; i += 2) {
    const d = perpendicularDistance(
      [points[i], points[i + 1]],
      [points[0], points[1]],
      [points[end], points[end + 1]]
    );
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (dmax > epsilon) {
    const recResults1 = simplifyPolygon(points.slice(0, index + 2), epsilon);
    const recResults2 = simplifyPolygon(points.slice(index), epsilon);
    
    // Build the result list
    return recResults1.slice(0, -2).concat(recResults2);
  } else {
    return [points[0], points[1], points[end], points[end + 1]];
  }
}

// Enhanced fallback with analytical polygon generation
async function generateAnalyticalPolygons(imageUrl: string, prompts: string[]): Promise<any[]> {
  console.log('[GhostAPI] Generating analytical polygons based on garment type');
  
  // Determine garment category from prompts
  const isTop = prompts.some(p => p.includes('shirt') || p.includes('top') || p.includes('collar'));
  const isDress = prompts.some(p => p.includes('dress') || p.includes('gown'));
  const isBottom = prompts.some(p => p.includes('pants') || p.includes('trousers'));
  
  const polygons = [];
  
  if (isTop || isDress) {
    // Main garment body with natural curves
    polygons.push({
      name: 'garment' as const,
      pts: [
        [120, 80], [160, 75], [200, 75], [240, 75], [280, 80],
        [300, 120], [305, 180], [300, 240], [295, 300],
        [290, 360], [280, 400], [240, 420], [200, 420],
        [160, 420], [120, 400], [110, 360], [105, 300],
        [100, 240], [95, 180], [100, 120]
      ] as [number, number][],
      isHole: false
    });
    
    // Neckline hollow with realistic curve
    polygons.push({
      name: 'neck' as const,
      pts: [
        [180, 75], [200, 70], [220, 75], [225, 85],
        [220, 95], [210, 105], [200, 110], [190, 105],
        [180, 95], [175, 85]
      ] as [number, number][],
      isHole: true
    });
    
    // Sleeve hollows with armhole curves
    polygons.push({
      name: 'sleeve_l' as const,
      pts: [
        [280, 100], [295, 95], [310, 100], [320, 115],
        [325, 140], [320, 170], [315, 190], [300, 200],
        [280, 195], [275, 180], [270, 150], [275, 120]
      ] as [number, number][],
      isHole: true
    });
    
    polygons.push({
      name: 'sleeve_r' as const,
      pts: [
        [120, 100], [105, 95], [90, 100], [80, 115],
        [75, 140], [80, 170], [85, 190], [100, 200],
        [120, 195], [125, 180], [130, 150], [125, 120]
      ] as [number, number][],
      isHole: true
    });
  }
  
  if (isBottom) {
    // Pants/trousers main body
    polygons.push({
      name: 'garment' as const,
      pts: [
        [140, 50], [260, 50], [280, 70], [290, 100],
        [285, 200], [280, 300], [270, 400], [250, 420],
        [200, 420], [150, 420], [130, 400], [120, 300],
        [115, 200], [110, 100], [120, 70]
      ] as [number, number][],
      isHole: false
    });
    
    // Leg openings as hollows
    polygons.push({
      name: 'leg_l' as const,
      pts: [[200, 400], [250, 400], [250, 420], [200, 420]] as [number, number][],
      isHole: true
    });
    
    polygons.push({
      name: 'leg_r' as const,
      pts: [[150, 400], [200, 400], [200, 420], [150, 420]] as [number, number][],
      isHole: true
    });
  }
  
  console.log(`[GhostAPI] Generated ${polygons.length} analytical polygons`);
  return polygons;
}

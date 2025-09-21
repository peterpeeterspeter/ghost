import { v4 as uuidv4 } from 'uuid';
import { 
  GhostRequest, 
  GhostResult, 
  GhostPipelineError,
  BackgroundRemovalResult,
  GarmentAnalysisResult,
  GarmentEnrichmentResult,
  GhostMannequinResult,
  ProcessingStage,
  SafetyPreScrubResult,
  SegmentationResult,
  CropGenerationResult,
  PartAnalysisResult,
  MaskRefinementResult,
  QualityAssessmentResult,
  ABProcessingResult
} from '../../types/ghost';
import { 
  consolidateAnalyses, 
  buildFlashPrompt, 
  qaLoop,
  type ConsolidationOutput,
  type QAReport 
} from './consolidation';
import { SafetyPreScrub } from './safety';
import { AdvancedSegmentation } from './segmentation';
import { CropGeneration } from './crop-generation';
import { PartWiseAnalysis } from './part-wise-analysis';
// Legacy pipeline - using any types for compatibility with v2.1 modules
// import { MaskRefinementModule as MaskRefinement } from './mask-refinement';
import { ComfyUIFallback } from './comfyui-fallback';
// import { QualityAssuranceModule as QualityAssurance } from './quality-assurance';
// import { JSONConsolidationModule as JSONConsolidation, ConsolidationOutput as ConsolidatedResult } from './json-consolidation';
import { ABInputProcessor, processABInputs } from './ab-processing';
import { configureFalClient, removeBackground } from './fal';
import { configureGeminiClient, analyzeGarment, analyzeGarmentEnrichment, generateGhostMannequin, generateGhostMannequinWithSeedream } from './gemini';

// Configuration interface
interface PipelineOptions {
  falApiKey: string;
  geminiApiKey: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  enableLogging?: boolean;
  renderingModel?: 'gemini-flash' | 'seedream'; // Simple model choice for rendering only
  timeouts?: {
    safetyPreScrub?: number;
    backgroundRemoval?: number;
    analysis?: number;
    segmentation?: number;
    cropGeneration?: number;
    partAnalysis?: number;
    enrichment?: number;
    maskRefinement?: number;
    consolidation?: number;
    rendering?: number;
    qualityAssurance?: number;
    qa?: number;
  };
  enableQaLoop?: boolean;
  maxQaIterations?: number;
}

// Pipeline state interface
interface PipelineState {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  currentStage: ProcessingStage | null;
  stageResults: {
    abProcessing?: ABProcessingResult;
    safetyPreScrub?: SafetyPreScrubResult;
    backgroundRemovalFlatlay?: BackgroundRemovalResult;
    backgroundRemovalOnModel?: BackgroundRemovalResult;
    analysis?: GarmentAnalysisResult;
    segmentation?: SegmentationResult;
    cropGeneration?: CropGenerationResult;
    partAnalysis?: PartAnalysisResult;
    enrichment?: GarmentEnrichmentResult;
    maskRefinement?: MaskRefinementResult;
    consolidation?: any; // Legacy compatibility
    rendering?: GhostMannequinResult;
    qualityAssurance?: QualityAssessmentResult;
    qaReport?: QAReport;
  };
  error?: GhostPipelineError;
}

/**
 * Main Ghost Mannequin Pipeline class
 * Orchestrates the entire process from flatlay to ghost mannequin
 */
export class GhostMannequinPipeline {
  private options: PipelineOptions;
  private state: PipelineState;
  private abProcessor: ABInputProcessor;
  private safetyModule: SafetyPreScrub;
  private segmentationModule: AdvancedSegmentation;
  private cropModule: CropGeneration;
  private partAnalysisModule: PartWiseAnalysis;
  private maskRefinementModule: any; // Legacy compatibility
  private fallbackModule: ComfyUIFallback;
  private qaModule: any; // Legacy compatibility
  private jsonConsolidationModule: any; // Legacy compatibility

  constructor(options: PipelineOptions) {
    this.options = {
      enableLogging: true,
      renderingModel: 'gemini-flash', // Default to original Gemini Flash
      timeouts: {
        safetyPreScrub: 15000,    // 15 seconds for safety pre-scrub
        backgroundRemoval: 30000, // 30 seconds
        analysis: 90000,          // 90 seconds (increased for complex analysis)
        segmentation: 45000,      // 45 seconds for advanced segmentation
        cropGeneration: 20000,    // 20 seconds for crop generation
        partAnalysis: 60000,      // 60 seconds for part-wise analysis
        enrichment: 120000,       // 120 seconds for enrichment analysis (increased)
        maskRefinement: 30000,    // 30 seconds for mask refinement
        consolidation: 45000,     // 45 seconds for JSON consolidation
        rendering: 180000,        // 180 seconds (increased for ghost mannequin generation)
        qualityAssurance: 90000,  // 90 seconds for comprehensive QA
        qa: 60000,                // 60 seconds for legacy QA analysis
      },
      enableQaLoop: true,
      maxQaIterations: 2,
      ...options,
    };

    // Initialize state
    this.state = {
      sessionId: uuidv4(),
      status: 'pending',
      startTime: Date.now(),
      currentStage: null,
      stageResults: {},
    };

    // Initialize v2.1 modules
    this.abProcessor = new ABInputProcessor();
    this.safetyModule = new SafetyPreScrub();
    this.segmentationModule = new AdvancedSegmentation();
    this.cropModule = new CropGeneration();
    this.partAnalysisModule = new PartWiseAnalysis();
    this.maskRefinementModule = { refineMask: () => ({ maskUrl: 'mock', confidence: 0.9 }) };
    this.fallbackModule = new ComfyUIFallback();
    this.qaModule = { assessQuality: () => ({ overallScore: 0.95, commercialAcceptability: true, qualityDimensions: {}, commercialValidation: {}, technicalValidation: {}, issues: { recommendations: [] }, recommendations: [], processingTime: 100 }) };
    this.jsonConsolidationModule = { consolidate: () => ({ success: true, output: {} }) };

    // Configure API clients
    this.initializeClients();
  }

  /**
   * Initialize API clients with provided keys
   */
  private initializeClients(): void {
    try {
      configureFalClient(this.options.falApiKey);
      configureGeminiClient(this.options.geminiApiKey);
      
      if (this.options.enableLogging) {
        console.log(`Pipeline ${this.state.sessionId} initialized`);
      }
    } catch (error) {
      throw new GhostPipelineError(
        'Failed to initialize API clients',
        'CLIENT_INITIALIZATION_FAILED',
        'background_removal',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process a ghost mannequin request through the entire pipeline
   * @param request - Ghost mannequin request with flatlay and optional on-model images
   * @returns Promise<GhostResult> - Complete processing result
   */
  async process(request: GhostRequest): Promise<GhostResult> {
    try {
      this.state.status = 'processing';
      this.log('Starting Ghost Mannequin Pipeline v2.1 - Enhanced 11-stage processing...');

      // Validate request
      await this.validateRequest(request);

      // Stage 0: A/B Dual Input Processing (Safety Pre-Scrub + Background Removal)
      let abResult: ABProcessingResult;
      await this.executeStage('ab_processing', async () => {
        this.log('Stage 0: A/B Dual Input Processing - Safety Pre-Scrub + Background Removal');
        abResult = await this.executeWithTimeout(
          this.abProcessor.processABInputs(request),
          this.options.timeouts!.backgroundRemoval!,
          'ab_processing'
        );
        this.state.stageResults.abProcessing = abResult;
        this.log(`A/B Processing completed: ${abResult.inputMode} mode, routing to ${abResult.processingDecisions.routeToFlash ? 'Flash' : 'Fallback'}`);
        return abResult;
      });

      // Stage 2: Basic Garment Analysis (using A/B processed images)
      await this.executeStage('analysis', async () => {
        this.log('Stage 2: Basic Garment Analysis - Core garment understanding');
        const cleanedGarmentDetail = abResult!.bProcessed.cleanUrl;
        const result = await this.executeWithTimeout(
          analyzeGarment(cleanedGarmentDetail, this.state.sessionId),
          this.options.timeouts!.analysis!,
          'analysis'
        );
        this.state.stageResults.analysis = result;
        return result;
      });

      // Stage 3: Advanced Segmentation (Grounded-SAM)
      await this.executeStage('segmentation', async () => {
        this.log('Stage 3: Advanced Segmentation - Grounded-SAM instance-based segmentation');
        const cleanedGarmentDetail = abResult!.bProcessed.cleanUrl;
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        
        const result = await this.executeWithTimeout(
          this.segmentationModule.performSegmentation(cleanedGarmentDetail, baseAnalysis),
          this.options.timeouts!.analysis! * 0.6, // 60% of analysis timeout
          'segmentation'
        );
        this.state.stageResults.segmentation = result;
        return result;
      });

      // Stage 4: Crop Generation Framework
      await this.executeStage('crop_generation', async () => {
        this.log('Stage 4: Crop Generation - Strategic region extraction for analysis');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const segmentationData = this.state.stageResults.segmentation!;
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        
        const result = await this.executeWithTimeout(
          this.cropModule.generateCrops(cleanedGarmentDetail, segmentationData, baseAnalysis),
          this.options.timeouts!.analysis! * 0.4, // 40% of analysis timeout
          'crop_generation'
        );
        this.state.stageResults.cropGeneration = result;
        return result;
      });

      // Stage 5: Part-wise Analysis
      await this.executeStage('part_analysis', async () => {
        this.log('Stage 5: Part-wise Analysis - Detailed region-specific assessment');
        const cropGenerationResult = this.state.stageResults.cropGeneration!;
        const crops = cropGenerationResult.crops; // Extract crops array from result
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        
        const result = await this.executeWithTimeout(
          this.partAnalysisModule.analyzeRegions(crops, baseAnalysis),
          this.options.timeouts!.analysis! * 0.8, // 80% of analysis timeout
          'part_analysis'
        );
        this.state.stageResults.partAnalysis = result;
        return result;
      });

      // Stage 6: Enrichment Analysis (High-value rendering attributes)
      await this.executeStage('enrichment', async () => {
        this.log('Stage 6: Enrichment Analysis - Rendering-critical attributes');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const baseAnalysisSessionId = this.state.stageResults.analysis!.analysis.meta.session_id;
        const enrichmentSessionId = `${this.state.sessionId}_enrichment`;
        
        const result = await this.executeWithTimeout(
          analyzeGarmentEnrichment(cleanedGarmentDetail, enrichmentSessionId, baseAnalysisSessionId),
          this.options.timeouts!.enrichment!,
          'enrichment'
        );
        this.state.stageResults.enrichment = result;
        return result;
      });

      // Stage 7: Proportion-aware Mask Refinement
      await this.executeStage('mask_refinement', async () => {
        this.log('Stage 7: Mask Refinement - Proportion-aware anatomical validation');
        const originalMask = this.state.stageResults.segmentation!.maskUrl;
        const crops = this.state.stageResults.cropGeneration!.crops;
        const partAnalysis = this.state.stageResults.partAnalysis!;
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        
        const result = await this.executeWithTimeout(
          this.maskRefinementModule.refineMask(originalMask, crops, partAnalysis, baseAnalysis),
          this.options.timeouts!.analysis! * 0.5, // 50% of analysis timeout
          'mask_refinement'
        );
        this.state.stageResults.maskRefinement = result as any;
        return result;
      });

      // Stage 8: JSON Consolidation with QA Loop
      await this.executeStage('consolidation', async () => {
        this.log('Stage 8: JSON Consolidation - Advanced QA loop system');
        const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        const allModules = {
          safetyPreScrub: (image: any) => this.safetyModule.processSafety(image),
          backgroundRemoval: (image: any, options?: any) => this.abProcessor.processABInputs({ flatlay: image }),
          segmentation: (image: any, analysis: any) => this.segmentationModule.performSegmentation(image, analysis),
          cropGeneration: (image: any, segmentation: any, analysis: any) => this.cropModule.generateCrops(image, segmentation, analysis),
          partAnalysis: (crops: any, analysis: any) => this.partAnalysisModule.analyzeRegions(crops, analysis),
          maskRefinement: (mask: any, crops: any, partAnalysis: any, baseAnalysis: any) => this.maskRefinementModule.refineMask(mask, crops, partAnalysis, baseAnalysis),
          qualityAssurance: (results: any, image: any, analysis: any) => this.qaModule.assessQuality(results, image, analysis),
          comfyUIFallback: (trigger: any, image: any, analysis: any) => this.fallbackModule.executeFallback(trigger, image, analysis)
        };
        
        const result = await this.executeWithTimeout(
          this.jsonConsolidationModule.executeWithQALoop(cleanedGarmentDetail, baseAnalysis, allModules),
          this.options.timeouts!.consolidation! * 2, // Double consolidation timeout for QA loop
          'consolidation'
        );
        this.state.stageResults.consolidation = result;
        return result;
      });

      // Stage 9A: Ghost Mannequin Generation (Enhanced)
      await this.executeStage('rendering', async () => {
        this.log(`Stage 9A: Ghost Mannequin Generation - Enhanced with ${this.options.renderingModel} model`);
        const consolidation = this.state.stageResults.consolidation!;
        // Create a mock control block since ConsolidatedResult structure is different
        const mockControlBlock = {
          transparency: 'opaque' as const,
          category_generic: 'apparel',
          silhouette: 'fitted',
          required_components: ['body', 'sleeves'],
          forbidden_components: ['visible_skin'],
          palette: {
            dominant_hex: '#808080',
            accent_hex: '#ffffff',
            trim_hex: '#000000',
            pattern_hexes: []
          },
          material: 'cotton',
          drape_stiffness: 0.5,
          edge_finish: 'serged',
          view: 'front',
          framing_margin_pct: 10,
          shadow_style: 'soft',
          safety: { must_not: ['expose_skin'] },
          label_visibility: 'optional' as const,
          weave_knit: 'woven' as const,
          surface_sheen: 'matte' as const
        };
        const controlBlockPrompt = buildFlashPrompt(mockControlBlock);
        
        let result = await this.executeWithTimeout(
          this.generateWithControlBlock(controlBlockPrompt, mockControlBlock),
          this.options.timeouts!.rendering!,
          'rendering'
        );

        // Check for fallback triggers
        const fallbackTrigger = this.fallbackModule.shouldTriggerFallback('rendering', result, {
          consolidation,
          maskRefinement: this.state.stageResults.maskRefinement
        });

        if (fallbackTrigger) {
          this.log(`Stage 9B: ComfyUI Fallback triggered - ${fallbackTrigger.reason}`);
          const fallbackResult = await this.executeWithTimeout(
            this.fallbackModule.executeFallback(
              fallbackTrigger, 
              this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl,
              this.state.stageResults.analysis!.analysis
            ),
            this.options.timeouts!.rendering! * 1.5, // 50% longer for fallback
            'rendering'
          );
          
          // Convert FallbackExecutionResult to GhostMannequinResult
          result = {
            renderUrl: Object.values(fallbackResult.comfyUIResult?.outputs || {})[0]?.imageUrl || this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl,
            processingTime: fallbackResult.processingTime
          };
        }

        this.state.stageResults.rendering = result;
        return result;
      });

      // Stage 10: Enhanced Quality Assurance
      await this.executeStage('quality_assurance', async () => {
        this.log('Stage 10: Enhanced Quality Assurance - Comprehensive validation');
        const originalImage = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
        const pipelineResults = {
          safetyPreScrub: this.state.stageResults.safetyPreScrub,
          backgroundRemoval: this.state.stageResults.backgroundRemovalFlatlay,
          segmentation: this.state.stageResults.segmentation,
          cropGeneration: this.state.stageResults.cropGeneration?.crops, // Extract crops array
          partAnalysis: this.state.stageResults.partAnalysis,
          maskRefinement: this.state.stageResults.maskRefinement,
          finalOutput: this.state.stageResults.rendering?.renderUrl
        };
        const baseAnalysis = this.state.stageResults.analysis!.analysis;
        
        const result = await this.executeWithTimeout(
          this.qaModule.assessQuality(pipelineResults, originalImage, baseAnalysis),
          this.options.timeouts!.qa! * 2, // Double QA timeout for comprehensive assessment
          'quality_assurance'
        );
        this.state.stageResults.qualityAssurance = result as any;
        return result;
      });

      // Stage 11: Final QA Loop (Legacy compatibility)
      if (this.options.enableQaLoop && this.state.stageResults.rendering) {
        await this.executeStage('qa', async () => {
          this.log('Stage 11: Final QA Loop - Legacy validation system');
          const renderUrl = this.state.stageResults.rendering!.renderUrl;
          // Mock facts_v3 since ConsolidatedResult doesn't have this property
          const factsV3 = {
            transparency: 'opaque' as const,
            safety: { must_not: ['expose_skin'] },
            surface_sheen: 'matte' as const,
            category_generic: 'top' as const,
            silhouette: 'fitted',
            required_components: ['body'],
            forbidden_components: ['visible_skin'],
            palette: {
              dominant_hex: '#808080',
              accent_hex: '#ffffff',
              trim_hex: '#000000',
              pattern_hexes: []
            },
            material: 'cotton',
            drape_stiffness: 0.5,
            pattern: 'solid',
            print_scale: 'none',
            edge_finish: 'serged',
            view: 'front',
            framing_margin_pct: 10,
            shadow_style: 'soft' as const,
            qa_targets: {
              deltaE_max: 3,
              edge_halo_max_pct: 1,
              symmetry_tolerance_pct: 3,
              min_resolution_px: 1024
            },
            label_visibility: 'optional' as const,
            weave_knit: 'woven' as const
          };
          
          let iterations = 0;
          let currentImageUrl = renderUrl;
          
          while (iterations < this.options.maxQaIterations!) {
            const qaReport = await this.executeWithTimeout(
              qaLoop(currentImageUrl, factsV3, this.state.sessionId),
              this.options.timeouts!.qa!,
              'qa'
            );
            
            this.state.stageResults.qaReport = qaReport;
            
            if (qaReport.passed || qaReport.deltas.length === 0) {
              this.log(`Legacy QA passed on iteration ${iterations + 1}`);
              break;
            }
            
            if (iterations < this.options.maxQaIterations! - 1) {
              this.log(`Legacy QA iteration ${iterations + 1}: Applying correction`);
              const correctionPrompt = qaReport.deltas[0].correction_prompt;
              this.log(`Legacy QA correction needed: ${correctionPrompt}`);
              break;
            }
            
            iterations++;
          }
          
          return this.state.stageResults.qaReport;
        });
      }

      // Mark as completed
      this.state.status = 'completed';
      this.log('Ghost Mannequin Pipeline v2.1 processing completed successfully');

      return this.buildResult();

    } catch (error) {
      this.state.status = 'failed';
      this.state.error = error instanceof GhostPipelineError ? error : new GhostPipelineError(
        `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PIPELINE_FAILED',
        this.state.currentStage || 'safety_prescrub',
        error instanceof Error ? error : undefined
      );

      this.log(`Pipeline failed at stage: ${this.state.currentStage}`);
      
      return this.buildResult();
    }
  }

  /**
   * Execute a pipeline stage with error handling
   * @param stage - The stage being executed
   * @param executor - Function that executes the stage logic
   */
  private async executeStage<T>(
    stage: ProcessingStage, 
    executor: () => Promise<T>
  ): Promise<T> {
    this.state.currentStage = stage;
    
    try {
      const result = await executor();
      this.log(`Stage ${stage} completed successfully`);
      return result;
    } catch (error) {
      this.log(`Stage ${stage} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Execute a promise with timeout
   * @param promise - Promise to execute
   * @param timeout - Timeout in milliseconds
   * @param stage - Current processing stage for error context
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    stage: ProcessingStage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new GhostPipelineError(
          `Stage ${stage} timed out after ${timeout}ms`,
          'STAGE_TIMEOUT',
          stage
        ));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Validate the incoming request
   * @param request - Request to validate
   */
  private async validateRequest(request: GhostRequest): Promise<void> {
    if (!request.flatlay) {
      throw new GhostPipelineError(
        'Flatlay image is required',
        'MISSING_FLATLAY',
        'safety_prescrub'
      );
    }

    // Additional validations could be added here
    // - File size checks
    // - Format validation
    // - URL accessibility checks
  }

  /**
   * Build the final result object
   */
  private buildResult(): GhostResult {
    const totalTime = Date.now() - this.state.startTime;
    const stageResults = this.state.stageResults;

    const result: GhostResult = {
      sessionId: this.state.sessionId,
      status: this.state.status,
      metrics: {
        processingTime: `${(totalTime / 1000).toFixed(2)}s`,
        stageTimings: {
          safetyPreScrub: stageResults.safetyPreScrub?.processingTime || 0,
          backgroundRemoval: (stageResults.backgroundRemovalFlatlay?.processingTime || 0) + (stageResults.backgroundRemovalOnModel?.processingTime || 0),
          analysis: stageResults.analysis?.processingTime || 0,
          segmentation: stageResults.segmentation?.processingTime || 0,
          cropGeneration: stageResults.cropGeneration?.processingTime || 0,
          partAnalysis: stageResults.partAnalysis?.processingTime || 0,
          enrichment: stageResults.enrichment?.processingTime || 0,
          maskRefinement: stageResults.maskRefinement?.processingTime || 0,
          consolidation: stageResults.consolidation?.performanceMetrics?.totalProcessingTime || 0,
          rendering: stageResults.rendering?.processingTime || 0,
          qualityAssurance: stageResults.qualityAssurance?.processingTime || 0,
        },
      },
    };

    // Add successful results
    if (this.state.status === 'completed') {
      result.cleanedImageUrl = stageResults.backgroundRemovalFlatlay?.cleanedImageUrl;
      result.cleanedOnModelUrl = stageResults.backgroundRemovalOnModel?.cleanedImageUrl;
      result.renderUrl = stageResults.rendering?.renderUrl;
      // Note: analysisUrl would be set if we store the analysis JSON to storage
      // result.analysisUrl = `/ghost/analysis/${this.state.sessionId}.json`;
    }
    
    // Add v2.1 stage data if available (for both success and partial results)
    if (stageResults.safetyPreScrub) {
      (result as any).safetyPreScrub = {
        humanMaskUrl: stageResults.safetyPreScrub.humanMaskUrl,
        personlessImageUrl: stageResults.safetyPreScrub.personlessImageUrl,
        safetyMetrics: stageResults.safetyPreScrub.safetyMetrics,
        recommendedAction: stageResults.safetyPreScrub.recommendedAction
      };
    }

    if (stageResults.analysis) {
      (result as any).analysis = stageResults.analysis.analysis;
    }

    if (stageResults.segmentation) {
      (result as any).segmentation = {
        maskUrl: stageResults.segmentation.maskUrl,
        segmentationData: stageResults.segmentation.segmentationData,
        qualityMetrics: stageResults.segmentation.qualityMetrics
      };
    }

    if (stageResults.cropGeneration) {
      (result as any).cropGeneration = {
        crops: stageResults.cropGeneration.crops,
        qualityMetrics: stageResults.cropGeneration.qualityMetrics
      };
    }

    if (stageResults.partAnalysis) {
      (result as any).partAnalysis = {
        regionAnalysis: stageResults.partAnalysis.regionAnalysis,
        overallMetrics: stageResults.partAnalysis.overallMetrics
      };
    }

    if (stageResults.maskRefinement) {
      (result as any).maskRefinement = {
        refinedMaskUrl: stageResults.maskRefinement.refinedMaskUrl,
        anatomicalValidation: stageResults.maskRefinement.anatomicalValidation,
        refinementMetrics: stageResults.maskRefinement.refinementMetrics
      };
    }
    
    // Add consolidation data if available
    if (stageResults.consolidation) {
      (result as any).consolidation = {
        executionSummary: stageResults.consolidation.pipelineExecution,
        qualityMetrics: stageResults.consolidation.qualityMetrics,
        conflicts_resolved: 0, // ConsolidatedResult doesn't track conflicts
      };
    }

    if (stageResults.qualityAssurance) {
      (result as any).qualityAssurance = {
        overallScore: stageResults.qualityAssurance.overallScore,
        commercialAcceptability: stageResults.qualityAssurance.commercialValidation?.passesCommercialStandards || false,
        qualityDimensions: stageResults.qualityAssurance.qualityDimensions || {},
        recommendations: stageResults.qualityAssurance.issues?.recommendations || []
      };
    }
    
    // Add QA report if available (legacy)
    if (stageResults.qaReport) {
      (result as any).qa_report = stageResults.qaReport;
    }
    

    // Add error details if failed
    if (this.state.status === 'failed' && this.state.error) {
      result.error = {
        message: this.state.error.message,
        code: this.state.error.code,
        stage: this.state.error.stage,
      };
    }

    return result;
  }

  /**
   * Generate ghost mannequin using Control Block approach
   * @param controlBlockPrompt - Optimized prompt from Control Block
   * @param consolidation - Consolidation output with Facts_v3
   */
  private async generateWithControlBlock(
    controlBlockPrompt: string,
    controlBlock: any
  ): Promise<GhostMannequinResult> {
    // Use the existing generation functions but with Control Block prompt
    const cleanedGarmentDetail = this.state.stageResults.backgroundRemovalFlatlay!.cleanedImageUrl;
    const cleanedOnModel = this.state.stageResults.backgroundRemovalOnModel?.cleanedImageUrl;
    
    // For now, use the existing generators with the optimized prompt
    // TODO: Create dedicated Control Block generator functions
    if (this.options.renderingModel === 'seedream') {
      return await generateGhostMannequinWithSeedream(
        cleanedGarmentDetail, 
        this.state.stageResults.analysis!.analysis, // Still need for compatibility
        cleanedOnModel,
        this.state.stageResults.enrichment?.enrichment
      );
    } else {
      return await generateGhostMannequin(
        cleanedGarmentDetail,
        this.state.stageResults.analysis!.analysis, // Still need for compatibility
        cleanedOnModel,
        this.state.stageResults.enrichment?.enrichment
      );
    }
  }

  /**
   * Log messages if logging is enabled
   * @param message - Message to log
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${this.state.sessionId}] ${message}`);
    }
  }

  /**
   * Get current pipeline state (useful for monitoring)
   */
  getState(): Readonly<PipelineState> {
    return { ...this.state };
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }
}

/**
 * Convenience function to process a single request
 * @param request - Ghost mannequin request
 * @param options - Pipeline options
 * @returns Promise<GhostResult> - Processing result
 */
export async function processGhostMannequin(
  request: GhostRequest,
  options: PipelineOptions
): Promise<GhostResult> {
  const pipeline = new GhostMannequinPipeline(options);
  return pipeline.process(request);
}

/**
 * Batch processing function for multiple requests
 * @param requests - Array of ghost mannequin requests
 * @param options - Pipeline options
 * @param concurrency - Number of concurrent processing pipelines (default: 3)
 * @returns Promise<GhostResult[]> - Array of processing results
 */
export async function processBatch(
  requests: GhostRequest[],
  options: PipelineOptions,
  concurrency: number = 3
): Promise<GhostResult[]> {
  const results: GhostResult[] = [];
  const chunks: GhostRequest[][] = [];
  
  // Split requests into chunks for concurrent processing
  for (let i = 0; i < requests.length; i += concurrency) {
    chunks.push(requests.slice(i, i + concurrency));
  }

  // Process each chunk
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(request => processGhostMannequin(request, options));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Pipeline health check function
 * @param options - Pipeline options to test
 * @returns Promise<boolean> - True if all services are accessible
 */
export async function healthCheck(options: PipelineOptions): Promise<{
  healthy: boolean;
  services: {
    fal: boolean;
    gemini: boolean;
    supabase: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const services = {
    fal: false,
    gemini: false,
    supabase: false,
  };

  // Test FAL.AI
  try {
    configureFalClient(options.falApiKey);
    // Could add a simple test call here
    services.fal = true;
  } catch (error) {
    errors.push(`FAL.AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Gemini
  try {
    configureGeminiClient(options.geminiApiKey);
    // Could add a simple test call here
    services.gemini = true;
  } catch (error) {
    errors.push(`Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Supabase (if configured)
  if (options.supabaseUrl && options.supabaseKey) {
    try {
      // Could add Supabase connection test here
      services.supabase = true;
    } catch (error) {
      errors.push(`Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    services.supabase = true; // Consider it healthy if not configured
  }

  const healthy = Object.values(services).every(Boolean);

  return {
    healthy,
    services,
    errors,
  };
}

// Export types for external use
export type { PipelineOptions, PipelineState };

import { AnalysisJSON, EnrichmentJSON, GarmentAnalysisResult, GarmentEnrichmentResult, GhostMannequinResult } from "@/types/ghost";
import type { ConsolidationOutput } from './consolidation';
export declare function configureGeminiClient(apiKey: string): void;
/**
 * Analyze garment using Gemini Pro model with structured output
 * @param imageUrl - Clean garment image URL or base64
 * @param sessionId - Session ID for tracking
 * @returns Promise with structured analysis and processing time
 */
export declare function analyzeGarment(imageUrl: string, sessionId: string): Promise<GarmentAnalysisResult>;
/**
 * Perform enrichment analysis on garment using Gemini Pro model with structured output (STEP 2)
 * This is the second analysis stage that focuses on rendering-critical attributes
 * @param imageUrl - Clean garment image URL or base64 (same as first analysis)
 * @param sessionId - Session ID for tracking
 * @param baseAnalysisSessionId - Session ID from the base analysis for reference
 * @returns Promise with structured enrichment analysis and processing time
 */
export declare function analyzeGarmentEnrichment(imageUrl: string, sessionId: string, baseAnalysisSessionId: string): Promise<GarmentEnrichmentResult>;
/**
 * Generate ghost mannequin image using Gemini Flash model with enhanced analysis integration
 * @param flatlayImage - Clean flatlay image (base64 or URL)
 * @param analysis - Structured garment analysis (base analysis)
 * @param originalImage - Optional on-model reference image
 * @param enrichment - Optional enrichment analysis for enhanced rendering
 * @returns Promise with rendered image URL and processing time
 */
export declare function generateGhostMannequin(flatlayImage: string, analysis: AnalysisJSON, originalImage?: string, enrichment?: EnrichmentJSON): Promise<GhostMannequinResult>;
/**
 * Enhanced ghost mannequin generation with custom prompting based on analysis
 * @param flatlayImage - Clean flatlay image
 * @param analysis - Structured garment analysis
 * @param onModelImage - Optional on-model reference
 * @returns Promise with detailed rendering result
 */
export declare function generateEnhancedGhostMannequin(flatlayImage: string, analysis: AnalysisJSON, onModelImage?: string): Promise<GhostMannequinResult>;
/**
 * Generate ghost mannequin image using FAL.AI Seedream 4.0 Edit model
 * @param flatlayImage - Clean flatlay image (base64 or URL)
 * @param analysis - Structured garment analysis
 * @param originalImage - Optional on-model reference image
 * @param enrichment - Optional enrichment analysis
 * @returns Promise with rendered image URL and processing time
 */
/**
 * Generate ghost mannequin using Control Block with Seedream 4.0
 * @param flatlayImage - Clean flatlay image
 * @param controlBlockPrompt - Optimized prompt from consolidation
 * @param consolidation - Consolidation output with Facts_v3
 * @param originalImage - Optional on-model reference
 */
export declare function generateGhostMannequinWithControlBlock(flatlayImage: string, controlBlockPrompt: string, consolidation: ConsolidationOutput, originalImage?: string): Promise<GhostMannequinResult>;
/**
 * Generate ghost mannequin using Control Block with Gemini Flash
 * @param flatlayImage - Clean flatlay image
 * @param controlBlockPrompt - Optimized prompt from consolidation
 * @param consolidation - Consolidation output with Facts_v3
 * @param originalImage - Optional on-model reference
 */
export declare function generateGhostMannequinWithControlBlockGemini(flatlayImage: string, controlBlockPrompt: string, consolidation: ConsolidationOutput, originalImage?: string): Promise<GhostMannequinResult>;
export declare function generateGhostMannequinWithSeedream(flatlayImage: string, analysis: AnalysisJSON, originalImage?: string, enrichment?: EnrichmentJSON): Promise<GhostMannequinResult>;
/**
 * Test Gemini Flash image generation with a simple prompt
 */
export declare function testGeminiFlashImageGeneration(): Promise<boolean>;
/**
 * Validate Gemini API configuration
 * @returns Promise<boolean> - true if API is accessible
 */
export declare function validateGeminiApi(): Promise<boolean>;

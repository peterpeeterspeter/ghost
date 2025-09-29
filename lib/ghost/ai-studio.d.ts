import { GhostMannequinResult } from "@/types/ghost";
import type { ConsolidationOutput } from './consolidation';
export declare function configureAiStudioClient(apiKey: string): void;
/**
 * Generate ghost mannequin image using AI Studio (Gemini 2.5 Flash) with complete payload integration
 * @param flatlayImage - Clean flatlay image (base64 or URL)
 * @param consolidation - Complete consolidation output with FactsV3 and ControlBlock
 * @param originalImage - Optional on-model reference image
 * @param sessionId - Session ID for tracking
 * @param options - Generation options including structured prompt settings
 * @returns Promise with rendered image URL and processing time
 */
/**
 * Generate ghost mannequin using AI Studio with direct JSON payload (OPTIMAL)
 * Passes structured FactsV3 + ControlBlock data directly as JSON to Flash Image
 */
export declare function generateGhostMannequinWithStructuredJSON(flatlayImage: string, factsV3: any, controlBlock: any, originalImage?: string, options?: {
    sessionId?: string;
}): Promise<GhostMannequinResult>;
/**
 * Generate ghost mannequin using AI Studio (LEGACY - uses text prompts)
 */
export declare function generateGhostMannequinWithAiStudio(flatlayImage: string, consolidation: ConsolidationOutput, originalImage?: string, sessionId?: string, options?: {
    useStructuredPrompt?: boolean;
    useExpertPrompt?: boolean;
}): Promise<GhostMannequinResult>;
/**
 * Alternative generation method with simplified prompt (fallback)
 * @param flatlayImage - Clean flatlay image
 * @param consolidation - Consolidation output
 * @param originalImage - Optional on-model reference
 * @param sessionId - Session ID
 */
export declare function generateGhostMannequinWithAiStudioSimple(flatlayImage: string, consolidation: ConsolidationOutput, originalImage?: string, sessionId?: string): Promise<GhostMannequinResult>;
/**
 * Health check for AI Studio integration
 */
export declare function checkAiStudioHealth(): Promise<{
    status: string;
    message: string;
}>;
/**
 * Get AI Studio client status and configuration
 */
export declare function getAiStudioStatus(): {
    configured: boolean;
    model: string;
    capabilities: string[];
};

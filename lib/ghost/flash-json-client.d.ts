import type { FlashImagePromptPayload } from './json-payload-generator';
import type { GhostMannequinResult } from '@/types/ghost';
import type { ConsolidationOutput } from './consolidation';
/**
 * Send JSON payload to Gemini Flash 2.5 via Freepik API or AI Studio
 * This replaces the distilled prompt approach with structured JSON
 */
export declare function generateGhostMannequinWithJsonPayload(payload: FlashImagePromptPayload, renderingModel?: 'freepik-gemini' | 'ai-studio', originalConsolidation?: ConsolidationOutput): Promise<GhostMannequinResult>;
/**
 * Fallback generation using distilled prompts if JSON approach fails
 */
export declare function fallbackToDistilledPrompts(flatlayImage: string, consolidation: ConsolidationOutput, originalImage?: string): Promise<GhostMannequinResult>;
/**
 * Validate JSON payload before sending to ensure it meets schema requirements
 */
export declare function validateJsonPayload(payload: FlashImagePromptPayload): void;

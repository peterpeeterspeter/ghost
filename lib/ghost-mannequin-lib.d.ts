/**
 * Ghost Mannequin Pipeline - Standalone Library
 * Direct integration without requiring a running server
 */
import { GhostRequest, GhostResult } from '../types/ghost.js';
export interface GhostMannequinConfig {
    falApiKey: string;
    geminiApiKey: string;
    freepikApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    renderingModel?: 'freepik-gemini' | 'gemini-flash' | 'seedream' | 'ai-studio';
    timeouts?: {
        backgroundRemoval?: number;
        analysis?: number;
        enrichment?: number;
        consolidation?: number;
        rendering?: number;
        qa?: number;
    };
    enableLogging?: boolean;
}
export declare class GhostMannequinLibrary {
    private config;
    constructor(config: GhostMannequinConfig);
    /**
     * Process ghost mannequin directly from image data
     * @param flatlay - Base64 image data or URL
     * @param onModel - Optional base64 image data or URL
     * @param options - Processing options
     */
    process(flatlay: string, onModel?: string, options?: {
        outputSize?: string;
        backgroundColor?: string;
        preserveLabels?: boolean;
        useStructuredPrompt?: boolean;
        useExpertPrompt?: boolean;
    }): Promise<GhostResult>;
    /**
     * Process from File objects (browser environment)
     */
    processFromFiles(flatlayFile: File, onModelFile?: File, options?: Parameters<typeof this.process>[2]): Promise<GhostResult>;
    /**
     * Process from file paths (Node.js environment)
     */
    processFromPaths(flatlayPath: string, onModelPath?: string, options?: Parameters<typeof this.process>[2]): Promise<GhostResult>;
    /**
     * Batch processing multiple images
     */
    processBatch(images: Array<{
        flatlay: string;
        onModel?: string;
        options?: Parameters<typeof this.process>[2];
    }>, concurrent?: number): Promise<GhostResult[]>;
    private validateConfig;
    private fileToBase64;
}
export declare function createGhostMannequinLibrary(config: GhostMannequinConfig): GhostMannequinLibrary;
export type { GhostRequest, GhostResult };

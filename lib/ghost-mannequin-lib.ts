/**
 * Ghost Mannequin Pipeline - Standalone Library
 * Direct integration without requiring a running server
 */

import { GhostRequest, GhostResult, GhostPipelineOptions } from '../types/ghost.js';
import { processGhostMannequin } from './ghost/pipeline.js';

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

export class GhostMannequinLibrary {
  private config: GhostMannequinConfig;

  constructor(config: GhostMannequinConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Process ghost mannequin directly from image data
   * @param flatlay - Base64 image data or URL
   * @param onModel - Optional base64 image data or URL
   * @param options - Processing options
   */
  async process(
    flatlay: string,
    onModel?: string,
    options: {
      outputSize?: string;
      backgroundColor?: string;
      preserveLabels?: boolean;
      useStructuredPrompt?: boolean;
      useExpertPrompt?: boolean;
    } = {}
  ): Promise<GhostResult> {
    const request: GhostRequest = {
      flatlay,
      onModel,
      options: {
        outputSize: options.outputSize || '2048x2048',
        backgroundColor: options.backgroundColor || 'white',
        preserveLabels: options.preserveLabels !== false,
        useStructuredPrompt: options.useStructuredPrompt || false,
        useExpertPrompt: options.useExpertPrompt || false,
      }
    };

    const pipelineOptions: GhostPipelineOptions = {
      falApiKey: this.config.falApiKey,
      geminiApiKey: this.config.geminiApiKey,
      freepikApiKey: this.config.freepikApiKey,
      supabaseUrl: this.config.supabaseUrl,
      supabaseKey: this.config.supabaseKey,
      renderingModel: this.config.renderingModel || 'ai-studio',
      enableLogging: this.config.enableLogging || false,
      timeouts: {
        backgroundRemoval: this.config.timeouts?.backgroundRemoval || 30000,
        analysis: this.config.timeouts?.analysis || 90000,
        enrichment: this.config.timeouts?.enrichment || 120000,
        consolidation: this.config.timeouts?.consolidation || 45000,
        rendering: this.config.timeouts?.rendering || 180000,
        qa: this.config.timeouts?.qa || 60000,
      },
      enableQaLoop: true,
      maxQaIterations: 2,
    };

    return await processGhostMannequin(request, pipelineOptions);
  }

  /**
   * Process from File objects (browser environment)
   */
  async processFromFiles(
    flatlayFile: File,
    onModelFile?: File,
    options?: Parameters<typeof this.process>[2]
  ): Promise<GhostResult> {
    const flatlayBase64 = await this.fileToBase64(flatlayFile);
    const onModelBase64 = onModelFile ? await this.fileToBase64(onModelFile) : undefined;
    
    return this.process(flatlayBase64, onModelBase64, options);
  }

  /**
   * Process from file paths (Node.js environment)
   */
  async processFromPaths(
    flatlayPath: string,
    onModelPath?: string,
    options?: Parameters<typeof this.process>[2]
  ): Promise<GhostResult> {
    const fs = await import('fs/promises');
    
    const flatlayBuffer = await fs.readFile(flatlayPath);
    const flatlayBase64 = `data:image/jpeg;base64,${flatlayBuffer.toString('base64')}`;
    
    let onModelBase64: string | undefined;
    if (onModelPath) {
      const onModelBuffer = await fs.readFile(onModelPath);
      onModelBase64 = `data:image/jpeg;base64,${onModelBuffer.toString('base64')}`;
    }
    
    return this.process(flatlayBase64, onModelBase64, options);
  }

  /**
   * Batch processing multiple images
   */
  async processBatch(
    images: Array<{
      flatlay: string;
      onModel?: string;
      options?: Parameters<typeof this.process>[2];
    }>,
    concurrent = 3
  ): Promise<GhostResult[]> {
    const results: GhostResult[] = [];
    
    // Process in chunks to avoid overwhelming APIs
    for (let i = 0; i < images.length; i += concurrent) {
      const chunk = images.slice(i, i + concurrent);
      const chunkPromises = chunk.map(img => 
        this.process(img.flatlay, img.onModel, img.options)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle failed processing
          results.push({
            sessionId: 'failed',
            status: 'failed',
            error: {
              message: result.reason?.message || 'Processing failed',
              code: 'BATCH_PROCESSING_ERROR',
              stage: 'unknown'
            },
            metrics: {
              processingTime: '0s',
              stageTimings: {
                backgroundRemoval: 0,
                analysis: 0,
                enrichment: 0,
                consolidation: 0,
                rendering: 0,
              }
            }
          } as GhostResult);
        }
      }
    }
    
    return results;
  }

  private validateConfig(): void {
    if (!this.config.falApiKey) {
      throw new Error('FAL API key is required');
    }
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Factory function for easy initialization
export function createGhostMannequinLibrary(config: GhostMannequinConfig): GhostMannequinLibrary {
  return new GhostMannequinLibrary(config);
}

// Export types for external use
export type { GhostRequest, GhostResult };

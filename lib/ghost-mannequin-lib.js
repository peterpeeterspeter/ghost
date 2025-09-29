/**
 * Ghost Mannequin Pipeline - Standalone Library
 * Direct integration without requiring a running server
 */
import { processGhostMannequin } from './ghost/pipeline.js';
export class GhostMannequinLibrary {
    config;
    constructor(config) {
        this.config = config;
        this.validateConfig();
    }
    /**
     * Process ghost mannequin directly from image data
     * @param flatlay - Base64 image data or URL
     * @param onModel - Optional base64 image data or URL
     * @param options - Processing options
     */
    async process(flatlay, onModel, options = {}) {
        const request = {
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
        const pipelineOptions = {
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
    async processFromFiles(flatlayFile, onModelFile, options) {
        const flatlayBase64 = await this.fileToBase64(flatlayFile);
        const onModelBase64 = onModelFile ? await this.fileToBase64(onModelFile) : undefined;
        return this.process(flatlayBase64, onModelBase64, options);
    }
    /**
     * Process from file paths (Node.js environment)
     */
    async processFromPaths(flatlayPath, onModelPath, options) {
        const fs = await import('fs/promises');
        const flatlayBuffer = await fs.readFile(flatlayPath);
        const flatlayBase64 = `data:image/jpeg;base64,${flatlayBuffer.toString('base64')}`;
        let onModelBase64;
        if (onModelPath) {
            const onModelBuffer = await fs.readFile(onModelPath);
            onModelBase64 = `data:image/jpeg;base64,${onModelBuffer.toString('base64')}`;
        }
        return this.process(flatlayBase64, onModelBase64, options);
    }
    /**
     * Batch processing multiple images
     */
    async processBatch(images, concurrent = 3) {
        const results = [];
        // Process in chunks to avoid overwhelming APIs
        for (let i = 0; i < images.length; i += concurrent) {
            const chunk = images.slice(i, i + concurrent);
            const chunkPromises = chunk.map(img => this.process(img.flatlay, img.onModel, img.options));
            const chunkResults = await Promise.allSettled(chunkPromises);
            for (const result of chunkResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
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
                    });
                }
            }
        }
        return results;
    }
    validateConfig() {
        if (!this.config.falApiKey) {
            throw new Error('FAL API key is required');
        }
        if (!this.config.geminiApiKey) {
            throw new Error('Gemini API key is required');
        }
    }
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
// Factory function for easy initialization
export function createGhostMannequinLibrary(config) {
    return new GhostMannequinLibrary(config);
}

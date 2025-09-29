import type { FactsV3, ControlBlock } from './consolidation';
export declare function configurePromptGenerator(apiKey: string): void;
/**
 * Generate dynamic prompt using Gemini 2.0 Flash-Lite by weaving FactsV3 data into Flash 2.5 template
 */
export declare function generateDynamicPrompt(facts: FactsV3, controlBlock: ControlBlock, sessionId: string): Promise<{
    prompt: string;
    processingTime: number;
}>;
/**
 * Legacy static prompt builder for backwards compatibility
 */
export declare function buildStaticFlashPrompt(control: ControlBlock): string;

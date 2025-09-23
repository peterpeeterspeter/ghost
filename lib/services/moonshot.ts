/**
 * Moonshot AI Service via OpenRouter
 * Alternative AI model for rate limit fallback and load balancing
 */

import { GhostPipelineError } from '@/types/ghost';

interface MoonshotConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface MoonshotRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

interface MoonshotResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  id: string;
  created: number;
  model: string;
}

export class MoonshotService {
  private config: Required<MoonshotConfig>;

  constructor(config: MoonshotConfig) {
    this.config = {
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'moonshotai/kimi-k2-0905',
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Generate analysis using Moonshot AI via OpenRouter
   */
  async generateAnalysis(
    prompt: string,
    systemPrompt?: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      console.log(`[Moonshot] Generating analysis with ${this.config.model}...`);
      
      const messages: MoonshotRequest['messages'] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const request: MoonshotRequest = {
        model: this.config.model,
        messages,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
        stream: false
      };

      const response = await this.makeRequest('/chat/completions', request);
      const processingTime = Date.now() - startTime;

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices returned from Moonshot AI');
      }

      const content = response.choices[0].message.content;
      
      console.log(`[Moonshot] ✅ Analysis completed in ${processingTime}ms`);
      console.log(`[Moonshot] Tokens used: ${response.usage?.total_tokens || 'unknown'}`);
      
      return content;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[Moonshot] ❌ Analysis failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Analyze garment image with structured output
   */
  async analyzeGarment(
    imageBase64: string,
    analysisType: 'base' | 'enrichment' = 'base'
  ): Promise<any> {
    const systemPrompt = analysisType === 'base' 
      ? this.getBaseAnalysisSystemPrompt()
      : this.getEnrichmentAnalysisSystemPrompt();

    const userPrompt = `Analyze this garment image and provide structured analysis:

Image: data:image/jpeg;base64,${imageBase64}

Please provide detailed analysis focusing on:
1. Garment category and type
2. Style and silhouette characteristics  
3. Construction details and features
4. Color and material properties
5. Technical specifications for manufacturing

Return the analysis in structured JSON format.`;

    try {
      const result = await this.generateAnalysis(userPrompt, systemPrompt, {
        maxTokens: 3000,
        temperature: 0.2
      });

      // Try to parse as JSON, fallback to text if parsing fails
      try {
        return JSON.parse(result);
      } catch {
        // If not valid JSON, wrap in a structured format
        return {
          analysis_text: result,
          source: 'moonshot_ai',
          model: this.config.model,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('[Moonshot] Garment analysis failed:', error);
      throw new GhostPipelineError(
        `Moonshot AI garment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MOONSHOT_ANALYSIS_FAILED',
        'analysis',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate garment-specific prompts for AI processing
   */
  async generateGarmentPrompts(
    garmentData: any,
    promptType: 'segmentation' | 'generation' | 'quality'
  ): Promise<string[]> {
    const systemPrompt = `You are an expert in garment analysis and AI prompt engineering. 
Generate precise, technical prompts for AI image processing based on garment characteristics.
Focus on accuracy, specificity, and technical detail.`;

    const userPrompt = this.buildPromptGenerationRequest(garmentData, promptType);

    try {
      const result = await this.generateAnalysis(userPrompt, systemPrompt, {
        maxTokens: 1000,
        temperature: 0.4
      });

      // Parse the response to extract prompts
      const prompts = this.parsePromptResponse(result);
      
      console.log(`[Moonshot] Generated ${prompts.length} ${promptType} prompts`);
      return prompts;

    } catch (error) {
      console.error(`[Moonshot] Prompt generation failed for ${promptType}:`, error);
      // Return fallback prompts
      return this.getFallbackPrompts(promptType);
    }
  }

  /**
   * Make HTTP request to OpenRouter API with retry logic
   */
  private async makeRequest(
    endpoint: string, 
    data: any, 
    attempt: number = 1
  ): Promise<MoonshotResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ghost-mannequin.ai',
          'X-Title': 'Ghost Mannequin Pipeline'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      if (attempt < this.config.maxRetries) {
        console.warn(`[Moonshot] Request attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.makeRequest(endpoint, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * System prompts for different analysis types
   */
  private getBaseAnalysisSystemPrompt(): string {
    return `You are an expert garment analyst specializing in fashion and apparel manufacturing.
Analyze garment images with focus on:
- Category classification (top/bottom/dress/outerwear)
- Silhouette and fit characteristics
- Construction details and seaming
- Neckline, sleeve, and hem specifications
- Material and fabric properties
- Color and pattern analysis

Provide structured, technical analysis suitable for manufacturing and design.`;
  }

  private getEnrichmentAnalysisSystemPrompt(): string {
    return `You are a fashion design expert focused on detailed garment analysis.
Provide enriched analysis including:
- Style trends and fashion context
- Target demographic and market positioning
- Seasonal appropriateness
- Care instructions and durability
- Styling recommendations
- Quality assessment and craftsmanship details

Enhance the analysis with contextual fashion industry insights.`;
  }

  /**
   * Build prompt generation request based on garment data
   */
  private buildPromptGenerationRequest(garmentData: any, promptType: string): string {
    const baseInfo = `
Garment Type: ${garmentData.category_generic || 'unknown'}
Style: ${garmentData.silhouette || 'unknown'}
Features: ${JSON.stringify(garmentData.features || {})}
`;

    switch (promptType) {
      case 'segmentation':
        return `${baseInfo}

Generate 5-8 precise text prompts for AI segmentation models to identify this garment's key regions.
Focus on: main body, neckline, sleeves, hem, closures, details.
Format as comma-separated list.`;

      case 'generation':
        return `${baseInfo}

Create 3-5 detailed prompts for AI image generation to create a ghost mannequin version.
Include: silhouette, proportions, hollow areas, fabric drape, lighting.
Focus on photorealistic, commercial quality output.`;

      case 'quality':
        return `${baseInfo}

Generate 4-6 prompts for AI quality assessment of garment processing.
Focus on: symmetry, edge quality, proportion accuracy, fit assessment.
Include technical quality metrics and validation criteria.`;

      default:
        return `${baseInfo}\n\nGenerate appropriate AI prompts for ${promptType} processing.`;
    }
  }

  /**
   * Parse prompt response from AI
   */
  private parsePromptResponse(response: string): string[] {
    try {
      // Try to extract prompts from various response formats
      const lines = response.split('\n').filter(line => line.trim());
      const prompts: string[] = [];

      for (const line of lines) {
        // Look for numbered lists, bullet points, or comma-separated values
        if (line.match(/^\d+\./) || line.match(/^[-*•]/) || line.includes(',')) {
          const extracted = line
            .replace(/^\d+\.\s*/, '')
            .replace(/^[-*•]\s*/, '')
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
          
          prompts.push(...extracted);
        } else if (line.trim().length > 10) {
          prompts.push(line.trim());
        }
      }

      return prompts.length > 0 ? prompts : [response.trim()];

    } catch (error) {
      console.warn('[Moonshot] Failed to parse prompt response:', error);
      return [response.trim()];
    }
  }

  /**
   * Fallback prompts for different types
   */
  private getFallbackPrompts(promptType: string): string[] {
    switch (promptType) {
      case 'segmentation':
        return [
          'garment', 'clothing item', 'main body', 'neckline', 
          'sleeves', 'hem', 'collar', 'cuffs'
        ];
      case 'generation':
        return [
          'ghost mannequin effect', 'hollow garment', 'professional product photography',
          'clean white background', 'retail quality image'
        ];
      case 'quality':
        return [
          'symmetrical garment', 'smooth edges', 'proper proportions',
          'clean silhouette', 'accurate fit'
        ];
      default:
        return ['high quality garment', 'professional processing'];
    }
  }
}

/**
 * Create configured Moonshot service instance
 */
export function createMoonshotService(apiKey?: string): MoonshotService {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  
  if (!key) {
    throw new GhostPipelineError(
      'OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable.',
      'MISSING_OPENROUTER_KEY',
      'configuration'
    );
  }
  
  return new MoonshotService({ apiKey: key });
}

/**
 * Test Moonshot AI connectivity and model availability
 */
export async function testMoonshotConnection(apiKey?: string): Promise<boolean> {
  try {
    const service = createMoonshotService(apiKey);
    
    const testResult = await service.generateAnalysis(
      'Hello, please respond with "Connection successful" to test connectivity.',
      'You are a helpful assistant.',
      { maxTokens: 50, temperature: 0 }
    );
    
    const isSuccessful = testResult.toLowerCase().includes('connection successful') || 
                        testResult.toLowerCase().includes('hello') ||
                        testResult.length > 0;
    
    console.log(`[Moonshot] Connection test: ${isSuccessful ? 'SUCCESS' : 'FAILED'}`);
    return isSuccessful;

  } catch (error) {
    console.error('[Moonshot] Connection test failed:', error);
    return false;
  }
}
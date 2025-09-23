/**
 * AI Provider Configuration and Management System
 * Handles multiple AI providers with automatic fallback and load balancing
 */

interface AIProviderConfig {
  name: string;
  type: 'anthropic' | 'openrouter' | 'openai' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  priority: number; // Lower number = higher priority
  enabled: boolean;
  rateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    dailyLimit?: number;
  };
  features: {
    textGeneration: boolean;
    imageAnalysis: boolean;
    structuredOutput: boolean;
    longContext: boolean;
  };
  fallbackDelay?: number; // ms to wait before trying this provider
}

interface AIProviderStatus {
  name: string;
  available: boolean;
  lastError?: string;
  lastSuccess?: Date;
  requestCount: number;
  tokenCount: number;
  dailyUsage: number;
}

export class AIProviderManager {
  private providers: Map<string, AIProviderConfig> = new Map();
  private status: Map<string, AIProviderStatus> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeProviders();
    this.startMonitoring();
  }

  /**
   * Initialize available AI providers
   */
  private initializeProviders(): void {
    // Primary: Claude Code (Anthropic)
    if (process.env.ANTHROPIC_API_KEY) {
      this.addProvider({
        name: 'claude-code',
        type: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-sonnet-20240229',
        priority: 1,
        enabled: true,
        rateLimits: {
          requestsPerMinute: 50,
          tokensPerMinute: 100000,
          dailyLimit: 1000000
        },
        features: {
          textGeneration: true,
          imageAnalysis: true,
          structuredOutput: true,
          longContext: true
        }
      });
    }

    // Secondary: Moonshot AI via OpenRouter
    const openRouterKey = process.env.OPENROUTER_API_KEY || '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';
    this.addProvider({
      name: 'moonshot-kimi',
      type: 'openrouter',
      apiKey: openRouterKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'moonshotai/kimi-k2-0905',
      priority: 2,
      enabled: true,
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerMinute: 50000,
        dailyLimit: 500000
      },
      features: {
        textGeneration: true,
        imageAnalysis: true,
        structuredOutput: true,
        longContext: true
      },
      fallbackDelay: 1000
    });

    // Tertiary: Other OpenRouter models as backup
    this.addProvider({
      name: 'claude-haiku-or',
      type: 'openrouter',
      apiKey: openRouterKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3-haiku',
      priority: 3,
      enabled: true,
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 200000,
        dailyLimit: 2000000
      },
      features: {
        textGeneration: true,
        imageAnalysis: true,
        structuredOutput: true,
        longContext: false
      },
      fallbackDelay: 2000
    });

    console.log(`[AIProviders] Initialized ${this.providers.size} AI providers`);
  }

  /**
   * Add a new AI provider to the system
   */
  addProvider(config: AIProviderConfig): void {
    this.providers.set(config.name, config);
    this.status.set(config.name, {
      name: config.name,
      available: config.enabled,
      requestCount: 0,
      tokenCount: 0,
      dailyUsage: 0
    });
  }

  /**
   * Get the best available provider for a specific task
   */
  async getBestProvider(
    requirements: {
      feature: keyof AIProviderConfig['features'];
      maxTokens?: number;
      priority?: 'speed' | 'quality' | 'cost';
    }
  ): Promise<AIProviderConfig | null> {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => 
        provider.enabled && 
        provider.features[requirements.feature] &&
        this.isProviderAvailable(provider.name)
      )
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority)
        if (requirements.priority === 'speed') {
          return a.priority - b.priority;
        } else if (requirements.priority === 'quality') {
          // For quality, prefer Claude over others
          if (a.type === 'anthropic' && b.type !== 'anthropic') return -1;
          if (b.type === 'anthropic' && a.type !== 'anthropic') return 1;
        }
        return a.priority - b.priority;
      });

    if (availableProviders.length === 0) {
      console.warn('[AIProviders] No available providers for feature:', requirements.feature);
      return null;
    }

    const selectedProvider = availableProviders[0];
    console.log(`[AIProviders] Selected provider: ${selectedProvider.name} for ${requirements.feature}`);
    
    return selectedProvider;
  }

  /**
   * Execute a request with automatic fallback
   */
  async executeWithFallback<T>(
    requirements: {
      feature: keyof AIProviderConfig['features'];
      maxTokens?: number;
      priority?: 'speed' | 'quality' | 'cost';
    },
    requestFn: (provider: AIProviderConfig) => Promise<T>
  ): Promise<T> {
    const providers = Array.from(this.providers.values())
      .filter(provider => 
        provider.enabled && 
        provider.features[requirements.feature]
      )
      .sort((a, b) => a.priority - b.priority);

    let lastError: Error | null = null;

    for (const provider of providers) {
      if (!this.isProviderAvailable(provider.name)) {
        console.log(`[AIProviders] Skipping unavailable provider: ${provider.name}`);
        continue;
      }

      try {
        console.log(`[AIProviders] Attempting request with provider: ${provider.name}`);
        
        // Add fallback delay if specified
        if (provider.fallbackDelay && lastError) {
          await new Promise(resolve => setTimeout(resolve, provider.fallbackDelay));
        }

        const result = await requestFn(provider);
        
        // Update success metrics
        this.updateProviderSuccess(provider.name);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`[AIProviders] Provider ${provider.name} failed:`, error);
        
        // Update failure metrics
        this.updateProviderFailure(provider.name, lastError.message);
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Check if a provider is available and within rate limits
   */
  private isProviderAvailable(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    const status = this.status.get(providerName);
    
    if (!provider || !status || !provider.enabled) {
      return false;
    }

    // Check rate limits
    if (provider.rateLimits) {
      const counts = this.requestCounts.get(providerName);
      if (counts) {
        const now = Date.now();
        const minutesPassed = (now - counts.resetTime) / 60000;
        
        if (minutesPassed < 1 && provider.rateLimits.requestsPerMinute) {
          if (counts.count >= provider.rateLimits.requestsPerMinute) {
            return false;
          }
        }
        
        if (provider.rateLimits.dailyLimit && status.dailyUsage >= provider.rateLimits.dailyLimit) {
          return false;
        }
      }
    }

    return status.available;
  }

  /**
   * Update provider metrics on successful request
   */
  private updateProviderSuccess(providerName: string): void {
    const status = this.status.get(providerName);
    if (status) {
      status.available = true;
      status.lastSuccess = new Date();
      status.requestCount++;
      status.dailyUsage++;
      status.lastError = undefined;
    }

    // Update rate limiting counters
    this.updateRateLimitCounters(providerName);
  }

  /**
   * Update provider metrics on failed request
   */
  private updateProviderFailure(providerName: string, error: string): void {
    const status = this.status.get(providerName);
    if (status) {
      status.lastError = error;
      
      // Temporarily disable provider if it's failing consistently
      if (error.includes('rate limit') || error.includes('quota')) {
        status.available = false;
        console.log(`[AIProviders] Temporarily disabling ${providerName} due to rate limits`);
        
        // Re-enable after 5 minutes
        setTimeout(() => {
          if (status) {
            status.available = true;
            console.log(`[AIProviders] Re-enabled provider: ${providerName}`);
          }
        }, 5 * 60 * 1000);
      }
    }
  }

  /**
   * Update rate limiting counters
   */
  private updateRateLimitCounters(providerName: string): void {
    const now = Date.now();
    const counts = this.requestCounts.get(providerName);
    
    if (!counts || (now - counts.resetTime) >= 60000) {
      // Reset counter every minute
      this.requestCounts.set(providerName, {
        count: 1,
        resetTime: now
      });
    } else {
      counts.count++;
    }
  }

  /**
   * Start monitoring provider health
   */
  private startMonitoring(): void {
    // Reset daily usage counters at midnight
    const resetDaily = () => {
      for (const status of this.status.values()) {
        status.dailyUsage = 0;
      }
      console.log('[AIProviders] Daily usage counters reset');
    };

    // Schedule daily reset
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      resetDaily();
      // Then reset every 24 hours
      setInterval(resetDaily, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }

  /**
   * Get current provider status
   */
  getProviderStatus(): Array<AIProviderStatus & { provider: AIProviderConfig }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      ...this.status.get(name)!,
      provider
    }));
  }

  /**
   * Force enable/disable a provider
   */
  setProviderEnabled(providerName: string, enabled: boolean): void {
    const provider = this.providers.get(providerName);
    const status = this.status.get(providerName);
    
    if (provider && status) {
      provider.enabled = enabled;
      status.available = enabled;
      console.log(`[AIProviders] Provider ${providerName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Singleton instance
export const aiProviderManager = new AIProviderManager();

/**
 * Convenience function to get the best provider
 */
export async function getBestAIProvider(
  feature: keyof AIProviderConfig['features'],
  priority: 'speed' | 'quality' | 'cost' = 'quality'
): Promise<AIProviderConfig | null> {
  return aiProviderManager.getBestProvider({ feature, priority });
}

/**
 * Execute AI request with automatic fallback
 */
export async function executeWithAIFallback<T>(
  feature: keyof AIProviderConfig['features'],
  requestFn: (provider: AIProviderConfig) => Promise<T>,
  priority: 'speed' | 'quality' | 'cost' = 'quality'
): Promise<T> {
  return aiProviderManager.executeWithFallback({ feature, priority }, requestFn);
}
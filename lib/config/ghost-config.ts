/**
 * Centralized Ghost Mannequin Pipeline Configuration Management
 * Consolidates all processing settings, API keys, and parameters
 */

import { EdgeErosionConfig } from '../ghost/edge-erosion';
import { PersonScrubConfig } from '../ghost/person-scrub';

export interface GhostPipelineConfig {
  // AI Provider Settings
  aiProviders: {
    primary: {
      name: string;
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    fallback: {
      name: string;
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    replicateKey: string;
    falAiKey: string;
  };

  // Computer Vision Processing Settings
  cv: {
    personScrub: PersonScrubConfig;
    edgeErosion: EdgeErosionConfig;
    maskRefinement: {
      bilateralFilter: {
        d: number; // neighborhood diameter
        sigmaColor: number; // color sigma
        sigmaSpace: number; // coordinate space sigma
      };
      morphological: {
        kernelSize: number;
        iterations: number;
        erosionStrength: number;
        dilationStrength: number;
      };
      qualityThresholds: {
        minSymmetryScore: number; // 0.8 = 80% symmetry required
        maxEdgeRoughness: number; // 0.3 = max 30% edge roughness
        minCoverage: number; // 0.85 = min 85% coverage
      };
    };
    segmentation: {
      samModel: 'sam_vit_h_4b8939' | 'sam_vit_l_0b3195' | 'sam_vit_b_01ec64';
      confidence: number; // 0.85 default
      iouThreshold: number; // 0.5 default
      minMaskArea: number; // 100 pixels minimum
    };
    backgroundRemoval: {
      model: 'bria-rmbg-v1.4' | 'rembg-new' | 'rembg-v1.4';
      precision: 'high' | 'medium' | 'fast';
      postProcessing: boolean;
    };
  };

  // Pipeline Processing Settings
  processing: {
    maxImageSize: number; // 4096x4096 max
    supportedFormats: string[]; // ['jpg', 'jpeg', 'png', 'webp']
    outputFormat: 'png' | 'jpeg' | 'webp';
    outputQuality: number; // 0.95 = 95% quality
    timeout: number; // 300000ms = 5 minutes
    parallelProcessing: boolean;
    maxConcurrency: number; // 3 concurrent operations
  };

  // Quality Assurance Settings
  qa: {
    enableQualityChecks: boolean;
    autoRetryOnFailure: boolean;
    maxRetries: number; // 3 attempts
    failureThresholds: {
      maxProcessingTime: number; // 600000ms = 10 minutes
      minOutputSize: number; // 1024 bytes minimum
      maxErrorRate: number; // 0.1 = 10% max error rate
    };
    metrics: {
      trackProcessingTimes: boolean;
      trackQualityScores: boolean;
      trackErrorRates: boolean;
      exportMetrics: boolean;
    };
  };

  // Safety and Compliance Settings
  safety: {
    enablePersonScrub: boolean;
    skinThreshold: number; // 0.15 = 15% max skin exposure
    blockHighRisk: boolean;
    auditTrail: boolean;
    encryptStorage: boolean;
  };

  // Storage and Caching Settings
  storage: {
    tempDir: string;
    cleanupAfterMs: number; // 3600000ms = 1 hour
    enableCaching: boolean;
    cacheExpiryMs: number; // 86400000ms = 24 hours
    maxCacheSize: number; // 1GB in bytes
  };

  // Development and Debugging
  debug: {
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    saveIntermediateResults: boolean;
    enablePerformanceMetrics: boolean;
    mockModeEnabled: boolean; // For testing without real API calls
  };
}

// Default configuration values
const DEFAULT_CONFIG: GhostPipelineConfig = {
  aiProviders: {
    primary: {
      name: 'claude-code',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-sonnet-20240229',
      enabled: true
    },
    fallback: {
      name: 'moonshot-kimi',
      apiKey: process.env.OPENROUTER_API_KEY || 'your_openrouter_api_key_here',
      model: 'moonshotai/kimi-k2-0905',
      enabled: true
    },
    replicateKey: process.env.REPLICATE_API_TOKEN || 'your_replicate_api_token_here',
    falAiKey: process.env.FAL_KEY || 'your_fal_ai_key_here'
  },

  cv: {
    personScrub: {
      edgeErosion: {
        minErosion: 2,
        maxErosion: 3,
        iterations: 2
      },
      detection: {
        skinThreshold: 0.15,
        confidenceThreshold: 0.85,
        minRegionSize: 100
      },
      safety: {
        enforceStrictMode: true,
        blockHighRisk: true
      }
    },
    edgeErosion: {
      erosion: {
        kernelSize: 3,
        iterations: 2,
        strength: 1.0
      },
      dilation: {
        kernelSize: 3,
        iterations: 1,
        strength: 0.8
      },
      smoothing: {
        enabled: true,
        gaussianKernel: 5,
        sigma: 1.2
      },
      holeFilling: {
        enabled: true,
        minHoleSize: 10,
        maxHoleSize: 1000,
        connectivity: 8,
        fillColor: 255
      }
    },
    maskRefinement: {
      bilateralFilter: {
        d: 9,
        sigmaColor: 75,
        sigmaSpace: 75
      },
      morphological: {
        kernelSize: 5,
        iterations: 2,
        erosionStrength: 1.0,
        dilationStrength: 1.2
      },
      qualityThresholds: {
        minSymmetryScore: 0.8,
        maxEdgeRoughness: 0.3,
        minCoverage: 0.85
      }
    },
    segmentation: {
      samModel: 'sam_vit_h_4b8939',
      confidence: 0.85,
      iouThreshold: 0.5,
      minMaskArea: 100
    },
    backgroundRemoval: {
      model: 'bria-rmbg-v1.4',
      precision: 'high',
      postProcessing: true
    }
  },

  processing: {
    maxImageSize: 4096 * 4096,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    outputFormat: 'png',
    outputQuality: 0.95,
    timeout: 300000, // 5 minutes
    parallelProcessing: true,
    maxConcurrency: 3
  },

  qa: {
    enableQualityChecks: true,
    autoRetryOnFailure: true,
    maxRetries: 3,
    failureThresholds: {
      maxProcessingTime: 600000, // 10 minutes
      minOutputSize: 1024, // 1KB minimum
      maxErrorRate: 0.1 // 10% max error rate
    },
    metrics: {
      trackProcessingTimes: true,
      trackQualityScores: true,
      trackErrorRates: true,
      exportMetrics: true
    }
  },

  safety: {
    enablePersonScrub: true,
    skinThreshold: 0.15, // 15% max skin exposure
    blockHighRisk: true,
    auditTrail: true,
    encryptStorage: false
  },

  storage: {
    tempDir: '/tmp/ghost-pipeline',
    cleanupAfterMs: 3600000, // 1 hour
    enableCaching: true,
    cacheExpiryMs: 86400000, // 24 hours
    maxCacheSize: 1024 * 1024 * 1024 // 1GB
  },

  debug: {
    enableLogging: true,
    logLevel: 'info',
    saveIntermediateResults: false,
    enablePerformanceMetrics: true,
    mockModeEnabled: false
  }
};

/**
 * Configuration Manager for Ghost Mannequin Pipeline
 */
export class GhostConfigManager {
  private config: GhostPipelineConfig;
  private configOverrides: Partial<GhostPipelineConfig> = {};

  constructor(overrides: Partial<GhostPipelineConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, overrides);
    this.configOverrides = overrides;
    this.validateConfig();
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(
    base: GhostPipelineConfig, 
    overrides: Partial<GhostPipelineConfig>
  ): GhostPipelineConfig {
    const merged = JSON.parse(JSON.stringify(base)) as GhostPipelineConfig;

    function deepMerge(target: any, source: any): any {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    return deepMerge(merged, overrides);
  }

  /**
   * Validate configuration for required fields and constraints
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate AI provider keys
    if (!this.config.aiProviders.replicateKey) {
      errors.push('Replicate API key is required');
    }

    if (!this.config.aiProviders.falAiKey) {
      errors.push('FAL.AI API key is required');
    }

    // Validate thresholds
    if (this.config.safety.skinThreshold < 0 || this.config.safety.skinThreshold > 1) {
      errors.push('Skin threshold must be between 0 and 1');
    }

    if (this.config.cv.segmentation.confidence < 0 || this.config.cv.segmentation.confidence > 1) {
      errors.push('Segmentation confidence must be between 0 and 1');
    }

    if (this.config.processing.maxConcurrency < 1 || this.config.processing.maxConcurrency > 10) {
      errors.push('Max concurrency must be between 1 and 10');
    }

    // Validate timeouts
    if (this.config.processing.timeout < 30000) {
      errors.push('Processing timeout must be at least 30 seconds');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    console.log('[GhostConfig] ✅ Configuration validated successfully');
  }

  /**
   * Get complete configuration
   */
  getConfig(): GhostPipelineConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get specific configuration section
   */
  getSection<K extends keyof GhostPipelineConfig>(section: K): GhostPipelineConfig[K] {
    return JSON.parse(JSON.stringify(this.config[section]));
  }

  /**
   * Update configuration section
   */
  updateSection<K extends keyof GhostPipelineConfig>(
    section: K, 
    updates: Partial<GhostPipelineConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
    this.validateConfig();
    console.log(`[GhostConfig] Updated section: ${section}`);
  }

  /**
   * Get API key for a specific service
   */
  getApiKey(service: 'replicate' | 'falai' | 'primary' | 'fallback'): string {
    switch (service) {
      case 'replicate':
        return this.config.aiProviders.replicateKey;
      case 'falai':
        return this.config.aiProviders.falAiKey;
      case 'primary':
        return this.config.aiProviders.primary.apiKey;
      case 'fallback':
        return this.config.aiProviders.fallback.apiKey;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: string): boolean {
    const features = {
      'personScrub': this.config.safety.enablePersonScrub,
      'qualityChecks': this.config.qa.enableQualityChecks,
      'caching': this.config.storage.enableCaching,
      'logging': this.config.debug.enableLogging,
      'metrics': this.config.qa.metrics.trackProcessingTimes,
      'parallelProcessing': this.config.processing.parallelProcessing,
      'mockMode': this.config.debug.mockModeEnabled
    };

    return features[feature as keyof typeof features] ?? false;
  }

  /**
   * Get processing limits
   */
  getLimits() {
    return {
      maxImageSize: this.config.processing.maxImageSize,
      timeout: this.config.processing.timeout,
      maxRetries: this.config.qa.maxRetries,
      maxConcurrency: this.config.processing.maxConcurrency,
      skinThreshold: this.config.safety.skinThreshold
    };
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): string {
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Mask sensitive data
    safeConfig.aiProviders.primary.apiKey = '***masked***';
    safeConfig.aiProviders.fallback.apiKey = '***masked***';
    safeConfig.aiProviders.replicateKey = '***masked***';
    safeConfig.aiProviders.falAiKey = '***masked***';

    return JSON.stringify(safeConfig, null, 2);
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = this.mergeConfig(DEFAULT_CONFIG, this.configOverrides);
    this.validateConfig();
    console.log('[GhostConfig] Reset to default configuration');
  }
}

// Singleton instance
export const ghostConfig = new GhostConfigManager();

/**
 * Convenience functions for common configuration access
 */
export function getProcessingConfig() {
  return ghostConfig.getSection('processing');
}

export function getCVConfig() {
  return ghostConfig.getSection('cv');
}

export function getQAConfig() {
  return ghostConfig.getSection('qa');
}

export function getSafetyConfig() {
  return ghostConfig.getSection('safety');
}

export function getApiKey(service: 'replicate' | 'falai' | 'primary' | 'fallback'): string {
  return ghostConfig.getApiKey(service);
}

export function isFeatureEnabled(feature: string): boolean {
  return ghostConfig.isEnabled(feature);
}
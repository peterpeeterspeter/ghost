import { z } from 'zod';

// Base types
export type ImageInput = string; // base64 or signed URL

// Request types
export interface GhostRequest {
  flatlay: ImageInput;
  onModel?: ImageInput;
  options?: {
    preserveLabels?: boolean;
    outputSize?: '1024x1024' | '2048x2048';
    backgroundColor?: 'white' | 'transparent';
  };
}

// Analysis JSON Schema (for Gemini Pro structured output)
export const AnalysisJSONSchema = z.object({
  labels_found: z.array(z.string()).describe('All visible labels, tags, and text on the garment'),
  preserve_details: z.array(z.string()).describe('Critical details that must be preserved in the ghost mannequin (buttons, zippers, textures, etc.)'),
  construction_details: z.object({
    garment_type: z.enum(['shirt', 'dress', 'jacket', 'pants', 'skirt', 'top', 'sweater', 'hoodie', 'coat', 'other']),
    sleeve_type: z.enum(['long', 'short', 'sleeveless', 'three-quarter', 'cap', 'none']).optional(),
    collar_type: z.enum(['crew', 'v-neck', 'polo', 'button-down', 'turtleneck', 'off-shoulder', 'none']).optional(),
    fit_type: z.enum(['slim', 'regular', 'loose', 'oversized', 'fitted']),
    closure_type: z.enum(['buttons', 'zipper', 'pullover', 'wrap', 'lace-up', 'none']).optional(),
  }),
  special_handling: z.object({
    requires_structure: z.boolean().describe('Whether the garment needs internal structure to maintain shape'),
    transparent_areas: z.boolean().describe('Whether the garment has sheer or transparent sections'),
    complex_draping: z.boolean().describe('Whether the garment has complex draping that affects ghost mannequin rendering'),
    embellishments: z.boolean().describe('Whether the garment has sequins, embroidery, or other embellishments'),
  }),
});

export type AnalysisJSON = z.infer<typeof AnalysisJSONSchema>;

// Pipeline stage results
export interface BackgroundRemovalResult {
  cleanedImageUrl: string;
  processingTime: number;
}

export interface GarmentAnalysisResult {
  analysis: AnalysisJSON;
  processingTime: number;
}

export interface GhostMannequinResult {
  renderUrl: string;
  processingTime: number;
}

// Final response type
export interface GhostResult {
  sessionId: string;
  status: 'completed' | 'processing' | 'failed';
  analysisUrl?: string;
  renderUrl?: string;
  cleanedImageUrl?: string;
  metrics: {
    processingTime: string;
    stageTimings: {
      backgroundRemoval: number;
      analysis: number;
      rendering: number;
    };
  };
  error?: {
    message: string;
    code: string;
    stage: 'background_removal' | 'analysis' | 'rendering';
  };
}

// Storage types
export interface GhostJob {
  id: string;
  session_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  input_urls: {
    flatlay: string;
    onModel?: string;
  };
  output_urls: {
    cleaned?: string;
    analysis?: string;
    render?: string;
  };
  processing_time?: number;
  error_message?: string;
  error_stage?: string;
}

export interface GhostAnalysis {
  id: string;
  session_id: string;
  analysis_data: AnalysisJSON;
  created_at: string;
}

// FAL.AI specific types
export interface FalBriaRequest {
  image_url: string;
}

export interface FalBriaResponse {
  image: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

// Gemini specific types
export interface GeminiAnalysisRequest {
  imageData: string; // base64
  prompt: string;
}

export interface GeminiRenderRequest {
  prompt: string;
  images: Array<{
    data: string; // base64
    mimeType: string;
  }>;
  analysisJson: AnalysisJSON;
}

// Configuration types
export interface PipelineConfig {
  fal: {
    apiKey: string;
    endpoint: string;
  };
  gemini: {
    apiKey: string;
    projectId: string;
    location: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    bucketName: string;
  };
  processing: {
    maxFileSize: number;
    supportedFormats: string[];
    timeouts: {
      backgroundRemoval: number;
      analysis: number;
      rendering: number;
    };
  };
}

// Error types
export class GhostPipelineError extends Error {
  constructor(
    message: string,
    public code: string,
    public stage: 'background_removal' | 'analysis' | 'rendering',
    public cause?: Error
  ) {
    super(message);
    this.name = 'GhostPipelineError';
  }
}

// Utility types
export type ProcessingStage = 'background_removal' | 'analysis' | 'rendering';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Constants
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const DEFAULT_OUTPUT_SIZE = '2048x2048' as const;
export const DEFAULT_BACKGROUND_COLOR = 'white' as const;

// Prompts (can be moved to separate config file later)
export const ANALYSIS_PROMPT = `
Analyze this garment image and provide structured data about its construction and key details.
Focus on elements that would be important for creating a professional ghost mannequin effect.
Be precise about garment type, fit, construction details, and any special handling requirements.
Include all visible labels, tags, or text that should be preserved.
`;

export const GHOST_MANNEQUIN_PROMPT = `
Create a professional ghost mannequin effect for this garment. The result should show the garment as if worn by an invisible person, maintaining the natural shape and drape while removing any human model. 

Key requirements:
- Maintain garment structure and natural draping
- Preserve all details, textures, and colors accurately
- Create clean, professional product photography suitable for e-commerce
- Use white background unless specified otherwise
- Ensure high quality, sharp details suitable for commercial use

Based on the garment analysis provided, pay special attention to the construction details and special handling requirements.
`;

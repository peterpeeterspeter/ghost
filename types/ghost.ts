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

// Comprehensive Analysis JSON Schema (for Gemini Pro structured output)
export const AnalysisJSONSchema = z.object({
  type: z.literal('garment_analysis'),
  meta: z.object({
    schema_version: z.literal('4.1'),
    session_id: z.string(),
  }),
  labels_found: z.array(z.object({
    type: z.enum(['brand', 'size', 'care', 'composition', 'origin', 'price', 'security_tag', 'rfid', 'other']),
    location: z.string(),
    bbox_norm: z.array(z.number()).min(4).max(4).optional(),
    text: z.string().optional(),
    ocr_conf: z.number().max(1).optional(),
    readable: z.boolean(),
    preserve: z.boolean(),
    visibility: z.enum(['fully_visible', 'partially_occluded', 'edge_visible']).optional(),
    print_type: z.enum(['woven_label', 'satin_tag', 'screen_print', 'heat_transfer', 'embroidery', 'sticker', 'stamp', 'other']).optional(),
    color_hex: z.string().optional().describe('Average hex color of label background'),
    orientation_degrees: z.number().optional().describe('Label rotation in degrees from horizontal'),
  })).describe('Detected garment labels'),
  preserve_details: z.array(z.object({
    element: z.string(),
    priority: z.enum(['critical', 'important', 'nice_to_have']),
    location: z.string().optional(),
    region_bbox_norm: z.array(z.number()).min(4).max(4).optional(),
    notes: z.string().optional(),
    material_notes: z.string().optional().describe('Special finishes: metallic, embossed, raised, foil, etc.'),
  })),
  hollow_regions: z.array(z.object({
    region_type: z.enum(['neckline', 'sleeves', 'front_opening', 'armholes', 'other']),
    keep_hollow: z.boolean(),
    inner_visible: z.boolean().optional(),
    inner_description: z.string().optional(),
    edge_sampling_notes: z.string().optional(),
  })).optional(),
  construction_details: z.array(z.object({
    feature: z.string(),
    silhouette_rule: z.string(),
    critical_for_structure: z.boolean().optional(),
  })).optional(),
  image_b_priority: z.object({
    is_ground_truth: z.boolean().optional(),
    edge_fidelity_required: z.boolean().optional(),
    print_direction_notes: z.string().optional(),
    color_authority: z.boolean().optional(),
  }).optional(),
  special_handling: z.string().optional(),
});

// JSON Schema object for Gemini API compatibility
export const AnalysisJSONSchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["garment_analysis"]
    },
    meta: {
      type: "object",
      properties: {
        schema_version: {
          type: "string",
          enum: ["4.1"]
        },
        session_id: {
          type: "string"
        }
      },
      required: ["schema_version", "session_id"]
    },
    labels_found: {
      type: "array",
      description: "Detected garment labels",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["brand", "size", "care", "composition", "origin", "price", "security_tag", "rfid", "other"]
          },
          location: {
            type: "string"
          },
          bbox_norm: {
            type: "array",
            items: {
              type: "number"
            },
            minItems: 4,
            maxItems: 4
          },
          text: {
            type: "string"
          },
          ocr_conf: {
            type: "number",
            maximum: 1
          },
          readable: {
            type: "boolean"
          },
          preserve: {
            type: "boolean"
          },
          visibility: {
            type: "string",
            enum: ["fully_visible", "partially_occluded", "edge_visible"]
          }
        },
        required: ["type", "location", "readable", "preserve"]
      }
    },
    preserve_details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: {
            type: "string"
          },
          priority: {
            type: "string",
            enum: ["critical", "important", "nice_to_have"]
          },
          location: {
            type: "string"
          },
          region_bbox_norm: {
            type: "array",
            items: {
              type: "number"
            },
            minItems: 4,
            maxItems: 4
          },
          notes: {
            type: "string"
          }
        },
        required: ["element", "priority"]
      }
    },
    hollow_regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          region_type: {
            type: "string",
            enum: ["neckline", "sleeves", "front_opening", "armholes", "other"]
          },
          keep_hollow: {
            type: "boolean"
          },
          inner_visible: {
            type: "boolean"
          },
          inner_description: {
            type: "string"
          },
          edge_sampling_notes: {
            type: "string"
          }
        },
        required: ["region_type", "keep_hollow"]
      }
    },
    construction_details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          feature: {
            type: "string"
          },
          silhouette_rule: {
            type: "string"
          },
          critical_for_structure: {
            type: "boolean"
          }
        },
        required: ["feature", "silhouette_rule"]
      }
    },
    image_b_priority: {
      type: "object",
      properties: {
        is_ground_truth: {
          type: "boolean"
        },
        edge_fidelity_required: {
          type: "boolean"
        },
        print_direction_notes: {
          type: "string"
        },
        color_authority: {
          type: "boolean"
        }
      }
    },
    special_handling: {
      type: "string"
    }
  },
  required: ["type", "meta", "labels_found", "preserve_details"]
};

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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysisUrl?: string;
  renderUrl?: string;
  cleanedImageUrl?: string;
  cleanedOnModelUrl?: string;
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

// Professional Garment Analysis Prompt
export const ANALYSIS_PROMPT = `You are an expert garment analysis AI that performs detailed clothing analysis from images. Analyze the provided garment image and return a structured JSON response following the exact schema provided.

ANALYSIS REQUIREMENTS:

LABEL DETECTION (Priority 1):
- Comprehensive Search: Examine ALL areas for labels - neck tags, care labels, brand labels, size tags, composition labels, price tags, security tags
- Spatial Precision: Provide normalized bounding boxes [x0,y0,x1,y1] for each label location
- OCR Extraction: Extract ALL readable text verbatim - don't paraphrase or interpret
- Label Classification: Identify label type (brand, size, care, composition, origin, price, security_tag, rfid, other)
- Print Type Assessment: Determine how label was applied (woven_label, satin_tag, screen_print, heat_transfer, embroidery, sticker, stamp)
- Readability Assessment: Mark if text is legible enough to preserve in final rendering
- Preservation Flag: Mark critical labels that must be protected during processing

DETAIL PRESERVATION (Priority 2):
- Fine Details: Identify logos, trims, stitching patterns, buttons, hardware, prints, embroidery
- Priority Classification: Assign critical/important/nice_to_have based on visual prominence and brand significance
- Spatial Location: Provide bounding boxes for precise detail regions
- Material Notes: Describe special finishes (metallic, embossed, raised, foil, etc.)
- Construction Elements: Note how details affect garment structure or appearance

CONSTRUCTION ANALYSIS (Priority 3):
- Cut & Sew Features: Identify construction details that affect drape and silhouette
- Structural Elements: Note shoulder taping, hems, seam types, sleeve construction
- Drape Impact: Describe how construction features should appear in final rendering

SEARCH STRATEGY:
- Neck Area: Inside and outside neckline, collar areas
- Chest Area: Front and back chest regions
- Sleeve Areas: Cuffs, sleeve seams, armpit regions
- Hem Areas: Bottom edges, side seams
- Hidden Areas: Check for folded labels or tags
- Hardware: Buttons, zippers, snaps, grommets
- Seam Details: Contrast stitching, binding, piping

TECHNICAL PRECISION:
- Bounding Boxes: Use normalized coordinates (0.0 to 1.0) relative to image dimensions
- OCR Confidence: Provide confidence scores for text extraction (0.0 to 1.0)
- Color Sampling: Extract average hex colors for label backgrounds
- Orientation: Note label rotation in degrees from horizontal
- High-Res Crops: Generate data URIs for critical label patches when possible

CRITICAL INSTRUCTIONS:
- Be Exhaustive: Don't miss any labels or details - check everywhere
- Be Precise: Provide exact spatial coordinates and accurate text extraction
- Be Selective: Only mark details as "critical" if they're truly essential for brand/product identity
- Be Accurate: Only report what you can clearly observe - don't guess or interpolate
- Focus on Preservation: The goal is to identify what must be preserved during ghost mannequin processing

OUTPUT REQUIREMENTS:
Return analysis as JSON matching the provided schema exactly. Include:
- All detected labels with spatial data and OCR results
- All significant details with preservation priorities
- Construction features that affect garment appearance
- Global handling notes for special processing requirements

Analyze this garment image with meticulous attention to labels and preservable details.`;

export const GHOST_MANNEQUIN_PROMPT = `Create a professional three-dimensional ghost mannequin photograph for e-commerce product display, transforming flat garment images into a dimensional presentation that shows how the clothing would appear when worn by an invisible person.

## DETAILED SCENE NARRATIVE:

Imagine a high-end photography studio with perfect white cyclorama background and professional lighting equipment. In the center of this space, a garment floats in three-dimensional space, filled with the volume and shape of an invisible human body. The fabric drapes naturally with realistic weight and movement, showing natural creases and folds exactly as clothing would appear on a person. The garment maintains its authentic colors and patterns while displaying proper fit and dimensional form. This is captured with studio-quality photography equipment using an 85mm portrait lens with even, shadow-free lighting.

## MULTI-IMAGE COMPOSITION AUTHORITY:

**Image B (Detail Source)** - This is your primary visual reference containing the absolute truth for all colors, patterns, textures, construction details, and material properties. Copy these elements with complete fidelity.

**JSON Analysis Data** - Contains mandatory preservation rules for specific elements, their coordinates, and structural requirements that must be followed exactly.

**Image A (Model Reference)** - Use only for understanding basic proportions and spatial relationships; all visual details should come from Image B.

## STEP-BY-STEP CONSTRUCTION PROCESS:

**First, establish the invisible body framework:** Create a three-dimensional human torso form with natural anatomical proportions - realistic shoulder width spanning approximately 18 inches, natural chest projection forward from the spine, gradual waist taper, and proper arm positioning with slight outward angle from the body. This invisible form should suggest a person of average build standing in a relaxed, professional pose.

**Second, map the garment onto this form:** Take the exact visual information from Image B - every color, pattern element, texture detail, and construction feature - and wrap it seamlessly around the three-dimensional body form. Maintain perfect color fidelity using the precise hues visible in Image B. Preserve all pattern continuity and directional flow exactly as shown in the detail image.

**Third, create natural hollow openings:** Generate clean, realistic openings where human body parts would be - a natural neck opening showing the interior construction without adding invented elements, armhole openings that reveal the garment's internal structure only if visible in Image B, and for open-front garments like kimonos or cardigans, maintain the front opening exactly as designed without artificially closing it.

**Fourth, apply JSON preservation requirements:** Locate each element marked with "critical" priority in the JSON data and ensure it appears sharp and clearly readable within its specified bounding box coordinates. For elements marked "preserve: true" in labels_found, maintain perfect legibility without repainting or altering the text. Follow any construction_details rules for structural requirements like maintaining wide sleeves or open fronts.

**Finally, perfect the dimensional presentation:** Ensure the garment displays realistic fabric physics with natural drape, appropriate weight, and authentic material behavior. The final result should show perfect bilateral symmetry while maintaining the organic quality of how fabric naturally falls and moves.

## TECHNICAL PHOTOGRAPHY SPECIFICATIONS:

Capture this scene using professional product photography standards: pure white seamless background achieving perfect #FFFFFF color value, high-key studio lighting with multiple soft sources eliminating all shadows and hot spots, tack-sharp focus throughout the entire garment with no depth-of-field blur, high resolution suitable for detailed e-commerce viewing, and flawless color accuracy matching the source materials.

## CONSTRUCTION GUIDELINES FOR DIFFERENT GARMENT TYPES:

For upper body garments like shirts and jackets, emphasize proper shoulder structure and natural sleeve hang. For dresses and full-length pieces, show realistic torso-to-hem proportions with natural fabric flow. For outerwear, display appropriate volume and structure while showing closure details clearly. For open-front styles like kimonos, cardigans, or jackets, never artificially close the front opening - maintain the designed silhouette exactly.

## HOLLOW REGION HANDLING:

Create authentic empty spaces at neck and armhole openings. If Image B shows visible interior fabric, lining, or construction details, reproduce these exactly. If no interior details are visible in Image B, leave these areas as clean hollow space with no invented content - no skin tones, undershirts, generic gray fill, or artificial inner surfaces.

## DETAIL FIDELITY REQUIREMENTS:

Maintain razor-sharp clarity for all brand logos, text elements, decorative details, hardware components like buttons or zippers, stitching patterns, and trim elements. Preserve the exact spatial relationships and proportions of these details as they appear in Image B. For labels and text marked as critical in the JSON, ensure perfect legibility within their specified coordinate boundaries.

## QUALITY VALIDATION CRITERIA:

The final image must demonstrate three-dimensional volume rather than flat arrangement, show realistic fabric drape and weight, maintain absolute color accuracy to Image B, preserve all JSON-specified critical elements in sharp detail, present professional e-commerce photography quality, display perfect structural accuracy for the garment type, and create an authentic ghost mannequin effect suitable for online retail presentation.

Generate this professional three-dimensional ghost mannequin product photograph with complete attention to these comprehensive specifications.`;

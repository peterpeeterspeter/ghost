import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisJSON, EnrichmentJSON } from '@/types/ghost';

// -----------------------------
// Null/Shape-Tolerant Schemas with Smart Defaults
// -----------------------------

/** hex like #AABBCC */
const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** accept undefined/null and fill later */
const HexLoose = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  Hex.optional()
);

export const PaletteSchemaLoose = z.object({
  dominant_hex: HexLoose,             // may be missing → we will fill
  accent_hex:   HexLoose,
  trim_hex:     HexLoose,
  pattern_hexes: z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(Hex).default([])),
  region_hints: z.preprocess(
    (v) => normalizeRegionHints(v),
    z.record(z.array(z.string()))
  ).optional(),
});

/** accept object OR array OR null and coerce to { must_not: [...] } */
const SafetySchemaLoose = z.preprocess(
  (v: any) => {
    if (v === null || v === undefined) return { must_not: [] };
    if (Array.isArray(v)) return { must_not: v };
    if (typeof v === 'object' && v !== null) {
      return { must_not: Array.isArray((v as any).must_not) ? (v as any).must_not : [] };
    }
    return { must_not: [] };
  },
  z.object({ must_not: z.array(z.string()).default([]) })
);

export const FactsV3SchemaLoose = z.object({
  // === CORE IDENTIFICATION ===
  category_generic: z.enum([
    "top","bottom","dress","outerwear","knitwear","underwear","accessory","unknown"
  ]).catch("unknown"),
  silhouette: z.string().default("generic_silhouette"),
  required_components: z.array(z.string()).default([]),
  forbidden_components: z.array(z.string()).default([]),
  
  // === CRITICAL LABEL INFORMATION (from AnalysisJSON) ===
  labels_found: z.array(z.object({
    type: z.enum(['brand', 'size', 'care', 'composition', 'origin', 'price', 'security_tag', 'rfid', 'other']),
    location: z.string(),
    text: z.string().optional(),
    readable: z.boolean().default(true),
    preserve: z.boolean().default(true),
    visibility: z.enum(['fully_visible', 'partially_occluded', 'edge_visible']).optional(),
    color_hex: z.string().optional(),
  })).default([]),
  
  // === CRITICAL PRESERVATION DETAILS (from AnalysisJSON) ===
  preserve_details: z.array(z.object({
    element: z.string(),
    priority: z.enum(['critical', 'important', 'nice_to_have']).default('important'),
    location: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
  
  // === HOLLOW REGIONS (from AnalysisJSON) - CRITICAL FOR GHOST MANNEQUIN ===
  hollow_regions: z.array(z.object({
    region_type: z.enum(['neckline', 'sleeves', 'front_opening', 'armholes', 'other']),
    keep_hollow: z.boolean().default(true),
    inner_visible: z.boolean().default(false),
    inner_description: z.string().optional(),
  })).default([]),
  
  // === CONSTRUCTION DETAILS (from AnalysisJSON) ===
  construction_details: z.array(z.object({
    feature: z.string(),
    silhouette_rule: z.string(),
    critical_for_structure: z.boolean().default(false),
  })).default([]),
  
  // === COLOR & VISUAL PROPERTIES ===
  palette: PaletteSchemaLoose,
  pattern: z.string().default("unknown"),
  print_scale: z.string().default("unknown"),
  
  // === MATERIAL PROPERTIES ===
  material: z.string().default("unspecified_material"),
  weave_knit: z.enum(["woven","knit","nonwoven","unknown"]).catch("unknown"),
  drape_stiffness: z.number().min(0).max(1).default(0.4),
  transparency: z.enum(["opaque","semi_sheer","sheer"]).catch("opaque"),
  surface_sheen: z.enum(["matte","subtle_sheen","glossy"]).catch("matte"),
  edge_finish: z.string().default("unknown"),
  
  // === ENRICHMENT DATA INTEGRATION ===
  color_precision: z.object({
    primary_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    color_temperature: z.enum(['warm', 'cool', 'neutral']).optional(),
    saturation_level: z.enum(['muted', 'moderate', 'vibrant']).optional(),
  }).optional(),
  
  fabric_behavior: z.object({
    drape_quality: z.enum(['crisp', 'flowing', 'structured', 'fluid', 'stiff']).optional(),
    surface_sheen_detailed: z.enum(['matte', 'subtle_sheen', 'glossy', 'metallic']).optional(),
    texture_depth: z.enum(['flat', 'subtle_texture', 'pronounced_texture', 'heavily_textured']).optional(),
    transparency_level: z.enum(['opaque', 'semi_opaque', 'translucent', 'sheer']).optional(),
  }).optional(),
  
  construction_precision: z.object({
    seam_visibility: z.enum(['hidden', 'subtle', 'visible', 'decorative']).optional(),
    edge_finishing: z.enum(['raw', 'serged', 'bound', 'rolled', 'pinked']).optional(),
    stitching_contrast: z.boolean().optional(),
    hardware_finish: z.enum(['none', 'matte_metal', 'polished_metal', 'plastic', 'fabric_covered']).optional(),
  }).optional(),
  
  // === RENDERING SPECIFICATIONS ===
  view: z.string().default("front"),
  framing_margin_pct: z.number().min(2).max(12).default(6),
  shadow_style: z.enum(["soft","medium","hard"]).catch("soft"),
  lighting_preference: z.enum(['soft_diffused', 'directional', 'high_key', 'dramatic']).optional(),
  shadow_behavior: z.enum(['minimal_shadows', 'soft_shadows', 'defined_shadows', 'dramatic_shadows']).optional(),
  
  // === QUALITY & SAFETY ===
  qa_targets: z.object({
    deltaE_max: z.number().default(3),
    edge_halo_max_pct: z.number().default(1),
    symmetry_tolerance_pct: z.number().default(3),
    min_resolution_px: z.number().default(2000),
  }).default({}),
  safety: SafetySchemaLoose.default({ must_not: [] }),
  
  // === VISUAL REFERENCES (File API URIs - Token Efficient) ===
  visual_references: z.object({
    flatlay: z.object({
      file_uri: z.string(), // Google Files API URI
      mime_type: z.enum(['image/jpeg', 'image/png']),
      role: z.literal('ground_truth_source'),
      instructions: z.string().default('Absolute truth for colors, patterns, textures, details'),
    }),
    on_model: z.object({
      file_uri: z.string(), // Google Files API URI
      mime_type: z.enum(['image/jpeg', 'image/png']),
      role: z.literal('proportions_only'),
      instructions: z.string().default('Use ONLY for fit/shape - ignore colors/materials'),
    }).optional(),
    // Reserve third slot for future interior detail support
    interior_detail: z.object({
      file_uri: z.string(), // Google Files API URI
      mime_type: z.enum(['image/jpeg', 'image/png']),
      role: z.literal('interior_construction_reference'),
      instructions: z.string().default('Reference for hollow regions, lining, seam placement'),
      focus_areas: z.array(z.string()).optional(), // e.g., ['neckline_interior', 'sleeve_openings']
    }).optional(),
  }).optional(),
  
  // === METADATA ===
  notes: z.string().optional(),
  structural_asymmetry: z.object({
    expected: z.boolean().default(false),
    regions: z.array(z.string()).default([]),
  }).optional(),
  label_visibility: z.enum(["required","optional"]).default("required"),
  continuity_rules: z.union([
    z.record(z.string()),  // Original format: { "field_name": "string_value" }
    z.record(z.any())      // Flexible format: { "field_name": any_value }
  ]).optional(),
});

export const ControlBlockSchemaLoose = z.object({
  category_generic: z.string().default("unknown"),
  silhouette: z.string().default("generic_silhouette"),
  required_components: z.array(z.string()).default([]),
  forbidden_components: z.array(z.string()).default([]),
  palette: PaletteSchemaLoose,
  material: z.string().default("unspecified_material"),
  drape_stiffness: z.number().default(0.4),
  edge_finish: z.string().default("unknown"),
  view: z.string().default("front"),
  framing_margin_pct: z.number().default(6),
  shadow_style: z.string().default("soft"),
  safety: SafetySchemaLoose.default({ must_not: [] }),
  label_visibility: z.enum(["required","optional"]).default("required"),
  continuity_rules: z.union([
    z.record(z.string()),  // Original format: { "field_name": "string_value" }
    z.record(z.any())      // Flexible format: { "field_name": any_value }
  ]).optional(),
  structural_asymmetry: z.object({
    expected: z.boolean().default(false),
    regions: z.array(z.string()).default([]),
  }).optional(),
  weave_knit: z.enum(["woven","knit","nonwoven","unknown"]).default("unknown"),
  transparency: z.enum(["opaque","semi_sheer","sheer"]).default("opaque"),
  surface_sheen: z.enum(["matte","subtle_sheen","glossy"]).default("matte"),
});

export const ConflictSchema = z.object({
  field: z.string(),
  json_a: z.any(),
  json_b: z.any(),
  resolution: z.any(),
  source_of_truth: z.enum(["visual", "json_a", "json_b"]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const QAReportSchema = z.object({
  overall_quality_score: z.preprocess(
    (v) => typeof v === 'string' ? parseFloat(v) : v,
    z.number().min(0).max(1).default(0)
  ),
  deltas: z.array(
    z.object({
      metric: z.string(),
      current_value: z.preprocess(
        (v) => typeof v === 'string' ? parseFloat(v) : v,
        z.number()
      ),
      target_value: z.preprocess(
        (v) => typeof v === 'string' ? parseFloat(v) : v,
        z.number()
      ),
      correction_prompt: z.string(),
    })
  ).default([]),
  passed: z.preprocess(
    (v) => typeof v === 'string' ? v.toLowerCase() === 'true' : v,
    z.boolean().default(false)
  ),
});

export const ConsolidationOutputSchemaLoose = z.object({
  conflicts_found: z.array(ConflictSchema).default([]),
  facts_v3: FactsV3SchemaLoose,
  control_block: ControlBlockSchemaLoose,
  processing_time: z.number().optional(),
  session_id: z.string().optional(),
});

// -----------------------------
// Types
// -----------------------------

export type PaletteType = z.infer<typeof PaletteSchemaLoose>;
export type FactsV3 = z.infer<typeof FactsV3SchemaLoose>;
export type ControlBlock = z.infer<typeof ControlBlockSchemaLoose>;
export type ConflictDetection = z.infer<typeof ConflictSchema>;
export type QAReport = z.infer<typeof QAReportSchema>;
export type ConsolidationOutput = z.infer<typeof ConsolidationOutputSchemaLoose>;

// -----------------------------
// Normalization Functions
// -----------------------------

function coerceHex(hex?: string | null, ...fallbacks: (string | null | undefined)[]): string {
  // Try the primary hex value
  if (hex && typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  // Try each fallback in order
  for (const fallback of fallbacks) {
    if (fallback && typeof fallback === 'string' && /^#[0-9A-Fa-f]{6}$/.test(fallback)) {
      return fallback;
    }
  }
  // Last resort neutral gray
  return "#888888";
}

function normalizePalette(p: FactsV3["palette"]): Required<FactsV3["palette"]> {
  // Start with dominant color, fallback to neutral gray
  const dominant = coerceHex(p.dominant_hex, "#888888");
  // Accent falls back to dominant
  const accent = coerceHex(p.accent_hex, dominant);
  // Trim falls back to accent, then dominant 
  const trim = coerceHex(p.trim_hex, accent, dominant);
  // Filter valid pattern colors
  const pattern = (p.pattern_hexes ?? []).filter((h) => h && typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h));

  return {
    dominant_hex: dominant,
    accent_hex: accent,
    trim_hex: trim,
    pattern_hexes: pattern,
    region_hints: p.region_hints ?? {},
  };
}

function normalizeSafety(s: any): { must_not: string[] } {
  if (Array.isArray(s)) return { must_not: s };
  if (s && Array.isArray(s.must_not)) return { must_not: s.must_not };
  return { must_not: [] };
}

function normalizeRegionHints(hints: any): Record<string, string[]> {
  if (!hints || typeof hints !== 'object') return {};
  
  const normalized: Record<string, string[]> = {};
  
  for (const [key, value] of Object.entries(hints)) {
    if (Array.isArray(value)) {
      // Already an array of strings
      normalized[key] = value.filter(v => typeof v === 'string');
    } else if (typeof value === 'string') {
      // Convert comma-separated string to array
      normalized[key] = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else {
      // Skip invalid values
      continue;
    }
  }
  
  return normalized;
}

export function normalizeFacts(f: FactsV3): FactsV3 {
  return {
    ...f,
    // Core normalization
    palette: normalizePalette(f.palette),
    safety: normalizeSafety(f.safety),
    required_components: f.required_components ?? [],
    forbidden_components: f.forbidden_components ?? [],
    
    // Critical structural data normalization
    labels_found: f.labels_found ?? [],
    preserve_details: f.preserve_details ?? [],
    hollow_regions: f.hollow_regions ?? [],
    construction_details: f.construction_details ?? [],
    
    // Enhanced normalization
    label_visibility: f.label_visibility ?? "required",
    qa_targets: {
      deltaE_max: f.qa_targets?.deltaE_max ?? 3,
      edge_halo_max_pct: f.qa_targets?.edge_halo_max_pct ?? 1,
      symmetry_tolerance_pct: f.qa_targets?.symmetry_tolerance_pct ?? 3,
      min_resolution_px: f.qa_targets?.min_resolution_px ?? 2000,
    },
    structural_asymmetry: f.structural_asymmetry ?? { expected: false, regions: [] },
    
    // Optional enrichment data (preserve if exists)
    color_precision: f.color_precision,
    fabric_behavior: f.fabric_behavior,
    construction_precision: f.construction_precision,
    lighting_preference: f.lighting_preference,
    shadow_behavior: f.shadow_behavior,
  };
}

export function normalizeControlBlock(c: ControlBlock, factsFallback: FactsV3): ControlBlock {
  const palette = normalizePalette(c.palette ?? factsFallback.palette);
  const safety  = normalizeSafety(c.safety ?? factsFallback.safety);

  return {
    category_generic: c.category_generic || factsFallback.category_generic,
    silhouette: c.silhouette || factsFallback.silhouette,
    required_components: c.required_components ?? factsFallback.required_components ?? [],
    forbidden_components: c.forbidden_components ?? factsFallback.forbidden_components ?? [],
    palette,
    material: c.material || factsFallback.material,
    drape_stiffness: typeof c.drape_stiffness === "number" ? c.drape_stiffness : factsFallback.drape_stiffness,
    edge_finish: c.edge_finish || factsFallback.edge_finish,
    view: c.view || factsFallback.view,
    framing_margin_pct: c.framing_margin_pct ?? factsFallback.framing_margin_pct,
    shadow_style: c.shadow_style || factsFallback.shadow_style,
    safety,
    label_visibility: c.label_visibility ?? factsFallback.label_visibility ?? "required",
    continuity_rules: c.continuity_rules ?? factsFallback.continuity_rules,
    structural_asymmetry: c.structural_asymmetry ?? factsFallback.structural_asymmetry,
    weave_knit: c.weave_knit || factsFallback.weave_knit || "unknown",
    transparency: c.transparency || factsFallback.transparency || "opaque",
    surface_sheen: c.surface_sheen || factsFallback.surface_sheen || "matte",
  };
}

// -----------------------------
// Utility: Stable Hash (seed)
// -----------------------------

export function stableHash(input: string): number {
  return (
    Array.from(input).reduce(
      (hash, char) => (hash << 5) - hash + char.charCodeAt(0),
      0
    ) >>> 0
  );
}

// -----------------------------
// Gemini Integration
// -----------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function callGeminiProConsolidator(payload: {
  jsonA: AnalysisJSON;
  jsonB: EnrichmentJSON;
  refs: { cleanedImageUrl: string; onModelUrl?: string };
  sessionId: string;
  prompt: string;
}): Promise<{ text: string }> {
  console.log('Starting JSON consolidation with Gemini Pro...');
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.0,
      topP: 0.2,
    }
  });

  try {
    const result = await model.generateContent([
      {
        text: payload.prompt,
      },
      {
        text: `JSON-A (Structural Analysis):\n${JSON.stringify(payload.jsonA, null, 2)}\n\nJSON-B (Enrichment Analysis):\n${JSON.stringify(payload.jsonB, null, 2)}\n\nSession ID: ${payload.sessionId}`,
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return { text: jsonMatch[1] };
    }
    
    // Fallback: try to find any JSON-like structure
    const fallbackMatch = text.match(/\{[\s\S]*\}/);
    if (fallbackMatch) {
      return { text: fallbackMatch[0] };
    }
    
    // Last resort: return raw text and let caller handle it
    console.warn('No JSON structure found in response, returning raw text');
    return { text };

  } catch (error) {
    console.error('Consolidation API call failed:', error);
    throw new Error('JSON consolidation API failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function callGeminiProQA(payload: {
  imageUrl: string;
  facts: FactsV3;
  sessionId: string;
}): Promise<QAReport> {
  console.log('Starting QA analysis with Gemini Pro...');
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.0,
      topP: 0.3,
    }
  });

  const prompt = buildQAPrompt();

  try {
    // Prepare image data for analysis - handle both data URLs and HTTP URLs
    let imageData: string;
    let mimeType: string = 'image/png'; // default
    
    if (payload.imageUrl.startsWith('data:')) {
      // Handle data URL (base64)
      const parts = payload.imageUrl.split(',');
      if (parts.length === 2) {
        imageData = parts[1];
        // Extract mime type from data URL header
        const headerMatch = parts[0].match(/data:([^;]+)/);
        if (headerMatch) {
          mimeType = headerMatch[1];
        }
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      // Handle HTTP URL - fetch and convert to base64
      console.log('Fetching image from URL for QA analysis:', payload.imageUrl);
      const response = await fetch(payload.imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image: ' + response.statusText);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      imageData = Buffer.from(arrayBuffer).toString('base64');
      
      // Determine mime type from response or URL extension
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType;
      } else if (payload.imageUrl.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (payload.imageUrl.toLowerCase().includes('.jpg') || payload.imageUrl.toLowerCase().includes('.jpeg')) {
        mimeType = 'image/jpeg';
      }
    }
    
    console.log('QA analysis with ' + mimeType + ' image data (' + Math.round(imageData.length / 1024) + 'KB)');
    
    const result = await model.generateContent([
      {
        text: prompt,
      },
      {
        text: 'Facts_v3 Reference:\n' + JSON.stringify(payload.facts, null, 2) + '\n\nSession ID: ' + payload.sessionId,
      },
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON found in QA response');
    }

    const qaData = JSON.parse(jsonMatch[1]);
    return QAReportSchema.parse(qaData);

  } catch (error) {
    console.error('QA analysis failed:', error);
    throw new Error('QA analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// -----------------------------
// Core Logic
// -----------------------------

export async function consolidateAnalyses(
  jsonA: AnalysisJSON,
  jsonB: EnrichmentJSON,
  refs: { cleanedImageUrl: string; onModelUrl?: string },
  sessionId: string
): Promise<ConsolidationOutput> {
  console.log('[' + sessionId + '] Starting analysis consolidation...');
  
  const prompt = 'You are an expert consolidation system for garment analysis. Merge two JSON analyses into a unified FactsV3 structure and ControlBlock for rendering. Structural analysis (JSON-A): ' + JSON.stringify(jsonA, null, 2) + ' Enrichment analysis (JSON-B): ' + JSON.stringify(jsonB, null, 2);

  try {
    const response = await callGeminiProConsolidator({ 
      jsonA, 
      jsonB, 
      refs, 
      sessionId,
      prompt
    });
    
    // Parse and validate with graceful fallbacks
    const parsed = JSON.parse(response.text || '{}');
    
    // Use loose schemas with safeParse for graceful error handling
    const factsResult = FactsV3SchemaLoose.safeParse(parsed.facts_v3 || {});
    const controlResult = ControlBlockSchemaLoose.safeParse(parsed.control_block || {});
    const conflictsResult = z.array(ConflictSchema).safeParse(parsed.conflicts_found || []);
    
    let facts_v3: FactsV3;
    let control_block: ControlBlock;
    
    if (factsResult.success) {
      facts_v3 = normalizeFacts(factsResult.data);
    } else {
      console.warn('Facts schema parse failed, attempting intelligent recovery:', factsResult.error);
      
      // Try to preserve valid fields from the raw parsed data
      const rawFacts = parsed.facts_v3 || {};
      const recoveredFacts: any = {};
      
      // Try to preserve each field individually, with fallbacks
      recoveredFacts.category_generic = rawFacts.category_generic || "unknown";
      recoveredFacts.silhouette = rawFacts.silhouette || "generic_silhouette";
      recoveredFacts.required_components = Array.isArray(rawFacts.required_components) ? rawFacts.required_components : [];
      recoveredFacts.forbidden_components = Array.isArray(rawFacts.forbidden_components) ? rawFacts.forbidden_components : [];
      
      // Try to preserve palette data
      const rawPalette = rawFacts.palette || {};
      recoveredFacts.palette = {
        dominant_hex: (typeof rawPalette.dominant_hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(rawPalette.dominant_hex)) 
          ? rawPalette.dominant_hex : undefined,
        accent_hex: (typeof rawPalette.accent_hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(rawPalette.accent_hex)) 
          ? rawPalette.accent_hex : undefined,
        trim_hex: (typeof rawPalette.trim_hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(rawPalette.trim_hex)) 
          ? rawPalette.trim_hex : undefined,
        pattern_hexes: Array.isArray(rawPalette.pattern_hexes) 
          ? rawPalette.pattern_hexes.filter((h: any) => typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h)) 
          : [],
        region_hints: (typeof rawPalette.region_hints === 'object' && rawPalette.region_hints) 
          ? normalizeRegionHints(rawPalette.region_hints) : {}
      };
      
      // Try to preserve other fields
      recoveredFacts.material = rawFacts.material || "unspecified_material";
      recoveredFacts.weave_knit = rawFacts.weave_knit || "unknown";
      recoveredFacts.drape_stiffness = (typeof rawFacts.drape_stiffness === 'number') ? rawFacts.drape_stiffness : 0.4;
      recoveredFacts.transparency = rawFacts.transparency || "opaque";
      recoveredFacts.surface_sheen = rawFacts.surface_sheen || "matte";
      recoveredFacts.pattern = rawFacts.pattern || "unknown";
      recoveredFacts.print_scale = rawFacts.print_scale || "unknown";
      recoveredFacts.edge_finish = rawFacts.edge_finish || "unknown";
      recoveredFacts.view = rawFacts.view || "front";
      recoveredFacts.framing_margin_pct = (typeof rawFacts.framing_margin_pct === 'number') ? rawFacts.framing_margin_pct : 6;
      recoveredFacts.shadow_style = rawFacts.shadow_style || "soft";
      
      // Try to preserve qa_targets
      const rawQA = rawFacts.qa_targets || {};
      recoveredFacts.qa_targets = {
        deltaE_max: (typeof rawQA.deltaE_max === 'number') ? rawQA.deltaE_max : 3,
        edge_halo_max_pct: (typeof rawQA.edge_halo_max_pct === 'number') ? rawQA.edge_halo_max_pct : 1,
        symmetry_tolerance_pct: (typeof rawQA.symmetry_tolerance_pct === 'number') ? rawQA.symmetry_tolerance_pct : 3,
        min_resolution_px: (typeof rawQA.min_resolution_px === 'number') ? rawQA.min_resolution_px : 2000,
      };
      
      // Handle safety field (this was one of the problem fields)
      recoveredFacts.safety = normalizeSafety(rawFacts.safety);
      
      recoveredFacts.label_visibility = rawFacts.label_visibility || "required";
      recoveredFacts.structural_asymmetry = rawFacts.structural_asymmetry || { expected: false, regions: [] };
      recoveredFacts.continuity_rules = rawFacts.continuity_rules || {};
      recoveredFacts.notes = rawFacts.notes;
      
      // Try to preserve enrichment data
      recoveredFacts.labels_found = Array.isArray(rawFacts.labels_found) ? rawFacts.labels_found : [];
      recoveredFacts.preserve_details = Array.isArray(rawFacts.preserve_details) ? rawFacts.preserve_details : [];
      recoveredFacts.hollow_regions = Array.isArray(rawFacts.hollow_regions) ? rawFacts.hollow_regions : [];
      recoveredFacts.construction_details = Array.isArray(rawFacts.construction_details) ? rawFacts.construction_details : [];
      
      // Handle enrichment objects
      if (rawFacts.color_precision && typeof rawFacts.color_precision === 'object') {
        recoveredFacts.color_precision = rawFacts.color_precision;
      }
      if (rawFacts.fabric_behavior && typeof rawFacts.fabric_behavior === 'object') {
        recoveredFacts.fabric_behavior = rawFacts.fabric_behavior;
      }
      if (rawFacts.construction_precision && typeof rawFacts.construction_precision === 'object') {
        recoveredFacts.construction_precision = rawFacts.construction_precision;
      }
      
      // Handle rendering preferences
      if (rawFacts.lighting_preference) {
        recoveredFacts.lighting_preference = rawFacts.lighting_preference;
      }
      if (rawFacts.shadow_behavior) {
        recoveredFacts.shadow_behavior = rawFacts.shadow_behavior;
      }
      
      // Handle visual_references (optional, will be populated during rendering)
      if (rawFacts.visual_references && typeof rawFacts.visual_references === 'object') {
        recoveredFacts.visual_references = rawFacts.visual_references;
      }
      
      console.log('Recovered fields from raw data:', Object.keys(recoveredFacts).filter(k => rawFacts[k] !== undefined));
      
      facts_v3 = normalizeFacts(recoveredFacts);
    }
    
    if (controlResult.success) {
      control_block = normalizeControlBlock(controlResult.data, facts_v3);
    } else {
      console.warn('Control block schema parse failed, deriving from facts:', controlResult.error);
      // Derive control block from facts_v3
      control_block = normalizeControlBlock({
        category_generic: undefined,
        silhouette: undefined,
        required_components: undefined,
        forbidden_components: undefined,
        palette: undefined,
        material: undefined,
        drape_stiffness: undefined,
        edge_finish: undefined,
        view: undefined,
        framing_margin_pct: undefined,
        shadow_style: undefined,
        safety: undefined,
        label_visibility: undefined,
        continuity_rules: undefined,
        structural_asymmetry: undefined,
        weave_knit: undefined,
        transparency: undefined,
        surface_sheen: undefined,
      } as any, facts_v3);
    }
    
    const conflicts_found = conflictsResult.success ? conflictsResult.data : [];
    
    return {
      facts_v3,
      control_block,
      conflicts_found,
      processing_time: Date.now(),
      session_id: sessionId
    };
  } catch (error) {
    console.warn('Consolidation JSON parse failed, using minimal defaults:', error);
    
    // Last resort: minimal valid output
    const facts_v3 = normalizeFacts({
      category_generic: "unknown",
      silhouette: "generic_silhouette",
      required_components: [],
      forbidden_components: [], 
      labels_found: [],
      preserve_details: [],
      hollow_regions: [],
      construction_details: [],
      palette: { dominant_hex: undefined, accent_hex: undefined, trim_hex: undefined, pattern_hexes: [] },
      material: "unspecified_material",
      weave_knit: "unknown",
      drape_stiffness: 0.4,
      transparency: "opaque",
      surface_sheen: "matte",
      pattern: "unknown",
      print_scale: "unknown", 
      edge_finish: "unknown",
      view: "front",
      framing_margin_pct: 6,
      shadow_style: "soft",
      qa_targets: {
        deltaE_max: 3,
        edge_halo_max_pct: 1,
        symmetry_tolerance_pct: 3,
        min_resolution_px: 2000,
      },
      safety: { must_not: [] },
      label_visibility: "required",
    });
    
    const control_block = normalizeControlBlock({
      category_generic: undefined,
      silhouette: undefined,
      required_components: undefined,
      forbidden_components: undefined,
      palette: undefined,
      material: undefined,
      drape_stiffness: undefined,
      edge_finish: undefined,
      view: undefined,
      framing_margin_pct: undefined,
      shadow_style: undefined,
      safety: undefined,
      label_visibility: undefined,
      continuity_rules: undefined,
      structural_asymmetry: undefined,
      weave_knit: undefined,
      transparency: undefined,
      surface_sheen: undefined,
    } as any, facts_v3);
    
    return {
      facts_v3,
      control_block,
      conflicts_found: [],
      processing_time: Date.now(),
      session_id: sessionId
    };
  }
}

export function compileControlBlock(facts: FactsV3): ControlBlock {
  // Use normalization to ensure all fields are valid
  return normalizeControlBlock({
    category_generic: facts.category_generic,
    silhouette: facts.silhouette,
    required_components: facts.required_components,
    forbidden_components: facts.forbidden_components,
    palette: facts.palette,
    material: facts.material,
    drape_stiffness: facts.drape_stiffness,
    edge_finish: facts.edge_finish,
    view: facts.view,
    framing_margin_pct: facts.framing_margin_pct,
    shadow_style: facts.shadow_style,
    safety: facts.safety,
    label_visibility: facts.label_visibility ?? "required",
    continuity_rules: facts.continuity_rules,
    structural_asymmetry: facts.structural_asymmetry,
    weave_knit: facts.weave_knit,
    transparency: facts.transparency,
    surface_sheen: facts.surface_sheen,
  }, facts);
}

/**
 * Dynamic Flash 2.5 prompt builder using Gemini Pro 2.5 for intelligent integration
 * This replaces the static template approach with AI-powered data weaving
 */
export async function buildDynamicFlashPrompt(
  facts: FactsV3, 
  control: ControlBlock, 
  sessionId: string,
  useStructuredPrompt?: boolean,
  useExpertPrompt?: boolean
): Promise<string> {
  try {
    console.log('Building ' + (useStructuredPrompt ? 'Amazon-Ready Structured' : 'dynamic') + ' prompt...');
    
    // If structured prompts are requested, use that approach
    if (useStructuredPrompt) {
      const promptType = useExpertPrompt ? 'Expert AI Command' : 'Hybrid Structured';
      console.log('STRUCTURED PROMPT ACTIVATED: ' + promptType + ' approach');
      console.log('Based on clockmaker test insights: 70% structured vs 0% narrative success rate');
      console.log('Amazon marketplace compliance: 32+ structured fields, 85% frame fill, shadowless lighting');
      
      const { generateHybridStructuredPrompt } = await import('./structured-prompt-generator');
      const startTime = Date.now();
      const prompt = generateHybridStructuredPrompt(facts, control, useExpertPrompt);
      const processingTime = Date.now() - startTime;
      
      console.log(promptType + ' prompt generated successfully');
      console.log('   Prompt length: ' + prompt.length + ' characters');
      console.log('   Processing time: ' + processingTime + 'ms');
      console.log('   Features: JSON structure + narrative + Amazon compliance');
      
      // Count structured elements for validation
      const structuredElementCount = (prompt.match(/#[0-9A-Fa-f]{6}/g) || []).length + 
                                    (prompt.match(/\d+\.\d+/g) || []).length + 
                                    (prompt.match(/\{[^}]*\}/g) || []).length;
      console.log('   Structured elements detected: ' + structuredElementCount);
      
      return prompt;
    }
    
    // Use legacy dynamic prompt generator (AI-powered narrative approach)
    console.log('Using legacy dynamic prompt approach (AI-generated narrative)');
    const { generateDynamicPrompt, configurePromptGenerator } = await import('./prompt-generator');
    
    // Configure with Gemini API key (same as analysis)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      configurePromptGenerator(apiKey);
      const result = await generateDynamicPrompt(facts, control, sessionId);
      console.log('Generated legacy dynamic prompt in ' + result.processingTime + 'ms');
      console.log('   Prompt length: ' + result.prompt.length + ' characters');
      console.log('   Features: AI-generated narrative (legacy approach)');
      return result.prompt;
    }
    
    // Fallback to static if no API key
    console.warn('No Gemini API key available, using static prompt builder');
    return buildStaticFlashPrompt(control);
    
  } catch (error) {
    console.warn((useStructuredPrompt ? 'Structured' : 'Dynamic') + ' prompt generation failed, using static fallback:', error);
    return buildStaticFlashPrompt(control);
  }
}

/**
 * Legacy static prompt builder (used as fallback)
 */
export function buildStaticFlashPrompt(control: ControlBlock): string {
  // Build component requirements safely
  const requiredText = control.required_components?.length ? 
    'REQUIRED components (must include): ' + control.required_components.join(', ') : 
    'REQUIRED components: None specified';
    
  const forbiddenText = control.forbidden_components?.length ?
    '\n- FORBIDDEN components (must not include): ' + control.forbidden_components.join(', ') :
    '';

  const patternText = control.palette?.pattern_hexes?.length ?
    '\n- Patterns: ' + control.palette.pattern_hexes.join(', ') :
    '';

  const regionHintsText = control.palette?.region_hints ? 
    '\n- Region applications: ' + JSON.stringify(control.palette.region_hints) : 
    '';

  const safetyText = control.safety?.must_not?.length ?
    '- MUST NOT include: ' + control.safety.must_not.join(', ') :
    '- Standard professional product photography guidelines';

  const asymmetryText = control.structural_asymmetry?.expected ?
    '\n- Structural asymmetry expected in: ' + (control.structural_asymmetry.regions?.join(', ') || 'unspecified areas') :
    '';

  const continuityText = control.continuity_rules ?
    '\n- Continuity rules: ' + JSON.stringify(control.continuity_rules) :
    '';

  return (
    '\nTask: Using the provided reference images, create a professional studio product photo with invisible mannequin effect (ghost mannequin). Transform the flat-laid garment from the input images into a 3D ghost mannequin effect that shows exactly the same garment design, colors, patterns, and details. No human body or model visible.' +
    '\n\nIMAGE REFERENCE INSTRUCTIONS:' +
    '\n- Use the provided images as the ONLY source for garment design, colors, patterns, and details' +
    '\n- Do NOT change or modify the garment\'s appearance, colors, or design elements' +
    '\n- Maintain 100% visual consistency with the input garment' +
    '\n- Transform the flat layout into dimensional ghost mannequin form while preserving all original details' +
    '\n\nSTRICT CONSTRAINTS:' +
    '\n- Category: ' + (control.category_generic || 'unknown') +
    '\n- Silhouette: ' + (control.silhouette || 'generic') +
    '\n- ' + requiredText + forbiddenText +
    '\n\nCOLOR PALETTE (exact hex values):' +
    '\n- Dominant: ' + (control.palette?.dominant_hex || '#CCCCCC') +
    '\n- Accent: ' + (control.palette?.accent_hex || control.palette?.dominant_hex || '#CCCCCC') +
    '\n- Trim: ' + (control.palette?.trim_hex || control.palette?.accent_hex || '#CCCCCC') + patternText + regionHintsText +
    '\n\nMATERIAL & CONSTRUCTION:' +
    '\n- Material: ' + (control.material || 'fabric') +
    '\n- Weave/Knit: ' + (control.weave_knit || 'unknown') +
    '\n- Drape stiffness (0-1): ' + (control.drape_stiffness ?? 0.4) +
    '\n- Edge finish: ' + (control.edge_finish || 'unknown') +
    '\n- Transparency: ' + (control.transparency || 'opaque') +
    '\n- Surface sheen: ' + (control.surface_sheen || 'matte') +
    '\n\nPRESENTATION:' +
    '\n- View: ' + (control.view || 'front') +
    '\n- White background' +
    '\n- Framing margin: ' + (control.framing_margin_pct ?? 6) + '% from edges' +
    '\n- Shadow style: ' + (control.shadow_style || 'soft') +
    '\n- Labels: ' + (control.label_visibility || 'required') +
    '\n\nSAFETY CONSTRAINTS:' +
    '\n' + safetyText + asymmetryText + continuityText +
    '\n\nCRITICAL: Follow all constraints exactly. Do not invent or add features not specified. Create realistic ghost mannequin effect showing garment structure without human form.' +
    '\n\nIMAGE REFERENCE REMINDER:' +
    '\n- ONLY use the garment shown in the provided reference images' +
    '\n- Do NOT generate a different garment or change the design' +
    '\n- Transform the EXACT SAME garment from flat to 3D ghost mannequin' +
    '\n- Preserve ALL original colors, patterns, textures, and design elements from the reference images'
  ).trim();
}

/**
 * Legacy alias for backwards compatibility
 */
export function buildFlashPrompt(control: ControlBlock): string {
  console.warn('buildFlashPrompt is deprecated, use buildDynamicFlashPrompt or buildStaticFlashPrompt');
  return buildStaticFlashPrompt(control);
}

/**
 * Simple English prompt builder (Chinese version removed)
 */
export function buildSeeDreamPrompt(control: ControlBlock, facts?: FactsV3): string {
  return buildStaticFlashPrompt(control);
}

export async function qaLoop(
  imageUrl: string,
  facts: FactsV3,
  sessionId: string
): Promise<QAReport> {
  return await callGeminiProQA({ imageUrl, facts, sessionId });
}

// -----------------------------
// Retry Wrapper
// -----------------------------

export class RetriableError extends Error {}
export class NonRetriableError extends Error {}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof NonRetriableError) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// -----------------------------
// Prompts
// -----------------------------

function buildConsolidationPrompt(): string {
  return 'You are a fashion analysis expert. Your task is to consolidate two JSON analyses (JSON-A structural + JSON-B enrichment) into one conflict-free dataset.';
}

function buildQAPrompt(): string {
  return 'You are a quality assurance expert for ghost mannequin product photography. Compare the generated image against the facts_v3 reference data.';
}

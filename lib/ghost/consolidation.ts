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
  region_hints: z.record(z.array(z.string())).optional(),
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
  category_generic: z.enum([
    "top","bottom","dress","outerwear","knitwear","underwear","accessory","unknown"
  ]).catch("unknown"),
  silhouette: z.string().default("generic_silhouette"),
  required_components: z.array(z.string()).default([]),
  forbidden_components: z.array(z.string()).default([]),
  palette: PaletteSchemaLoose,
  material: z.string().default("unspecified_material"),
  weave_knit: z.enum(["woven","knit","nonwoven","unknown"]).catch("unknown"),
  drape_stiffness: z.number().min(0).max(1).default(0.4),
  transparency: z.enum(["opaque","semi_sheer","sheer"]).catch("opaque"),
  surface_sheen: z.enum(["matte","subtle_sheen","glossy"]).catch("matte"),
  pattern: z.string().default("unknown"),
  print_scale: z.string().default("unknown"),
  edge_finish: z.string().default("unknown"),
  view: z.string().default("front"),
  framing_margin_pct: z.number().min(2).max(12).default(6),
  shadow_style: z.enum(["soft","medium","hard"]).catch("soft"),
  qa_targets: z.object({
    deltaE_max: z.number().default(3),
    edge_halo_max_pct: z.number().default(1),
    symmetry_tolerance_pct: z.number().default(3),
    min_resolution_px: z.number().default(2000),
  }).default({}),
  safety: SafetySchemaLoose.default({ must_not: [] }),
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

export function normalizeFacts(f: FactsV3): FactsV3 {
  return {
    ...f,
    palette: normalizePalette(f.palette),
    safety: normalizeSafety(f.safety),
    required_components: f.required_components ?? [],
    forbidden_components: f.forbidden_components ?? [],
    label_visibility: f.label_visibility ?? "required",
    qa_targets: {
      deltaE_max: f.qa_targets?.deltaE_max ?? 3,
      edge_halo_max_pct: f.qa_targets?.edge_halo_max_pct ?? 1,
      symmetry_tolerance_pct: f.qa_targets?.symmetry_tolerance_pct ?? 3,
      min_resolution_px: f.qa_targets?.min_resolution_px ?? 2000,
    },
    structural_asymmetry: f.structural_asymmetry ?? { expected: false, regions: [] },
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
    throw new Error(`JSON consolidation API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const result = await model.generateContent([
      {
        text: prompt,
      },
      {
        text: `Facts_v3 Reference:\n${JSON.stringify(payload.facts, null, 2)}\n\nSession ID: ${payload.sessionId}`,
      },
      {
        inlineData: {
          data: payload.imageUrl.split(',')[1], // Remove data:image/png;base64, prefix
          mimeType: 'image/png',
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
    throw new Error(`QA analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  console.log(`[${sessionId}] Starting analysis consolidation...`);
  
  const prompt = `You are an expert consolidation system for garment analysis.

Your task is to merge two JSON analyses into a unified FactsV3 structure and ControlBlock for rendering.

Rule hierarchy for conflict resolution:
1. Visual/perceptual evidence (highest priority)
2. JSON-A (structural analysis)
3. JSON-B (enrichment analysis)

NOTE: If any field is unclear or cannot be determined, provide reasonable defaults.
For colors, use hex format like #AABBCC. For safety constraints, use object format: {"must_not": ["no_nudity", "no_violence"]}.
For continuity_rules, use object format: {"field_name": "string_value"}.
For missing numeric values, provide sensible defaults (e.g., drape_stiffness: 0.4).

Structural analysis (JSON-A):
${JSON.stringify(jsonA, null, 2)}

Enrichment analysis (JSON-B):
${JSON.stringify(jsonB, null, 2)}

Provide your consolidated output in this exact JSON format:
{
  "facts_v3": {
    "category_generic": "top|bottom|dress|outerwear|knitwear|underwear|accessory|unknown",
    "silhouette": "description of garment silhouette",
    "required_components": ["component1", "component2"],
    "forbidden_components": ["forbidden1"],
    "palette": {
      "dominant_hex": "#AABBCC",
      "accent_hex": "#DDEEFF",
      "trim_hex": "#FFFFFF",
      "pattern_hexes": ["#123456"],
      "region_hints": {}
    },
    "material": "fabric type",
    "weave_knit": "woven|knit|nonwoven|unknown",
    "drape_stiffness": 0.4,
    "transparency": "opaque|semi_sheer|sheer",
    "surface_sheen": "matte|subtle_sheen|glossy",
    "pattern": "pattern description",
    "print_scale": "scale description",
    "edge_finish": "finish type",
    "view": "front|back|side",
    "framing_margin_pct": 6,
    "shadow_style": "soft|medium|hard",
    "qa_targets": {
      "deltaE_max": 3,
      "edge_halo_max_pct": 1,
      "symmetry_tolerance_pct": 3,
      "min_resolution_px": 2000
    },
    "safety": {"must_not": ["no_nudity", "no_violence"]},
    "notes": "optional notes",
    "structural_asymmetry": {
      "expected": false,
      "regions": []
    },
    "label_visibility": "required|optional",
    "continuity_rules": {}
  },
  "control_block": {
    // Same structure as facts_v3 but focused on rendering parameters
  },
  "conflicts_found": [
    {
      "field": "field_name",
      "json_a": "value_from_a",
      "json_b": "value_from_b", 
      "resolution": "final_value",
      "source_of_truth": "visual|json_a|json_b",
      "confidence": 0.8
    }
  ]
}`;

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
          ? rawPalette.region_hints : {}
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
 * Generic control block prompt builder (used for Gemini)
 */
export function buildFlashPrompt(control: ControlBlock): string {
  // Build component requirements safely
  const requiredText = control.required_components?.length ? 
    `REQUIRED components (must include): ${control.required_components.join(", ")}` : 
    'REQUIRED components: None specified';
    
  const forbiddenText = control.forbidden_components?.length ?
    `\n- FORBIDDEN components (must not include): ${control.forbidden_components.join(", ")}` :
    '';

  const patternText = control.palette?.pattern_hexes?.length ?
    `\n- Patterns: ${control.palette.pattern_hexes.join(", ")}` :
    '';

  const regionHintsText = control.palette?.region_hints ? 
    `\n- Region applications: ${JSON.stringify(control.palette.region_hints)}` : 
    '';

  const safetyText = control.safety?.must_not?.length ?
    `- MUST NOT include: ${control.safety.must_not.join(", ")}` :
    '- Standard professional product photography guidelines';

  const asymmetryText = control.structural_asymmetry?.expected ?
    `\n- Structural asymmetry expected in: ${control.structural_asymmetry.regions?.join(", ") || 'unspecified areas'}` :
    '';

  const continuityText = control.continuity_rules ?
    `\n- Continuity rules: ${JSON.stringify(control.continuity_rules)}` :
    '';

  return `
Task: Using the provided reference images, create a professional studio product photo with invisible mannequin effect (ghost mannequin). Transform the flat-laid garment from the input images into a 3D ghost mannequin effect that shows exactly the same garment design, colors, patterns, and details. No human body or model visible.

IMAGE REFERENCE INSTRUCTIONS:
- Use the provided images as the ONLY source for garment design, colors, patterns, and details
- Do NOT change or modify the garment's appearance, colors, or design elements
- Maintain 100% visual consistency with the input garment
- Transform the flat layout into dimensional ghost mannequin form while preserving all original details

STRICT CONSTRAINTS:
- Category: ${control.category_generic || 'unknown'}
- Silhouette: ${control.silhouette || 'generic'}
- ${requiredText}${forbiddenText}

COLOR PALETTE (exact hex values):
- Dominant: ${control.palette?.dominant_hex || '#CCCCCC'}
- Accent: ${control.palette?.accent_hex || control.palette?.dominant_hex || '#CCCCCC'}  
- Trim: ${control.palette?.trim_hex || control.palette?.accent_hex || '#CCCCCC'}${patternText}${regionHintsText}

MATERIAL & CONSTRUCTION:
- Material: ${control.material || 'fabric'}
- Weave/Knit: ${control.weave_knit || 'unknown'}
- Drape stiffness (0-1): ${control.drape_stiffness ?? 0.4}
- Edge finish: ${control.edge_finish || 'unknown'}
- Transparency: ${control.transparency || 'opaque'}
- Surface sheen: ${control.surface_sheen || 'matte'}

PRESENTATION:
- View: ${control.view || 'front'}
- White background
- Framing margin: ${control.framing_margin_pct ?? 6}% from edges
- Shadow style: ${control.shadow_style || 'soft'}
- Labels: ${control.label_visibility || 'required'}

SAFETY CONSTRAINTS:
${safetyText}${asymmetryText}${continuityText}

CRITICAL: Follow all constraints exactly. Do not invent or add features not specified. Create realistic ghost mannequin effect showing garment structure without human form.

IMAGE REFERENCE REMINDER:
- ONLY use the garment shown in the provided reference images
- Do NOT generate a different garment or change the design
- Transform the EXACT SAME garment from flat to 3D ghost mannequin
- Preserve ALL original colors, patterns, textures, and design elements from the reference images
  `.trim();
}

/**
 * SeeDream 4.0 specialized Chinese prompt using JSON analysis integration
 */
export function buildSeeDreamPrompt(control: ControlBlock, facts?: FactsV3): string {
  // Extract JSON data for integration
  const dominantHex = control.palette?.dominant_hex || "#CCCCCC";
  const accentHex = control.palette?.accent_hex || control.palette?.dominant_hex || "#CCCCCC";
  const trimHex = control.palette?.trim_hex || control.palette?.accent_hex || "#CCCCCC";
  
  const requiredComponents = control.required_components?.length ? 
    control.required_components.join(", ") : "基本构造";
    
  const forbiddenComponents = control.forbidden_components?.length ?
    control.forbidden_components.join(", ") : "人体轮廓";

  const material = control.material || "fabric";
  const drapeQuality = control.drape_stiffness ?? 0.4;
  const surfaceSheen = control.surface_sheen || "matte";
  const transparency = control.transparency || "opaque";
  const weaveKnit = control.weave_knit || "unknown";
  
  const pattern = facts?.pattern || "unknown";
  const printScale = facts?.print_scale || "unknown";
  const shadowStyle = control.shadow_style || "soft";
  const framingMargin = control.framing_margin_pct ?? 6;
  const view = control.view || "front";
  const silhouette = control.silhouette || "标准轮廓";
  const category = control.category_generic || "unknown";
  
  return `
动作 (ACTION): 生成专业电商隐形人台摄影作品
对象 (OBJECT): 服装呈三维立体悬浮状态，内部中空，展现无形人体轮廓  
属性 (ATTRIBUTES): 纯白无缝背景，柔光照明，商业级品质

拍摄场景 (SCENE):
专业摄影棚环境，纯净白色无缝背景，专业柔光设备。服装位于画面中心，呈现自然三维人体形状 - 面料自然垂坠，重量分布真实，皱褶折痕自然，完全呈现穿着时状态。

核心技术要求 (TECHNICAL SPECS):
- 颜色精度: 应用分析数据的精确十六进制色值
- 面料物理: 模拟指定垂坠质感和表面属性
- 照明设置: 柔光漫射照明，最小阴影
- 细节锐度: 关键元素保持清晰定义  
- 视角构图: 正面视角，6%边距构图

参考图像整合 (REFERENCE INTEGRATION):
- 图像B: 完全保真复制所有视觉细节
- 图像A: 仅用于比例和空间关系参考
- JSON分析: 应用颜色精度、面料物理、结构要求

关键约束 (CONSTRAINTS):
✓ 必须展示领口、袖口、下摆内部中空效果
✓ 保持服装真实色彩和图案  
✗ 严禁出现人台假模、支撑结构或人体轮廓

专业要求 (OUTPUT):
分辨率2K-4K，商业摄影标准，电商目录使用就绪

JSON数据整合应用 (JSON INTEGRATION):

色彩精确控制 (Color Precision Control):
- 主色调: ${dominantHex} (严格匹配十六进制值)
- 辅助色: ${accentHex} (用于装饰元素)
- 镶边色: ${trimHex} (用于边缘细节)
${pattern !== "unknown" ? `- 图案类型: ${pattern}` : ""}
${printScale !== "unknown" ? `- 图案比例: ${printScale}` : ""}

面料物理模拟 (Fabric Physics Simulation):
- 材质类型: ${material}
- 编织结构: ${weaveKnit}
- 垂坠系数: ${drapeQuality} (${drapeQuality < 0.3 ? "飘逸柔软" : drapeQuality > 0.7 ? "挺括硬朗" : "结构适中"})
- 表面光泽: ${surfaceSheen} 反光效果
- 透明度: ${transparency} 透光处理

构造要求精确执行 (Construction Requirements):
- 服装类别: ${category}
- 版型轮廓: ${silhouette}
- 必含元素: ${requiredComponents} (必须清晰呈现)
- 禁含元素: ${forbiddenComponents} (绝对排除)
- 视角要求: ${view}视角拍摄
- 边框留白: ${framingMargin}%空间留白

光影效果控制 (Lighting & Shadow Control):
- 阴影风格: ${shadowStyle}光影效果
- 光线类型: 柔光漫射，避免强烈阴影
- 色彩保真: 严格保持 ${dominantHex}, ${accentHex}, ${trimHex} 色值准确性

隐形人台核心技术 (Core Invisible Mannequin Technique):
✓ 服装悬浮立体，内部完全中空
✓ 领口内侧、袖口内侧、下摆内侧清晰可见
✓ 三维饱满造型，无需支撑结构
✗ 严禁任何人台、假模、人体痕迹
✗ 禁止显示支撑架或内部结构

最终输出标准 (Final Output Standards):
- 分辨率: 2048x2048像素起步
- 格式: 商业摄影级品质
- 用途: 电商产品目录就绪
- 背景: 纯白无缝，无阴影干扰
`.trim();
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
  return `
You are a fashion analysis expert. Your task is to consolidate two JSON analyses (JSON-A structural + JSON-B enrichment) into one conflict-free dataset.

CONFLICT RESOLUTION HIERARCHY:
1. Visual evidence (from images) > JSON-A > JSON-B
2. Confidence thresholds: Color (0.8), Material (0.7), Construction (0.9)
3. If confidence < 0.5, mark as "unknown"
4. No new components from JSON-B that aren't in JSON-A

OUTPUT REQUIREMENTS:
Return a JSON object with exactly this structure:

\`\`\`json
{
  "conflicts_found": [
    {
      "field": "string",
      "json_a": "any",
      "json_b": "any", 
      "resolution": "any",
      "source_of_truth": "visual|json_a|json_b",
      "confidence": 0.0-1.0
    }
  ],
  "facts_v3": {
    "category_generic": "top|bottom|dress|outerwear|knitwear|underwear|accessory|unknown",
    "silhouette": "string",
    "required_components": ["string"],
    "forbidden_components": ["string"],
    "palette": {
      "dominant_hex": "#RRGGBB",
      "accent_hex": "#RRGGBB",
      "trim_hex": "#RRGGBB", 
      "pattern_hexes": ["#RRGGBB"],
      "region_hints": {"trim_hex": ["collar", "cuffs"]}
    },
    "material": "string",
    "weave_knit": "woven|knit|nonwoven|unknown",
    "drape_stiffness": 0.0-1.0,
    "transparency": "opaque|semi_sheer|sheer",
    "surface_sheen": "matte|subtle_sheen|glossy",
    "pattern": "string",
    "print_scale": "string",
    "edge_finish": "string",
    "view": "string", 
    "framing_margin_pct": 2-12,
    "shadow_style": "soft|medium|hard",
    "qa_targets": {
      "deltaE_max": 3,
      "edge_halo_max_pct": 1,
      "symmetry_tolerance_pct": 3,
      "min_resolution_px": 2000
    },
    "safety": {
      "must_not": ["string"]
    },
    "label_visibility": "required|optional",
    "structural_asymmetry": {
      "expected": false,
      "regions": ["string"]
    }
  },
  "control_block": {
    // Same as facts_v3 but only the 18-20 core fields needed for rendering
  }
}
\`\`\`

ANALYSIS PROCESS:
1. Compare JSON-A and JSON-B for conflicts
2. Apply resolution hierarchy  
3. Build consolidated facts_v3
4. Extract control_block with essential rendering fields
5. Ensure no hallucinations or invented details
  `.trim();
}

function buildQAPrompt(): string {
  return `
You are a quality assurance expert for ghost mannequin product photography. Compare the generated image against the facts_v3 reference data.

EVALUATION CRITERIA:
- Color accuracy (ΔE < 3)
- Edge quality (halo < 1%)  
- Structural symmetry (tolerance < 3%)
- Component presence/absence
- Overall coherence

OUTPUT FORMAT:
Return JSON with this exact structure:

\`\`\`json
{
  "overall_quality_score": 0.0-1.0,
  "passed": true/false,
  "deltas": [
    {
      "metric": "color_accuracy|edge_quality|symmetry|components",
      "current_value": 0.0,
      "target_value": 0.0,
      "correction_prompt": "Specific instruction for improvement"
    }
  ]
}
\`\`\`

CORRECTION PROMPTS:
- Be specific and actionable
- Focus on one issue per delta
- Use precise language for adjustments
- Max 2 iterations before manual review
  `.trim();
}

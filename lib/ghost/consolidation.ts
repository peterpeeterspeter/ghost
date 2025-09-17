import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisJSON, EnrichmentJSON } from '@/types/ghost';

// -----------------------------
// Schemas (Based on PRD v2.1)
// -----------------------------

export const PaletteSchema = z.object({
  dominant_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  trim_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  pattern_hexes: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  region_hints: z
    .record(z.array(z.string()))
    .optional(), // e.g. trim_hex → ["collar","front_opening"]
});

export const FactsV3Schema = z.object({
  category_generic: z.enum([
    "top",
    "bottom", 
    "dress",
    "outerwear",
    "knitwear",
    "underwear",
    "accessory",
    "unknown",
  ]),
  silhouette: z.string(),
  required_components: z.array(z.string()),
  forbidden_components: z.array(z.string()),
  palette: PaletteSchema,
  material: z.string(),
  weave_knit: z.enum(["woven", "knit", "nonwoven", "unknown"]),
  drape_stiffness: z.number().min(0).max(1),
  transparency: z.enum(["opaque", "semi_sheer", "sheer"]),
  surface_sheen: z.enum(["matte", "subtle_sheen", "glossy"]),
  pattern: z.string(),
  print_scale: z.string(),
  edge_finish: z.string(),
  view: z.string(),
  framing_margin_pct: z.number().min(2).max(12),
  shadow_style: z.enum(["soft", "medium", "hard"]),
  qa_targets: z.object({
    deltaE_max: z.number(),
    edge_halo_max_pct: z.number(),
    symmetry_tolerance_pct: z.number(),
    min_resolution_px: z.number(),
  }),
  safety: z.object({
    must_not: z.array(z.string()),
  }),
  notes: z.string().optional(),
  structural_asymmetry: z
    .object({
      expected: z.boolean(),
      regions: z.array(z.string()),
    })
    .optional(),
  label_visibility: z.enum(["required", "optional"]).optional(),
  continuity_rules: z.record(z.string()).optional(),
});

export const ControlBlockSchema = z.object({
  category_generic: z.string(),
  silhouette: z.string(),
  required_components: z.array(z.string()),
  forbidden_components: z.array(z.string()),
  palette: PaletteSchema,
  material: z.string(),
  drape_stiffness: z.number(),
  edge_finish: z.string(),
  view: z.string(),
  framing_margin_pct: z.number(),
  shadow_style: z.string(),
  safety: z.object({ must_not: z.array(z.string()) }),
  label_visibility: z.enum(["required", "optional"]),
  continuity_rules: z.record(z.string()).optional(),
  structural_asymmetry: z
    .object({
      expected: z.boolean(),
      regions: z.array(z.string()),
    })
    .optional(),
  weave_knit: z.enum(["woven", "knit", "nonwoven", "unknown"]),
  transparency: z.enum(["opaque", "semi_sheer", "sheer"]),
  surface_sheen: z.enum(["matte", "subtle_sheen", "glossy"]),
});

export const ConflictSchema = z.object({
  field: z.string(),
  json_a: z.any(),
  json_b: z.any(),
  resolution: z.any(),
  source_of_truth: z.enum(["visual", "json_a", "json_b"]),
  confidence: z.number().min(0).max(1),
});

export const QAReportSchema = z.object({
  overall_quality_score: z.number().min(0).max(1),
  deltas: z.array(
    z.object({
      metric: z.string(),
      current_value: z.number(),
      target_value: z.number(),
      correction_prompt: z.string(),
    })
  ),
  passed: z.boolean(),
});

export const ConsolidationOutputSchema = z.object({
  conflicts_found: z.array(ConflictSchema),
  facts_v3: FactsV3Schema,
  control_block: ControlBlockSchema,
  processing_time: z.number(),
  session_id: z.string(),
});

// -----------------------------
// Types
// -----------------------------

export type PaletteType = z.infer<typeof PaletteSchema>;
export type FactsV3 = z.infer<typeof FactsV3Schema>;
export type ControlBlock = z.infer<typeof ControlBlockSchema>;
export type ConflictDetection = z.infer<typeof ConflictSchema>;
export type QAReport = z.infer<typeof QAReportSchema>;
export type ConsolidationOutput = z.infer<typeof ConsolidationOutputSchema>;

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
}): Promise<ConsolidationOutput> {
  console.log('Starting JSON consolidation with Gemini Pro...');
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.0,
      topP: 0.2,
    }
  });

  const prompt = buildConsolidationPrompt();
  const startTime = Date.now();

  try {
    const result = await model.generateContent([
      {
        text: prompt,
      },
      {
        text: `JSON-A (Structural Analysis):\n${JSON.stringify(payload.jsonA, null, 2)}\n\nJSON-B (Enrichment Analysis):\n${JSON.stringify(payload.jsonB, null, 2)}\n\nSession ID: ${payload.sessionId}`,
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON found in consolidation response');
    }

    const consolidationData = JSON.parse(jsonMatch[1]);
    const processingTime = Date.now() - startTime;

    // Validate and return
    return ConsolidationOutputSchema.parse({
      ...consolidationData,
      processing_time: processingTime,
      session_id: payload.sessionId,
    });

  } catch (error) {
    console.error('Consolidation failed:', error);
    throw new Error(`JSON consolidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  
  return await callGeminiProConsolidator({ 
    jsonA, 
    jsonB, 
    refs, 
    sessionId 
  });
}

export function compileControlBlock(facts: FactsV3): ControlBlock {
  return ControlBlockSchema.parse({
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
  });
}

export function buildFlashPrompt(control: ControlBlock): string {
  return `
Task: Create a professional studio product photo with invisible mannequin effect (ghost mannequin). No human body or model visible.

STRICT CONSTRAINTS:
- Category: ${control.category_generic}
- Silhouette: ${control.silhouette}
- REQUIRED components (must include): ${control.required_components.join(", ")}
- FORBIDDEN components (must not include): ${control.forbidden_components.join(", ")}

COLOR PALETTE (exact hex values):
- Dominant: ${control.palette.dominant_hex}
- Accent: ${control.palette.accent_hex}  
- Trim: ${control.palette.trim_hex}
- Patterns: ${control.palette.pattern_hexes.join(", ")}
${control.palette.region_hints ? `- Region applications: ${JSON.stringify(control.palette.region_hints)}` : ""}

MATERIAL & CONSTRUCTION:
- Material: ${control.material}
- Weave/Knit: ${control.weave_knit}
- Drape stiffness (0-1): ${control.drape_stiffness}
- Edge finish: ${control.edge_finish}
- Transparency: ${control.transparency}
- Surface sheen: ${control.surface_sheen}

PRESENTATION:
- View: ${control.view}
- White background
- Framing margin: ${control.framing_margin_pct}% from edges
- Shadow style: ${control.shadow_style}
- Labels: ${control.label_visibility}

SAFETY CONSTRAINTS:
- MUST NOT include: ${control.safety.must_not.join(", ")}

${control.structural_asymmetry?.expected ? `- Structural asymmetry expected in: ${control.structural_asymmetry.regions.join(", ")}` : ""}
${control.continuity_rules ? `- Continuity rules: ${JSON.stringify(control.continuity_rules)}` : ""}

CRITICAL: Follow all constraints exactly. Do not invent or add features not specified. Create realistic ghost mannequin effect showing garment structure without human form.
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

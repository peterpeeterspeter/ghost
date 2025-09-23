/**
 * Distilled Flash Prompt Builder - Clean, guardrail-focused prompts
 * 
 * Strategy: Your existing template + small universal tail
 * No JSON pasting, just clear prose instructions for Flash API
 */

interface PromptOptions {
  addenda?: string[]; // additional instructions
  maxLength?: number; // character limit for prompts
  includeCommon?: boolean; // include common guardrails
  retryMode?: boolean; // shorter prompt for retries
}

interface PromptResult {
  prompt: string;
  characterCount: number;
  sections: {
    base: string;
    guardrails: string;
    addenda: string;
  };
  truncated: boolean;
}

// Universal guardrails that apply to ALL ghost mannequin generation
const COMMON_GUARDRAILS = `
Pure white background (#FFFFFF). Even, soft, shadow-free studio lighting.
No props, bodies, faces, or mannequins. Perfect bilateral symmetry.
Derive silhouette and edges from the structure image; copy all visual details from the flatlay.
Show interior lining, patterns, or fabric details exactly as they appear in the flatlay image.
If the flatlay shows the garment open revealing interior details, display the ghost mannequin open with those details visible.
`;

// A/B processing specific instructions
const AB_PROCESSING_INSTRUCTIONS = [
  "Use Image B for all colors, textures, prints, labels and edge finishes.",
  "Use Image A only to estimate global scale; ignore its local folds/pose.",
  "If Image B shows the garment open with interior lining/fabric visible, display it open with the interior details visible.",
  "If Image B shows interior fabric, patterns, or lining, include these interior details in the ghost mannequin.",
  "Keep neckline and sleeves hollow only if no interior fabric is shown in Image B.",
  "Pure white background (#FFFFFF). No props, models, or mannequins."
];

/**
 * Build distilled Flash prompt from consolidated data + guardrails
 */
export function buildDistilledPrompt(
  consolidated: any,
  options: PromptOptions = {}
): PromptResult {
  const {
    addenda = AB_PROCESSING_INSTRUCTIONS,
    maxLength = 1800,
    includeCommon = true,
    retryMode = false
  } = options;

  console.log('[PromptBuilder] Building distilled Flash prompt...');

  // Step 1: Generate base prompt from consolidated facts
  const basePrompt = generateBasePrompt(consolidated, retryMode);
  
  // Step 2: Add universal guardrails
  const guardrails = includeCommon ? COMMON_GUARDRAILS.trim() : '';
  
  // Step 3: Add custom addenda
  const addendaText = addenda.length > 0 ? addenda.join('\n') : '';

  // Step 4: Combine sections
  const sections = {
    base: basePrompt,
    guardrails,
    addenda: addendaText
  };

  let fullPrompt = [basePrompt, guardrails, addendaText]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  // Step 5: Handle length constraints
  let truncated = false;
  if (fullPrompt.length > maxLength) {
    fullPrompt = truncatePrompt(fullPrompt, maxLength);
    truncated = true;
    console.log(`[PromptBuilder] ⚠️ Prompt truncated to ${maxLength} characters`);
  }

  const result: PromptResult = {
    prompt: fullPrompt,
    characterCount: fullPrompt.length,
    sections,
    truncated
  };

  console.log(`[PromptBuilder] ✅ Generated prompt: ${result.characterCount} characters`);
  console.log(`[PromptBuilder] Sections - Base: ${sections.base.length}, Guardrails: ${sections.guardrails.length}, Addenda: ${sections.addenda.length}`);

  return result;
}

/**
 * Generate base prompt from consolidated facts (your existing template logic)
 */
function generateBasePrompt(consolidated: any, retryMode: boolean = false): string {
  // Extract key properties from consolidated data
  const {
    category_generic = 'unknown',
    silhouette = 'fitted',
    material = 'cotton',
    transparency = 'opaque',
    surface_sheen = 'matte',
    pattern = 'solid',
    palette = {},
    view = 'front',
    edge_finish = 'serged'
  } = consolidated;

  // Build descriptive base prompt
  let prompt = `Create a professional ghost mannequin photograph of a ${category_generic}`;
  
  // Add silhouette and fit details
  if (silhouette !== 'fitted') {
    prompt += ` with ${silhouette} silhouette`;
  }
  
  // Add material and surface properties
  prompt += ` made of ${material}`;
  
  if (surface_sheen !== 'matte') {
    prompt += ` with ${surface_sheen} finish`;
  }
  
  // Add color information
  if (palette.dominant_hex) {
    prompt += `. Primary color: ${palette.dominant_hex}`;
  }
  
  if (palette.accent_hex && palette.accent_hex !== palette.dominant_hex) {
    prompt += `, accent color: ${palette.accent_hex}`;
  }

  // Add pattern information
  if (pattern && pattern !== 'solid') {
    prompt += `. Pattern: ${pattern}`;
    
    if (palette.pattern_hexes && palette.pattern_hexes.length > 0) {
      prompt += ` using colors ${palette.pattern_hexes.join(', ')}`;
    }
  }

  // Add view and finish details
  prompt += `. Photographed from ${view} view`;
  
  if (edge_finish && edge_finish !== 'raw') {
    prompt += ` with ${edge_finish} edge finish`;
  }

  // Add transparency handling
  if (transparency !== 'opaque') {
    prompt += `. Handle ${transparency} transparency appropriately`;
  }

  // Shorten for retry mode
  if (retryMode) {
    prompt = shortenForRetry(prompt);
  }

  return prompt + '.';
}

/**
 * Shorten prompt for retry attempts
 */
function shortenForRetry(prompt: string): string {
  // Remove detailed color specifications and keep essentials
  const shortened = prompt
    .replace(/Primary color: [^,.]*/g, '')
    .replace(/accent color: [^,.]*/g, '')
    .replace(/using colors [^.]*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,]\s*[.,]/g, '.')
    .trim();

  return shortened;
}

/**
 * Truncate prompt to fit length constraints while preserving meaning
 */
function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  // Try to truncate at sentence boundaries
  const sentences = prompt.split('. ');
  let truncated = '';
  
  for (const sentence of sentences) {
    const candidate = truncated + (truncated ? '. ' : '') + sentence;
    if (candidate.length > maxLength - 10) { // Leave some buffer
      break;
    }
    truncated = candidate;
  }

  // If still too long, hard truncate
  if (truncated.length > maxLength) {
    truncated = truncated.substring(0, maxLength - 3) + '...';
  }

  return truncated;
}

/**
 * Generate retry prompt (shorter, essential details only)
 */
export function buildRetryPrompt(
  consolidated: any,
  originalLength: number = 1500
): PromptResult {
  const retryOptions: PromptOptions = {
    addenda: [
      "Use reference images for structure and colors.",
      "Pure white background. No props or mannequins.",
      "Keep neck and sleeves hollow."
    ],
    maxLength: Math.min(originalLength * 0.8, 1200), // 20% shorter
    includeCommon: false, // Skip verbose guardrails
    retryMode: true
  };

  return buildDistilledPrompt(consolidated, retryOptions);
}

/**
 * Generate emergency fallback prompt (minimal, always works)
 */
export function buildFallbackPrompt(): string {
  return `Create a professional ghost mannequin photograph. 
Use reference images for structure and visual details. 
Pure white background. Keep neck and sleeves hollow.`;
}

/**
 * Validate prompt meets Flash API requirements
 */
export function validatePrompt(prompt: string): {
  valid: boolean;
  issues: string[];
  characterCount: number;
} {
  const issues: string[] = [];
  
  // Check length constraints
  if (prompt.length > 2000) {
    issues.push(`Prompt too long: ${prompt.length} characters (max 2000)`);
  }
  
  if (prompt.length < 50) {
    issues.push(`Prompt too short: ${prompt.length} characters (min 50)`);
  }

  // Check for potentially problematic content
  const problematicTerms = ['person', 'model', 'skin', 'body', 'face'];
  for (const term of problematicTerms) {
    if (prompt.toLowerCase().includes(term)) {
      issues.push(`Contains potentially problematic term: "${term}"`);
    }
  }

  // Check for essential ghost mannequin terms
  const essentialTerms = ['ghost mannequin', 'white background', 'hollow'];
  const missingTerms = essentialTerms.filter(
    term => !prompt.toLowerCase().includes(term.toLowerCase())
  );
  
  if (missingTerms.length > 0) {
    issues.push(`Missing essential terms: ${missingTerms.join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    characterCount: prompt.length
  };
}

/**
 * Generate category-specific prompt enhancements
 */
export function getCategoryEnhancements(category: string): string[] {
  const enhancements: { [key: string]: string[] } = {
    'top': [
      'Ensure proper shoulder drape and sleeve positioning',
      'Maintain natural torso proportions'
    ],
    'bottom': [
      'Show proper leg shape and hem drape',
      'Maintain waistline definition'
    ],
    'dress': [
      'Capture full silhouette from shoulders to hem',
      'Show natural waist and hip proportions'
    ],
    'outerwear': [
      'Display proper layering capability',
      'Show collar and closure details clearly'
    ],
    'accessory': [
      'Focus on shape and texture details',
      'Minimize background distractions'
    ]
  };

  return enhancements[category] || [];
}

/**
 * Log prompt analysis for debugging
 */
export function logPromptAnalysis(result: PromptResult): void {
  console.log('[PromptBuilder] === PROMPT ANALYSIS ===');
  console.log(`Total length: ${result.characterCount} characters`);
  console.log(`Truncated: ${result.truncated ? 'Yes' : 'No'}`);
  console.log(`Base section: ${result.sections.base.length} chars`);
  console.log(`Guardrails: ${result.sections.guardrails.length} chars`);
  console.log(`Addenda: ${result.sections.addenda.length} chars`);
  console.log('[PromptBuilder] === END ANALYSIS ===');
}
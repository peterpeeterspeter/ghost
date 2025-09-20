import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FactsV3, ControlBlock } from './consolidation';
import { GhostPipelineError } from '@/types/ghost';

// Initialize Gemini client for prompt generation
let genAI: GoogleGenerativeAI | null = null;

export function configurePromptGenerator(apiKey: string): void {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Balanced Flash 2.5 Template - Clear dimensional guidance with narrative flow
const FLASH_25_BASE_TEMPLATE = `Create a professional studio photograph showing a garment transformed from its flat layout into a dimensional display form against a pristine white background. The garment should appear as if worn by a transparent form, creating natural volume and structure while maintaining the exact colors, patterns, and design details from the reference images. 

The dimensional effect shows the garment floating naturally with proper fit and drape, displaying how the fabric moves and falls when given body volume. Soft, even studio lighting illuminates the garment's texture and construction without harsh shadows. The final image should look like a professional product photograph suitable for e-commerce, showing the garment's true shape and proportions as it would appear when worn, but without any visible model or mannequin - only the dimensional garment form itself.

Most importantly: Transform the flat reference image into this three-dimensional presentation while preserving every original color, pattern, and design element exactly as shown in the source material.

IMPORTANT LABEL HANDLING: If there are any visible brand labels, care labels, size tags, or text elements in the reference image, copy them identically in the same position and orientation on the dimensional garment form. Maintain perfect text clarity and readability.`;

/**
 * Generate dynamic prompt using Gemini Pro 2.5 by weaving FactsV3 data into Flash 2.5 template
 */
export async function generateDynamicPrompt(
  facts: FactsV3,
  controlBlock: ControlBlock,
  sessionId: string
): Promise<{ prompt: string; processingTime: number }> {
  const startTime = Date.now();

  if (!genAI) {
    throw new GhostPipelineError(
      'Prompt generator not configured. Call configurePromptGenerator first.',
      'CLIENT_NOT_CONFIGURED', 
      'rendering'
    );
  }

  try {
    console.log('🎯 Generating dynamic prompt with Gemini Pro 2.5...');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent, precise integration
        topK: 1,
        topP: 0.8,
      }
    });

    // Create structured data summary for integration
    const factsData = JSON.stringify(facts, null, 2);
    const controlData = JSON.stringify(controlBlock, null, 2);

    const integrationPrompt = `You are a professional prompt engineer specializing in AI image generation for fashion photography. Create a natural, narrative-style prompt by integrating the specific garment details into the base template.

GARMENT ANALYSIS DATA:
\`\`\`json
${factsData}
\`\`\`

BASE TEMPLATE:
---
${FLASH_25_BASE_TEMPLATE}
---

INTEGRATIONS NEEDED:
1. **Describe colors naturally**: Convert hex codes to descriptive color names (e.g., #1A89B8 → "deep ocean blue")
2. **Describe materials**: Use natural fabric descriptions instead of technical terms
3. **Mention key features**: Naturally describe required_components like "fringe trim" or "printed patterns"
4. **Garment type**: Specify the actual garment category and silhouette naturally
5. **Fabric behavior**: Describe drape and texture in visual terms, not numbers

GUIDELINES:
- Write in natural, flowing language (300-400 words)
- Focus on visual description rather than technical specifications
- Use the reference images as the primary source of truth
- Create a cohesive narrative about the studio photography setup
- Avoid bullet points, numbered lists, or technical jargon

Generate the enhanced prompt:`;

    console.log('🔄 Calling Gemini Pro 2.5 for prompt integration...');

    const result = await model.generateContent(integrationPrompt);
    const response = await result.response;
    const generatedPrompt = response.text();

    if (!generatedPrompt) {
      throw new Error('Empty response from Gemini Pro 2.5');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Dynamic prompt generated in ${processingTime}ms`);
    console.log(`📏 Generated prompt length: ${generatedPrompt.length} characters`);
    console.log('🎯 Prompt preview:', generatedPrompt.substring(0, 200) + '...');

    return {
      prompt: generatedPrompt.trim(),
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Dynamic prompt generation failed:', error);

    // Fallback to static template with basic interpolation
    console.log('🔄 Falling back to static template with basic data integration...');
    
    const fallbackPrompt = generateFallbackPrompt(facts, controlBlock);
    
    return {
      prompt: fallbackPrompt,
      processingTime
    };
  }
}

/**
 * Convert hex color to natural color name
 */
function hexToColorName(hex: string): string {
  const colorMap: Record<string, string> = {
    // Common colors
    '#000000': 'black', '#FFFFFF': 'white', '#808080': 'gray',
    '#FF0000': 'red', '#00FF00': 'green', '#0000FF': 'blue',
    '#FFFF00': 'yellow', '#FF00FF': 'magenta', '#00FFFF': 'cyan',
    '#800000': 'maroon', '#008000': 'dark green', '#000080': 'navy',
    '#800080': 'purple', '#008080': 'teal', '#808000': 'olive',
    '#FFA500': 'orange', '#FFC0CB': 'pink', '#A52A2A': 'brown',
    '#F0F8FF': 'off-white', '#CCCCCC': 'light gray'
  };

  // Exact match
  if (colorMap[hex.toUpperCase()]) {
    return colorMap[hex.toUpperCase()];
  }

  // Parse RGB values
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Determine dominant color and lightness
  if (r > g && r > b) {
    return r > 200 ? 'light red' : r > 100 ? 'red' : 'dark red';
  } else if (g > r && g > b) {
    return g > 200 ? 'light green' : g > 100 ? 'green' : 'dark green';
  } else if (b > r && b > g) {
    return b > 200 ? 'light blue' : b > 100 ? 'blue' : 'dark blue';
  } else {
    const avg = (r + g + b) / 3;
    return avg > 200 ? 'light gray' : avg > 100 ? 'gray' : 'dark gray';
  }
}

/**
 * Fallback prompt generator using simple template interpolation
 */
function generateFallbackPrompt(facts: FactsV3, controlBlock: ControlBlock): string {
  // Extract key values with fallbacks
  const dominantColor = facts.palette?.dominant_hex || controlBlock.palette?.dominant_hex || '#CCCCCC';
  const accentColor = facts.palette?.accent_hex || controlBlock.palette?.accent_hex || dominantColor;
  const category = facts.category_generic || 'garment';
  const silhouette = facts.silhouette || 'standard fit';
  const material = facts.material || 'fabric';
  const drapeStiffness = facts.drape_stiffness ?? 0.4;
  const surfaceSheen = facts.surface_sheen || 'matte';
  const transparency = facts.transparency || 'opaque';
  const requiredComponents = facts.required_components?.join(', ') || 'standard construction';

  // Convert hex to natural color descriptions
  const dominantColorName = hexToColorName(dominantColor);
  const accentColorName = hexToColorName(accentColor);
  const drapeDescription = drapeStiffness < 0.3 ? 'flowing and soft' : drapeStiffness > 0.7 ? 'structured and crisp' : 'naturally balanced';

  return `Create a professional studio photograph showing a ${category} transformed from its flat layout into a dimensional display form against a pristine white background. The ${silhouette} garment should appear as if worn by a transparent form, creating natural volume and structure while showcasing its authentic ${dominantColorName} tones with ${accentColorName} accents. 

The ${material} fabric displays a ${drapeDescription} drape with ${surfaceSheen} finish, highlighting important details like ${requiredComponents}. The dimensional effect shows the garment floating naturally with proper fit and drape, displaying how the fabric moves and falls when given body volume. 

Most importantly: Transform the flat reference image into this three-dimensional presentation while preserving every original color, pattern, and design element exactly as shown in the source material. The result should look like a professional product photograph suitable for e-commerce, showing the garment's true shape as it would appear when worn, but without any visible model - only the dimensional garment form itself.

IMPORTANT LABEL HANDLING: If there are any visible brand labels, care labels, size tags, or text elements in the reference image, copy them identically in the same position and orientation on the dimensional garment form. Maintain perfect text clarity and readability.`;
}

/**
 * Legacy static prompt builder for backwards compatibility
 */
export function buildStaticFlashPrompt(control: ControlBlock): string {
  const requiredText = control.required_components?.length ? 
    `REQUIRED components (must include): ${control.required_components.join(", ")}` : 
    'REQUIRED components: None specified';
    
  const forbiddenText = control.forbidden_components?.length ?
    `\n- FORBIDDEN components (must not include): ${control.forbidden_components.join(", ")}` :
    '';

  return `
Task: Using the provided reference images, create a professional studio product photo with dimensional mannequin effect. Transform the flat-laid garment from the input images into a 3D dimensional effect that shows exactly the same garment design, colors, patterns, and details. Show natural garment structure and form.

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
- Trim: ${control.palette?.trim_hex || control.palette?.accent_hex || '#CCCCCC'}

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

CRITICAL: Follow all constraints exactly. Do not invent or add features not specified. Create realistic dimensional effect showing natural garment structure and form.

IMAGE REFERENCE REMINDER:
- ONLY use the garment shown in the provided reference images
- Do NOT generate a different garment or change the design
- Transform the EXACT SAME garment from flat to 3D dimensional form
- Preserve ALL original colors, patterns, textures, and design elements from the reference images
  `.trim();
}
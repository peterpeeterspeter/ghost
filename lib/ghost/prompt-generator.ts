import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FactsV3, ControlBlock } from './consolidation';
import { GhostPipelineError } from '@/types/ghost';

// Initialize Gemini client for prompt generation
let genAI: GoogleGenerativeAI | null = null;

export function configurePromptGenerator(apiKey: string): void {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Comprehensive Flash 2.5 Base Template - Professional ghost mannequin with full technical specifications
const FLASH_25_BASE_TEMPLATE = `Create a professional three-dimensional ghost mannequin photograph for e-commerce product display, transforming flat garment images into a dimensional presentation that shows how the clothing would appear when worn by an invisible person.

## DETAILED SCENE NARRATIVE:

Imagine a high-end photography studio with perfect white cyclorama background and professional lighting equipment. In the center of this space, a garment floats in three-dimensional space, filled with the volume and shape of an invisible human body. The fabric drapes naturally with realistic weight and movement, showing natural creases and folds exactly as clothing would appear on a person. The garment maintains its authentic colors and patterns while displaying proper fit and dimensional form. This is captured with studio-quality photography equipment using an 85mm portrait lens with even, shadow-free lighting.

## MULTI-SOURCE DATA AUTHORITY:

**Image B (Detail Source)** - Primary visual reference containing the absolute truth for all colors, patterns, textures, construction details, and material properties. Copy these elements with complete fidelity.

**Base Analysis JSON** - Contains mandatory preservation rules for specific elements, their coordinates, structural requirements, and construction details that must be followed exactly.

**Enrichment Analysis JSON** - Provides technical specifications for color precision, fabric behavior, rendering guidance, and quality expectations that must be integrated into the final result.

**Image A (Model Reference)** - Use only for understanding basic proportions and spatial relationships; all visual details should come from Image B.

## ENHANCED TECHNICAL SPECIFICATIONS:

### COLOR PRECISION INTEGRATION:

Apply the exact color values from the enrichment analysis:

- **Primary Color**: Use the specified hex value as the dominant garment color with perfect fidelity
- **Secondary Color**: If provided, apply to accent elements, patterns, or trim details
- **Color Temperature**: Adjust lighting setup to complement warm/cool/neutral color temperature
- **Saturation Level**: Render colors at the specified saturation intensity (muted/moderate/vibrant)
- **Pattern Direction**: Align patterns according to specified direction (horizontal/vertical/diagonal/random)
- **Pattern Scale**: Size pattern elements according to specified repeat size (micro/small/medium/large)

### FABRIC BEHAVIOR SIMULATION:

Implement realistic fabric physics based on enrichment analysis:

- **Drape Quality**: Simulate fabric behavior (crisp/flowing/structured/fluid/stiff)
    - Crisp: Sharp edges and angular folds
    - Flowing: Smooth, continuous curves
    - Structured: Maintains defined shape with minimal droop
    - Fluid: Liquid-like movement with soft cascading
    - Stiff: Rigid appearance with minimal flexibility
- **Surface Sheen**: Apply appropriate light reflection (matte/subtle_sheen/glossy/metallic)
- **Transparency Level**: Render opacity correctly (opaque/semi_opaque/translucent/sheer)
- **Texture Depth**: Show surface relief (flat/subtle_texture/pronounced_texture/heavily_textured)
- **Wrinkle Tendency**: Add realistic creasing based on fabric type

### ADVANCED LIGHTING IMPLEMENTATION:

Configure studio lighting according to rendering guidance:

- **Lighting Preference**:
    - Soft_diffused: Even, wraparound lighting with no harsh shadows
    - Directional: Controlled directional lighting with defined light source
    - High_key: Bright, cheerful lighting with minimal shadows
    - Dramatic: Contrasty lighting with defined highlights and shadows
- **Shadow Behavior**: Control shadow intensity and quality
    - Minimal_shadows: Nearly shadowless presentation
    - Soft_shadows: Gentle, diffused shadows
    - Defined_shadows: Clear but not harsh shadow definition
    - Dramatic_shadows: Strong shadow contrast for depth
- **Detail Sharpness**: Adjust focus and clarity (soft/natural/sharp/ultra_sharp)
- **Texture Emphasis**: Control fabric texture visibility (minimize/subtle/enhance/maximize)

### CONSTRUCTION PRECISION RENDERING:

Apply construction details from enrichment analysis:

- **Seam Visibility**: Render seams according to specified prominence (hidden/subtle/visible/decorative)
- **Edge Finishing**: Show edge treatments accurately (raw/serged/bound/rolled/pinked)
- **Stitching Contrast**: Apply or minimize thread visibility based on contrast specification
- **Hardware Finish**: Render metal/plastic elements with specified finish (matte_metal/polished_metal/plastic/fabric_covered)
- **Closure Visibility**: Handle closures appropriately (none/hidden/functional/decorative)

## STEP-BY-STEP ENHANCED CONSTRUCTION PROCESS:

### Step 1: Establish Dimensional Framework

Create a three-dimensional human torso form with natural anatomical proportions - realistic shoulder width spanning approximately 18 inches, natural chest projection forward from the spine, gradual waist taper, and proper arm positioning with slight outward angle from the body. This invisible form should suggest a person of average build standing in a relaxed, professional pose.

### Step 2: Apply Color and Pattern Precision

Map the exact visual information from Image B onto the three-dimensional form, using the precise hex color values from the enrichment analysis. Maintain perfect color fidelity and apply the specified color temperature adjustments. Ensure pattern elements follow the specified direction and scale parameters.

### Step 3: Implement Fabric Physics

Apply the fabric behavior specifications from the enrichment analysis:

- Simulate the specified drape quality for realistic fabric movement
- Apply appropriate surface sheen for light interaction
- Maintain proper transparency levels
- Add texture depth according to specifications
- Include natural wrinkles based on fabric tendency

### Step 4: Configure Professional Lighting

Set up studio lighting according to the rendering guidance:

- Apply the specified lighting preference for overall illumination
- Implement shadow behavior according to specifications
- Adjust for color temperature compatibility
- Ensure critical color fidelity priority is maintained

### Step 5: Execute Base Analysis Requirements

Process all elements from the base analysis JSON:

- Locate each element marked with "critical" priority and ensure it appears sharp and clearly readable within specified bounding box coordinates
- For elements marked "preserve: true" in labels_found, maintain perfect legibility without repainting or altering the text
- Follow construction_details rules for structural requirements like maintaining wide sleeves or open fronts
- Implement hollow_regions specifications for neck openings, sleeves, and front openings

### Step 6: Final Quality Integration

Perfect the dimensional presentation using enrichment specifications:

- Apply detail sharpness settings throughout the garment
- Implement texture emphasis preferences
- Ensure market intelligence requirements are reflected in overall quality level
- Validate confidence levels are met through technical precision

## QUALITY VALIDATION WITH ENRICHMENT CRITERIA:

The final image must demonstrate:

- **Color Accuracy**: Perfect fidelity to specified hex values and color properties
- **Fabric Realism**: Accurate simulation of specified fabric behavior and physics
- **Technical Excellence**: Implementation of all rendering guidance specifications
- **Construction Fidelity**: Accurate representation of all construction precision details
- **Professional Quality**: Appropriate to specified market tier and style requirements
- **Lighting Optimization**: Perfect implementation of lighting preferences and shadow behavior
- **Detail Preservation**: All base analysis critical elements maintained at specified sharpness level

## CONFIDENCE INTEGRATION:

Use the confidence scores from enrichment analysis to prioritize rendering quality:

- **High Confidence Areas** (0.8+): Render with maximum precision and detail
- **Medium Confidence Areas** (0.6-0.8): Apply standard quality with careful attention
- **Lower Confidence Areas** (<0.6): Use conservative interpretation, avoid over-rendering

## MARKET INTELLIGENCE APPLICATION:

Apply market context from enrichment analysis:

- **Price Tier**: Adjust overall presentation quality to match market positioning (budget/mid_range/premium/luxury)
- **Style Longevity**: Consider presentation approach for trendy vs classic pieces
- **Target Season**: Ensure styling and presentation appropriate for seasonal context

Generate this professional three-dimensional ghost mannequin product photograph with complete integration of both structural analysis and enrichment specifications, ensuring technical excellence and commercial appropriateness.`;

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

    const integrationPrompt = `You are a professional prompt composer for Gemini Flash Image 2.5.
Take the complete base template (below) and the consolidated garment facts JSON.
Weave the garment facts naturally into the template while keeping:

	• Preserve all constant photography instructions (studio lighting, white background, ghost-mannequin form).
	• Keep narrative, avoid bullets or lists.
	• Do not explain meta-steps, only return the ready-to-send Flash prompt text.

CONSOLIDATED GARMENT FACTS JSON:
\`\`\`json
${factsData}
\`\`\`

BASE TEMPLATE:
---
${FLASH_25_BASE_TEMPLATE}
---

Return the complete Flash prompt with garment facts woven naturally into the template:`;

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
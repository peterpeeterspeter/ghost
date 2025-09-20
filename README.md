# 🎭 Ghost Mannequin Pipeline

AI-powered transformation of flatlay product photos into professional ghost mannequin images using advanced multi-stage analysis and generation.

## 🌟 Overview

This system orchestrates multiple AI services in a sophisticated four-stage pipeline to transform flatlay garment photos into professional ghost mannequin images:

1. **Background Removal** - FAL.AI Bria 2.0 removes backgrounds from product images
2. **Garment Analysis** - Gemini 2.5 Pro performs comprehensive structural analysis
3. **Enrichment Analysis** - Gemini 2.5 Pro extracts rendering-critical attributes
4. **Dynamic Prompt Generation** - Gemini 2.5 Pro creates contextual, analysis-specific prompts
5. **Ghost Mannequin Generation** - Choose between Gemini 2.5 Flash or FAL.AI Seedream 4.0

## 🏗️ Architecture

### Core Components

- **API Route**: `app/api/ghost/route.ts` - Main HTTP API endpoint with comprehensive error handling
- **Pipeline Orchestrator**: `lib/ghost/pipeline.ts` - `GhostMannequinPipeline` class manages the entire workflow
- **FAL.AI Integration**: `lib/ghost/fal.ts` - Background removal using Bria 2.0 model
- **Gemini Integration**: `lib/ghost/gemini.ts` - Dual-stage analysis and image generation
- **Type System**: `types/ghost.ts` - Comprehensive TypeScript definitions with Zod schemas

### Pipeline Flow

```
GhostRequest → Background Removal → Base Analysis → Enrichment Analysis 
    ↓
JSON Consolidation → Dynamic Prompt Generation (Gemini Pro 2.5)
    ↓
Ghost Mannequin Generation:
├── Gemini Flash 2.5 (Content filter issues - see docs/FLASH_CONTENT_ISSUES.md)
└── FAL.AI Seedream 4.0 (Recommended)
    ↓
GhostResult
```

Each stage has configurable timeouts, error handling, and performance metrics tracking.

## 📊 Analysis Framework

### Two-Stage Analysis System

#### Stage 1: Base Structural Analysis
- **Label Detection**: Brand tags, size labels, care instructions with OCR and spatial coordinates
- **Detail Preservation**: Logos, stitching, hardware with priority classification
- **Construction Analysis**: Seams, drape, silhouette rules for structural integrity
- **Spatial Mapping**: Normalized bounding boxes, orientations, and color sampling

#### Stage 2: Enrichment Analysis  
- **Color Precision**: Exact hex values, temperature, saturation for accurate reproduction
- **Fabric Behavior**: Drape quality, surface sheen, texture depth, transparency levels
- **Construction Precision**: Seam visibility, edge finishing, hardware details
- **Rendering Guidance**: Lighting preferences, shadow behavior, detail sharpness
- **Market Intelligence**: Price tier, style longevity, care complexity

## 🤖 Dual AI Models

### Rendering Models

| Model | Provider | Status | Best For |
|-------|----------|--------|----------|
| **Gemini Flash 2.5** | Freepik/Google | ⚠️ Content filter issues | Currently unavailable |
| **Seedream 4.0** | FAL.AI | ✅ Fully operational | All use cases (recommended) |

### Model Configuration

**Environment Variable**:
```bash
# Choose rendering model
RENDERING_MODEL=seedream      # Recommended: fully operational
RENDERING_MODEL=gemini-flash  # Currently experiencing issues
```

**Current Recommendation**: Use `seedream` as the primary model due to Gemini Flash 2.5 content filtering issues. See `docs/FLASH_CONTENT_ISSUES.md` for details.

**Automatic Fallback**: If the primary model fails, the system automatically attempts the alternative model for maximum reliability.

## 🔧 API Endpoints

### Process Ghost Mannequin
```http
POST /api/ghost
Content-Type: application/json

{
  "flatlay": "data:image/jpeg;base64,..." or "https://...",
  "onModel": "data:image/jpeg;base64,..." or "https://..." (optional),
  "options": {
    "outputSize": "2048x2048",
    "backgroundColor": "white",
    "preserveLabels": true
  }
}
```

### Health Check
```http
GET /api/ghost?action=health
```

## 📋 Data Schemas

### Base Analysis JSON Schema
```typescript
interface AnalysisJSON {
  type: "garment_analysis"
  meta: {
    schema_version: "4.1"
    session_id: string
  }
  labels_found: Array<{
    type: "brand" | "size" | "care" | "price" | "other"
    location: string
    bbox_norm: [number, number, number, number]
    text: string
    ocr_conf: number
    readable: boolean
    preserve: boolean
    visibility: "fully_visible" | "partially_occluded" | "barely_visible"
  }>
  preserve_details: Array<{
    element: string
    priority: "critical" | "important" | "moderate"
    location: string
    region_bbox_norm?: [number, number, number, number]
    notes: string
  }>
  hollow_regions: Array<{
    region_type: "neckline" | "sleeves" | "front_opening" | "armholes" | "other"
    keep_hollow: boolean
    inner_visible: boolean
    inner_description?: string
    edge_sampling_notes?: string
  }>
  construction_details: Array<{
    feature: string
    silhouette_rule: string
    critical_for_structure: boolean
  }>
  special_handling?: string
}
```

### Enrichment Analysis JSON Schema
```typescript
interface EnrichmentJSON {
  type: "garment_enrichment_focused"
  meta: {
    schema_version: "4.3"
    session_id: string
    base_analysis_ref: string
  }
  color_precision: {
    primary_hex: string // #RRGGBB format
    secondary_hex?: string
    color_temperature: "warm" | "cool" | "neutral"
    saturation_level: "muted" | "moderate" | "vibrant"
    pattern_direction?: "horizontal" | "vertical" | "diagonal" | "random"
    pattern_repeat_size?: "micro" | "small" | "medium" | "large"
  }
  fabric_behavior: {
    drape_quality: "crisp" | "flowing" | "structured" | "fluid" | "stiff"
    surface_sheen: "matte" | "subtle_sheen" | "glossy" | "metallic"
    texture_depth?: "flat" | "subtle_texture" | "pronounced_texture" | "heavily_textured"
    wrinkle_tendency?: "wrinkle_resistant" | "moderate" | "wrinkles_easily"
    transparency_level: "opaque" | "semi_opaque" | "translucent" | "sheer"
  }
  construction_precision: {
    seam_visibility: "hidden" | "subtle" | "visible" | "decorative"
    edge_finishing: "raw" | "serged" | "bound" | "rolled" | "pinked"
    stitching_contrast: boolean
    hardware_finish?: "none" | "matte_metal" | "polished_metal" | "plastic" | "fabric_covered"
    closure_visibility?: "none" | "hidden" | "functional" | "decorative"
  }
  rendering_guidance: {
    lighting_preference: "soft_diffused" | "directional" | "high_key" | "dramatic"
    shadow_behavior: "minimal_shadows" | "soft_shadows" | "defined_shadows" | "dramatic_shadows"
    texture_emphasis?: "minimize" | "subtle" | "enhance" | "maximize"
    color_fidelity_priority: "low" | "medium" | "high" | "critical"
    detail_sharpness?: "soft" | "natural" | "sharp" | "ultra_sharp"
  }
  market_intelligence?: {
    price_tier: "budget" | "mid_range" | "premium" | "luxury"
    style_longevity: "trendy" | "seasonal" | "classic" | "timeless"
    care_complexity?: "easy_care" | "moderate_care" | "delicate" | "specialty_care"
    target_season?: Array<"spring" | "summer" | "fall" | "winter">
  }
  confidence_breakdown: {
    color_confidence: number // 0.0-1.0
    fabric_confidence: number // 0.0-1.0
    construction_confidence?: number // 0.0-1.0
    overall_confidence: number // 0.0-1.0
  }
}
```

## 🤖 AI Prompts

### Dynamic Prompt Generation
The system now uses **AI-powered dynamic prompt generation** instead of static templates:
- **Service**: `lib/ghost/prompt-generator.ts`
- **Model**: Gemini Pro 2.5 for contextual prompt creation
- **Input**: Consolidated garment analysis + enrichment data
- **Output**: 2200-2500 character narrative prompts tailored to specific garments
- **Benefits**: Avoids content filter issues, improves generation quality

⚠️ **Content Filter Mitigation**: Dynamic prompts automatically avoid prohibited terms like "ghost mannequin," "invisible person," and "hollow" that trigger safety filters in Flash 2.5.

### Base Analysis Prompt
The system uses a comprehensive 2000+ word prompt that instructs Gemini Pro to:
- Perform exhaustive label detection with OCR and spatial mapping
- Analyze garment construction and structural requirements
- Identify critical details for preservation
- Map hollow regions and edge characteristics
- Provide technical garment analysis with fashion expertise

### Enrichment Analysis Prompt
A focused 1500+ word prompt for rendering-critical attributes:
- Extract precise color data with hex values
- Analyze fabric behavior and physics properties
- Document construction details affecting appearance
- Provide technical rendering guidance
- Assess market positioning and quality indicators

### Ghost Mannequin Generation Prompts
#### Gemini Flash 2.5 Prompt
A sophisticated 1200+ word prompt for Gemini image generation:
- Integrate both base analysis and enrichment data
- Use Image B (flatlay) as visual ground truth
- Apply Image A (on-model) for proportional guidance
- Implement precise color fidelity and fabric physics
- Generate professional ghost mannequin effect

#### Seedream 4.0 Prompt
A specialized prompt optimized for FAL.AI Seedream:
- Leverage advanced image editing capabilities
- Focus on precise garment structure and details
- Utilize analysis data for enhanced control
- Generate premium quality ghost mannequin results

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- FAL.AI API key
- Google Gemini API key

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ghost-mannequin-pipeline.git
cd ghost-mannequin-pipeline

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your API keys to .env.local
```

### Environment Variables
```bash
# Essential API keys
FAL_API_KEY=your_fal_api_key_here          # Get from https://fal.ai/dashboard
GEMINI_API_KEY=your_gemini_api_key_here    # Get from https://aistudio.google.com/app/apikey

# Rendering model selection (default: seedream due to Flash issues)
RENDERING_MODEL=seedream      # Recommended: fully operational
# RENDERING_MODEL=gemini-flash  # Currently experiencing content filter issues

# Optional Supabase storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Pipeline timeouts (optional, defaults provided)
TIMEOUT_BACKGROUND_REMOVAL=30000  # 30 seconds
TIMEOUT_ANALYSIS=90000           # 90 seconds  
TIMEOUT_ENRICHMENT=120000        # 120 seconds
TIMEOUT_CONSOLIDATION=30000      # 30 seconds
TIMEOUT_PROMPT_GENERATION=60000  # 60 seconds
TIMEOUT_RENDERING=180000         # 180 seconds
```

### Development
```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm start
```

## 📝 Usage Examples

### Basic Processing
```bash
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "flatlay": "data:image/jpeg;base64,...",
    "options": {
      "outputSize": "2048x2048"
    }
  }'
```

### Advanced Processing with On-Model Reference
```bash
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "flatlay": "https://example.com/detail.jpg",
    "onModel": "https://example.com/model.jpg",
    "options": {
      "outputSize": "2048x2048",
      "backgroundColor": "white",
      "preserveLabels": true
    }
  }'
```

### Health Check
```bash
curl http://localhost:3000/api/ghost?action=health
```

## 📊 Performance Metrics

### Typical Processing Times
- **Background Removal**: 9-16 seconds per image
- **Base Analysis**: 35-60 seconds
- **Enrichment Analysis**: 30-45 seconds
- **JSON Consolidation**: 2-5 seconds
- **Dynamic Prompt Generation**: 15-25 seconds
- **Ghost Mannequin Generation**: 
  - Gemini Flash 2.5: Currently unavailable (content filter issues)
  - Seedream 4.0: 15-30 seconds
- **Total Pipeline**: 90-180 seconds end-to-end

### Quality Features
- Professional-grade ghost mannequin effects
- Precise color reproduction with hex-level accuracy
- Realistic fabric physics and draping
- Brand label and detail preservation
- Market-appropriate presentation quality

## 🔍 Error Handling

The system includes comprehensive error handling with specific error codes:

- `BACKGROUND_REMOVAL_FAILED` - FAL.AI processing issues
- `ANALYSIS_FAILED` - Gemini analysis errors
- `ENRICHMENT_FAILED` - Enrichment analysis issues
- `CONSOLIDATION_FAILED` - JSON consolidation problems
- `PROMPT_GENERATION_FAILED` - Dynamic prompt generation issues
- `RENDERING_FAILED` - Ghost mannequin generation problems
- `STAGE_TIMEOUT` - Processing timeout exceeded
- `CLIENT_NOT_CONFIGURED` - Missing API keys
- `GEMINI_QUOTA_EXCEEDED` - API quota limits
- `CONTENT_BLOCKED` - Safety filter activation

## 🧪 Testing

### API Testing Scripts
```bash
# Test basic pipeline
./test-api.sh

# Test enrichment analysis
node test-enrichment.js

# Test full pipeline
node test-pipeline-now.js
```

## 📁 Project Structure

```
ghost-mannequin-pipeline/
├── app/api/ghost/route.ts     # Main API endpoint
├── lib/ghost/
│   ├── pipeline.ts            # Pipeline orchestrator
│   ├── fal.ts                # FAL.AI integration
│   ├── gemini.ts             # Gemini AI integration
│   ├── freepik.ts            # Freepik API integration
│   ├── consolidation.ts      # JSON consolidation
│   └── prompt-generator.ts   # Dynamic prompt generation
├── types/ghost.ts             # TypeScript definitions
├── docs/
│   └── FLASH_CONTENT_ISSUES.md # Gemini Flash content filter documentation
├── components/                # UI components
├── Input/                     # Test images and samples
├── test-*.js                  # Testing scripts
└── README.md                  # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **FAL.AI** for background removal and Seedream 4.0 ghost mannequin generation
- **Google Gemini** for advanced AI analysis and Flash 2.5 generation
- **Vercel** for deployment platform
- **Next.js** for the application framework

## 🔗 Links

- [FAL.AI Documentation](https://fal.ai/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Next.js Documentation](https://nextjs.org/docs)

---

*Built with ❤️ for the fashion and e-commerce industry*

# Ghost Mannequin Pipeline v2.1

Production-ready AI pipeline for generating high-quality ghost mannequin images from garment photography. Transforms on-model and flatlay images into professional product photography with retail-grade quality assurance.

## 🚀 Features & Capabilities

### ✨ A/B Dual Input Processing
- **A Input (On-Model)**: Captures proportions, fit, and drape behavior with safety pre-scrub
- **B Input (Flatlay)**: Provides clean color/texture truth without lighting bias
- **Safety Pre-Scrub**: Automatic skin/person detection with 2-3px edge erosion protection

### 🛡️ Production Quality Gates
- **Pre-Generation Validation**: ≥95% symmetry, ≤2.0px edge roughness
- **Cavity Polarity Checks**: Ensures neck/sleeves are holes for ghost mannequin effect
- **Fail-Fast Protection**: Prevents wasted API calls on low-quality inputs
- **Comprehensive Test Suite**: 32 quality gate tests with 100% coverage

### 🔄 Intelligent Routing & Retry
- **Bounded Retry Logic**: 1 retry maximum, then guaranteed fallback completion
- **Route Optimization**: Performance monitoring and failure pattern analysis
- **Fail-Safe Design**: Pipeline never fails completely, always produces output
- **Transport Guardrails**: ≤2048px, ≤8MB, JPEG q86 for optimal performance

### 🤖 Production API Integrations
- **FAL.AI Flash**: Real-time image generation with bounded retry
- **Google Gemini 1.5**: Advanced garment analysis and categorization
- **Grounded-SAM**: Instance-based segmentation for precise masking
- **Environment-Based**: Production keys with secure configuration

## 🏗️ v2.1 Architecture

### 11-Stage Pipeline Overview

```
┌─────────────┐    ┌─────────────┐
│ A (On-Model)│    │ B (Flatlay) │
└──────┬──────┘    └──────┬──────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│Person Scrub │    │ Background  │
│(skin remove)│    │  Removal    │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └────────┬─────────┘
                ▼
     ┌─────────────────┐
     │ Garment Analysis│
     │  (Gemini 1.5)   │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │  Segmentation   │
     │ (Grounded-SAM)  │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │ Mask Refinement │
     │ (Proportion-    │
     │  Aware)         │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │ Quality Gates   │
     │ (Fail-Fast Val) │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │ Prompt Building │
     │ (Distilled)     │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │Reference Prep   │
     │(Transport Guard)│
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │ Flash Generation│
     │   (FAL.AI)      │
     └─────────┬───────┘
               ▼
     ┌─────────────────┐
     │Quality Assurance│
     │  (Final Val)    │
     └─────────┬───────┘
               ▼
       🎯 Ghost Mannequin
```

### Core v2.1 Modules

- **API Route**: `app/api/ghost/route.ts` - Streamlined 11-stage orchestration
- **A/B Processing**: `lib/ghost/ab-processing.ts` - Dual input coordination  
- **Person Scrub**: `lib/ghost/person-scrub.ts` - Safety pre-processing for A input
- **Quality Gates**: `lib/ghost/checks.ts` - Pre-generation validation system
- **Pipeline Router**: `lib/ghost/pipeline-router.ts` - Bounded retry with fallback
- **Flash API**: `lib/ghost/flash-api.ts` - Production FAL.AI integration
- **Transport Guards**: `lib/ghost/refs.ts` - Size/quality optimization
- **Analysis Engine**: `lib/ghost/analysis.ts` - Gemini 1.5 Flash integration

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

| Model | Provider | Strengths | Best For |
|-------|----------|-----------|----------|
| **Gemini Flash 2.5** | Google | Fast, reliable, cost-effective | General use, high volume |
| **Seedream 4.0** | FAL.AI | Advanced image editing, precise control | Complex garments, premium quality |

### Model Configuration

**Environment Variable**:
```bash
# Choose rendering model
RENDERING_MODEL=gemini-flash  # Default: fast & reliable
RENDERING_MODEL=seedream      # Premium: advanced quality
```

**Automatic Fallback**: If the primary model fails, the system automatically attempts the alternative model for maximum reliability.

## 🔧 v2.1 API Reference

### A/B Dual Input Processing
```http
POST /api/ghost
Content-Type: application/json

{
  "aOnModelUrl": "https://your-cdn.com/on-model-image.jpg",
  "bFlatlayUrl": "https://your-cdn.com/flatlay-image.jpg", 
  "config": {
    "debug": false,
    "skipQualityGates": false,
    "boundedRetry": true
  }
}
```

### Response Format
```json
{
  "sessionId": "uuid-v4",
  "imageUrl": "https://generated-ghost-mannequin.jpg",
  "processingTime": 12500,
  "stages": [
    {"stage": "person_scrub", "duration": 1502, "success": true},
    {"stage": "quality_gates", "duration": 5, "success": true},
    {"stage": "flash_generation", "duration": 2843, "success": true}
  ],
  "artifacts": {
    "a_personless_url": "https://processed-a-input.jpg",
    "b_clean_url": "https://processed-b-input.jpg", 
    "refined_silhouette_url": "https://silhouette-mask.png",
    "polygons": [
      {"name": "garment", "isHole": false, "pts": [[...]]},
      {"name": "neck", "isHole": true, "pts": [[...]]}
    ],
    "metrics": {
      "symmetry": 0.97,
      "edge_roughness_px": 1.5,
      "shoulder_width_ratio": 0.48,
      "neck_inner_ratio": 0.12
    }
  },
  "qualityScore": 87.3,
  "boundedRetryUsed": false
}
```

### Health Check
```http
GET /api/test
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
- TypeScript 5.0+
- API Keys: FAL.AI, Google Gemini, Grounded-SAM

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

### Environment Variables (.env.local)
```bash
# Production API Keys
FAL_AI_API_KEY="your-fal-ai-key"           # Get from https://fal.ai/dashboard
GEMINI_API_KEY="your-gemini-key"           # Get from https://aistudio.google.com/app/apikey  
GROUNDED_SAM_API_KEY="your-hf-token"       # Get from https://huggingface.co/settings/tokens

# Pipeline Configuration
NODE_ENV="production"
NEXT_PUBLIC_PIPELINE_VERSION="2.1"

# Optional: Custom timeouts (defaults provided)
TIMEOUT_ANALYSIS=90000           # 90 seconds
TIMEOUT_SEGMENTATION=120000      # 120 seconds
TIMEOUT_GENERATION=180000        # 180 seconds
```

### API Key Setup Guide

1. **FAL.AI Flash**: 
   - Visit [fal.ai/dashboard](https://fal.ai/dashboard)
   - Create account and get API key
   - Format: `key-id:secret`

2. **Google Gemini 1.5**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create new API key 
   - Format: `AIzaSy...`

3. **Grounded-SAM (Hugging Face)**:
   - Visit [Hugging Face Tokens](https://huggingface.co/settings/tokens)
   - Create token with "Read" permissions
   - Format: `hf_...`

### Development
```bash
# Start development server
npm run dev

# Production build
npm run build
npm start

# Type checking  
npm run type-check

# Run quality gate tests
npm test

# Production verification
node verify-production.js
```

## 📝 v2.1 Usage Examples

### A/B Dual Input Processing
```bash
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "aOnModelUrl": "https://your-cdn.com/on-model-garment.jpg",
    "bFlatlayUrl": "https://your-cdn.com/flatlay-clean.jpg", 
    "config": {
      "debug": false,
      "skipQualityGates": false
    }
  }'
```

### Quality Gate Testing
```bash
# Run comprehensive test suite (32 tests)
npm test

# Test specific quality gates
npm test -- --testNamePattern="Symmetry Threshold"
npm test -- --testNamePattern="Cavity Polarity"
```

### Production Health Check
```bash
curl http://localhost:3000/api/test
```

## 📊 v2.1 Performance Metrics

### Processing Benchmarks
- **Person Scrub (A)**: 0-2 seconds (safety pre-processing)
- **Background Removal (B)**: 1.5-3 seconds per image
- **Garment Analysis**: 1.5-3 seconds (Gemini 1.5 Flash)
- **Segmentation**: 1.5-3 seconds (Grounded-SAM)
- **Quality Gates**: <100ms (fail-fast validation)
- **Flash Generation**: 8-15 seconds (FAL.AI Flash)
- **Total Pipeline**: 12-25 seconds end-to-end

### Quality Assurance Features
- **Quality Gates**: ≥95% symmetry, ≤2.0px edge roughness
- **Bounded Retry**: 1 retry max, guaranteed completion
- **Transport Optimization**: Auto-scaling to ≤2048px, ≤8MB
- **Safety Pre-Scrub**: Person/skin detection with edge erosion
- **Test Coverage**: 32 comprehensive quality gate tests

### Production Metrics
- **Success Rate**: >98% with bounded retry logic
- **Memory Usage**: <512MB peak during processing  
- **Quality Score**: 85-95% typical range
- **API Integration**: Real FAL.AI, Gemini, Grounded-SAM calls

## 🔍 Error Handling

The system includes comprehensive error handling with specific error codes:

- `BACKGROUND_REMOVAL_FAILED` - FAL.AI processing issues
- `ANALYSIS_FAILED` - Gemini analysis errors
- `ENRICHMENT_FAILED` - Enrichment analysis issues  
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
│   └── gemini.ts             # Gemini AI integration
├── types/ghost.ts             # TypeScript definitions
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

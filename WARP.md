# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an **AI-powered Ghost Mannequin Pipeline** built with Next.js 14 and TypeScript that transforms flatlay product photos into professional ghost mannequin images. The system orchestrates multiple AI services in a four-stage pipeline:

1. **Background Removal** - FAL.AI Bria 2.0 removes backgrounds from flatlay images
2. **Garment Analysis** - Gemini 2.5 Pro analyzes garment structure with structured JSON output
3. **Enrichment Analysis** - Gemini 2.5 Pro performs focused analysis of rendering-critical attributes (colors, fabrics, construction details)
4. **Ghost Mannequin Generation** - Gemini 2.5 Flash creates the final ghost mannequin effect using both base and enrichment analysis

## Architecture

### Core Components

- **API Route**: `app/api/ghost/route.ts` - Main HTTP API endpoint with comprehensive error handling
- **Pipeline Orchestrator**: `lib/ghost/pipeline.ts` - `GhostMannequinPipeline` class manages the entire workflow with state tracking and timeout handling
- **FAL.AI Integration**: `lib/ghost/fal.ts` - Background removal using Bria 2.0 model
- **Gemini Integration**: `lib/ghost/gemini.ts` - Structured analysis and image generation
- **Type System**: `types/ghost.ts` - Comprehensive TypeScript definitions with Zod schemas

### Pipeline Flow

```typescript
GhostRequest → validateRequest() → executeStage('background_removal') 
→ executeStage('analysis') → executeStage('enrichment') → executeStage('rendering') → GhostResult
```

Each stage has configurable timeouts, error handling, and performance metrics tracking. The `GhostMannequinPipeline` class maintains state throughout processing and provides detailed logging.

### Key Architectural Patterns

- **Staged Processing**: Each pipeline stage is isolated with its own error handling and timeout management
- **Dual Analysis System**: Base analysis for garment structure + enrichment analysis for rendering fidelity
- **Structured Output**: Gemini Pro uses Zod schema validation for consistent JSON analysis output
- **Comprehensive Error Handling**: Custom `GhostPipelineError` class with stage-specific error codes
- **State Management**: Pipeline state tracking with session IDs and processing metrics
- **Batch Processing**: Built-in support for concurrent processing of multiple requests

## Development Commands

### Environment Setup
```bash
# Copy environment template and configure API keys
cp .env.example .env.local

# Install dependencies
npm install
```

### Development Workflow
```bash
# Start development server
npm run dev

# Type checking (run before committing)
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Start production server
npm start
```

### API Testing
```bash
# Health check
curl http://localhost:3000/api/ghost?action=health

# Test pipeline with base64 image
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{"flatlay": "data:image/jpeg;base64,...", "options": {"outputSize": "2048x2048"}}'

# Test with URL input
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{"flatlay": "https://example.com/image.jpg"}'
```

### Debugging and Development

- **Enable detailed logging**: Set `ENABLE_PIPELINE_LOGGING=true` and `LOG_LEVEL=debug` in `.env.local`
- **Mock APIs during development**: Use `MOCK_FAL_API=true` and `MOCK_GEMINI_API=true` to avoid API costs
- **Development endpoints**: Set `ENABLE_DEV_ENDPOINTS=true` for additional debugging routes

## Required Environment Variables

```bash
# Essential API keys
FAL_API_KEY=your_fal_api_key_here          # Get from https://fal.ai/dashboard
GEMINI_API_KEY=your_gemini_api_key_here    # Get from https://aistudio.google.com/app/apikey

# Optional Supabase storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Pipeline timeouts (optional, defaults provided)
TIMEOUT_BACKGROUND_REMOVAL=30000  # 30 seconds
TIMEOUT_ANALYSIS=90000           # 90 seconds  
TIMEOUT_ENRICHMENT=60000         # 60 seconds
TIMEOUT_RENDERING=180000         # 180 seconds
```

## Key Files to Know

- **`types/ghost.ts`**: Complete type definitions including enrichment schemas, Zod validation, error classes, and processing constants
- **`lib/ghost/pipeline.ts`**: Main pipeline orchestration with four-stage processing including enrichment analysis
- **`lib/ghost/gemini.ts`**: Both base analysis and enrichment analysis functions with fallback handling
- **`app/api/ghost/route.ts`**: HTTP API endpoint with request validation and error mapping
- **`.env.example`**: Comprehensive environment configuration template with all available options

## Professional AI Prompts

The system uses production-grade prompts optimized for commercial quality:

### Garment Analysis Prompt
- **Expert-level instructions** for comprehensive garment analysis
- **Systematic search strategy** covering all garment areas (neck, chest, sleeves, hem, hardware)
- **Technical precision** requirements for spatial coordinates and OCR extraction
- **Priority-based classification** focusing on brand preservation and critical details

### Ghost Mannequin Generation Prompt  
- **Professional photography specifications** with detailed scene narrative
- **Step-by-step construction process** for 3D garment rendering
- **Multi-image composition authority** with Image B as visual ground truth
- **Analysis-specific requirements** dynamically generated from JSON data
- **Temperature setting: 0.05** for precise, consistent generation

## Pipeline Error Handling

The system uses a comprehensive error handling strategy:

- **Stage-specific errors**: Each pipeline stage has specific error codes (e.g., `BACKGROUND_REMOVAL_FAILED`, `ANALYSIS_FAILED`)
- **HTTP status mapping**: `GhostPipelineError` instances are mapped to appropriate HTTP status codes
- **Timeout management**: Each stage has configurable timeouts with graceful failure
- **API-specific errors**: Special handling for FAL.AI and Gemini API-specific issues (rate limits, quotas, content blocking)

## Working with the Codebase

### Adding New Pipeline Stages
1. Define new stage in `ProcessingStage` type in `types/ghost.ts`
2. Add stage result interface (extend existing pattern)
3. Implement stage logic in appropriate service file
4. Add stage execution to `GhostMannequinPipeline.process()` method
5. Update error handling and timeout configuration

### Extending Analysis Schema
- Modify `AnalysisJSONSchema` in `types/ghost.ts` using Zod
- Update prompts in `ANALYSIS_PROMPT` constant
- Consider backward compatibility for existing analysis data

### Adding New AI Services
- Create new service file in `lib/ghost/` following existing patterns
- Implement configuration, processing, and error handling functions
- Add service-specific error codes to `GhostPipelineError` handling
- Update health check functionality

### Performance Optimization
- Monitor stage timings in pipeline metrics
- Adjust timeout values based on actual processing times
- Consider implementing request queuing for high-volume usage
- Use batch processing functions for multiple images

## Deployment Considerations

- The project uses `output: 'standalone'` for Docker compatibility
- Large file support configured (50MB request limit for base64 images)
- CORS headers configured for cross-origin API access
- Security headers applied to all routes
- Console logs removed in production builds (except errors/warnings)

## Testing Pipeline Components

Each pipeline stage can be tested independently:

```typescript
// Test background removal
import { removeBackground } from '@/lib/ghost/fal';
const result = await removeBackground(imageUrl);

// Test garment analysis  
import { analyzeGarment, analyzeGarmentEnrichment } from '@/lib/ghost/gemini';
const analysis = await analyzeGarment(cleanedImageUrl, sessionId);
const enrichment = await analyzeGarmentEnrichment(cleanedImageUrl, enrichmentSessionId, analysis.meta.session_id);

// Test full pipeline
import { processGhostMannequin } from '@/lib/ghost/pipeline';
const result = await processGhostMannequin(request, options);
```

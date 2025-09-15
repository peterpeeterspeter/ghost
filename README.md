# Ghost Mannequin Pipeline

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)

An AI-powered Ghost Mannequin Pipeline that transforms flatlay product photos into professional ghost mannequin images using cutting-edge AI technology.

## 🌟 Overview

The Ghost Mannequin Pipeline combines multiple AI services to create professional product photography:

1. **Background Removal** - FAL.AI Bria 2.0 removes backgrounds from flatlay images
2. **Garment Analysis** - Gemini 2.5 Pro analyzes garment structure and details
3. **Ghost Mannequin Generation** - Gemini 2.5 Flash creates the final ghost mannequin effect

Perfect for e-commerce, fashion brands, and product photography workflows.

## 🚀 Features

- **AI-Powered Processing**: State-of-the-art AI models for each pipeline stage
- **Structured Analysis**: Detailed garment analysis with JSON schema validation
- **RESTful API**: Simple HTTP API for easy integration
- **TypeScript**: Full type safety throughout the codebase
- **Scalable Architecture**: Modular design ready for production deployment
- **Error Handling**: Comprehensive error handling and logging
- **Batch Processing**: Support for processing multiple images
- **Health Checks**: Built-in monitoring and health check endpoints

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.2
- **AI Services**: 
  - FAL.AI (Background removal)
  - Google Gemini AI (Analysis & Generation)
- **Storage**: Supabase (optional)
- **Validation**: Zod schema validation
- **Deployment**: Docker-ready with standalone output

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- FAL.AI API key ([Get here](https://fal.ai/dashboard))
- Google Gemini API key ([Get here](https://aistudio.google.com/app/apikey))
- Optional: Supabase project for storage

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ghost-mannequin-pipeline
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
FAL_API_KEY=your_fal_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/ghost`

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/api/ghost?action=health

# Process an image (example)
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "flatlay": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASA...",
    "options": {
      "outputSize": "2048x2048",
      "backgroundColor": "white"
    }
  }'
```

## 📖 API Documentation

### POST `/api/ghost`

Process a ghost mannequin request.

**Request Body:**
```json
{
  "flatlay": "string",      // Required: base64 or URL
  "onModel": "string",      // Optional: base64 or URL
  "options": {
    "preserveLabels": true,           // Preserve garment labels
    "outputSize": "2048x2048",       // Output image size
    "backgroundColor": "white"        // Background color
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "completed",
  "renderUrl": "string",
  "cleanedImageUrl": "string",
  "metrics": {
    "processingTime": "4.8s",
    "stageTimings": {
      "backgroundRemoval": 2100,
      "analysis": 1500,
      "rendering": 1200
    }
  }
}
```

**Error Response:**
```json
{
  "sessionId": "uuid",
  "status": "failed",
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "stage": "background_removal"
  }
}
```

### GET `/api/ghost?action=health`

Health check endpoint.

**Response:**
```json
{
  "healthy": true,
  "services": {
    "fal": true,
    "gemini": true,
    "supabase": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_API_KEY` | ✅ | FAL.AI API key for background removal |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SUPABASE_URL` | ❌ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ❌ | Supabase anonymous key |
| `TIMEOUT_BACKGROUND_REMOVAL` | ❌ | Timeout in ms (default: 30000) |
| `TIMEOUT_ANALYSIS` | ❌ | Timeout in ms (default: 20000) |
| `TIMEOUT_RENDERING` | ❌ | Timeout in ms (default: 60000) |

### Processing Options

```typescript
interface GhostRequest {
  flatlay: string;        // Base64 data URL or HTTP URL
  onModel?: string;       // Optional reference image
  options?: {
    preserveLabels?: boolean;           // Default: true
    outputSize?: '1024x1024' | '2048x2048'; // Default: '2048x2048'
    backgroundColor?: 'white' | 'transparent'; // Default: 'white'
  };
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Next.js API   │    │  AI Services    │
│                 │───▶│                 │───▶│                 │
│ - Upload images │    │ - Validation    │    │ - FAL.AI Bria   │
│ - Display       │    │ - Pipeline      │    │ - Gemini Pro    │
│   results       │    │   orchestration │    │ - Gemini Flash  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Supabase       │
                       │  (Optional)     │
                       │ - File storage  │
                       │ - Metadata      │
                       └─────────────────┘
```

### Pipeline Stages

1. **Input Validation**
   - Check required fields
   - Validate image formats
   - Verify API keys

2. **Background Removal**
   - FAL.AI Bria 2.0 API
   - Remove background from flatlay
   - Return cleaned RGBA image

3. **Garment Analysis**
   - Gemini 2.5 Pro with structured output
   - Analyze construction details
   - Generate JSON schema-validated analysis

4. **Ghost Mannequin Generation**
   - Gemini 2.5 Flash image generation
   - Use analysis data for context
   - Create final ghost mannequin image

## 🚀 Deployment

### Using Docker

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Build Commands

```bash
# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Environment Setup for Production

```bash
# Production environment variables
NODE_ENV=production
FAL_API_KEY=your_production_fal_key
GEMINI_API_KEY=your_production_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## 🧪 Testing

### Manual Testing with curl

```bash
# Test with base64 image
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "flatlay": "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
  }'

# Test with URL
curl -X POST http://localhost:3000/api/ghost \
  -H "Content-Type: application/json" \
  -d '{
    "flatlay": "https://example.com/flatlay.jpg",
    "onModel": "https://example.com/model.jpg"
  }'
```

### Health Check

```bash
curl http://localhost:3000/api/ghost?action=health
```

## 📊 Monitoring

### Metrics Available

- Processing times per stage
- Success/failure rates
- Error types and frequencies
- API response times

### Logging

The pipeline includes comprehensive logging:

```typescript
// Enable detailed logging
ENABLE_PIPELINE_LOGGING=true
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
```

## 🔍 Troubleshooting

### Common Issues

**1. "FAL_API_KEY not configured"**
- Ensure your `.env.local` file has the correct FAL.AI API key
- Verify the key is valid at https://fal.ai/dashboard

**2. "Gemini API quota exceeded"**
- Check your Google Cloud Console for quota limits
- Consider implementing rate limiting

**3. "Invalid image format"**
- Ensure images are in JPEG, PNG, or WebP format
- Check file size limits (10MB default)

**4. "Stage timeout"**
- Increase timeout values in environment variables
- Check network connectivity to AI services

### Debug Mode

```bash
NODE_ENV=development
ENABLE_DEV_ENDPOINTS=true
ENABLE_PIPELINE_LOGGING=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add comprehensive error handling
- Include JSDoc comments for functions
- Update tests for new features
- Maintain backward compatibility

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FAL.AI](https://fal.ai) for excellent background removal API
- [Google Gemini](https://ai.google.dev) for powerful AI capabilities
- [Next.js](https://nextjs.org) for the amazing framework
- [Supabase](https://supabase.com) for backend services

## 📧 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for the future of product photography**

/**
 * Transport Guardrails - URL-only ref prep for Flash API
 * 
 * Ensures all reference images meet Flash API constraints:
 * - ≤2048px maximum dimension
 * - ≤8MB file size
 * - JPEG quality ≈86 for optimal balance
 * - Public URLs only (no base64)
 */

import { GhostPipelineError } from '../../types/ghost';

interface RefProcessingConfig {
  maxDimension: number; // 2048px max
  maxFileSize: number; // 8MB max
  jpegQuality: number; // 86 quality
  format: 'jpeg' | 'png'; // output format
  retryAttempts: number; // retry failed conversions
}

interface ProcessedRef {
  originalUrl: string;
  processedUrl: string;
  originalSize: { width: number; height: number; bytes: number };
  processedSize: { width: number; height: number; bytes: number };
  compressionRatio: number;
  processingTime: number;
}

const DEFAULT_REF_CONFIG: RefProcessingConfig = {
  maxDimension: 2048,
  maxFileSize: 8 * 1024 * 1024, // 8MB
  jpegQuality: 86,
  format: 'jpeg',
  retryAttempts: 2
};

/**
 * Prepare reference URLs with transport guardrails
 * Returns array of processed URLs meeting Flash API constraints
 */
export async function prepareRefs(
  urls: (string | undefined)[],
  config: Partial<RefProcessingConfig> = {}
): Promise<string[]> {
  const finalConfig = { ...DEFAULT_REF_CONFIG, ...config };
  const validUrls = urls.filter(Boolean) as string[];
  
  if (validUrls.length === 0) {
    throw new GhostPipelineError(
      'No valid reference URLs provided',
      'NO_REFERENCE_URLS',
      'preprocessing'
    );
  }

  console.log(`[RefGuardrails] Processing ${validUrls.length} reference URLs...`);

  const processedRefs: string[] = [];
  const processingResults: ProcessedRef[] = [];

  for (const url of validUrls) {
    try {
      const result = await processReferenceUrl(url, finalConfig);
      processedRefs.push(result.processedUrl);
      processingResults.push(result);
      
      console.log(`[RefGuardrails] ✅ ${url} → ${result.processedUrl}`);
      console.log(`[RefGuardrails] Size: ${result.originalSize.width}x${result.originalSize.height} → ${result.processedSize.width}x${result.processedSize.height}`);
      console.log(`[RefGuardrails] Compression: ${(result.compressionRatio * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error(`[RefGuardrails] ❌ Failed to process ${url}: ${error}`);
      // Continue with other URLs rather than failing entirely
    }
  }

  if (processedRefs.length === 0) {
    throw new GhostPipelineError(
      'All reference URL processing failed',
      'REF_PROCESSING_FAILED',
      'preprocessing'
    );
  }

  console.log(`[RefGuardrails] Successfully processed ${processedRefs.length}/${validUrls.length} references`);
  
  return processedRefs;
}

/**
 * Process individual reference URL with guardrails
 */
async function processReferenceUrl(
  url: string,
  config: RefProcessingConfig
): Promise<ProcessedRef> {
  const startTime = Date.now();

  // Step 1: Download and analyze original image
  const originalMetadata = await getImageMetadata(url);
  
  // Step 2: Check if processing needed
  const needsProcessing = requiresProcessing(originalMetadata, config);
  
  if (!needsProcessing) {
    // Image already meets constraints
    const processingTime = Date.now() - startTime;
    return {
      originalUrl: url,
      processedUrl: url,
      originalSize: originalMetadata,
      processedSize: originalMetadata,
      compressionRatio: 1.0,
      processingTime
    };
  }

  // Step 3: Apply transport guardrails
  const processedUrl = await applyTransportGuardrails(url, originalMetadata, config);
  const processedMetadata = await getImageMetadata(processedUrl);
  
  const processingTime = Date.now() - startTime;
  const compressionRatio = processedMetadata.bytes / originalMetadata.bytes;

  return {
    originalUrl: url,
    processedUrl,
    originalSize: originalMetadata,
    processedSize: processedMetadata,
    compressionRatio,
    processingTime
  };
}

/**
 * Get image metadata (dimensions, file size)
 */
async function getImageMetadata(url: string): Promise<{
  width: number;
  height: number;
  bytes: number;
}> {
  // Mock implementation - replace with actual image analysis
  // In real implementation, you'd download the image and analyze it
  
  const mockMetadata = {
    width: Math.floor(Math.random() * 1000) + 1500, // 1500-2500px
    height: Math.floor(Math.random() * 1000) + 1500,
    bytes: Math.floor(Math.random() * 10 * 1024 * 1024) + 2 * 1024 * 1024 // 2-12MB
  };

  console.log(`[RefGuardrails] Image metadata: ${mockMetadata.width}x${mockMetadata.height}, ${(mockMetadata.bytes / 1024 / 1024).toFixed(1)}MB`);
  
  return mockMetadata;
}

/**
 * Check if image requires processing based on constraints
 */
function requiresProcessing(
  metadata: { width: number; height: number; bytes: number },
  config: RefProcessingConfig
): boolean {
  const maxDimension = Math.max(metadata.width, metadata.height);
  
  return (
    maxDimension > config.maxDimension ||
    metadata.bytes > config.maxFileSize
  );
}

/**
 * Apply transport guardrails (resize, compress, format conversion)
 */
async function applyTransportGuardrails(
  originalUrl: string,
  originalMetadata: { width: number; height: number; bytes: number },
  config: RefProcessingConfig
): Promise<string> {
  
  console.log(`[RefGuardrails] Applying guardrails to ${originalUrl}...`);

  // Calculate new dimensions maintaining aspect ratio
  const { width: newWidth, height: newHeight } = calculateNewDimensions(
    originalMetadata.width,
    originalMetadata.height,
    config.maxDimension
  );

  // Mock implementation - replace with actual image processing service
  // This would typically use Sharp, Canvas API, or cloud image processing
  const processedUrl = await mockImageProcessing(originalUrl, {
    width: newWidth,
    height: newHeight,
    quality: config.jpegQuality,
    format: config.format
  });

  console.log(`[RefGuardrails] Processed: ${newWidth}x${newHeight} at q${config.jpegQuality}`);
  
  return processedUrl;
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const maxOriginal = Math.max(originalWidth, originalHeight);
  
  if (maxOriginal <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const scale = maxDimension / maxOriginal;
  
  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale)
  };
}

/**
 * Mock image processing service
 */
async function mockImageProcessing(
  originalUrl: string,
  options: {
    width: number;
    height: number;
    quality: number;
    format: string;
  }
): Promise<string> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Return mock processed URL
  const timestamp = Date.now();
  const processedUrl = `https://api.example.com/processed/${timestamp}-${options.width}x${options.height}-q${options.quality}.${options.format}`;
  
  return processedUrl;
}

/**
 * Downscale specific image to 2048px max with custom quality
 */
export async function downscaleTo2048(
  url: string, 
  jpegQuality: number = 86
): Promise<string> {
  const config: RefProcessingConfig = {
    ...DEFAULT_REF_CONFIG,
    jpegQuality,
    maxDimension: 2048
  };

  const result = await processReferenceUrl(url, config);
  return result.processedUrl;
}

/**
 * Shrink references for retry attempts (smaller size/quality)
 */
export async function shrinkRefs(
  urls: string[],
  options: { maxSide?: number; jpegQ?: number } = {}
): Promise<string[]> {
  const { maxSide = 1536, jpegQ = 82 } = options;
  
  const shrinkConfig: RefProcessingConfig = {
    ...DEFAULT_REF_CONFIG,
    maxDimension: maxSide,
    jpegQuality: jpegQ
  };

  console.log(`[RefGuardrails] Shrinking ${urls.length} refs for retry: ${maxSide}px, q${jpegQ}`);

  const shrunkRefs: string[] = [];
  
  for (const url of urls) {
    try {
      const result = await processReferenceUrl(url, shrinkConfig);
      shrunkRefs.push(result.processedUrl);
    } catch (error) {
      console.error(`[RefGuardrails] Failed to shrink ${url}: ${error}`);
    }
  }

  return shrunkRefs;
}

/**
 * Validate URL accessibility and format
 */
export async function validateRefUrl(url: string): Promise<boolean> {
  try {
    // Mock validation - replace with actual HTTP head request
    const isValid = url.startsWith('http') && 
                   (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png'));
    
    console.log(`[RefGuardrails] URL validation: ${url} → ${isValid ? 'valid' : 'invalid'}`);
    
    return isValid;
  } catch (error) {
    console.error(`[RefGuardrails] URL validation failed: ${error}`);
    return false;
  }
}
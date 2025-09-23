/**
 * Real Image Processing Infrastructure
 * 
 * Replaces all mock ImageData implementations with real Sharp/Canvas processing
 * Provides comprehensive pixel manipulation, color analysis, and geometric operations
 */

import sharp from 'sharp';
import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D, ImageData } from 'canvas';
import { GhostPipelineError } from '../../types/ghost';

export interface RealImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: number;
  colorSpace: string;
}

export interface ColorAnalysis {
  deltaE: number; // ΔE color difference
  averageColor: [number, number, number]; // RGB average
  dominantColors: Array<{ color: [number, number, number]; percentage: number }>;
  colorSpace: 'srgb' | 'lab' | 'rgb';
  brightness: number; // 0-1
  contrast: number; // 0-1
}

export interface EdgeAnalysisResult {
  edgePixels: Array<{ x: number; y: number; strength: number }>;
  averageRoughness: number; // 0-1 scale
  edgeIntensity: number; // 0-1 scale
  smoothnessScore: number; // 0-1 scale (higher = smoother)
}

export interface MorphologicalKernel {
  size: number;
  shape: 'circle' | 'square' | 'diamond' | 'cross';
  values: number[][];
}

/**
 * Real Image Processing Infrastructure Class
 */
export class RealImageProcessor {
  private static instance: RealImageProcessor;
  
  static getInstance(): RealImageProcessor {
    if (!RealImageProcessor.instance) {
      RealImageProcessor.instance = new RealImageProcessor();
    }
    return RealImageProcessor.instance;
  }

  /**
   * Load image from URL or base64 data into real ImageData
   */
  async loadImageData(imageInput: string): Promise<RealImageData> {
    try {
      console.log('[ImageProcessor] Loading image data...');
      
      let buffer: Buffer;
      
      if (imageInput.startsWith('data:')) {
        // Handle base64 data URL
        const base64Data = imageInput.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else if (imageInput.startsWith('http')) {
        // Handle URL - fetch the image
        const response = await fetch(imageInput);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        throw new Error('Unsupported image input format');
      }

      // Use Sharp to get image metadata and raw pixel data
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata');
      }

      // Get raw RGBA pixel data
      const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const imageData: RealImageData = {
        data: new Uint8ClampedArray(data),
        width: info.width,
        height: info.height,
        channels: info.channels,
        colorSpace: 'srgb'
      };

      console.log(`[ImageProcessor] ✅ Loaded ${info.width}x${info.height} image with ${info.channels} channels`);
      
      return imageData;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Failed to load image data:', error);
      throw new GhostPipelineError(
        `Image loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_LOAD_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Convert RealImageData back to base64 data URL
   */
  async imageDataToBase64(imageData: RealImageData, format: 'png' | 'jpeg' = 'png'): Promise<string> {
    try {
      console.log(`[ImageProcessor] Converting ${imageData.width}x${imageData.height} image to ${format}...`);
      
      // Create Sharp instance from raw pixel data
      const image = sharp(Buffer.from(imageData.data), {
        raw: {
          width: imageData.width,
          height: imageData.height,
          channels: imageData.channels
        }
      });

      // Convert to desired format
      const buffer = format === 'png' 
        ? await image.png().toBuffer()
        : await image.jpeg({ quality: 95 }).toBuffer();

      const base64 = buffer.toString('base64');
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      
      console.log(`[ImageProcessor] ✅ Converted to ${format} (${(buffer.length / 1024).toFixed(1)}KB)`);
      
      return `data:${mimeType};base64,${base64}`;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Failed to convert image data:', error);
      throw new GhostPipelineError(
        `Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_CONVERSION_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Real morphological erosion with custom kernels
   */
  async applyErosion(
    imageData: RealImageData, 
    kernelSize: number = 3, 
    iterations: number = 1
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Applying erosion: ${kernelSize}x${kernelSize} kernel, ${iterations} iterations`);
      
      let currentData = { ...imageData, data: new Uint8ClampedArray(imageData.data) };
      const kernel = this.createMorphologicalKernel(kernelSize, 'circle');
      
      for (let iter = 0; iter < iterations; iter++) {
        currentData = await this.applySingleErosion(currentData, kernel);
        console.log(`[ImageProcessor] Completed erosion iteration ${iter + 1}/${iterations}`);
      }
      
      console.log('[ImageProcessor] ✅ Erosion completed');
      return currentData;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Erosion failed:', error);
      throw error;
    }
  }

  /**
   * Real morphological dilation
   */
  async applyDilation(
    imageData: RealImageData, 
    kernelSize: number = 3, 
    iterations: number = 1
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Applying dilation: ${kernelSize}x${kernelSize} kernel, ${iterations} iterations`);
      
      let currentData = { ...imageData, data: new Uint8ClampedArray(imageData.data) };
      const kernel = this.createMorphologicalKernel(kernelSize, 'circle');
      
      for (let iter = 0; iter < iterations; iter++) {
        currentData = await this.applySingleDilation(currentData, kernel);
        console.log(`[ImageProcessor] Completed dilation iteration ${iter + 1}/${iterations}`);
      }
      
      console.log('[ImageProcessor] ✅ Dilation completed');
      return currentData;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Dilation failed:', error);
      throw error;
    }
  }

  /**
   * Real bilateral filtering for noise reduction
   */
  async applyBilateralFilter(
    imageData: RealImageData,
    d: number = 9,
    sigmaColor: number = 75,
    sigmaSpace: number = 75
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Applying bilateral filter: d=${d}, σColor=${sigmaColor}, σSpace=${sigmaSpace}`);
      
      const filtered = { ...imageData, data: new Uint8ClampedArray(imageData.data) };
      const { width, height, data } = imageData;
      const halfD = Math.floor(d / 2);
      
      // Pre-compute spatial weights
      const spatialWeights = this.computeSpatialWeights(d, sigmaSpace);
      
      for (let y = halfD; y < height - halfD; y++) {
        for (let x = halfD; x < width - halfD; x++) {
          const centerIdx = (y * width + x) * 4;
          const centerR = data[centerIdx];
          const centerG = data[centerIdx + 1];
          const centerB = data[centerIdx + 2];
          
          let weightSum = 0;
          let filteredR = 0, filteredG = 0, filteredB = 0;
          
          // Apply bilateral filter in neighborhood
          for (let dy = -halfD; dy <= halfD; dy++) {
            for (let dx = -halfD; dx <= halfD; dx++) {
              const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
              const neighborR = data[neighborIdx];
              const neighborG = data[neighborIdx + 1];
              const neighborB = data[neighborIdx + 2];
              
              // Calculate color distance
              const colorDist = Math.sqrt(
                Math.pow(centerR - neighborR, 2) +
                Math.pow(centerG - neighborG, 2) +
                Math.pow(centerB - neighborB, 2)
              );
              
              // Calculate weights
              const spatialWeight = spatialWeights[dy + halfD][dx + halfD];
              const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));
              const totalWeight = spatialWeight * colorWeight;
              
              weightSum += totalWeight;
              filteredR += neighborR * totalWeight;
              filteredG += neighborG * totalWeight;
              filteredB += neighborB * totalWeight;
            }
          }
          
          // Normalize and assign
          if (weightSum > 0) {
            filtered.data[centerIdx] = Math.round(filteredR / weightSum);
            filtered.data[centerIdx + 1] = Math.round(filteredG / weightSum);
            filtered.data[centerIdx + 2] = Math.round(filteredB / weightSum);
            // Keep original alpha
            filtered.data[centerIdx + 3] = data[centerIdx + 3];
          }
        }
      }
      
      console.log('[ImageProcessor] ✅ Bilateral filtering completed');
      return filtered;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Bilateral filtering failed:', error);
      throw error;
    }
  }

  /**
   * Real hole filling with flood fill algorithm
   */
  async fillHoles(
    imageData: RealImageData,
    minHoleSize: number = 10,
    maxHoleSize: number = 1000,
    connectivity: 4 | 8 = 8
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Filling holes: ${minHoleSize}-${maxHoleSize} pixels, ${connectivity}-connectivity`);
      
      const filled = { ...imageData, data: new Uint8ClampedArray(imageData.data) };
      const { width, height, data } = filled;
      const visited = new Set<number>();
      let holesFound = 0;
      let pixelsFilled = 0;
      
      // Find and fill holes
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          if (visited.has(idx)) continue;
          
          const pixelIdx = idx * 4;
          const alpha = data[pixelIdx + 3];
          
          // Look for transparent pixels (holes)
          if (alpha < 128) {
            const holePixels = this.floodFillFindHole(filled, x, y, visited, connectivity);
            
            if (holePixels.length >= minHoleSize && holePixels.length <= maxHoleSize) {
              // Fill the hole
              for (const pixel of holePixels) {
                const fillIdx = pixel * 4;
                data[fillIdx + 3] = 255; // Set alpha to opaque
              }
              holesFound++;
              pixelsFilled += holePixels.length;
              console.log(`[ImageProcessor] Filled hole ${holesFound}: ${holePixels.length} pixels`);
            }
          }
        }
      }
      
      console.log(`[ImageProcessor] ✅ Hole filling completed: ${holesFound} holes, ${pixelsFilled} pixels filled`);
      return filled;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Hole filling failed:', error);
      throw error;
    }
  }

  /**
   * Real edge analysis with Sobel operator
   */
  async analyzeEdges(imageData: RealImageData): Promise<EdgeAnalysisResult> {
    try {
      console.log('[ImageProcessor] Analyzing edges with Sobel operator...');
      
      const { width, height, data } = imageData;
      const edgePixels: Array<{ x: number; y: number; strength: number }> = [];
      
      // Sobel kernels
      const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
      const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
      
      let totalEdgeStrength = 0;
      let edgePixelCount = 0;
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0, gy = 0;
          
          // Apply Sobel kernels
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
              const gray = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
              
              gx += gray * sobelX[ky + 1][kx + 1];
              gy += gray * sobelY[ky + 1][kx + 1];
            }
          }
          
          const edgeStrength = Math.sqrt(gx * gx + gy * gy) / 255;
          
          if (edgeStrength > 0.1) { // Edge threshold
            edgePixels.push({ x, y, strength: edgeStrength });
            totalEdgeStrength += edgeStrength;
            edgePixelCount++;
          }
        }
      }
      
      const averageRoughness = edgePixelCount > 0 ? totalEdgeStrength / edgePixelCount : 0;
      const edgeIntensity = edgePixelCount / (width * height);
      const smoothnessScore = Math.max(0, 1 - averageRoughness);
      
      console.log(`[ImageProcessor] ✅ Edge analysis completed: ${edgePixels.length} edge pixels`);
      console.log(`[ImageProcessor]   Average roughness: ${averageRoughness.toFixed(3)}`);
      console.log(`[ImageProcessor]   Edge intensity: ${edgeIntensity.toFixed(3)}`);
      console.log(`[ImageProcessor]   Smoothness score: ${smoothnessScore.toFixed(3)}`);
      
      return {
        edgePixels,
        averageRoughness,
        edgeIntensity,
        smoothnessScore
      };

    } catch (error) {
      console.error('[ImageProcessor] ❌ Edge analysis failed:', error);
      throw error;
    }
  }

  /**
   * Real color analysis with ΔE calculations
   */
  async analyzeColors(
    imageData1: RealImageData,
    imageData2?: RealImageData
  ): Promise<ColorAnalysis> {
    try {
      console.log('[ImageProcessor] Analyzing colors...');
      
      const { width, height, data } = imageData1;
      const pixelCount = width * height;
      
      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      const colorCounts = new Map<string, number>();
      
      // Analyze color distribution
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        if (alpha > 128) { // Only count non-transparent pixels
          totalR += r;
          totalG += g;
          totalB += b;
          
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;
          
          // Quantize colors for dominant color analysis
          const quantizedR = Math.floor(r / 32) * 32;
          const quantizedG = Math.floor(g / 32) * 32;
          const quantizedB = Math.floor(b / 32) * 32;
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          
          colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
        }
      }
      
      const averageColor: [number, number, number] = [
        Math.round(totalR / pixelCount),
        Math.round(totalG / pixelCount),
        Math.round(totalB / pixelCount)
      ];
      
      const brightness = totalBrightness / (pixelCount * 255);
      
      // Find dominant colors
      const dominantColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([colorKey, count]) => {
          const [r, g, b] = colorKey.split(',').map(Number);
          return {
            color: [r, g, b] as [number, number, number],
            percentage: count / pixelCount
          };
        });
      
      // Calculate ΔE if second image provided
      let deltaE = 0;
      if (imageData2) {
        const avgColor2 = this.calculateAverageColor(imageData2);
        deltaE = this.calculateDeltaE(averageColor, avgColor2);
      }
      
      // Calculate contrast (simplified)
      const contrast = this.calculateContrast(imageData1);
      
      console.log(`[ImageProcessor] ✅ Color analysis completed:`);
      console.log(`[ImageProcessor]   Average color: RGB(${averageColor.join(', ')})`);
      console.log(`[ImageProcessor]   Brightness: ${(brightness * 100).toFixed(1)}%`);
      console.log(`[ImageProcessor]   Contrast: ${(contrast * 100).toFixed(1)}%`);
      if (imageData2) {
        console.log(`[ImageProcessor]   ΔE: ${deltaE.toFixed(2)}`);
      }
      
      return {
        deltaE,
        averageColor,
        dominantColors,
        colorSpace: 'srgb',
        brightness,
        contrast
      };

    } catch (error) {
      console.error('[ImageProcessor] ❌ Color analysis failed:', error);
      throw error;
    }
  }

  /**
   * Real image cropping with Sharp precision
   */
  async cropImage(
    imageInput: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string> {
    try {
      console.log(`[ImageProcessor] Cropping image: ${width}x${height} at (${x}, ${y})`);
      
      let buffer: Buffer;
      
      if (imageInput.startsWith('data:')) {
        const base64Data = imageInput.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else if (imageInput.startsWith('http')) {
        const response = await fetch(imageInput);
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        throw new Error('Unsupported image input format');
      }

      // Use Sharp for precise cropping
      const croppedBuffer = await sharp(buffer)
        .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(width), height: Math.round(height) })
        .png()
        .toBuffer();

      const base64 = croppedBuffer.toString('base64');
      const result = `data:image/png;base64,${base64}`;
      
      console.log(`[ImageProcessor] ✅ Cropped to ${width}x${height} (${(croppedBuffer.length / 1024).toFixed(1)}KB)`);
      
      return result;

    } catch (error) {
      console.error('[ImageProcessor] ❌ Cropping failed:', error);
      throw new GhostPipelineError(
        `Image cropping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'IMAGE_CROP_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Private helper methods

  private createMorphologicalKernel(size: number, shape: 'circle' | 'square' | 'diamond'): MorphologicalKernel {
    const kernel: number[][] = [];
    const center = Math.floor(size / 2);
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        
        switch (shape) {
          case 'circle':
            kernel[y][x] = (dx * dx + dy * dy <= center * center) ? 1 : 0;
            break;
          case 'square':
            kernel[y][x] = 1;
            break;
          case 'diamond':
            kernel[y][x] = (Math.abs(dx) + Math.abs(dy) <= center) ? 1 : 0;
            break;
        }
      }
    }
    
    return { size, shape, values: kernel };
  }

  private async applySingleErosion(imageData: RealImageData, kernel: MorphologicalKernel): Promise<RealImageData> {
    const { width, height, data } = imageData;
    const result = { ...imageData, data: new Uint8ClampedArray(data) };
    const halfKernel = Math.floor(kernel.size / 2);
    
    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        const centerIdx = (y * width + x) * 4;
        
        let minAlpha = 255;
        
        // Apply erosion kernel
        for (let ky = 0; ky < kernel.size; ky++) {
          for (let kx = 0; kx < kernel.size; kx++) {
            if (kernel.values[ky][kx] === 1) {
              const neighborY = y + ky - halfKernel;
              const neighborX = x + kx - halfKernel;
              const neighborIdx = (neighborY * width + neighborX) * 4;
              minAlpha = Math.min(minAlpha, data[neighborIdx + 3]);
            }
          }
        }
        
        result.data[centerIdx + 3] = minAlpha;
      }
    }
    
    return result;
  }

  private async applySingleDilation(imageData: RealImageData, kernel: MorphologicalKernel): Promise<RealImageData> {
    const { width, height, data } = imageData;
    const result = { ...imageData, data: new Uint8ClampedArray(data) };
    const halfKernel = Math.floor(kernel.size / 2);
    
    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        const centerIdx = (y * width + x) * 4;
        
        let maxAlpha = 0;
        
        // Apply dilation kernel
        for (let ky = 0; ky < kernel.size; ky++) {
          for (let kx = 0; kx < kernel.size; kx++) {
            if (kernel.values[ky][kx] === 1) {
              const neighborY = y + ky - halfKernel;
              const neighborX = x + kx - halfKernel;
              const neighborIdx = (neighborY * width + neighborX) * 4;
              maxAlpha = Math.max(maxAlpha, data[neighborIdx + 3]);
            }
          }
        }
        
        result.data[centerIdx + 3] = maxAlpha;
      }
    }
    
    return result;
  }

  private computeSpatialWeights(d: number, sigmaSpace: number): number[][] {
    const weights: number[][] = [];
    const halfD = Math.floor(d / 2);
    
    for (let dy = -halfD; dy <= halfD; dy++) {
      weights[dy + halfD] = [];
      for (let dx = -halfD; dx <= halfD; dx++) {
        const spatialDist = Math.sqrt(dx * dx + dy * dy);
        weights[dy + halfD][dx + halfD] = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));
      }
    }
    
    return weights;
  }

  private floodFillFindHole(
    imageData: RealImageData,
    startX: number,
    startY: number,
    visited: Set<number>,
    connectivity: 4 | 8
  ): number[] {
    const { width, height, data } = imageData;
    const holePixels: number[] = [];
    const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    
    const directions = connectivity === 8 
      ? [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const idx = y * width + x;
      
      if (visited.has(idx)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const pixelIdx = idx * 4;
      const alpha = data[pixelIdx + 3];
      
      if (alpha >= 128) continue; // Not a hole
      
      visited.add(idx);
      holePixels.push(idx);
      
      // Add neighbors to stack
      for (const [dx, dy] of directions) {
        stack.push({ x: x + dx, y: y + dy });
      }
    }
    
    return holePixels;
  }

  private calculateAverageColor(imageData: RealImageData): [number, number, number] {
    const { data } = imageData;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) { // Non-transparent pixels
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        count++;
      }
    }
    
    return count > 0 
      ? [Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count)]
      : [0, 0, 0];
  }

  private calculateDeltaE(color1: [number, number, number], color2: [number, number, number]): number {
    // Simplified ΔE calculation (Euclidean distance in RGB space)
    // For production, would implement proper Lab color space ΔE calculation
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    
    return Math.sqrt(
      Math.pow(r2 - r1, 2) +
      Math.pow(g2 - g1, 2) +
      Math.pow(b2 - b1, 2)
    ) / Math.sqrt(3 * 255 * 255) * 100; // Normalize to 0-100 scale
  }

  private calculateContrast(imageData: RealImageData): number {
    const { data } = imageData;
    const brightnesses: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        brightnesses.push(brightness);
      }
    }
    
    if (brightnesses.length === 0) return 0;
    
    const max = Math.max(...brightnesses);
    const min = Math.min(...brightnesses);
    
    return (max - min) / 255; // Normalized contrast
  }

  /**
   * Morphological erosion operation
   */
  async morphologicalErosion(
    imageData: RealImageData,
    options: {
      kernelSize: number;
      kernelShape: 'circular' | 'square' | 'cross';
      iterations: number;
    }
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Applying morphological erosion: ${options.kernelSize}px, ${options.iterations} iterations`);
      
      const { width, height, data } = imageData;
      let currentData = new Uint8ClampedArray(data);
      
      // Apply erosion iterations
      for (let iter = 0; iter < options.iterations; iter++) {
        currentData = this.applyErosionKernel(currentData, width, height, options.kernelSize, options.kernelShape);
      }
      
      const result: RealImageData = {
        data: currentData,
        width,
        height,
        channels: imageData.channels,
        colorSpace: imageData.colorSpace
      };
      
      console.log(`[ImageProcessor] ✅ Morphological erosion completed`);
      return result;
      
    } catch (error) {
      throw new GhostPipelineError(
        `Morphological erosion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MORPHOLOGICAL_EROSION_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Apply erosion kernel to image data
   */
  private applyErosionKernel(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    kernelSize: number,
    kernelShape: 'circular' | 'square' | 'cross'
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data);
    const kernelCenter = Math.floor(kernelSize / 2);
    
    // Create kernel pattern
    const kernel = this.createKernelPattern(kernelSize, kernelShape);
    
    // Apply erosion: a pixel is kept only if ALL kernel positions are white
    for (let y = kernelCenter; y < height - kernelCenter; y++) {
      for (let x = kernelCenter; x < width - kernelCenter; x++) {
        let shouldErode = false;
        
        // Check all kernel positions
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            if (kernel[ky][kx]) {
              const px = x + kx - kernelCenter;
              const py = y + ky - kernelCenter;
              const pixelIndex = (py * width + px) * 4;
              
              // If any kernel position is black, erode this pixel
              if (data[pixelIndex] < 128) { // Threshold for binary mask
                shouldErode = true;
                break;
              }
            }
          }
          if (shouldErode) break;
        }
        
        // Apply erosion result
        const pixelIndex = (y * width + x) * 4;
        if (shouldErode) {
          result[pixelIndex] = 0;     // R
          result[pixelIndex + 1] = 0; // G
          result[pixelIndex + 2] = 0; // B
          // Alpha remains unchanged
        }
      }
    }
    
    return result;
  }

  /**
   * Create kernel pattern based on shape
   */
  private createKernelPattern(size: number, shape: 'circular' | 'square' | 'cross'): boolean[][] {
    const kernel: boolean[][] = [];
    const center = Math.floor(size / 2);
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        
        switch (shape) {
          case 'circular':
            kernel[y][x] = (dx * dx + dy * dy) <= (center * center);
            break;
          case 'cross':
            kernel[y][x] = (dx === 0) || (dy === 0);
            break;
          case 'square':
          default:
            kernel[y][x] = true;
            break;
        }
      }
    }
    
    return kernel;
  }

  /**
   * Fill holes in mask using flood fill algorithm
   */
  async fillHoles(
    imageData: RealImageData,
    options: {
      maxHoleSize: number;
      connectivity: 4 | 8;
    }
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Filling holes (max size: ${options.maxHoleSize}px)...`);
      
      const { width, height, data } = imageData;
      const result = new Uint8ClampedArray(data);
      const visited = new Array(width * height).fill(false);
      
      // Find and fill holes smaller than maxHoleSize
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          const pixelIndex = index * 4;
          
          // Check if this is a background pixel (hole) that hasn't been visited
          if (data[pixelIndex + 3] < 128 && !visited[index]) {
            const holePixels = this.floodFillGetSize(result, x, y, width, height, visited, options.connectivity);
            
            // If hole is small enough, fill it
            if (holePixels.length <= options.maxHoleSize) {
              this.fillHolePixels(result, holePixels, width);
              console.log(`[ImageProcessor] Filled hole of ${holePixels.length} pixels at (${x}, ${y})`);
            }
          }
        }
      }
      
      const resultData: RealImageData = {
        data: result,
        width,
        height,
        channels: imageData.channels,
        colorSpace: imageData.colorSpace
      };
      
      console.log(`[ImageProcessor] ✅ Hole filling completed`);
      return resultData;
      
    } catch (error) {
      throw new GhostPipelineError(
        `Hole filling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HOLE_FILLING_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Flood fill to get the size of a hole without filling it
   */
  private floodFillGetSize(
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    width: number,
    height: number,
    visited: boolean[],
    connectivity: 4 | 8
  ): Array<{x: number, y: number}> {
    const pixels: Array<{x: number, y: number}> = [];
    const stack = [{x: startX, y: startY}];
    
    // Define connectivity patterns
    const neighbors = connectivity === 8 
      ? [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]]  // 8-connectivity
      : [[-1,0], [1,0], [0,-1], [0,1]]; // 4-connectivity
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const index = y * width + x;
      const pixelIndex = index * 4;
      
      if (visited[index] || data[pixelIndex + 3] >= 128) continue; // Already visited or not a hole
      
      visited[index] = true;
      pixels.push({x, y});
      
      // Add neighbors to stack
      for (const [dx, dy] of neighbors) {
        stack.push({x: x + dx, y: y + dy});
      }
    }
    
    return pixels;
  }

  /**
   * Fill the pixels of a detected hole
   */
  private fillHolePixels(data: Uint8ClampedArray, pixels: Array<{x: number, y: number}>, width: number): void {
    for (const {x, y} of pixels) {
      const pixelIndex = (y * width + x) * 4;
      
      // Fill with white (foreground) pixel
      data[pixelIndex] = 255;     // R
      data[pixelIndex + 1] = 255; // G
      data[pixelIndex + 2] = 255; // B
      data[pixelIndex + 3] = 255; // A (fully opaque)
    }
  }

  /**
   * Crop image to specified region
   */
  async cropImage(
    imageInput: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<RealImageData> {
    try {
      console.log(`[ImageProcessor] Cropping image: ${x},${y} ${width}x${height}`);
      
      const sharp = await this.ensureSharp();
      
      // Load and crop the image
      const buffer = await sharp(imageInput)
        .extract({ left: x, top: y, width, height })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const result: RealImageData = {
        data: new Uint8ClampedArray(buffer.data),
        width: buffer.info.width,
        height: buffer.info.height,
        channels: buffer.info.channels,
        colorSpace: 'srgb'
      };
      
      console.log(`[ImageProcessor] ✅ Cropped to ${result.width}x${result.height}`);
      return result;
      
    } catch (error) {
      throw new GhostPipelineError(
        `Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROP_IMAGE_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save ImageData as data URL
   */
  async saveAsDataUrl(imageData: ImageData | RealImageData, format: 'png' | 'jpeg' = 'png'): Promise<string> {
    try {
      console.log(`[ImageProcessor] Converting ImageData to ${format} data URL...`);
      
      // Convert to RealImageData if needed
      const realImageData = this.ensureRealImageData(imageData);
      
      // Use the existing imageDataToBase64 method
      return await this.imageDataToBase64(realImageData, format);
      
    } catch (error) {
      throw new GhostPipelineError(
        `Failed to save as data URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_DATA_URL_FAILED',
        'image_processing',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Ensure ImageData is converted to RealImageData format
   */
  private ensureRealImageData(imageData: ImageData | RealImageData): RealImageData {
    if ('channels' in imageData) {
      return imageData as RealImageData;
    }
    
    // Convert browser ImageData to RealImageData
    return {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
      channels: 4, // RGBA
      colorSpace: imageData.colorSpace || 'srgb'
    };
  }
}

// Export singleton instance
export const imageProcessor = RealImageProcessor.getInstance();

// Export convenience functions
export async function loadRealImageData(imageInput: string): Promise<RealImageData> {
  return imageProcessor.loadImageData(imageInput);
}

export async function convertToBase64(imageData: RealImageData, format: 'png' | 'jpeg' = 'png'): Promise<string> {
  return imageProcessor.imageDataToBase64(imageData, format);
}

export async function realCropImage(imageInput: string, x: number, y: number, width: number, height: number): Promise<string> {
  return imageProcessor.cropImage(imageInput, x, y, width, height);
}
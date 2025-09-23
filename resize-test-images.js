/**
 * Resize test images to fit Gemini API limits
 * Target: <2MB per image for safe base64 inline usage
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function resizeImageForGemini(inputPath, outputPath, maxSizeKB = 1500) {
  try {
    console.log(`📐 Resizing ${path.basename(inputPath)}...`);
    
    const originalBuffer = fs.readFileSync(inputPath);
    const originalSizeKB = Math.round(originalBuffer.length / 1024);
    console.log(`   Original size: ${originalSizeKB}KB`);
    
    // Get original dimensions
    const metadata = await sharp(inputPath).metadata();
    console.log(`   Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Calculate target dimensions to achieve target file size
    let quality = 85;
    let width = 1024; // Start with 1024px width
    let resizedBuffer;
    
    do {
      resizedBuffer = await sharp(inputPath)
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality })
        .toBuffer();
      
      const currentSizeKB = Math.round(resizedBuffer.length / 1024);
      console.log(`   Testing ${width}px width, q${quality}: ${currentSizeKB}KB`);
      
      if (currentSizeKB <= maxSizeKB) {
        break;
      }
      
      // Reduce width or quality
      if (width > 800) {
        width -= 100;
      } else if (quality > 60) {
        quality -= 5;
      } else {
        width -= 50;
      }
      
    } while (width > 400 && quality > 50);
    
    // Save the resized image
    fs.writeFileSync(outputPath, resizedBuffer);
    
    const finalSizeKB = Math.round(resizedBuffer.length / 1024);
    const finalMetadata = await sharp(outputPath).metadata();
    
    console.log(`✅ Resized to: ${finalMetadata.width}x${finalMetadata.height}, ${finalSizeKB}KB`);
    console.log(`   Compression ratio: ${((originalSizeKB - finalSizeKB) / originalSizeKB * 100).toFixed(1)}%`);
    
    return {
      original: { sizeKB: originalSizeKB, width: metadata.width, height: metadata.height },
      resized: { sizeKB: finalSizeKB, width: finalMetadata.width, height: finalMetadata.height }
    };
    
  } catch (error) {
    console.error(`❌ Failed to resize ${inputPath}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🖼️  Resizing test images for Gemini API limits...\n');
  
  const inputDir = './input';
  const outputDir = './input/resized';
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const images = [
    { input: 'hemdNathalie.JPG', output: 'hemdNathalie-small.jpg' },
    { input: 'hemd.jpg', output: 'hemd-small.jpg' }
  ];
  
  let totalOriginalSize = 0;
  let totalResizedSize = 0;
  
  for (const img of images) {
    const inputPath = path.join(inputDir, img.input);
    const outputPath = path.join(outputDir, img.output);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${img.input} - file not found`);
      continue;
    }
    
    const result = await resizeImageForGemini(inputPath, outputPath, 1500);
    totalOriginalSize += result.original.sizeKB;
    totalResizedSize += result.resized.sizeKB;
    console.log('');
  }
  
  console.log('📊 Summary:');
  console.log(`   Total original size: ${totalOriginalSize}KB (${(totalOriginalSize/1024).toFixed(1)}MB)`);
  console.log(`   Total resized size: ${totalResizedSize}KB (${(totalResizedSize/1024).toFixed(1)}MB)`);
  console.log(`   Base64 estimated size: ~${(totalResizedSize * 1.33 / 1024).toFixed(1)}MB`);
  console.log(`   Gemini 20MB limit: ${totalResizedSize * 1.33 < 15000 ? '✅ SAFE' : '❌ TOO LARGE'}`);
}

main().catch(console.error);
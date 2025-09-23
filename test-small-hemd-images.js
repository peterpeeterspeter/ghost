/**
 * Test Ghost Mannequin v2.1 API with smaller Hemd images for Gemini
 */

const fs = require('fs');
const path = require('path');

function imageToBase64DataURL(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    
    const base64 = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Failed to convert ${imagePath} to base64:`, error.message);
    throw error;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
  return Math.round(bytes / 1024 / 1024) + 'MB';
}

async function testGhostMannequinAPI() {
  console.log('🧪 Testing Ghost Mannequin v2.1 with SMALL Hemd Images\n');

  // Paths to the small resized images
  const aImagePath = './input/resized/hemdNathalie-small.jpg';
  const bImagePath = './input/resized/hemd-small.jpg';
  
  // Check if files exist
  if (!fs.existsSync(aImagePath)) {
    console.error(`❌ File not found: ${aImagePath}`);
    console.log('💡 Run "node resize-test-images.js" first to create small images');
    return;
  }
  if (!fs.existsSync(bImagePath)) {
    console.error(`❌ File not found: ${bImagePath}`);
    console.log('💡 Run "node resize-test-images.js" first to create small images');
    return;
  }

  console.log('📁 Converting small images to base64...');
  
  // Get file sizes
  const aSize = fs.statSync(aImagePath).size;
  const bSize = fs.statSync(bImagePath).size;
  console.log(`   A (On-Model): ${path.basename(aImagePath)} (${formatFileSize(aSize)})`);
  console.log(`   B (Flatlay): ${path.basename(bImagePath)} (${formatFileSize(bSize)})`);

  console.log('🔄 Converting A (on-model) image...');
  const aOnModelUrl = imageToBase64DataURL(aImagePath);
  const aBase64Size = Math.round(aOnModelUrl.length / 1024);
  console.log(`✅ A image converted (${aBase64Size}KB base64)`);

  console.log('🔄 Converting B (flatlay) image...');
  const bFlatlayUrl = imageToBase64DataURL(bImagePath);
  const bBase64Size = Math.round(bFlatlayUrl.length / 1024);
  console.log(`✅ B image converted (${bBase64Size}KB base64)`);

  const totalRequestSize = Math.round((aOnModelUrl.length + bFlatlayUrl.length) / 1024);
  console.log(`\n📡 Calling Ghost Mannequin v2.1 API with SMALL images...`);
  console.log(`📦 Request size: ${totalRequestSize}KB (well under 20MB limit)`);

  const requestBody = {
    aOnModelUrl,
    bFlatlayUrl,
    config: {
      skipPersonScrub: false,
      enableArtifactPersistence: false,
      qualityGateOverride: false
    }
  };

  try {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3003/api/ghost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  Total API Call Time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ API Success Response:');
      console.log(JSON.stringify({
        sessionId: result.sessionId,
        imageUrl: result.imageUrl?.substring(0, 100) + (result.imageUrl?.length > 100 ? '...' : ''),
        processingTime: result.processingTime,
        metrics: result.metrics
      }, null, 2));
      
      if (result.artifacts) {
        console.log('\n📦 Artifacts generated:');
        Object.entries(result.artifacts).forEach(([key, value]) => {
          if (typeof value === 'string') {
            console.log(`   ${key}: ${value?.substring(0, 80)}${value?.length > 80 ? '...' : ''}`);
          } else {
            console.log(`   ${key}:`, value);
          }
        });
      }
    } else {
      console.log('\n❌ API Error Response:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
  }
}

testGhostMannequinAPI();
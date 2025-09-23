#!/usr/bin/env node

/**
 * Test Ghost Mannequin Pipeline v2.1 with REAL hemd images using base64 data URLs
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3002';
const INPUT_DIR = path.join(__dirname, 'input');

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

async function testRealHemdImages() {
  console.log('🧪 Testing Ghost Mannequin v2.1 with REAL Hemd Images\n');
  
  const aOnModelPath = path.join(INPUT_DIR, 'hemdNathalie.JPG');  // On-model for proportions
  const bFlatlayPath = path.join(INPUT_DIR, 'hemd.jpg');          // Flatlay for texture/color
  
  // Verify files exist
  if (!fs.existsSync(aOnModelPath)) {
    console.error(`❌ File not found: ${aOnModelPath}`);
    return;
  }
  if (!fs.existsSync(bFlatlayPath)) {
    console.error(`❌ File not found: ${bFlatlayPath}`);
    return;
  }
  
  console.log('📁 Converting images to base64...');
  console.log(`   A (On-Model): hemdNathalie.JPG (${(fs.statSync(aOnModelPath).size / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`   B (Flatlay): hemd.jpg (${(fs.statSync(bFlatlayPath).size / 1024 / 1024).toFixed(1)}MB)`);
  
  try {
    // Convert images to base64 data URLs
    console.log('🔄 Converting A (on-model) image...');
    const aOnModelDataURL = imageToBase64DataURL(aOnModelPath);
    console.log(`✅ A image converted (${Math.round(aOnModelDataURL.length / 1024)}KB base64)`);
    
    console.log('🔄 Converting B (flatlay) image...');
    const bFlatlayDataURL = imageToBase64DataURL(bFlatlayPath);
    console.log(`✅ B image converted (${Math.round(bFlatlayDataURL.length / 1024)}KB base64)`);
    
    console.log('\n📡 Calling Ghost Mannequin v2.1 API with REAL images...');
    
    const requestBody = {
      aOnModelUrl: aOnModelDataURL,  // Real base64 data URL
      bFlatlayUrl: bFlatlayDataURL,  // Real base64 data URL
      config: {
        debug: true,
        skipQualityGates: false  // Use real quality gates
      }
    };
    
    console.log(`📦 Request size: ${Math.round(JSON.stringify(requestBody).length / 1024 / 1024)}MB`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/api/ghost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total API Call Time: ${totalTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error Response:');
      console.error(errorText);
      return;
    }

    const result = await response.json();
    
    console.log('\n✅ SUCCESS! Ghost Mannequin Generated from REAL Images');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Session info
    console.log(`🔑 Session ID: ${result.sessionId}`);
    console.log(`⏱️  Processing Time: ${result.processingTime}ms (${(result.processingTime/1000).toFixed(1)}s)`);
    console.log(`🖼️  Generated Image: ${result.imageUrl}`);
    
    // Quality metrics
    if (result.artifacts && result.artifacts.metrics) {
      console.log('\n📊 Quality Metrics:');
      console.log(`   Symmetry: ${(result.artifacts.metrics.symmetry * 100).toFixed(1)}%`);
      console.log(`   Edge Roughness: ${result.artifacts.metrics.edge_roughness_px.toFixed(1)}px`);
      console.log(`   Shoulder Width Ratio: ${result.artifacts.metrics.shoulder_width_ratio.toFixed(2)}`);
      console.log(`   Neck Inner Ratio: ${result.artifacts.metrics.neck_inner_ratio.toFixed(2)}`);
      console.log(`   Polygons Generated: ${result.artifacts.polygons.length}`);
    }
    
    // Processing stages
    if (result.stages && result.stages.length > 0) {
      console.log('\n🔄 Pipeline Stages:');
      result.stages.forEach((stage, index) => {
        const status = stage.success ? '✅' : '❌';
        console.log(`   ${index + 1}. ${stage.stage}: ${stage.duration}ms ${status}`);
      });
    }
    
    // Quality score
    if (result.qualityScore) {
      console.log(`\n🎯 Overall Quality Score: ${result.qualityScore.toFixed(1)}%`);
    }
    
    console.log('\n🎉 Real Image Test Complete!');
    console.log('🔗 Generated Image should now match the actual hemd garment!');
    console.log('🔗 URL:', result.imageUrl);

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure the dev server is running: npm run dev');
    }
  }
}

// Run the test
testRealHemdImages().catch(console.error);
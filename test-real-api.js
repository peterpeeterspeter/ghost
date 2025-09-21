/**
 * Real API Test for Ghost Mannequin Pipeline v2.1
 * Uses actual FAL.AI and Gemini API keys for real processing
 */

const fs = require('fs');
const path = require('path');

// Set API keys
process.env.FAL_API_KEY = "40f72c85-17cd-44cb-a02c-f28157af0f88:386434a9a48d9261fa57c7336d9fc87e";
process.env.GEMINI_API_KEY = "AIzaSyDU-oEYDNMwP7J9mEiAIACRFHaCmD9Vlmg";

// Test API connectivity
async function testAPIConnectivity() {
  console.log('🔧 Testing API Connectivity...');
  console.log('='.repeat(50));
  
  // Test FAL.AI
  console.log('\n🎯 Testing FAL.AI API...');
  try {
    const response = await fetch('https://fal.run/fal-ai/birefnet', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'
      })
    });
    
    if (response.ok) {
      console.log('✅ FAL.AI API: Connected and working');
    } else {
      const error = await response.text();
      console.log(`❌ FAL.AI API Error: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`❌ FAL.AI API Error: ${error.message}`);
  }
  
  // Test Gemini API
  console.log('\n🧠 Testing Gemini API...');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent('Hello, this is a test. Please respond with "API working".');
    const response = await result.response;
    const text = response.text();
    
    if (text && text.toLowerCase().includes('api working')) {
      console.log('✅ Gemini API: Connected and working');
    } else {
      console.log(`✅ Gemini API: Connected (Response: ${text.substring(0, 50)}...)`);
    }
  } catch (error) {
    console.log(`❌ Gemini API Error: ${error.message}`);
  }
}

// Test real background removal with FAL.AI
async function testRealBackgroundRemoval() {
  console.log('\n🎨 Testing Real Background Removal...');
  console.log('='.repeat(50));
  
  try {
    // Get a test image from Input directory
    const inputDir = path.join(__dirname, 'Input');
    const files = fs.readdirSync(inputDir);
    const imageFile = files.find(f => /\.(jpg|jpeg|png)$/i.test(f));
    
    if (!imageFile) {
      throw new Error('No image files found in Input directory');
    }
    
    const imagePath = path.join(inputDir, imageFile);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log(`📸 Using image: ${imageFile} (${Math.round(imageBuffer.length / 1024)}KB)`);
    console.log('🔄 Processing with BiRefNet...');
    
    const response = await fetch('https://fal.run/fal-ai/birefnet', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: dataUrl
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Background removal successful!');
      console.log(`🖼️  Cleaned image URL: ${result.image.url}`);
      console.log(`📊 File size: ${Math.round(result.image.file_size / 1024)}KB`);
      console.log(`🎯 Content type: ${result.image.content_type}`);
      
      return result.image.url;
    } else {
      const error = await response.text();
      console.error(`❌ Background removal failed: ${response.status} - ${error}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Background removal error: ${error.message}`);
    return null;
  }
}

// Test real garment analysis with Gemini
async function testRealGarmentAnalysis(imageUrl) {
  console.log('\n🧠 Testing Real Garment Analysis...');
  console.log('='.repeat(50));
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    // Download image for analysis
    console.log('📥 Downloading processed image...');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const prompt = `Analyze this garment image and provide a JSON response with:
    {
      "garment_type": "shirt/dress/pants/etc",
      "color": "primary color description",
      "fabric_type": "cotton/polyester/etc",
      "sleeve_length": "short/long/sleeveless",
      "neckline": "crew/v-neck/etc",
      "closure": "button/zip/pullover",
      "style": "casual/formal/etc",
      "confidence": 0.85
    }`;
    
    console.log('🔄 Analyzing with Gemini Pro Vision...');
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(imageBuffer).toString('base64'),
          mimeType: 'image/png'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Garment analysis completed!');
    console.log('📊 Analysis result:');
    console.log(text);
    
    // Try to parse JSON if possible
    try {
      const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      console.log('\n🎯 Parsed Analysis:');
      Object.entries(analysis).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      return analysis;
    } catch (parseError) {
      console.log('📝 Raw analysis (not JSON format)');
      return { raw_analysis: text };
    }
    
  } catch (error) {
    console.error(`❌ Garment analysis error: ${error.message}`);
    return null;
  }
}

// Main test function
async function runRealAPITest() {
  console.log('🚀 Ghost Mannequin Pipeline v2.1 - Real API Test');
  console.log('='.repeat(60));
  console.log('🔑 API Keys configured and ready');
  console.log('⚡ Testing with actual AI services');
  console.log();
  
  const startTime = Date.now();
  
  try {
    // Test API connectivity
    await testAPIConnectivity();
    
    // Test real background removal
    const cleanedImageUrl = await testRealBackgroundRemoval();
    
    if (cleanedImageUrl) {
      // Test real garment analysis
      const analysis = await testRealGarmentAnalysis(cleanedImageUrl);
      
      const totalTime = Date.now() - startTime;
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 REAL API TEST COMPLETED');
      console.log('='.repeat(60));
      console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`✅ Background removal: SUCCESS`);
      console.log(`✅ Garment analysis: ${analysis ? 'SUCCESS' : 'PARTIAL'}`);
      console.log(`🖼️  Processed image: ${cleanedImageUrl}`);
      
      // Save results
      const testResults = {
        timestamp: new Date().toISOString(),
        totalTime,
        backgroundRemoval: {
          success: true,
          outputUrl: cleanedImageUrl
        },
        garmentAnalysis: {
          success: !!analysis,
          result: analysis
        }
      };
      
      const resultsPath = path.join(__dirname, 'claudedocs', `real-api-test-${Date.now()}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
      console.log(`📄 Results saved: ${resultsPath}`);
      
      console.log('\n🚀 Ready for full v2.1 pipeline integration!');
      
    } else {
      console.log('\n❌ Background removal failed - cannot proceed with full test');
    }
    
  } catch (error) {
    console.error('\n💥 Real API test failed:', error.message);
  }
}

// Check for dependencies
try {
  require('@google/generative-ai');
  runRealAPITest();
} catch (error) {
  console.error('❌ Missing dependencies. Install with: npm install @google/generative-ai');
}
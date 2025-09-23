/**
 * Simple test of Gemini 2.5 Flash Image Preview API
 */

const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function testGeminiImageAPI() {
  console.log('🧪 Testing Gemini 2.5 Flash Image Preview API...\n');

  // Use just one small image
  const imagePath = './input/resized/hemdNathalie-small.jpg';
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ File not found: ${imagePath}`);
    return;
  }

  // Convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const sizeKB = Math.round(base64.length / 1024);
  
  console.log(`📁 Image: ${imagePath}`);
  console.log(`📏 Size: ${Math.round(imageBuffer.length / 1024)}KB file, ${sizeKB}KB base64\n`);

  const requestPayload = {
    contents: [{
      parts: [
        {
          text: "Create a ghost mannequin version of this garment image. Remove the person completely while preserving the garment's shape, colors, and details. The result should show only the clothing item on a pure white background."
        },
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseModalities: ["TEXT", "IMAGE"]
    }
  };

  console.log('📡 Sending request to Gemini 2.5 Flash Image Preview...');
  console.log(`📦 Request size: ${Math.round(JSON.stringify(requestPayload).length / 1024)}KB`);

  try {
    const startTime = Date.now();
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(requestPayload)
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ API Success!');
      console.log('📥 Response structure:', {
        candidates: result.candidates?.length || 0,
        promptFeedback: !!result.promptFeedback,
        usageMetadata: !!result.usageMetadata
      });

      if (result.candidates?.[0]?.content?.parts) {
        const parts = result.candidates[0].content.parts;
        console.log(`🧩 Response parts: ${parts.length}`);
        
        parts.forEach((part, idx) => {
          if (part.text) {
            console.log(`   Part ${idx}: TEXT (${part.text.length} chars)`);
            console.log(`   Content: ${part.text.substring(0, 100)}...`);
          } else if (part.inline_data || part.inlineData) {
            const imageData = part.inline_data || part.inlineData;
            console.log(`   Part ${idx}: IMAGE (${imageData.mimeType || imageData.mime_type})`);
            console.log(`   Data size: ${imageData.data.length} base64 chars`);
            
            // Save the generated image
            const outputPath = './output-gemini-test.png';
            fs.writeFileSync(outputPath, imageData.data, 'base64');
            console.log(`   💾 Saved image to: ${outputPath}`);
          } else {
            console.log(`   Part ${idx}: UNKNOWN`, Object.keys(part));
          }
        });
      }

      if (result.usageMetadata) {
        console.log('\n📊 Usage:', result.usageMetadata);
      }

    } else {
      console.log('\n❌ API Error:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
  }
}

testGeminiImageAPI();
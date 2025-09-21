/**
 * Test Gemini API with correct model names
 */

// Set API key
process.env.GEMINI_API_KEY = "AIzaSyDU-oEYDNMwP7J9mEiAIACRFHaCmD9Vlmg";

async function testGeminiModels() {
  console.log('🧠 Testing Gemini API Models...');
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test 1: List available models
    console.log('\n📋 Listing available models...');
    try {
      const models = await genAI.listModels();
      console.log('✅ Available models:');
      models.forEach(model => {
        console.log(`   - ${model.name} (${model.displayName})`);
      });
    } catch (error) {
      console.log('❌ Could not list models:', error.message);
    }
    
    // Test 2: Try different model names
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro',
      'gemini-pro-vision',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro'
    ];
    
    for (const modelName of modelsToTry) {
      console.log(`\n🔄 Testing model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello! Please respond with just "OK" to confirm this model works.');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName}: Working! Response: ${text.substring(0, 50)}`);
        
        // If this model works, test with image
        if (text && text.toLowerCase().includes('ok')) {
          await testImageAnalysis(model, modelName);
          break; // Use first working model
        }
      } catch (error) {
        console.log(`❌ ${modelName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error.message);
  }
}

async function testImageAnalysis(model, modelName) {
  console.log(`\n🖼️  Testing image analysis with ${modelName}...`);
  
  try {
    // Use the background-removed image from our previous test
    const imageUrl = "https://v3.fal.media/files/penguin/vc2xe0CmXopu960-nDG7Z_a6f6961c24a74dfb9ca025f18ba7632d.png";
    
    console.log('📥 Downloading processed image...');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const prompt = `Analyze this clothing item. Provide a brief description of:
1. Type of garment
2. Color
3. Style
Keep it short and factual.`;
    
    console.log('🔄 Analyzing with Gemini...');
    
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
    
    console.log('✅ Image analysis successful!');
    console.log('📊 Analysis result:');
    console.log(text);
    
    return text;
    
  } catch (error) {
    console.log(`❌ Image analysis failed: ${error.message}`);
    return null;
  }
}

// Check for dependencies and run
try {
  require('@google/generative-ai');
  testGeminiModels();
} catch (error) {
  console.error('❌ Missing dependencies. Install with: npm install @google/generative-ai');
}
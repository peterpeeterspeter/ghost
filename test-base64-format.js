/**
 * Test base64 format extraction for Gemini API
 */

const fs = require('fs');

// Read a small test image
const imagePath = './input/resized/hemdNathalie-small.jpg';
const imageBuffer = fs.readFileSync(imagePath);
const base64 = imageBuffer.toString('base64');
const dataUrl = `data:image/jpeg;base64,${base64}`;

console.log('🔍 Testing base64 format extraction...\n');

console.log('Original data URL format:');
console.log(`Length: ${dataUrl.length}`);
console.log(`Prefix: ${dataUrl.substring(0, 50)}...`);

// Test the extraction method from flash-api.ts
const [mimeSection, base64Data] = dataUrl.split(',');
const mimeType = mimeSection.split(':')[1].split(';')[0];

console.log('\nExtracted components:');
console.log(`MIME section: ${mimeSection}`);
console.log(`MIME type: ${mimeType}`);
console.log(`Base64 data length: ${base64Data.length}`);
console.log(`Base64 data prefix: ${base64Data.substring(0, 50)}...`);

// Verify the base64 is valid by trying to decode it
try {
  const decodedBuffer = Buffer.from(base64Data, 'base64');
  console.log(`\n✅ Base64 decoding successful: ${decodedBuffer.length} bytes`);
  
  // Check if it starts with JPEG signature
  const jpegSignature = decodedBuffer.slice(0, 3);
  console.log(`JPEG signature: ${jpegSignature.toString('hex')} (should be ffd8ff)`);
  
  if (jpegSignature.toString('hex').startsWith('ffd8ff')) {
    console.log('✅ Valid JPEG signature');
  } else {
    console.log('❌ Invalid JPEG signature');
  }
  
} catch (error) {
  console.log(`❌ Base64 decoding failed: ${error.message}`);
}

// Test what happens with Gemini format
console.log('\n🔬 Gemini API format test:');
const geminiPayload = {
  inline_data: {
    mime_type: mimeType,
    data: base64Data
  }
};

console.log(`Gemini payload size: ${JSON.stringify(geminiPayload).length} chars`);
console.log(`Mime type: ${geminiPayload.inline_data.mime_type}`);
console.log(`Data length: ${geminiPayload.inline_data.data.length}`);

// Check if there are any invalid characters in base64
const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
if (base64Regex.test(base64Data)) {
  console.log('✅ Valid base64 characters');
} else {
  console.log('❌ Invalid characters in base64');
}
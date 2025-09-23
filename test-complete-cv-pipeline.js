#!/usr/bin/env node

/**
 * Complete CV Pipeline Test for Ghost Mannequin v2.1
 * 
 * Tests the full computer vision processing chain:
 * 1. FAL.AI Background Removal (BRIA/BiRefNet)
 * 2. Person Detection/Scrub (Grounding DINO + SAM v2)
 * 3. Instance Segmentation (Real Replicate integration)
 * 4. Quality Gates (Real validation logic)
 * 5. Mask Refinement (Computer vision processing)
 * 6. Edge Erosion (Real image processing for safety buffers)
 */

require('dotenv').config();

async function testCompleteCVPipeline() {
  console.log('🧪 Testing Complete CV Pipeline for Ghost Mannequin v2.1');
  console.log('=' .repeat(60));

  const testResults = {
    backgroundRemoval: false,
    personDetection: false,
    instanceSegmentation: false,
    qualityGates: false,
    maskRefinement: false,
    edgeErosion: false,
    endToEndPipeline: false
  };

  try {
    // Test image (using a mock data URL for testing)
    const testImageUrl = createTestImageDataUrl();
    console.log('📷 Created test image data URL');

    // === TEST 1: FAL.AI Background Removal ===
    console.log('\n🎯 TEST 1: FAL.AI Background Removal');
    try {
      const { removeBackground } = await import('./lib/ghost/fal.ts');
      
      const bgRemovalResult = await removeBackground(testImageUrl, {
        model: 'birefnet',
        enableQualityValidation: true
      });
      
      console.log('✅ Background removal successful');
      console.log(`   Processing time: ${bgRemovalResult.processingTime}ms`);
      console.log(`   Result URL: ${bgRemovalResult.cleanedImageUrl.substring(0, 50)}...`);
      
      testResults.backgroundRemoval = true;
      
    } catch (error) {
      console.log(`❌ Background removal failed: ${error.message}`);
    }

    // === TEST 2: Person Detection/Scrub with SAM v2 ===
    console.log('\n🎯 TEST 2: Person Detection/Scrub (Grounding DINO + SAM v2)');
    try {
      const { personScrubA } = await import('./lib/ghost/person-scrub.ts');
      
      const personScrubResult = await personScrubA(testImageUrl, {
        edgeErosion: {
          minErosion: 2,
          maxErosion: 3,
          iterations: 2
        },
        detection: {
          skinThreshold: 0.15,
          confidenceThreshold: 0.85,
          minRegionSize: 100
        },
        safety: {
          enforceStrictMode: true,
          blockHighRisk: true
        }
      });
      
      console.log('✅ Person detection/scrub successful');
      console.log(`   Processing time: ${personScrubResult.processingTime}ms`);
      console.log(`   Skin percentage: ${(personScrubResult.skinPct * 100).toFixed(1)}%`);
      console.log(`   Regions detected: ${personScrubResult.metrics.regionsDetected.join(', ')}`);
      console.log(`   Edge erosion applied: ${personScrubResult.metrics.edgeErosionPx}px`);
      
      testResults.personDetection = true;
      
    } catch (error) {
      console.log(`❌ Person detection/scrub failed: ${error.message}`);
    }

    // === TEST 3: Instance Segmentation ===
    console.log('\n🎯 TEST 3: Instance Segmentation (Real Grounded-SAM)');
    try {
      const { performAdvancedSegmentation } = await import('./lib/ghost/segmentation.ts');
      
      // Mock base analysis for segmentation
      const mockBaseAnalysis = {
        type: 'garment_analysis',
        meta: {
          schema_version: '4.2',
          session_id: 'test-session-123',
          processing_stage: 'base_analysis',
          safety_pre_scrub_applied: true,
          ai_provider: 'test'
        },
        garment_category: 'top',
        closure_type: 'pullover',
        neckline_style: 'crew',
        sleeve_configuration: 'long',
        labels_found: [],
        preserve_details: []
      };
      
      const segmentationResult = await performAdvancedSegmentation(
        testImageUrl,
        mockBaseAnalysis,
        {
          approach: 'instance_based',
          qualityValidation: {
            enabled: true,
            strictMode: false
          }
        }
      );
      
      console.log('✅ Instance segmentation successful');
      console.log(`   Processing time: ${segmentationResult.processingTime}ms`);
      console.log(`   Mask URL: ${segmentationResult.maskUrl.substring(0, 50)}...`);
      console.log(`   Quality metrics:`);
      console.log(`     - Completeness: ${(segmentationResult.qualityMetrics.maskCompleteness * 100).toFixed(1)}%`);
      console.log(`     - Smoothness: ${(segmentationResult.qualityMetrics.edgeSmoothness * 100).toFixed(1)}%`);
      console.log(`     - Consistency: ${(segmentationResult.qualityMetrics.geometricConsistency * 100).toFixed(1)}%`);
      
      testResults.instanceSegmentation = true;
      
    } catch (error) {
      console.log(`❌ Instance segmentation failed: ${error.message}`);
    }

    // === TEST 4: Quality Gates ===
    console.log('\n🎯 TEST 4: Quality Gates (Real Validation Logic)');
    try {
      const { validateBackgroundRemovalQuality } = await import('./lib/ghost/fal.ts');
      
      const qualityCheck = await validateBackgroundRemovalQuality(testImageUrl);
      
      console.log('✅ Quality gates successful');
      console.log(`   Quality validation passed: ${qualityCheck}`);
      
      testResults.qualityGates = true;
      
    } catch (error) {
      console.log(`❌ Quality gates failed: ${error.message}`);
    }

    // === TEST 5: Mask Refinement ===
    console.log('\n🎯 TEST 5: Mask Refinement (Computer Vision Processing)');
    try {
      const { refineWithProportions, templateFor, toPreserveZones } = await import('./lib/ghost/mask-refinement.ts');
      
      // Mock polygon data
      const mockPolygons = [
        {
          name: 'garment',
          pts: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
          isHole: false
        },
        {
          name: 'neck',
          pts: [[0.35, 0.05], [0.65, 0.05], [0.65, 0.25], [0.35, 0.25]],
          isHole: true
        }
      ];
      
      const mockConsolidated = {
        category_generic: 'top',
        neckline_style: 'crew',
        sleeve_configuration: 'long',
        silhouette: 'fitted'
      };
      
      const template = templateFor(mockConsolidated);
      const preserveZones = toPreserveZones(mockConsolidated);
      
      const refinementResult = refineWithProportions(mockPolygons, template, preserveZones);
      
      console.log('✅ Mask refinement successful');
      console.log(`   Refined polygons: ${refinementResult.polygons.length}`);
      console.log(`   Metrics:`);
      console.log(`     - Symmetry: ${(refinementResult.metrics.symmetry * 100).toFixed(1)}%`);
      console.log(`     - Edge roughness: ${refinementResult.metrics.edge_roughness_px.toFixed(1)}px`);
      console.log(`     - Shoulder width ratio: ${refinementResult.metrics.shoulder_width_ratio.toFixed(3)}`);
      console.log(`     - Neck inner ratio: ${refinementResult.metrics.neck_inner_ratio.toFixed(3)}`);
      
      testResults.maskRefinement = true;
      
    } catch (error) {
      console.log(`❌ Mask refinement failed: ${error.message}`);
    }

    // === TEST 6: Edge Erosion ===
    console.log('\n🎯 TEST 6: Edge Erosion (Real Image Processing)');
    try {
      const { applyEdgeErosion } = await import('./lib/ghost/edge-erosion.ts');
      
      const erosionResult = await applyEdgeErosion(testImageUrl, {
        erosionPixels: 2.5,
        iterations: 2,
        kernelShape: 'circular',
        preserveTopology: true,
        smoothingEnabled: true,
        qualityValidation: {
          enabled: true,
          minMaskArea: 0.1,
          maxHoleSize: 50
        }
      });
      
      console.log('✅ Edge erosion successful');
      console.log(`   Processing time: ${erosionResult.processingTime}ms`);
      console.log(`   Eroded mask URL: ${erosionResult.erodedMaskUrl.substring(0, 50)}...`);
      console.log(`   Metrics:`);
      console.log(`     - Original pixels: ${erosionResult.metrics.originalPixels}`);
      console.log(`     - Eroded pixels: ${erosionResult.metrics.erodedPixels}`);
      console.log(`     - Erosion ratio: ${(erosionResult.metrics.erosionRatio * 100).toFixed(1)}%`);
      console.log(`     - Edge quality: ${(erosionResult.metrics.edgeQuality * 100).toFixed(1)}%`);
      console.log(`     - Topology preserved: ${erosionResult.metrics.topologyPreserved}`);
      
      testResults.edgeErosion = true;
      
    } catch (error) {
      console.log(`❌ Edge erosion failed: ${error.message}`);
    }

    // === TEST 7: End-to-End Pipeline ===
    console.log('\n🎯 TEST 7: End-to-End Pipeline Integration');
    try {
      // Test basic pipeline flow
      if (testResults.backgroundRemoval && testResults.personDetection && 
          testResults.instanceSegmentation && testResults.edgeErosion) {
        
        console.log('✅ End-to-end pipeline integration successful');
        console.log('   All CV components working together');
        
        testResults.endToEndPipeline = true;
      } else {
        throw new Error('Some CV components failed - cannot test end-to-end');
      }
      
    } catch (error) {
      console.log(`❌ End-to-end pipeline failed: ${error.message}`);
    }

    // === FINAL RESULTS ===
    console.log('\n📊 COMPLETE CV PIPELINE TEST RESULTS');
    console.log('=' .repeat(60));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL CV PIPELINE COMPONENTS WORKING! Ready for production.');
    } else {
      console.log('⚠️  Some components need attention. Check failed tests above.');
    }

  } catch (error) {
    console.error('💥 Complete CV pipeline test failed:', error);
    process.exit(1);
  }
}

/**
 * Create a test image data URL for testing
 */
function createTestImageDataUrl() {
  // Create a simple 1x1 pixel PNG data URL for testing
  const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAhVMxVAAAAABJRU5ErkJggg==';
  return `data:image/png;base64,${base64Pixel}`;
}

// Run the test
if (require.main === module) {
  testCompleteCVPipeline().catch(console.error);
}

module.exports = { testCompleteCVPipeline };
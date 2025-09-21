/**
 * Unit Tests for Quality Gates - CI/CD Integration
 * 
 * Ensures quality gate regression prevention with automated validation
 * Tests cavity holes, symmetry thresholds, and edge roughness checks
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { preGenChecklist, validateMetric, generateRecommendations } from '../lib/ghost/checks';
import { MaskArtifacts, MaskPolygon } from '../types/ghost';

describe('Quality Gates', () => {
  let baseArtifacts: MaskArtifacts;
  let mockPolygons: MaskPolygon[];

  beforeEach(() => {
    // Setup base test data
    mockPolygons = [
      {
        name: 'garment',
        pts: [[100, 50], [300, 50], [300, 400], [100, 400]],
        isHole: false
      },
      {
        name: 'neck',
        pts: [[180, 50], [220, 50], [220, 90], [180, 90]],
        isHole: true
      },
      {
        name: 'sleeve_l',
        pts: [[80, 80], [120, 80], [120, 200], [80, 200]],
        isHole: true
      },
      {
        name: 'sleeve_r',
        pts: [[280, 80], [320, 80], [320, 200], [280, 200]],
        isHole: true
      }
    ];

    baseArtifacts = {
      a_personless_url: 'https://example.com/personless.jpg',
      a_skin_mask_url: 'https://example.com/skin_mask.png',
      b_clean_url: 'https://example.com/clean.jpg',
      refined_silhouette_url: 'https://example.com/silhouette.png',
      polygons: mockPolygons,
      metrics: {
        skin_pct: 0.08,
        symmetry: 0.97, // 97% - above 95% threshold
        edge_roughness_px: 1.5, // 1.5px - below 2.0px threshold
        shoulder_width_ratio: 0.48,
        neck_inner_ratio: 0.12
      }
    };
  });

  describe('Symmetry Threshold Validation', () => {
    it('should pass with symmetry ≥ 0.95', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, symmetry: 0.96 }
      };

      expect(() => preGenChecklist(artifacts)).not.toThrow();
    });

    it('should fail with symmetry < 0.95', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, symmetry: 0.94 }
      };

      expect(() => preGenChecklist(artifacts)).toThrow('symmetry_below_threshold');
    });

    it('should pass at exact 0.95 threshold', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, symmetry: 0.95 }
      };

      expect(() => preGenChecklist(artifacts)).not.toThrow();
    });
  });

  describe('Edge Roughness Validation', () => {
    it('should pass with edge roughness ≤ 2.0px', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, edge_roughness_px: 1.8 }
      };

      expect(() => preGenChecklist(artifacts)).not.toThrow();
    });

    it('should fail with edge roughness > 2.0px', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, edge_roughness_px: 2.5 }
      };

      expect(() => preGenChecklist(artifacts)).toThrow('edges_too_rough');
    });

    it('should pass at exact 2.0px threshold', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: { ...baseArtifacts.metrics, edge_roughness_px: 2.0 }
      };

      expect(() => preGenChecklist(artifacts)).not.toThrow();
    });
  });

  describe('Cavity Polarity Validation (CRITICAL)', () => {
    it('should pass when neck and sleeves are holes', () => {
      // Base artifacts already have correct cavity polarity
      expect(() => preGenChecklist(baseArtifacts)).not.toThrow();
    });

    it('should fail when neck is not a hole', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: baseArtifacts.polygons.map(p => 
          p.name === 'neck' ? { ...p, isHole: false } : p
        )
      };

      expect(() => preGenChecklist(artifacts)).toThrow('neck_must_be_hole');
    });

    it('should fail when sleeve_l is not a hole', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: baseArtifacts.polygons.map(p => 
          p.name === 'sleeve_l' ? { ...p, isHole: false } : p
        )
      };

      expect(() => preGenChecklist(artifacts)).toThrow('sleeve_l_must_be_hole');
    });

    it('should fail when sleeve_r is not a hole', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: baseArtifacts.polygons.map(p => 
          p.name === 'sleeve_r' ? { ...p, isHole: false } : p
        )
      };

      expect(() => preGenChecklist(artifacts)).toThrow('sleeve_r_must_be_hole');
    });

    it('should fail when multiple cavities are not holes', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: baseArtifacts.polygons.map(p => 
          ['neck', 'sleeve_l'].includes(p.name) ? { ...p, isHole: false } : p
        )
      };

      expect(() => preGenChecklist(artifacts)).toThrow();
    });
  });

  describe('Silhouette Completeness Validation', () => {
    it('should pass with valid silhouette URL', () => {
      expect(() => preGenChecklist(baseArtifacts)).not.toThrow();
    });

    it('should fail with missing silhouette URL', () => {
      const artifacts = {
        ...baseArtifacts,
        refined_silhouette_url: ''
      };

      expect(() => preGenChecklist(artifacts)).toThrow('silhouette_missing');
    });

    it('should fail without garment polygon', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: baseArtifacts.polygons.filter(p => p.name !== 'garment')
      };

      expect(() => preGenChecklist(artifacts)).toThrow('garment_polygon_missing');
    });
  });

  describe('Combined Quality Gate Scenarios', () => {
    it('should pass all gates with high-quality artifacts', () => {
      const highQualityArtifacts = {
        ...baseArtifacts,
        metrics: {
          ...baseArtifacts.metrics,
          symmetry: 0.98, // Excellent symmetry
          edge_roughness_px: 1.0, // Smooth edges
          shoulder_width_ratio: 0.50, // Perfect proportions
          neck_inner_ratio: 0.10
        }
      };

      expect(() => preGenChecklist(highQualityArtifacts)).not.toThrow();
    });

    it('should fail with multiple quality issues', () => {
      const poorQualityArtifacts = {
        ...baseArtifacts,
        metrics: {
          ...baseArtifacts.metrics,
          symmetry: 0.90, // Below threshold
          edge_roughness_px: 3.0 // Too rough
        },
        polygons: baseArtifacts.polygons.map(p => 
          p.name === 'neck' ? { ...p, isHole: false } : p // Wrong cavity polarity
        )
      };

      expect(() => preGenChecklist(poorQualityArtifacts)).toThrow();
    });

    it('should provide actionable error messages', () => {
      const poorQualityArtifacts = {
        ...baseArtifacts,
        metrics: {
          ...baseArtifacts.metrics,
          symmetry: 0.90,
          edge_roughness_px: 3.0
        }
      };

      try {
        preGenChecklist(poorQualityArtifacts);
        fail('Expected quality gates to fail');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        expect(errorMessage).toContain('symmetry_below_threshold');
        expect(errorMessage).toContain('edges_too_rough');
      }
    });
  });

  describe('Metric Validation Utilities', () => {
    it('should validate greater-than-or-equal metrics correctly', () => {
      expect(validateMetric(0.95, 0.95, 'gte')).toBe(true);
      expect(validateMetric(0.96, 0.95, 'gte')).toBe(true);
      expect(validateMetric(0.94, 0.95, 'gte')).toBe(false);
    });

    it('should validate less-than-or-equal metrics correctly', () => {
      expect(validateMetric(2.0, 2.0, 'lte')).toBe(true);
      expect(validateMetric(1.5, 2.0, 'lte')).toBe(true);
      expect(validateMetric(2.5, 2.0, 'lte')).toBe(false);
    });

    it('should validate equality metrics correctly', () => {
      expect(validateMetric(1.0, 1.0, 'eq')).toBe(true);
      expect(validateMetric(1.001, 1.0, 'eq')).toBe(false);
      expect(validateMetric(0.999, 1.0, 'eq')).toBe(false);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate symmetry recommendations', () => {
      const recommendations = generateRecommendations(['symmetry_below_threshold']);
      expect(recommendations).toContain('Apply bilateral symmetry correction to mask');
    });

    it('should generate edge roughness recommendations', () => {
      const recommendations = generateRecommendations(['edges_too_rough']);
      expect(recommendations).toContain('Apply Gaussian smoothing or morphological operations to edges');
    });

    it('should generate cavity polarity recommendations', () => {
      const recommendations = generateRecommendations(['neck_must_be_hole', 'sleeve_l_must_be_hole']);
      expect(recommendations.some(r => r.includes('Convert neck and sleeve regions to holes'))).toBe(true);
    });

    it('should generate silhouette recommendations', () => {
      const recommendations = generateRecommendations(['silhouette_missing']);
      expect(recommendations).toContain('Generate refined silhouette mask before proceeding');
    });

    it('should handle unknown failure types gracefully', () => {
      const recommendations = generateRecommendations(['unknown_failure_type']);
      expect(recommendations).toContain('Address quality issue: unknown_failure_type');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete quality gates check within 100ms', async () => {
      const startTime = Date.now();
      
      try {
        preGenChecklist(baseArtifacts);
      } catch (error) {
        // Ignore validation errors for performance test
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle large polygon sets efficiently', () => {
      const largePolygonSet = Array.from({ length: 50 }, (_, i) => ({
        name: `polygon_${i}` as any,
        pts: [[i * 10, 50], [(i + 1) * 10, 50], [(i + 1) * 10, 100], [i * 10, 100]] as [number, number][],
        isHole: i % 5 === 0
      }));

      const artifacts = {
        ...baseArtifacts,
        polygons: [...baseArtifacts.polygons, ...largePolygonSet]
      };

      const startTime = Date.now();
      
      try {
        preGenChecklist(artifacts);
      } catch (error) {
        // Ignore validation errors for performance test
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // Allow more time for large datasets
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle missing metrics gracefully', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: {
          ...baseArtifacts.metrics,
          symmetry: undefined as any,
          edge_roughness_px: undefined as any
        }
      };

      expect(() => preGenChecklist(artifacts)).toThrow();
    });

    it('should handle empty polygon arrays', () => {
      const artifacts = {
        ...baseArtifacts,
        polygons: []
      };

      expect(() => preGenChecklist(artifacts)).toThrow();
    });

    it('should handle extreme metric values', () => {
      const artifacts = {
        ...baseArtifacts,
        metrics: {
          ...baseArtifacts.metrics,
          symmetry: Number.MAX_VALUE,
          edge_roughness_px: Number.MIN_VALUE
        }
      };

      expect(() => preGenChecklist(artifacts)).not.toThrow();
    });
  });
});

describe('Quality Gate Integration', () => {
  it('should maintain consistent error codes for CI/CD', () => {
    const failingArtifacts: MaskArtifacts = {
      a_personless_url: 'test.jpg',
      a_skin_mask_url: 'mask.png',
      b_clean_url: 'clean.jpg',
      refined_silhouette_url: 'silhouette.png',
      polygons: [
        {
          name: 'garment',
          pts: [[0, 0], [100, 0], [100, 100], [0, 100]],
          isHole: false
        },
        {
          name: 'neck',
          pts: [[40, 0], [60, 0], [60, 20], [40, 20]],
          isHole: false // Wrong - should be hole
        }
      ],
      metrics: {
        symmetry: 0.90, // Below threshold
        edge_roughness_px: 3.0, // Too rough
        shoulder_width_ratio: 0.48,
        neck_inner_ratio: 0.12
      }
    };

    const expectedErrorCodes = [
      'symmetry_below_threshold',
      'edges_too_rough',
      'neck_must_be_hole'
    ];

    try {
      preGenChecklist(failingArtifacts);
      fail('Expected quality gates to fail');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      expectedErrorCodes.forEach(code => {
        expect(errorMessage).toContain(code);
      });
    }
  });

  it('should provide stable quality scoring', () => {
    const perfectArtifacts: MaskArtifacts = {
      a_personless_url: 'test.jpg',
      a_skin_mask_url: 'mask.png',
      b_clean_url: 'clean.jpg',
      refined_silhouette_url: 'silhouette.png',
      polygons: [
        {
          name: 'garment',
          pts: [[0, 0], [100, 0], [100, 100], [0, 100]],
          isHole: false
        },
        {
          name: 'neck',
          pts: [[40, 0], [60, 0], [60, 20], [40, 20]],
          isHole: true
        },
        {
          name: 'sleeve_l',
          pts: [[0, 20], [20, 20], [20, 60], [0, 60]],
          isHole: true
        },
        {
          name: 'sleeve_r',
          pts: [[80, 20], [100, 20], [100, 60], [80, 60]],
          isHole: true
        }
      ],
      metrics: {
        symmetry: 0.98,
        edge_roughness_px: 1.0,
        shoulder_width_ratio: 0.50,
        neck_inner_ratio: 0.10
      }
    };

    expect(() => preGenChecklist(perfectArtifacts)).not.toThrow();
  });
});
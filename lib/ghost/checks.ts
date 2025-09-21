/**
 * Pre-Generation Quality Gates - Hard fail-fast checks
 * 
 * Enforces quality gates BEFORE calling Flash API to prevent waste:
 * - Symmetry ≥0.95 threshold
 * - Edge roughness ≤2.0px
 * - Cavity polarity (neck/sleeves MUST be holes)
 * - Silhouette completeness
 */

import { MaskArtifacts, GhostPipelineError } from '../../types/ghost';

interface QualityGateConfig {
  symmetry: {
    minThreshold: number; // 0.95 minimum symmetry
    tolerance: number; // bilateral tolerance
  };
  edges: {
    maxRoughness: number; // 2.0px maximum roughness
    smoothnessThreshold: number; // edge smoothness requirement
  };
  cavities: {
    requiredHoles: string[]; // must be holes: neck, sleeve_l, sleeve_r
    maxHoleDeviation: number; // hole shape deviation tolerance
  };
  completeness: {
    minCoverage: number; // minimum silhouette coverage
    maxGaps: number; // maximum allowable gaps
  };
}

interface QualityGateResult {
  passed: boolean;
  failedChecks: string[];
  warnings: string[];
  metrics: {
    symmetryScore: number;
    edgeRoughness: number;
    holeValidation: { [key: string]: boolean };
    completenessScore: number;
  };
  recommendations: string[];
}

const DEFAULT_GATE_CONFIG: QualityGateConfig = {
  symmetry: {
    minThreshold: 0.95, // 95% minimum as per blueprint
    tolerance: 0.02 // 2% bilateral tolerance
  },
  edges: {
    maxRoughness: 2.0, // 2.0px maximum as per blueprint
    smoothnessThreshold: 0.85 // 85% smoothness
  },
  cavities: {
    requiredHoles: ['neck', 'sleeve_l', 'sleeve_r'], // must be holes
    maxHoleDeviation: 0.1 // 10% shape deviation max
  },
  completeness: {
    minCoverage: 0.90, // 90% minimum coverage
    maxGaps: 3 // maximum 3 gaps allowed
  }
};

/**
 * Pre-generation quality gate checklist - FAIL FAST
 * Throws errors for hard failures to prevent Flash API waste
 */
export function preGenChecklist(
  artifacts: MaskArtifacts,
  config: Partial<QualityGateConfig> = {}
): QualityGateResult {
  const finalConfig = { ...DEFAULT_GATE_CONFIG, ...config };
  
  console.log('[QualityGates] Running pre-generation checklist...');

  const result: QualityGateResult = {
    passed: true,
    failedChecks: [],
    warnings: [],
    metrics: {
      symmetryScore: artifacts.metrics.symmetry,
      edgeRoughness: artifacts.metrics.edge_roughness_px,
      holeValidation: {},
      completenessScore: 0
    },
    recommendations: []
  };

  // Gate 1: Silhouette completeness check
  checkSilhouetteCompleteness(artifacts, finalConfig, result);

  // Gate 2: Symmetry threshold check  
  checkSymmetryThreshold(artifacts, finalConfig, result);

  // Gate 3: Edge roughness check
  checkEdgeRoughness(artifacts, finalConfig, result);

  // Gate 4: Cavity polarity validation (CRITICAL)
  checkCavityPolarity(artifacts, finalConfig, result);

  // Gate 5: Overall completeness
  checkOverallCompleteness(artifacts, finalConfig, result);

  // Final determination
  result.passed = result.failedChecks.length === 0;

  if (!result.passed) {
    const errorMessage = `Pre-generation quality gates failed: ${result.failedChecks.join(', ')}`;
    console.error(`[QualityGates] ❌ ${errorMessage}`);
    
    // Hard fail - throw error to prevent Flash API call
    throw new GhostPipelineError(
      errorMessage,
      'QUALITY_GATES_FAILED',
      'preprocessing'
    );
  }

  console.log('[QualityGates] ✅ All quality gates passed');
  console.log(`[QualityGates] Symmetry: ${(result.metrics.symmetryScore * 100).toFixed(1)}%`);
  console.log(`[QualityGates] Edge roughness: ${result.metrics.edgeRoughness.toFixed(1)}px`);
  console.log(`[QualityGates] Completeness: ${(result.metrics.completenessScore * 100).toFixed(1)}%`);

  return result;
}

/**
 * Gate 1: Check silhouette URL exists and is accessible
 */
function checkSilhouetteCompleteness(
  artifacts: MaskArtifacts,
  config: QualityGateConfig,
  result: QualityGateResult
): void {
  if (!artifacts.refined_silhouette_url) {
    result.failedChecks.push('silhouette_missing');
    result.recommendations.push('Generate refined silhouette before proceeding');
    return;
  }

  // Check polygon completeness
  const hasMainGarment = artifacts.polygons.some(p => p.name === 'garment');
  if (!hasMainGarment) {
    result.failedChecks.push('garment_polygon_missing');
    result.recommendations.push('Ensure main garment polygon is generated');
  }

  // Calculate completeness score based on polygon coverage
  const totalPolygons = artifacts.polygons.length;
  const expectedPolygons = 4; // garment + neck + 2 sleeves minimum
  result.metrics.completenessScore = Math.min(totalPolygons / expectedPolygons, 1.0);

  if (result.metrics.completenessScore < config.completeness.minCoverage) {
    result.failedChecks.push('incomplete_silhouette');
    result.recommendations.push(`Silhouette completeness ${(result.metrics.completenessScore * 100).toFixed(1)}% below ${(config.completeness.minCoverage * 100).toFixed(1)}% threshold`);
  }
}

/**
 * Gate 2: Symmetry threshold validation (≥95%)
 */
function checkSymmetryThreshold(
  artifacts: MaskArtifacts,
  config: QualityGateConfig,
  result: QualityGateResult
): void {
  const symmetryScore = artifacts.metrics.symmetry;
  
  if (symmetryScore < config.symmetry.minThreshold) {
    result.failedChecks.push('symmetry_below_threshold');
    result.recommendations.push(
      `Symmetry ${(symmetryScore * 100).toFixed(1)}% below ${(config.symmetry.minThreshold * 100).toFixed(1)}% threshold. Apply symmetry correction.`
    );
  } else if (symmetryScore < config.symmetry.minThreshold + config.symmetry.tolerance) {
    result.warnings.push(`Symmetry ${(symmetryScore * 100).toFixed(1)}% is marginal`);
  }
}

/**
 * Gate 3: Edge roughness validation (≤2.0px)
 */
function checkEdgeRoughness(
  artifacts: MaskArtifacts,
  config: QualityGateConfig,
  result: QualityGateResult
): void {
  const edgeRoughness = artifacts.metrics.edge_roughness_px;
  
  if (edgeRoughness > config.edges.maxRoughness) {
    result.failedChecks.push('edges_too_rough');
    result.recommendations.push(
      `Edge roughness ${edgeRoughness.toFixed(1)}px exceeds ${config.edges.maxRoughness}px threshold. Apply edge smoothing.`
    );
  } else if (edgeRoughness > config.edges.maxRoughness * 0.8) {
    result.warnings.push(`Edge roughness ${edgeRoughness.toFixed(1)}px is near threshold`);
  }
}

/**
 * Gate 4: Cavity polarity validation (CRITICAL)
 * Neck and sleeves MUST be holes for proper ghost mannequin effect
 */
function checkCavityPolarity(
  artifacts: MaskArtifacts,
  config: QualityGateConfig,
  result: QualityGateResult
): void {
  const holes = new Set(
    artifacts.polygons
      .filter(p => p.isHole === true)
      .map(p => p.name)
  );

  for (const requiredHole of config.cavities.requiredHoles) {
    const isHole = holes.has(requiredHole as any);
    result.metrics.holeValidation[requiredHole] = isHole;
    
    if (!isHole) {
      result.failedChecks.push(`${requiredHole}_must_be_hole`);
      result.recommendations.push(`${requiredHole} must be marked as hole for ghost mannequin effect`);
    }
  }

  // Check for any non-hole cavities that should be holes
  const solidCavities = artifacts.polygons
    .filter(p => ['neck', 'sleeve_l', 'sleeve_r'].includes(p.name) && !p.isHole)
    .map(p => p.name);

  if (solidCavities.length > 0) {
    result.failedChecks.push('incorrect_cavity_polarity');
    result.recommendations.push(`Convert ${solidCavities.join(', ')} to holes`);
  }
}

/**
 * Gate 5: Overall completeness and structural integrity
 */
function checkOverallCompleteness(
  artifacts: MaskArtifacts,
  config: QualityGateConfig,
  result: QualityGateResult
): void {
  // Check proportional metrics
  const { shoulder_width_ratio, neck_inner_ratio } = artifacts.metrics;
  
  // Shoulder width should be reasonable (0.3 - 0.7 of total width)
  if (shoulder_width_ratio < 0.3 || shoulder_width_ratio > 0.7) {
    result.warnings.push(`Shoulder width ratio ${shoulder_width_ratio.toFixed(2)} may be unrealistic`);
  }

  // Neck inner ratio should be reasonable (0.05 - 0.25 of garment)  
  if (neck_inner_ratio < 0.05 || neck_inner_ratio > 0.25) {
    result.warnings.push(`Neck inner ratio ${neck_inner_ratio.toFixed(2)} may be unrealistic`);
  }

  // Check for minimum required polygons
  const requiredRegions = ['garment', 'neck'];
  const missingRegions = requiredRegions.filter(
    region => !artifacts.polygons.some(p => p.name === region)
  );

  if (missingRegions.length > 0) {
    result.failedChecks.push('missing_critical_regions');
    result.recommendations.push(`Missing critical regions: ${missingRegions.join(', ')}`);
  }
}

/**
 * Get quality gate summary for logging
 */
export function getQualityGateSummary(artifacts: MaskArtifacts): string {
  const summary = [
    `Symmetry: ${(artifacts.metrics.symmetry * 100).toFixed(1)}%`,
    `Edge roughness: ${artifacts.metrics.edge_roughness_px.toFixed(1)}px`,
    `Shoulder ratio: ${artifacts.metrics.shoulder_width_ratio.toFixed(2)}`,
    `Neck ratio: ${artifacts.metrics.neck_inner_ratio.toFixed(2)}`,
    `Polygons: ${artifacts.polygons.length}`,
    `Holes: ${artifacts.polygons.filter(p => p.isHole).length}`
  ];
  
  return `[QualityGates] ${summary.join(' | ')}`;
}

/**
 * Validate specific quality metric against threshold
 */
export function validateMetric(
  value: number,
  threshold: number,
  operator: 'gte' | 'lte' | 'eq' = 'gte'
): boolean {
  switch (operator) {
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    case 'eq': return Math.abs(value - threshold) < 0.0001; // Tighter tolerance for test precision
    default: return false;
  }
}

/**
 * Generate actionable recommendations for failed gates
 */
export function generateRecommendations(failedChecks: string[]): string[] {
  const recommendations: string[] = [];
  
  for (const check of failedChecks) {
    switch (check) {
      case 'symmetry_below_threshold':
        recommendations.push('Apply bilateral symmetry correction to mask');
        break;
      case 'edges_too_rough':
        recommendations.push('Apply Gaussian smoothing or morphological operations to edges');
        break;
      case 'neck_must_be_hole':
      case 'sleeve_l_must_be_hole':
      case 'sleeve_r_must_be_hole':
        recommendations.push('Convert neck and sleeve regions to holes for ghost mannequin effect');
        break;
      case 'silhouette_missing':
        recommendations.push('Generate refined silhouette mask before proceeding');
        break;
      case 'incomplete_silhouette':
        recommendations.push('Improve segmentation to capture complete garment boundary');
        break;
      default:
        recommendations.push(`Address quality issue: ${check}`);
    }
  }
  
  return recommendations;
}
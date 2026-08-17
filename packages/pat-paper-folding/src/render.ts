import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const gridLines = () => Array.from({ length: 5 }, (_, index) => [
  svgLine([index, 0], [index, 4], { stroke: "#999", "stroke-width": 0.04 }),
  svgLine([0, index], [4, index], { stroke: "#999", "stroke-width": 0.04 }),
]).flat();

/** Reflect a point across a line defined by point + unit direction. */
const reflectPoint = (pt: Vec2, linePoint: Vec2, lineDir: Vec2): Vec2 => {
  const dx = pt[0] - linePoint[0];
  const dy = pt[1] - linePoint[1];
  // Project onto line direction
  const proj = dx * lineDir[0] + dy * lineDir[1];
  // Perpendicular component
  const perpX = dx - proj * lineDir[0];
  const perpY = dy - proj * lineDir[1];
  // Reflect: subtract twice the perpendicular
  return [pt[0] - 2 * perpX, pt[1] - 2 * perpY];
};

/** Clip polygon to one side of a line. Sutherland-Hodgman style. */
const clipPolygon = (polygon: Vec2[], linePoint: Vec2, lineDir: Vec2, keepPositive: boolean): Vec2[] => {
  if (polygon.length < 3) return polygon;
  const result: Vec2[] = [];
  const normal: Vec2 = [-lineDir[1], lineDir[0]]; // perpendicular normal
  const side = (pt: Vec2): number => {
    const d = (pt[0] - linePoint[0]) * normal[0] + (pt[1] - linePoint[1]) * normal[1];
    return keepPositive ? d : -d;
  };
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    const currSide = side(curr);
    const nextSide = side(next);
    if (currSide >= -1e-9) {
      result.push(curr);
      if (nextSide < -1e-9) {
        // Exiting: add intersection
        const t = currSide / (currSide - nextSide);
        result.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])]);
      }
    } else if (nextSide >= -1e-9) {
      // Entering: add intersection
      const t = currSide / (currSide - nextSide);
      result.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])]);
    }
  }
  return result;
};

/** Compute the folded polygon after applying folds up to `step`. */
const computeFoldedPolygon = (folds: readonly FoldInstruction[], step: number): Vec2[] => {
  let polygon: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  for (let i = 0; i < step; i++) {
    const fold = folds[i]!;
    const lp = fold.line.point;
    const ld = fold.line.unitDirection;
    const movingSide = fold.movingSide === 1;
    // Clip the moving side
    const movingPart = clipPolygon(polygon, lp, ld, movingSide);
    const stayingPart = clipPolygon(polygon, lp, ld, !movingSide);
    // Reflect the moving part
    const reflected = movingPart.map(pt => reflectPoint(pt, lp, ld));
    // Union: combine staying + reflected (simplified: just concatenate)
    polygon = [...stayingPart, ...reflected];
  }
  return polygon;
};

/** Get the fold line endpoints clipped to the paper boundary. */
const foldLineEndpoints = (fold: FoldInstruction, polygon: Vec2[]): Vec2[] => {
  const lp = fold.line.point;
  const ld = fold.line.unitDirection;
  const extent = 6;
  const a: Vec2 = [lp[0] - ld[0] * extent, lp[1] - ld[1] * extent];
  const b: Vec2 = [lp[0] + ld[0] * extent, lp[1] + ld[1] * extent];
  // Clip to polygon bounds
  const minX = Math.min(...polygon.map(p => p[0]));
  const maxX = Math.max(...polygon.map(p => p[0]));
  const minY = Math.min(...polygon.map(p => p[1]));
  const maxY = Math.max(...polygon.map(p => p[1]));
  const clamp = (v: Vec2): Vec2 => [
    Math.max(minX, Math.min(maxX, v[0])),
    Math.max(minY, Math.min(maxY, v[1])),
  ];
  return [clamp(a), clamp(b)];
};

export const renderHolePattern = (holes: readonly Vec2[], title: string): string => {
  const holeSet = new Set(holes.map(([x, y]) => `${x},${y}`));
  const circles: ReturnType<typeof svgCircle>[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col + 0.5, cy = row + 0.5;
      const isHole = holeSet.has(`${cx},${cy}`);
      circles.push(svgCircle([cx, cy], 0.16, isHole
        ? { fill: "black", stroke: "black", "stroke-width": 0.04 }
        : { fill: "none", stroke: "black", "stroke-width": 0.04 }));
    }
  }
  return svgDocument({
    viewBox: [-0.2, -0.2, 4.4, 4.4],
    title,
    children: [
      svgPolygon([[0, 0], [4, 0], [4, 4], [0, 4]], { fill: "white", stroke: "black", "stroke-width": 0.08 }),
      ...gridLines(),
      ...circles,
    ],
  });
};

/**
 * Render a paper folding step.
 *
 * DAT convention:
 * - Solid lines = current folded paper boundary
 * - Dashed lines = original paper boundary (reference)
 * - Fold crease lines shown inside the paper
 * - Punch circles shown on the last step
 */
export const renderFoldStep = (
  folds: readonly FoldInstruction[],
  punches: readonly Vec2[],
  step: number,
): string => {
  // Original paper boundary (always shown as dashed reference)
  const originalBoundary: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];

  // Folded polygon (solid)
  const foldedPolygon = computeFoldedPolygon(folds, step);

  // Fold crease lines for this step
  const foldLines = folds.slice(0, step).map((fold) => {
    const endpoints = foldLineEndpoints(fold, foldedPolygon);
    const a = endpoints[0]!;
    const b = endpoints[1]!;
    return svgLine(a, b, {
      "data-fold-id": fold.id,
      stroke: "black",
      "stroke-width": 0.06,
    });
  });

  // Punch circles (only on the last step)
  const punchCircles = step === folds.length
    ? punches.map((point) => svgCircle(point, 0.16, { fill: "black", stroke: "black", "stroke-width": 0.04 }))
    : [];

  return svgDocument({
    viewBox: [-0.3, -0.3, 4.6, 4.6],
    title: `Paper folding step ${step}`,
    children: [
      // Original paper boundary as dashed reference
      svgPolygon(originalBoundary, {
        fill: "none",
        stroke: "#999",
        "stroke-dasharray": "0.2 0.15",
        "stroke-width": 0.06,
      }),
      // Current folded paper as solid
      svgPolygon(foldedPolygon, {
        fill: "white",
        stroke: "black",
        "stroke-width": 0.08,
        "stroke-linejoin": "round",
      }),
      ...foldLines,
      ...punchCircles,
    ],
  });
};

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
  const proj = dx * lineDir[0] + dy * lineDir[1];
  const perpX = dx - proj * lineDir[0];
  const perpY = dy - proj * lineDir[1];
  return [pt[0] - 2 * perpX, pt[1] - 2 * perpY];
};

/** Clip polygon to one side of a line. Sutherland-Hodgman style. */
const clipPolygon = (polygon: readonly Vec2[], linePoint: Vec2, lineDir: Vec2, keepPositive: boolean): Vec2[] => {
  if (polygon.length < 3) return [];
  const result: Vec2[] = [];
  const normal: Vec2 = [-lineDir[1], lineDir[0]];
  const side = (pt: Vec2): number => {
    const d = (pt[0] - linePoint[0]) * normal[0] + (pt[1] - linePoint[1]) * normal[1];
    return keepPositive ? d : -d;
  };
  for (let i = 0; i < polygon.length; i += 1) {
    const curr = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    const currSide = side(curr);
    const nextSide = side(next);
    if (currSide >= -1e-9) {
      result.push(curr);
      if (nextSide < -1e-9) {
        const t = currSide / (currSide - nextSide);
        result.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])]);
      }
    } else if (nextSide >= -1e-9) {
      const t = currSide / (currSide - nextSide);
      result.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])]);
    }
  }
  return result;
};

const cross = (o: Vec2, a: Vec2, b: Vec2): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/**
 * Fold steps used by the generator are convex clips. Rebuilding the boundary
 * from the convex hull avoids the self-intersecting polygon produced by simply
 * concatenating the staying and reflected vertex lists.
 */
const convexHull = (points: readonly Vec2[]): Vec2[] => {
  const unique = [...new Map(points.map((point) => [`${point[0].toFixed(9)},${point[1].toFixed(9)}`, point] as const)).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length <= 2) return unique;
  const lower: Vec2[] = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 1e-9) lower.pop();
    lower.push(point);
  }
  const upper: Vec2[] = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 1e-9) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

/** Compute a valid folded outline after applying folds up to `step`. */
const computeFoldedPolygon = (folds: readonly FoldInstruction[], step: number): Vec2[] => {
  let polygon: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  for (let i = 0; i < step; i += 1) {
    const fold = folds[i]!;
    const lp = fold.line.point;
    const ld = fold.line.unitDirection;
    const movingSide = fold.movingSide === 1;
    const movingPart = clipPolygon(polygon, lp, ld, movingSide);
    const stayingPart = clipPolygon(polygon, lp, ld, !movingSide);
    const reflected = movingPart.map((point) => reflectPoint(point, lp, ld));
    polygon = convexHull([...stayingPart, ...reflected]);
  }
  return polygon;
};

/** Get fold-line endpoints constrained to the current folded outline bounds. */
const foldLineEndpoints = (fold: FoldInstruction, polygon: readonly Vec2[]): readonly [Vec2, Vec2] => {
  const lp = fold.line.point;
  const ld = fold.line.unitDirection;
  const extent = 6;
  const a: Vec2 = [lp[0] - ld[0] * extent, lp[1] - ld[1] * extent];
  const b: Vec2 = [lp[0] + ld[0] * extent, lp[1] + ld[1] * extent];
  const minX = Math.min(...polygon.map((point) => point[0]));
  const maxX = Math.max(...polygon.map((point) => point[0]));
  const minY = Math.min(...polygon.map((point) => point[1]));
  const maxY = Math.max(...polygon.map((point) => point[1]));
  const clamp = (value: Vec2): Vec2 => [
    Math.max(minX, Math.min(maxX, value[0])),
    Math.max(minY, Math.min(maxY, value[1])),
  ];
  return [clamp(a), clamp(b)];
};

export const renderHolePattern = (holes: readonly Vec2[], title: string): string => {
  const holeSet = new Set(holes.map(([x, y]) => `${x},${y}`));
  const circles: ReturnType<typeof svgCircle>[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const cx = col + 0.5;
      const cy = row + 0.5;
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

/** Render one DAT-style fold state; the final state shows an outline punch. */
export const renderFoldStep = (
  folds: readonly FoldInstruction[],
  punches: readonly Vec2[],
  step: number,
): string => {
  const originalBoundary: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const foldedPolygon = computeFoldedPolygon(folds, step);
  const foldLines = folds.slice(0, step).map((fold) => {
    const [a, b] = foldLineEndpoints(fold, foldedPolygon);
    return svgLine(a, b, {
      "data-fold-id": fold.id,
      stroke: "black",
      "stroke-width": 0.06,
    });
  });
  const punchCircles = step === folds.length
    ? punches.map((point) => svgCircle(point, 0.16, { fill: "white", stroke: "black", "stroke-width": 0.07 }))
    : [];

  return svgDocument({
    viewBox: [-0.3, -0.3, 4.6, 4.6],
    title: `Paper folding step ${step}`,
    children: [
      svgPolygon(originalBoundary, {
        fill: "none",
        stroke: "#999",
        "stroke-dasharray": "0.2 0.15",
        "stroke-width": 0.06,
      }),
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

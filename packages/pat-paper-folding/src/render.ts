import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const gridLines = () => Array.from({ length: 5 }, (_, index) => [
  svgLine([index, 0], [index, 4], { stroke: "#999", "stroke-width": 0.04 }),
  svgLine([0, index], [4, index], { stroke: "#999", "stroke-width": 0.04 }),
]).flat();

const reflectPoint = (pt: Vec2, linePoint: Vec2, lineDir: Vec2): Vec2 => {
  const dx = pt[0] - linePoint[0];
  const dy = pt[1] - linePoint[1];
  const proj = dx * lineDir[0] + dy * lineDir[1];
  const perpX = dx - proj * lineDir[0];
  const perpY = dy - proj * lineDir[1];
  return [pt[0] - 2 * perpX, pt[1] - 2 * perpY];
};

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

const polygonArea = (polygon: readonly Vec2[]): number => Math.abs(polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return next === undefined ? sum : sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2);

/** Compute the visible occupied paper outline after completed folds. */
const computeFoldedPolygon = (folds: readonly FoldInstruction[], step: number): Vec2[] => {
  let polygon: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  for (let i = 0; i < step; i += 1) {
    const fold = folds[i]!;
    const movingSide = fold.movingSide === 1;
    const movingPart = clipPolygon(polygon, fold.line.point, fold.line.unitDirection, movingSide);
    const stayingPart = clipPolygon(polygon, fold.line.point, fold.line.unitDirection, !movingSide);
    const reflected = movingPart.map((point) => reflectPoint(point, fold.line.point, fold.line.unitDirection));
    const next = convexHull([...stayingPart, ...reflected]);
    // A valid fold always leaves finite paper area. Preserve the previous valid
    // outline if floating-point clipping ever collapses the display geometry.
    if (next.length >= 3 && polygonArea(next) > 1e-4) polygon = next;
  }
  return polygon;
};

const lineIntersection = (
  linePoint: Vec2,
  lineDir: Vec2,
  a: Vec2,
  b: Vec2,
): Vec2 | undefined => {
  const edge: Vec2 = [b[0] - a[0], b[1] - a[1]];
  const denominator = lineDir[0] * edge[1] - lineDir[1] * edge[0];
  if (Math.abs(denominator) <= 1e-9) return undefined;
  const delta: Vec2 = [a[0] - linePoint[0], a[1] - linePoint[1]];
  const edgeT = (delta[0] * lineDir[1] - delta[1] * lineDir[0]) / denominator;
  if (edgeT < -1e-9 || edgeT > 1 + 1e-9) return undefined;
  return [a[0] + edge[0] * edgeT, a[1] + edge[1] * edgeT];
};

const foldLineEndpoints = (
  fold: FoldInstruction,
  polygon: readonly Vec2[],
): readonly [Vec2, Vec2] | undefined => {
  const intersections: Vec2[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    if (a === undefined || b === undefined) continue;
    const point = lineIntersection(fold.line.point, fold.line.unitDirection, a, b);
    if (point !== undefined && !intersections.some((existing) =>
      Math.hypot(existing[0] - point[0], existing[1] - point[1]) < 1e-6)) intersections.push(point);
  }
  if (intersections.length < 2) return undefined;
  let best: readonly [Vec2, Vec2] = [intersections[0]!, intersections[1]!];
  let bestDistance = Math.hypot(best[1][0] - best[0][0], best[1][1] - best[0][1]);
  for (let first = 0; first < intersections.length; first += 1) {
    for (let second = first + 1; second < intersections.length; second += 1) {
      const a = intersections[first]!;
      const b = intersections[second]!;
      const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (distance > bestDistance) {
        best = [a, b];
        bestDistance = distance;
      }
    }
  }
  return best;
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

/**
 * Render one DAT-style fold state. A pre-fold panel shows only the next dashed
 * fold line; completed fold lines are omitted. The last panel shows the actual
 * folded paper with the punch and no ghost outline of the original sheet.
 */
export const renderFoldStep = (
  folds: readonly FoldInstruction[],
  punches: readonly Vec2[],
  step: number,
): string => {
  const foldedPolygon = computeFoldedPolygon(folds, step);
  const nextFold = folds[step];
  const endpoints = nextFold === undefined ? undefined : foldLineEndpoints(nextFold, foldedPolygon);
  const foldLine = nextFold === undefined || endpoints === undefined
    ? []
    : [svgLine(endpoints[0], endpoints[1], {
      "data-fold-id": nextFold.id,
      stroke: "black",
      "stroke-dasharray": "0.18 0.12",
      "stroke-width": 0.055,
    })];
  const punchCircles = step === folds.length
    ? punches.map((point) => svgCircle(point, 0.16, { fill: "white", stroke: "black", "stroke-width": 0.07 }))
    : [];

  return svgDocument({
    viewBox: [-0.2, -0.2, 4.4, 4.4],
    title: `Paper folding step ${step}`,
    children: [
      svgPolygon(foldedPolygon, {
        fill: "white",
        stroke: "black",
        "stroke-width": 0.08,
        "stroke-linejoin": "round",
      }),
      ...foldLine,
      ...punchCircles,
    ],
  });
};

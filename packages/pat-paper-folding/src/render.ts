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

const clipPolygon = (
  polygon: readonly Vec2[],
  linePoint: Vec2,
  lineDir: Vec2,
  keepPositive: boolean,
): Vec2[] => {
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
  const unique = [...new Map(points.map((point) => [
    `${point[0].toFixed(9)},${point[1].toFixed(9)}`,
    point,
  ] as const)).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
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

/** Compute the occupied paper outline after `completedFoldCount` folds. */
const computeFoldedPolygon = (
  folds: readonly FoldInstruction[],
  completedFoldCount: number,
): Vec2[] => {
  let polygon: Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
  for (let i = 0; i < completedFoldCount; i += 1) {
    const fold = folds[i]!;
    const movingSide = fold.movingSide === 1;
    const movingPart = clipPolygon(polygon, fold.line.point, fold.line.unitDirection, movingSide);
    const stayingPart = clipPolygon(polygon, fold.line.point, fold.line.unitDirection, !movingSide);
    const reflected = movingPart.map((point) =>
      reflectPoint(point, fold.line.point, fold.line.unitDirection));
    const next = convexHull([...stayingPart, ...reflected]);
    if (next.length >= 3 && polygonArea(next) > 1e-4) polygon = next;
  }
  return polygon;
};

/**
 * Return the piece in its pre-fold position. The spec uses broken/dashed lines
 * for previous paper location and solid lines for current folded paper.
 */
const computeFoldedAwayPart = (
  folds: readonly FoldInstruction[],
  completedFoldCount: number,
): Vec2[] => {
  if (completedFoldCount <= 0) return [];
  const fold = folds[completedFoldCount - 1];
  if (fold === undefined) return [];
  const previous = computeFoldedPolygon(folds, completedFoldCount - 1);
  return clipPolygon(
    previous,
    fold.line.point,
    fold.line.unitDirection,
    fold.movingSide === 1,
  );
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
      svgPolygon([[0, 0], [4, 0], [4, 4], [0, 4]], {
        fill: "white",
        stroke: "black",
        "stroke-width": 0.08,
      }),
      ...gridLines(),
      ...circles,
    ],
  });
};

/**
 * Render the scored fold sequence using the DAT line convention.
 *
 * Frame index 0 means "after fold 1", frame index 1 means "after fold 2", etc.
 * The final frame (index === folds.length) is the punch frame. Fold frames show
 * the piece that moved in its prior position as a dashed ghost, then draw the
 * current paper as a solid white polygon on top. No crease/fold line is drawn.
 */
export const renderFoldStep = (
  folds: readonly FoldInstruction[],
  punches: readonly Vec2[],
  step: number,
): string => {
  const punchFrame = step >= folds.length;
  const completedFoldCount = punchFrame
    ? folds.length
    : Math.min(folds.length, step + 1);
  const foldedPolygon = computeFoldedPolygon(folds, completedFoldCount);
  const foldedAwayPart = punchFrame
    ? []
    : computeFoldedAwayPart(folds, completedFoldCount);

  const ghost = foldedAwayPart.length >= 3
    ? [svgPolygon(foldedAwayPart, {
      "data-folded-away": String(completedFoldCount),
      fill: "none",
      stroke: "black",
      "stroke-dasharray": "0.16 0.12",
      "stroke-width": 0.06,
      "stroke-linejoin": "round",
    })]
    : [];
  const punchCircles = punchFrame
    ? punches.map((point) => svgCircle(point, 0.16, {
      fill: "white",
      stroke: "black",
      "stroke-width": 0.07,
    }))
    : [];

  return svgDocument({
    viewBox: [-0.2, -0.2, 4.4, 4.4],
    title: punchFrame ? "Paper folding punch" : `Paper folding fold ${completedFoldCount}`,
    children: [
      ...ghost,
      svgPolygon(foldedPolygon, {
        fill: "white",
        stroke: "black",
        "stroke-width": 0.08,
        "stroke-linejoin": "round",
      }),
      ...punchCircles,
    ],
  });
};

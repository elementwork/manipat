import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const ORIGINAL_SQUARE: readonly Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];

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

const polygonArea = (polygon: readonly Vec2[]): number => Math.abs(polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return next === undefined ? sum : sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2);

interface VisualPanel {
  readonly polygon: readonly Vec2[];
}

const panelKey = (polygon: readonly Vec2[]): string => polygon
  .map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`)
  .sort()
  .join("|");

/** Keep the topmost copy when multiple folded layers occupy the exact same polygon. */
const dedupePanels = (panels: readonly VisualPanel[]): readonly VisualPanel[] => {
  const result = new Map<string, VisualPanel>();
  for (const panel of panels) {
    if (panel.polygon.length < 3 || polygonArea(panel.polygon) <= 1e-6) continue;
    const key = panelKey(panel.polygon);
    if (result.has(key)) result.delete(key);
    result.set(key, panel);
  }
  return [...result.values()];
};

/**
 * Apply one visual fold while preserving panel boundaries and layer order.
 *
 * The old renderer merged the result into one convex hull. That erased the
 * folded-over flap boundary and produced diagrams unlike the ADA/golden
 * examples. Here the current sheet remains a stack of polygons: stationary
 * pieces stay below, moving pieces are reflected and their stack order reverses
 * as they fold onto the stationary paper.
 */
const applyVisualFold = (
  panels: readonly VisualPanel[],
  fold: FoldInstruction,
): readonly VisualPanel[] => {
  const movingPositive = fold.movingSide === 1;
  const stationary: VisualPanel[] = [];
  const moving: VisualPanel[] = [];

  for (const panel of panels) {
    const stayingPolygon = clipPolygon(
      panel.polygon,
      fold.line.point,
      fold.line.unitDirection,
      !movingPositive,
    );
    if (stayingPolygon.length >= 3 && polygonArea(stayingPolygon) > 1e-6) {
      stationary.push({ polygon: stayingPolygon });
    }

    const movingPolygon = clipPolygon(
      panel.polygon,
      fold.line.point,
      fold.line.unitDirection,
      movingPositive,
    );
    if (movingPolygon.length >= 3 && polygonArea(movingPolygon) > 1e-6) {
      moving.push({
        polygon: movingPolygon.map((point) =>
          reflectPoint(point, fold.line.point, fold.line.unitDirection)),
      });
    }
  }

  return dedupePanels([...stationary, ...moving.reverse()]);
};

/** Compute the visible folded-paper panel stack after N completed folds. */
const computeVisualPanels = (
  folds: readonly FoldInstruction[],
  completedFoldCount: number,
): readonly VisualPanel[] => {
  let panels: readonly VisualPanel[] = [{ polygon: ORIGINAL_SQUARE }];
  for (let index = 0; index < completedFoldCount; index += 1) {
    const fold = folds[index];
    if (fold !== undefined) panels = applyVisualFold(panels, fold);
  }
  return panels;
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
      svgPolygon(ORIGINAL_SQUARE, {
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
 * Render the scored fold sequence using the DAT/golden visual grammar.
 *
 * Every state panel retains the broken outline of the original square as a
 * spatial reference. Solid white polygons show the current folded paper, with
 * folded-over panels remaining separately outlined rather than being collapsed
 * into one silhouette. The final state adds the punch on top of that same folded
 * panel stack. No synthetic crease line or arrow is drawn.
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
  const panels = computeVisualPanels(folds, completedFoldCount);

  const currentPaper = panels.map(({ polygon }, index) => svgPolygon(polygon, {
    "data-paper-panel": String(index),
    fill: "white",
    stroke: "black",
    "stroke-width": 0.08,
    "stroke-linejoin": "round",
  }));
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
      svgPolygon(ORIGINAL_SQUARE, {
        "data-original-position": "true",
        fill: "none",
        stroke: "black",
        "stroke-dasharray": "0.18 0.14",
        "stroke-width": 0.06,
        "stroke-linejoin": "round",
      }),
      ...currentPaper,
      ...punchCircles,
    ],
  });
};

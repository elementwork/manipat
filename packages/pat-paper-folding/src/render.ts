import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const ORIGINAL_SQUARE: readonly Vec2[] = [[0, 0], [4, 0], [4, 4], [0, 4]];
const VISUAL_EPS = 1e-7;

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

const cross = (a: Vec2, b: Vec2, c: Vec2): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const segmentLength = (a: Vec2, b: Vec2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

const collinearSegmentsShareLength = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean => {
  if (Math.abs(cross(a, b, c)) > VISUAL_EPS || Math.abs(cross(a, b, d)) > VISUAL_EPS) return false;
  const useX = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  const firstMin = Math.min(useX ? a[0] : a[1], useX ? b[0] : b[1]);
  const firstMax = Math.max(useX ? a[0] : a[1], useX ? b[0] : b[1]);
  const secondMin = Math.min(useX ? c[0] : c[1], useX ? d[0] : d[1]);
  const secondMax = Math.max(useX ? c[0] : c[1], useX ? d[0] : d[1]);
  return Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin) > VISUAL_EPS;
};

const segmentsProperlyIntersect = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean => {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD < -VISUAL_EPS && cdA * cdB < -VISUAL_EPS;
};

const pointStrictlyInsidePolygon = (point: Vec2, polygon: readonly Vec2[]): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index]!;
    const b = polygon[previous]!;
    if (Math.abs(cross(a, b, point)) <= VISUAL_EPS
      && point[0] >= Math.min(a[0], b[0]) - VISUAL_EPS
      && point[0] <= Math.max(a[0], b[0]) + VISUAL_EPS
      && point[1] >= Math.min(a[1], b[1]) - VISUAL_EPS
      && point[1] <= Math.max(a[1], b[1]) + VISUAL_EPS) return false;
    const crosses = (a[1] > point[1]) !== (b[1] > point[1]);
    if (crosses) {
      const x = a[0] + (point[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
      if (x > point[0]) inside = !inside;
    }
  }
  return inside;
};

const polygonsSharePhysicalRegion = (first: readonly Vec2[], second: readonly Vec2[]): boolean => {
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const a = first[firstIndex]!;
    const b = first[(firstIndex + 1) % first.length]!;
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const c = second[secondIndex]!;
      const d = second[(secondIndex + 1) % second.length]!;
      if (collinearSegmentsShareLength(a, b, c, d) || segmentsProperlyIntersect(a, b, c, d)) return true;
    }
  }
  return first.some((point) => pointStrictlyInsidePolygon(point, second))
    || second.some((point) => pointStrictlyInsidePolygon(point, first));
};

const polygonsFormSingleConnectedRegion = (polygons: readonly (readonly Vec2[])[]): boolean => {
  if (polygons.length === 0) return false;
  const reached = new Set<number>([0]);
  const pending = [0];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (let candidate = 0; candidate < polygons.length; candidate += 1) {
      if (reached.has(candidate)) continue;
      const first = polygons[current];
      const second = polygons[candidate];
      if (first === undefined || second === undefined || !polygonsSharePhysicalRegion(first, second)) continue;
      reached.add(candidate);
      pending.push(candidate);
    }
  }
  return reached.size === polygons.length;
};

const polygonHasCreaseSegment = (
  polygon: readonly Vec2[],
  fold: FoldInstruction,
): boolean => polygon.some((point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  if (next === undefined || segmentLength(point, next) <= VISUAL_EPS) return false;
  return Math.abs(cross(fold.line.point, [
    fold.line.point[0] + fold.line.unitDirection[0],
    fold.line.point[1] + fold.line.unitDirection[1],
  ], point)) <= VISUAL_EPS
    && Math.abs(cross(fold.line.point, [
      fold.line.point[0] + fold.line.unitDirection[0],
      fold.line.point[1] + fold.line.unitDirection[1],
    ], next)) <= VISUAL_EPS;
});

export interface PaperVisualPanel {
  readonly polygon: readonly Vec2[];
}

export interface PaperVisualFoldTransition {
  readonly foldId: string;
  readonly line: {
    readonly point: Vec2;
    readonly unitDirection: Vec2;
  };
  readonly stationaryPolygons: readonly (readonly Vec2[])[];
  /** Moving polygons are recorded before reflection so the browser can animate the hinge. */
  readonly movingPolygons: readonly (readonly Vec2[])[];
}

const panelKey = (polygon: readonly Vec2[]): string => polygon
  .map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`)
  .sort()
  .join("|");

/** Keep the topmost copy when multiple folded layers occupy the exact same polygon. */
const dedupePanels = (panels: readonly PaperVisualPanel[]): readonly PaperVisualPanel[] => {
  const result = new Map<string, PaperVisualPanel>();
  for (const panel of panels) {
    if (panel.polygon.length < 3 || polygonArea(panel.polygon) <= 1e-6) continue;
    const key = panelKey(panel.polygon);
    if (result.has(key)) result.delete(key);
    result.set(key, panel);
  }
  return [...result.values()];
};

const splitVisualFold = (
  panels: readonly PaperVisualPanel[],
  fold: FoldInstruction,
): {
  readonly stationary: readonly PaperVisualPanel[];
  readonly moving: readonly PaperVisualPanel[];
} => {
  const movingPositive = fold.movingSide === 1;
  const stationary: PaperVisualPanel[] = [];
  const moving: PaperVisualPanel[] = [];
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
      moving.push({ polygon: movingPolygon });
    }
  }
  return { stationary, moving };
};

/** Apply one visual fold while preserving panel boundaries and layer order. */
const applyVisualFold = (
  panels: readonly PaperVisualPanel[],
  fold: FoldInstruction,
): readonly PaperVisualPanel[] => {
  const { stationary, moving } = splitVisualFold(panels, fold);
  const reflected = moving.map(({ polygon }): PaperVisualPanel => ({
    polygon: polygon.map((point) => reflectPoint(point, fold.line.point, fold.line.unitDirection)),
  }));
  return dedupePanels([...stationary, ...reflected.reverse()]);
};

/** Compute the visible folded-paper panel stack after N completed folds. */
const computeVisualPanels = (
  folds: readonly FoldInstruction[],
  completedFoldCount: number,
): readonly PaperVisualPanel[] => {
  let panels: readonly PaperVisualPanel[] = [{ polygon: ORIGINAL_SQUARE }];
  for (let index = 0; index < completedFoldCount; index += 1) {
    const fold = folds[index];
    if (fold !== undefined) panels = applyVisualFold(panels, fold);
  }
  return panels;
};

/**
 * DAT Paper Folding shows one physical fold per consecutive panel. A candidate
 * transition is accepted only when its moving footprint is one connected flap
 * or stack attached to the crease. This rejects a single FoldInstruction that
 * would visually move disconnected paper pieces at the same time.
 */
export const isSinglePhysicalFoldTransition = (
  completedFolds: readonly FoldInstruction[],
  fold: FoldInstruction,
): boolean => {
  const panels = computeVisualPanels(completedFolds, completedFolds.length);
  const { stationary, moving } = splitVisualFold(panels, fold);
  if (stationary.length === 0 || moving.length === 0) return false;
  const movingPolygons = moving.map(({ polygon }) => polygon);
  return polygonsFormSingleConnectedRegion(movingPolygons)
    && movingPolygons.some((polygon) => polygonHasCreaseSegment(polygon, fold));
};

/**
 * Return deterministic panel geometry for every forward fold. This is a visual
 * projection of the canonical fold program, not a separate folding solver.
 */
export const buildPaperVisualFoldTransitions = (
  folds: readonly FoldInstruction[],
): readonly PaperVisualFoldTransition[] => {
  let panels: readonly PaperVisualPanel[] = [{ polygon: ORIGINAL_SQUARE }];
  const result: PaperVisualFoldTransition[] = [];
  for (const fold of folds) {
    const { stationary, moving } = splitVisualFold(panels, fold);
    result.push({
      foldId: fold.id,
      line: { point: fold.line.point, unitDirection: fold.line.unitDirection },
      stationaryPolygons: stationary.map(({ polygon }) => polygon),
      movingPolygons: moving.map(({ polygon }) => polygon),
    });
    panels = applyVisualFold(panels, fold);
  }
  return result;
};

/** Figure A: original square, fixed in the page coordinate frame. */
export const renderOriginalSheet = (): string => svgDocument({
  viewBox: [-0.2, -0.2, 4.4, 4.4],
  title: "Paper folding original sheet",
  children: [
    svgPolygon(ORIGINAL_SQUARE, {
      "data-original-sheet": "true",
      fill: "white",
      stroke: "black",
      "stroke-width": 0.08,
      "stroke-linejoin": "round",
    }),
  ],
});

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

/** Render the scored fold sequence using the DAT/golden visual grammar. */
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

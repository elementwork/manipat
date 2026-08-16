import { EPS, type Vec2 } from "@manipat/core";
import type {
  FoldInstruction,
  FoldLine,
  FoldState,
  PaperLayer,
  Punch,
} from "./types.js";

const roundGrid = (value: number): number => Math.round(value * 2) / 2;

export const signedDistanceFromFold = (point: Vec2, line: FoldLine): number => {
  const relative: Vec2 = [point[0] - line.point[0], point[1] - line.point[1]];
  return line.unitDirection[0] * relative[1] - line.unitDirection[1] * relative[0];
};

export const reflectPoint = (point: Vec2, line: FoldLine): Vec2 => {
  const relative: Vec2 = [point[0] - line.point[0], point[1] - line.point[1]];
  const projection = relative[0] * line.unitDirection[0] + relative[1] * line.unitDirection[1];
  const projected: Vec2 = [
    line.point[0] + projection * line.unitDirection[0],
    line.point[1] + projection * line.unitDirection[1],
  ];
  return [
    roundGrid(projected[0] * 2 - point[0]),
    roundGrid(projected[1] * 2 - point[1]),
  ];
};

const tilePolygon = ([x, y]: Vec2): readonly Vec2[] => [
  [x - 0.5, y - 0.5], [x + 0.5, y - 0.5],
  [x + 0.5, y + 0.5], [x - 0.5, y + 0.5],
];

export const createInitialFoldState = (): FoldState => ({
  layers: Array.from({ length: 16 }, (_, index): PaperLayer => {
    const center: Vec2 = [index % 4 + 0.5, Math.floor(index / 4) + 0.5];
    return {
      id: `layer-${index}`,
      polygon: tilePolygon(center),
      currentCenter: center,
      sourceCenter: center,
      transformHistory: [],
      depthOrder: index,
      sourceLayerId: `layer-${index}`,
    };
  }),
  punches: [],
  folds: [],
});

export const applyFold = (state: FoldState, instruction: FoldInstruction): FoldState => ({
  ...state,
  folds: [...state.folds, instruction],
  layers: state.layers.map((layer, index): PaperLayer => {
    const distance = signedDistanceFromFold(layer.currentCenter, instruction.line);
    const moves = Math.abs(distance) > EPS.point && Math.sign(distance) === instruction.movingSide;
    const currentCenter = moves
      ? reflectPoint(layer.currentCenter, instruction.line)
      : layer.currentCenter;
    return {
      ...layer,
      polygon: tilePolygon(currentCenter),
      currentCenter,
      transformHistory: [...layer.transformHistory, { foldId: instruction.id, reflected: moves }],
      depthOrder: moves ? state.layers.length * (state.folds.length + 1) + index : layer.depthOrder,
    };
  }),
});

const samePoint = (a: Vec2, b: Vec2): boolean =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= EPS.point;

export const punchState = (state: FoldState, points: readonly Vec2[]): FoldState => {
  const punches: Punch[] = points.map((point, index) => {
    const layers = state.layers.filter(({ currentCenter }) => samePoint(currentCenter, point));
    if (layers.length === 0) throw new RangeError("Punch does not intersect folded paper");
    return {
      id: `punch-${index}`,
      point,
      sourceLayerIds: layers.map(({ sourceLayerId }) => sourceLayerId).sort(),
    };
  });
  return { ...state, punches };
};

export const unfoldPunches = (state: FoldState): readonly Vec2[] => {
  const sourceIds = new Set(state.punches.flatMap(({ sourceLayerIds }) => sourceLayerIds));
  return state.layers
    .filter(({ sourceLayerId }) => sourceIds.has(sourceLayerId))
    .map(({ sourceCenter }) => sourceCenter)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};

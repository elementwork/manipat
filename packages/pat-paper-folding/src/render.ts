import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const gridLines = () => Array.from({ length: 5 }, (_, index) => [
  svgLine([index, 0], [index, 4], { stroke: "#999", "stroke-width": 0.04 }),
  svgLine([0, index], [4, index], { stroke: "#999", "stroke-width": 0.04 }),
]).flat();

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

export const renderFoldStep = (
  folds: readonly FoldInstruction[],
  punches: readonly Vec2[],
  step: number,
): string => {
  const shownFolds = folds.slice(0, step);
  return svgDocument({
    viewBox: [-0.3, -0.3, 4.6, 4.6],
    title: `Paper folding step ${step}`,
    children: [
      svgPolygon([[0, 0], [4, 0], [4, 4], [0, 4]], { fill: "white", stroke: "black", "stroke-width": 0.08 }),
      ...shownFolds.map(({ line }, index) => {
        const extent = 8;
        const a: Vec2 = [line.point[0] - line.unitDirection[0] * extent, line.point[1] - line.unitDirection[1] * extent];
        const b: Vec2 = [line.point[0] + line.unitDirection[0] * extent, line.point[1] + line.unitDirection[1] * extent];
        return svgLine(a, b, { "data-fold-id": folds[index]?.id, stroke: "black", "stroke-dasharray": "0.18 0.12", "stroke-width": 0.05 });
      }),
      ...(step === folds.length ? punches.map((point) => svgCircle(point, 0.16, { fill: "black" })) : []),
    ],
  });
};

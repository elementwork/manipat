import type { Vec2 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon } from "@manipat/svg";
import type { FoldInstruction } from "./types.js";

const gridLines = () => Array.from({ length: 5 }, (_, index) => [
  svgLine([index, 0], [index, 4], { stroke: "#999", "stroke-width": 0.04 }),
  svgLine([0, index], [4, index], { stroke: "#999", "stroke-width": 0.04 }),
]).flat();

export const renderHolePattern = (holes: readonly Vec2[], title: string): string => svgDocument({
  viewBox: [-0.2, -0.2, 4.4, 4.4],
  title,
  children: [
    svgPolygon([[0, 0], [4, 0], [4, 4], [0, 4]], { fill: "white", stroke: "black", "stroke-width": 0.08 }),
    ...gridLines(),
    ...holes.map((point) => svgCircle(point, 0.16, { fill: "black" })),
  ],
});

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

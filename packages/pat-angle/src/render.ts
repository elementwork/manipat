import type { Vec2 } from "@manipat/core";
import { svgDocument, svgLine, svgText } from "@manipat/svg";
import type { AngleItem } from "./types.js";

export const renderAnglePrompt = (items: readonly AngleItem[]): string => svgDocument({
  viewBox: [0, 0, 240, 200],
  title: "Angle discrimination question",
  description: "Rank the four labeled angles from smallest to largest",
  children: items.flatMap((item) => {
    const labelPosition: Vec2 = [item.vertex[0] - 7, item.vertex[1] + 17];
    return [
      svgLine(item.vertex, item.rayA, { stroke: "black", "stroke-linecap": "round", "stroke-width": 2 }),
      svgLine(item.vertex, item.rayB, { stroke: "black", "stroke-linecap": "round", "stroke-width": 2 }),
      svgText(labelPosition, String(item.id), { "font-family": "sans-serif", "font-size": 12 }),
    ];
  }),
});

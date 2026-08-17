import type { Vec2 } from "@manipat/core";
import { svgDocument, svgPolyline, svgText } from "@manipat/svg";
import type { AngleItem } from "./types.js";

/** Render printable DAT-style angle discrimination line art. */
export const renderAnglePrompt = (items: readonly AngleItem[]): string => {
  const labelY = 174;
  const centers: readonly Vec2[] = [
    [164, 88],
    [328, 89],
    [492, 87],
    [656, 84],
  ];
  const scale = 3.2;

  const rendered = items.map((item, index) => {
    const center = centers[index]!;
    const localA: Vec2 = [
      (item.rayA[0] - item.vertex[0]) * scale,
      (item.rayA[1] - item.vertex[1]) * scale,
    ];
    const localB: Vec2 = [
      (item.rayB[0] - item.vertex[0]) * scale,
      (item.rayB[1] - item.vertex[1]) * scale,
    ];
    const a: Vec2 = [center[0] + localA[0], center[1] + localA[1]];
    const b: Vec2 = [center[0] + localB[0], center[1] + localB[1]];
    return { item, center, a, b };
  });

  const points = rendered.flatMap(({ center, a, b }) => [center, a, b]);
  const minX = Math.min(0, ...points.map(([x]) => x)) - 8;
  const maxX = Math.max(820, ...points.map(([x]) => x)) + 8;
  const minY = Math.min(0, ...points.map(([, y]) => y)) - 8;
  const maxY = Math.max(190, labelY + 10, ...points.map(([, y]) => y)) + 8;

  return svgDocument({
    viewBox: [minX, minY, maxX - minX, maxY - minY],
    title: "Angle discrimination question",
    description: "Rank the four labeled angles from smallest to largest",
    children: rendered.flatMap(({ item, center, a, b }) => [
      svgPolyline([a, center, b], {
        fill: "none",
        stroke: "#231f20",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-width": 2,
      }),
      svgText([center[0] - 7, labelY], String(item.id), {
        "font-family": "ArialMT, Arial, sans-serif",
        "font-size": 17,
      }),
    ]),
  });
};

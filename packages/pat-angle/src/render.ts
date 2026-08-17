import type { Vec2 } from "@manipat/core";
import { svgDocument, svgPolyline, svgText } from "@manipat/svg";
import type { AngleItem } from "./types.js";

/**
 * Render angle prompt SVG matching the golden DAT format.
 * Each angle is a single polyline (endpoint → vertex → endpoint).
 * Labels are placed below each angle.
 *
 * Golden reference: viewBox 0 0 817.2 222.37, 4 polylines + 4 text labels.
 * Vertex positions are roughly at (137,126), (296,127), (523,125), (675,122).
 * Labels at y≈203.
 * Ray lengths in golden are ~80-100px.
 */
export const renderAnglePrompt = (items: readonly AngleItem[]): string => {
  const LABEL_Y = 165;

  // Positions for the 4 angles — larger, labels closer
  const centers: readonly Vec2[] = [
    [164, 88],
    [328, 89],
    [485, 87],
    [646, 84],
  ];

  // Scale factor: large enough for3-degree gaps to be clearly visible
  const SCALE = 3.5;

  return svgDocument({
    viewBox: [0, 0, 820, 185],
    title: "Angle discrimination question",
    description: "Rank the four labeled angles from smallest to largest",
    children: items.flatMap((item, index) => {
      const center = centers[index]!;
      const cx = center[0];
      const cy = center[1];

      // Compute ray endpoints relative to vertex, scaled to golden proportions
      const localA: Vec2 = [
        (item.rayA[0] - item.vertex[0]) * SCALE,
        (item.rayA[1] - item.vertex[1]) * SCALE,
      ];
      const localB: Vec2 = [
        (item.rayB[0] - item.vertex[0]) * SCALE,
        (item.rayB[1] - item.vertex[1]) * SCALE,
      ];

      const goldenA: Vec2 = [cx + localA[0], cy + localA[1]];
      const goldenB: Vec2 = [cx + localB[0], cy + localB[1]];

      return [
        svgPolyline([goldenA, [cx, cy], goldenB], {
          fill: "none",
          stroke: "#231f20",
          "stroke-linejoin": "round",
          "stroke-width": 2,
        }),
        svgText([cx - 7, LABEL_Y], String(item.id), {
          "font-family": "ArialMT, Arial, sans-serif",
          "font-size": 17,
        }),
      ];
    }),
  });
};

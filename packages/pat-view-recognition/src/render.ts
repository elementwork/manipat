import type { OrthographicView } from "@manipat/geometry";
import { svgDocument, svgLine } from "@manipat/svg";

export type TfeViewBox = readonly [number, number, number, number];

export const sharedTfeViewBox = (
  views: readonly OrthographicView[],
  padding = 8,
): TfeViewBox => {
  const extent = views.reduce((maximum, view) => Math.max(
    maximum,
    Math.abs(view.bounds.min[0]),
    Math.abs(view.bounds.min[1]),
    Math.abs(view.bounds.max[0]),
    Math.abs(view.bounds.max[1]),
  ), 0) + padding;
  return [-extent, -extent, extent * 2, extent * 2];
};

export const renderTfeView = (
  view: OrthographicView,
  viewBox: TfeViewBox,
  title: string,
): string => svgDocument({
  viewBox,
  title,
  description: "Orthographic view with solid visible edges and dashed hidden edges",
  children: [
    ...view.hidden.map(({ a, b }, index) => svgLine([a[0], -a[1]], [b[0], -b[1]], {
      class: "hidden-edge",
      "data-edge-id": `hidden-${index}`,
      stroke: "black",
      "stroke-dasharray": "4 3",
      "stroke-linecap": "round",
      "stroke-width": 1.2,
    })),
    ...view.visible.map(({ a, b }, index) => svgLine([a[0], -a[1]], [b[0], -b[1]], {
      class: "visible-edge",
      "data-edge-id": `visible-${index}`,
      stroke: "black",
      "stroke-linecap": "round",
      "stroke-width": 1.5,
    })),
  ],
});

import type { Vec2 } from "@manipat/core";
import type { CanonicalSection2D, OrthographicView } from "@manipat/geometry";
import { svgDocument, svgLine, svgPolygon } from "@manipat/svg";

export type ApertureViewBox = readonly [number, number, number, number];

export const sharedApertureViewBox = (
  sections: readonly CanonicalSection2D[],
  padding = 8,
): ApertureViewBox => {
  const maximum = sections.reduce((extent, section) => Math.max(
    extent,
    Math.abs(section.bounds.min[0]),
    Math.abs(section.bounds.min[1]),
    Math.abs(section.bounds.max[0]),
    Math.abs(section.bounds.max[1]),
  ), 0) + padding;
  return [-maximum, -maximum, maximum * 2, maximum * 2];
};

export const renderApertureChoice = (
  section: CanonicalSection2D,
  viewBox: ApertureViewBox,
  label: string,
): string => {
  const polygon = section.polygons[0] ?? [];
  const displayPolygon = polygon.map(([x, y]): Vec2 => [x, -y]);
  return svgDocument({
    viewBox,
    title: `Aperture choice ${label}`,
    description: "Exact-scale opening silhouette",
    children: [svgPolygon(displayPolygon, {
      class: "aperture-outline",
      fill: "white",
      stroke: "black",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": 1.5,
    })],
  });
};

export const renderAperturePictorial = (view: OrthographicView): string => {
  const extent = Math.max(
    Math.abs(view.bounds.min[0]), Math.abs(view.bounds.min[1]),
    Math.abs(view.bounds.max[0]), Math.abs(view.bounds.max[1]),
  ) + 8;
  return svgDocument({
    viewBox: [-extent, -extent, extent * 2, extent * 2],
    title: "Aperture object",
    description: "Deterministic isometric line drawing of the object to pass through an opening",
    children: [
      // DAT apertures: only visible edges, no hidden lines
      ...view.visible.map(({ a, b }, index) => svgLine([a[0], -a[1]], [b[0], -b[1]], {
        "data-edge-id": `visible-${index}`,
        stroke: "black",
        "stroke-linecap": "round",
        "stroke-width": 1.5,
      })),
    ],
  });
};

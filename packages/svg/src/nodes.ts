import type { Vec2 } from "@manipat/core";

export type SvgAttributeValue = string | number | undefined;
export type SvgAttributes = Readonly<Record<string, SvgAttributeValue>>;

export interface SvgElement {
  readonly tag: string;
  readonly attributes: SvgAttributes;
  readonly children: readonly (SvgElement | string)[];
}

const element = (
  tag: string,
  attributes: SvgAttributes = {},
  children: readonly (SvgElement | string)[] = [],
): SvgElement => ({ tag, attributes, children });

const pointsAttribute = (points: readonly Vec2[]): string =>
  points.map(([x, y]) => `${x},${y}`).join(" ");

export const svgGroup = (
  children: readonly SvgElement[],
  attributes: SvgAttributes = {},
): SvgElement => element("g", attributes, children);

export const svgPath = (d: string, attributes: SvgAttributes = {}): SvgElement =>
  element("path", { ...attributes, d });

export const svgPolygon = (
  points: readonly Vec2[],
  attributes: SvgAttributes = {},
): SvgElement => element("polygon", { ...attributes, points: pointsAttribute(points) });

export const svgPolyline = (
  points: readonly Vec2[],
  attributes: SvgAttributes = {},
): SvgElement => element("polyline", { ...attributes, points: pointsAttribute(points) });

export const svgLine = (
  from: Vec2,
  to: Vec2,
  attributes: SvgAttributes = {},
): SvgElement => element("line", {
  ...attributes,
  x1: from[0],
  y1: from[1],
  x2: to[0],
  y2: to[1],
});

export const svgCircle = (
  center: Vec2,
  radius: number,
  attributes: SvgAttributes = {},
): SvgElement => element("circle", {
  ...attributes,
  cx: center[0],
  cy: center[1],
  r: radius,
});

export const svgText = (
  position: Vec2,
  content: string,
  attributes: SvgAttributes = {},
): SvgElement => element("text", {
  ...attributes,
  x: position[0],
  y: position[1],
}, [content]);

export const createSvgElement = element;

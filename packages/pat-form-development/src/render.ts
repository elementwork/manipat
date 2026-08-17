import type { Vec2, Vec3 } from "@manipat/core";
import { svgCircle, svgDocument, svgLine, svgPolygon, type SvgElement } from "@manipat/svg";
import type {
  FacePattern,
  FormDevelopmentChoice,
  LogicalPolyhedron,
  PolyhedronNet,
} from "./types.js";

const centerOf = (polygon: readonly Vec2[]): Vec2 => [
  polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
  polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
];

const extentOf = (polygon: readonly Vec2[]): number => {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  return Math.max(0.12, Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.22);
};

const patternElements = (polygon: readonly Vec2[], pattern: FacePattern | undefined): readonly SvgElement[] => {
  if (pattern === undefined) return [];
  const center = centerOf(polygon);
  const extent = extentOf(polygon);
  if (pattern.kind === "dot") {
    return [svgCircle(center, extent * 0.32, { fill: "black", stroke: "black", "stroke-width": 0.025 })];
  }
  if (pattern.kind === "triangle") {
    const angle = pattern.rotationQuarterTurns * Math.PI / 2 - Math.PI / 2;
    const points = Array.from({ length: 3 }, (_, index): Vec2 => {
      const theta = angle + index * (Math.PI * 2 / 3);
      return [center[0] + Math.cos(theta) * extent, center[1] + Math.sin(theta) * extent];
    });
    return [svgPolygon(points, { fill: "black", stroke: "black", "stroke-width": 0.025, "stroke-linejoin": "round" })];
  }
  const theta = pattern.rotationQuarterTurns * Math.PI / 2;
  const dx = Math.cos(theta) * extent;
  const dy = Math.sin(theta) * extent;
  return [svgLine([center[0] - dx, center[1] - dy], [center[0] + dx, center[1] + dy], {
    stroke: "black",
    "stroke-linecap": "round",
    "stroke-width": 0.09,
  })];
};

export const renderNet = (net: PolyhedronNet, patterns: Readonly<Record<string, FacePattern>>): string => {
  const points = net.faces.flatMap(({ polygon }) => polygon);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  return svgDocument({
    viewBox: [minX - 0.2, minY - 0.2, maxX - minX + 0.4, maxY - minY + 0.4],
    title: "Polyhedron net",
    description: "Flat pattern to fold into a three-dimensional form",
    children: net.faces.flatMap(({ faceId, polygon }) => [
      svgPolygon(polygon, {
        fill: "white",
        stroke: "black",
        "stroke-linejoin": "round",
        "stroke-width": 0.045,
        "data-face-id": faceId,
      }),
      ...patternElements(polygon, patterns[faceId]),
    ]),
  });
};

const transformPoint = ([x, y, z]: Vec3, chirality: FormDevelopmentChoice["chirality"]): Vec3 =>
  chirality === "mirrored" ? [-x, y, z] : [x, y, z];

const project = ([x, y, z]: Vec3): Vec2 => [(x - y) * Math.sqrt(3) / 2, (x + y) * 0.5 - z];

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const CAMERA: Vec3 = [1, -1, 1];

export const renderFoldedChoice = (
  polyhedron: LogicalPolyhedron,
  choice: Omit<FormDevelopmentChoice, "svg">,
  title: string,
): string => {
  const transformed = polyhedron.vertices.map((vertex) => transformPoint(vertex, choice.chirality));
  const faces = polyhedron.faces.flatMap((face) => {
    const vertices = face.vertexIds.map((id) => transformed[id] ?? [0, 0, 0] as Vec3);
    if (vertices.length < 3) return [];
    const normal = cross3(subtract(vertices[1]!, vertices[0]!), subtract(vertices[2]!, vertices[0]!));
    if (dot3(normal, CAMERA) <= 1e-9) return [];
    const polygon = vertices.map(project);
    const depth = vertices.reduce((sum, [x, y, z]) => sum + x - y + z, 0) / vertices.length;
    return [{ face, polygon, depth }];
  }).sort((a, b) => a.depth - b.depth);

  const points = faces.flatMap(({ polygon }) => polygon);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const pad = 0.35;

  return svgDocument({
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    title,
    children: faces.flatMap(({ face, polygon }) => [
      svgPolygon(polygon, {
        fill: "white",
        stroke: "black",
        "stroke-linejoin": "round",
        "stroke-width": 0.05,
        "data-face-id": face.id,
      }),
      ...patternElements(polygon, choice.patterns[face.id]),
    ]),
  });
};

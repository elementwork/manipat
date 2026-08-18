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

const rotateForView = ([x, y, z]: Vec3, quarterTurns: 0 | 1 | 2 | 3): Vec3 => {
  switch (quarterTurns) {
    case 0: return [x, y, z];
    case 1: return [-y, x, z];
    case 2: return [-x, -y, z];
    case 3: return [y, -x, z];
    default: return quarterTurns satisfies never;
  }
};

/**
 * Orthographic isometric projection. Its null/view axis is [1,1,1], so camera
 * depth must be measured with x+y+z. The previous x+y-z sort was inconsistent
 * with this projection and could paint rear faces over front faces.
 */
const project = ([x, y, z]: Vec3): Vec2 => [
  (x - y) * Math.sqrt(3) / 2,
  (x + y) * 0.5 - z,
];

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const faceNormal = (vertices: readonly Vec3[]): Vec3 | undefined => {
  const a = vertices[0];
  const b = vertices[1];
  const c = vertices[2];
  if (a === undefined || b === undefined || c === undefined) return undefined;
  return cross(subtract(b, a), subtract(c, a));
};

// Camera sits in the +X,+Y,+Z octant looking toward the origin.
const CAMERA_VECTOR: Vec3 = [1, 1, 1];

/**
 * Render only camera-facing closed faces, then paint them from far to near.
 * Rear faces are intentionally omitted; drawing their stroked polygons was the
 * reason some candidates looked like open wireframes instead of opaque solids.
 */
export const renderFoldedChoice = (
  polyhedron: LogicalPolyhedron,
  choice: Omit<FormDevelopmentChoice, "svg">,
  title: string,
): string => {
  const sourceVertices = choice.vertices !== undefined && choice.vertices.length === polyhedron.vertices.length
    ? choice.vertices
    : polyhedron.vertices;
  const quarterTurns = choice.viewQuarterTurns ?? 0;
  const transformed = sourceVertices.map((vertex) =>
    rotateForView(transformPoint(vertex, choice.chirality), quarterTurns));
  const windingSign = choice.chirality === "mirrored" ? -1 : 1;

  const visibleFaces = polyhedron.faces.flatMap((face) => {
    const vertices = face.vertexIds.map((id): Vec3 => transformed[id] ?? [0, 0, 0]);
    if (vertices.length < 3) return [];
    const normal = faceNormal(vertices);
    if (normal === undefined || dot(normal, CAMERA_VECTOR) * windingSign <= 1e-9) return [];
    const polygon = vertices.map(project);
    const depth = vertices.reduce((sum, [x, y, z]) => sum + x + y + z, 0) / vertices.length;
    return [{ face, polygon, depth }];
  }).sort((a, b) => a.depth - b.depth);

  if (visibleFaces.length === 0) throw new Error("Form-development choice has no visible faces");
  const points = visibleFaces.flatMap(({ polygon }) => polygon);
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const pad = 0.35;

  return svgDocument({
    viewBox: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2],
    title,
    description: "Closed folded solid rendered from camera-facing opaque faces",
    children: visibleFaces.flatMap(({ face, polygon }) => [
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

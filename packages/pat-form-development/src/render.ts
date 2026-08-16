import type { Vec2, Vec3 } from "@manipat/core";
import { svgDocument, svgPolygon, svgText } from "@manipat/svg";
import type {
  FacePattern,
  FormDevelopmentChoice,
  LogicalPolyhedron,
  PolyhedronNet,
} from "./types.js";

const patternLabel = (pattern: FacePattern | undefined): string => pattern === undefined
  ? ""
  : `${pattern.kind[0]?.toUpperCase() ?? ""}${pattern.rotationQuarterTurns}`;

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
    children: net.faces.flatMap(({ faceId, polygon }) => {
      const center: Vec2 = [
        polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
        polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
      ];
      return [
        svgPolygon(polygon, { fill: "white", stroke: "black", "stroke-linejoin": "round", "stroke-width": 0.045, "data-face-id": faceId }),
        svgText(center, patternLabel(patterns[faceId]), { "font-family": "sans-serif", "font-size": 0.22, "text-anchor": "middle" }),
      ];
    }),
  });
};

const project = ([x, y, z]: Vec3): Vec2 => [(x - y) * Math.sqrt(3) / 2, (x + y) * 0.5 - z];

export const renderFoldedChoice = (
  polyhedron: LogicalPolyhedron,
  choice: Omit<FormDevelopmentChoice, "svg">,
  title: string,
): string => {
  const faces = polyhedron.faces.map((face) => ({
    face,
    polygon: face.vertexIds.map((id) => project(polyhedron.vertices[id] ?? [0, 0, 0])),
    depth: face.vertexIds.reduce((sum, id) => {
      const [x, y, z] = polyhedron.vertices[id] ?? [0, 0, 0];
      return sum + x - y + z;
    }, 0) / face.vertexIds.length,
  })).sort((a, b) => a.depth - b.depth);
  return svgDocument({
    viewBox: [-3, -3, 6, 6],
    title,
    children: faces.flatMap(({ face, polygon }) => {
      const center: Vec2 = [
        polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length,
        polygon.reduce((sum, [, y]) => sum + y, 0) / polygon.length,
      ];
      return [
        svgPolygon(polygon, { fill: "white", stroke: "black", "stroke-width": 0.04, "data-face-id": face.id }),
        svgText(center, patternLabel(choice.patterns[face.id]), { "font-family": "sans-serif", "font-size": 0.22, "text-anchor": "middle" }),
      ];
    }),
  });
};

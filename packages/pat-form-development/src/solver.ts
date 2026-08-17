import type { Vec2, Vec3 } from "@manipat/core";
import type { FormDevelopmentQuestion, NetFace, PolyFace } from "./types.js";

const length2 = (a: Vec2, b: Vec2): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const length3 = (a: Vec3, b: Vec3): number => Math.hypot(
  b[0] - a[0],
  b[1] - a[1],
  b[2] - a[2],
);

const sorted2dDistances = ({ polygon }: NetFace): readonly number[] => {
  const distances: number[] = [];
  for (let first = 0; first < polygon.length; first += 1) {
    for (let second = first + 1; second < polygon.length; second += 1) {
      distances.push(length2(polygon[first]!, polygon[second]!));
    }
  }
  return distances.sort((a, b) => a - b);
};

const sorted3dDistances = (
  face: PolyFace,
  vertices: readonly Vec3[],
): readonly number[] => {
  const distances: number[] = [];
  for (let first = 0; first < face.vertexIds.length; first += 1) {
    for (let second = first + 1; second < face.vertexIds.length; second += 1) {
      const firstVertex = vertices[face.vertexIds[first]!];
      const secondVertex = vertices[face.vertexIds[second]!];
      distances.push(
        firstVertex === undefined || secondVertex === undefined
          ? Number.NaN
          : length3(firstVertex, secondVertex),
      );
    }
  }
  return distances.sort((a, b) => a - b);
};

const sameLength = (first: number, second: number): boolean => {
  const scale = Math.max(1, Math.abs(first), Math.abs(second));
  return Number.isFinite(first) && Number.isFinite(second) && Math.abs(first - second) <= scale * 1e-6;
};

const faceMatches = (
  netFace: NetFace,
  face: PolyFace,
  vertices: readonly Vec3[],
): boolean => {
  const expected = sorted2dDistances(netFace);
  const actual = sorted3dDistances(face, vertices);
  return expected.length === actual.length
    && expected.every((value, index) => sameLength(value, actual[index] ?? Number.NaN));
};

const geometryMatchesNet = (
  question: FormDevelopmentQuestion,
  vertices: readonly Vec3[],
): boolean => question.prompt.net.faces.every((netFace) => {
  const face = question.prompt.polyhedron.faces.find(({ id }) => id === netFace.faceId);
  return face !== undefined && faceMatches(netFace, face, vertices);
});

export const solveFormDevelopmentQuestion = (
  question: FormDevelopmentQuestion,
): readonly number[] => {
  if (question.metadata.choiceModel === "dimensional-geometry-v2") {
    return question.choices.flatMap((choice, index) =>
      choice.vertices !== undefined && geometryMatchesNet(question, choice.vertices) ? [index] : []);
  }
  return question.choices.flatMap((choice, index) =>
    choice.fingerprint === question.prompt.targetFingerprint ? [index] : []);
};

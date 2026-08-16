import type { FaceAdjacency, LogicalPolyhedron } from "./types.js";

const faceEdges = (vertexIds: readonly number[]): readonly (readonly [number, number])[] =>
  vertexIds.map((vertex, index) => [vertex, vertexIds[(index + 1) % vertexIds.length] ?? vertex] as const);

const edgeKey = ([a, b]: readonly [number, number]): string => a < b ? `${a}:${b}` : `${b}:${a}`;

export const buildFaceAdjacency = (
  polyhedron: LogicalPolyhedron,
): readonly FaceAdjacency[] => {
  const owners = new Map<string, Array<{ faceId: string; edge: readonly [number, number] }>>();
  for (const face of polyhedron.faces) {
    for (const edge of faceEdges(face.vertexIds)) {
      const key = edgeKey(edge);
      const entries = owners.get(key) ?? [];
      entries.push({ faceId: face.id, edge });
      owners.set(key, entries);
    }
  }
  return [...owners.entries()].flatMap(([key, entries]) => {
    if (entries.length !== 2) return [];
    const [first, second] = entries;
    if (first === undefined || second === undefined) return [];
    const [a = 0, b = 0] = key.split(":").map(Number);
    return [{
      faceA: first.faceId,
      faceB: second.faceId,
      sharedVertexIds: [a, b] as const,
    }];
  }).sort((a, b) => `${a.faceA}:${a.faceB}`.localeCompare(`${b.faceA}:${b.faceB}`));
};

export const areFacesAdjacent = (
  adjacency: readonly FaceAdjacency[],
  faceA: string,
  faceB: string,
): boolean => adjacency.some((entry) =>
  (entry.faceA === faceA && entry.faceB === faceB)
  || (entry.faceA === faceB && entry.faceB === faceA));

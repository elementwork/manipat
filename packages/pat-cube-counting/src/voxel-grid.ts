import type { Vec3 } from "@manipat/core";

export type CubeKey = `${number},${number},${number}`;

export interface CubeCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
] as const;

export const cubeKey = (x: number, y: number, z: number): CubeKey => `${x},${y},${z}`;

export class VoxelStructure {
  readonly #cubes = new Set<CubeKey>();

  public constructor(cubes: readonly CubeCoordinate[] = []) {
    cubes.forEach(({ x, y, z }) => this.add(x, y, z));
  }

  public get size(): number {
    return this.#cubes.size;
  }

  public has(x: number, y: number, z: number): boolean {
    return this.#cubes.has(cubeKey(x, y, z));
  }

  public add(x: number, y: number, z: number): void {
    if (![x, y, z].every(Number.isInteger) || z < 0) {
      throw new RangeError("Voxel coordinates must be integers with z >= 0");
    }
    this.#cubes.add(cubeKey(x, y, z));
  }

  public remove(x: number, y: number, z: number): void {
    this.#cubes.delete(cubeKey(x, y, z));
  }

  public coordinates(): readonly CubeCoordinate[] {
    return [...this.#cubes]
      .map((key) => {
        const [x = 0, y = 0, z = 0] = key.split(",").map(Number);
        return { x, y, z };
      })
      .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }

  public neighbors(x: number, y: number, z: number): readonly CubeCoordinate[] {
    return DIRECTIONS.flatMap(([dx, dy, dz]) => this.has(x + dx, y + dy, z + dz)
      ? [{ x: x + dx, y: y + dy, z: z + dz }]
      : []);
  }

  /** Counts painted exposed faces; the face resting on z=0 is not painted. */
  public exposedFaceCount(x: number, y: number, z: number): number {
    if (!this.has(x, y, z)) throw new RangeError("Cannot inspect a missing cube");
    let exposed = 0;
    for (const [dx, dy, dz] of DIRECTIONS) {
      if (!this.has(x + dx, y + dy, z + dz)) {
        if (dz === -1 && z === 0) continue;
        exposed += 1;
      }
    }
    return exposed;
  }

  public isConnected(): boolean {
    const first = this.coordinates()[0];
    if (first === undefined) return false;
    const visited = new Set<CubeKey>([cubeKey(first.x, first.y, first.z)]);
    const queue = [first];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) continue;
      for (const neighbor of this.neighbors(current.x, current.y, current.z)) {
        const key = cubeKey(neighbor.x, neighbor.y, neighbor.z);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }
    return visited.size === this.size;
  }

  public isSupported(): boolean {
    return this.coordinates().every(({ x, y, z }) => z === 0 || this.has(x, y, z - 1));
  }

  public centers(): readonly Vec3[] {
    return this.coordinates().map(({ x, y, z }): Vec3 => [x + 0.5, y + 0.5, z + 0.5]);
  }
}

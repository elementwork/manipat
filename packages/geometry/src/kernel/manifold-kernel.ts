import type { Vec2, Vec3 } from "@manipat/core";
import loadManifold, {
  type CrossSection,
  type Manifold,
  type ManifoldToplevel,
} from "manifold-3d";
import type {
  CanonicalMesh,
  CanonicalSection2D,
  ExtrudeOptions,
  GeometryKernel,
  GeometryValidationResult,
  RevolveOptions,
  SectionHandle,
  SolidHandle,
} from "./types.js";

let manifoldModulePromise: Promise<ManifoldToplevel> | undefined;

const getManifoldModule = async (): Promise<ManifoldToplevel> => {
  manifoldModulePromise ??= loadManifold().then((module) => {
    module.setup();
    return module;
  });
  return manifoldModulePromise;
};

class OwnedSolid implements SolidHandle {
  #value: Manifold | undefined;
  readonly #owner: symbol;

  public constructor(owner: symbol, value: Manifold) {
    this.#owner = owner;
    this.#value = value;
  }

  public get disposed(): boolean {
    return this.#value === undefined;
  }

  public valueFor(owner: symbol): Manifold {
    if (owner !== this.#owner) {
      throw new TypeError("Solid handle belongs to a different geometry kernel");
    }
    if (this.#value === undefined) {
      throw new ReferenceError("Solid handle has been disposed");
    }
    return this.#value;
  }

  public dispose(): void {
    this.#value?.delete();
    this.#value = undefined;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

class OwnedSection implements SectionHandle {
  #value: CrossSection | undefined;
  readonly #owner: symbol;

  public constructor(owner: symbol, value: CrossSection) {
    this.#owner = owner;
    this.#value = value;
  }

  public get disposed(): boolean {
    return this.#value === undefined;
  }

  public valueFor(owner: symbol): CrossSection {
    if (owner !== this.#owner) {
      throw new TypeError("Section handle belongs to a different geometry kernel");
    }
    if (this.#value === undefined) {
      throw new ReferenceError("Section handle has been disposed");
    }
    return this.#value;
  }

  public dispose(): void {
    this.#value?.delete();
    this.#value = undefined;
  }

  public [Symbol.dispose](): void {
    this.dispose();
  }
}

const finiteVec3 = (value: Vec3): boolean => value.every(Number.isFinite);

export class ManifoldKernel implements GeometryKernel {
  readonly #module: ManifoldToplevel;
  readonly #owner = Symbol("ManifoldKernel");

  public constructor(module: ManifoldToplevel) {
    this.#module = module;
  }

  #solid(value: Manifold): SolidHandle {
    return new OwnedSolid(this.#owner, value);
  }

  #section(value: CrossSection): SectionHandle {
    return new OwnedSection(this.#owner, value);
  }

  #unwrapSolid(handle: SolidHandle): Manifold {
    if (!(handle instanceof OwnedSolid)) {
      throw new TypeError("Unsupported solid handle implementation");
    }
    return handle.valueFor(this.#owner);
  }

  #unwrapSection(handle: SectionHandle): CrossSection {
    if (!(handle instanceof OwnedSection)) {
      throw new TypeError("Unsupported section handle implementation");
    }
    return handle.valueFor(this.#owner);
  }

  public cube(size: Vec3, center = false): SolidHandle {
    return this.#solid(this.#module.Manifold.cube(size, center));
  }

  public cylinder(
    height: number,
    radiusLow: number,
    radiusHigh = radiusLow,
    circularSegments = 0,
    center = false,
  ): SolidHandle {
    return this.#solid(
      this.#module.Manifold.cylinder(
        height,
        radiusLow,
        radiusHigh,
        circularSegments,
        center,
      ),
    );
  }

  public sphere(radius: number, circularSegments = 0): SolidHandle {
    return this.#solid(this.#module.Manifold.sphere(radius, circularSegments));
  }

  public section(polygons: readonly (readonly Vec2[])[]): SectionHandle {
    const mutablePolygons = polygons.map((polygon) =>
      polygon.map(([x, y]): [number, number] => [x, y]),
    );
    return this.#section(new this.#module.CrossSection(mutablePolygons));
  }

  public extrude(
    section: SectionHandle,
    height: number,
    options: ExtrudeOptions = {},
  ): SolidHandle {
    const {
      divisions = 0,
      twistDegrees = 0,
      scaleTop = [1, 1],
      center = false,
    } = options;
    return this.#solid(
      this.#unwrapSection(section).extrude(
        height,
        divisions,
        twistDegrees,
        scaleTop,
        center,
      ),
    );
  }

  public revolve(section: SectionHandle, options: RevolveOptions = {}): SolidHandle {
    return this.#solid(
      this.#unwrapSection(section).revolve(
        options.circularSegments,
        options.degrees,
      ),
    );
  }

  public union(solids: readonly SolidHandle[]): SolidHandle {
    if (solids.length === 0) {
      throw new RangeError("Union requires at least one solid");
    }
    return this.#solid(
      this.#module.Manifold.union(solids.map((solid) => this.#unwrapSolid(solid))),
    );
  }

  public difference(a: SolidHandle, b: SolidHandle): SolidHandle {
    return this.#solid(
      this.#module.Manifold.difference(this.#unwrapSolid(a), this.#unwrapSolid(b)),
    );
  }

  public intersection(a: SolidHandle, b: SolidHandle): SolidHandle {
    return this.#solid(
      this.#module.Manifold.intersection(this.#unwrapSolid(a), this.#unwrapSolid(b)),
    );
  }

  public translate(solid: SolidHandle, vector: Vec3): SolidHandle {
    return this.#solid(this.#unwrapSolid(solid).translate(vector));
  }

  public rotate(solid: SolidHandle, degreesXYZ: Vec3): SolidHandle {
    return this.#solid(this.#unwrapSolid(solid).rotate(degreesXYZ));
  }

  public scale(solid: SolidHandle, scaleXYZ: Vec3): SolidHandle {
    return this.#solid(this.#unwrapSolid(solid).scale(scaleXYZ));
  }

  public projectXY(solid: SolidHandle): SectionHandle {
    return this.#section(this.#unwrapSolid(solid).project());
  }

  public sliceXY(solid: SolidHandle, z: number): SectionHandle {
    return this.#section(this.#unwrapSolid(solid).slice(z));
  }

  public getMesh(solid: SolidHandle): CanonicalMesh {
    const manifold = this.#unwrapSolid(solid);
    const mesh = manifold.getMesh();
    const positions = new Float32Array(mesh.numVert * 3);
    for (let vertex = 0; vertex < mesh.numVert; vertex += 1) {
      const sourceOffset = vertex * mesh.numProp;
      const targetOffset = vertex * 3;
      positions[targetOffset] = mesh.vertProperties[sourceOffset] ?? 0;
      positions[targetOffset + 1] = mesh.vertProperties[sourceOffset + 1] ?? 0;
      positions[targetOffset + 2] = mesh.vertProperties[sourceOffset + 2] ?? 0;
    }
    const bounds = manifold.boundingBox();
    return {
      positions,
      indices: new Uint32Array(mesh.triVerts),
      vertexCount: mesh.numVert,
      triangleCount: mesh.numTri,
      bounds: {
        min: [...bounds.min],
        max: [...bounds.max],
      },
    };
  }

  public getSection(section: SectionHandle): CanonicalSection2D {
    const crossSection = this.#unwrapSection(section);
    const bounds = crossSection.bounds();
    return {
      polygons: crossSection
        .toPolygons()
        .map((polygon) => polygon.map(([x, y]): Vec2 => [x, y])),
      bounds: {
        min: [...bounds.min],
        max: [...bounds.max],
      },
    };
  }

  public validate(solid: SolidHandle): GeometryValidationResult {
    const manifold = this.#unwrapSolid(solid);
    const status = manifold.status();
    const empty = manifold.isEmpty();
    const vertexCount = manifold.numVert();
    const triangleCount = manifold.numTri();
    const volume = manifold.volume();
    const surfaceArea = manifold.surfaceArea();
    const box = empty ? null : manifold.boundingBox();
    const bounds = box === null ? null : {
      min: [...box.min] as Vec3,
      max: [...box.max] as Vec3,
    };
    const errors: string[] = [];

    if (status !== "NoError") errors.push(`Manifold status: ${status}`);
    if (empty) errors.push("Solid is empty");
    if (vertexCount <= 0) errors.push("Solid has no vertices");
    if (triangleCount <= 0) errors.push("Solid has no triangles");
    if (!Number.isFinite(volume) || volume <= 0) errors.push("Solid volume is invalid");
    if (!Number.isFinite(surfaceArea) || surfaceArea <= 0) {
      errors.push("Solid surface area is invalid");
    }
    if (bounds !== null && (!finiteVec3(bounds.min) || !finiteVec3(bounds.max))) {
      errors.push("Solid bounds are non-finite");
    }

    return {
      valid: errors.length === 0,
      status,
      empty,
      vertexCount,
      triangleCount,
      volume,
      surfaceArea,
      bounds,
      errors,
    };
  }
}

/** Initializes the shared WASM module and returns an isolated handle owner. */
export const createManifoldKernel = async (): Promise<GeometryKernel> =>
  new ManifoldKernel(await getManifoldModule());

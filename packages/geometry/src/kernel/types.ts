import type { Vec2, Vec3 } from "@manipat/core";

export interface CanonicalMesh {
  /** Tightly packed XYZ positions in dimensionless model units. */
  readonly positions: Float32Array;
  /** Counter-clockwise triangle indices as viewed from outside the solid. */
  readonly indices: Uint32Array;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly groups?: readonly {
    readonly featureId: string;
    readonly start: number;
    readonly count: number;
  }[];
  readonly bounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  };
}

export interface CanonicalSection2D {
  readonly polygons: readonly (readonly Vec2[])[];
  readonly bounds: {
    readonly min: Vec2;
    readonly max: Vec2;
  };
}

export interface GeometryValidationResult {
  readonly valid: boolean;
  readonly status: string;
  readonly empty: boolean;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly volume: number;
  readonly surfaceArea: number;
  readonly bounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  } | null;
  readonly errors: readonly string[];
}

export interface SolidHandle extends Disposable {
  readonly disposed: boolean;
}

export interface SectionHandle extends Disposable {
  readonly disposed: boolean;
}

export interface ExtrudeOptions {
  readonly divisions?: number;
  readonly twistDegrees?: number;
  readonly scaleTop?: Vec2 | number;
  readonly center?: boolean;
}

export interface RevolveOptions {
  readonly circularSegments?: number;
  readonly degrees?: number;
}

export interface GeometryKernel {
  cube(size: Vec3, center?: boolean): SolidHandle;
  cylinder(
    height: number,
    radiusLow: number,
    radiusHigh?: number,
    circularSegments?: number,
    center?: boolean,
  ): SolidHandle;
  sphere(radius: number, circularSegments?: number): SolidHandle;
  section(polygons: readonly (readonly Vec2[])[]): SectionHandle;
  extrude(section: SectionHandle, height: number, options?: ExtrudeOptions): SolidHandle;
  revolve(section: SectionHandle, options?: RevolveOptions): SolidHandle;
  union(solids: readonly SolidHandle[]): SolidHandle;
  difference(a: SolidHandle, b: SolidHandle): SolidHandle;
  intersection(a: SolidHandle, b: SolidHandle): SolidHandle;
  translate(solid: SolidHandle, vector: Vec3): SolidHandle;
  rotate(solid: SolidHandle, degreesXYZ: Vec3): SolidHandle;
  scale(solid: SolidHandle, scaleXYZ: Vec3): SolidHandle;
  projectXY(solid: SolidHandle): SectionHandle;
  sliceXY(solid: SolidHandle, z: number): SectionHandle;
  getMesh(solid: SolidHandle): CanonicalMesh;
  getSection(section: SectionHandle): CanonicalSection2D;
  validate(solid: SolidHandle): GeometryValidationResult;
}

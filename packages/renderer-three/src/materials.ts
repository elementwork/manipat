import {
  Color,
  DoubleSide,
  GreaterDepth,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type ColorRepresentation,
} from "three";

export interface ExamMaterialOptions {
  readonly color?: ColorRepresentation;
  readonly ghosted?: boolean;
}

export const createExamSurfaceMaterial = (
  options: ExamMaterialOptions = {},
): MeshStandardMaterial => new MeshStandardMaterial({
  color: new Color(options.color ?? 0xd9dde3),
  metalness: 0,
  roughness: 0.72,
  transparent: options.ghosted ?? false,
  opacity: options.ghosted === true ? 0.18 : 1,
  depthWrite: options.ghosted !== true,
});

export const createExamEdgeMaterial = (): LineBasicMaterial =>
  new LineBasicMaterial({ color: 0x20242a, depthWrite: false });

/**
 * Hidden-line pass used in Ghost/X-ray mode. GreaterDepth means fragments are
 * drawn only when they lie behind the nearest solid surface written by the
 * depth-only pre-pass.
 */
export const createHiddenEdgeMaterial = (): LineDashedMaterial =>
  new LineDashedMaterial({
    color: 0x59616a,
    dashSize: 3,
    gapSize: 2,
    transparent: true,
    opacity: 0.82,
    depthTest: true,
    depthWrite: false,
    depthFunc: GreaterDepth,
  });

/** Writes nearest solid depth without adding any visible color. */
export const createDepthOccluderMaterial = (): MeshBasicMaterial =>
  new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
    side: DoubleSide,
  });

export const createHighlightMaterial = (
  color: ColorRepresentation = 0xffb000,
): MeshBasicMaterial => new MeshBasicMaterial({
  color,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

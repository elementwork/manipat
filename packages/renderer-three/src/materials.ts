import {
  Color,
  LineBasicMaterial,
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
  roughness: 0.82,
  transparent: options.ghosted ?? false,
  opacity: options.ghosted === true ? 0.28 : 1,
  depthWrite: options.ghosted !== true,
});

export const createExamEdgeMaterial = (): LineBasicMaterial =>
  new LineBasicMaterial({ color: 0x20242a });

export const createHighlightMaterial = (
  color: ColorRepresentation = 0xffb000,
): MeshBasicMaterial => new MeshBasicMaterial({
  color,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

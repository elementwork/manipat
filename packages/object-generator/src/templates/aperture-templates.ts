import type {
  FeatureProvenance,
  GeometryOperation,
  RandomSource,
  SolidRecipe,
  Vec2,
  Vec3,
} from "@manipat/core";
import type { GeometryKernel, SolidHandle } from "@manipat/geometry";
import type { GeneratedSolid, ObjectTemplate, TemplateContext } from "../types.js";

const dimension = (random: RandomSource, min: number, max: number): number =>
  Math.round(random.float(min, max) * 1000) / 1000;

const operation = (
  id: string,
  kind: GeometryOperation["kind"],
  semanticType: string,
  parentIds: readonly string[],
  params: Readonly<Record<string, unknown>>,
): GeometryOperation => ({ id, kind, semanticType, parentIds, params });

const result = (
  context: TemplateContext,
  templateId: string,
  operations: readonly GeometryOperation[],
  solid: SolidHandle,
): GeneratedSolid => {
  const recipe: SolidRecipe = {
    id: `${templateId}:${context.seed}`,
    version: 1,
    seed: context.seed,
    templateId,
    operations,
  };
  return {
    solid,
    recipe,
    provenance: operations as readonly FeatureProvenance[],
  };
};

const translatedCube = (
  kernel: GeometryKernel,
  size: Vec3,
  translation: Vec3,
): SolidHandle => {
  using cube = kernel.cube(size, true);
  return kernel.translate(cube, translation);
};

const extrudedPolygon = (
  kernel: GeometryKernel,
  polygon: readonly Vec2[],
  height: number,
): SolidHandle => {
  using section = kernel.section([polygon]);
  return kernel.extrude(section, height, { center: true });
};

const cuboidNotch = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 58, 74), dimension(random, 42, 58), dimension(random, 42, 56)];
  const notch: Vec3 = [dimension(random, 14, 22), size[1] + 8, dimension(random, 12, 20)];
  const offset: Vec3 = [size[0] / 2 - notch[0] / 2 + 1, 0, size[2] / 2 - notch[2] / 2 + 1];
  using base = kernel.cube(size, true);
  using cut = translatedCube(kernel, notch, offset);
  return result(context, "T01-cuboid-notch", [
    operation("body", "base", "body", [], { size }),
    operation("notch-1", "subtract", "notch", ["body"], { size: notch, offset }),
  ], kernel.difference(base, cut));
};

const cuboidWedge = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 56, 70), dimension(random, 44, 56), dimension(random, 36, 48)];
  const extension = dimension(random, 16, 24);
  const halfWidth = dimension(random, 12, 18);
  const polygon: readonly Vec2[] = [
    [size[0] / 2 - 2, -halfWidth],
    [size[0] / 2 + extension, -halfWidth],
    [size[0] / 2 - 2, halfWidth],
  ];
  using base = kernel.cube(size, true);
  using wedge = extrudedPolygon(kernel, polygon, size[2] * 0.55);
  return result(context, "T02-cuboid-wedge", [
    operation("body", "base", "body", [], { size }),
    operation("wedge-1", "union", "wedge", ["body"], { polygon, height: size[2] * 0.55 }),
  ], kernel.union([base, wedge]));
};

const cuboidCylinderBoss = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 54, 68), dimension(random, 44, 56), dimension(random, 36, 48)];
  const radius = dimension(random, 8, 12);
  const height = dimension(random, 14, 22);
  const offset: Vec3 = [dimension(random, -12, 12), dimension(random, -9, 9), size[2] / 2 + height / 2 - 2];
  using base = kernel.cube(size, true);
  using bossBase = kernel.cylinder(height, radius, radius, 32, true);
  using boss = kernel.translate(bossBase, offset);
  return result(context, "T03-cuboid-cylinder-boss", [
    operation("body", "base", "body", [], { size }),
    operation("boss-1", "union", "boss", ["body"], { radius, height, offset }),
  ], kernel.union([base, boss]));
};

const cuboidThroughHole = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 55, 72), dimension(random, 44, 58), dimension(random, 38, 52)];
  const radius = dimension(random, 7, 11);
  const offset: Vec3 = [dimension(random, -10, 10), dimension(random, -8, 8), 0];
  using base = kernel.cube(size, true);
  using holeBase = kernel.cylinder(size[2] + 10, radius, radius, 32, true);
  using hole = kernel.translate(holeBase, offset);
  return result(context, "T04-cuboid-through-hole", [
    operation("body", "base", "body", [], { size }),
    operation("hole-1", "subtract", "hole", ["body"], { radius, offset, axis: "z" }),
  ], kernel.difference(base, hole));
};

const cuboidSlot = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 58, 74), dimension(random, 44, 58), dimension(random, 40, 54)];
  const slot: Vec3 = [dimension(random, 12, 18), size[1] + 8, dimension(random, 16, 23)];
  const offset: Vec3 = [dimension(random, 5, 15), 0, size[2] / 2 - slot[2] / 2 + 1];
  using base = kernel.cube(size, true);
  using cut = translatedCube(kernel, slot, offset);
  return result(context, "T05-cuboid-slot", [
    operation("body", "base", "body", [], { size }),
    operation("slot-1", "subtract", "slot", ["body"], { size: slot, offset }),
  ], kernel.difference(base, cut));
};

const steppedBlock = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const lower: Vec3 = [dimension(random, 60, 74), dimension(random, 46, 58), dimension(random, 24, 32)];
  const upper: Vec3 = [dimension(random, 34, 46), dimension(random, 32, 44), dimension(random, 22, 30)];
  const offset: Vec3 = [dimension(random, -8, 8), dimension(random, -5, 5), lower[2] / 2 + upper[2] / 2 - 2];
  using base = kernel.cube(lower, true);
  using step = translatedCube(kernel, upper, offset);
  return result(context, "T06-stepped-block", [
    operation("body", "base", "body", [], { size: lower }),
    operation("step-1", "union", "step", ["body"], { size: upper, offset }),
  ], kernel.union([base, step]));
};

const lPrism = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random, 50, 66);
  const depth = dimension(random, 42, 56);
  const arm = dimension(random, 14, 20);
  const polygon: readonly Vec2[] = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, -depth / 2 + arm],
    [-width / 2 + arm, -depth / 2 + arm],
    [-width / 2 + arm, depth / 2],
    [-width / 2, depth / 2],
  ];
  const height = dimension(random, 34, 48);
  return result(context, "T07-l-prism", [
    operation("body", "extrude", "body", [], { polygon, height }),
  ], extrudedPolygon(kernel, polygon, height));
};

const tPrism = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random, 54, 70);
  const depth = dimension(random, 42, 56);
  const bar = dimension(random, 13, 18);
  const stem = dimension(random, 15, 21);
  const polygon: readonly Vec2[] = [
    [-width / 2, depth / 2 - bar], [-stem / 2, depth / 2 - bar],
    [-stem / 2, -depth / 2], [stem / 2, -depth / 2],
    [stem / 2, depth / 2 - bar], [width / 2, depth / 2 - bar],
    [width / 2, depth / 2], [-width / 2, depth / 2],
  ];
  const height = dimension(random, 32, 44);
  return result(context, "T08-t-prism", [
    operation("body", "extrude", "body", [], { polygon, height }),
  ], extrudedPolygon(kernel, polygon, height));
};

const prismBoss = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random, 54, 68);
  const depth = dimension(random, 42, 56);
  const polygon: readonly Vec2[] = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [-width / 2, depth / 2]];
  const height = dimension(random, 34, 46);
  const bossSize: Vec3 = [dimension(random, 14, 20), dimension(random, 14, 20), height + 12];
  const offset: Vec3 = [-width / 4, -depth / 5, 3];
  using prism = extrudedPolygon(kernel, polygon, height);
  using boss = translatedCube(kernel, bossSize, offset);
  return result(context, "T09-prism-boss", [
    operation("body", "extrude", "body", [], { polygon, height }),
    operation("boss-1", "union", "boss", ["body"], { size: bossSize, offset }),
  ], kernel.union([prism, boss]));
};

const cuboidWedgeSlot = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random, 58, 70), dimension(random, 44, 56), dimension(random, 38, 48)];
  const polygon: readonly Vec2[] = [
    [size[0] / 2 - 2, -14], [size[0] / 2 + 18, -14], [size[0] / 2 - 2, 14],
  ];
  const slotSize: Vec3 = [dimension(random, 10, 15), size[1] + 8, dimension(random, 14, 20)];
  const slotOffset: Vec3 = [-size[0] / 5, 0, size[2] / 2 - slotSize[2] / 2 + 1];
  using base = kernel.cube(size, true);
  using wedge = extrudedPolygon(kernel, polygon, size[2] * 0.55);
  using joined = kernel.union([base, wedge]);
  using slot = translatedCube(kernel, slotSize, slotOffset);
  return result(context, "T10-cuboid-wedge-slot", [
    operation("body", "base", "body", [], { size }),
    operation("wedge-1", "union", "wedge", ["body"], { polygon, height: size[2] * 0.55 }),
    operation("slot-1", "subtract", "slot", ["body", "wedge-1"], { size: slotSize, offset: slotOffset }),
  ], kernel.difference(joined, slot));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 1, allowedQuestionTypes: ["aperture"], instantiate });

export const APERTURE_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("T01-cuboid-notch", cuboidNotch),
  template("T02-cuboid-wedge", cuboidWedge),
  template("T03-cuboid-cylinder-boss", cuboidCylinderBoss),
  template("T04-cuboid-through-hole", cuboidThroughHole),
  template("T05-cuboid-slot", cuboidSlot),
  template("T06-stepped-block", steppedBlock),
  template("T07-l-prism", lPrism),
  template("T08-t-prism", tPrism),
  template("T09-prism-boss", prismBoss),
  template("T10-cuboid-wedge-slot", cuboidWedgeSlot),
]);

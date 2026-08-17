import type {
  FeatureProvenance,
  GeometryOperation,
  SolidRecipe,
  Vec2,
  Vec3,
} from "@manipat/core";
import type { GeometryKernel, SolidHandle } from "@manipat/geometry";
import type { GeneratedSolid, ObjectTemplate, TemplateContext } from "../types.js";

const dimension = (value: number): number => Math.round(value * 1000) / 1000;

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
    version: 2,
    seed: context.seed,
    templateId,
    operations,
  };
  return { solid, recipe, provenance: operations as readonly FeatureProvenance[] };
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

const tieredNotchedBlock = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const base: Vec3 = [dimension(random.float(62, 72)), dimension(random.float(46, 56)), dimension(random.float(22, 28))];
  const middle: Vec3 = [dimension(random.float(40, 50)), dimension(random.float(32, 42)), dimension(random.float(18, 24))];
  const top: Vec3 = [dimension(random.float(20, 29)), dimension(random.float(18, 26)), dimension(random.float(15, 20))];
  const middleOffset: Vec3 = [dimension(random.float(-10, -4)), dimension(random.float(-5, 5)), base[2] / 2 + middle[2] / 2 - 2];
  const topOffset: Vec3 = [dimension(random.float(9, 15)), dimension(random.float(-7, 6)), middleOffset[2] + middle[2] / 2 + top[2] / 2 - 2];
  const notch: Vec3 = [dimension(random.float(13, 19)), base[1] + 8, dimension(random.float(10, 15))];
  const notchOffset: Vec3 = [base[0] / 2 - notch[0] / 2 + 1, 0, base[2] / 2 - notch[2] / 2 + 1];
  using body = kernel.cube(base, true);
  using mid = translatedCube(kernel, middle, middleOffset);
  using cap = translatedCube(kernel, top, topOffset);
  using joined = kernel.union([body, mid, cap]);
  using cut = translatedCube(kernel, notch, notchOffset);
  return result(context, "A11-tiered-notched-block", [
    operation("body", "base", "body", [], { size: base }),
    operation("middle", "union", "step", ["body"], { size: middle, offset: middleOffset }),
    operation("top", "union", "step", ["body", "middle"], { size: top, offset: topOffset }),
    operation("notch", "subtract", "notch", ["body", "middle", "top"], { size: notch, offset: notchOffset }),
  ], kernel.difference(joined, cut));
};

const asymmetricCross = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const horizontal: Vec3 = [dimension(random.float(58, 70)), dimension(random.float(20, 27)), dimension(random.float(24, 32))];
  const vertical: Vec3 = [dimension(random.float(20, 28)), dimension(random.float(48, 60)), dimension(random.float(20, 28))];
  const verticalOffset: Vec3 = [dimension(random.float(-12, 7)), dimension(random.float(-4, 6)), dimension(random.float(2, 7))];
  const cap: Vec3 = [dimension(random.float(25, 34)), dimension(random.float(18, 25)), dimension(random.float(15, 21))];
  const capOffset: Vec3 = [dimension(random.float(10, 18)), dimension(random.float(7, 13)), horizontal[2] / 2 + cap[2] / 2 - 2];
  using bar = kernel.cube(horizontal, true);
  using stem = translatedCube(kernel, vertical, verticalOffset);
  using capSolid = translatedCube(kernel, cap, capOffset);
  return result(context, "A12-asymmetric-cross", [
    operation("bar", "base", "body", [], { size: horizontal }),
    operation("stem", "union", "arm", ["bar"], { size: vertical, offset: verticalOffset }),
    operation("cap", "union", "boss", ["bar", "stem"], { size: cap, offset: capOffset }),
  ], kernel.union([bar, stem, capSolid]));
};

const facetedStep = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(56, 68));
  const depth = dimension(random.float(44, 54));
  const cut = dimension(random.float(10, 16));
  const polygon: readonly Vec2[] = [
    [-width / 2, -depth / 2],
    [width / 2 - cut, -depth / 2],
    [width / 2, -depth / 2 + cut],
    [width / 2, depth / 2],
    [-width / 2 + cut * 0.6, depth / 2],
    [-width / 2, depth / 2 - cut * 0.7],
  ];
  const height = dimension(random.float(30, 40));
  const step: Vec3 = [dimension(random.float(24, 34)), dimension(random.float(20, 28)), dimension(random.float(16, 23))];
  const stepOffset: Vec3 = [dimension(random.float(-12, 10)), dimension(random.float(5, 12)), height / 2 + step[2] / 2 - 2];
  using base = extrudedPolygon(kernel, polygon, height);
  using raised = translatedCube(kernel, step, stepOffset);
  return result(context, "A13-faceted-step", [
    operation("body", "extrude", "faceted-body", [], { polygon, height }),
    operation("step", "union", "step", ["body"], { size: step, offset: stepOffset }),
  ], kernel.union([base, raised]));
};

const forkedTower = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const base: Vec3 = [dimension(random.float(60, 70)), dimension(random.float(40, 50)), dimension(random.float(18, 24))];
  const post: Vec3 = [dimension(random.float(14, 19)), dimension(random.float(18, 24)), dimension(random.float(24, 34))];
  const xOffset = dimension(random.float(17, 22));
  const yOffset = dimension(random.float(4, 10));
  const postZ = base[2] / 2 + post[2] / 2 - 2;
  const bridge: Vec3 = [xOffset * 2 + post[0], dimension(random.float(12, 18)), dimension(random.float(9, 13))];
  const bridgeOffset: Vec3 = [0, yOffset, postZ + post[2] / 2 - bridge[2] / 2 - 2];
  using body = kernel.cube(base, true);
  using left = translatedCube(kernel, post, [-xOffset, yOffset, postZ]);
  using right = translatedCube(kernel, post, [xOffset, yOffset, postZ]);
  using topBridge = translatedCube(kernel, bridge, bridgeOffset);
  return result(context, "A14-forked-tower", [
    operation("body", "base", "body", [], { size: base }),
    operation("left-post", "union", "post", ["body"], { size: post, offset: [-xOffset, yOffset, postZ] }),
    operation("right-post", "union", "post", ["body", "left-post"], { size: post, offset: [xOffset, yOffset, postZ] }),
    operation("bridge", "union", "bridge", ["left-post", "right-post"], { size: bridge, offset: bridgeOffset }),
  ], kernel.union([body, left, right, topBridge]));
};

const doubleSlotStep = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const base: Vec3 = [dimension(random.float(62, 72)), dimension(random.float(44, 54)), dimension(random.float(34, 44))];
  const raised: Vec3 = [dimension(random.float(34, 44)), dimension(random.float(28, 38)), dimension(random.float(17, 23))];
  const raisedOffset: Vec3 = [dimension(random.float(-7, 8)), dimension(random.float(-5, 5)), base[2] / 2 + raised[2] / 2 - 2];
  const slotA: Vec3 = [dimension(random.float(10, 14)), base[1] + 8, dimension(random.float(12, 17))];
  const slotB: Vec3 = [dimension(random.float(9, 13)), dimension(random.float(14, 20)), base[2] + raised[2] + 8];
  const slotAOffset: Vec3 = [dimension(random.float(-19, -11)), 0, base[2] / 2 - slotA[2] / 2 + 1];
  const slotBOffset: Vec3 = [dimension(random.float(12, 19)), dimension(random.float(7, 13)), 0];
  using body = kernel.cube(base, true);
  using top = translatedCube(kernel, raised, raisedOffset);
  using joined = kernel.union([body, top]);
  using cutA = translatedCube(kernel, slotA, slotAOffset);
  using onceCut = kernel.difference(joined, cutA);
  using cutB = translatedCube(kernel, slotB, slotBOffset);
  return result(context, "A15-double-slot-step", [
    operation("body", "base", "body", [], { size: base }),
    operation("raised", "union", "step", ["body"], { size: raised, offset: raisedOffset }),
    operation("slot-a", "subtract", "slot", ["body", "raised"], { size: slotA, offset: slotAOffset }),
    operation("slot-b", "subtract", "slot", ["body", "raised", "slot-a"], { size: slotB, offset: slotBOffset }),
  ], kernel.difference(onceCut, cutB));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 2, allowedQuestionTypes: ["aperture"], instantiate });

export const APERTURE_COMPLEX_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("A11-tiered-notched-block", tieredNotchedBlock),
  template("A12-asymmetric-cross", asymmetricCross),
  template("A13-faceted-step", facetedStep),
  template("A14-forked-tower", forkedTower),
  template("A15-double-slot-step", doubleSlotStep),
]);

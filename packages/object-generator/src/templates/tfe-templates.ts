import type {
  FeatureProvenance,
  GeometryOperation,
  SolidRecipe,
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
    version: 1,
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

/**
 * TFE templates deliberately use orthogonal polyhedral features. Cylinders and
 * highly tessellated curved surfaces create noisy hidden-line drawings, while
 * simple extrusions collapse into uninformative rectangles. These families are
 * designed to produce several independent elevation/indentation cues across
 * top, front and end views.
 */
const steppedCorner = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const baseSize: Vec3 = [dimension(random.float(62, 72)), dimension(random.float(46, 56)), dimension(random.float(20, 26))];
  const middleSize: Vec3 = [dimension(random.float(38, 48)), dimension(random.float(30, 40)), dimension(random.float(18, 24))];
  const topSize: Vec3 = [dimension(random.float(18, 26)), dimension(random.float(16, 24)), dimension(random.float(14, 20))];
  const middleOffset: Vec3 = [dimension(random.float(-10, -4)), dimension(random.float(-6, 5)), baseSize[2] / 2 + middleSize[2] / 2 - 2];
  const topOffset: Vec3 = [dimension(random.float(8, 14)), dimension(random.float(3, 9)), middleOffset[2] + middleSize[2] / 2 + topSize[2] / 2 - 2];
  using base = kernel.cube(baseSize, true);
  using middle = translatedCube(kernel, middleSize, middleOffset);
  using top = translatedCube(kernel, topSize, topOffset);
  return result(context, "TFE01-stepped-corner", [
    operation("body", "base", "body", [], { size: baseSize }),
    operation("middle-step", "union", "step", ["body"], { size: middleSize, offset: middleOffset }),
    operation("top-step", "union", "step", ["body", "middle-step"], { size: topSize, offset: topOffset }),
  ], kernel.union([base, middle, top]));
};

const topFrontPocket = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random.float(60, 70)), dimension(random.float(46, 56)), dimension(random.float(38, 48))];
  const pocketSize: Vec3 = [dimension(random.float(18, 26)), dimension(random.float(28, 36)), dimension(random.float(22, 30))];
  const pocketOffset: Vec3 = [
    dimension(random.float(6, 14)),
    -size[1] / 2 + pocketSize[1] / 2 - 2,
    size[2] / 2 - pocketSize[2] / 2 + 2,
  ];
  using base = kernel.cube(size, true);
  using pocket = translatedCube(kernel, pocketSize, pocketOffset);
  return result(context, "TFE02-top-front-pocket", [
    operation("body", "base", "body", [], { size }),
    operation("pocket", "subtract", "pocket", ["body"], { size: pocketSize, offset: pocketOffset }),
  ], kernel.difference(base, pocket));
};

const bridge = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const pillarSize: Vec3 = [dimension(random.float(15, 20)), dimension(random.float(34, 44)), dimension(random.float(30, 40))];
  const halfSpan = dimension(random.float(19, 24));
  const slabSize: Vec3 = [halfSpan * 2 + pillarSize[0], pillarSize[1], dimension(random.float(10, 14))];
  const slabZ = pillarSize[2] / 2 + slabSize[2] / 2 - 2;
  using left = translatedCube(kernel, pillarSize, [-halfSpan, 0, 0]);
  using right = translatedCube(kernel, pillarSize, [halfSpan, 0, 0]);
  using slab = translatedCube(kernel, slabSize, [0, 0, slabZ]);
  return result(context, "TFE03-bridge", [
    operation("left-pillar", "base", "pillar", [], { size: pillarSize, offset: [-halfSpan, 0, 0] }),
    operation("right-pillar", "union", "pillar", ["left-pillar"], { size: pillarSize, offset: [halfSpan, 0, 0] }),
    operation("top-slab", "union", "bridge", ["left-pillar", "right-pillar"], { size: slabSize, offset: [0, 0, slabZ] }),
  ], kernel.union([left, right, slab]));
};

const terrace = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const lower: Vec3 = [dimension(random.float(66, 74)), dimension(random.float(48, 56)), dimension(random.float(16, 21))];
  const middle: Vec3 = [dimension(random.float(44, 52)), dimension(random.float(34, 42)), dimension(random.float(16, 21))];
  const upper: Vec3 = [dimension(random.float(24, 32)), dimension(random.float(22, 30)), dimension(random.float(15, 20))];
  const middleOffset: Vec3 = [dimension(random.float(-10, -4)), dimension(random.float(2, 7)), lower[2] / 2 + middle[2] / 2 - 2];
  const upperOffset: Vec3 = [dimension(random.float(7, 13)), dimension(random.float(-6, 1)), middleOffset[2] + middle[2] / 2 + upper[2] / 2 - 2];
  using low = kernel.cube(lower, true);
  using mid = translatedCube(kernel, middle, middleOffset);
  using high = translatedCube(kernel, upper, upperOffset);
  return result(context, "TFE04-terrace", [
    operation("lower", "base", "body", [], { size: lower }),
    operation("middle", "union", "step", ["lower"], { size: middle, offset: middleOffset }),
    operation("upper", "union", "step", ["lower", "middle"], { size: upper, offset: upperOffset }),
  ], kernel.union([low, mid, high]));
};

const cornerNotch = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const size: Vec3 = [dimension(random.float(60, 70)), dimension(random.float(48, 58)), dimension(random.float(38, 48))];
  const notch: Vec3 = [dimension(random.float(22, 30)), dimension(random.float(20, 28)), dimension(random.float(20, 28))];
  const offset: Vec3 = [
    size[0] / 2 - notch[0] / 2 + 2,
    size[1] / 2 - notch[1] / 2 + 2,
    size[2] / 2 - notch[2] / 2 + 2,
  ];
  using base = kernel.cube(size, true);
  using cut = translatedCube(kernel, notch, offset);
  return result(context, "TFE05-corner-notch", [
    operation("body", "base", "body", [], { size }),
    operation("corner-notch", "subtract", "notch", ["body"], { size: notch, offset }),
  ], kernel.difference(base, cut));
};

const crossingRibs = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const base: Vec3 = [dimension(random.float(58, 68)), dimension(random.float(46, 54)), dimension(random.float(20, 26))];
  const verticalRib: Vec3 = [dimension(random.float(14, 20)), base[1], dimension(random.float(20, 28))];
  const transverseRib: Vec3 = [dimension(random.float(38, 48)), dimension(random.float(12, 17)), dimension(random.float(14, 20))];
  const ribZ = base[2] / 2 + verticalRib[2] / 2 - 2;
  const transverseZ = base[2] / 2 + transverseRib[2] / 2 - 2;
  const verticalOffset: Vec3 = [dimension(random.float(-10, 9)), 0, ribZ];
  const transverseOffset: Vec3 = [dimension(random.float(5, 12)), dimension(random.float(-8, 7)), transverseZ];
  using body = kernel.cube(base, true);
  using ribA = translatedCube(kernel, verticalRib, verticalOffset);
  using ribB = translatedCube(kernel, transverseRib, transverseOffset);
  return result(context, "TFE06-crossing-ribs", [
    operation("body", "base", "body", [], { size: base }),
    operation("rib-a", "union", "rib", ["body"], { size: verticalRib, offset: verticalOffset }),
    operation("rib-b", "union", "rib", ["body", "rib-a"], { size: transverseRib, offset: transverseOffset }),
  ], kernel.union([body, ribA, ribB]));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 1, allowedQuestionTypes: ["view-recognition"], instantiate });

export const TFE_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("TFE01-stepped-corner", steppedCorner),
  template("TFE02-top-front-pocket", topFrontPocket),
  template("TFE03-bridge", bridge),
  template("TFE04-terrace", terrace),
  template("TFE05-corner-notch", cornerNotch),
  template("TFE06-crossing-ribs", crossingRibs),
]);

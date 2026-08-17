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
): GeneratedSolid => ({
  solid,
  recipe: {
    id: `${templateId}:${context.seed}`,
    version: 2,
    seed: context.seed,
    templateId,
    operations,
  } satisfies SolidRecipe,
  provenance: operations as readonly FeatureProvenance[],
});

const extruded = (
  kernel: GeometryKernel,
  polygon: readonly Vec2[],
  height: number,
  translation: Vec3 = [0, 0, 0],
): SolidHandle => {
  using section = kernel.section([polygon]);
  using body = kernel.extrude(section, height, { center: true });
  return kernel.translate(body, translation);
};

const scaledPolygon = (polygon: readonly Vec2[], scale: number): readonly Vec2[] =>
  polygon.map(([x, y]): Vec2 => [x * scale, y * scale]);

const hollowFacetedTier = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const rx = dimension(random.float(28, 34));
  const ry = dimension(random.float(22, 28));
  const outer: readonly Vec2[] = [
    [-rx * 0.72, -ry], [rx * 0.55, -ry * 0.94], [rx, -ry * 0.38],
    [rx * 0.88, ry * 0.55], [rx * 0.22, ry], [-rx * 0.62, ry * 0.88],
    [-rx, ry * 0.26], [-rx * 0.94, -ry * 0.52],
  ];
  const lower = scaledPolygon(outer, 1.16);
  const inner = scaledPolygon(outer, dimension(random.float(0.43, 0.52)));
  const lowerHeight = dimension(random.float(14, 18));
  const upperHeight = dimension(random.float(18, 24));
  const upperZ = lowerHeight / 2 + upperHeight / 2 - 2;
  using base = extruded(kernel, lower, lowerHeight);
  using upper = extruded(kernel, outer, upperHeight, [dimension(random.float(-2, 3)), dimension(random.float(-2, 2)), upperZ]);
  using joined = kernel.union([base, upper]);
  using bore = extruded(kernel, inner, lowerHeight + upperHeight + 12, [0, 0, upperZ / 2]);
  return result(context, "A16-hollow-faceted-tier", [
    operation("lower-ring", "extrude", "faceted-base", [], { polygon: lower, height: lowerHeight }),
    operation("upper-ring", "union", "faceted-tier", ["lower-ring"], { polygon: outer, height: upperHeight, z: upperZ }),
    operation("central-bore", "subtract", "through-hole", ["lower-ring", "upper-ring"], { polygon: inner }),
  ], kernel.difference(joined, bore));
};

const nestedFacetedBoss = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(58, 68));
  const depth = dimension(random.float(44, 54));
  const body: readonly Vec2[] = [
    [-width / 2, -depth * 0.32],
    [-width * 0.31, -depth / 2],
    [width * 0.28, -depth / 2],
    [width / 2, -depth * 0.18],
    [width * 0.43, depth * 0.38],
    [width * 0.12, depth / 2],
    [-width * 0.38, depth * 0.43],
    [-width / 2, depth * 0.08],
  ];
  const bossOuter = scaledPolygon(body, 0.58);
  const bossInner = scaledPolygon(body, 0.28);
  const bodyHeight = dimension(random.float(24, 30));
  const bossHeight = dimension(random.float(18, 24));
  const bossOffset: Vec3 = [dimension(random.float(5, 10)), dimension(random.float(-6, 7)), bodyHeight / 2 + bossHeight / 2 - 2];
  using base = extruded(kernel, body, bodyHeight);
  using boss = extruded(kernel, bossOuter, bossHeight, bossOffset);
  using joined = kernel.union([base, boss]);
  using bore = extruded(kernel, bossInner, bossHeight + 8, [bossOffset[0], bossOffset[1], bossOffset[2]]);
  return result(context, "A17-nested-faceted-boss", [
    operation("body", "extrude", "faceted-body", [], { polygon: body, height: bodyHeight }),
    operation("boss", "union", "faceted-boss", ["body"], { polygon: bossOuter, height: bossHeight, offset: bossOffset }),
    operation("boss-bore", "subtract", "through-hole", ["body", "boss"], { polygon: bossInner, offset: bossOffset }),
  ], kernel.difference(joined, bore));
};

const facetedWingNotch = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const outer: readonly Vec2[] = [
    [-30, -18], [10, -22], [32, -8], [27, 19], [2, 25], [-28, 14],
  ];
  const height = dimension(random.float(28, 36));
  const wingSize: Vec3 = [dimension(random.float(28, 36)), dimension(random.float(18, 24)), dimension(random.float(16, 22))];
  const wingOffset: Vec3 = [dimension(random.float(18, 24)), dimension(random.float(12, 18)), dimension(random.float(8, 13))];
  const notchSize: Vec3 = [dimension(random.float(13, 18)), dimension(random.float(24, 32)), height + 12];
  const notchOffset: Vec3 = [dimension(random.float(-19, -12)), dimension(random.float(13, 19)), 0];
  using base = extruded(kernel, outer, height);
  using wingBase = kernel.cube(wingSize, true);
  using wing = kernel.translate(wingBase, wingOffset);
  using joined = kernel.union([base, wing]);
  using notchBase = kernel.cube(notchSize, true);
  using notch = kernel.translate(notchBase, notchOffset);
  return result(context, "A18-faceted-wing-notch", [
    operation("body", "extrude", "faceted-body", [], { polygon: outer, height }),
    operation("wing", "union", "wing", ["body"], { size: wingSize, offset: wingOffset }),
    operation("notch", "subtract", "notch", ["body", "wing"], { size: notchSize, offset: notchOffset }),
  ], kernel.difference(joined, notch));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 2, allowedQuestionTypes: ["aperture"], instantiate });

export const APERTURE_FACETED_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("A16-hollow-faceted-tier", hollowFacetedTier),
  template("A17-nested-faceted-boss", nestedFacetedBoss),
  template("A18-faceted-wing-notch", facetedWingNotch),
]);

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
    version: 3,
    seed: context.seed,
    templateId,
    operations,
  } satisfies SolidRecipe,
  provenance: operations as readonly FeatureProvenance[],
});

const translatedCube = (
  kernel: GeometryKernel,
  size: Vec3,
  translation: Vec3,
): SolidHandle => {
  using cube = kernel.cube(size, true);
  return kernel.translate(cube, translation);
};

const translatedCylinder = (
  kernel: GeometryKernel,
  height: number,
  radiusLow: number,
  radiusHigh: number,
  translation: Vec3,
  rotation: Vec3 = [0, 0, 0],
  segments = 16,
): SolidHandle => {
  using cylinder = kernel.cylinder(height, radiusLow, radiusHigh, segments, true);
  if (rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0) {
    return kernel.translate(cylinder, translation);
  }
  using rotated = kernel.rotate(cylinder, rotation);
  return kernel.translate(rotated, translation);
};

const extruded = (
  kernel: GeometryKernel,
  polygon: readonly Vec2[],
  height: number,
  translation: Vec3 = [0, 0, 0],
  scaleTop: number | Vec2 = 1,
): SolidHandle => {
  using section = kernel.section([polygon]);
  using body = kernel.extrude(section, height, { center: true, scaleTop });
  return kernel.translate(body, translation);
};

/** Thin slab with a rectangular L-style bite and a rounded edge recess. */
const roundedRecessSlab = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const body: Vec3 = [dimension(random.float(70, 84)), dimension(random.float(18, 25)), dimension(random.float(50, 62))];
  const stepCut: Vec3 = [dimension(random.float(20, 27)), body[1] + 10, dimension(random.float(18, 25))];
  const stepOffset: Vec3 = [-body[0] / 2 + stepCut[0] / 2 - 1, 0, body[2] / 2 - stepCut[2] / 2 + 1];
  const radius = dimension(random.float(9, 13));
  const roundOffset: Vec3 = [dimension(random.float(13, 22)), 0, -body[2] / 2 + dimension(random.float(8, 14))];
  const lip: Vec3 = [dimension(random.float(20, 29)), dimension(random.float(12, 17)), dimension(random.float(9, 13))];
  const lipOffset: Vec3 = [body[0] / 2 - lip[0] / 2 - 3, dimension(random.float(-5, 5)), body[2] / 2 + lip[2] / 2 - 2];

  using base = kernel.cube(body, true);
  using step = translatedCube(kernel, stepCut, stepOffset);
  using onceCut = kernel.difference(base, step);
  using round = translatedCylinder(kernel, body[1] + 16, radius, radius, roundOffset, [90, 0, 0], 20);
  using twiceCut = kernel.difference(onceCut, round);
  using raisedLip = translatedCube(kernel, lip, lipOffset);
  return result(context, "A19-rounded-recess-slab", [
    operation("body", "base", "thin-slab", [], { size: body }),
    operation("step-cut", "subtract", "corner-recess", ["body"], { size: stepCut, offset: stepOffset }),
    operation("round-cut", "subtract", "rounded-edge-recess", ["body", "step-cut"], { radius, offset: roundOffset, axis: "y" }),
    operation("upper-lip", "union", "offset-step", ["body", "step-cut", "round-cut"], { size: lip, offset: lipOffset }),
  ], kernel.union([twiceCut, raisedLip]));
};

/** Compound circular tiers tied together by an offset rectangular spine. */
const compoundCylinderTower = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const lowerRadius = dimension(random.float(20, 25));
  const lowerHeight = dimension(random.float(10, 14));
  const columnRadius = dimension(random.float(10, 14));
  const columnHeight = dimension(random.float(34, 44));
  const upperRadius = dimension(random.float(18, 24));
  const upperHeight = dimension(random.float(11, 15));
  const lowerOffset: Vec3 = [dimension(random.float(-15, -8)), dimension(random.float(-5, 4)), -columnHeight * 0.25];
  const columnOffset: Vec3 = [dimension(random.float(4, 11)), dimension(random.float(-2, 5)), 0];
  const upperOffset: Vec3 = [dimension(random.float(10, 17)), dimension(random.float(-4, 4)), columnHeight / 2 + upperHeight / 2 - 3];
  const spine: Vec3 = [dimension(random.float(15, 20)), dimension(random.float(17, 23)), dimension(random.float(48, 58))];
  const spineOffset: Vec3 = [dimension(random.float(-4, 3)), dimension(random.float(8, 13)), dimension(random.float(1, 6))];
  const notch: Vec3 = [dimension(random.float(8, 12)), dimension(random.float(20, 28)), dimension(random.float(12, 17))];
  const notchOffset: Vec3 = [spineOffset[0] - spine[0] / 2 + notch[0] / 2 - 1, spineOffset[1], spineOffset[2] + dimension(random.float(6, 12))];

  using lower = translatedCylinder(kernel, lowerHeight, lowerRadius, lowerRadius, lowerOffset, [0, 0, 0], 20);
  using column = translatedCylinder(kernel, columnHeight, columnRadius, columnRadius, columnOffset, [0, 0, 0], 20);
  using upper = translatedCylinder(kernel, upperHeight, upperRadius, upperRadius, upperOffset, [0, 0, 0], 20);
  using spineSolid = translatedCube(kernel, spine, spineOffset);
  using joined = kernel.union([lower, column, upper, spineSolid]);
  using cut = translatedCube(kernel, notch, notchOffset);
  return result(context, "A20-compound-cylinder-tower", [
    operation("lower-disc", "base", "circular-platform", [], { radius: lowerRadius, height: lowerHeight, offset: lowerOffset }),
    operation("column", "union", "cylindrical-column", ["lower-disc"], { radius: columnRadius, height: columnHeight, offset: columnOffset }),
    operation("upper-disc", "union", "circular-platform", ["column"], { radius: upperRadius, height: upperHeight, offset: upperOffset }),
    operation("spine", "union", "rectangular-spine", ["lower-disc", "column", "upper-disc"], { size: spine, offset: spineOffset }),
    operation("spine-notch", "subtract", "notch", ["spine"], { size: notch, offset: notchOffset }),
  ], kernel.difference(joined, cut));
};

/** Two tapered faceted tiers plus an offset boss and edge notch. */
const taperedFacetedCrown = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const rx = dimension(random.float(30, 36));
  const ry = dimension(random.float(22, 28));
  const profile: readonly Vec2[] = [
    [-rx, -ry * 0.25], [-rx * 0.66, -ry], [rx * 0.38, -ry], [rx, -ry * 0.35],
    [rx * 0.9, ry * 0.62], [rx * 0.2, ry], [-rx * 0.72, ry * 0.76],
  ];
  const lowerHeight = dimension(random.float(20, 26));
  const upperHeight = dimension(random.float(18, 24));
  const upperZ = lowerHeight / 2 + upperHeight / 2 - 3;
  const boss: Vec3 = [dimension(random.float(17, 23)), dimension(random.float(15, 21)), dimension(random.float(15, 20))];
  const bossOffset: Vec3 = [dimension(random.float(12, 18)), dimension(random.float(-10, -4)), upperZ + upperHeight / 2 + boss[2] / 2 - 3];
  const notch: Vec3 = [dimension(random.float(13, 18)), dimension(random.float(24, 32)), lowerHeight + upperHeight + 10];
  const notchOffset: Vec3 = [-rx + notch[0] / 2 - 1, dimension(random.float(7, 13)), upperZ / 2];

  using lower = extruded(kernel, profile, lowerHeight, [0, 0, 0], dimension(random.float(0.82, 0.9)));
  using upper = extruded(kernel, profile.map(([x, y]): Vec2 => [x * 0.72, y * 0.72]), upperHeight, [dimension(random.float(4, 8)), dimension(random.float(-4, 5)), upperZ], dimension(random.float(0.68, 0.8)));
  using bossSolid = translatedCube(kernel, boss, bossOffset);
  using joined = kernel.union([lower, upper, bossSolid]);
  using cut = translatedCube(kernel, notch, notchOffset);
  return result(context, "A21-tapered-faceted-crown", [
    operation("lower", "extrude", "tapered-faceted-base", [], { polygon: profile, height: lowerHeight, scaleTop: 0.86 }),
    operation("upper", "union", "tapered-tier", ["lower"], { height: upperHeight, offset: upperZ }),
    operation("boss", "union", "offset-boss", ["lower", "upper"], { size: boss, offset: bossOffset }),
    operation("edge-notch", "subtract", "deep-notch", ["lower", "upper", "boss"], { size: notch, offset: notchOffset }),
  ], kernel.difference(joined, cut));
};

/** Long asymmetric rail with staggered towers, bridge, tab and side bite. */
const staggeredRailTabs = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const rail: Vec3 = [dimension(random.float(74, 88)), dimension(random.float(20, 27)), dimension(random.float(15, 20))];
  const towerA: Vec3 = [dimension(random.float(17, 23)), dimension(random.float(22, 30)), dimension(random.float(36, 46))];
  const towerB: Vec3 = [dimension(random.float(15, 21)), dimension(random.float(20, 28)), dimension(random.float(28, 38))];
  const ax = -rail[0] * 0.28;
  const bx = rail[0] * 0.25;
  const aOffset: Vec3 = [ax, dimension(random.float(-5, 4)), rail[2] / 2 + towerA[2] / 2 - 2];
  const bOffset: Vec3 = [bx, dimension(random.float(3, 8)), rail[2] / 2 + towerB[2] / 2 - 2];
  const bridge: Vec3 = [Math.abs(bx - ax) + towerA[0] / 2 + towerB[0] / 2, dimension(random.float(11, 16)), dimension(random.float(9, 13))];
  const bridgeOffset: Vec3 = [(ax + bx) / 2, dimension(random.float(6, 10)), Math.min(aOffset[2] + towerA[2] / 2, bOffset[2] + towerB[2] / 2) - bridge[2] / 2 - 2];
  const tab: Vec3 = [dimension(random.float(13, 18)), dimension(random.float(14, 20)), dimension(random.float(11, 16))];
  const tabOffset: Vec3 = [rail[0] / 2 - tab[0] / 2 - 3, -rail[1] / 2 - tab[1] / 2 + 3, rail[2] / 2 + tab[2] / 2 - 2];
  const bite: Vec3 = [dimension(random.float(9, 13)), rail[1] + 8, dimension(random.float(9, 14))];
  const biteOffset: Vec3 = [-rail[0] / 2 + bite[0] / 2 - 1, 0, rail[2] / 2 - bite[2] / 2 + 1];

  using base = kernel.cube(rail, true);
  using firstTower = translatedCube(kernel, towerA, aOffset);
  using secondTower = translatedCube(kernel, towerB, bOffset);
  using topBridge = translatedCube(kernel, bridge, bridgeOffset);
  using externalTab = translatedCube(kernel, tab, tabOffset);
  using joined = kernel.union([base, firstTower, secondTower, topBridge, externalTab]);
  using cut = translatedCube(kernel, bite, biteOffset);
  return result(context, "A22-staggered-rail-tabs", [
    operation("rail", "base", "long-rail", [], { size: rail }),
    operation("tower-a", "union", "tall-post", ["rail"], { size: towerA, offset: aOffset }),
    operation("tower-b", "union", "short-post", ["rail"], { size: towerB, offset: bOffset }),
    operation("bridge", "union", "offset-bridge", ["tower-a", "tower-b"], { size: bridge, offset: bridgeOffset }),
    operation("tab", "union", "external-tab", ["rail"], { size: tab, offset: tabOffset }),
    operation("bite", "subtract", "edge-notch", ["rail"], { size: bite, offset: biteOffset }),
  ], kernel.difference(joined, cut));
};

/** Bridge frame with a true rounded undercut and asymmetric top step. */
const archBridgeRecess = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const body: Vec3 = [dimension(random.float(68, 80)), dimension(random.float(30, 40)), dimension(random.float(45, 56))];
  const opening: Vec3 = [dimension(random.float(30, 38)), body[1] + 8, dimension(random.float(25, 32))];
  const openingOffset: Vec3 = [dimension(random.float(-5, 4)), 0, -body[2] / 2 + opening[2] / 2 - 1];
  const archRadius = opening[0] * dimension(random.float(0.42, 0.48));
  const archOffset: Vec3 = [openingOffset[0], 0, openingOffset[2] + opening[2] / 2];
  const cap: Vec3 = [dimension(random.float(24, 32)), dimension(random.float(18, 25)), dimension(random.float(12, 17))];
  const capOffset: Vec3 = [dimension(random.float(12, 20)), dimension(random.float(-8, 6)), body[2] / 2 + cap[2] / 2 - 2];
  const sideSlot: Vec3 = [dimension(random.float(10, 14)), body[1] + 8, dimension(random.float(12, 18))];
  const sideSlotOffset: Vec3 = [-body[0] / 2 + sideSlot[0] / 2 - 1, 0, dimension(random.float(5, 12))];

  using base = kernel.cube(body, true);
  using door = translatedCube(kernel, opening, openingOffset);
  using onceCut = kernel.difference(base, door);
  using arch = translatedCylinder(kernel, body[1] + 12, archRadius, archRadius, archOffset, [90, 0, 0], 20);
  using twiceCut = kernel.difference(onceCut, arch);
  using capSolid = translatedCube(kernel, cap, capOffset);
  using joined = kernel.union([twiceCut, capSolid]);
  using slot = translatedCube(kernel, sideSlot, sideSlotOffset);
  return result(context, "A23-arch-bridge-recess", [
    operation("body", "base", "bridge-body", [], { size: body }),
    operation("door", "subtract", "rectangular-undercut", ["body"], { size: opening, offset: openingOffset }),
    operation("arch", "subtract", "rounded-undercut", ["body", "door"], { radius: archRadius, offset: archOffset, axis: "y" }),
    operation("cap", "union", "offset-cap", ["body"], { size: cap, offset: capOffset }),
    operation("side-slot", "subtract", "side-notch", ["body", "cap"], { size: sideSlot, offset: sideSlotOffset }),
  ], kernel.difference(joined, slot));
};

/** Multi-tier block with two differently oriented pockets and a top boss. */
const dualPocketTier = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const lower: Vec3 = [dimension(random.float(66, 78)), dimension(random.float(48, 58)), dimension(random.float(24, 30))];
  const upper: Vec3 = [dimension(random.float(43, 53)), dimension(random.float(34, 44)), dimension(random.float(22, 29))];
  const upperOffset: Vec3 = [dimension(random.float(-8, 7)), dimension(random.float(-6, 5)), lower[2] / 2 + upper[2] / 2 - 2];
  const frontPocket: Vec3 = [dimension(random.float(16, 22)), lower[1] + 10, dimension(random.float(14, 20))];
  const frontPocketOffset: Vec3 = [dimension(random.float(-20, -10)), 0, lower[2] / 2 - frontPocket[2] / 2 + 1];
  const sidePocket: Vec3 = [lower[0] + 10, dimension(random.float(11, 16)), dimension(random.float(12, 18))];
  const sidePocketOffset: Vec3 = [0, lower[1] / 2 - sidePocket[1] / 2 + 1, upperOffset[2] + dimension(random.float(2, 8))];
  const boss: Vec3 = [dimension(random.float(17, 23)), dimension(random.float(16, 22)), dimension(random.float(15, 20))];
  const bossOffset: Vec3 = [dimension(random.float(10, 17)), dimension(random.float(-10, -4)), upperOffset[2] + upper[2] / 2 + boss[2] / 2 - 2];

  using base = kernel.cube(lower, true);
  using tier = translatedCube(kernel, upper, upperOffset);
  using bossSolid = translatedCube(kernel, boss, bossOffset);
  using joined = kernel.union([base, tier, bossSolid]);
  using pocketA = translatedCube(kernel, frontPocket, frontPocketOffset);
  using onceCut = kernel.difference(joined, pocketA);
  using pocketB = translatedCube(kernel, sidePocket, sidePocketOffset);
  return result(context, "A24-dual-pocket-tier", [
    operation("lower", "base", "base-tier", [], { size: lower }),
    operation("upper", "union", "offset-tier", ["lower"], { size: upper, offset: upperOffset }),
    operation("boss", "union", "top-boss", ["lower", "upper"], { size: boss, offset: bossOffset }),
    operation("front-pocket", "subtract", "front-recess", ["lower", "upper", "boss"], { size: frontPocket, offset: frontPocketOffset }),
    operation("side-pocket", "subtract", "side-recess", ["lower", "upper", "boss", "front-pocket"], { size: sidePocket, offset: sidePocketOffset }),
  ], kernel.difference(onceCut, pocketB));
};

/** Faceted base supporting two tapered posts and an offset connecting bridge. */
const facetedForkBridge = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(68, 80));
  const depth = dimension(random.float(42, 52));
  const baseProfile: readonly Vec2[] = [
    [-width / 2, -depth * 0.35], [-width * 0.25, -depth / 2], [width * 0.32, -depth / 2],
    [width / 2, -depth * 0.12], [width * 0.42, depth * 0.42], [-width * 0.35, depth / 2],
    [-width / 2, depth * 0.12],
  ];
  const baseHeight = dimension(random.float(16, 21));
  const postProfile: readonly Vec2[] = [[-8, -7], [8, -7], [10, 7], [-6, 9]];
  const postHeight = dimension(random.float(30, 40));
  const x = dimension(random.float(18, 23));
  const postZ = baseHeight / 2 + postHeight / 2 - 2;
  const bridge: Vec3 = [x * 2 + 16, dimension(random.float(11, 15)), dimension(random.float(8, 12))];
  const bridgeOffset: Vec3 = [dimension(random.float(-3, 4)), dimension(random.float(5, 10)), postZ + postHeight / 2 - bridge[2] / 2 - 2];
  const notch: Vec3 = [dimension(random.float(11, 15)), depth + 10, dimension(random.float(9, 14))];
  const notchOffset: Vec3 = [dimension(random.float(-5, 6)), 0, baseHeight / 2 - notch[2] / 2 + 1];

  using base = extruded(kernel, baseProfile, baseHeight);
  using left = extruded(kernel, postProfile, postHeight, [-x, dimension(random.float(-4, 2)), postZ], dimension(random.float(0.7, 0.82)));
  using right = extruded(kernel, postProfile, postHeight * dimension(random.float(0.78, 0.94)), [x, dimension(random.float(3, 7)), postZ - 2], dimension(random.float(0.72, 0.86)));
  using top = translatedCube(kernel, bridge, bridgeOffset);
  using joined = kernel.union([base, left, right, top]);
  using cut = translatedCube(kernel, notch, notchOffset);
  return result(context, "A25-faceted-fork-bridge", [
    operation("base", "extrude", "faceted-base", [], { polygon: baseProfile, height: baseHeight }),
    operation("left-post", "union", "tapered-post", ["base"], { polygon: postProfile, height: postHeight, offset: [-x, 0, postZ] }),
    operation("right-post", "union", "tapered-post", ["base", "left-post"], { polygon: postProfile, offset: [x, 5, postZ] }),
    operation("bridge", "union", "offset-bridge", ["left-post", "right-post"], { size: bridge, offset: bridgeOffset }),
    operation("base-notch", "subtract", "notch", ["base", "left-post", "right-post", "bridge"], { size: notch, offset: notchOffset }),
  ], kernel.difference(joined, cut));
};

/** Faceted body plus an offset circular boss, rounded edge bite and upper step. */
const mixedPrismCylinder = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(64, 76));
  const depth = dimension(random.float(42, 54));
  const profile: readonly Vec2[] = [
    [-width / 2, -depth / 2], [width * 0.28, -depth / 2], [width / 2, -depth * 0.16],
    [width * 0.44, depth / 2], [-width * 0.38, depth * 0.43], [-width / 2, depth * 0.08],
  ];
  const height = dimension(random.float(28, 36));
  const bossRadius = dimension(random.float(9, 13));
  const bossHeight = dimension(random.float(17, 23));
  const bossOffset: Vec3 = [dimension(random.float(10, 18)), dimension(random.float(-8, 5)), height / 2 + bossHeight / 2 - 2];
  const biteRadius = dimension(random.float(8, 11));
  const biteOffset: Vec3 = [-width / 2, 0, dimension(random.float(-4, 6))];
  const step: Vec3 = [dimension(random.float(22, 29)), dimension(random.float(17, 23)), dimension(random.float(12, 17))];
  const stepOffset: Vec3 = [dimension(random.float(-12, -5)), dimension(random.float(8, 14)), height / 2 + step[2] / 2 - 2];

  using base = extruded(kernel, profile, height);
  using boss = translatedCylinder(kernel, bossHeight, bossRadius, bossRadius * dimension(random.float(0.72, 0.9)), bossOffset, [0, 0, 0], 16);
  using upperStep = translatedCube(kernel, step, stepOffset);
  using joined = kernel.union([base, boss, upperStep]);
  using bite = translatedCylinder(kernel, depth + 16, biteRadius, biteRadius, biteOffset, [90, 0, 0], 18);
  return result(context, "A26-mixed-prism-cylinder", [
    operation("body", "extrude", "faceted-body", [], { polygon: profile, height }),
    operation("boss", "union", "tapered-circular-boss", ["body"], { radius: bossRadius, height: bossHeight, offset: bossOffset }),
    operation("step", "union", "offset-step", ["body", "boss"], { size: step, offset: stepOffset }),
    operation("round-bite", "subtract", "rounded-edge-recess", ["body", "boss", "step"], { radius: biteRadius, offset: biteOffset, axis: "y" }),
  ], kernel.difference(joined, bite));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 3, allowedQuestionTypes: ["aperture"], instantiate });

/**
 * Golden-complexity source bank. Every family combines at least four semantic
 * features so difficulty comes from the real 3D object, not answer mutations.
 */
export const APERTURE_ADVANCED_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("A19-rounded-recess-slab", roundedRecessSlab),
  template("A20-compound-cylinder-tower", compoundCylinderTower),
  template("A21-tapered-faceted-crown", taperedFacetedCrown),
  template("A22-staggered-rail-tabs", staggeredRailTabs),
  template("A23-arch-bridge-recess", archBridgeRecess),
  template("A24-dual-pocket-tier", dualPocketTier),
  template("A25-faceted-fork-bridge", facetedForkBridge),
  template("A26-mixed-prism-cylinder", mixedPrismCylinder),
]);

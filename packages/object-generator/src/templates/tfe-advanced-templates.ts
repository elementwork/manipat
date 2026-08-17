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

const translatedCube = (
  kernel: GeometryKernel,
  size: Vec3,
  translation: Vec3,
): SolidHandle => {
  using cube = kernel.cube(size, true);
  return kernel.translate(cube, translation);
};

/** Extrude an X/Z profile through Y. */
const profilePrismY = (
  kernel: GeometryKernel,
  profileXZ: readonly Vec2[],
  depth: number,
  translation: Vec3 = [0, 0, 0],
): SolidHandle => {
  using section = kernel.section([profileXZ]);
  using local = kernel.extrude(section, depth, { center: true });
  using oriented = kernel.rotate(local, [90, 0, 0]);
  return kernel.translate(oriented, translation);
};

const translatedCylinder = (
  kernel: GeometryKernel,
  height: number,
  radius: number,
  translation: Vec3,
  rotation: Vec3,
  segments = 12,
): SolidHandle => {
  using cylinder = kernel.cylinder(height, radius, radius, segments, true);
  using oriented = kernel.rotate(cylinder, rotation);
  return kernel.translate(oriented, translation);
};

/** Gabled envelope with an upper pocket and offset longitudinal rib. */
const gabledPocketRib = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(62, 72));
  const wall = dimension(random.float(28, 35));
  const roof = dimension(random.float(16, 23));
  const depth = dimension(random.float(44, 54));
  const profile: readonly Vec2[] = [
    [-width / 2, -wall / 2], [width / 2, -wall / 2],
    [width / 2, wall / 2], [0, wall / 2 + roof], [-width / 2, wall / 2],
  ];
  const pocket: Vec3 = [dimension(random.float(18, 24)), dimension(random.float(22, 30)), dimension(random.float(16, 22))];
  const pocketOffset: Vec3 = [dimension(random.float(7, 14)), -depth / 2 + pocket[1] / 2 - 1, wall / 2 + dimension(random.float(4, 9))];
  const rib: Vec3 = [dimension(random.float(11, 16)), depth, dimension(random.float(12, 18))];
  const ribOffset: Vec3 = [dimension(random.float(-17, -9)), dimension(random.float(1, 5)), wall / 2 + rib[2] / 2 - 2];
  const endNotch: Vec3 = [dimension(random.float(12, 17)), dimension(random.float(15, 21)), dimension(random.float(12, 18))];
  const endNotchOffset: Vec3 = [width / 2 - endNotch[0] / 2 + 1, depth / 2 - endNotch[1] / 2 + 1, -wall / 2 + endNotch[2] / 2 - 1];

  using body = profilePrismY(kernel, profile, depth);
  using pocketSolid = translatedCube(kernel, pocket, pocketOffset);
  using onceCut = kernel.difference(body, pocketSolid);
  using ribSolid = translatedCube(kernel, rib, ribOffset);
  using joined = kernel.union([onceCut, ribSolid]);
  using notch = translatedCube(kernel, endNotch, endNotchOffset);
  return result(context, "TFE07-gabled-pocket-rib", [
    operation("gable-body", "extrude", "gabled-envelope", [], { profile, depth }),
    operation("upper-pocket", "subtract", "recess", ["gable-body"], { size: pocket, offset: pocketOffset }),
    operation("long-rib", "union", "rib", ["gable-body", "upper-pocket"], { size: rib, offset: ribOffset }),
    operation("end-notch", "subtract", "notch", ["gable-body", "upper-pocket", "long-rib"], { size: endNotch, offset: endNotchOffset }),
  ], kernel.difference(joined, notch));
};

/** Chamfered outer envelope with independent front and top recess cues. */
const chamferedDualRecess = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(64, 74));
  const height = dimension(random.float(46, 56));
  const depth = dimension(random.float(46, 56));
  const chamfer = dimension(random.float(8, 13));
  const profile: readonly Vec2[] = [
    [-width / 2 + chamfer, -height / 2], [width / 2 - chamfer, -height / 2],
    [width / 2, -height / 2 + chamfer], [width / 2, height / 2 - chamfer],
    [width / 2 - chamfer, height / 2], [-width / 2 + chamfer, height / 2],
    [-width / 2, height / 2 - chamfer], [-width / 2, -height / 2 + chamfer],
  ];
  const frontPocket: Vec3 = [dimension(random.float(18, 24)), dimension(random.float(18, 25)), dimension(random.float(22, 30))];
  const frontOffset: Vec3 = [dimension(random.float(-15, -7)), -depth / 2 + frontPocket[1] / 2 - 1, dimension(random.float(4, 10))];
  const topPocket: Vec3 = [dimension(random.float(20, 28)), dimension(random.float(19, 27)), dimension(random.float(15, 21))];
  const topOffset: Vec3 = [dimension(random.float(9, 17)), dimension(random.float(7, 14)), height / 2 - topPocket[2] / 2 + 1];
  const boss: Vec3 = [dimension(random.float(12, 17)), dimension(random.float(15, 21)), dimension(random.float(12, 18))];
  const bossOffset: Vec3 = [width / 2 - boss[0] / 2 - 3, dimension(random.float(-12, -5)), dimension(random.float(-10, 2))];

  using body = profilePrismY(kernel, profile, depth);
  using pocketA = translatedCube(kernel, frontPocket, frontOffset);
  using cutA = kernel.difference(body, pocketA);
  using pocketB = translatedCube(kernel, topPocket, topOffset);
  using cutB = kernel.difference(cutA, pocketB);
  using bossSolid = translatedCube(kernel, boss, bossOffset);
  return result(context, "TFE08-chamfered-dual-recess", [
    operation("body", "extrude", "chamfered-envelope", [], { profile, depth }),
    operation("front-pocket", "subtract", "front-recess", ["body"], { size: frontPocket, offset: frontOffset }),
    operation("top-pocket", "subtract", "top-recess", ["body", "front-pocket"], { size: topPocket, offset: topOffset }),
    operation("side-boss", "union", "offset-boss", ["body", "front-pocket", "top-pocket"], { size: boss, offset: bossOffset }),
  ], kernel.union([cutB, bossSolid]));
};

/** Two unequal pillars, bridge deck, undercut and offset upper slab. */
const steppedUndercutBridge = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const left: Vec3 = [dimension(random.float(16, 21)), dimension(random.float(40, 50)), dimension(random.float(38, 48))];
  const right: Vec3 = [dimension(random.float(18, 23)), dimension(random.float(34, 44)), dimension(random.float(29, 38))];
  const span = dimension(random.float(42, 50));
  const leftOffset: Vec3 = [-span / 2, dimension(random.float(-3, 3)), 0];
  const rightOffset: Vec3 = [span / 2, dimension(random.float(4, 9)), -dimension(random.float(4, 8))];
  const deck: Vec3 = [span + left[0] / 2 + right[0] / 2 + 8, dimension(random.float(28, 36)), dimension(random.float(10, 14))];
  const deckZ = Math.min(left[2] / 2, rightOffset[2] + right[2] / 2) - deck[2] / 2 + 1;
  const deckOffset: Vec3 = [0, dimension(random.float(-5, 4)), deckZ];
  const upper: Vec3 = [dimension(random.float(26, 34)), dimension(random.float(18, 25)), dimension(random.float(12, 17))];
  const upperOffset: Vec3 = [dimension(random.float(8, 15)), dimension(random.float(7, 12)), deckZ + deck[2] / 2 + upper[2] / 2 - 2];
  const slot: Vec3 = [dimension(random.float(10, 14)), deck[1] + 10, dimension(random.float(8, 12))];
  const slotOffset: Vec3 = [dimension(random.float(-12, -4)), deckOffset[1], deckZ];

  using leftSolid = translatedCube(kernel, left, leftOffset);
  using rightSolid = translatedCube(kernel, right, rightOffset);
  using deckSolid = translatedCube(kernel, deck, deckOffset);
  using upperSolid = translatedCube(kernel, upper, upperOffset);
  using joined = kernel.union([leftSolid, rightSolid, deckSolid, upperSolid]);
  using cut = translatedCube(kernel, slot, slotOffset);
  return result(context, "TFE09-stepped-undercut-bridge", [
    operation("left", "base", "pillar", [], { size: left, offset: leftOffset }),
    operation("right", "union", "pillar", ["left"], { size: right, offset: rightOffset }),
    operation("deck", "union", "bridge", ["left", "right"], { size: deck, offset: deckOffset }),
    operation("upper", "union", "offset-step", ["deck"], { size: upper, offset: upperOffset }),
    operation("deck-slot", "subtract", "slot", ["deck", "upper"], { size: slot, offset: slotOffset }),
  ], kernel.difference(joined, cut));
};

/** Irregular stepped profile with transverse rib and hidden side pocket. */
const asymmetricSaddle = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(66, 78));
  const height = dimension(random.float(45, 56));
  const depth = dimension(random.float(42, 54));
  const profile: readonly Vec2[] = [
    [-width / 2, -height / 2], [width / 2, -height / 2],
    [width / 2, -height * 0.05], [width * 0.23, -height * 0.05],
    [width * 0.23, height / 2], [-width * 0.13, height / 2],
    [-width * 0.13, height * 0.2], [-width / 2, height * 0.2],
  ];
  const rib: Vec3 = [dimension(random.float(42, 52)), dimension(random.float(11, 16)), dimension(random.float(13, 18))];
  const ribOffset: Vec3 = [dimension(random.float(3, 10)), dimension(random.float(-8, 7)), height * 0.08];
  const pocket: Vec3 = [dimension(random.float(18, 25)), dimension(random.float(18, 25)), dimension(random.float(16, 23))];
  const pocketOffset: Vec3 = [-width / 2 + pocket[0] / 2 - 1, depth / 2 - pocket[1] / 2 + 1, -height / 2 + pocket[2] / 2 + 5];
  const cap: Vec3 = [dimension(random.float(17, 24)), dimension(random.float(16, 22)), dimension(random.float(10, 15))];
  const capOffset: Vec3 = [dimension(random.float(-4, 5)), dimension(random.float(9, 15)), height / 2 + cap[2] / 2 - 2];

  using body = profilePrismY(kernel, profile, depth);
  using ribSolid = translatedCube(kernel, rib, ribOffset);
  using capSolid = translatedCube(kernel, cap, capOffset);
  using joined = kernel.union([body, ribSolid, capSolid]);
  using cut = translatedCube(kernel, pocket, pocketOffset);
  return result(context, "TFE10-asymmetric-saddle", [
    operation("body", "extrude", "stepped-envelope", [], { profile, depth }),
    operation("rib", "union", "transverse-rib", ["body"], { size: rib, offset: ribOffset }),
    operation("cap", "union", "offset-cap", ["body", "rib"], { size: cap, offset: capOffset }),
    operation("side-pocket", "subtract", "hidden-recess", ["body", "rib", "cap"], { size: pocket, offset: pocketOffset }),
  ], kernel.difference(joined, cut));
};

/** Tapered tower with a through slot, shoulder step and side boss. */
const taperedTowerSlot = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(54, 64));
  const depth = dimension(random.float(42, 52));
  const footprint: readonly Vec2[] = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];
  const height = dimension(random.float(46, 58));
  using section = kernel.section([footprint]);
  using tower = kernel.extrude(section, height, { center: true, scaleTop: dimension(random.float(0.68, 0.8)) });
  const slot: Vec3 = [dimension(random.float(13, 18)), depth + 12, dimension(random.float(20, 28))];
  const slotOffset: Vec3 = [dimension(random.float(5, 12)), 0, dimension(random.float(6, 13))];
  const shoulder: Vec3 = [dimension(random.float(28, 37)), dimension(random.float(22, 30)), dimension(random.float(12, 17))];
  const shoulderOffset: Vec3 = [dimension(random.float(-10, -4)), dimension(random.float(7, 13)), height / 2 + shoulder[2] / 2 - 2];
  const boss: Vec3 = [dimension(random.float(12, 17)), dimension(random.float(14, 20)), dimension(random.float(15, 21))];
  const bossOffset: Vec3 = [-width / 2 - boss[0] / 2 + 3, dimension(random.float(-11, -5)), dimension(random.float(-5, 6))];

  using slotSolid = translatedCube(kernel, slot, slotOffset);
  using cut = kernel.difference(tower, slotSolid);
  using shoulderSolid = translatedCube(kernel, shoulder, shoulderOffset);
  using bossSolid = translatedCube(kernel, boss, bossOffset);
  return result(context, "TFE11-tapered-tower-slot", [
    operation("tower", "extrude", "tapered-envelope", [], { footprint, height, scaleTop: 0.74 }),
    operation("through-slot", "subtract", "slot", ["tower"], { size: slot, offset: slotOffset }),
    operation("shoulder", "union", "upper-step", ["tower", "through-slot"], { size: shoulder, offset: shoulderOffset }),
    operation("side-boss", "union", "boss", ["tower", "through-slot", "shoulder"], { size: boss, offset: bossOffset }),
  ], kernel.union([cut, shoulderSolid, bossSolid]));
};

/** Orthogonal base with crossing ribs and two visibility-producing pockets. */
const crossedRibsDualPocket = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const base: Vec3 = [dimension(random.float(62, 72)), dimension(random.float(48, 58)), dimension(random.float(24, 31))];
  const ribX: Vec3 = [dimension(random.float(46, 56)), dimension(random.float(12, 17)), dimension(random.float(19, 25))];
  const ribY: Vec3 = [dimension(random.float(13, 18)), dimension(random.float(40, 50)), dimension(random.float(24, 31))];
  const ribXOffset: Vec3 = [dimension(random.float(5, 11)), dimension(random.float(-8, 7)), base[2] / 2 + ribX[2] / 2 - 2];
  const ribYOffset: Vec3 = [dimension(random.float(-13, -6)), dimension(random.float(4, 10)), base[2] / 2 + ribY[2] / 2 - 2];
  const pocketA: Vec3 = [dimension(random.float(14, 20)), base[1] + 8, dimension(random.float(12, 18))];
  const pocketAOffset: Vec3 = [base[0] / 2 - pocketA[0] / 2 + 1, 0, base[2] / 2 - pocketA[2] / 2 + 1];
  const pocketB: Vec3 = [base[0] + 8, dimension(random.float(12, 18)), dimension(random.float(14, 20))];
  const pocketBOffset: Vec3 = [0, -base[1] / 2 + pocketB[1] / 2 - 1, ribYOffset[2] + dimension(random.float(1, 6))];

  using body = kernel.cube(base, true);
  using firstRib = translatedCube(kernel, ribX, ribXOffset);
  using secondRib = translatedCube(kernel, ribY, ribYOffset);
  using joined = kernel.union([body, firstRib, secondRib]);
  using firstPocket = translatedCube(kernel, pocketA, pocketAOffset);
  using onceCut = kernel.difference(joined, firstPocket);
  using secondPocket = translatedCube(kernel, pocketB, pocketBOffset);
  return result(context, "TFE12-crossed-ribs-dual-pocket", [
    operation("body", "base", "body", [], { size: base }),
    operation("rib-x", "union", "rib", ["body"], { size: ribX, offset: ribXOffset }),
    operation("rib-y", "union", "rib", ["body", "rib-x"], { size: ribY, offset: ribYOffset }),
    operation("pocket-a", "subtract", "front-pocket", ["body", "rib-x", "rib-y"], { size: pocketA, offset: pocketAOffset }),
    operation("pocket-b", "subtract", "side-pocket", ["body", "rib-x", "rib-y", "pocket-a"], { size: pocketB, offset: pocketBOffset }),
  ], kernel.difference(onceCut, secondPocket));
};

/** Chamfered block with a low-segment cylindrical bore and stepped top. */
const boreAndStep = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(62, 72));
  const height = dimension(random.float(44, 54));
  const depth = dimension(random.float(44, 54));
  const c = dimension(random.float(7, 11));
  const profile: readonly Vec2[] = [
    [-width / 2, -height / 2], [width / 2 - c, -height / 2], [width / 2, -height / 2 + c],
    [width / 2, height / 2], [-width / 2 + c, height / 2], [-width / 2, height / 2 - c],
  ];
  const boreRadius = dimension(random.float(8, 11));
  const boreOffset: Vec3 = [dimension(random.float(-9, 9)), 0, dimension(random.float(-4, 6))];
  const step: Vec3 = [dimension(random.float(28, 36)), dimension(random.float(22, 30)), dimension(random.float(14, 19))];
  const stepOffset: Vec3 = [dimension(random.float(8, 15)), dimension(random.float(5, 11)), height / 2 + step[2] / 2 - 2];
  const notch: Vec3 = [dimension(random.float(10, 15)), depth + 8, dimension(random.float(11, 16))];
  const notchOffset: Vec3 = [-width / 2 + notch[0] / 2 - 1, 0, height / 2 - notch[2] / 2 + 1];

  using body = profilePrismY(kernel, profile, depth);
  using bore = translatedCylinder(kernel, depth + 12, boreRadius, boreOffset, [90, 0, 0], 12);
  using cutBore = kernel.difference(body, bore);
  using stepSolid = translatedCube(kernel, step, stepOffset);
  using joined = kernel.union([cutBore, stepSolid]);
  using notchSolid = translatedCube(kernel, notch, notchOffset);
  return result(context, "TFE13-bore-and-step", [
    operation("body", "extrude", "chamfered-body", [], { profile, depth }),
    operation("bore", "subtract", "through-bore", ["body"], { radius: boreRadius, axis: "y", offset: boreOffset }),
    operation("step", "union", "upper-step", ["body", "bore"], { size: step, offset: stepOffset }),
    operation("notch", "subtract", "top-edge-notch", ["body", "bore", "step"], { size: notch, offset: notchOffset }),
  ], kernel.difference(joined, notchSolid));
};

/** Gabled body with top channel, offset tower and rear shoulder. */
const roofChannelTower = (context: TemplateContext): GeneratedSolid => {
  const { kernel, random } = context;
  const width = dimension(random.float(64, 76));
  const wall = dimension(random.float(27, 34));
  const roof = dimension(random.float(14, 21));
  const depth = dimension(random.float(48, 58));
  const profile: readonly Vec2[] = [
    [-width / 2, -wall / 2], [width / 2, -wall / 2], [width / 2, wall / 2],
    [width * 0.12, wall / 2 + roof], [-width * 0.14, wall / 2 + roof * 0.86], [-width / 2, wall / 2],
  ];
  const channel: Vec3 = [dimension(random.float(12, 18)), dimension(random.float(34, 42)), dimension(random.float(12, 17))];
  const channelOffset: Vec3 = [dimension(random.float(-5, 5)), dimension(random.float(-2, 5)), wall / 2 + roof - channel[2] / 2 + 1];
  const tower: Vec3 = [dimension(random.float(16, 22)), dimension(random.float(18, 25)), dimension(random.float(26, 35))];
  const towerOffset: Vec3 = [dimension(random.float(18, 24)), -depth / 2 + tower[1] / 2 - 2, wall / 2 + tower[2] / 2 - 3];
  const shoulder: Vec3 = [dimension(random.float(27, 35)), dimension(random.float(16, 22)), dimension(random.float(12, 17))];
  const shoulderOffset: Vec3 = [dimension(random.float(-17, -9)), depth / 2 - shoulder[1] / 2 + 2, dimension(random.float(-3, 5))];

  using body = profilePrismY(kernel, profile, depth);
  using channelSolid = translatedCube(kernel, channel, channelOffset);
  using cut = kernel.difference(body, channelSolid);
  using towerSolid = translatedCube(kernel, tower, towerOffset);
  using shoulderSolid = translatedCube(kernel, shoulder, shoulderOffset);
  return result(context, "TFE14-roof-channel-tower", [
    operation("body", "extrude", "irregular-gabled-envelope", [], { profile, depth }),
    operation("channel", "subtract", "top-channel", ["body"], { size: channel, offset: channelOffset }),
    operation("tower", "union", "offset-tower", ["body", "channel"], { size: tower, offset: towerOffset }),
    operation("shoulder", "union", "rear-shoulder", ["body", "channel", "tower"], { size: shoulder, offset: shoulderOffset }),
  ], kernel.union([cut, towerSolid, shoulderSolid]));
};

const template = (
  id: string,
  instantiate: (context: TemplateContext) => GeneratedSolid,
): ObjectTemplate => ({ id, version: 2, allowedQuestionTypes: ["view-recognition"], instantiate });

/** Multi-feature models intended for medium-hard and hard TFE questions. */
export const TFE_ADVANCED_TEMPLATES: readonly ObjectTemplate[] = Object.freeze([
  template("TFE07-gabled-pocket-rib", gabledPocketRib),
  template("TFE08-chamfered-dual-recess", chamferedDualRecess),
  template("TFE09-stepped-undercut-bridge", steppedUndercutBridge),
  template("TFE10-asymmetric-saddle", asymmetricSaddle),
  template("TFE11-tapered-tower-slot", taperedTowerSlot),
  template("TFE12-crossed-ribs-dual-pocket", crossedRibsDualPocket),
  template("TFE13-bore-and-step", boreAndStep),
  template("TFE14-roof-channel-tower", roofChannelTower),
]);

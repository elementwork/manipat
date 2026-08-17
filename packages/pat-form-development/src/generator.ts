import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type RandomSource,
  type Vec2,
  type Vec3,
} from "@manipat/core";
import { buildFaceAdjacency } from "./adjacency.js";
import { createNet } from "./nets.js";
import { createHousePrism, createProfilePrism, createTrapezoidalPrism } from "./polyhedra.js";
import { renderFoldedChoice, renderNet } from "./render.js";
import type {
  FormDevelopmentChoice,
  FormDevelopmentQuestion,
  LogicalPolyhedron,
} from "./types.js";
import { validateFormDevelopmentQuestion } from "./validator.js";

const VIEW_TURNS: readonly (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];
const dimension = (value: number): number => Math.round(value * 1000) / 1000;

const createChamferedProfilePrism = (random: RandomSource): LogicalPolyhedron => {
  const width = dimension(random.fork("width").float(2.5, 3.2));
  const height = dimension(random.fork("height").float(1.8, 2.5));
  const depth = dimension(random.fork("depth").float(1.6, 2.5));
  const lowerLeft = dimension(random.fork("lower-left").float(0.18, 0.34));
  const lowerRight = dimension(random.fork("lower-right").float(0.16, 0.31));
  const upperRight = dimension(random.fork("upper-right").float(0.19, 0.36));
  const upperLeft = dimension(random.fork("upper-left").float(0.16, 0.33));
  const halfW = width / 2;
  const halfH = height / 2;
  const profile: readonly Vec2[] = [
    [-halfW + lowerLeft, -halfH],
    [halfW - lowerRight, -halfH],
    [halfW, -halfH + lowerRight],
    [halfW, halfH - upperRight],
    [halfW - upperRight, halfH],
    [-halfW + upperLeft, halfH],
    [-halfW, halfH - upperLeft],
    [-halfW, -halfH + lowerLeft],
  ];
  return createProfilePrism({ id: "profile-chamfered-octagon", profile, depth });
};

const createCrownProfilePrism = (random: RandomSource): LogicalPolyhedron => {
  const width = dimension(random.fork("width").float(2.45, 3.15));
  const height = dimension(random.fork("height").float(1.8, 2.45));
  const depth = dimension(random.fork("depth").float(1.55, 2.45));
  const halfW = width / 2;
  const halfH = height / 2;
  const shoulder = dimension(random.fork("shoulder").float(0.18, 0.32));
  const peakOffset = dimension(random.fork("peak-offset").float(-0.22, 0.22)) * width;
  const peakInset = dimension(random.fork("peak-inset").float(0.22, 0.34)) * width;
  const profile: readonly Vec2[] = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH - shoulder],
    [peakOffset + peakInset, halfH],
    [peakOffset - peakInset, halfH],
    [-halfW, halfH - shoulder * dimension(random.fork("left-shoulder").float(0.8, 1.25))],
  ];
  return createProfilePrism({ id: "profile-asymmetric-crown", profile, depth });
};

const createClippedRoofPrism = (random: RandomSource): LogicalPolyhedron => {
  const width = dimension(random.fork("width").float(2.4, 3.1));
  const height = dimension(random.fork("height").float(1.9, 2.55));
  const depth = dimension(random.fork("depth").float(1.6, 2.5));
  const halfW = width / 2;
  const halfH = height / 2;
  const lowerClip = dimension(random.fork("lower-clip").float(0.16, 0.28));
  const roofShoulder = dimension(random.fork("roof-shoulder").float(0.28, 0.42)) * width;
  const peakX = dimension(random.fork("peak-x").float(-0.18, 0.16)) * width;
  const profile: readonly Vec2[] = [
    [-halfW + lowerClip, -halfH],
    [halfW - lowerClip * 0.8, -halfH],
    [halfW, -halfH + lowerClip * 0.8],
    [halfW, halfH * 0.28],
    [peakX + roofShoulder, halfH * 0.28],
    [peakX, halfH],
    [peakX - roofShoulder * 0.82, halfH * 0.28],
    [-halfW, halfH * 0.1],
  ];
  return createProfilePrism({ id: "profile-clipped-roof", profile, depth });
};

const createFoundationPolyhedron = (random: RandomSource): LogicalPolyhedron => {
  const family = random.fork("foundation-family").pick(["trapezoid", "house"] as const);
  if (family === "trapezoid") {
    const bottomWidth = dimension(random.fork("bottom-width").float(2.4, 3.2));
    const topWidth = dimension(random.fork("top-width").float(1.15, bottomWidth - 0.55));
    return createTrapezoidalPrism({
      bottomWidth,
      topWidth,
      height: dimension(random.fork("height").float(1.45, 2.35)),
      depth: dimension(random.fork("depth").float(1.55, 2.55)),
    });
  }
  return createHousePrism({
    width: dimension(random.fork("width").float(2, 2.9)),
    depth: dimension(random.fork("depth").float(1.55, 2.55)),
    wallHeight: dimension(random.fork("wall-height").float(0.95, 1.65)),
    roofHeight: dimension(random.fork("roof-height").float(0.7, 1.35)),
  });
};

const createQuestionPolyhedron = (
  random: RandomSource,
  difficulty: 1 | 2 | 3 | 4 | 5,
): LogicalPolyhedron => {
  const complexFactories = [createCrownProfilePrism, createChamferedProfilePrism, createClippedRoofPrism] as const;
  switch (difficulty) {
    case 1:
      return createFoundationPolyhedron(random.fork("foundation"));
    case 2:
      return random.fork("tier").chance(0.35)
        ? random.fork("complex-choice").pick(complexFactories)(random.fork("complex"))
        : createFoundationPolyhedron(random.fork("foundation"));
    case 3:
      return random.fork("tier").chance(0.75)
        ? random.fork("complex-choice").pick(complexFactories)(random.fork("complex"))
        : createFoundationPolyhedron(random.fork("foundation"));
    case 4:
    case 5:
      return random.fork("complex-choice").pick(complexFactories)(random.fork("complex"));
    default:
      return difficulty satisfies never;
  }
};

const centerOf = (vertices: readonly Vec3[]): Vec3 => [
  vertices.reduce((sum, [x]) => sum + x, 0) / vertices.length,
  vertices.reduce((sum, [, y]) => sum + y, 0) / vertices.length,
  vertices.reduce((sum, [, , z]) => sum + z, 0) / vertices.length,
];

const choiceFingerprint = (
  polyhedronId: LogicalPolyhedron["id"],
  vertices: readonly Vec3[],
): string => fingerprint64(canonicalStringify({ polyhedronId, vertices } as unknown as JsonValue));

const scaleAxis = (
  vertices: readonly Vec3[],
  axis: 0 | 1 | 2,
  factor: number,
): readonly Vec3[] => {
  const center = centerOf(vertices);
  return vertices.map((vertex): Vec3 => {
    const result: [number, number, number] = [vertex[0], vertex[1], vertex[2]];
    result[axis] = center[axis] + (vertex[axis] - center[axis]) * factor;
    return result;
  });
};

const taperUpper = (vertices: readonly Vec3[], amount: number): readonly Vec3[] => {
  const center = centerOf(vertices);
  const minZ = Math.min(...vertices.map(([, , z]) => z));
  const maxZ = Math.max(...vertices.map(([, , z]) => z));
  const span = Math.max(1e-9, maxZ - minZ);
  return vertices.map(([x, y, z]): Vec3 => {
    const heightRatio = (z - minZ) / span;
    const factor = 1 - amount * heightRatio;
    return [center[0] + (x - center[0]) * factor, y, z];
  });
};

const leanUpper = (vertices: readonly Vec3[], amount: number): readonly Vec3[] => {
  const minZ = Math.min(...vertices.map(([, , z]) => z));
  const maxZ = Math.max(...vertices.map(([, , z]) => z));
  const span = Math.max(1e-9, maxZ - minZ);
  const width = Math.max(...vertices.map(([x]) => x)) - Math.min(...vertices.map(([x]) => x));
  return vertices.map(([x, y, z]): Vec3 => [
    x + ((z - minZ) / span) * width * amount,
    y,
    z,
  ]);
};

const deformations = (
  vertices: readonly Vec3[],
  difficulty: 1 | 2 | 3 | 4 | 5,
): readonly { readonly vertices: readonly Vec3[]; readonly mutation: string }[] => {
  const amount = ({ 1: 0.30, 2: 0.27, 3: 0.23, 4: 0.19, 5: 0.16 } as const)[difficulty];
  return [
    { vertices: scaleAxis(vertices, 2, 1 - amount), mutation: "wrong-height" },
    { vertices: scaleAxis(vertices, 0, 1 - amount), mutation: "wrong-width" },
    { vertices: taperUpper(vertices, amount), mutation: "wrong-taper" },
    { vertices: leanUpper(vertices, amount * 0.75), mutation: "wrong-slant" },
    { vertices: scaleAxis(vertices, 1, 1 - amount), mutation: "wrong-depth" },
  ];
};

export const generateFormDevelopmentQuestion = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): FormDevelopmentQuestion => {
  const random = createRandomSource(seed);
  const polyhedron = createQuestionPolyhedron(random.fork("polyhedron"), difficulty);
  const net = createNet(polyhedron);
  const patterns = {};
  const targetFingerprint = choiceFingerprint(polyhedron.id, polyhedron.vertices);

  const wrong = random.fork("geometry-distractors")
    .shuffle(deformations(polyhedron.vertices, difficulty))
    .filter(({ vertices }) => choiceFingerprint(polyhedron.id, vertices) !== targetFingerprint)
    .slice(0, 3);
  if (wrong.length < 3) throw new Error("Could not create three geometric form-development distractors");

  const raw = [
    { vertices: polyhedron.vertices },
    ...wrong,
  ];
  const shuffled = random.fork("choice-order").shuffle(raw);
  const viewTurns = random.fork("choice-view-turns").shuffle(VIEW_TURNS);
  const choices: FormDevelopmentChoice[] = shuffled.map((candidate, index) => {
    const fingerprint = choiceFingerprint(polyhedron.id, candidate.vertices);
    const partial = {
      polyhedronId: polyhedron.id,
      vertices: candidate.vertices,
      viewQuarterTurns: viewTurns[index] ?? 0,
      patterns,
      chirality: "original" as const,
      fingerprint,
      ...("mutation" in candidate ? { mutation: candidate.mutation } : {}),
    };
    return {
      ...partial,
      svg: renderFoldedChoice(polyhedron, partial, `Form development choice ${String.fromCharCode(65 + index)}`),
    };
  });
  const correctChoiceIndex = choices.findIndex(({ fingerprint }) => fingerprint === targetFingerprint);
  const questionFingerprint = fingerprint64(canonicalStringify({
    net,
    vertices: polyhedron.vertices,
  } as unknown as JsonValue));
  const complexModel = polyhedron.id.startsWith("profile-");
  const base: FormDevelopmentQuestion = {
    id: `form-development-${questionFingerprint}`,
    engineVersion: "0.1.0",
    type: "form-development",
    seed,
    templateId: `${polyhedron.id}-geometry-v3`,
    templateVersion: 3,
    prompt: { polyhedron, net, svg: renderNet(net, patterns), targetFingerprint },
    choices,
    correctChoiceIndex,
    explanation: {
      type: "form-development",
      adjacency: buildFaceAdjacency(polyhedron),
      markedFaces: [],
      chirality: "original",
    },
    difficulty: {
      raw: difficulty * 10 + polyhedron.faces.length * 2,
      normalized: Math.min(1, (difficulty * 10 + polyhedron.faces.length * 2) / 75),
      band: difficulty,
      components: {
        faceCount: polyhedron.faces.length,
        profileEdgeCount: polyhedron.vertices.length / 2,
        markedFaceCount: 0,
        geometryChoiceModel: 3,
      },
    },
    validation: { passed: false, checks: [] },
    fingerprints: { net: questionFingerprint, target: targetFingerprint },
    metadata: {
      polyhedronId: polyhedron.id,
      choiceModel: "dimensional-geometry-v3",
      geometryVariation: "continuous-parameters",
      modelTier: complexModel ? "golden-complex-v3" : "foundation-v2",
      faceCount: polyhedron.faces.length,
      variedChoiceOrientations: true,
    },
  };
  const validation = validateFormDevelopmentQuestion(base);
  if (!validation.passed) throw new Error(`Form development validation failed: ${validation.checks.filter(({ passed }) => !passed).map(({ id }) => id).join(", ")}`);
  return { ...base, validation: { passed: true, checks: validation.checks } };
};

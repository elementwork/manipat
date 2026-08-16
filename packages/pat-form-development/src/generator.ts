import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
} from "@manipat/core";
import { buildFaceAdjacency } from "./adjacency.js";
import { createNet } from "./nets.js";
import { POLYHEDRA } from "./polyhedra.js";
import { renderFoldedChoice, renderNet } from "./render.js";
import type {
  FacePattern,
  FormDevelopmentChoice,
  FormDevelopmentQuestion,
  LogicalPolyhedron,
} from "./types.js";
import { validateFormDevelopmentQuestion } from "./validator.js";

const choiceFingerprint = (
  polyhedronId: LogicalPolyhedron["id"],
  patterns: Readonly<Record<string, FacePattern>>,
  chirality: "original" | "mirrored",
): string => fingerprint64(canonicalStringify({ chirality, patterns, polyhedronId } as unknown as JsonValue));

export const generateFormDevelopmentQuestion = (
  seed: string,
  difficulty: 1 | 2 | 3 | 4 | 5 = 3,
): FormDevelopmentQuestion => {
  const random = createRandomSource(seed);
  const polyhedron = random.fork("polyhedron").pick(POLYHEDRA);
  const net = createNet(polyhedron);
  const markedFaces = random.fork("marked-faces").shuffle(polyhedron.faces).slice(0, difficulty >= 3 ? 2 : 1);
  const patterns: Record<string, FacePattern> = Object.fromEntries(markedFaces.map((face, index) => [
    face.id,
    {
      kind: (["dot", "stripe", "triangle"] as const)[index % 3] ?? "dot",
      rotationQuarterTurns: random.fork(`pattern-${face.id}`).int(0, 3) as 0 | 1 | 2 | 3,
    },
  ]));
  const targetFingerprint = choiceFingerprint(polyhedron.id, patterns, "original");
  const firstMarked = markedFaces[0]?.id ?? polyhedron.faces[0]?.id ?? "";
  const rotatedPatterns = {
    ...patterns,
    [firstMarked]: {
      ...(patterns[firstMarked] ?? { kind: "dot" as const, rotationQuarterTurns: 0 as const }),
      rotationQuarterTurns: (((patterns[firstMarked]?.rotationQuarterTurns ?? 0) + 1) % 4) as 0 | 1 | 2 | 3,
    },
  };
  const ids = Object.keys(patterns);
  const swappedPatterns = { ...patterns };
  if (ids.length >= 2) {
    const first = ids[0]!;
    const second = ids[1]!;
    [swappedPatterns[first], swappedPatterns[second]] = [swappedPatterns[second]!, swappedPatterns[first]!];
  } else {
    const alternative = polyhedron.faces.find(({ id }) => id !== firstMarked)?.id ?? firstMarked;
    delete swappedPatterns[firstMarked];
    swappedPatterns[alternative] = patterns[firstMarked]!;
  }
  const raw = [
    { patterns, chirality: "original" as const },
    { patterns: rotatedPatterns, chirality: "original" as const, mutation: "rotated-marking" },
    { patterns: swappedPatterns, chirality: "original" as const, mutation: "wrong-face-placement" },
    { patterns, chirality: "mirrored" as const, mutation: "mirror-chirality" },
  ];
  const shuffled = random.fork("choice-order").shuffle(raw);
  const choices: FormDevelopmentChoice[] = shuffled.map((candidate, index) => {
    const fingerprint = choiceFingerprint(polyhedron.id, candidate.patterns, candidate.chirality);
    const partial = {
      polyhedronId: polyhedron.id,
      patterns: candidate.patterns,
      chirality: candidate.chirality,
      fingerprint,
      ...(candidate.mutation === undefined ? {} : { mutation: candidate.mutation }),
    };
    return {
      ...partial,
      svg: renderFoldedChoice(polyhedron, partial, `Form development choice ${String.fromCharCode(65 + index)}`),
    };
  });
  const correctChoiceIndex = choices.findIndex(({ fingerprint }) => fingerprint === targetFingerprint);
  const questionFingerprint = fingerprint64(canonicalStringify({ net, patterns } as unknown as JsonValue));
  const base: FormDevelopmentQuestion = {
    id: `form-development-${questionFingerprint}`,
    engineVersion: "0.1.0",
    type: "form-development",
    seed,
    templateId: `${polyhedron.id}-net-v1`,
    templateVersion: 1,
    prompt: { polyhedron, net, svg: renderNet(net, patterns), targetFingerprint },
    choices,
    correctChoiceIndex,
    explanation: {
      type: "form-development",
      adjacency: buildFaceAdjacency(polyhedron),
      markedFaces: Object.keys(patterns),
      chirality: "original",
    },
    difficulty: {
      raw: difficulty * 10 + polyhedron.faces.length + Object.keys(patterns).length * 3,
      normalized: Math.min(1, (difficulty * 10 + polyhedron.faces.length + Object.keys(patterns).length * 3) / 65),
      band: difficulty,
      components: { faceCount: polyhedron.faces.length, markedFaceCount: Object.keys(patterns).length },
    },
    validation: { passed: false, checks: [] },
    fingerprints: { net: questionFingerprint, target: targetFingerprint },
    metadata: { polyhedronId: polyhedron.id },
  };
  const validation = validateFormDevelopmentQuestion(base);
  if (!validation.passed) throw new Error(`Form development validation failed: ${validation.checks.filter(({ passed }) => !passed).map(({ id }) => id).join(", ")}`);
  return { ...base, validation: { passed: true, checks: validation.checks } };
};

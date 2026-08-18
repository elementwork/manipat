import path from "node:path";
import {
  canonicalStringify,
  type JsonValue,
  type PatQuestionType,
  type Vec2,
  type Vec3,
} from "@manipat/core";
import {
  applyFold,
  createInitialFoldState,
  punchState,
  readPersistedQuestions,
  reconstructApertureMesh,
  reconstructTfeMesh,
  type AnyPatQuestion,
} from "@manipat/question-bank";
import {
  indexedFacesToCanonicalMesh,
  serializeCanonicalMesh,
  type RuntimeViewPreset,
  type RuntimeVisualizationPayload,
} from "@manipat/renderer-three";
import type {
  PaperGuidePayload,
  PaperGuideStepPayload,
  ViewerPayload,
} from "./viewer-payload.js";
import { startViewerServer } from "./viewer-server.js";

const VISUALIZABLE_CATEGORIES = [
  "aperture",
  "view-recognition",
  "paper-folding",
  "cube-counting",
  "form-development",
] as const satisfies readonly PatQuestionType[];

type VisualizableCategory = typeof VISUALIZABLE_CATEGORIES[number];
type PaperQuestion = Extract<AnyPatQuestion, { readonly type: "paper-folding" }>;
type FoldState = ReturnType<typeof createInitialFoldState>;

export interface VisualizeCommandOptions {
  readonly target: string;
  readonly questionId?: string;
  readonly category?: string;
  readonly host?: string;
  readonly port?: string;
  readonly dryRun?: boolean;
}

const isVisualizableCategory = (type: PatQuestionType): type is VisualizableCategory =>
  (VISUALIZABLE_CATEGORIES as readonly PatQuestionType[]).includes(type);

const categoryFromText = (value: string): VisualizableCategory => {
  const aliases: Readonly<Record<string, VisualizableCategory>> = {
    aperture: "aperture",
    keyhole: "aperture",
    "view-recognition": "view-recognition",
    tfe: "view-recognition",
    "paper-folding": "paper-folding",
    paper: "paper-folding",
    "hole-punching": "paper-folding",
    "hole-punch": "paper-folding",
    "cube-counting": "cube-counting",
    cubes: "cube-counting",
    "form-development": "form-development",
    form: "form-development",
  };
  const resolved = aliases[value];
  if (resolved === undefined) {
    throw new RangeError(`Interactive visualization supports: ${VISUALIZABLE_CATEGORIES.join(", ")}`);
  }
  return resolved;
};

const tfePreset = (view: "front" | "top" | "end"): RuntimeViewPreset =>
  view === "end" ? "right-end" : view;

const cubeKey = ([x, y, z]: Vec3): string => `${x},${y},${z}`;
const pointKey = ([x, y]: Vec2): string => `${x.toFixed(6)},${y.toFixed(6)}`;

const sortPoints = (points: readonly Vec2[]): readonly Vec2[] =>
  [...points].sort((first, second) => first[1] - second[1] || first[0] - second[0]);

const uniquePoints = (points: readonly Vec2[]): readonly Vec2[] =>
  sortPoints([...new Map(points.map((point) => [pointKey(point), point])).values()]);

const pointDifference = (first: readonly Vec2[], second: readonly Vec2[]): readonly Vec2[] => {
  const secondKeys = new Set(second.map(pointKey));
  return first.filter((point) => !secondKeys.has(pointKey(point)));
};

const layerCenterMap = (state: FoldState): ReadonlyMap<string, Vec2> =>
  new Map(state.layers.map(({ sourceLayerId, currentCenter }) => [sourceLayerId, currentCenter]));

const holesForState = (
  state: FoldState,
  punchedSourceLayerIds: ReadonlySet<string>,
): readonly Vec2[] => uniquePoints(state.layers.flatMap(({ sourceLayerId, currentCenter }) =>
  punchedSourceLayerIds.has(sourceLayerId) ? [currentCenter] : []));

const movedPunchedLayerCount = (
  before: FoldState,
  after: FoldState,
  punchedSourceLayerIds: ReadonlySet<string>,
): number => {
  const beforeCenters = layerCenterMap(before);
  const afterCenters = layerCenterMap(after);
  let moved = 0;
  for (const sourceLayerId of punchedSourceLayerIds) {
    const first = beforeCenters.get(sourceLayerId);
    const second = afterCenters.get(sourceLayerId);
    if (first === undefined || second === undefined) continue;
    if (pointKey(first) !== pointKey(second)) moved += 1;
  }
  return moved;
};

const buildPaperGuidePayload = (question: PaperQuestion): PaperGuidePayload => {
  const states: FoldState[] = [];
  let state = createInitialFoldState();
  states.push(state);
  for (const fold of question.prompt.folds) {
    state = applyFold(state, fold);
    states.push(state);
  }

  const foldedState = states[question.prompt.folds.length];
  if (foldedState === undefined) throw new Error("Paper fold state sequence is incomplete");
  const punchedState = punchState(foldedState, question.prompt.punches);
  const punchedSourceLayerIds = new Set<string>(
    punchedState.punches.flatMap(({ sourceLayerIds }) => sourceLayerIds),
  );
  const foldedHoles = holesForState(foldedState, punchedSourceLayerIds);
  const punchFrame = question.prompt.stepSvgs[question.prompt.folds.length]
    ?? question.prompt.stepSvgs[question.prompt.stepSvgs.length - 1]
    ?? null;

  const steps: PaperGuideStepPayload[] = [{
    kind: "punch",
    title: "Punch through the folded stack",
    completedFoldCount: question.prompt.folds.length,
    baseSvg: punchFrame,
    holes: foldedHoles,
    newHoles: foldedHoles,
    departedHoles: [],
    affectedLayerCount: punchedSourceLayerIds.size,
  }];

  for (let foldIndex = question.prompt.folds.length - 1; foldIndex >= 0; foldIndex -= 1) {
    const fold = question.prompt.folds[foldIndex];
    const beforeState = states[foldIndex + 1];
    const afterState = states[foldIndex];
    if (fold === undefined || beforeState === undefined || afterState === undefined) {
      throw new Error("Paper unfold state sequence is incomplete");
    }
    const beforeHoles = holesForState(beforeState, punchedSourceLayerIds);
    const afterHoles = holesForState(afterState, punchedSourceLayerIds);
    const completedFoldCount = foldIndex;
    const baseSvg = completedFoldCount === 0
      ? null
      : question.prompt.stepSvgs[completedFoldCount - 1] ?? null;
    steps.push({
      kind: "unfold",
      title: `Unfold ${fold.id}`,
      completedFoldCount,
      baseSvg,
      holes: afterHoles,
      newHoles: pointDifference(afterHoles, beforeHoles),
      departedHoles: pointDifference(beforeHoles, afterHoles),
      affectedLayerCount: movedPunchedLayerCount(beforeState, afterState, punchedSourceLayerIds),
      foldLine: {
        point: fold.line.point,
        unitDirection: fold.line.unitDirection,
      },
    });
  }

  const correctChoice = question.choices[question.correctChoiceIndex];
  if (correctChoice === undefined) throw new Error("Paper question correct choice is missing");
  return {
    kind: "paper-guide",
    questionId: question.id,
    category: question.type,
    title: "Paper Punching — guided unfolding",
    questionSvgs: question.prompt.stepSvgs,
    correctSvg: correctChoice.svg,
    punches: punchedState.punches.map(({ point, sourceLayerIds }) => ({
      point,
      layerCount: sourceLayerIds.length,
    })),
    steps,
  };
};

export const buildVisualizationPayload = async (
  question: AnyPatQuestion,
): Promise<ViewerPayload> => {
  switch (question.type) {
    case "aperture": {
      const mesh = await reconstructApertureMesh(question);
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "Aperture / Keyhole interactive object",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        targetPreset: "top",
        targetRotationDegrees: question.prompt.orientationDegrees,
        mesh: serializeCanonicalMesh(mesh),
      };
    }
    case "view-recognition": {
      const mesh = await reconstructTfeMesh(question);
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "TFE interactive source object",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        targetPreset: tfePreset(question.prompt.missingView),
        mesh: serializeCanonicalMesh(mesh),
      };
    }
    case "paper-folding":
      return buildPaperGuidePayload(question);
    case "cube-counting": {
      const positions: Vec3[] = question.prompt.figure.cubes.map(({ x, y, z }) => [x, y, z]);
      const matching = new Set(
        question.explanation.matchingCubes.map(({ x, y, z }) => cubeKey([x, y, z])),
      );
      const highlightIndices = positions.flatMap((position, index) =>
        matching.has(cubeKey(position)) ? [index] : []);
      return {
        kind: "voxels",
        questionId: question.id,
        category: question.type,
        title: `Cube Counting — ${question.prompt.targetPaintedFaces} painted faces`,
        cameraPresets: ["isometric", "front", "top", "right-end"],
        positions,
        highlightIndices,
      };
    }
    case "form-development": {
      const mesh = indexedFacesToCanonicalMesh(
        question.prompt.polyhedron.vertices,
        question.prompt.polyhedron.faces,
      );
      return {
        kind: "mesh",
        questionId: question.id,
        category: question.type,
        title: "Form Development — folded solid explanation",
        cameraPresets: ["isometric", "front", "top", "right-end"],
        mesh: serializeCanonicalMesh(mesh),
        highlightFeatureIds: question.explanation.markedFaces,
      };
    }
    case "angle":
      throw new RangeError("angle is a 2D PAT category; use its canonical SVG");
    default:
      return question satisfies never;
  }
};

const runtimePayloadSummary = (payload: RuntimeVisualizationPayload): JsonValue => payload.kind === "mesh"
  ? {
      questionId: payload.questionId,
      category: payload.category,
      kind: payload.kind,
      vertexCount: payload.mesh.vertexCount,
      triangleCount: payload.mesh.triangleCount,
      groupCount: payload.mesh.groups?.length ?? 0,
      targetView: payload.targetPreset ?? null,
    }
  : {
      questionId: payload.questionId,
      category: payload.category,
      kind: payload.kind,
      voxelCount: payload.positions.length,
      highlightCount: payload.highlightIndices?.length ?? 0,
      targetView: payload.targetPreset ?? null,
    };

const payloadSummary = (payload: ViewerPayload): JsonValue => {
  if (payload.kind !== "paper-guide") return runtimePayloadSummary(payload);
  const finalStep = payload.steps[payload.steps.length - 1];
  return {
    questionId: payload.questionId,
    category: payload.category,
    kind: payload.kind,
    stepCount: payload.steps.length,
    punchCount: payload.punches.length,
    finalHoleCount: finalStep?.holes.length ?? 0,
  };
};

const selectQuestions = (
  questions: readonly AnyPatQuestion[],
  questionId: string | undefined,
  categoryText: string | undefined,
): readonly AnyPatQuestion[] => {
  if (questionId !== undefined) {
    const question = questions.find(({ id }) => id === questionId);
    if (question === undefined) throw new RangeError(`Question id not found: ${questionId}`);
    if (!isVisualizableCategory(question.type)) {
      throw new RangeError(`${question.type} is not supported by the interactive viewer`);
    }
    return [question];
  }

  const requestedCategory = categoryText === undefined ? undefined : categoryFromText(categoryText);
  const selected = questions.filter((candidate) =>
    isVisualizableCategory(candidate.type)
      && (requestedCategory === undefined || candidate.type === requestedCategory));
  if (selected.length === 0) {
    throw new RangeError(
      requestedCategory === undefined
        ? "Input contains no question available for interactive visualization"
        : `Input contains no ${requestedCategory} question available for interactive visualization`,
    );
  }
  return selected;
};

const buildPayloads = async (
  questions: readonly AnyPatQuestion[],
): Promise<readonly ViewerPayload[]> => {
  const payloads: ViewerPayload[] = [];
  // Reconstruct sequentially. Aperture/TFE use WASM-backed geometry kernels;
  // keeping this deterministic and low-memory is more useful for a local
  // inspector than maximizing startup parallelism.
  for (const question of questions) payloads.push(await buildVisualizationPayload(question));
  return payloads;
};

export const visualizeCommand = async (options: VisualizeCommandOptions): Promise<void> => {
  const questions = await readPersistedQuestions(path.resolve(options.target));
  const selected = selectQuestions(questions, options.questionId, options.category);
  const payloads = await buildPayloads(selected);
  if (options.dryRun === true) {
    process.stdout.write(`${canonicalStringify({
      questionCount: payloads.length,
      questions: payloads.map(payloadSummary),
    })}\n`);
    return;
  }
  const host = options.host ?? "127.0.0.1";
  const port = Number(options.port ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("--port must be an integer from 1 to 65535");
  }
  await startViewerServer(payloads, host, port);
};

export const visualizableCategories = (): readonly VisualizableCategory[] =>
  VISUALIZABLE_CATEGORIES;

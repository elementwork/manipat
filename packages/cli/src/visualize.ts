import path from "node:path";
import {
  canonicalStringify,
  type JsonValue,
  type PatQuestionType,
  type Vec3,
} from "@manipat/core";
import {
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
import { startViewerServer } from "./viewer-server.js";

const VISUALIZABLE_CATEGORIES = [
  "aperture",
  "view-recognition",
  "cube-counting",
  "form-development",
] as const satisfies readonly PatQuestionType[];

type VisualizableCategory = typeof VISUALIZABLE_CATEGORIES[number];

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
    "cube-counting": "cube-counting",
    cubes: "cube-counting",
    "form-development": "form-development",
    form: "form-development",
  };
  const resolved = aliases[value];
  if (resolved === undefined) {
    throw new RangeError(`Three.js visualization supports: ${VISUALIZABLE_CATEGORIES.join(", ")}`);
  }
  return resolved;
};

const tfePreset = (view: "front" | "top" | "end"): RuntimeViewPreset =>
  view === "end" ? "right-end" : view;

const cubeKey = ([x, y, z]: Vec3): string => `${x},${y},${z}`;

export const buildVisualizationPayload = async (
  question: AnyPatQuestion,
): Promise<RuntimeVisualizationPayload> => {
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
    case "paper-folding":
      throw new RangeError(
        `${question.type} is a 2D PAT category; use its canonical SVG rather than Three.js`,
      );
    default:
      return question satisfies never;
  }
};

const payloadSummary = (payload: RuntimeVisualizationPayload): JsonValue => payload.kind === "mesh"
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

const selectQuestions = (
  questions: readonly AnyPatQuestion[],
  questionId: string | undefined,
  categoryText: string | undefined,
): readonly AnyPatQuestion[] => {
  if (questionId !== undefined) {
    const question = questions.find(({ id }) => id === questionId);
    if (question === undefined) throw new RangeError(`Question id not found: ${questionId}`);
    if (!isVisualizableCategory(question.type)) {
      throw new RangeError(`${question.type} is not a Three.js 3D category`);
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
        ? "Input contains no 3D question available for visualization"
        : `Input contains no ${requestedCategory} question available for visualization`,
    );
  }
  return selected;
};

const buildPayloads = async (
  questions: readonly AnyPatQuestion[],
): Promise<readonly RuntimeVisualizationPayload[]> => {
  const payloads: RuntimeVisualizationPayload[] = [];
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

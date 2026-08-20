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
  buildPaperVisualFoldTransitions,
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

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const svgInner = (svg: string): string => {
  const opening = svg.indexOf(">");
  const closing = svg.lastIndexOf("</svg>");
  return opening >= 0 && closing > opening ? svg.slice(opening + 1, closing) : svg;
};

const blankPaperInner = (): string => {
  const grid = Array.from({ length: 3 }, (_, offset) => offset + 1).flatMap((index) => [
    `<line x1="${index}" y1="0" x2="${index}" y2="4" stroke="#d5d9de" stroke-width="0.035"/>`,
    `<line x1="0" y1="${index}" x2="4" y2="${index}" stroke="#d5d9de" stroke-width="0.035"/>`,
  ]).join("");
  return `<rect x="0" y="0" width="4" height="4" fill="white" stroke="black" stroke-width="0.08"/>${grid}`;
};

const overviewCircle = (point: Vec2, fill: string, stroke: string, extra = ""): string =>
  `<circle cx="${point[0].toFixed(4)}" cy="${point[1].toFixed(4)}" r="0.17" fill="${fill}" stroke="${stroke}" stroke-width="0.055" ${extra}/>`;

const paperStepInner = (step: PaperGuideStepPayload): string => {
  let body = step.baseSvg === null ? blankPaperInner() : svgInner(step.baseSvg);
  if (step.foldLine !== undefined) {
    const { point, unitDirection } = step.foldLine;
    const scale = 8;
    body += `<line x1="${point[0] - unitDirection[0] * scale}" y1="${point[1] - unitDirection[1] * scale}" x2="${point[0] + unitDirection[0] * scale}" y2="${point[1] + unitDirection[1] * scale}" stroke="#537fa6" stroke-width="0.055" stroke-dasharray="0.18 0.12"/>`;
  }
  for (const point of step.departedHoles) {
    body += overviewCircle(point, "none", "#8a929b", 'stroke-dasharray="0.09 0.07"');
  }
  const newKeys = new Set(step.newHoles.map(pointKey));
  for (const point of step.holes) {
    const isNew = newKeys.has(pointKey(point));
    body += overviewCircle(point, isNew ? "#c85f4b" : "#20242a", isNew ? "#9f4536" : "#20242a");
  }
  return body;
};

const renderPaperOverviewSvg = (
  questionSvgs: readonly string[],
  steps: readonly PaperGuideStepPayload[],
): string => {
  const panelSize = 110;
  const stride = 148;
  const margin = 24;
  const rowOneY = 38;
  const rowTwoY = 206;
  const columns = Math.max(questionSvgs.length, steps.length, 1);
  const width = margin * 2 + (columns - 1) * stride + panelSize;
  const height = 350;
  const row = (
    panels: readonly { readonly inner: string; readonly label: string }[],
    y: number,
  ): string => panels.map(({ inner, label }, index) => {
    const x = margin + index * stride;
    const arrow = index === panels.length - 1
      ? ""
      : `<text x="${x + panelSize + 12}" y="${y + panelSize / 2 + 5}" font-size="18" fill="#7a838d">→</text>`;
    return `<text x="${x + panelSize / 2}" y="${y - 10}" text-anchor="middle" font-size="12" font-family="system-ui,sans-serif" fill="#3f4750">${escapeXml(label)}</text><svg x="${x}" y="${y}" width="${panelSize}" height="${panelSize}" viewBox="-0.2 -0.2 4.4 4.4">${inner}</svg>${arrow}`;
  }).join("");
  const forward = questionSvgs.map((svg, index) => ({
    inner: svgInner(svg),
    label: index === 0 ? "Original" : index === questionSvgs.length - 1 ? "Punch" : `Fold ${index}`,
  }));
  const reverse = steps.map((step, index) => ({
    inner: paperStepInner(step),
    label: index === 0 ? "Punch stack" : step.completedFoldCount === 0 ? "Solved" : `Unfold ${index}`,
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Paper punching forward folds and reverse-unfold explanation"><rect width="100%" height="100%" fill="#ffffff"/><text x="${margin}" y="20" font-size="13" font-weight="650" font-family="system-ui,sans-serif" fill="#20242a">Forward: fold and punch</text>${row(forward, rowOneY)}<line x1="${margin}" y1="180" x2="${width - margin}" y2="180" stroke="#e3e6ea"/><text x="${margin}" y="198" font-size="13" font-weight="650" font-family="system-ui,sans-serif" fill="#20242a">Reverse: unfold to the answer</text>${row(reverse, rowTwoY)}</svg>`;
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
      ? question.prompt.originalSvg
      : question.prompt.stepSvgs[completedFoldCount - 1] ?? question.prompt.originalSvg;
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
  const foldAnimations = buildPaperVisualFoldTransitions(question.prompt.folds);
  const questionSvgs = [question.prompt.originalSvg, ...question.prompt.stepSvgs];
  return {
    kind: "paper-guide",
    questionId: question.id,
    category: question.type,
    title: "Paper Punching — guided unfolding",
    overviewSvg: renderPaperOverviewSvg(questionSvgs, steps),
    questionSvgs,
    correctSvg: correctChoice.svg,
    punches: punchedState.punches.map(({ point, sourceLayerIds }) => ({
      point,
      layerCount: sourceLayerIds.length,
    })),
    steps,
    foldAnimations,
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
    animationCount: payload.foldAnimations.length,
    hasOverview: payload.overviewSvg.startsWith("<svg"),
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

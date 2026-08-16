import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
  type Vec2,
  type Vec3,
} from "@manipat/core";
import {
  canonicalizeSilhouette,
  createOrthographicView,
  createManifoldKernel,
  normalizeSolid,
  signedPolygonArea,
  silhouetteFingerprint,
  validateGeometryQuality,
  type CanonicalSection2D,
  type GeometryKernel,
  type ProjectionFrame,
} from "@manipat/geometry";
import { APERTURE_TEMPLATES } from "@manipat/object-generator";
import { generateApertureDistractors } from "./distractors.js";
import {
  renderApertureChoice,
  renderAperturePictorial,
  sharedApertureViewBox,
} from "./render.js";
import type {
  ApertureChoice,
  ApertureExplanation,
  ApertureQuestion,
} from "./types.js";
import { validateApertureQuestion } from "./validator.js";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const ISOMETRIC_FRAME: ProjectionFrame = {
  viewDirection: [-1 / Math.sqrt(3), -1 / Math.sqrt(3), -1 / Math.sqrt(3)],
  imageRight: [1 / Math.sqrt(2), -1 / Math.sqrt(2), 0],
  imageUp: [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)],
};

const concavityCount = (polygon: readonly Vec2[]): number => polygon.reduce(
  (count, point, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length];
    const next = polygon[(index + 1) % polygon.length];
    if (previous === undefined || next === undefined) return count;
    const cross = (point[0] - previous[0]) * (next[1] - point[1])
      - (point[1] - previous[1]) * (next[0] - point[0]);
    return count + (cross < 0 ? 1 : 0);
  },
  0,
);

const orientationFor = (seed: string, difficulty: 1 | 2 | 3 | 4 | 5): Vec3 => {
  const random = createRandomSource(seed).fork("orientation");
  const maximumTilt = 12 + difficulty * 10;
  return [
    Math.round(random.float(8, maximumTilt) * 1000) / 1000,
    Math.round(random.float(8, maximumTilt) * 1000) / 1000,
    Math.round(random.float(-25, 25) * 1000) / 1000,
  ];
};

const difficultyFor = (
  silhouette: CanonicalSection2D,
  requestedBand: 1 | 2 | 3 | 4 | 5,
): ApertureQuestion["difficulty"] => {
  const polygon = silhouette.polygons[0] ?? [];
  const concavities = concavityCount(polygon);
  const vertexCount = polygon.length;
  const raw = requestedBand * 10 + concavities * 2 + Math.min(vertexCount, 30) / 10;
  return {
    raw,
    normalized: clamp(raw / 60, 0, 1),
    band: requestedBand,
    components: {
      requestedBand,
      concavityCount: concavities,
      vertexCount,
    },
  };
};

export class ApertureGenerator {
  readonly #kernel: GeometryKernel;

  public constructor(kernel: GeometryKernel) {
    this.#kernel = kernel;
  }

  public generate(
    seed: string,
    difficulty: 1 | 2 | 3 | 4 | 5 = 3,
  ): ApertureQuestion {
    const rootRandom = createRandomSource(seed);
    const objectTemplate = rootRandom.fork("template").pick(APERTURE_TEMPLATES);
    const generated = objectTemplate.instantiate({
      kernel: this.#kernel,
      seed,
      random: rootRandom.fork("parameters"),
    });
    using sourceSolid = generated.solid;
    const sourceQuality = validateGeometryQuality(this.#kernel, sourceSolid);
    if (!sourceQuality.passed) {
      throw new Error(`Rejected ${objectTemplate.id}: ${sourceQuality.errors.join(", ")}`);
    }

    const normalizedResult = normalizeSolid(this.#kernel, sourceSolid);
    using normalized = normalizedResult.solid;
    const orientationDegrees = orientationFor(seed, difficulty);
    using oriented = this.#kernel.rotate(normalized, orientationDegrees);
    const orientedMesh = this.#kernel.getMesh(oriented);
    const pictorialSvg = renderAperturePictorial(createOrthographicView(orientedMesh, ISOMETRIC_FRAME));
    using projection = this.#kernel.projectXY(oriented);
    const correctSilhouette = canonicalizeSilhouette(this.#kernel.getSection(projection));
    const targetFingerprint = silhouetteFingerprint(correctSilhouette);
    const distractors = generateApertureDistractors(correctSilhouette);
    const rawChoices = [
      { silhouette: correctSilhouette, fingerprint: targetFingerprint },
      ...distractors,
    ];
    const shuffled = rootRandom.fork("choice-order").shuffle(rawChoices);
    const sections = shuffled.map(({ silhouette }) => silhouette);
    const viewBox = sharedApertureViewBox(sections);
    const choices: ApertureChoice[] = shuffled.map((choice, index) => {
      const distractor = "reason" in choice ? choice : undefined;
      const common = {
        id: `choice-${index}`,
        silhouette: choice.silhouette,
        fingerprint: choice.fingerprint,
        svg: renderApertureChoice(choice.silhouette, viewBox, String.fromCharCode(65 + index)),
      };
      return distractor === undefined
        ? common
        : { ...common, distractorReason: distractor.reason };
    });
    const correctChoiceIndex = choices.findIndex(
      ({ fingerprint }) => fingerprint === targetFingerprint,
    );
    const mesh = this.#kernel.getMesh(normalized);
    const wrongChoices = Object.fromEntries(
      choices.flatMap((choice, index) => choice.distractorReason === undefined
        ? []
        : [[String(index), choice.distractorReason]]),
    );
    const explanation: ApertureExplanation = {
      type: "aperture",
      correctChoice: correctChoiceIndex,
      facts: generated.provenance.slice(1).map(({ id, semanticType }) => ({
        featureId: id,
        effect: `changes-silhouette:${semanticType ?? "feature"}`,
      })),
      wrongChoices,
    };
    const recipeFingerprint = fingerprint64(
      canonicalStringify(generated.recipe as unknown as JsonValue),
    );
    const questionId = `aperture-${fingerprint64(`${recipeFingerprint}:${orientationDegrees.join(",")}`)}`;
    const baseQuestion: ApertureQuestion = {
      id: questionId,
      engineVersion: "0.1.0",
      type: "aperture",
      seed,
      templateId: objectTemplate.id,
      templateVersion: objectTemplate.version,
      prompt: {
        recipe: generated.recipe,
        orientationDegrees,
        pictorialSvg,
        targetSilhouetteFingerprint: targetFingerprint,
        mesh: { vertexCount: mesh.vertexCount, triangleCount: mesh.triangleCount },
      },
      choices,
      correctChoiceIndex,
      explanation,
      difficulty: difficultyFor(correctSilhouette, difficulty),
      validation: { passed: false, checks: [] },
      fingerprints: {
        recipe: recipeFingerprint,
        silhouette: targetFingerprint,
      },
      metadata: {
        normalization: normalizedResult.transform,
        projectionArea: Math.abs(signedPolygonArea(correctSilhouette.polygons[0] ?? [])),
        mode: "exact-projection-silhouette",
      },
    };
    const validation = validateApertureQuestion(baseQuestion);
    if (!validation.passed) {
      const failures = validation.checks.filter(({ passed }) => !passed).map(({ id }) => id);
      throw new Error(`Rejected aperture question: ${failures.join(", ")}`);
    }
    return {
      ...baseQuestion,
      validation: { passed: true, checks: validation.checks },
    };
  }
}

export const createApertureGenerator = async (): Promise<ApertureGenerator> =>
  new ApertureGenerator(await createManifoldKernel());

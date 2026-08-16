import {
  canonicalStringify,
  createRandomSource,
  fingerprint64,
  type JsonValue,
} from "@manipat/core";
import {
  FRONT_FRAME,
  RIGHT_END_FRAME,
  TOP_FRAME,
  createManifoldKernel,
  createOrthographicView,
  normalizeSolid,
  validateGeometryQuality,
  type GeometryKernel,
  type OrthographicView,
  type ProjectionFrame,
} from "@manipat/geometry";
import { APERTURE_TEMPLATES } from "@manipat/object-generator";
import { generateTfeDistractors } from "./distractors.js";
import { renderTfeView, sharedTfeViewBox } from "./render.js";
import type {
  TfeChoice,
  TfeDiagram,
  TfeQuestion,
  TfeViewName,
} from "./types.js";
import { validateTfeQuestion } from "./validator.js";

const VIEW_FRAMES: Readonly<Record<TfeViewName, ProjectionFrame>> = {
  front: FRONT_FRAME,
  top: TOP_FRAME,
  end: RIGHT_END_FRAME,
};
const VIEW_NAMES = ["front", "top", "end"] as const;

export class TfeGenerator {
  readonly #kernel: GeometryKernel;

  public constructor(kernel: GeometryKernel) {
    this.#kernel = kernel;
  }

  public generate(seed: string, difficulty: 1 | 2 | 3 | 4 | 5 = 3): TfeQuestion {
    const random = createRandomSource(seed);
    const objectTemplate = random.fork("template").pick(APERTURE_TEMPLATES);
    const generated = objectTemplate.instantiate({
      kernel: this.#kernel,
      seed,
      random: random.fork("parameters"),
    });
    using source = generated.solid;
    const quality = validateGeometryQuality(this.#kernel, source);
    if (!quality.passed) throw new Error(`Rejected TFE geometry: ${quality.errors.join(", ")}`);
    const normalizedResult = normalizeSolid(this.#kernel, source);
    using normalized = normalizedResult.solid;
    const mesh = this.#kernel.getMesh(normalized);
    const views = Object.fromEntries(VIEW_NAMES.map((name) => [
      name,
      createOrthographicView(mesh, VIEW_FRAMES[name]),
    ])) as Record<TfeViewName, OrthographicView>;
    const missingView = random.fork("missing-view").pick(VIEW_NAMES);
    const correct = views[missingView];
    const distractors = generateTfeDistractors(correct);
    const rawChoices = random.fork("choice-order").shuffle([
      { view: correct },
      ...distractors,
    ]);
    const choiceViewBox = sharedTfeViewBox(rawChoices.map(({ view }) => view));
    const choices: TfeChoice[] = rawChoices.map((choice, index) => {
      const common = {
        name: missingView,
        view: choice.view,
        svg: renderTfeView(choice.view, choiceViewBox, `Choice ${String.fromCharCode(65 + index)}`),
      };
      return "mutation" in choice ? { ...common, mutation: choice.mutation } : common;
    });
    const givenNames = VIEW_NAMES.filter((name) => name !== missingView);
    const givenViewBox = sharedTfeViewBox(givenNames.map((name) => views[name]));
    const givenViews: TfeDiagram[] = givenNames.map((name) => ({
      name,
      view: views[name],
      svg: renderTfeView(views[name], givenViewBox, `${name} view`),
    }));
    const correctChoiceIndex = choices.findIndex(({ view }) => view.fingerprint === correct.fingerprint);
    const recipeFingerprint = fingerprint64(
      canonicalStringify(generated.recipe as unknown as JsonValue),
    );
    const base: TfeQuestion = {
      id: `tfe-${fingerprint64(`${recipeFingerprint}:${missingView}`)}`,
      engineVersion: "0.1.0",
      type: "view-recognition",
      seed,
      templateId: objectTemplate.id,
      templateVersion: objectTemplate.version,
      prompt: {
        recipe: generated.recipe,
        givenViews,
        missingView,
        targetFingerprint: correct.fingerprint,
      },
      choices,
      correctChoiceIndex,
      explanation: {
        type: "view-recognition",
        missingView,
        correctChoice: correctChoiceIndex,
        facts: [
          { axis: "width", correspondence: "front ↔ top" },
          { axis: "depth", correspondence: "top ↔ end" },
          { axis: "height", correspondence: "front ↔ end" },
        ],
        wrongChoices: Object.fromEntries(choices.flatMap((choice, index) =>
          choice.mutation === undefined ? [] : [[String(index), choice.mutation]])),
      },
      difficulty: {
        raw: difficulty * 10 + correct.visible.length + correct.hidden.length * 1.5,
        normalized: Math.min(1, (difficulty * 10 + correct.visible.length + correct.hidden.length * 1.5) / 70),
        band: difficulty,
        components: {
          visibleLines: correct.visible.length,
          hiddenLines: correct.hidden.length,
          requestedBand: difficulty,
        },
      },
      validation: { passed: false, checks: [] },
      fingerprints: { recipe: recipeFingerprint, view: correct.fingerprint },
      metadata: { normalization: normalizedResult.transform },
    };
    const validation = validateTfeQuestion(base);
    if (!validation.passed) {
      throw new Error(`Rejected TFE question: ${validation.checks.filter(({ passed }) => !passed).map(({ id }) => id).join(", ")}`);
    }
    return { ...base, validation: { passed: true, checks: validation.checks } };
  }
}

export const createTfeGenerator = async (): Promise<TfeGenerator> =>
  new TfeGenerator(await createManifoldKernel());

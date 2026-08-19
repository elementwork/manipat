import type { PatQuestionType } from "@manipat/core";
import { generateAngleQuestion, validateAngleQuestion } from "@manipat/pat-angle";
import {
  ApertureGenerator,
  validateApertureQuestion,
} from "@manipat/pat-aperture";
import {
  generateCubeCountingSet,
  validateCubeCountingQuestion,
} from "@manipat/pat-cube-counting";
import {
  generateFormDevelopmentQuestion,
  validateFormDevelopmentQuestion,
} from "@manipat/pat-form-development";
import {
  generatePaperFoldingQuestion,
  validatePaperFoldingQuestion,
} from "@manipat/pat-paper-folding";
import {
  TfeGenerator,
  validateTfeQuestion,
} from "@manipat/pat-view-recognition";
import { createManifoldKernel } from "@manipat/geometry";
import type {
  AnyPatQuestion,
  DifficultyBand,
  GenerateRequest,
  UnifiedValidationResult,
} from "./types.js";
import { extractQuestionAssets } from "./assets.js";
import { serializeQuestion } from "./serialization.js";
import type { QuestionAsset } from "./types.js";

export interface PatEngineOptions {
  readonly engineVersion?: string;
}

interface SpatialGenerators {
  readonly aperture: ApertureGenerator;
  readonly tfe: TfeGenerator;
}

export class PatEngine {
  public readonly engineVersion: string;
  readonly #aperture: ApertureGenerator | undefined;
  readonly #tfe: TfeGenerator | undefined;
  #spatialGeneratorsPromise: Promise<SpatialGenerators> | undefined;

  public constructor(
    aperture?: ApertureGenerator,
    tfe?: TfeGenerator,
    engineVersion = "0.1.0",
  ) {
    this.#aperture = aperture;
    this.#tfe = tfe;
    this.engineVersion = engineVersion;
  }

  async #getSpatialGenerators(): Promise<SpatialGenerators> {
    if (this.#aperture !== undefined && this.#tfe !== undefined) {
      return { aperture: this.#aperture, tfe: this.#tfe };
    }

    this.#spatialGeneratorsPromise ??= createManifoldKernel().then((kernel) => ({
      aperture: this.#aperture ?? new ApertureGenerator(kernel),
      tfe: this.#tfe ?? new TfeGenerator(kernel),
    }));
    return this.#spatialGeneratorsPromise;
  }

  public async generate(request: GenerateRequest): Promise<AnyPatQuestion> {
    const difficulty = request.difficulty ?? 3;
    const question = await this.#generate(request.type, request.seed, difficulty);
    return question.engineVersion === this.engineVersion
      ? question
      : { ...question, engineVersion: this.engineVersion };
  }

  async #generate(
    type: PatQuestionType,
    seed: string,
    difficulty: DifficultyBand,
  ): Promise<AnyPatQuestion> {
    switch (type) {
      case "aperture": {
        const { aperture } = await this.#getSpatialGenerators();
        return aperture.generate(seed, difficulty);
      }
      case "view-recognition": {
        const { tfe } = await this.#getSpatialGenerators();
        return tfe.generate(seed, difficulty);
      }
      case "angle": return generateAngleQuestion(seed, difficulty);
      case "paper-folding": return generatePaperFoldingQuestion(seed, difficulty);
      case "cube-counting": {
        const question = generateCubeCountingSet(seed, difficulty, 1)[0];
        if (question === undefined) throw new Error("Cube generator returned no question");
        return question;
      }
      case "form-development": return generateFormDevelopmentQuestion(seed, difficulty);
      default: return type satisfies never;
    }
  }

  public async generateCandidateGroup(
    request: GenerateRequest,
    maximumCount = 1,
  ): Promise<readonly AnyPatQuestion[]> {
    const difficulty = request.difficulty ?? 3;
    if (request.type === "cube-counting") {
      return generateCubeCountingSet(request.seed, difficulty, Math.min(3, maximumCount)).map((question) =>
        question.engineVersion === this.engineVersion ? question : { ...question, engineVersion: this.engineVersion });
    }
    return [await this.generate(request)];
  }

  public validate(question: AnyPatQuestion): UnifiedValidationResult {
    const validation = (() => {
      switch (question.type) {
        case "aperture": return validateApertureQuestion(question);
        case "view-recognition": return validateTfeQuestion(question);
        case "angle": return validateAngleQuestion(question);
        case "paper-folding": return validatePaperFoldingQuestion(question);
        case "cube-counting": return validateCubeCountingQuestion(question);
        case "form-development": return validateFormDevelopmentQuestion(question);
        default: return question satisfies never;
      }
    })();
    return {
      passed: validation.passed,
      type: question.type,
      failures: validation.checks.filter(({ passed }) => !passed).map(({ id }) => id),
    };
  }

  public render(question: AnyPatQuestion): readonly QuestionAsset[] {
    return extractQuestionAssets(question);
  }

  /** Regenerates an accepted question from its stored seed and verifies identity. */
  public async regenerate(question: AnyPatQuestion): Promise<AnyPatQuestion> {
    const storedGroupCount = question.type === "cube-counting"
      ? question.metadata.sharedFigureQuestionCount
      : 1;
    const groupCount = typeof storedGroupCount === "number" && Number.isInteger(storedGroupCount)
      ? storedGroupCount
      : 1;
    const candidates = await this.generateCandidateGroup({
      type: question.type,
      seed: question.seed,
      difficulty: question.difficulty.band,
    }, groupCount);
    const regenerated = candidates.find(({ id }) => id === question.id);
    if (regenerated === undefined || serializeQuestion(regenerated) !== serializeQuestion(question)) {
      throw new Error(`Question ${question.id} is not exactly reproducible`);
    }
    return regenerated;
  }

  public async *generateBatch(
    request: GenerateRequest & { readonly count: number },
  ): AsyncGenerator<AnyPatQuestion> {
    for (let index = 0; index < request.count; index += 1) {
      yield await this.generate({
        type: request.type,
        seed: `${request.seed}:${index}`,
        ...(request.difficulty === undefined ? {} : { difficulty: request.difficulty }),
      });
    }
  }
}

/**
 * Creates a PAT engine without eagerly loading the Manifold WASM runtime.
 * Aperture and view-recognition initialize the geometry kernel on first use;
 * the four 2D/discrete categories do not pay that startup cost.
 */
export const createPatEngine = async (
  options: PatEngineOptions = {},
): Promise<PatEngine> => new PatEngine(
  undefined,
  undefined,
  options.engineVersion ?? "0.1.0",
);

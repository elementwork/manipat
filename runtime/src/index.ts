import type { PatQuestionType } from "../../packages/core/dist/index.js";
import {
  PAT_CATEGORIES,
  correctAnswerDisplay,
  createPatEngine,
  renderQuestionExplanationHtml,
  type AnyPatQuestion,
  type DifficultyBand,
  type GenerateRequest,
  type PatEngine,
  type QuestionAsset,
} from "../../packages/question-bank/dist/index.js";

export const MANIPAT_RUNTIME_VERSION = "0.1.0" as const;
export const MANIPAT_QUESTION_SCHEMA_VERSION = 1 as const;

export interface PublicPatAsset {
  readonly kind: "prompt-svg";
  readonly contentHash: string;
  readonly svg: string;
}

export interface PublicPatChoice {
  readonly index: number;
  readonly label?: string;
  readonly svg?: string;
}

/**
 * Safe payload intended for an active testing client. It intentionally omits
 * seed, canonical question id, correct answer, solver output, explanation,
 * validation internals, fingerprints, and generator provenance.
 */
export interface PublicPatQuestion {
  readonly engineVersion: string;
  readonly schemaVersion: typeof MANIPAT_QUESTION_SCHEMA_VERSION;
  readonly category: PatQuestionType;
  readonly difficultyBand: DifficultyBand;
  readonly choiceCount: number;
  readonly promptText: string;
  readonly promptAssets: readonly PublicPatAsset[];
  readonly choices: readonly PublicPatChoice[];
  readonly timeTargetSeconds: number;
}

export interface PatSolutionPayload {
  readonly correctChoiceIndex: number;
  readonly answerDisplay: string;
  readonly explanationHtml: string;
  readonly correctChoiceSvg?: string;
}

/** Trusted server-only record. Never serialize this into an active client DTO. */
export interface PrivatePatQuestionRecord {
  readonly canonicalQuestionId: string;
  readonly engineVersion: string;
  readonly schemaVersion: typeof MANIPAT_QUESTION_SCHEMA_VERSION;
  readonly category: PatQuestionType;
  readonly difficultyBand: DifficultyBand;
  readonly seed: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly candidateGroupCount: number;
  readonly correctChoiceIndex: number;
  readonly solution: PatSolutionPayload;
}

export interface GeneratedPatQuestion {
  readonly publicQuestion: PublicPatQuestion;
  readonly privateRecord: PrivatePatQuestionRecord;
}

export interface PatRuntimeInfo {
  readonly runtimeVersion: typeof MANIPAT_RUNTIME_VERSION;
  readonly questionSchemaVersion: typeof MANIPAT_QUESTION_SCHEMA_VERSION;
  readonly engineVersion: string;
  readonly categories: readonly PatQuestionType[];
}

const assertStaticSvg = (svg: string): string => {
  const forbidden = /<script\b|\bon[a-z]+\s*=|javascript\s*:/iu;
  if (forbidden.test(svg)) {
    throw new Error("Generated SVG contains executable content and cannot be exposed");
  }
  return svg;
};

const promptText = (question: AnyPatQuestion): string => {
  switch (question.type) {
    case "aperture":
      return "Which opening could the object pass through?";
    case "view-recognition":
      return "Which option is the missing orthographic view?";
    case "angle":
      return "Rank the angles from smallest to largest.";
    case "paper-folding":
      return "Which pattern results when the paper is fully unfolded?";
    case "cube-counting":
      return `How many cubes have exactly ${question.prompt.targetPaintedFaces} painted faces?`;
    case "form-development":
      return "Which 3D solid can be formed from the net?";
    default:
      return question satisfies never;
  }
};

const publicPromptAsset = (asset: QuestionAsset): PublicPatAsset => ({
  kind: "prompt-svg",
  contentHash: asset.contentHash,
  svg: assertStaticSvg(asset.content),
});

const publicChoices = (question: AnyPatQuestion): readonly PublicPatChoice[] => {
  switch (question.type) {
    case "angle":
      return question.choices.map((choice, index) => ({
        index,
        label: choice.order.join(" – "),
      }));
    case "cube-counting":
      return question.choices.map((choice, index) => ({
        index,
        label: String(choice),
      }));
    case "aperture":
    case "view-recognition":
    case "paper-folding":
    case "form-development":
      return question.choices.map((choice, index) => ({
        index,
        svg: assertStaticSvg(choice.svg),
      }));
    default:
      return question satisfies never;
  }
};

const correctChoiceSvg = (question: AnyPatQuestion): string | undefined => {
  switch (question.type) {
    case "angle":
    case "cube-counting":
      return undefined;
    case "aperture":
    case "view-recognition":
    case "paper-folding":
    case "form-development": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? undefined : assertStaticSvg(choice.svg);
    }
    default:
      return question satisfies never;
  }
};

const candidateGroupCount = (question: AnyPatQuestion): number => {
  if (question.type !== "cube-counting") return 1;
  const value = question.metadata.sharedFigureQuestionCount;
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 1;
};

export class PatRuntime {
  readonly #engine: PatEngine;

  public constructor(engine: PatEngine) {
    this.#engine = engine;
  }

  public getEngineInfo(): PatRuntimeInfo {
    return {
      runtimeVersion: MANIPAT_RUNTIME_VERSION,
      questionSchemaVersion: MANIPAT_QUESTION_SCHEMA_VERSION,
      engineVersion: this.#engine.engineVersion,
      categories: PAT_CATEGORIES,
    };
  }

  #prepare(question: AnyPatQuestion): GeneratedPatQuestion {
    const validation = this.#engine.validate(question);
    if (!validation.passed) {
      throw new Error(
        `ManipAT rejected generated ${question.type} question: ${validation.failures.join(", ")}`,
      );
    }

    const promptAssets = this.#engine
      .render(question)
      .filter((asset) => asset.kind === "prompt-svg")
      .map(publicPromptAsset);
    const choiceSvg = correctChoiceSvg(question);
    const solution: PatSolutionPayload = {
      correctChoiceIndex: question.correctChoiceIndex,
      answerDisplay: correctAnswerDisplay(question),
      explanationHtml: renderQuestionExplanationHtml(question),
      ...(choiceSvg === undefined ? {} : { correctChoiceSvg: choiceSvg }),
    };

    return {
      publicQuestion: {
        engineVersion: question.engineVersion,
        schemaVersion: MANIPAT_QUESTION_SCHEMA_VERSION,
        category: question.type,
        difficultyBand: question.difficulty.band,
        choiceCount: question.choices.length,
        promptText: promptText(question),
        promptAssets,
        choices: publicChoices(question),
        timeTargetSeconds: 40,
      },
      privateRecord: {
        canonicalQuestionId: question.id,
        engineVersion: question.engineVersion,
        schemaVersion: MANIPAT_QUESTION_SCHEMA_VERSION,
        category: question.type,
        difficultyBand: question.difficulty.band,
        seed: question.seed,
        templateId: question.templateId,
        templateVersion: question.templateVersion,
        candidateGroupCount: candidateGroupCount(question),
        correctChoiceIndex: question.correctChoiceIndex,
        solution,
      },
    };
  }

  public async generateQuestion(request: GenerateRequest): Promise<GeneratedPatQuestion> {
    return this.#prepare(await this.#engine.generate(request));
  }

  public async generateCandidateGroup(
    request: GenerateRequest,
    maximumCount = 1,
  ): Promise<readonly GeneratedPatQuestion[]> {
    const questions = await this.#engine.generateCandidateGroup(request, maximumCount);
    return questions.map((question) => this.#prepare(question));
  }

  public async generateBatch(
    request: GenerateRequest & { readonly count: number },
  ): Promise<readonly GeneratedPatQuestion[]> {
    const generated: GeneratedPatQuestion[] = [];
    for await (const question of this.#engine.generateBatch(request)) {
      generated.push(this.#prepare(question));
    }
    return generated;
  }

  public async regenerate(record: PrivatePatQuestionRecord): Promise<GeneratedPatQuestion> {
    const candidates = await this.generateCandidateGroup(
      {
        type: record.category,
        seed: record.seed,
        difficulty: record.difficultyBand,
      },
      record.candidateGroupCount,
    );
    const match = candidates.find(
      ({ privateRecord }) => privateRecord.canonicalQuestionId === record.canonicalQuestionId,
    );
    if (match === undefined) {
      throw new Error(`Question ${record.canonicalQuestionId} is not reproducible`);
    }
    return match;
  }
}

export interface CreatePatRuntimeOptions {
  readonly engineVersion?: string;
}

export const createPatRuntime = async (
  options: CreatePatRuntimeOptions = {},
): Promise<PatRuntime> => new PatRuntime(await createPatEngine(options));

export type { DifficultyBand, GenerateRequest, PatQuestionType };

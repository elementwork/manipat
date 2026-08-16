import { performance } from "node:perf_hooks";
import type { PatQuestionType } from "@manipat/core";
import { GenerationTargetError } from "./errors.js";
import { QuestionDuplicateDetector } from "./fingerprints.js";
import type { PatEngine } from "./engine.js";
import type { AnyPatQuestion, DifficultyBand } from "./types.js";

export interface DifficultyMix {
  readonly kind: "mix";
  readonly weights: Readonly<Partial<Record<DifficultyBand, number>>>;
}

export type DifficultyRequest = DifficultyBand | readonly [DifficultyBand, DifficultyBand] | DifficultyMix;

export interface BatchConfig {
  readonly seed: string;
  readonly categories: Readonly<Partial<Record<PatQuestionType, number>>>;
  readonly difficulty: DifficultyRequest;
  readonly categoryDifficulty?: Readonly<Partial<Record<PatQuestionType, DifficultyRequest>>>;
  readonly maxAttemptsPerQuestion?: number;
}

export interface CandidateTrace {
  readonly candidateId: string;
  readonly seed: string;
  readonly type: PatQuestionType;
  readonly durationMs: number;
  readonly accepted: boolean;
  readonly rejectionReason?: string;
}

export interface GenerationStats {
  readonly generated: number;
  readonly accepted: number;
  readonly rejected: Readonly<Record<string, number>>;
  readonly acceptedByCategory: Readonly<Record<string, number>>;
  readonly acceptedByDifficulty: Readonly<Record<string, number>>;
  readonly rejectedByCategory: Readonly<Record<string, number>>;
  readonly rejectedByDifficulty: Readonly<Record<string, number>>;
}

export interface BatchResult {
  readonly questions: readonly AnyPatQuestion[];
  readonly stats: GenerationStats;
  readonly traces: readonly CandidateTrace[];
}

const difficultyFor = (request: DifficultyRequest, accepted: number): DifficultyBand => {
  if (typeof request === "number") return request;
  if ("kind" in request) {
    const weighted = (Object.entries(request.weights) as Array<[string, number]>).flatMap(
      ([band, weight]) => Array.from({ length: weight }, () => Number(band) as DifficultyBand),
    );
    if (weighted.length === 0) throw new GenerationTargetError("Difficulty mix has no positive weights");
    return weighted[accepted % weighted.length] ?? 3;
  }
  const [minimum, maximum] = request;
  return (minimum + (accepted % (maximum - minimum + 1))) as DifficultyBand;
};

export const generateBatch = async (
  engine: PatEngine,
  config: BatchConfig,
): Promise<BatchResult> => {
  const questions: AnyPatQuestion[] = [];
  const traces: CandidateTrace[] = [];
  const duplicateDetector = new QuestionDuplicateDetector();
  const rejected: Record<string, number> = {};
  const acceptedByCategory: Record<string, number> = {};
  const acceptedByDifficulty: Record<string, number> = {};
  const rejectedByCategory: Record<string, number> = {};
  const rejectedByDifficulty: Record<string, number> = {};
  let generated = 0;

  for (const [type, requested] of Object.entries(config.categories) as Array<[PatQuestionType, number]>) {
    let accepted = 0;
    let attempts = 0;
    const maximumAttempts = requested * (config.maxAttemptsPerQuestion ?? 20);
    while (accepted < requested && attempts < maximumAttempts) {
      const candidateSeed = `${config.seed}:${type}:${attempts}`;
      const difficultyRequest = config.categoryDifficulty?.[type] ?? config.difficulty;
      const difficulty = difficultyFor(difficultyRequest, accepted);
      const start = performance.now();
      const acceptedBefore = accepted;
      attempts += 1;
      try {
        const group = await engine.generateCandidateGroup(
          { type, seed: candidateSeed, difficulty },
          typeof difficultyRequest === "number" ? requested - accepted : 1,
        );
        generated += group.length;
        for (const question of group) {
          const validation = engine.validate(question);
          if (!validation.passed) throw new Error(`validation:${validation.failures.join(",")}`);
          if (!duplicateDetector.accept(question)) {
            rejected.duplicate = (rejected.duplicate ?? 0) + 1;
            rejectedByCategory[type] = (rejectedByCategory[type] ?? 0) + 1;
            rejectedByDifficulty[String(difficulty)] = (rejectedByDifficulty[String(difficulty)] ?? 0) + 1;
            continue;
          }
          questions.push(question);
          accepted += 1;
          acceptedByCategory[type] = (acceptedByCategory[type] ?? 0) + 1;
          acceptedByDifficulty[String(question.difficulty.band)] =
            (acceptedByDifficulty[String(question.difficulty.band)] ?? 0) + 1;
          if (accepted >= requested) break;
        }
        traces.push({
          candidateId: group[0]?.id ?? candidateSeed,
          seed: candidateSeed,
          type,
          durationMs: performance.now() - start,
          accepted: accepted > acceptedBefore,
          ...(accepted > acceptedBefore ? {} : { rejectionReason: "duplicate" }),
        });
      } catch (error) {
        generated += 1;
        const reason = error instanceof Error ? error.message : "unknown-error";
        rejected[reason] = (rejected[reason] ?? 0) + 1;
        rejectedByCategory[type] = (rejectedByCategory[type] ?? 0) + 1;
        rejectedByDifficulty[String(difficulty)] = (rejectedByDifficulty[String(difficulty)] ?? 0) + 1;
        traces.push({
          candidateId: candidateSeed,
          seed: candidateSeed,
          type,
          durationMs: performance.now() - start,
          accepted: false,
          rejectionReason: reason,
        });
      }
    }
    if (accepted < requested) {
      throw new GenerationTargetError(`Generated ${accepted}/${requested} ${type} questions after ${attempts} attempts`);
    }
  }
  return {
    questions,
    stats: {
      generated,
      accepted: questions.length,
      rejected,
      acceptedByCategory,
      acceptedByDifficulty,
      rejectedByCategory,
      rejectedByDifficulty,
    },
    traces,
  };
};

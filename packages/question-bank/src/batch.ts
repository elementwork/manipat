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

const isDifficultyMix = (request: DifficultyRequest): request is DifficultyMix =>
  typeof request !== "number" && "kind" in request;

const difficultyFor = (request: Exclude<DifficultyRequest, DifficultyMix>, accepted: number): DifficultyBand => {
  if (typeof request === "number") return request;
  const [minimum, maximum] = request;
  return (minimum + (accepted % (maximum - minimum + 1))) as DifficultyBand;
};

/**
 * Convert arbitrary positive mix weights into exact integer quotas for this
 * category using largest-remainder allocation. This prevents grouped generators
 * (notably Cube Counting) from overshooting a target band by admitting an
 * entire shared-figure group at once.
 */
const mixTargets = (
  request: DifficultyMix,
  requested: number,
): Readonly<Record<string, number>> => {
  const entries = (Object.entries(request.weights) as Array<[string, number]>)
    .map(([band, weight]) => ({ band: Number(band) as DifficultyBand, weight }))
    .filter(({ weight }) => Number.isFinite(weight) && weight > 0)
    .sort((a, b) => a.band - b.band);
  const totalWeight = entries.reduce((sum, { weight }) => sum + weight, 0);
  if (entries.length === 0 || totalWeight <= 0) {
    throw new GenerationTargetError("Difficulty mix has no positive weights");
  }

  const allocations = entries.map(({ band, weight }) => {
    const exact = requested * weight / totalWeight;
    const count = Math.floor(exact);
    return { band, count, remainder: exact - count };
  });
  let remaining = requested - allocations.reduce((sum, { count }) => sum + count, 0);
  const remainderOrder = [...allocations].sort((a, b) =>
    b.remainder - a.remainder || a.band - b.band);
  for (const allocation of remainderOrder) {
    if (remaining <= 0) break;
    allocation.count += 1;
    remaining -= 1;
  }
  return Object.fromEntries(allocations.map(({ band, count }) => [String(band), count]));
};

const nextMixDifficulty = (
  targets: Readonly<Record<string, number>>,
  accepted: Readonly<Record<string, number>>,
): DifficultyBand => {
  const remaining = Object.entries(targets)
    .map(([band, target]) => ({
      band: Number(band) as DifficultyBand,
      remaining: target - (accepted[band] ?? 0),
    }))
    .filter(({ remaining: count }) => count > 0)
    .sort((a, b) => b.remaining - a.remaining || a.band - b.band);
  const selected = remaining[0];
  if (selected === undefined) throw new GenerationTargetError("Difficulty mix quota is already complete");
  return selected.band;
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
    const categoryAcceptedByDifficulty: Record<string, number> = {};
    const difficultyRequest = config.categoryDifficulty?.[type] ?? config.difficulty;
    const categoryMixTargets = isDifficultyMix(difficultyRequest)
      ? mixTargets(difficultyRequest, requested)
      : undefined;
    const maximumAttempts = requested * (config.maxAttemptsPerQuestion ?? 20);
    while (accepted < requested && attempts < maximumAttempts) {
      const candidateSeed = `${config.seed}:${type}:${attempts}`;
      const difficulty = categoryMixTargets === undefined
        ? difficultyFor(difficultyRequest as Exclude<DifficultyRequest, DifficultyMix>, accepted)
        : nextMixDifficulty(categoryMixTargets, categoryAcceptedByDifficulty);
      const start = performance.now();
      const acceptedBefore = accepted;
      attempts += 1;
      try {
        const remainingTotal = requested - accepted;
        const remainingForDifficulty = categoryMixTargets === undefined
          ? remainingTotal
          : (categoryMixTargets[String(difficulty)] ?? 0)
            - (categoryAcceptedByDifficulty[String(difficulty)] ?? 0);
        // Cube Counting questions intentionally share one figure in groups of up
        // to three. Cap a group at the selected band's remaining quota so the
        // shared-figure optimization cannot distort the requested mix.
        const maximumGroupCount = type === "cube-counting"
          ? Math.min(remainingTotal, Math.max(1, remainingForDifficulty))
          : 1;
        const group = await engine.generateCandidateGroup(
          { type, seed: candidateSeed, difficulty },
          maximumGroupCount,
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
          const bandKey = String(question.difficulty.band);
          categoryAcceptedByDifficulty[bandKey] = (categoryAcceptedByDifficulty[bandKey] ?? 0) + 1;
          acceptedByCategory[type] = (acceptedByCategory[type] ?? 0) + 1;
          acceptedByDifficulty[bandKey] = (acceptedByDifficulty[bandKey] ?? 0) + 1;
          if (accepted >= requested) break;
          if (categoryMixTargets !== undefined
            && (categoryAcceptedByDifficulty[String(difficulty)] ?? 0)
              >= (categoryMixTargets[String(difficulty)] ?? 0)) break;
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

export interface RandomSource {
  /** Returns a deterministic value in [0, 1). */
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  float(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(probability: number): boolean;
  fork(namespace: string): RandomSource;
}

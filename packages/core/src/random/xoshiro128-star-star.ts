import type { RandomSource } from "./random-source.js";

const UINT32_RANGE = 0x1_0000_0000;

const rotateLeft = (value: number, shift: number): number =>
  ((value << shift) | (value >>> (32 - shift))) >>> 0;

const hashSeed = (seed: string): readonly [number, number, number, number] => {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = rotateLeft(hash, 13);
  }

  const nextWord = (): number => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };

  const state = [nextWord(), nextWord(), nextWord(), nextWord()] as const;
  return state.every((word) => word === 0) ? [0x9e3779b9, 0, 0, 0] : state;
};

const assertFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

export class Xoshiro128StarStar implements RandomSource {
  readonly #seed: string;
  #state: [number, number, number, number];

  public constructor(seed: string) {
    if (seed.length === 0) {
      throw new RangeError("Seed must not be empty");
    }
    this.#seed = seed;
    this.#state = [...hashSeed(seed)];
  }

  #nextUint32(): number {
    const [s0, s1, s2, s3] = this.#state;
    const result = Math.imul(rotateLeft(Math.imul(s1, 5), 7), 9) >>> 0;
    const temporary = (s1 << 9) >>> 0;

    this.#state[2] = (s2 ^ s0) >>> 0;
    this.#state[3] = (s3 ^ s1) >>> 0;
    this.#state[1] = (s1 ^ this.#state[2]) >>> 0;
    this.#state[0] = (s0 ^ this.#state[3]) >>> 0;
    this.#state[2] = (this.#state[2] ^ temporary) >>> 0;
    this.#state[3] = rotateLeft(this.#state[3], 11);
    return result;
  }

  public next(): number {
    return this.#nextUint32() / UINT32_RANGE;
  }

  public int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxInclusive)) {
      throw new RangeError("Integer bounds must be safe integers");
    }
    if (maxInclusive < minInclusive) {
      throw new RangeError("Maximum must be greater than or equal to minimum");
    }
    const span = maxInclusive - minInclusive + 1;
    if (span > UINT32_RANGE) {
      throw new RangeError("Integer range must contain at most 2^32 values");
    }

    const rejectionLimit = UINT32_RANGE - (UINT32_RANGE % span);
    let value = this.#nextUint32();
    while (value >= rejectionLimit) {
      value = this.#nextUint32();
    }
    return minInclusive + (value % span);
  }

  public float(min: number, max: number): number {
    assertFinite(min, "Minimum");
    assertFinite(max, "Maximum");
    if (max < min) {
      throw new RangeError("Maximum must be greater than or equal to minimum");
    }
    return min + this.next() * (max - min);
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("Cannot pick from an empty collection");
    }
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error("Random selection produced an invalid index");
    }
    return item;
  }

  public shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
    }
    return result;
  }

  public chance(probability: number): boolean {
    if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
      throw new RangeError("Probability must be finite and between 0 and 1");
    }
    return this.next() < probability;
  }

  public fork(namespace: string): RandomSource {
    if (namespace.length === 0) {
      throw new RangeError("Fork namespace must not be empty");
    }
    return new Xoshiro128StarStar(`${this.#seed}\u0000${namespace}`);
  }
}

export const createRandomSource = (seed: string): RandomSource =>
  new Xoshiro128StarStar(seed);

import { describe, expect, it } from "vitest";
import { createRandomSource } from "../src/index.js";

describe("Xoshiro128StarStar", () => {
  it("replays the same stream for the same seed", () => {
    const first = createRandomSource("question-001");
    const second = createRandomSource("question-001");
    expect(Array.from({ length: 16 }, () => first.next())).toEqual(
      Array.from({ length: 16 }, () => second.next()),
    );
  });

  it("forks independently of parent consumption", () => {
    const first = createRandomSource("root");
    first.next();
    first.next();
    const delayedFork = first.fork("shape");
    const immediateFork = createRandomSource("root").fork("shape");
    expect(delayedFork.next()).toBe(immediateFork.next());
  });

  it("does not mutate input while shuffling", () => {
    const input = [1, 2, 3, 4] as const;
    const output = createRandomSource("shuffle").shuffle(input);
    expect(input).toEqual([1, 2, 3, 4]);
    expect([...output].sort()).toEqual([1, 2, 3, 4]);
  });

  it("rejects invalid arguments", () => {
    const random = createRandomSource("validation");
    expect(() => random.pick([])).toThrow(RangeError);
    expect(() => random.int(3, 2)).toThrow(RangeError);
    expect(() => random.chance(1.1)).toThrow(RangeError);
  });
});

import { createRandomSource } from "@manipat/core";
import {
  createManifoldKernel,
  normalizeSolid,
  type CanonicalMesh,
} from "@manipat/geometry";
import { getObjectTemplate } from "@manipat/object-generator";
import type { TfeQuestion } from "./types.js";

/** Rebuild the normalized source mesh represented by a persisted TFE question. */
export const reconstructTfeMesh = async (
  question: TfeQuestion,
): Promise<CanonicalMesh> => {
  const template = getObjectTemplate(question.templateId);
  if (!template.allowedQuestionTypes.includes("view-recognition")) {
    throw new RangeError(`Template ${template.id} cannot reconstruct a TFE question`);
  }
  const kernel = await createManifoldKernel();
  const generated = template.instantiate({
    kernel,
    seed: question.seed,
    random: createRandomSource(question.seed).fork("parameters"),
  });
  using source = generated.solid;
  const normalizedResult = normalizeSolid(kernel, source);
  using normalized = normalizedResult.solid;
  return kernel.getMesh(normalized);
};

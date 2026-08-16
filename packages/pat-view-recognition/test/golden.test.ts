import { createRandomSource, fingerprint64 } from "@manipat/core";
import {
  FRONT_FRAME,
  RIGHT_END_FRAME,
  TOP_FRAME,
  createManifoldKernel,
  createOrthographicView,
  normalizeSolid,
  type GeometryKernel,
  type SolidHandle,
} from "@manipat/geometry";
import { APERTURE_TEMPLATES } from "@manipat/object-generator";
import { describe, expect, it } from "vitest";
import golden from "../../../fixtures/geometry/tfe-golden.json";
import { renderTfeView, sharedTfeViewBox } from "../src/index.js";

const TEMPLATE_CASES = [
  ["stepped-block", "T06-stepped-block"],
  ["through-hole-block", "T04-cuboid-through-hole"],
  ["slotted-block", "T05-cuboid-slot"],
  ["wedge", "T02-cuboid-wedge"],
  ["cylinder-on-block", "T03-cuboid-cylinder-boss"],
  ["compound-notch", "T10-cuboid-wedge-slot"],
] as const;

const blindRecess = (kernel: GeometryKernel): SolidHandle => {
  using body = kernel.cube([64, 50, 44], true);
  using pocketBase = kernel.cube([24, 20, 18], true);
  using pocket = kernel.translate(pocketBase, [8, 3, 18]);
  return kernel.difference(body, pocket);
};

describe("TFE golden fixtures", () => {
  it("matches all approved front/top/end view and SVG fingerprints", async () => {
    const kernel = await createManifoldKernel();
    const cases: Array<readonly [string, SolidHandle]> = [["cube", kernel.cube([60, 50, 40], true)]];
    for (const [name, templateId] of TEMPLATE_CASES) {
      const template = APERTURE_TEMPLATES.find(({ id }) => id === templateId);
      if (template === undefined) throw new Error(`Missing fixture template ${templateId}`);
      cases.push([name, template.instantiate({
        kernel,
        seed: `golden:${name}`,
        random: createRandomSource(`golden:${name}`),
      }).solid]);
    }
    cases.push(["blind-recess", blindRecess(kernel)]);

    for (const [name, source] of cases) {
      using ownedSource = source;
      const normalizedResult = normalizeSolid(kernel, ownedSource);
      using normalized = normalizedResult.solid;
      const mesh = kernel.getMesh(normalized);
      const views = [FRONT_FRAME, TOP_FRAME, RIGHT_END_FRAME].map((frame) =>
        createOrthographicView(mesh, frame));
      const viewBox = sharedTfeViewBox(views);
      const actual = views.map((view, index) => ({
        viewFingerprint: view.fingerprint,
        svgFingerprint: fingerprint64(renderTfeView(view, viewBox, ["front", "top", "end"][index] ?? "view")),
      }));
      expect(actual, name).toEqual(golden[name as keyof typeof golden]);
    }
  });
});

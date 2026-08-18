import { describe, expect, it } from "vitest";
import { svgDocument, svgLine, svgPolygon } from "../src/index.js";

describe("svgDocument", () => {
  it("renders deterministic attributes and duplicate-safe accessibility metadata", () => {
    const document = svgDocument({
      viewBox: [0, 0, 100, 100],
      title: "Aperture <A>",
      description: "Correct & exact silhouette",
      children: [
        svgPolygon([[0, 0], [100, 0], [100, 100]], {
          fill: "none",
          "data-source-feature": "body",
        }),
        svgLine([0, 0], [10, 20], { class: "visible-edge" }),
      ],
    });

    expect(document).toBe(
      '<svg aria-label="Aperture &lt;A&gt;. Correct &amp; exact silhouette" role="img" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><title>Aperture &lt;A&gt;</title><desc>Correct &amp; exact silhouette</desc><polygon data-source-feature="body" fill="none" points="0,0 100,0 100,100"/><line class="visible-edge" x1="0" x2="10" y1="0" y2="20"/></svg>',
    );
    expect(document).not.toContain('id="svg-title"');
    expect(document).not.toContain('id="svg-description"');
  });
});

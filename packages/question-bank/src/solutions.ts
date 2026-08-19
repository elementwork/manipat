import type { AnyPatQuestion } from "./types.js";

export type ExamSolutionMode = "none" | "key" | "full";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const answerLetter = (index: number): string => String.fromCharCode(65 + index);
const formatNumber = (value: number): string => Number(value.toFixed(2)).toString();
const formatPoint2 = ([x, y]: readonly [number, number]): string =>
  `(${formatNumber(x)}, ${formatNumber(y)})`;
const formatPoint3 = ({ x, y, z }: { readonly x: number; readonly y: number; readonly z: number }): string =>
  `(${x}, ${y}, ${z})`;

const titleCase = (value: string): string => value
  .split("-")
  .map((part) => part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const list = (items: readonly string[]): string =>
  items.length === 0 ? "" : `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

const choiceLetterForId = (question: AnyPatQuestion, choiceId: string): string => {
  const index = question.choices.findIndex((choice) =>
    typeof choice === "object" && choice !== null && "id" in choice && choice.id === choiceId);
  return index < 0 ? choiceId : answerLetter(index);
};

export const correctAnswerDisplay = (question: AnyPatQuestion): string => {
  const letter = answerLetter(question.correctChoiceIndex);
  switch (question.type) {
    case "angle": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? letter : `${letter} — ${choice.order.join(" – ")}`;
    }
    case "cube-counting": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? letter : `${letter} — ${choice}`;
    }
    case "aperture":
    case "view-recognition":
    case "paper-folding":
    case "form-development":
      return letter;
    default:
      return question satisfies never;
  }
};

const correctChoiceArtwork = (question: AnyPatQuestion): string => {
  switch (question.type) {
    case "aperture": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? "" : `<div class="solution-choice-art" aria-label="Correct choice artwork">${choice.svg}</div>`;
    }
    case "view-recognition": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? "" : `<div class="solution-choice-art" aria-label="Correct choice artwork">${choice.svg}</div>`;
    }
    case "paper-folding": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? "" : `<div class="solution-choice-art" aria-label="Correct choice artwork">${choice.svg}</div>`;
    }
    case "form-development": {
      const choice = question.choices[question.correctChoiceIndex];
      return choice === undefined ? "" : `<div class="solution-choice-art" aria-label="Correct choice artwork">${choice.svg}</div>`;
    }
    case "angle":
    case "cube-counting":
      return "";
    default:
      return question satisfies never;
  }
};

const apertureExplanation = (question: Extract<AnyPatQuestion, { readonly type: "aperture" }>): string => {
  const facts = question.explanation.facts.map(({ featureId, effect }) =>
    `<strong>${escapeHtml(featureId)}</strong>: ${escapeHtml(effect)}`);
  const wrong = Object.entries(question.explanation.wrongChoices).map(([choiceId, reason]) => {
    const feature = reason.featureId === undefined ? "" : `; feature ${escapeHtml(reason.featureId)}`;
    const details = reason.details === undefined || Object.keys(reason.details).length === 0
      ? ""
      : `; ${escapeHtml(JSON.stringify(reason.details))}`;
    return `<strong>${escapeHtml(choiceLetterForId(question, choiceId))}</strong>: ${escapeHtml(titleCase(reason.type))}${feature}${details}`;
  });
  return `<p>The correct aperture matches the object's exact projected silhouette in the target orientation.</p>${
    facts.length === 0 ? "" : `<h4>Projection facts</h4>${list(facts)}`
  }${wrong.length === 0 ? "" : `<h4>Why the distractors fail</h4>${list(wrong)}`}`;
};

const tfeExplanation = (question: Extract<AnyPatQuestion, { readonly type: "view-recognition" }>): string => {
  const facts = question.explanation.facts.map(({ axis, correspondence }) =>
    `<strong>${escapeHtml(titleCase(axis))}</strong>: ${escapeHtml(correspondence)}`);
  const wrong = Object.entries(question.explanation.wrongChoices).map(([choiceId, mutation]) =>
    `<strong>${escapeHtml(choiceLetterForId(question, choiceId))}</strong>: ${escapeHtml(titleCase(mutation))}`);
  return `<p>The missing view is <strong>${escapeHtml(question.explanation.missingView.toUpperCase())}</strong>. Shared dimensions and edge visibility must agree with the two supplied orthographic views.</p>${
    facts.length === 0 ? "" : `<h4>View correspondences</h4>${list(facts)}`
  }${wrong.length === 0 ? "" : `<h4>Why the distractors fail</h4>${list(wrong)}`}`;
};

const angleExplanation = (question: Extract<AnyPatQuestion, { readonly type: "angle" }>): string => {
  const measured = Object.entries(question.explanation.measuredDegrees)
    .sort(([first], [second]) => Number(first) - Number(second))
    .map(([id, degrees]) => `Angle <strong>${escapeHtml(id)}</strong>: ${formatNumber(degrees)}°`);
  return `<p>Comparing the actual angular separations gives the order <strong>${
    question.explanation.orderSmallestToLargest.join(" – ")
  }</strong> from smallest to largest.</p><h4>Measured angles</h4>${list(measured)}`;
};

const paperExplanation = (question: Extract<AnyPatQuestion, { readonly type: "paper-folding" }>): string => {
  const unfold = question.explanation.unfoldOrder.map((foldId, index) =>
    `${index + 1}. Reverse <strong>${escapeHtml(foldId)}</strong>`);
  const punches = Object.entries(question.explanation.punchLayers).map(([punchId, layers]) =>
    `<strong>${escapeHtml(punchId)}</strong>: penetrates ${layers.length} layer${layers.length === 1 ? "" : "s"}`);
  const holes = question.explanation.finalHoles.map((point) => escapeHtml(formatPoint2(point)));
  return `<p>Undo the folds in reverse order. Every punched layer reflects across each fold line that affected it, producing the final symmetric hole pattern.</p>${
    unfold.length === 0 ? "" : `<h4>Reverse-unfold order</h4>${list(unfold)}`
  }${punches.length === 0 ? "" : `<h4>Punch depth</h4>${list(punches)}`
  }${holes.length === 0 ? "" : `<h4>Final hole centers</h4>${list(holes)}`}`;
};

const cubeExplanation = (question: Extract<AnyPatQuestion, { readonly type: "cube-counting" }>): string => {
  const cubes = question.explanation.matchingCubes.map((cube) => escapeHtml(formatPoint3(cube)));
  const sides = question.explanation.targetPaintedFaces;
  return `<p>Under the rule that every exposed face except a resting bottom face is painted, <strong>${question.explanation.count}</strong> cube${
    question.explanation.count === 1 ? "" : "s"
  } ha${question.explanation.count === 1 ? "s" : "ve"} exactly ${sides} painted face${sides === 1 ? "" : "s"}.</p>${
    cubes.length === 0 ? "" : `<h4>Matching cube coordinates</h4>${list(cubes)}`
  }`;
};

const formExplanation = (question: Extract<AnyPatQuestion, { readonly type: "form-development" }>): string => {
  const marked = question.explanation.markedFaces.map((faceId) => escapeHtml(faceId));
  const adjacency = question.explanation.adjacency.map(({ faceA, faceB, sharedVertexIds }) =>
    `<strong>${escapeHtml(faceA)}</strong> ↔ <strong>${escapeHtml(faceB)}</strong> along vertices ${sharedVertexIds[0]}–${sharedVertexIds[1]}`);
  return `<p>The correct solid preserves the net's face adjacency, pattern orientation, and original chirality when folded.</p>${
    marked.length === 0 ? "" : `<h4>Marked faces</h4>${list(marked)}`
  }${adjacency.length === 0 ? "" : `<h4>Required face adjacencies</h4>${list(adjacency)}`}`;
};

export const renderQuestionExplanationHtml = (question: AnyPatQuestion): string => {
  switch (question.type) {
    case "aperture": return apertureExplanation(question);
    case "view-recognition": return tfeExplanation(question);
    case "angle": return angleExplanation(question);
    case "paper-folding": return paperExplanation(question);
    case "cube-counting": return cubeExplanation(question);
    case "form-development": return formExplanation(question);
    default: return question satisfies never;
  }
};

export const renderQuestionSolutionHtml = (question: AnyPatQuestion, number: number): string =>
  `<article class="solution-card" data-solution-question="${number}"><header><span>Question ${number}</span><strong>Correct answer: ${
    escapeHtml(correctAnswerDisplay(question))
  }</strong></header>${correctChoiceArtwork(question)}<div class="solution-explanation">${
    renderQuestionExplanationHtml(question)
  }</div></article>`;

const answerKey = (questions: readonly AnyPatQuestion[]): string => {
  const entries = questions.map((question, index) =>
    `<div class="solution-key-item"><span>${index + 1}</span><strong>${escapeHtml(correctAnswerDisplay(question))}</strong></div>`).join("");
  return `<section class="exam-page solution-key-page"><header class="section-header"><div><strong>Answer Key</strong><span>Correct choices for all questions.</span></div></header><div class="solution-key-grid">${entries}</div></section>`;
};

const chunks = <T>(values: readonly T[], size: number): readonly (readonly T[])[] => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

const fullSolutions = (questions: readonly AnyPatQuestion[]): string => chunks(questions, 2)
  .map((group, pageIndex) => {
    const firstQuestionNumber = pageIndex * 2 + 1;
    const cards = group.map((question, index) =>
      renderQuestionSolutionHtml(question, firstQuestionNumber + index)).join("");
    return `<section class="exam-page solution-page"><header class="section-header"><div><strong>Solutions &amp; Explanations</strong><span>Use after completing the test.</span></div></header><div class="solution-stack">${cards}</div></section>`;
  }).join("");

const solutionStyles = `<style id="manipat-solution-styles">
.solution-key-page,.solution-page{page-break-before:always}.solution-key-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px 18px;padding:24px 18px}.solution-key-item{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #d7d7d7;padding:5px 2px;font:14px Arial,Helvetica,sans-serif}.solution-key-item span{color:#555}.solution-stack{display:grid;grid-template-rows:1fr 1fr;gap:12px;min-height:9in;padding:8px 0}.solution-card{border:1px solid #cfcfcf;border-radius:6px;padding:12px 14px;break-inside:avoid;overflow:hidden}.solution-card header{display:flex;justify-content:space-between;align-items:baseline;gap:16px;border-bottom:1px solid #e1e1e1;padding-bottom:7px;margin-bottom:8px;font:14px Arial,Helvetica,sans-serif}.solution-card header span{font-weight:700}.solution-card header strong{font-size:15px}.solution-choice-art{display:flex;justify-content:center;align-items:center;min-height:95px;max-height:165px;margin:4px auto 8px}.solution-choice-art svg{display:block;max-width:260px;max-height:160px;width:auto;height:auto}.solution-explanation{font:12.5px/1.4 Arial,Helvetica,sans-serif;color:#222}.solution-explanation p{margin:5px 0 7px}.solution-explanation h4{margin:8px 0 3px;font-size:12.5px}.solution-explanation ul{margin:3px 0 5px 18px;padding:0}.solution-explanation li{margin:2px 0}@media screen{.solution-key-page,.solution-page{background:#fff}}@media print{.solution-card{box-shadow:none}}
</style>`;

export const augmentExamHtmlWithSolutions = (
  html: string,
  questions: readonly AnyPatQuestion[],
  mode: ExamSolutionMode,
): string => {
  if (mode === "none") return html;
  const mainClose = "</main>";
  const headClose = "</head>";
  if (!html.includes(mainClose) || !html.includes(headClose)) {
    throw new Error("Exam HTML is missing the expected head/main markers for solution augmentation");
  }
  const appendix = `${answerKey(questions)}${mode === "full" ? fullSolutions(questions) : ""}`;
  return html
    .replace(headClose, `${solutionStyles}${headClose}`)
    .replace(mainClose, `${appendix}${mainClose}`);
};

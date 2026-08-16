import { canonicalStringify, type JsonValue, type PatQuestionType } from "@manipat/core";
import type { AnyPatQuestion } from "./types.js";

export const EXAM_DATA_SCRIPT_ID = "manipat-exam-data";

export interface ExamHtmlOptions {
  readonly seed: string;
  readonly profile: string;
  readonly difficulty: string;
  readonly engineVersion: string;
  readonly cliVersion: string;
  readonly requestedCategoryCounts: Readonly<Partial<Record<PatQuestionType, number>>>;
  readonly acceptedCategoryCounts: Readonly<Record<string, number>>;
  readonly difficultyDistribution: Readonly<Record<string, number>>;
}

interface EmbeddedExam {
  readonly format: "manipat-exam-html-v1";
  readonly manifest: ExamHtmlOptions;
  readonly questions: readonly AnyPatQuestion[];
}

const CATEGORY_DETAILS: Readonly<Record<PatQuestionType, { readonly title: string; readonly directions: string }>> = {
  aperture: {
    title: "Apertures",
    directions: "Select the one opening the object can pass through after it is oriented, without changing orientation during passage.",
  },
  "view-recognition": {
    title: "View Recognition",
    directions: "Use the shared width, depth, height, and hidden-line conventions to select the missing orthographic view.",
  },
  angle: {
    title: "Angle Discrimination",
    directions: "Rank the four labeled angles from smallest to largest. Ray length and rotation do not change an angle's measure.",
  },
  "paper-folding": {
    title: "Paper Folding",
    directions: "Follow the folds and punch locations, then select the hole pattern after the paper is completely unfolded.",
  },
  "cube-counting": {
    title: "Cube Counting",
    directions: "Assume every exposed face except a face resting on the surface is painted. Select the requested cube count.",
  },
  "form-development": {
    title: "Spatial Relations",
    directions: "Select the three-dimensional form that can be made by folding the flat pattern without changing its markings.",
  },
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const answerLetter = (index: number): string => String.fromCharCode(65 + index);

const svgText = (x: number, y: number, value: string, size = 14, anchor = "start", weight = "normal"): string =>
  `<text fill="#171b18" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" x="${x}" y="${y}">${escapeHtml(value)}</text>`;

const positionedSvg = (content: string, x: number, y: number, width: number, height: number): string =>
  content.replace("<svg", `<svg height="${height}" preserveAspectRatio="xMidYMid meet" width="${width}" x="${x}" y="${y}"`);

const cell = (x: number, width: number, label: string, artwork: string): string =>
  `<rect fill="#fff" height="282" stroke="#231f20" stroke-width="1.7" width="${width}" x="${x}" y="1"/>${artwork}${svgText(x + width / 2, 270, label, 15, "middle", "700")}`;

const rowSvg = (question: AnyPatQuestion, number: number): string => {
  const title = `${CATEGORY_DETAILS[question.type].title} — Question ${number}`;
  const header = `${svgText(10, 20, CATEGORY_DETAILS[question.type].title, 14, "start", "700")}${svgText(1215, 20, `Question ${number}`, 14, "end", "700")}`;
  const textChoice = (x: number, width: number, label: string, value: string): string =>
    cell(x, width, label, svgText(x + width / 2, 145, value, 17, "middle", "700"));
  switch (question.type) {
    case "aperture": {
      const promptWidth = 238;
      const choiceWidth = (1223 - promptWidth) / 5;
      const prompt = `${svgText(10, 38, "Choose the opening that fits.", 11)}${positionedSvg(question.prompt.pictorialSvg, 8, 45, promptWidth - 16, 205)}`;
      const choices = question.choices.map((choice, index) => cell(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), positionedSvg(choice.svg, promptWidth + choiceWidth * index + 8, 42, choiceWidth - 16, 208))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "OBJECT", prompt)}${choices}${header}</svg>`;
    }
    case "view-recognition": {
      const promptWidth = 296;
      const choiceWidth = (1223 - promptWidth) / 4;
      const prompt = `${svgText(10, 38, `Choose the correct ${question.prompt.missingView} view.`, 11)}${question.prompt.givenViews.map((view, index) => `${svgText(18 + index * 137, 67, view.name.toUpperCase(), 10, "start", "700")}${positionedSvg(view.svg, 10 + index * 140, 76, 128, 155)}`).join("")}`;
      const choices = question.choices.map((choice, index) => cell(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), positionedSvg(choice.svg, promptWidth + choiceWidth * index + 10, 42, choiceWidth - 20, 205))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "GIVEN VIEWS", prompt)}${choices}${header}</svg>`;
    }
    case "angle": {
      const promptWidth = 590;
      const choiceWidth = (1223 - promptWidth) / 4;
      const prompt = `${svgText(10, 38, "Rank angles 1–4: smallest to largest.", 11)}${positionedSvg(question.prompt.svg, 10, 44, promptWidth - 20, 204)}`;
      const choices = question.choices.map(({ order }, index) => textChoice(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), order.join("-"))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "ANGLES 1–4", prompt)}${choices}${header}</svg>`;
    }
    case "paper-folding": {
      const promptWidth = 500;
      const choiceWidth = (1223 - promptWidth) / 5;
      const prompt = `${svgText(10, 38, "Choose the pattern after unfolding.", 11)}${question.prompt.stepSvgs.map((step, index) => `${positionedSvg(step, 8 + index * 122, 48, 114, 188)}${svgText(65 + index * 122, 250, index === question.prompt.stepSvgs.length - 1 ? "PUNCH" : `FOLD ${index + 1}`, 9, "middle", "700")}`).join("")}`;
      const choices = question.choices.map((choice, index) => cell(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), positionedSvg(choice.svg, promptWidth + choiceWidth * index + 7, 45, choiceWidth - 14, 198))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "FOLDS", prompt)}${choices}${header}</svg>`;
    }
    case "cube-counting": {
      const promptWidth = 480;
      const choiceWidth = (1223 - promptWidth) / 5;
      const prompt = `${svgText(10, 38, `How many cubes have exactly ${question.prompt.targetPaintedFaces} painted faces?`, 11)}${positionedSvg(question.prompt.figure.svg, 12, 45, promptWidth - 24, 202)}`;
      const choices = question.choices.map((choice, index) => textChoice(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), String(choice))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "CUBE STRUCTURE", prompt)}${choices}${header}</svg>`;
    }
    case "form-development": {
      const promptWidth = 296;
      const choiceWidth = (1223 - promptWidth) / 4;
      const prompt = `${svgText(10, 38, "Choose the solid formed by this pattern.", 11)}${positionedSvg(question.prompt.svg, 10, 45, promptWidth - 20, 202)}`;
      const choices = question.choices.map((choice, index) => cell(promptWidth + choiceWidth * index, choiceWidth, answerLetter(index), positionedSvg(choice.svg, promptWidth + choiceWidth * index + 10, 42, choiceWidth - 20, 205))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptWidth, "FLAT PATTERN", prompt)}${choices}${header}</svg>`;
    }
    default:
      return question satisfies never;
  }
};

const questionPage = (question: AnyPatQuestion, number: number): string => {
  const printBreak = number % 5 === 0 ? " print-break" : "";
  return `<article class="exam-question category-${escapeHtml(question.type)}${printBreak}" data-exam-question data-number="${number}" id="question-${number}">${rowSvg(question, number)}</article>`;
};

const style = String.raw`<style>
  :root{color-scheme:light;--ink:#171b18;--line:#b8c0ba;--paper:#fff;--muted:#f2f3f2}*{box-sizing:border-box}html{background:#e6e9e7}body{background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif;margin:0}
  .exam{background:var(--paper);margin:0 auto;max-width:1180px;padding:1rem}.exam-question{border-bottom:1px solid var(--line);padding:1.25rem 0}.question-header{align-items:center;display:flex;font-size:1rem;justify-content:space-between;margin-bottom:.7rem}.question-header span{font-weight:700}.question-layout{align-items:stretch;display:grid;gap:1rem;grid-template-columns:minmax(220px,1.25fr) minmax(0,5fr);min-height:285px}.prompt,.answer-options{min-width:0}.answer-options{display:flex}.question-copy{font-size:.95rem;line-height:1.3;margin:0 0 .45rem}.diagram{margin:.06rem}.diagram svg{display:block;height:auto;max-height:235px;max-width:100%;width:100%}.diagram figcaption{color:#4d5750;font-size:.72rem;margin-top:.12rem;text-align:center}.diagram-primary svg{max-height:215px}.given-views,.fold-steps{display:grid;gap:.35rem;grid-template-columns:repeat(2,minmax(0,1fr))}.fold-steps{grid-template-columns:repeat(auto-fit,minmax(95px,1fr))}.diagram-step{border:1px solid var(--line);padding:.1rem}.diagram-step svg{max-height:105px}
  .choices{display:grid;flex:1;gap:.28rem;grid-template-columns:repeat(4,minmax(0,1fr))}.choices-5{grid-template-columns:repeat(5,minmax(0,1fr))}.option{border:1px solid var(--line);display:grid;grid-template-rows:1fr 1.7rem;min-height:100%}.option-content{align-items:center;display:flex;justify-content:center;min-width:0;padding:.25rem}.option-letter{align-items:center;background:var(--muted);border-top:1px solid var(--line);display:flex;font-weight:700;justify-content:center}.diagram-choice{margin:0;width:100%}.diagram-choice svg{max-height:150px}.order-choice{font-size:.95rem;font-weight:700;text-align:center}.numeric-choice{font-size:1.15rem;font-weight:700}
  .category-angle .question-layout,.category-paper-folding .question-layout{display:flex;flex-direction:column;min-height:285px}.category-angle .prompt{flex:1}.category-angle .diagram-primary svg{max-height:185px}.category-angle .answer-options{min-height:70px}.category-angle .choices{grid-template-columns:repeat(4,minmax(0,1fr))}.category-angle .option{min-height:70px}.category-paper-folding .prompt{flex:1}.category-paper-folding .answer-options{min-height:135px}.category-paper-folding .diagram-choice svg{max-height:88px}.category-cube-counting .question-layout{grid-template-columns:minmax(230px,1.05fr) minmax(220px,.95fr)}.category-cube-counting .choices{grid-template-columns:1fr}.category-cube-counting .option{grid-template-columns:2.6rem 1fr;grid-template-rows:1fr;min-height:42px}.category-cube-counting .option-letter{border-right:1px solid var(--line);border-top:0;grid-column:1;grid-row:1}.category-cube-counting .option-content{grid-column:2;grid-row:1;justify-content:flex-start}.category-form-development .diagram-primary svg{max-height:215px}
  @page{size:letter portrait;margin:.25in}@media print{html,body{background:#fff}.exam{margin:0;max-width:none;padding:0}.exam-question{break-after:avoid;break-inside:avoid;height:2in;min-height:2in;margin:0;padding:.035in 0}.exam-question.print-break{break-after:page;page-break-after:always}.question-header{font-size:7pt;margin-bottom:.025in}.question-layout{gap:.06in;grid-template-columns:1.25fr 5fr;min-height:1.68in}.question-copy{font-size:6.5pt;line-height:1.12;margin:0 0 .02in}.diagram{margin:0}.diagram svg{max-height:1.15in}.diagram figcaption{font-size:5.5pt;margin-top:0}.diagram-primary svg{max-height:1.12in}.given-views,.fold-steps{gap:.03in}.fold-steps{grid-template-columns:repeat(4,minmax(0,1fr))}.diagram-step{padding:.01in}.diagram-step svg{max-height:.72in}.choices{gap:.025in}.option{grid-template-rows:1fr .18in}.option-content{padding:.025in}.option-letter{font-size:7pt}.diagram-choice svg{max-height:.92in}.diagram-choice figcaption{display:none}.order-choice{font-size:7pt}.numeric-choice{font-size:8pt}.category-angle .question-layout,.category-paper-folding .question-layout{min-height:1.68in}.category-angle .diagram-primary svg{max-height:.92in}.category-angle .answer-options{min-height:.4in}.category-angle .option{min-height:.4in}.category-paper-folding .answer-options{min-height:.54in}.category-paper-folding .diagram-choice svg{max-height:.35in}.category-cube-counting .question-layout{min-height:1.68in}.category-cube-counting .option{grid-template-columns:.25in 1fr;min-height:.31in}.category-cube-counting .option-letter{font-size:6pt}.category-cube-counting .numeric-choice{font-size:7pt}}
  @media screen and (max-width:700px){.exam{padding:.75rem}.exam-question{padding:1rem 0}.question-layout,.category-cube-counting .question-layout{display:block;min-height:0}.prompt{margin-bottom:.75rem}.choices,.choices-5,.category-angle .choices{grid-template-columns:repeat(2,minmax(0,1fr))}.option{min-height:140px}.category-angle .choices,.category-cube-counting .choices{grid-template-columns:1fr}.category-angle .option,.category-cube-counting .option{min-height:44px}.category-paper-folding .option{min-height:125px}.diagram svg{max-height:300px}}
  .exam-question{border-bottom:1px solid #c4cbc5;padding:1rem 0}.question-row{display:block;height:auto;width:100%}
  @page{size:letter portrait;margin:.25in}@media print{.exam-question{break-after:avoid;break-inside:avoid;height:2in;min-height:2in;margin:0;padding:.035in 0}.exam-question.print-break{break-after:page;page-break-after:always}.question-row{height:1.86in;width:100%}}
  @media screen and (max-width:700px){.question-row{min-width:760px}}
</style>`;

/* Deprecated interactive-exam implementation; the paper renderer below intentionally emits no runtime script. 
(() => {
  const embedded = document.getElementById("manipat-exam-data");
  if (!embedded) return;
  const exam = JSON.parse(embedded.textContent || "{}");
  const answers = new Map();
  const marked = new Set();
  const pages = [...document.querySelectorAll("[data-exam-question]")];
  let currentIndex = 0;
  const progress = document.getElementById("progress");
  const score = document.getElementById("score");
  const counter = document.getElementById("question-counter");
  const previous = document.getElementById("previous-question");
  const next = document.getElementById("next-question");
  const mark = document.getElementById("mark-question");
  const updateProgress = () => {
    if (progress) progress.textContent = answers.size + " / " + exam.questions.length + " answered";
  };
  const showQuestion = (index, shouldScroll = true) => {
    currentIndex = Math.max(0, Math.min(index, pages.length - 1));
    pages.forEach((page, pageIndex) => { page.hidden = pageIndex !== currentIndex; });
    document.querySelectorAll("button[data-goto]").forEach((button) => {
      const selected = Number(button.dataset.goto) === currentIndex;
      button.setAttribute("aria-current", String(selected));
      button.classList.toggle("marked", marked.has(Number(button.dataset.goto)));
    });
    if (counter) counter.textContent = "Question " + (currentIndex + 1) + " of " + pages.length;
    if (previous) previous.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === pages.length - 1;
    if (mark) {
      mark.classList.toggle("marked", marked.has(currentIndex));
      mark.textContent = marked.has(currentIndex) ? "Unmark review" : "Mark / review";
    }
    if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.querySelectorAll("input[data-question-id]").forEach((input) => input.addEventListener("change", () => {
    answers.set(input.dataset.questionId, Number(input.dataset.choiceIndex));
    updateProgress();
  }));
  if (previous) previous.addEventListener("click", () => showQuestion(currentIndex - 1));
  if (next) next.addEventListener("click", () => showQuestion(currentIndex + 1));
  if (mark) mark.addEventListener("click", () => {
    if (marked.has(currentIndex)) marked.delete(currentIndex); else marked.add(currentIndex);
    showQuestion(currentIndex, false);
  });
  document.querySelectorAll("button[data-goto]").forEach((button) => button.addEventListener("click", () => showQuestion(Number(button.dataset.goto))));
  const reveal = document.getElementById("reveal");
  if (reveal) reveal.addEventListener("click", () => {
    document.body.classList.add("answers-revealed");
    let correct = 0;
    exam.questions.forEach((question) => { if (answers.get(question.id) === question.correctChoiceIndex) correct += 1; });
    if (score) score.textContent = "Score: " + correct + " / " + exam.questions.length + " (" + answers.size + " answered)";
    document.body.classList.add("review-mode");
    reveal.textContent = "Review mode";
  });
  const returnToExam = document.getElementById("return-to-exam");
  if (returnToExam) returnToExam.addEventListener("click", () => document.body.classList.remove("review-mode"));
  document.querySelectorAll("button[data-print-mode]").forEach((button) => button.addEventListener("click", () => {
    document.body.dataset.printMode = button.dataset.printMode || "combined";
    window.print();
  }));
  const start = document.getElementById("start-timer");
  const timer = document.getElementById("timer");
  if (start && timer) start.addEventListener("click", () => {
    start.disabled = true;
    const deadline = Date.now() + 60 * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, deadline - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      timer.textContent = "Timer: " + minutes + ":" + String(seconds).padStart(2, "0");
      if (remaining > 0) window.setTimeout(tick, 250);
      else {
        document.querySelectorAll("input[data-question-id]").forEach((input) => { input.disabled = true; });
        if (score) score.textContent = "Time expired. Review answers when ready.";
      }
    };
    tick();
  });
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || document.body.classList.contains("review-mode")) return;
    const key = event.key.toUpperCase();
    if (key === "ARROWLEFT") { showQuestion(currentIndex - 1); return; }
    if (key === "ARROWRIGHT") { showQuestion(currentIndex + 1); return; }
    const choiceIndex = key.charCodeAt(0) - 65;
    const question = exam.questions[currentIndex];
    if (choiceIndex >= 0 && question && choiceIndex < question.choices.length) {
      const input = pages[currentIndex].querySelector('input[data-choice-index="' + choiceIndex + '"]');
      if (input && !input.disabled) input.click();
    }
  });
  updateProgress();
  showQuestion(0, false);
})();
*/

const safelyEmbedJson = (value: EmbeddedExam): string =>
  canonicalStringify(value as unknown as JsonValue)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

export const extractExamQuestions = (html: string): readonly AnyPatQuestion[] => {
  const expression = new RegExp(`<script id="${EXAM_DATA_SCRIPT_ID}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = expression.exec(html);
  if (match?.[1] === undefined) throw new Error("Not a ManipAT standalone exam HTML file");
  const parsed = JSON.parse(match[1]) as Partial<EmbeddedExam>;
  if (parsed.format !== "manipat-exam-html-v1" || !Array.isArray(parsed.questions)) {
    throw new Error("Standalone exam HTML has invalid embedded question data");
  }
  return parsed.questions as readonly AnyPatQuestion[];
};

export const renderExamHtml = (
  questions: readonly AnyPatQuestion[],
  options: ExamHtmlOptions,
): string => {
  const numbers = new Map(questions.map((question, index) => [question.id, index + 1]));
  const pages = questions.map((question) => questionPage(question, numbers.get(question.id) ?? 0)).join("");
  const embedded: EmbeddedExam = { format: "manipat-exam-html-v1", manifest: options, questions };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1" name="viewport"><title>ManipAT Perceptual Ability Practice Exam</title>${style}</head><body><main class="exam">${pages}</main><script id="${EXAM_DATA_SCRIPT_ID}" type="application/json">${safelyEmbedJson(embedded)}</script></body></html>`;
};

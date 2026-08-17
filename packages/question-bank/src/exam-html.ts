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
    directions: "Select the one opening the object can pass through.",
  },
  "view-recognition": {
    title: "View Recognition",
    directions: "Select the missing orthographic view.",
  },
  angle: {
    title: "Angle Discrimination",
    directions: "Rank angles 1\u20134 from smallest to largest.",
  },
  "paper-folding": {
    title: "Paper Folding",
    directions: "Select the hole pattern after unfolding.",
  },
  "cube-counting": {
    title: "Cube Counting",
    directions: "Select the requested cube count.",
  },
  "form-development": {
    title: "Spatial Relations",
    directions: "Select the solid formed by folding the flat pattern.",
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
  switch (question.type) {
    /* ── Apertures: 3D object left, 5 aperture outlines right ── */
    case "aperture": {
      const promptW = 240;
      const cw = (1223 - promptW) / 5;
      const prompt = positionedSvg(question.prompt.pictorialSvg, 6, 30, promptW - 12, 230);
      const choices = question.choices.map((c, i) =>
        cell(promptW + cw * i, cw, answerLetter(i), positionedSvg(c.svg, promptW + cw * i + 6, 30, cw - 12, 230))
      ).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptW, "", prompt)}${choices}</svg>`;
    }
    /* ── TFE: quadrant grid with cross lines + 4 answer views ── */
    case "view-recognition": {
      const panelW = 520;
      const cw = (1223 - panelW) / 4;
      const views = question.prompt.givenViews;
      const missing = question.prompt.missingView; // "top" | "front" | "end"
      // Cross lines — tight margins for maximum view size
      const cx = 260, cy = 136;
      const cross = `<line x1="4" y1="${cy}" x2="${panelW - 4}" y2="${cy}" stroke="#231f20" stroke-width="1.5"/><line x1="${cx}" y1="4" x2="${cx}" y2="270" stroke="#231f20" stroke-width="1.5"/>`;
      // Quadrant positions: [centerX, labelY] — all 4 quadrants
      const quads: Record<string, [number, number]> = {
        top: [cx / 2, 8], front: [cx / 2, cy + 4], end: [cx + (panelW - cx) / 2, cy + 4],
      };
      // Build all 4 quadrant contents: given views + missing "?"
      const allViewNames: Record<string, string> = { top: "TOP VIEW", front: "FRONT VIEW", end: "END VIEW" };
      const givenMap = new Map(views.map(v => [v.name, v]));
      const quadrants = Object.entries(quads).map(([name, [vx, vy]]) => {
        const label = allViewNames[name]!;
        const labelEl = svgText(vx - 24, vy + 6, label, 9, "start", "700");
        const given = givenMap.get(name as "top" | "front" | "end");
        if (given) {
          const sz = 126;
          return `${labelEl}${positionedSvg(given.svg, vx - sz / 2, vy + 8, sz, sz - 6)}`;
        }
        // Missing view: label + "?"
        return `${labelEl}${svgText(vx, vy + 84, "?", 32, "middle", "normal")}`;
      }).join("");
      const prompt = cross + quadrants;
      const choices = question.choices.map((c, i) =>
        cell(panelW + cw * i, cw, answerLetter(i), positionedSvg(c.svg, panelW + cw * i + 6, 30, cw - 12, 220))
      ).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, panelW, "", prompt)}${choices}</svg>`;
    }
    /* ── Angle: angles on left, text choices on right, with border ── */
    case "angle": {
      const angleW = 820;
      const border = `<rect x="2" y="2" width="1221" height="280" fill="none" stroke="#231f20" stroke-width="1.5" rx="2"/>`;
      const prompt = positionedSvg(question.prompt.svg, 0, 8, angleW, 268);
      const choiceX = angleW + 16;
      const choices = question.choices.map(({ order }, i) => {
        const ty = 46 + i * 42;
        return `${svgText(choiceX, ty, `${answerLetter(i)})`, 14, "start", "700")}${svgText(choiceX + 30, ty, order.join("  —  "), 14, "start", "normal")}`;
      }).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${border}${prompt}${choices}</svg>`;
    }
    /* ── Paper Folding: fold steps TOP ROW, answer choices BOTTOM ROW ── */
    case "paper-folding": {
      const steps = question.prompt.stepSvgs;
      const n = steps.length;
      const boxW = 130, boxH = 130, gap = 12;
      // Top row: fold steps (left-aligned)
      const stepsX = 20;
      const stepY = 26;
      const stepsBlock = steps.map((step, i) => {
        const sx = stepsX + i * (boxW + gap);
        const label = i === n - 1 ? "PUNCH" : `FOLD ${i + 1}`;
        return `${positionedSvg(step, sx, stepY, boxW, boxH - 16)}${svgText(sx + boxW / 2, stepY + boxH - 2, label, 9, "middle", "700")}`;
      }).join("");
      // Bottom row: answer choices (left-aligned)
      const cw = 130, ch = 130;
      const choiceX = 20;
      const choiceY = stepY + boxH + 20;
      const choices = question.choices.map((c, i) => {
        const cx = choiceX + i * (cw + gap);
        return `${positionedSvg(c.svg, cx, choiceY, cw, ch - 16)}${svgText(cx + cw / 2, choiceY + ch - 2, answerLetter(i), 11, "middle", "700")}`;
      }).join("");
      // Outer border
      const border = `<rect x="2" y="2" width="1221" height="316" fill="none" stroke="#231f20" stroke-width="1.5" rx="2"/>`;
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 320" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${border}${stepsBlock}${choices}</svg>`;
    }
    /* ── Cube Counting: figure left, question text + 5 text choices right ── */
    case "cube-counting": {
      const figW = 340;
      const prompt = positionedSvg(question.prompt.figure.svg, 10, 28, figW - 20, 240);
      const sideWord = question.prompt.targetPaintedFaces === 1 ? "side" : "sides";
      const qText = `How many cubes have exactly ${question.prompt.targetPaintedFaces} ${sideWord} painted?`;
      const choiceX = figW + 30;
      const questionText = svgText(choiceX, 52, qText, 16, "start", "700");
      const choices = question.choices.map((choice, i) => {
        const cy = 90 + i * 42;
        return `${svgText(choiceX, cy, `${answerLetter(i)})`, 16, "start", "700")}${svgText(choiceX + 34, cy, `${choice} cube${choice !== 1 ? "s" : ""}`, 16, "start", "normal")}`;
      }).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, figW, "", prompt)}${questionText}${choices}</svg>`;
    }
    /* ── Form Development: net left, 4 folded solids right ── */
    case "form-development": {
      const promptW = 296;
      const cw = (1223 - promptW) / 4;
      const prompt = positionedSvg(question.prompt.svg, 10, 30, promptW - 20, 230);
      const choices = question.choices.map((c, i) =>
        cell(promptW + cw * i, cw, answerLetter(i), positionedSvg(c.svg, promptW + cw * i + 10, 30, cw - 20, 230))
      ).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptW, "", prompt)}${choices}</svg>`;
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

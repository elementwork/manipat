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
    directions: "Select the one opening through which the object could pass.",
  },
  "view-recognition": {
    title: "View Recognition",
    directions: "Select the missing orthographic view. Solid lines are visible edges; dashed lines are hidden edges.",
  },
  angle: {
    title: "Angle Discrimination",
    directions: "Rank angles 1–4 from smallest to largest and select the matching order.",
  },
  "paper-folding": {
    title: "Paper Folding",
    directions: "Follow the folds and punch, then select the hole pattern produced after the paper is completely unfolded.",
  },
  "cube-counting": {
    title: "Cube Counting",
    directions: "All exposed faces except the bottom resting surface are painted. Use each figure for its associated questions.",
  },
  "form-development": {
    title: "Spatial Relations",
    directions: "Select the three-dimensional solid that can be formed by folding the flat pattern.",
  },
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const answerLetter = (index: number): string => String.fromCharCode(65 + index);

const svgText = (
  x: number,
  y: number,
  value: string,
  size = 14,
  anchor = "start",
  weight = "normal",
): string => `<text fill="#111" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" x="${x}" y="${y}">${escapeHtml(value)}</text>`;

const positionedSvg = (content: string, x: number, y: number, width: number, height: number): string =>
  content.replace("<svg", `<svg height="${height}" preserveAspectRatio="xMidYMid meet" width="${width}" x="${x}" y="${y}"`);

const cell = (x: number, width: number, label: string, artwork: string, height = 282): string =>
  `<rect fill="#fff" height="${height - 2}" stroke="#222" stroke-width="1.25" width="${width}" x="${x}" y="1"/>${artwork}${label.length === 0 ? "" : svgText(x + width / 2, height - 14, label, 15, "middle", "700")}`;

const rowSvg = (question: AnyPatQuestion, number: number): string => {
  const title = `${CATEGORY_DETAILS[question.type].title} — Question ${number}`;
  switch (question.type) {
    case "aperture": {
      const promptW = 240;
      const cw = (1223 - promptW) / 5;
      const prompt = positionedSvg(question.prompt.pictorialSvg, 10, 24, promptW - 20, 238);
      const choices = question.choices.map((choice, index) =>
        cell(promptW + cw * index, cw, answerLetter(index), positionedSvg(choice.svg, promptW + cw * index + 8, 24, cw - 16, 226))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptW, "", prompt)}${choices}</svg>`;
    }
    case "view-recognition": {
      const panelW = 500;
      const cw = (1223 - panelW) / 4;
      const cx = 250;
      const cy = 138;
      const views = new Map(question.prompt.givenViews.map((view) => [view.name, view]));
      const labels: Record<string, string> = { top: "TOP", front: "FRONT", end: "END" };
      const positions: Readonly<Record<"top" | "front" | "end", readonly [number, number]>> = {
        top: [125, 8],
        front: [125, 145],
        end: [375, 145],
      };
      const cross = `<line x1="4" y1="${cy}" x2="496" y2="${cy}" stroke="#222" stroke-width="1.2"/><line x1="${cx}" y1="4" x2="${cx}" y2="278" stroke="#222" stroke-width="1.2"/>`;
      const prompt = (Object.entries(positions) as Array<["top" | "front" | "end", readonly [number, number]]>).map(([name, [x, y]]) => {
        const view = views.get(name);
        const label = svgText(x, y + 12, labels[name] ?? name.toUpperCase(), 10, "middle", "700");
        if (view === undefined) return `${label}${svgText(x, y + 88, "?", 34, "middle")}`;
        return `${label}${positionedSvg(view.svg, x - 70, y + 16, 140, 108)}`;
      }).join("");
      const choices = question.choices.map((choice, index) =>
        cell(panelW + cw * index, cw, answerLetter(index), positionedSvg(choice.svg, panelW + cw * index + 8, 32, cw - 16, 216))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, panelW, "", `${cross}${prompt}`)}${choices}</svg>`;
    }
    case "angle": {
      const angleW = 820;
      const prompt = positionedSvg(question.prompt.svg, 4, 8, angleW - 8, 268);
      const choices = question.choices.map(({ order }, index) => {
        const y = 55 + index * 50;
        return `${svgText(angleW + 24, y, `${answerLetter(index)})`, 15, "start", "700")}${svgText(angleW + 58, y, order.join(" – "), 15)}`;
      }).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title><rect fill="#fff" height="282" stroke="#222" stroke-width="1.25" width="1223" x="1" y="1"/>${prompt}${choices}</svg>`;
    }
    case "paper-folding": {
      const steps = question.prompt.stepSvgs;
      const stepW = Math.min(176, 1060 / Math.max(1, steps.length));
      const gap = 10;
      const stepsBlock = steps.map((step, index) => {
        const x = 18 + index * (stepW + gap);
        const label = index === steps.length - 1 ? "PUNCH" : `FOLD ${index + 1}`;
        return `${positionedSvg(step, x, 18, stepW, 142)}${svgText(x + stepW / 2, 171, label, 10, "middle", "700")}`;
      }).join("");
      const choiceW = 158;
      const choiceGap = 18;
      const choiceStart = 18;
      const choices = question.choices.map((choice, index) => {
        const x = choiceStart + index * (choiceW + choiceGap);
        return `${positionedSvg(choice.svg, x, 190, choiceW, 152)}${svgText(x + choiceW / 2, 356, answerLetter(index), 11, "middle", "700")}`;
      }).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row question-row-paper" role="img" viewBox="0 0 1225 370" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title><rect fill="#fff" height="368" stroke="#222" stroke-width="1.25" width="1223" x="1" y="1"/>${stepsBlock}${choices}</svg>`;
    }
    case "cube-counting": {
      const figW = 355;
      const prompt = positionedSvg(question.prompt.figure.svg, 10, 22, figW - 20, 238);
      const sideWord = question.prompt.targetPaintedFaces === 1 ? "side" : "sides";
      const qText = `How many cubes have exactly ${question.prompt.targetPaintedFaces} ${sideWord} painted?`;
      const choices = question.choices.map((choice, index) =>
        `${svgText(figW + 30, 92 + index * 35, `${answerLetter(index)})`, 14, "start", "700")}${svgText(figW + 62, 92 + index * 35, String(choice), 14)}`).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, figW, "", prompt)}${svgText(figW + 30, 50, `Q${number}. ${qText}`, 15, "start", "700")}${choices}</svg>`;
    }
    case "form-development": {
      const promptW = 300;
      const cw = (1223 - promptW) / 4;
      const prompt = positionedSvg(question.prompt.svg, 12, 26, promptW - 24, 232);
      const choices = question.choices.map((choice, index) =>
        cell(promptW + cw * index, cw, answerLetter(index), positionedSvg(choice.svg, promptW + cw * index + 10, 28, cw - 20, 220))).join("");
      return `<svg aria-label="${escapeHtml(title)}" class="question-row" role="img" viewBox="0 0 1225 284" xmlns="http://www.w3.org/2000/svg"><title>${escapeHtml(title)}</title>${cell(0, promptW, "", prompt)}${choices}</svg>`;
    }
    default:
      return question satisfies never;
  }
};

const chunk = <T>(values: readonly T[], size: number): readonly (readonly T[])[] => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

const pageHeader = (type: PatQuestionType, pageIndex: number, pageCount: number): string => {
  const details = CATEGORY_DETAILS[type];
  return `<header class="section-header"><div><strong>${escapeHtml(details.title)}</strong><span>${escapeHtml(details.directions)}</span></div><small>Section page ${pageIndex + 1} of ${pageCount}</small></header>`;
};

const standardSectionPages = (
  type: PatQuestionType,
  questions: readonly AnyPatQuestion[],
  numberById: ReadonlyMap<string, number>,
): string => {
  const groups = chunk(questions, 5);
  return groups.map((group, pageIndex) => `<section class="exam-page category-${escapeHtml(type)}">${pageHeader(type, pageIndex, groups.length)}<div class="question-stack">${group.map((question) => `<article class="exam-question" data-exam-question data-number="${numberById.get(question.id) ?? 0}" id="question-${numberById.get(question.id) ?? 0}"><div class="question-number">${numberById.get(question.id) ?? 0}</div>${rowSvg(question, numberById.get(question.id) ?? 0)}</article>`).join("")}</div></section>`).join("");
};

const cubeGroup = (
  questions: readonly Extract<AnyPatQuestion, { readonly type: "cube-counting" }>[],
  numberById: ReadonlyMap<string, number>,
): string => {
  const first = questions[0];
  if (first === undefined) return "";
  const figure = positionedSvg(first.prompt.figure.svg, 12, 20, 350, 300);
  const rows = questions.map((question, index) => {
    const number = numberById.get(question.id) ?? 0;
    const sides = question.prompt.targetPaintedFaces;
    const sideWord = sides === 1 ? "side" : "sides";
    const y = 54 + index * 86;
    const choices = question.choices.map((choice, choiceIndex) => `${answerLetter(choiceIndex)}) ${choice}`).join("     ");
    return `${svgText(390, y, `${number}. How many cubes have exactly ${sides} ${sideWord} painted?`, 15, "start", "700")}${svgText(410, y + 35, choices, 14)}`;
  }).join("");
  return `<article class="cube-figure-group"><svg aria-label="Cube counting shared figure" class="cube-group-svg" role="img" viewBox="0 0 1225 330" xmlns="http://www.w3.org/2000/svg"><rect fill="#fff" height="328" stroke="#222" stroke-width="1.25" width="1223" x="1" y="1"/>${figure}${rows}</svg></article>`;
};

const cubeSectionPages = (
  questions: readonly Extract<AnyPatQuestion, { readonly type: "cube-counting" }>[],
  numberById: ReadonlyMap<string, number>,
): string => {
  const byFigure: Array<Array<Extract<AnyPatQuestion, { readonly type: "cube-counting" }>>> = [];
  for (const question of questions) {
    const last = byFigure.at(-1);
    if (last !== undefined && last[0]?.prompt.figure.id === question.prompt.figure.id) last.push(question);
    else byFigure.push([question]);
  }
  const pages = chunk(byFigure, 2);
  return pages.map((groups, pageIndex) => `<section class="exam-page category-cube-counting">${pageHeader("cube-counting", pageIndex, pages.length)}<div class="cube-stack">${groups.map((group) => cubeGroup(group, numberById)).join("")}</div></section>`).join("");
};

const answerSheet = (questions: readonly AnyPatQuestion[]): string => {
  const items = questions.map((question, index) => {
    const choices = Array.from({ length: question.choices.length }, (_, choiceIndex) => `<span>${answerLetter(choiceIndex)} ○</span>`).join("");
    return `<div class="answer-item"><b>${index + 1}</b>${choices}</div>`;
  }).join("");
  return `<section class="exam-page answer-sheet"><header class="section-header"><div><strong>Answer Sheet</strong><span>Mark one answer for each question.</span></div></header><div class="answer-grid">${items}</div></section>`;
};

const coverPage = (questions: readonly AnyPatQuestion[], options: ExamHtmlOptions): string => `<section class="exam-page cover-page"><div class="cover-content"><p class="eyebrow">ManipAT</p><h1>Perceptual Ability Practice Test</h1><p class="cover-meta">${questions.length} questions · 60 minutes · printable full set</p><div class="cover-rule"></div><h2>Instructions</h2><p>Work through all six sections in order. Choose the single best answer for each question. Use the separate answer sheet to record responses.</p><dl><div><dt>Seed</dt><dd>${escapeHtml(options.seed)}</dd></div><div><dt>Profile</dt><dd>${escapeHtml(options.profile)}</dd></div><div><dt>Difficulty</dt><dd>${escapeHtml(options.difficulty)}</dd></div></dl></div></section>`;

const style = String.raw`<style>
  :root{color-scheme:light;--ink:#111;--line:#222;--paper:#fff;--screen:#e8ebe9}*{box-sizing:border-box}html{background:var(--screen)}body{background:var(--screen);color:var(--ink);font-family:Arial,Helvetica,sans-serif;margin:0}.exam{margin:0 auto;max-width:8.5in}.exam-page{background:#fff;box-shadow:0 2px 14px #0002;margin:18px auto;min-height:11in;padding:.28in;width:8.5in}.section-header{align-items:flex-start;border-bottom:1.5px solid #111;display:flex;justify-content:space-between;margin-bottom:.1in;padding-bottom:.07in}.section-header div{display:flex;flex-direction:column;gap:2px}.section-header strong{font-size:13pt}.section-header span{font-size:7.5pt;line-height:1.25;max-width:6.6in}.section-header small{font-size:7pt;white-space:nowrap}.question-stack{display:flex;flex-direction:column}.exam-question{height:1.93in;position:relative}.question-number{font-size:7pt;font-weight:700;left:3px;position:absolute;top:3px;z-index:2}.question-row{display:block;height:100%;width:100%}.category-paper-folding .exam-question{height:1.93in}.cube-stack{display:flex;flex-direction:column;gap:.1in}.cube-figure-group{height:4.75in}.cube-group-svg{display:block;height:100%;width:100%}.cover-page{align-items:center;display:flex;justify-content:center}.cover-content{max-width:6.6in}.eyebrow{font-size:11pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.cover-content h1{font-size:28pt;margin:.1in 0}.cover-meta{font-size:12pt}.cover-rule{border-top:2px solid #111;margin:.45in 0}.cover-content h2{font-size:15pt}.cover-content p{font-size:10pt;line-height:1.5}.cover-content dl{border-top:1px solid #777;margin-top:.4in;padding-top:.2in}.cover-content dl div{display:grid;font-size:9pt;grid-template-columns:1.2in 1fr;margin:.08in 0}.cover-content dt{font-weight:700}.cover-content dd{margin:0}.answer-grid{display:grid;gap:.08in .18in;grid-template-columns:repeat(3,1fr);padding-top:.08in}.answer-item{align-items:center;border-bottom:1px solid #bbb;display:grid;font-size:8.5pt;grid-template-columns:.3in repeat(5,1fr);min-height:.25in}.answer-item span{text-align:center}
  @page{size:letter portrait;margin:0}@media print{html,body{background:#fff}.exam{margin:0;max-width:none}.exam-page{break-after:page;box-shadow:none;margin:0;min-height:11in;page-break-after:always;padding:.28in;width:8.5in}.exam-page:last-child{break-after:auto;page-break-after:auto}.exam-question,.cube-figure-group{break-inside:avoid;page-break-inside:avoid}}
  @media screen and (max-width:850px){.exam{max-width:100%;overflow:auto}.exam-page{margin:8px 0;min-width:8.5in}}
</style>`;

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
  const numberById = new Map(questions.map((question, index) => [question.id, index + 1]));
  const categoryOrder: readonly PatQuestionType[] = ["aperture", "view-recognition", "angle", "paper-folding", "cube-counting", "form-development"];
  const sections = categoryOrder.map((type) => {
    const categoryQuestions = questions.filter((question) => question.type === type);
    if (categoryQuestions.length === 0) return "";
    if (type === "cube-counting") {
      return cubeSectionPages(categoryQuestions as readonly Extract<AnyPatQuestion, { readonly type: "cube-counting" }>[], numberById);
    }
    return standardSectionPages(type, categoryQuestions, numberById);
  }).join("");
  const embedded: EmbeddedExam = { format: "manipat-exam-html-v1", manifest: options, questions };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta content="width=device-width,initial-scale=1" name="viewport"><title>ManipAT Perceptual Ability Practice Test</title>${style}</head><body><main class="exam">${coverPage(questions, options)}${sections}${answerSheet(questions)}</main><script id="${EXAM_DATA_SCRIPT_ID}" type="application/json">${safelyEmbedJson(embedded)}</script></body></html>`;
};

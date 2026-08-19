import {
  correctAnswerDisplay,
  renderQuestionExplanationHtml,
  type AnyPatQuestion,
} from "@manipat/question-bank";

const PORTABLE_MODE_META = '<meta name="manipat-viewer-mode" content="portable">';

interface StudyQuestionData {
  readonly number: number;
  readonly id: string;
  readonly type: AnyPatQuestion["type"];
  readonly answer: string;
  readonly explanationHtml: string;
  readonly interactive: boolean;
}

const escapedInlineJson = (value: unknown): string => JSON.stringify(value)
  .replaceAll("&", "\\u0026")
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e");

const studyStyles = `<style id="manipat-study-styles">
#manipat-study-launcher{position:fixed;right:18px;bottom:18px;z-index:8000;border:1px solid #8a99aa;border-radius:999px;background:#fff;padding:10px 16px;font:600 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:#27313a;box-shadow:0 4px 18px rgba(0,0,0,.16);cursor:pointer}#manipat-study-launcher:hover{background:#f3f6f8}.manipat-study-backdrop{position:fixed;inset:0;z-index:8100;background:rgba(20,25,30,.28)}.manipat-study-drawer{position:fixed;z-index:8200;right:0;top:0;bottom:0;width:min(470px,calc(100vw - 24px));background:#fff;border-left:1px solid #d8dde3;box-shadow:-6px 0 24px rgba(0,0,0,.15);display:flex;flex-direction:column;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#20242a}.manipat-study-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e0e4e8}.manipat-study-header strong{font-size:16px}.manipat-study-header span{font-size:12px;color:#68727c;margin-right:auto}.manipat-study-close,.manipat-study-button,.manipat-study-nav button,.manipat-study-select{font:inherit;border:1px solid #c8cdd3;border-radius:7px;background:#fff;color:#20242a;padding:8px 10px}.manipat-study-close,.manipat-study-button,.manipat-study-nav button{cursor:pointer}.manipat-study-close:hover,.manipat-study-button:hover,.manipat-study-nav button:hover{background:#f2f4f6}.manipat-study-button:disabled{opacity:.45;cursor:not-allowed}.manipat-study-body{padding:14px 16px 24px;overflow:auto}.manipat-study-nav{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;margin-bottom:12px}.manipat-study-select{min-width:0;width:100%}.manipat-study-meta{font-size:12px;color:#65707a;margin:0 0 12px}.manipat-study-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.manipat-study-actions .manipat-study-hint{grid-column:1/-1;background:#edf5fb;border-color:#a9c5d8;color:#244b65}.manipat-study-answer,.manipat-study-explanation{margin-top:12px;border:1px solid #dce1e6;border-radius:8px;padding:12px;background:#fbfcfd}.manipat-study-answer strong{font-size:18px}.manipat-study-explanation{font-size:13px;line-height:1.45}.manipat-study-explanation h4{font-size:13px;margin:10px 0 4px}.manipat-study-explanation p{margin:5px 0 8px}.manipat-study-explanation ul{margin:4px 0 6px 18px;padding:0}.manipat-study-explanation li{margin:3px 0}.manipat-study-tip{margin-top:14px;padding-top:10px;border-top:1px solid #eceff2;color:#6d7680;font-size:11px;line-height:1.4}.manipat-hint-modal{position:fixed;inset:0;z-index:9000;background:rgba(12,16,20,.72);display:flex;align-items:center;justify-content:center;padding:18px}.manipat-hint-shell{width:min(1500px,96vw);height:min(980px,94vh);background:#fff;border-radius:10px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 12px 44px rgba(0,0,0,.3)}.manipat-hint-header{display:flex;align-items:center;gap:12px;padding:9px 12px;border-bottom:1px solid #d8dde3;font:13px system-ui,-apple-system,"Segoe UI",sans-serif}.manipat-hint-header strong{margin-right:auto}.manipat-hint-frame{width:100%;height:100%;border:0;background:#f8f9fa}.manipat-study-hidden{display:none!important}@media(max-width:640px){#manipat-study-launcher{right:12px;bottom:12px}.manipat-study-drawer{width:100vw}.manipat-hint-modal{padding:0}.manipat-hint-shell{width:100vw;height:100vh;border-radius:0}.manipat-study-actions{grid-template-columns:1fr}}@media print{#manipat-study-launcher,.manipat-study-backdrop,.manipat-study-drawer,.manipat-hint-modal{display:none!important}}
</style>`;

const studyMarkup = `<button id="manipat-study-launcher" type="button">Study Tools</button>
<div id="manipat-study-backdrop" class="manipat-study-backdrop manipat-study-hidden"></div>
<aside id="manipat-study-drawer" class="manipat-study-drawer manipat-study-hidden" aria-label="ManipAT study tools">
  <header class="manipat-study-header"><strong>Study Tools</strong><span>Answers · explanations · interactive hints</span><button id="manipat-study-close" class="manipat-study-close" type="button">Close</button></header>
  <div class="manipat-study-body">
    <div class="manipat-study-nav"><button id="manipat-study-prev" type="button">←</button><select id="manipat-study-question" class="manipat-study-select" aria-label="Study question"></select><button id="manipat-study-next" type="button">→</button></div>
    <p id="manipat-study-meta" class="manipat-study-meta"></p>
    <div class="manipat-study-actions">
      <button id="manipat-check-answer" class="manipat-study-button" type="button">Check Answer</button>
      <button id="manipat-show-explanation" class="manipat-study-button" type="button">Show Explanation</button>
      <button id="manipat-interactive-hint" class="manipat-study-button manipat-study-hint" type="button">Interactive Hint</button>
    </div>
    <div id="manipat-study-answer" class="manipat-study-answer manipat-study-hidden"></div>
    <div id="manipat-study-explanation" class="manipat-study-explanation manipat-study-hidden"></div>
    <div class="manipat-study-tip">Interactive views are optional learning aids. They do not change the canonical question, correct answer, or solver truth. The printable exam remains unchanged when this file is printed.</div>
  </div>
</aside>
<div id="manipat-hint-modal" class="manipat-hint-modal manipat-study-hidden" role="dialog" aria-modal="true" aria-label="Interactive hint viewer">
  <div class="manipat-hint-shell"><header class="manipat-hint-header"><strong>Interactive Hint</strong><span id="manipat-hint-meta"></span><button id="manipat-hint-close" class="manipat-study-close" type="button">Close</button></header><iframe id="manipat-hint-frame" class="manipat-hint-frame" title="ManipAT interactive hint"></iframe></div>
</div>`;

const studyScript = `<script>
(() => {
  const data = JSON.parse(document.getElementById("manipat-study-data").textContent);
  const launcher = document.getElementById("manipat-study-launcher");
  const backdrop = document.getElementById("manipat-study-backdrop");
  const drawer = document.getElementById("manipat-study-drawer");
  const close = document.getElementById("manipat-study-close");
  const select = document.getElementById("manipat-study-question");
  const previous = document.getElementById("manipat-study-prev");
  const next = document.getElementById("manipat-study-next");
  const meta = document.getElementById("manipat-study-meta");
  const checkAnswer = document.getElementById("manipat-check-answer");
  const showExplanation = document.getElementById("manipat-show-explanation");
  const hint = document.getElementById("manipat-interactive-hint");
  const answer = document.getElementById("manipat-study-answer");
  const explanation = document.getElementById("manipat-study-explanation");
  const hintModal = document.getElementById("manipat-hint-modal");
  const hintClose = document.getElementById("manipat-hint-close");
  const hintFrame = document.getElementById("manipat-hint-frame");
  const hintMeta = document.getElementById("manipat-hint-meta");
  const labels = { aperture:"Aperture", "view-recognition":"TFE", angle:"Angle", "paper-folding":"Paper Punching", "cube-counting":"Cube Counting", "form-development":"Form Development" };
  let active = 0;
  let answerVisible = false;
  let explanationVisible = false;
  let viewerLoaded = false;

  const decodeBase64Utf8 = (encoded) => {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const selected = () => data.questions[active];
  const hintLabel = (question) => question.type === "paper-folding" ? "Explore folding" : "Explore in 3D";
  const postHintSelection = () => {
    const question = selected();
    if (!viewerLoaded || question === undefined || !question.interactive) return;
    hintFrame.contentWindow?.postMessage({ type:"manipat-select-question", questionId:question.id }, "*");
  };
  const sync = (scrollToQuestion = false) => {
    const question = selected();
    if (question === undefined) return;
    select.value = String(active);
    previous.disabled = active === 0;
    next.disabled = active === data.questions.length - 1;
    meta.textContent = "Question " + String(question.number) + " · " + (labels[question.type] ?? question.type) + " · " + question.id;
    answer.innerHTML = "<span>Correct answer</span><br><strong>" + question.answer + "</strong>";
    explanation.innerHTML = question.explanationHtml;
    answer.classList.toggle("manipat-study-hidden", !answerVisible);
    explanation.classList.toggle("manipat-study-hidden", !explanationVisible);
    checkAnswer.textContent = answerVisible ? "Hide Answer" : "Check Answer";
    showExplanation.textContent = explanationVisible ? "Hide Explanation" : "Show Explanation";
    hint.disabled = !question.interactive;
    hint.textContent = question.interactive ? hintLabel(question) : "No interactive hint for this 2D category";
    hintMeta.textContent = "Question " + String(question.number) + " · " + (labels[question.type] ?? question.type);
    if (scrollToQuestion) document.getElementById("question-" + String(question.number))?.scrollIntoView({ behavior:"smooth", block:"center" });
    postHintSelection();
  };
  const setActive = (index, scrollToQuestion = false) => {
    active = Math.min(data.questions.length - 1, Math.max(0, index));
    answerVisible = false;
    explanationVisible = false;
    sync(scrollToQuestion);
  };
  const openDrawer = () => {
    drawer.classList.remove("manipat-study-hidden");
    backdrop.classList.remove("manipat-study-hidden");
    sync(false);
  };
  const closeDrawer = () => {
    drawer.classList.add("manipat-study-hidden");
    backdrop.classList.add("manipat-study-hidden");
  };
  const closeHint = () => hintModal.classList.add("manipat-study-hidden");

  data.questions.forEach((question, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = "Q" + String(question.number) + " · " + (labels[question.type] ?? question.type);
    select.append(option);
  });
  document.querySelectorAll("[data-exam-question][data-number]").forEach((element) => {
    element.addEventListener("click", () => {
      const number = Number(element.getAttribute("data-number"));
      if (Number.isInteger(number) && number > 0) active = number - 1;
      if (!drawer.classList.contains("manipat-study-hidden")) sync(false);
    });
  });

  launcher.addEventListener("click", openDrawer);
  close.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  select.addEventListener("change", () => setActive(Number(select.value), true));
  previous.addEventListener("click", () => setActive(active - 1, true));
  next.addEventListener("click", () => setActive(active + 1, true));
  checkAnswer.addEventListener("click", () => { answerVisible = !answerVisible; sync(false); });
  showExplanation.addEventListener("click", () => {
    explanationVisible = !explanationVisible;
    if (explanationVisible) answerVisible = true;
    sync(false);
  });
  hint.addEventListener("click", () => {
    const question = selected();
    if (question === undefined || !question.interactive) return;
    hintModal.classList.remove("manipat-study-hidden");
    if (!viewerLoaded) hintFrame.srcdoc = decodeBase64Utf8(data.viewerHtmlBase64);
    else postHintSelection();
  });
  hintFrame.addEventListener("load", () => { viewerLoaded = true; postHintSelection(); });
  hintClose.addEventListener("click", closeHint);
  hintModal.addEventListener("click", (event) => { if (event.target === hintModal) closeHint(); });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!hintModal.classList.contains("manipat-study-hidden")) closeHint();
    else closeDrawer();
  });
  sync(false);
})();
</script>`;

export const buildPortableStudyExam = (
  sourceHtml: string,
  questions: readonly AnyPatQuestion[],
  interactiveQuestionIds: ReadonlySet<string>,
  viewerHtml: string,
): string => {
  if (questions.length === 0) throw new RangeError("Portable study exam requires at least one question");
  if (!sourceHtml.includes("</head>") || !sourceHtml.includes("</body>")) {
    throw new Error("Source exam HTML is missing head/body closing tags");
  }
  const studyQuestions: readonly StudyQuestionData[] = questions.map((question, index) => ({
    number: index + 1,
    id: question.id,
    type: question.type,
    answer: correctAnswerDisplay(question),
    explanationHtml: renderQuestionExplanationHtml(question),
    interactive: interactiveQuestionIds.has(question.id),
  }));
  const data = {
    questions: studyQuestions,
    viewerHtmlBase64: Buffer.from(viewerHtml, "utf8").toString("base64"),
  };
  const dataScript = `<script id="manipat-study-data" type="application/json">${escapedInlineJson(data)}</script>`;
  const html = sourceHtml
    .replace("<title>ManipAT Perceptual Ability Practice Test</title>", "<title>ManipAT Portable Study Exam</title>")
    .replace("</head>", `${PORTABLE_MODE_META}${studyStyles}</head>`)
    .replace("</body>", `${studyMarkup}${dataScript}${studyScript}</body>`);
  if (!html.includes(PORTABLE_MODE_META)) throw new Error("Portable study mode marker was not injected");
  return html;
};

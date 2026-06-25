"use strict";

/* ============================================================
   Konjugations-Engine
   Wir brauchen pro Verb 4 Grundformen (alle in der 1. Person "I"):
     base  -> work          (Grundverb)
     ing   -> working       (-ing-Form)
     past  -> worked        (Past Simple)
     pp    -> worked        (3. Verbform / Partizip)
   Daraus baut sich das ganze 4x4-Raster zusammen.
============================================================ */

// Häufige unregelmäßige Verben: [pastSimple, pastParticiple, (optional) ingOverride]
const IRREGULAR = {
  be:    ["was", "been", "being"],
  have:  ["had", "had"],
  do:    ["did", "done"],
  go:    ["went", "gone"],
  make:  ["made", "made"],
  take:  ["took", "taken"],
  get:   ["got", "gotten"],
  give:  ["gave", "given"],
  see:   ["saw", "seen"],
  eat:   ["ate", "eaten"],
  drink: ["drank", "drunk"],
  write: ["wrote", "written"],
  read:  ["read", "read"],
  run:   ["ran", "run"],
  come:  ["came", "come"],
  find:  ["found", "found"],
  think: ["thought", "thought"],
  know:  ["knew", "known"],
  speak: ["spoke", "spoken"],
  bring: ["brought", "brought"],
  buy:   ["bought", "bought"],
  teach: ["taught", "taught"],
  say:   ["said", "said"],
  tell:  ["told", "told"],
  feel:  ["felt", "felt"],
  leave: ["left", "left"],
  meet:  ["met", "met"],
  sit:   ["sat", "sat"],
  stand: ["stood", "stood"],
  drive: ["drove", "driven"],
  fly:   ["flew", "flown"],
  swim:  ["swam", "swum"],
  sing:  ["sang", "sung"],
  begin: ["began", "begun"],
  break: ["broke", "broken"],
  choose:["chose", "chosen"],
  forget:["forgot", "forgotten"],
  win:   ["won", "won"],
  sleep: ["slept", "slept"],
  pay:   ["paid", "paid"],
};

const VOWELS = "aeiou";

function endsCVC(w) {
  // consonant-vowel-consonant am Ende, letzter Buchstabe nicht w/x/y
  if (w.length < 3) return false;
  const a = w[w.length - 3], b = w[w.length - 2], c = w[w.length - 1];
  return !VOWELS.includes(a) && VOWELS.includes(b) &&
         !VOWELS.includes(c) && !"wxy".includes(c);
}

function makeIng(base) {
  const w = base.toLowerCase();
  if (w.endsWith("ie")) return w.slice(0, -2) + "ying"; // die -> dying
  if (w.endsWith("ee")) return w + "ing";               // see -> seeing
  if (w.endsWith("e") && w.length > 2) return w.slice(0, -1) + "ing"; // make -> making
  if (endsCVC(w)) return w + w[w.length - 1] + "ing";    // run -> running
  return w + "ing";
}

function makeRegularPast(base) {
  const w = base.toLowerCase();
  if (w.endsWith("e")) return w + "d";                                  // like -> liked
  if (w.endsWith("y") && !VOWELS.includes(w[w.length - 2])) return w.slice(0, -1) + "ied"; // study -> studied
  if (endsCVC(w)) return w + w[w.length - 1] + "ed";                    // stop -> stopped
  return w + "ed";
}

// Liefert die 4 Grundformen für ein Verb
function getForms(rawVerb) {
  const base = (rawVerb || "").trim().toLowerCase() || "work";
  const irr = IRREGULAR[base];
  const past = irr ? irr[0] : makeRegularPast(base);
  const pp = irr ? irr[1] : makeRegularPast(base);
  const ing = irr && irr[2] ? irr[2] : makeIng(base);
  return { base, ing, past, pp };
}

/* ============================================================
   Das Raster: Zeiten x Aspekte
============================================================ */
const TIMES = [
  { key: "present",     label: "Present",     css: "t-present" },
  { key: "past",        label: "Past",        css: "t-past" },
  { key: "future",      label: "Future",      css: "t-future" },
  { key: "conditional", label: "Conditional", css: "t-conditional" },
];

const ASPECTS = [
  { key: "simple",             label: "Simple" },
  { key: "progressive",        label: "Progressive" },
  { key: "perfect",            label: "Perfect" },
  { key: "perfectProgressive", label: "Perfect Progressive" },
];

// Aspekt-Endungen (was hinten dran kommt)
const ASPECT_FORMULA = {
  simple:             "Grundverb",
  progressive:        "be + -ing",
  perfect:            "have + 3. Form",
  perfectProgressive: "have been + -ing",
};

// Passiv: be (in der Zeitform) + 3. Form. Die Zeit steckt komplett im "be".
const ASPECT_FORMULA_PASSIVE = {
  simple:             "be + 3. Form",
  progressive:        "be being + 3. Form",
  perfect:            "have been + 3. Form",
  perfectProgressive: "have been being + 3. Form",
};

// Zeit-Anfänge (be-Marker / have-Marker)
const TIME_MARKER = {
  present:     { be: "am",        have: "have",        word: "have/has" },
  past:        { be: "was",       have: "had",         word: "had" },
  future:      { be: "will be",   have: "will have",   word: "will have" },
  conditional: { be: "would be",  have: "would have",  word: "would have" },
};

// Das be-Hilfsverb für eine Zelle (am / was being / have been / have been being ...)
function beAux(timeKey, aspectKey) {
  const m = TIME_MARKER[timeKey];
  switch (aspectKey) {
    case "simple":             return m.be;                  // am · was · will be · would be
    case "progressive":        return m.be + " being";       // am being ...
    case "perfect":            return m.have + " been";      // have been ...
    case "perfectProgressive": return m.have + " been being";
  }
  return "";
}

// Baut den Satz für eine Zelle (immer "I ...")
function buildForm(timeKey, aspectKey, f, voice = currentVoice) {
  if (voice === "passive") return `I ${beAux(timeKey, aspectKey)} ${f.pp}`;
  const m = TIME_MARKER[timeKey];
  const beenMarker = m.have + " been"; // have been / had been / will have been / would have been
  switch (timeKey + "." + aspectKey) {
    case "present.simple":             return `I ${f.base}`;
    case "past.simple":                return `I ${f.past}`;
    case "future.simple":              return `I will ${f.base}`;
    case "conditional.simple":         return `I would ${f.base}`;
  }
  switch (aspectKey) {
    case "progressive":        return `I ${m.be} ${f.ing}`;
    case "perfect":            return `I ${m.have} ${f.pp}`;
    case "perfectProgressive": return `I ${beenMarker} ${f.ing}`;
  }
  return "";
}

// Kurzes "Rezept" zur Herleitung
function buildRecipe(timeKey, aspectKey, f, voice = currentVoice) {
  if (voice === "passive") {
    const aux = beAux(timeKey, aspectKey);
    return `Anfang: ${aux} · Endung: 3. Form → ${aux} ${f.pp}`;
  }
  const m = TIME_MARKER[timeKey];
  switch (aspectKey) {
    case "simple":
      if (timeKey === "present")     return `Anfang: — · Endung: Grundverb → ${f.base}`;
      if (timeKey === "past")        return `Anfang: — · Endung: Past Simple → ${f.past}`;
      if (timeKey === "future")      return `Anfang: will · Endung: Grundverb → will ${f.base}`;
      return `Anfang: would · Endung: Grundverb → would ${f.base}`;
    case "progressive":
      return `Anfang: ${m.be} · Endung: -ing → ${m.be} ${f.ing}`;
    case "perfect":
      return `Anfang: ${m.have} · Endung: 3. Form → ${m.have} ${f.pp}`;
    case "perfectProgressive":
      return `Anfang: ${m.have} been · Endung: -ing → ${m.have} been ${f.ing}`;
  }
  return "";
}

/* ============================================================
   State + DOM
============================================================ */
const PRESETS = ["work", "go", "make", "be", "have", "take", "write", "study"];
let currentVerb = "work";
let currentVoice = "active"; // "active" | "passive"

const $ = (sel) => document.querySelector(sel);
const verbInput = $("#verb-input");

function forms() { return getForms(currentVerb); }

/* ---- Verb-Presets ---- */
function renderPresets() {
  const box = $("#verb-presets");
  box.innerHTML = "";
  PRESETS.forEach((v) => {
    const b = document.createElement("button");
    b.textContent = v;
    b.classList.toggle("active", v === currentVerb);
    b.addEventListener("click", () => {
      currentVerb = v;
      verbInput.value = v;
      refreshAll();
    });
    box.appendChild(b);
  });
}

/* ---- Baukasten ---- */
function renderKit() {
  const passive = currentVoice === "passive";
  const aspectFormulas = passive ? ASPECT_FORMULA_PASSIVE : ASPECT_FORMULA;
  const aspectList = $("#aspect-kit");
  aspectList.innerHTML = "";
  ASPECTS.forEach((a) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="label">${a.label}</span><span class="formula">${aspectFormulas[a.key]}</span>`;
    aspectList.appendChild(li);
  });
  const timeList = $("#time-kit");
  timeList.innerHTML = "";
  TIMES.forEach((t) => {
    const m = TIME_MARKER[t.key];
    const li = document.createElement("li");
    li.innerHTML = `<span class="label"><span class="time-tag ${t.css}"></span>${t.label}</span><span class="formula">${m.be} · ${m.word}</span>`;
    timeList.appendChild(li);
  });

  // Hinweis zu seltenen Passiv-Formen
  const note = $("#voice-note");
  if (passive) {
    note.hidden = false;
    note.textContent = "Passiv = be (in der Zeitform) + 3. Form — die Zeit steckt komplett im „be\u201c. Hinweis: Die Progressive-Perfekt-Formen (z. B. „I have been being worked“) sind grammatisch korrekt, im echten Englisch aber sehr selten.";
  } else {
    note.hidden = true;
  }
}

/* ---- Tabelle ---- */
function renderTable() {
  const f = forms();
  const thead = $("#tense-table thead");
  const tbody = $("#tense-table tbody");

  let head = "<tr><th></th>";
  ASPECTS.forEach((a, i) => {
    head += `<th data-col="${i}">${a.label}</th>`;
  });
  head += "</tr>";
  thead.innerHTML = head;

  let body = "";
  TIMES.forEach((t) => {
    body += `<tr data-time="${t.key}"><th><span class="time-tag ${t.css}"></span>${t.label}</th>`;
    ASPECTS.forEach((a) => {
      body += `<td>${buildForm(t.key, a.key, f)}</td>`;
    });
    body += "</tr>";
  });
  tbody.innerHTML = body;

  const table = $("#tense-table");
  // Spalten-Hover
  thead.querySelectorAll("th[data-col]").forEach((th) => {
    const col = th.dataset.col;
    th.addEventListener("mouseenter", () => {
      table.className = "hl-col-" + col;
    });
    th.addEventListener("mouseleave", () => { table.className = ""; });
  });
  // Zeilen-Hover
  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("mouseenter", () => tr.classList.add("row-hl"));
    tr.addEventListener("mouseleave", () => tr.classList.remove("row-hl"));
  });
}

/* ---- Drill ---- */
let drillIndex = 0;

function drillSequence() {
  const order = $("#drill-order").value;
  const seq = [];
  if (order === "column") {
    ASPECTS.forEach((a) => TIMES.forEach((t) => seq.push([t, a])));
  } else {
    TIMES.forEach((t) => ASPECTS.forEach((a) => seq.push([t, a])));
  }
  return seq;
}

function speak(text) {
  if (!$("#drill-speak").checked) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

function renderDrill(doSpeak) {
  const f = forms();
  const seq = drillSequence();
  if (drillIndex < 0) drillIndex = 0;
  if (drillIndex >= seq.length) drillIndex = seq.length - 1;
  const [t, a] = seq[drillIndex];
  const formStr = buildForm(t.key, a.key, f);

  $("#drill-coords").innerHTML =
    `<span class="badge"><span class="time-tag ${t.css}"></span>${t.label}</span>` +
    `<span class="badge">${a.label}</span>`;
  $("#drill-form").textContent = formStr;
  $("#drill-recipe").textContent = buildRecipe(t.key, a.key, f);
  $("#drill-progress").textContent = `${drillIndex + 1} / ${seq.length}`;
  $("#drill-prev").disabled = drillIndex === 0;
  $("#drill-next").textContent = drillIndex === seq.length - 1 ? "Fertig — von vorn" : "Weiter";

  if (doSpeak) speak(formStr.replace(/^I /, "I "));
}

/* ---- Quiz ---- */
let quizCurrent = null;
let quizCorrect = 0;
let quizTotal = 0;
let quizStreak = 0;

function normalize(s) {
  return s.trim().toLowerCase()
    .replace(/^i\s+/, "")        // führendes "I" weg
    .replace(/\s+/g, " ");
}

function newQuiz() {
  const t = TIMES[Math.floor(Math.random() * TIMES.length)];
  const a = ASPECTS[Math.floor(Math.random() * ASPECTS.length)];
  quizCurrent = { t, a };
  const voiceLabel = currentVoice === "passive" ? ` · <span class="coord">Passiv</span>` : "";
  $("#quiz-prompt").innerHTML =
    `Bilde: <span class="coord">${t.label}</span> · <span class="coord">${a.label}</span>${voiceLabel} ` +
    `von <span class="verb-token">to ${forms().base}</span>`;
  $("#quiz-input").value = "";
  $("#quiz-feedback").textContent = "";
  $("#quiz-feedback").className = "quiz-feedback";
  $("#quiz-recipe").textContent = "";
  $("#quiz-input").focus();
}

function checkQuiz(e) {
  e.preventDefault();
  if (!quizCurrent) return;
  const f = forms();
  const expected = buildForm(quizCurrent.t.key, quizCurrent.a.key, f);
  const fb = $("#quiz-feedback");
  quizTotal++;

  if (normalize($("#quiz-input").value) === normalize(expected)) {
    quizCorrect++;
    quizStreak++;
    fb.textContent = "Richtig: " + expected;
    fb.className = "quiz-feedback good";
    updateScore();
    setTimeout(newQuiz, 850);
  } else {
    quizStreak = 0;
    fb.innerHTML = `Nicht ganz. Richtig: <span class="correct-form">${expected}</span>`;
    fb.className = "quiz-feedback bad";
    $("#quiz-recipe").textContent = buildRecipe(quizCurrent.t.key, quizCurrent.a.key, f);
    updateScore();
  }
}

function updateScore() {
  $("#quiz-correct").textContent = quizCorrect;
  $("#quiz-total").textContent = quizTotal;
  $("#quiz-streak").textContent = quizStreak >= 3 ? `Serie: ${quizStreak}` : "";
}

/* ============================================================
   Verdrahtung
============================================================ */
function activeTabKey() {
  const el = document.querySelector(".nav-item.active");
  return el ? el.dataset.tab : "table";
}

// Baukasten + Passiv-Hinweis nur außerhalb der Anleitungsseite zeigen
function setKitVisibility(tabKey) {
  const onGuide = tabKey === "guide";
  $("#kit-card").hidden = onGuide;
  $("#voice-note").hidden = onGuide || currentVoice !== "passive";
}

function refreshAll() {
  renderPresets();
  renderKit();
  renderTable();
  renderDrill(false);
  if (quizCurrent) newQuiz();
  setKitVisibility(activeTabKey());
}

const TAB_TITLE = { guide: "Anleitung", table: "Tabelle", drill: "Drill", quiz: "Quiz" };

function closeDrawer() {
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
}
function openDrawer() {
  $("#sidebar").classList.add("open");
  $("#overlay").classList.add("show");
}

function setupTabs() {
  document.querySelectorAll(".nav-item").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.dataset.tab;
      $("#panel-" + key).classList.add("active");
      $("#content-title").textContent = TAB_TITLE[key] || "";
      setKitVisibility(key);
      if (key === "quiz" && !quizCurrent) newQuiz();
      if (key === "drill") renderDrill(false);
      closeDrawer();
    });
  });
}

function setupVoice() {
  document.querySelectorAll(".voice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentVoice === btn.dataset.voice) return;
      currentVoice = btn.dataset.voice;
      document.querySelectorAll(".voice-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.voice === currentVoice));
      drillIndex = 0;
      refreshAll();
    });
  });
}

function setupDrawer() {
  $("#hamburger").addEventListener("click", openDrawer);
  $("#overlay").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
}

function init() {
  verbInput.value = currentVerb;
  verbInput.addEventListener("input", () => {
    currentVerb = verbInput.value || "work";
    refreshAll();
  });

  $("#drill-order").addEventListener("change", () => { drillIndex = 0; renderDrill(false); });
  $("#drill-next").addEventListener("click", () => {
    const len = drillSequence().length;
    drillIndex = (drillIndex + 1) % len;
    renderDrill(true);
  });
  $("#drill-prev").addEventListener("click", () => {
    drillIndex = Math.max(0, drillIndex - 1);
    renderDrill(true);
  });

  $("#quiz-form").addEventListener("submit", checkQuiz);
  $("#quiz-show").addEventListener("click", () => {
    if (!quizCurrent) return;
    $("#quiz-recipe").textContent = buildRecipe(quizCurrent.t.key, quizCurrent.a.key, forms());
  });

  setupTabs();
  setupVoice();
  setupDrawer();
  refreshAll();
}

document.addEventListener("DOMContentLoaded", init);

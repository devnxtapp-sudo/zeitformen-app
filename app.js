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

/* ---- Anwendung (Lückentext: wann welche Form?) ----
   Pro Zeit×Aspekt ein Kontextsatz mit Lücke ({}), ein Signalwort und
   eine kurze Begründung. Die Sätze stehen in der 1. Person "I" und im
   Aktiv, damit sie zur Engine passen und mit jedem Verb funktionieren. */
const USAGE = {
  "present.simple":                 { s: "I {} here every day.",                  sig: "every day",           why: "Present Simple — Gewohnheit, Wiederholung, Fakten. Signal: every day, usually, often, always." },
  "present.progressive":            { s: "Look — I {} right now.",                sig: "right now",           why: "Present Progressive — läuft genau jetzt. Signal: right now, at the moment, currently." },
  "present.perfect":                { s: "I {} here since May.",                  sig: "since May",           why: "Present Perfect — in der Vergangenheit begonnen, mit Ergebnis/Bezug bis jetzt. Signal: since, for, already, just, yet, ever." },
  "present.perfectProgressive":     { s: "I {} all morning.",                     sig: "all morning",         why: "Present Perfect Progressive — begann früher und dauert an (oder wirkt sichtbar nach). Signal: all morning, for hours, lately." },
  "past.simple":                    { s: "I {} yesterday.",                       sig: "yesterday",           why: "Past Simple — abgeschlossen zu einem festen Zeitpunkt in der Vergangenheit. Signal: yesterday, ago, last week, in 2010." },
  "past.progressive":               { s: "I {} when you called.",                 sig: "when you called",     why: "Past Progressive — lief gerade, als etwas anderes geschah. Signal: while, as, when (Unterbrechung)." },
  "past.perfect":                   { s: "I {} before they arrived.",             sig: "before they arrived", why: "Past Perfect — war schon vor einem anderen Vergangenheitspunkt fertig. Signal: before, after, already, by the time." },
  "past.perfectProgressive":        { s: "I {} for hours before the break.",      sig: "for hours before",    why: "Past Perfect Progressive — dauerte über einen Zeitraum bis zu einem Punkt in der Vergangenheit. Signal: for/since … before." },
  "future.simple":                  { s: "I {} tomorrow.",                        sig: "tomorrow",            why: "Future Simple — Vorhersage oder spontaner Entschluss. Signal: tomorrow, next week, soon, probably." },
  "future.progressive":             { s: "This time tomorrow I {} again.",        sig: "this time tomorrow",  why: "Future Progressive — wird zu einem Zeitpunkt in der Zukunft gerade laufen. Signal: this time tomorrow, at 5 pm." },
  "future.perfect":                 { s: "By next year I {} here for a decade.",  sig: "by next year",        why: "Future Perfect — bis zu einem Zukunftspunkt abgeschlossen. Signal: by + Zeitpunkt, by then, by the time." },
  "future.perfectProgressive":      { s: "By 5 pm I {} for eight hours.",         sig: "by 5 pm … for",       why: "Future Perfect Progressive — Dauer, die bis zu einem Zukunftspunkt anhält. Signal: by … for." },
  "conditional.simple":             { s: "I {} if I had the time.",               sig: "if",                  why: "Conditional — hypothetisch / Folge einer Bedingung. Signal: if, would." },
  "conditional.progressive":        { s: "I {} now if you hadn't called.",        sig: "if … now",            why: "Conditional Progressive — liefe gerade, wäre eine Bedingung erfüllt." },
  "conditional.perfect":            { s: "I {} if you had asked.",                sig: "if you had asked",    why: "Conditional Perfect — wäre passiert, wenn (unerfüllte Bedingung in der Vergangenheit). Signal: if + Past Perfect." },
  "conditional.perfectProgressive": { s: "I {} all day if I hadn't stopped.",     sig: "if I hadn't …",       why: "Conditional Perfect Progressive — hätte über einen Zeitraum angedauert." },
};

let usageCurrent = null;
let usageAnswered = false;
let usageCorrect = 0;
let usageTotal = 0;
let usageStreak = 0;

function newUsage() {
  const t = TIMES[Math.floor(Math.random() * TIMES.length)];
  const a = ASPECTS[Math.floor(Math.random() * ASPECTS.length)];
  usageCurrent = { t, a };
  usageAnswered = false;
  const data = USAGE[t.key + "." + a.key];
  const f = forms();
  $("#usage-sentence").innerHTML = data.s.replace("{}", '<span class="blank">____</span>');
  $("#usage-meta").innerHTML =
    `Verb: <span class="verb-token">to ${f.base}</span> · Signal: <span class="sig">${data.sig}</span>`;
  $("#usage-input").value = "";
  $("#usage-feedback").textContent = "";
  $("#usage-feedback").className = "quiz-feedback";
  $("#usage-why").textContent = "";
  $("#usage-submit").textContent = "Prüfen";
  $("#usage-input").focus();
}

function handleUsageSubmit(e) {
  e.preventDefault();
  if (usageAnswered) { newUsage(); return; }   // zweiter Druck = nächster Satz
  if (!usageCurrent) return;

  const f = forms();
  const { t, a } = usageCurrent;
  const data = USAGE[t.key + "." + a.key];
  const expected = buildForm(t.key, a.key, f, "active");   // "I have worked"
  const blank = expected.replace(/^I\s+/, "");             // "have worked"
  const correct = normalize($("#usage-input").value) === normalize(expected);

  usageTotal++;
  if (correct) { usageCorrect++; usageStreak++; } else { usageStreak = 0; }

  $("#usage-sentence").innerHTML = data.s.replace("{}", `<span class="filled">${blank}</span>`);
  const fb = $("#usage-feedback");
  fb.textContent = correct ? "Richtig!" : `Nicht ganz — richtig ist: ${blank}`;
  fb.className = "quiz-feedback " + (correct ? "good" : "bad");
  $("#usage-why").innerHTML = `<strong>${t.label} ${a.label}.</strong> ${data.why}`;
  $("#usage-submit").textContent = "Weiter";
  updateUsageScore();
}

function updateUsageScore() {
  $("#usage-correct").textContent = usageCorrect;
  $("#usage-total").textContent = usageTotal;
  $("#usage-streak").textContent = usageStreak >= 3 ? `Serie: ${usageStreak}` : "";
}

/* ============================================================
   Verdrahtung
============================================================ */
function activeTabKey() {
  const el = document.querySelector(".nav-item.active");
  return el ? el.dataset.tab : "table";
}

// Baukasten + Passiv-Hinweis nur dort zeigen, wo er beim Lernen hilft —
// nicht bei Quiz/Anwendung (sonst liest man nur ab) und nicht in der Anleitung.
const KIT_TABS = new Set(["table", "drill"]);
function setKitVisibility(tabKey) {
  const show = KIT_TABS.has(tabKey);
  $("#kit-card").hidden = !show;
  $("#voice-note").hidden = !show || currentVoice !== "passive";
}

function refreshAll() {
  renderPresets();
  renderKit();
  renderTable();
  renderDrill(false);
  if (quizCurrent) newQuiz();
  if (usageCurrent) newUsage();
  setKitVisibility(activeTabKey());
}

const TAB_TITLE = { guide: "Anleitung", table: "Tabelle", drill: "Drill", quiz: "Quiz", usage: "Anwendung" };

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
      if (key === "usage" && !usageCurrent) newUsage();
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

  $("#usage-form").addEventListener("submit", handleUsageSubmit);

  setupTabs();
  setupVoice();
  setupDrawer();
  refreshAll();
}

document.addEventListener("DOMContentLoaded", init);

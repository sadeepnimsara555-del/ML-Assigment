/* GradeSight front-end */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const CIRC = 2 * Math.PI * 50;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GROUP_META = {
    none: { label: "On track", short: "Doing fine in both", color: "var(--pass)",
      icon: '<path d="M20 6 9 17l-5-5"/>' },
    math: { label: "Math tutoring", short: "Struggling in Math only", color: "var(--amber)",
      icon: '<path d="M4 4h16v16H4z"/><path d="M8 8h3M9.5 6.5v3M13 8h3M8 15.5l3 3M11 15.5l-3 3M13 16h3M13 18h3"/>' },
    portuguese: { label: "Language support", short: "Struggling in Portuguese only", color: "var(--violet)",
      icon: '<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>' },
    both: { label: "Needs general support", short: "Struggling in both", color: "var(--fail)",
      icon: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>' },
  };
  const GROUP_ORDER = ["both", "math", "portuguese", "none"];

  const yesNo = [["yes", "Yes"], ["no", "No"]];
  const edu = [[0, "None"], [1, "Primary (4th grade)"], [2, "5th – 9th grade"], [3, "Secondary"], [4, "Higher education"]];
  const jobs = [["teacher", "Teacher"], ["health", "Health care"], ["services", "Civil services"], ["at_home", "At home"], ["other", "Other"]];

  const STEPS = [
    [
      { k: "G1", label: "First-period grade", type: "range", min: 0, max: 20, def: 11, full: true,
        tip: "G1: the student's grade in the first school period (0–20).", scale: ["0", "10 · pass", "20"] },
      { k: "G2", label: "Second-period grade", type: "range", min: 0, max: 20, def: 11, full: true,
        tip: "G2: the student's grade in the second school period (0–20).", scale: ["0", "10 · pass", "20"] },
      { k: "studytime", label: "Weekly study time", type: "seg", def: 2, full: true,
        opts: [[1, "< 2 h"], [2, "2–5 h"], [3, "5–10 h"], [4, "> 10 h"]] },
      { k: "failures", label: "Past class failures", type: "seg", def: 0,
        opts: [[0, "0"], [1, "1"], [2, "2"], [3, "3+"]], tip: "How many classes the student has failed before." },
      { k: "absences", label: "School absences", type: "number", min: 0, max: 93, def: 4, tip: "Number of days absent (0–93)." },
    ],
    [
      { k: "school", label: "School", type: "seg", def: "GP", full: true,
        opts: [["GP", "Gabriel Pereira"], ["MS", "Mousinho da Silveira"]] },
      { k: "sex", label: "Sex", type: "seg", def: "F", opts: [["F", "Female"], ["M", "Male"]] },
      { k: "age", label: "Age", type: "number", min: 15, max: 22, def: 17 },
      { k: "address", label: "Home area", type: "seg", def: "U", opts: [["U", "Urban"], ["R", "Rural"]] },
      { k: "traveltime", label: "Travel time to school", type: "seg", def: 1,
        opts: [[1, "<15m"], [2, "15–30m"], [3, "30–60m"], [4, ">1h"]] },
      { k: "famsize", label: "Family size", type: "seg", def: "GT3", opts: [["LE3", "3 or fewer"], ["GT3", "More than 3"]] },
      { k: "Pstatus", label: "Parents' status", type: "seg", def: "T", opts: [["T", "Together"], ["A", "Apart"]] },
      { k: "Medu", label: "Mother's education", type: "select", def: 3, opts: edu },
      { k: "Fedu", label: "Father's education", type: "select", def: 2, opts: edu },
      { k: "Mjob", label: "Mother's job", type: "select", def: "other", opts: jobs },
      { k: "Fjob", label: "Father's job", type: "select", def: "other", opts: jobs },
      { k: "reason", label: "Why this school", type: "select", def: "course",
        opts: [["course", "Course preference"], ["home", "Close to home"], ["reputation", "School reputation"], ["other", "Other"]] },
      { k: "guardian", label: "Guardian", type: "seg", def: "mother",
        opts: [["mother", "Mother"], ["father", "Father"], ["other", "Other"]] },
    ],
    [
      { type: "toggles", full: true, label: "Support & circumstances", items: [
        { k: "schoolsup", label: "Extra school support", def: "no" },
        { k: "famsup", label: "Family study support", def: "yes" },
        { k: "paid", label: "Paid extra classes", def: "no" },
        { k: "activities", label: "Extra-curricular activities", def: "yes" },
        { k: "nursery", label: "Attended nursery school", def: "yes" },
        { k: "higher", label: "Wants higher education", def: "yes" },
        { k: "internet", label: "Internet at home", def: "yes" },
        { k: "romantic", label: "In a relationship", def: "no" },
      ] },
      { k: "famrel", label: "Family relationships", type: "range", min: 1, max: 5, def: 4, scale: ["Very bad", "Excellent"] },
      { k: "freetime", label: "Free time after school", type: "range", min: 1, max: 5, def: 3, scale: ["Very low", "Very high"] },
      { k: "goout", label: "Going out with friends", type: "range", min: 1, max: 5, def: 3, scale: ["Very low", "Very high"] },
      { k: "health", label: "Current health", type: "range", min: 1, max: 5, def: 4, scale: ["Very bad", "Very good"] },
      { k: "Dalc", label: "Workday alcohol use", type: "range", min: 1, max: 5, def: 1, scale: ["Very low", "Very high"] },
      { k: "Walc", label: "Weekend alcohol use", type: "range", min: 1, max: 5, def: 2, scale: ["Very low", "Very high"] },
    ],
  ];

  const values = {};
  STEPS.flat().forEach((f) => (f.items || [f]).forEach((i) => (values[i.k] = i.def)));

  let modelInfo = null;
  let hasResult = false;
  let lastGrades = { math: 0, portuguese: 0 };

  /* ---------- Utilities ---------- */
  function toast(msg, ok = false) {
    const el = document.createElement("div");
    el.className = "toast" + (ok ? " ok" : "");
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => { el.classList.add("out"); el.addEventListener("animationend", () => el.remove()); }, 4200);
  }

  function animateNumber(el, from, to, dur = 1200, decimals = 1) {
    if (reduceMotion) { el.textContent = to.toFixed(decimals); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / dur));
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = (from + (to - from) * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------- Theme ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = isDark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  /* ---------- Tabs ---------- */
  const indicator = $(".tab-indicator");
  function moveIndicator() {
    const active = $(".tab.active");
    indicator.style.width = active.offsetWidth + "px";
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + tab.dataset.view));
    moveIndicator();
    observeReveals();
  }));
  window.addEventListener("resize", moveIndicator);
  document.fonts?.ready.then(moveIndicator);
  moveIndicator();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  function observeReveals() { $$(".reveal:not(.in)").forEach((el) => io.observe(el)); }
  observeReveals();

  /* ---------- Ripple ---------- */
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  });

  /* ---------- Form rendering ---------- */
  function labelHtml(f, extra = "") {
    const tip = f.tip ? `<span class="tip" tabindex="0" data-tip="${esc(f.tip)}">?</span>` : "";
    return `<div class="field-label"><span class="lbl">${esc(f.label)}${tip}</span>${extra}</div>`;
  }

  function renderField(f) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (f.full ? " full" : "");

    if (f.type === "range") {
      wrap.innerHTML = labelHtml(f) + `
        <div class="range-wrap">
          <input type="range" min="${f.min}" max="${f.max}" step="1" value="${values[f.k]}" aria-label="${esc(f.label)}">
          <span class="range-val">${values[f.k]}</span>
        </div>
        ${f.scale ? `<div class="range-scale">${f.scale.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}`;
      const input = $("input", wrap);
      const out = $(".range-val", wrap);
      const paint = () => input.style.setProperty("--p", ((input.value - f.min) / (f.max - f.min)) * 100 + "%");
      paint();
      input.addEventListener("input", () => {
        values[f.k] = Number(input.value);
        out.textContent = input.value;
        out.classList.remove("bump"); void out.offsetWidth; out.classList.add("bump");
        paint();
        onChange();
      });
    } else if (f.type === "seg") {
      wrap.innerHTML = labelHtml(f) + `<div class="seg" role="radiogroup">${f.opts.map(([v, l]) =>
        `<button type="button" role="radio" data-v="${v}" class="${v == values[f.k] ? "on" : ""}" aria-checked="${v == values[f.k]}">${esc(l)}</button>`).join("")}</div>`;
      $$("button", wrap).forEach((b) => b.addEventListener("click", () => {
        $$("button", wrap).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
        const raw = b.dataset.v;
        values[f.k] = isNaN(raw) ? raw : Number(raw);
        onChange();
      }));
    } else if (f.type === "select") {
      wrap.innerHTML = labelHtml(f) + `<select class="select" aria-label="${esc(f.label)}">${f.opts.map(([v, l]) =>
        `<option value="${v}" ${v == values[f.k] ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
      $("select", wrap).addEventListener("change", (e) => {
        const raw = e.target.value;
        values[f.k] = isNaN(raw) ? raw : Number(raw);
        onChange();
      });
    } else if (f.type === "number") {
      wrap.innerHTML = labelHtml(f) + `<input class="number" type="number" min="${f.min}" max="${f.max}" value="${values[f.k]}" aria-label="${esc(f.label)}">` +
        `<span class="field-help">Between ${f.min} and ${f.max}</span>`;
      $("input", wrap).addEventListener("input", (e) => {
        values[f.k] = e.target.value === "" ? "" : Number(e.target.value);
        onChange();
      });
    } else if (f.type === "toggles") {
      wrap.innerHTML = labelHtml(f) + `<div class="toggles">${f.items.map((i) => `
        <label class="toggle"><span>${esc(i.label)}</span>
          <input type="checkbox" data-k="${i.k}" ${values[i.k] === "yes" ? "checked" : ""}><span class="switch"></span>
        </label>`).join("")}</div>`;
      $$("input", wrap).forEach((cb) => cb.addEventListener("change", () => {
        values[cb.dataset.k] = cb.checked ? "yes" : "no";
        onChange();
      }));
    }
    return wrap;
  }

  function renderForm() {
    STEPS.forEach((fields, i) => {
      const host = $(`[data-fields="${i}"]`);
      host.innerHTML = "";
      fields.forEach((f) => host.appendChild(renderField(f)));
    });
  }
  renderForm();

  /* ---------- Wizard ---------- */
  let step = 0;
  function goStep(n) {
    const back = n < step;
    step = Math.max(0, Math.min(STEPS.length - 1, n));
    $$(".panel").forEach((p) => {
      const on = Number(p.dataset.panel) === step;
      p.classList.toggle("active", on);
      p.classList.toggle("back", on && back);
    });
    $$(".wstep").forEach((w) => {
      const i = Number(w.dataset.step);
      w.classList.toggle("active", i === step);
      w.classList.toggle("done", i < step);
    });
    $("#progressBar").style.width = ((step + 1) / STEPS.length) * 100 + "%";
    $("#prevBtn").disabled = step === 0;
    $("#nextBtn").classList.toggle("hidden", step === STEPS.length - 1);
  }
  $$(".wstep").forEach((w) => w.addEventListener("click", () => goStep(Number(w.dataset.step))));
  $("#prevBtn").addEventListener("click", () => goStep(step - 1));
  $("#nextBtn").addEventListener("click", () => goStep(step + 1));
  goStep(0);

  /* ---------- Prediction ---------- */
  const livePredict = debounce(() => predict(true), 350);
  function onChange() { if (hasResult) livePredict(); }

  function validate() {
    for (const f of STEPS.flat()) {
      if (f.type !== "number") continue;
      const v = values[f.k];
      if (v === "" || isNaN(v) || v < f.min || v > f.max) {
        goStep(STEPS.findIndex((s) => s.includes(f)));
        toast(`${f.label} must be between ${f.min} and ${f.max}.`);
        return false;
      }
    }
    return true;
  }

  async function predict(live = false) {
    if (!validate()) return;
    const btn = $("#predictBtn");
    if (!live) btn.classList.add("loading");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed.");
      showResult(data, live);
    } catch (err) {
      toast(err.message || "Could not reach the server.");
    } finally {
      btn.classList.remove("loading");
    }
  }

  $("#studentForm").addEventListener("submit", (e) => { e.preventDefault(); predict(false); });

  function setGauge(card, grade, pass, key, live) {
    const fill = $(".g-fill", card);
    const pill = $(".pill", card);
    card.classList.toggle("is-pass", pass);
    card.classList.toggle("is-fail", !pass);
    fill.style.strokeDashoffset = CIRC * (1 - grade / 20);
    animateNumber($(".num", card), lastGrades[key], grade, live ? 600 : 1400);
    const label = pass ? "PASS" : "FAIL";
    if (pill.textContent !== label || !live) {
      pill.textContent = label;
      pill.classList.remove("pop"); void pill.offsetWidth; pill.classList.add("pop");
    }
    lastGrades[key] = grade;
  }

  function showResult(data, live) {
    const firstTime = !hasResult;
    hasResult = true;
    $("#emptyState").classList.add("hidden");
    const stack = $("#resultStack");
    if (firstTime || !live) {
      stack.classList.add("hidden"); void stack.offsetWidth; stack.classList.remove("hidden");
      if (firstTime) { $$(".g-fill", stack).forEach((f) => (f.style.strokeDashoffset = CIRC)); lastGrades = { math: 0, portuguese: 0 }; }
    }

    // Let the reset paint before animating the rings.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setGauge($("#gaugeMath"), data.math.grade, data.math.pass, "math", live);
      setGauge($("#gaugePor"), data.portuguese.grade, data.portuguese.pass, "portuguese", live);
    }));

    const key = data.group.key;
    const meta = GROUP_META[key];
    const card = $("#groupCard");
    const changed = !card.classList.contains(`g-${key}-c`);
    card.className = `card glass group-card g-${key}-c`;
    $("#groupLabel").textContent = data.group.label;
    $("#groupAdvice").textContent = data.group.advice;
    const icon = $("#groupIcon");
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${meta.icon}</svg>`;
    if (changed || !live) { icon.classList.remove("pop"); void icon.offsetWidth; icon.classList.add("pop"); }

    $$(".mx-cell").forEach((c) => c.classList.toggle("current", c.dataset.group === key));

    if (modelInfo) {
      $("#accuracyNote").textContent =
        `On unseen students the predictions are typically within about ±${modelInfo.math.rmse} (Math) and ±${modelInfo.portuguese.rmse} (Portuguese) grade points.`;
    }
    if (!live && window.innerWidth <= 980) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Random sample ---------- */
  let samples = null;
  async function loadSamples() {
    if (samples) return samples;
    const text = await (await fetch("/static/sample_students.csv")).text();
    const lines = text.trim().split(/\r?\n/);
    const sep = lines[0].includes(";") ? ";" : ",";
    const head = lines[0].split(sep).map((h) => h.replace(/"/g, "").trim());
    samples = lines.slice(1).map((line) => {
      const cells = line.split(sep).map((c) => c.replace(/"/g, "").trim());
      const row = {};
      head.forEach((h, i) => (row[h] = isNaN(cells[i]) || cells[i] === "" ? cells[i] : Number(cells[i])));
      return row;
    });
    return samples;
  }

  $("#sampleBtn").addEventListener("click", async () => {
    try {
      const rows = await loadSamples();
      const row = rows[Math.floor(Math.random() * rows.length)];
      Object.keys(values).forEach((k) => { if (k in row) values[k] = row[k]; });
      renderForm();
      toast("Loaded a real student from the dataset.", true);
      predict(false);
    } catch (e) {
      toast("Could not load the sample data.");
    }
  });

  /* ---------- Batch ---------- */
  const dz = $("#dropzone");
  const fileInput = $("#fileInput");
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); fileInput.value = ""; });

  let batch = null;
  let filter = "all";
  let sort = { key: "id", dir: 1 };

  async function uploadFile(file) {
    $("#dzFile").textContent = `Analysing ${file.name}…`;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/predict-batch", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      batch = data;
      filter = "all";
      sort = { key: "id", dir: 1 };
      $("#dzFile").textContent = `${file.name} · ${data.total} students`;
      renderBatch();
      toast(`Scored ${data.total} students.`, true);
    } catch (err) {
      $("#dzFile").textContent = "Max 5 MB";
      toast(err.message);
    }
  }

  function renderBatch() {
    const wrap = $("#batchResults");
    wrap.classList.remove("hidden");
    const { summary, total } = batch;

    $("#tiles").innerHTML = GROUP_ORDER.map((k, i) => `
      <div class="card glass tile" style="--c:${GROUP_META[k].color};animation-delay:${i * 0.07}s">
        <div class="t-num" data-to="${summary[k]}">0</div>
        <div class="t-label">${GROUP_META[k].label}</div>
        <div class="t-sub">${GROUP_META[k].short} · ${total ? Math.round((summary[k] / total) * 100) : 0}%</div>
      </div>`).join("");
    $$("#tiles .t-num").forEach((el) => animateNumber(el, 0, Number(el.dataset.to), 1100, 0));

    $("#batchTotal").textContent = `${total} students`;
    const max = Math.max(1, ...Object.values(summary));
    $("#bars").innerHTML = GROUP_ORDER.map((k) => `
      <div class="bar-row" style="--c:${GROUP_META[k].color}">
        <span class="b-label"><span class="dot" style="background:var(--c)"></span>${GROUP_META[k].label}</span>
        <div class="bar-track"><div class="bar-fill" data-w="${(summary[k] / max) * 100}"></div></div>
        <span class="b-val">${summary[k]} · ${total ? Math.round((summary[k] / total) * 100) : 0}%</span>
      </div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() =>
      $$("#bars .bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%"))));

    $("#filterChips").innerHTML = [["all", "All", "var(--accent)"], ...GROUP_ORDER.map((k) => [k, GROUP_META[k].label, GROUP_META[k].color])]
      .map(([k, l, c]) => `<button class="chip ${k === filter ? "on" : ""}" data-f="${k}" style="--c:${c}">${l}</button>`).join("");
    $$("#filterChips .chip").forEach((c) => c.addEventListener("click", () => {
      filter = c.dataset.f;
      $$("#filterChips .chip").forEach((x) => x.classList.toggle("on", x === c));
      renderTable();
    }));

    renderTable();
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const COLS = [
    { key: "id", label: "#" },
    { key: "math", label: "Mathematics" },
    { key: "portuguese", label: "Portuguese" },
    { key: "group", label: "Intervention group" },
  ];

  function sortValue(row, key) {
    if (key === "math" || key === "portuguese") return row[key].grade;
    if (key === "group") return GROUP_ORDER.indexOf(row.group.key);
    if (key === "actual") return row.actual ?? -1;
    return row.id;
  }

  function gradeCell(g) {
    const c = g.pass ? "var(--pass)" : "var(--fail)";
    return `<div class="grade-cell" style="--c:${c}"><b>${g.grade.toFixed(1)}</b>
      <span class="mini-bar"><span style="width:${(g.grade / 20) * 100}%"></span></span>
      <span class="tag">${g.pass ? "Pass" : "Fail"}</span></div>`;
  }

  function renderTable() {
    const cols = batch.has_actual ? [...COLS, { key: "actual", label: "Actual G3 (file)" }] : COLS;
    $("#resultTable thead").innerHTML = `<tr>${cols.map((c) =>
      `<th data-k="${c.key}" class="${sort.key === c.key ? "sorted" : ""}">${c.label}<span class="arrow">${sort.key === c.key && sort.dir < 0 ? "↓" : "↑"}</span></th>`).join("")}</tr>`;
    $$("#resultTable th").forEach((th) => th.addEventListener("click", () => {
      sort = { key: th.dataset.k, dir: sort.key === th.dataset.k ? -sort.dir : 1 };
      renderTable();
    }));

    const rows = batch.rows
      .filter((r) => filter === "all" || r.group.key === filter)
      .sort((a, b) => (sortValue(a, sort.key) - sortValue(b, sort.key)) * sort.dir);

    $("#resultTable tbody").innerHTML = rows.map((r, i) => `
      <tr style="animation-delay:${Math.min(i, 25) * 0.025}s">
        <td>${r.id}</td>
        <td>${gradeCell(r.math)}</td>
        <td>${gradeCell(r.portuguese)}</td>
        <td><span class="tag" style="--c:${GROUP_META[r.group.key].color}">${r.group.label}</span></td>
        ${batch.has_actual ? `<td class="actual">${r.actual ?? "—"}</td>` : ""}
      </tr>`).join("") || `<tr><td colspan="${cols.length}" class="muted">No students in this group.</td></tr>`;
  }

  $("#downloadBtn").addEventListener("click", () => {
    if (!batch) return;
    const head = ["student", "math_predicted_G3", "math_result", "portuguese_predicted_G3", "portuguese_result", "intervention_group"];
    if (batch.has_actual) head.push("actual_G3");
    const lines = [head.join(",")].concat(batch.rows.map((r) => {
      const cells = [r.id, r.math.grade, r.math.pass ? "Pass" : "Fail", r.portuguese.grade, r.portuguese.pass ? "Pass" : "Fail", `"${r.group.label}"`];
      if (batch.has_actual) cells.push(r.actual ?? "");
      return cells.join(",");
    }));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "grade_predictions.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- About / model info ---------- */
  $("#groupList").innerHTML = GROUP_ORDER.map((k) => `
    <div class="group-item" style="--c:${GROUP_META[k].color}">
      <span class="gi-dot"></span>
      <div><b>${GROUP_META[k].short} → ${GROUP_META[k].label}</b>
        <p>${{ both: "Needs serious, general help.", math: "Needs Math-specific tutoring.",
          portuguese: "Needs language-specific help.", none: "No action needed." }[k]}</p></div>
    </div>`).join("");

  fetch("/api/model-info").then((r) => r.json()).then((info) => {
    modelInfo = info;
    $("#modelGrid").innerHTML = ["math", "portuguese"].map((k) => {
      const m = info[k];
      return `<div class="card glass model-card reveal">
        <span class="eyebrow small">${m.subject}</span>
        <h3>${m.model}</h3>
        <p class="m-sub">Experiment ${m.experiment} · ${m.features} input feature${m.features === 1 ? "" : "s"} · pass mark ${m.threshold}/20</p>
        <div class="metrics">
          <div class="metric"><div class="m-val">${m.rmse}</div><div class="m-key">RMSE (points)</div></div>
          <div class="metric"><div class="m-val">${m.mae}</div><div class="m-key">MAE (points)</div></div>
          <div class="metric"><div class="m-val">${m.r2}</div><div class="m-key">R²</div></div>
        </div>
      </div>`;
    }).join("");
    observeReveals();
  }).catch(() => {});
})();

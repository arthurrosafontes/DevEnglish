// Motor de sessões: roda missões, lições, revisões e treinos
import { ITEM_BY_ID, WORD_BY_ID, LESSON_BY_ID } from "./content.js";
import { state, save, shuffle, recordItem, addXp, touchStreak, pushHistory, today } from "./store.js";
import { lvlIdx, skillOf, reviewCard, addWordsToDeck, MISSIONS_META } from "./learn.js";
import { speak, stopSpeaking, accentFor, startRecording, recordingSupported } from "./audio.js";
import { aiAvailable, hasKey, evaluateSpeech, evaluateWriting } from "./gemini.js";
import { esc, icon, modal, toast, fmtTime } from "./ui.js";

let S = null;
let onExit = null;

const PRAISE = ["Isso aí!", "Mandou bem!", "Perfeito!", "Boa!", "Excelente!", "Nice!", "Great job!"];
const OOPS = ["Quase!", "Não foi dessa vez", "Vamos de novo depois"];
const KIND_LABEL = { terminal: "Terminal", slack: "Slack", pr: "Pull Request", doc: "Docs", email: "E-mail", issue: "Issue" };

export function isRunning() { return !!S; }

export function startSession(cfg, exitCb) {
  if (!cfg.steps.length) { toast("Nada para praticar aqui ainda."); return; }
  onExit = exitCb;
  S = {
    ...cfg,
    steps: cfg.steps.map((s) => ({ ...s })),
    idx: 0,
    start: Date.now(),
    points: 0,
    total: 0,
    xp: 0,
    mistakes: [],
    retried: new Set(),
    finished: false,
  };
  renderShell();
  renderStep();
}

// ---------------------------------------------------------------- shell
function renderShell() {
  document.getElementById("app").innerHTML = `
  <div class="session">
    <header class="s-head">
      <button class="icon-btn" id="s-close" aria-label="Sair">${icon("x")}</button>
      <div class="bar"><i id="s-bar"></i></div>
      <span class="s-count" id="s-count"></span>
    </header>
    <main class="s-stage" id="stage"></main>
    <footer class="s-foot" id="foot">
      <div id="fb" class="fb"></div>
      <div id="foot-actions" class="foot-actions">
        <button class="btn primary big" id="action" disabled>Verificar</button>
      </div>
    </footer>
  </div>`;
  document.getElementById("s-close").onclick = async () => {
    const ok = await modal("<h3>Sair da sessão?</h3><p class='muted'>O que você já respondeu fica salvo, mas a missão não conta como concluída.</p>",
      [{ label: "Continuar estudando", value: false, cls: "primary" }, { label: "Sair", value: true, cls: "ghost" }]);
    if (ok) exit();
  };
}

function exit() {
  stopSpeaking();
  S = null;
  onExit && onExit();
}

function updateProgress() {
  const pct = Math.round((S.idx / S.steps.length) * 100);
  document.getElementById("s-bar").style.width = pct + "%";
  document.getElementById("s-count").textContent = `${Math.min(S.idx + 1, S.steps.length)}/${S.steps.length}`;
}

function resetFooter() {
  const foot = document.getElementById("foot");
  foot.className = "s-foot";
  document.getElementById("fb").innerHTML = "";
  document.getElementById("foot-actions").innerHTML = `<button class="btn primary big" id="action" disabled>Verificar</button>`;
}

function setAction(label, enabled, handler) {
  const b = document.getElementById("action");
  if (!b) return;
  b.textContent = label;
  b.disabled = !enabled;
  b.onclick = handler || null;
}

function setFooterHTML(html) {
  document.getElementById("foot-actions").innerHTML = html;
}

// ---------------------------------------------------------------- steps
function renderStep() {
  stopSpeaking();
  if (S.idx >= S.steps.length) return renderSummary();
  updateProgress();
  resetFooter();
  const step = S.steps[S.idx];
  const stage = document.getElementById("stage");
  stage.scrollTop = 0;
  window.scrollTo(0, 0);
  const ctx = makeCtx(step);
  if (step.kind === "card") return renderCard(stage, WORD_BY_ID[step.id], ctx);
  if (step.kind === "intro") return renderIntro(stage, WORD_BY_ID[step.id], ctx);
  const item = ITEM_BY_ID[step.id];
  if (!item) { S.idx++; return renderStep(); }
  const R = RENDERERS[item.type];
  R(stage, item, ctx);
}

function makeCtx(step) {
  return {
    step,
    setAction,
    setFooterHTML,
    finish: (res) => finish(step, res),
  };
}

function finish(step, res) {
  const item = step.kind === "item" ? ITEM_BY_ID[step.id] : null;
  const firstTry = !step.retry;
  const counted = step.attempted;
  step.attempted = true;

  if (!res.skipped && !counted) {
    const pts = res.points ?? (res.ok ? 1 : 0);
    const tot = res.total ?? 1;
    if (firstTry) { S.points += pts; S.total += tot; }
    if (item && firstTry) recordItem(item.id, res.ok);
    if (item && step.retry && res.ok) recordItem(item.id, true);
    let gained = 0;
    if (step.kind === "card") gained = res.ok ? 3 : 0;
    else if (firstTry) gained = Math.round(10 * (pts / tot));
    else gained = res.ok ? 5 : 0;
    S.xp += gained;
    if (!res.ok && item) {
      if (firstTry) S.mistakes.push({ id: item.id, label: itemLabel(item) });
      // Repete o exercício errado uma vez no final da sessão
      if (!S.retried.has(item.id)) {
        S.retried.add(item.id);
        S.steps.push({ kind: "item", id: item.id, retry: true });
      }
    }
    if (step.kind === "card" && res.grade === 0 && !S.retried.has(step.id)) {
      S.retried.add(step.id);
      S.steps.push({ kind: "card", id: step.id, retry: true });
    }
  }
  save();

  if (res.noFeedback) { S.idx++; return renderStep(); }

  const foot = document.getElementById("foot");
  foot.className = "s-foot " + (res.skipped ? "skip" : res.ok ? "ok" : "bad");
  const title = res.skipped ? "Pulado" : res.ok ? pick(PRAISE) : pick(OOPS);
  document.getElementById("fb").innerHTML = `
    <div class="fb-title">${icon(res.skipped ? "chevron" : res.ok ? "check" : "x", 20)} ${esc(title)}</div>
    ${res.answer ? `<div class="fb-answer">${res.answer}</div>` : ""}
    ${res.details || ""}
    ${item && !res.skipped ? tipHTML(item, res.tipOverride) : ""}`;
  const extra = res.retryable ? `<button class="btn ghost" id="again">${icon("refresh", 18)} Tentar de novo</button>` : "";
  setFooterHTML(`${extra}<button class="btn primary big" id="action">Continuar</button>`);
  setAction("Continuar", true, () => { S.idx++; renderStep(); });
  const again = document.getElementById("again");
  if (again) again.onclick = () => renderStep();
  const fbEl = document.getElementById("fb");
  fbEl.querySelectorAll("[data-tr]").forEach((b) => (b.onclick = () => {
    const box = b.closest(".tip");
    box.classList.toggle("show-pt");
  }));
  bindSay(fbEl, item);
  document.getElementById("action").focus({ preventScroll: true });
}

function tipHTML(item, override) {
  const tip = override ?? item.tip;
  if (!tip) return "";
  const useEn = lvlIdx(item.level) >= 3 && item.tipEn;
  if (useEn) {
    return `<div class="tip"><span class="tip-en">${esc(item.tipEn)}</span><span class="tip-pt">${esc(tip)}</span>
      <button class="link small" data-tr>Traduzir</button></div>`;
  }
  return `<div class="tip">${esc(tip)}</div>`;
}

function itemLabel(item) {
  return item.q || item.text || item.audio || item.answer || item.title || item.prompt || (item.steps && item.steps.at(-1)) || "Exercício";
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- áudio
function audioRow(text, label = "Ouvir") {
  return `<div class="audio-row">
    <button class="play big" data-say="${esc(text)}" data-rate="1">${icon("volume", 22)} ${label}</button>
    <button class="play" data-say="${esc(text)}" data-rate="0.65" aria-label="Ouvir devagar">${icon("slow", 18)} Devagar</button>
  </div>`;
}

function bindSay(root, item) {
  root.querySelectorAll("[data-say]").forEach((b) => {
    b.onclick = async () => {
      b.classList.add("playing");
      const accent = item && skillOf(item) === "listening" ? accentFor(item.id + today()) : null;
      await speak(b.dataset.say, { rate: parseFloat(b.dataset.rate || "1"), accent });
      b.classList.remove("playing");
    };
  });
}

function autoplay(text, item, rate = 1) {
  const accent = item && skillOf(item) === "listening" ? accentFor(item.id + today()) : null;
  speak(text, { rate, accent });
}

function skipLink(label, ctx) {
  return `<button class="link small skip" id="skip">${esc(label)}</button>`;
}
function bindSkip(ctx) {
  const b = document.getElementById("skip");
  if (b) b.onclick = () => ctx.finish({ skipped: true });
}

function levelChip(item) {
  return `<span class="chip lvl">${item.level}</span>`;
}

function header(item, label) {
  return `<div class="ex-head"><span class="ex-type">${label}</span>${levelChip(item)}</div>`;
}

// ---------------------------------------------------------------- opções
function optionsHTML(opts) {
  const order = shuffle(opts.map((_, i) => i));
  return `<div class="opts">${order.map((i) => `<button class="opt" data-i="${i}">${esc(opts[i])}</button>`).join("")}</div>`;
}

function bindOptions(stage, ctx, onPick) {
  let sel = null;
  const opts = stage.querySelectorAll(".opts .opt");
  opts.forEach((b) => (b.onclick = () => {
    if (b.closest(".opts").classList.contains("locked")) return;
    opts.forEach((o) => o.classList.remove("sel"));
    b.classList.add("sel");
    sel = +b.dataset.i;
    onPick && onPick(sel);
  }));
  return () => sel;
}

function revealOptions(container, chosen) {
  container.classList.add("locked");
  container.querySelectorAll(".opt").forEach((o) => {
    const i = +o.dataset.i;
    if (i === 0) o.classList.add("right");
    else if (i === chosen) o.classList.add("wrong");
  });
}

// ---------------------------------------------------------------- renderizadores
const RENDERERS = {
  mcq(stage, item, ctx) {
    stage.innerHTML = `${header(item, item.audio ? "Pronúncia" : "Escolha")}
      <h2 class="q">${esc(item.q)}</h2>
      ${item.audio ? audioRow(item.audio) : ""}
      ${optionsHTML(item.opts)}`;
    bindSay(stage, item);
    if (item.audio) autoplay(item.audio, item);
    const get = bindOptions(stage, ctx, () => ctx.setAction("Verificar", true, check));
    function check() {
      const s = get();
      revealOptions(stage.querySelector(".opts"), s);
      ctx.finish({ ok: s === 0, answer: s === 0 ? "" : `Resposta: <b>${esc(item.opts[0])}</b>` });
    }
  },

  fill(stage, item, ctx) {
    const parts = item.text.split("___");
    stage.innerHTML = `${header(item, "Complete a frase")}
      <h2 class="q sentence">${esc(parts[0])}<span class="blank" id="blank">&nbsp;</span>${esc(parts[1] || "")}</h2>
      ${optionsHTML(item.opts)}`;
    const get = bindOptions(stage, ctx, (i) => {
      const bl = document.getElementById("blank");
      bl.textContent = item.opts[i];
      bl.classList.add("filled");
      ctx.setAction("Verificar", true, check);
    });
    function check() {
      const s = get();
      revealOptions(stage.querySelector(".opts"), s);
      const full = item.text.replace("___", item.opts[0]);
      ctx.finish({ ok: s === 0, answer: `${s === 0 ? "" : "Correto: "}<span class="say-inline">${esc(full)}</span> <button class="mini-play" data-say="${esc(full)}">${icon("volume", 16)}</button>` });
    }
  },

  order(stage, item, ctx) {
    const tokens = item.answer.split(" ");
    let order = shuffle(tokens.map((_, i) => i));
    if (order.every((v, i) => v === i) && tokens.length > 2) order = order.reverse();
    const picked = [];
    stage.innerHTML = `${header(item, "Monte a frase")}
      <p class="pt-prompt">${esc(item.pt)}</p>
      <div class="build" id="build"></div>
      <div class="bank" id="bank">${order.map((i) => `<button class="tok" data-i="${i}">${esc(tokens[i])}</button>`).join("")}</div>`;
    const build = stage.querySelector("#build");
    const bank = stage.querySelector("#bank");
    function sync() {
      build.innerHTML = picked.map((i) => `<button class="tok in" data-i="${i}">${esc(tokens[i])}</button>`).join("") || `<span class="muted small">Toque nas palavras abaixo</span>`;
      bank.querySelectorAll(".tok").forEach((b) => b.classList.toggle("used", picked.includes(+b.dataset.i)));
      ctx.setAction("Verificar", picked.length === tokens.length, check);
    }
    bank.onclick = (e) => {
      const b = e.target.closest(".tok");
      if (!b || b.classList.contains("used") || build.classList.contains("locked")) return;
      picked.push(+b.dataset.i);
      sync();
    };
    build.onclick = (e) => {
      const b = e.target.closest(".tok");
      if (!b || build.classList.contains("locked")) return;
      picked.splice(picked.indexOf(+b.dataset.i), 1);
      sync();
    };
    sync();
    function check() {
      const simp = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").trim();
      const ok = simp(picked.map((i) => tokens[i]).join(" ")) === simp(item.answer);
      build.classList.add("locked", ok ? "right" : "wrong");
      ctx.finish({ ok, answer: `${ok ? "" : "Correto: "}<span class="say-inline">${esc(item.answer)}</span> <button class="mini-play" data-say="${esc(item.answer)}">${icon("volume", 16)}</button>` });
    }
  },

  listen(stage, item, ctx) {
    stage.innerHTML = `${header(item, "Escuta")}
      <h2 class="q">${esc(item.q)}</h2>
      ${audioRow(item.audio)}
      ${optionsHTML(item.opts)}
      ${skipLink("Não posso ouvir agora")}`;
    bindSay(stage, item);
    bindSkip(ctx);
    autoplay(item.audio, item);
    const get = bindOptions(stage, ctx, () => ctx.setAction("Verificar", true, check));
    function check() {
      const s = get();
      revealOptions(stage.querySelector(".opts"), s);
      ctx.finish({ ok: s === 0, answer: transcript(item.audio) });
    }
  },

  dict(stage, item, ctx) {
    stage.innerHTML = `${header(item, "Ditado")}
      <h2 class="q">Escreva o que você ouvir</h2>
      ${audioRow(item.audio)}
      <textarea id="dict-in" class="input" rows="3" autocapitalize="sentences" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Type here…"></textarea>
      ${skipLink("Não posso ouvir agora")}`;
    bindSay(stage, item);
    bindSkip(ctx);
    autoplay(item.audio, item);
    const ta = stage.querySelector("#dict-in");
    ta.oninput = () => ctx.setAction("Verificar", ta.value.trim().length > 0, check);
    function check() {
      ta.disabled = true;
      const r = compareWords(item.audio, ta.value);
      const ok = r.score >= 0.85;
      ctx.finish({
        ok,
        answer: `<div class="diff">${r.html}</div><div class="muted small">${Math.round(r.score * 100)}% das palavras certas</div>`,
        details: `<div class="audio-mini">${audioMini(item.audio)}</div>`,
      });
    }
  },

  buildup(stage, item, ctx) {
    let i = 0;
    const n = item.steps.length;
    stage.innerHTML = `${header(item, "Frase longa · bloco a bloco")}
      <p class="muted">A frase vai crescendo. Ouça cada bloco quantas vezes quiser.</p>
      <div class="dots" id="dots">${item.steps.map((_, k) => `<i class="${k === 0 ? "on" : ""}"></i>`).join("")}</div>
      <div id="bu-audio"></div>
      <div id="bu-q"></div>
      ${skipLink("Não posso ouvir agora")}`;
    bindSkip(ctx);
    function draw() {
      stage.querySelector("#bu-audio").innerHTML = audioRow(item.steps[i], `Bloco ${i + 1}/${n}`);
      bindSay(stage.querySelector("#bu-audio"), item);
      stage.querySelectorAll("#dots i").forEach((d, k) => d.classList.toggle("on", k <= i));
      if (i < n - 1) {
        ctx.setAction("Próximo bloco", true, () => { i++; draw(); autoplay(item.steps[i], item); });
      } else {
        stage.querySelector("#bu-q").innerHTML = `<h2 class="q">${esc(item.q)}</h2>${optionsHTML(item.opts)}`;
        ctx.setAction("Verificar", false);
        const get = bindOptions(stage, ctx, () => ctx.setAction("Verificar", true, () => {
          const s = get();
          revealOptions(stage.querySelector(".opts"), s);
          ctx.finish({ ok: s === 0, answer: transcript(item.steps[n - 1]) });
        }));
      }
    }
    draw();
    autoplay(item.steps[0], item);
  },

  read(stage, item, ctx) {
    stage.innerHTML = `${header(item, "Leitura")}
      <div class="passage k-${item.kind}">
        <div class="passage-head"><span class="chip">${KIND_LABEL[item.kind] || "Texto"}</span><span class="passage-title">${esc(item.title)}</span></div>
        <pre class="passage-body">${esc(item.text)}</pre>
      </div>
      ${item.qs.map((q, qi) => `<div class="rq" data-q="${qi}"><h3 class="q small-q">${qi + 1}. ${esc(q.q)}</h3>${optionsHTML(q.opts)}</div>`).join("")}`;
    const sel = {};
    stage.querySelectorAll(".rq").forEach((box) => {
      const qi = +box.dataset.q;
      box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        if (box.querySelector(".opts").classList.contains("locked")) return;
        box.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel"));
        b.classList.add("sel");
        sel[qi] = +b.dataset.i;
        ctx.setAction("Verificar", Object.keys(sel).length === item.qs.length, check);
      }));
    });
    function check() {
      let pts = 0;
      const tips = [];
      stage.querySelectorAll(".rq").forEach((box) => {
        const qi = +box.dataset.q;
        revealOptions(box.querySelector(".opts"), sel[qi]);
        if (sel[qi] === 0) pts++;
        else if (item.qs[qi].tip) tips.push(`${qi + 1}. ${item.qs[qi].tip}`);
      });
      const tot = item.qs.length;
      ctx.finish({
        ok: pts === tot,
        points: pts,
        total: tot,
        answer: `${pts}/${tot} corretas`,
        tipOverride: tips.length ? tips.join("  ·  ") : (item.qs.find((q) => q.tip)?.tip || ""),
      });
    }
  },

  match(stage, item, ctx) {
    const left = shuffle(item.pairs.map((_, i) => i));
    const right = shuffle(item.pairs.map((_, i) => i));
    stage.innerHTML = `${header(item, "Ligue os pares")}
      <h2 class="q">Toque em um termo e depois no significado</h2>
      <div class="match">
        <div class="col">${left.map((i) => `<button class="opt m" data-side="l" data-i="${i}">${esc(item.pairs[i][0])}</button>`).join("")}</div>
        <div class="col">${right.map((i) => `<button class="opt m" data-side="r" data-i="${i}">${esc(item.pairs[i][1])}</button>`).join("")}</div>
      </div>`;
    let selL = null, errors = 0, done = 0;
    stage.querySelectorAll(".m").forEach((b) => (b.onclick = () => {
      if (b.classList.contains("right")) return;
      if (b.dataset.side === "l") {
        stage.querySelectorAll('[data-side="l"]').forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
        selL = +b.dataset.i;
        speak(item.pairs[selL][0]);
        return;
      }
      if (selL === null) return;
      const lb = stage.querySelector(`[data-side="l"][data-i="${selL}"]`);
      if (+b.dataset.i === selL) {
        lb.classList.remove("sel"); lb.classList.add("right"); b.classList.add("right");
        done++;
        selL = null;
        if (done === item.pairs.length) {
          ctx.finish({ ok: errors <= 1, answer: errors ? `${errors} erro(s) no caminho` : "Todos de primeira!" });
        }
      } else {
        errors++;
        b.classList.add("shake", "wrong");
        setTimeout(() => b.classList.remove("shake", "wrong"), 450);
      }
    }));
  },

  speak(stage, item, ctx) {
    const canRec = recordingSupported();
    stage.innerHTML = `${header(item, "Fala")}
      <h2 class="q">Ouça e repita em voz alta</h2>
      <div class="target">${esc(item.text)}</div>
      <p class="pt-prompt">${esc(item.pt)}</p>
      ${audioRow(item.text)}
      <div class="rec-area">
        ${canRec ? `<button class="rec" id="rec">${icon("mic", 28)}<span>Gravar</span></button>` : `<p class="muted">Gravação não suportada neste navegador.</p>`}
        <div id="rec-out" class="rec-out"></div>
      </div>
      ${skipLink("Não posso falar agora")}`;
    bindSay(stage, item);
    bindSkip(ctx);
    autoplay(item.text, item);
    if (!canRec) return selfAssess(stage.querySelector("#rec-out"), item.text, null, ctx);
    let rec = null;
    const btn = stage.querySelector("#rec");
    const out = stage.querySelector("#rec-out");
    btn.onclick = async () => {
      if (rec) {
        const current = rec;
        rec = null;
        btn.classList.remove("on");
        btn.querySelector("span").textContent = "Gravar de novo";
        const r = await current.stop();
        await afterRecord(r);
        return;
      }
      try {
        stopSpeaking();
        rec = await startRecording(15000);
        btn.classList.add("on");
        btn.querySelector("span").textContent = "Parar";
        out.innerHTML = `<span class="muted small">Gravando… toque de novo para parar</span>`;
        const mine = rec;
        mine.stopped.then(() => { if (rec === mine) btn.click(); }); // parou sozinho (15 s)
      } catch (e) {
        toast("Não consegui acessar o microfone. Libere a permissão nos Ajustes do iPhone.");
      }
    };
    async function afterRecord(r) {
      if (!r || !r.blob.size) return;
      if (!aiAvailable()) return selfAssess(out, item.text, r.url, ctx);
      btn.disabled = true;
      out.innerHTML = `<div class="loading"><span class="spinner"></span> Avaliando sua pronúncia…</div>`;
      ctx.setAction("Avaliando…", false);
      try {
        const res = await evaluateSpeech(r.blob, item.text, state.settings.levels.speaking);
        const score = Math.max(0, Math.min(100, Math.round(res.score || 0)));
        const words = (res.words || []).map((w) =>
          `<span class="w ${w.ok ? "ok" : "no"}">${esc(w.w)}${!w.ok && w.note ? `<small>${esc(w.note)}</small>` : ""}</span>`).join(" ");
        ctx.finish({
          ok: score >= 70,
          retryable: true,
          answer: `<div class="score-row"><span class="score">${score}</span><span class="muted small">/100</span></div><div class="diff words">${words || esc(item.text)}</div>`,
          details: `<p class="heard">Ouvi: “${esc(res.heard || "")}”</p>${res.feedback_pt ? `<div class="tip ai">${icon("sparkles", 16)} ${esc(res.feedback_pt)}</div>` : ""}
            <div class="audio-row compact"><button class="play" id="mine">${icon("mic", 16)} Minha voz</button><button class="play" data-say="${esc(item.text)}" data-rate="1">${icon("volume", 16)} Original</button></div>`,
        });
        bindMine(r.url);
      } catch (e) {
        toast(e.message || "Erro na IA");
        btn.disabled = false;
        selfAssess(out, item.text, r.url, ctx);
      }
    }
  },

  write(stage, item, ctx) {
    stage.innerHTML = `${header(item, "Escrita")}
      <h2 class="q">${esc(item.prompt)}</h2>
      <textarea id="w-in" class="input" rows="5" autocapitalize="sentences" placeholder="Write in English…"></textarea>
      ${!hasKey() ? `<p class="muted small">${icon("sparkles", 14)} Com a chave do Gemini em Ajustes, a IA corrige seu texto. Sem ela, você compara com um exemplo.</p>` : ""}`;
    const ta = stage.querySelector("#w-in");
    ta.oninput = () => ctx.setAction("Verificar", ta.value.trim().length > 3, check);
    async function check() {
      ta.disabled = true;
      if (aiAvailable()) {
        ctx.setAction("Corrigindo…", false);
        stage.insertAdjacentHTML("beforeend", `<div class="loading" id="w-load"><span class="spinner"></span> A IA está lendo seu texto…</div>`);
        try {
          const r = await evaluateWriting(item.prompt, item.model, ta.value, state.settings.levels.writing);
          document.getElementById("w-load")?.remove();
          return ctx.finish({
            ok: !!r.ok,
            answer: `<div class="score-row"><span class="score">${Math.round(r.score || 0)}</span><span class="muted small">/100</span></div>`,
            details: `<div class="corrected"><span class="label">Versão corrigida</span>${esc(r.corrected || "")}</div>
              ${r.feedback_pt ? `<div class="tip ai">${icon("sparkles", 16)} ${esc(r.feedback_pt)}</div>` : ""}
              <details class="model"><summary>Ver exemplo de resposta</summary><p>${esc(item.model).replace(/\n/g, "<br>")}</p></details>`,
          });
        } catch (e) {
          document.getElementById("w-load")?.remove();
          toast(e.message || "Erro na IA");
        }
      }
      // sem IA: autoavaliação
      stage.insertAdjacentHTML("beforeend", `<div class="corrected"><span class="label">Exemplo de resposta</span>${esc(item.model).replace(/\n/g, "<br>")}</div>`);
      ctx.setFooterHTML(`<p class="muted small center">Sua resposta passa a mesma ideia?</p>
        <div class="row2"><button class="btn ghost" id="sa-no">Preciso treinar</button><button class="btn primary" id="sa-yes">Ficou parecido</button></div>`);
      document.getElementById("sa-yes").onclick = () => ctx.finish({ ok: true });
      document.getElementById("sa-no").onclick = () => ctx.finish({ ok: false });
    }
  },
};

function bindMine(url) {
  const b = document.getElementById("mine");
  if (b) b.onclick = () => { stopSpeaking(); new Audio(url).play(); };
}

function selfAssess(out, text, url, ctx) {
  out.innerHTML = `<div class="audio-row compact">
      ${url ? `<button class="play" id="mine">${icon("mic", 16)} Minha voz</button>` : ""}
      <button class="play" data-say="${esc(text)}" data-rate="1">${icon("volume", 16)} Original</button>
    </div>
    <p class="muted small">${hasKey() ? "Sem conexão com a IA agora." : "Adicione a chave do Gemini em Ajustes para a IA avaliar sua pronúncia."} Compare as duas e avalie:</p>`;
  bindSay(out, null);
  if (url) bindMine(url);
  ctx.setFooterHTML(`<div class="row2"><button class="btn ghost" id="sa-no">Preciso treinar</button><button class="btn primary" id="sa-yes">Ficou parecido</button></div>`);
  document.getElementById("sa-yes").onclick = () => ctx.finish({ ok: true });
  document.getElementById("sa-no").onclick = () => ctx.finish({ ok: false });
}

function transcript(text) {
  return `<div class="transcript"><span class="label">Transcrição</span>${esc(text)} <button class="mini-play" data-say="${esc(text)}" data-rate="0.65">${icon("slow", 14)}</button></div>`;
}

function audioMini(text) {
  return `<button class="mini-play" data-say="${esc(text)}" data-rate="1">${icon("volume", 16)} ouvir</button>
          <button class="mini-play" data-say="${esc(text)}" data-rate="0.65">${icon("slow", 16)} devagar</button>`;
}

// ---------------------------------------------------------------- flashcards
function renderCard(stage, w, ctx) {
  if (!w) return ctx.finish({ skipped: true, noFeedback: true });
  const isNew = (state.deck[w.id]?.reps || 0) === 0 && !ctx.step.retry;
  stage.innerHTML = `<div class="ex-head"><span class="ex-type">${isNew ? "Palavra nova" : "Revisão"}</span><span class="chip lvl">${w.level}</span></div>
    <div class="flash">
      <div class="flash-en">${esc(w.en)}</div>
      <button class="mini-play big-mini" data-say="${esc(w.en.replace(/\(.*?\)/g, ""))}">${icon("volume", 20)}</button>
      <div class="flash-back" id="back" hidden>
        <div class="flash-pt">${esc(w.pt)}</div>
        <div class="flash-ex">“${esc(w.ex)}” <button class="mini-play" data-say="${esc(w.ex)}">${icon("volume", 16)}</button></div>
      </div>
    </div>
    <p class="muted small center" id="hint">Tente lembrar o significado antes de virar.</p>`;
  bindSay(stage, null);
  speak(w.en.replace(/\(.*?\)/g, ""));
  ctx.setAction("Mostrar resposta", true, () => {
    stage.querySelector("#back").hidden = false;
    stage.querySelector("#hint").textContent = "Como foi?";
    ctx.setFooterHTML(`<div class="grades">
      <button class="g g0" data-g="0">Errei<small>de novo</small></button>
      <button class="g g1" data-g="1">Difícil</button>
      <button class="g g2" data-g="2">Bom</button>
      <button class="g g3" data-g="3">Fácil</button></div>`);
    document.querySelectorAll(".grades .g").forEach((b) => (b.onclick = () => {
      const g = +b.dataset.g;
      reviewCard(w.id, g);
      ctx.finish({ ok: g > 0, grade: g, noFeedback: true });
    }));
  });
}

function renderIntro(stage, w, ctx) {
  stage.innerHTML = `<div class="ex-head"><span class="ex-type">Nova palavra</span><span class="chip lvl">${w.level}</span></div>
    <div class="flash">
      <div class="flash-en">${esc(w.en)}</div>
      <button class="mini-play big-mini" data-say="${esc(w.en.replace(/\(.*?\)/g, ""))}">${icon("volume", 20)}</button>
      <div class="flash-pt">${esc(w.pt)}</div>
      <div class="flash-ex">“${esc(w.ex)}” <button class="mini-play" data-say="${esc(w.ex)}">${icon("volume", 16)}</button></div>
    </div>`;
  bindSay(stage, null);
  speak(w.en.replace(/\(.*?\)/g, ""));
  ctx.setAction("Entendi", true, () => ctx.finish({ skipped: true, noFeedback: true }));
}

// ---------------------------------------------------------------- comparação do ditado
const EXPAND = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are", "it's": "it is", "that's": "that is",
  "what's": "what is", "there's": "there is", "he's": "he is", "she's": "she is", "let's": "let us",
  "i'll": "i will", "you'll": "you will", "we'll": "we will", "it'll": "it will", "they'll": "they will",
  "i've": "i have", "we've": "we have", "you've": "you have", "i'd": "i would",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "cannot", "won't": "will not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "couldn't": "could not", "shouldn't": "should not",
  gonna: "going to", wanna: "want to", gotta: "got to", lemme: "let me", gimme: "give me", kinda: "kind of",
  dunno: "do not know", whaddya: "what do you", didja: "did you", whatcha: "what are you", "can not": "cannot",
};

function tokensOf(s) {
  const words = s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
  const out = [];
  words.forEach((w, wi) => {
    const exp = (EXPAND[w] || w).split(" ");
    exp.forEach((t) => out.push({ t: t.replace(/'/g, ""), wi }));
  });
  return out;
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
const same = (a, b) => a === b || (a.length >= 5 && lev(a, b) <= 1);

export function compareWords(target, input) {
  const T = tokensOf(target);
  const U = tokensOf(input);
  const n = T.length, m = U.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = same(T[i].t, U[j].t) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const matched = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (same(T[i].t, U[j].t)) { matched.add(i); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const origWords = target.split(/\s+/);
  const wordOk = origWords.map((_, wi) => T.filter((t) => t.wi === wi).every((t) => matched.has(T.indexOf(t))));
  const html = origWords.map((w, wi) => `<span class="w ${wordOk[wi] ? "ok" : "no"}">${esc(w)}</span>`).join(" ");
  return { score: n ? matched.size / n : 0, html };
}

// ---------------------------------------------------------------- resumo
function renderSummary() {
  stopSpeaking();
  const secs = Math.round((Date.now() - S.start) / 1000);
  const pct = S.total ? Math.round((S.points / S.total) * 100) : 100;
  let bonus = 0;
  let headline = "Sessão concluída!";

  if (S.kind === "mission") {
    const m = state.daily?.missions.find((x) => x.id === S.refId);
    if (m && !m.done && state.daily.date === today()) {
      m.done = true;
      m.score = pct;
      bonus += 20;
      state.days[today()] = state.days[today()] || { xp: 0, missions: 0, secs: 0 };
      state.days[today()].missions++;
      headline = "Missão concluída!";
      if (state.daily.missions.every((x) => x.done) && !state.daily.bonus) {
        state.daily.bonus = true;
        bonus += 30;
        headline = "Dia completo! 3/3 missões";
      }
    }
  }
  if (S.kind === "lesson") {
    const l = LESSON_BY_ID[S.refId];
    addWordsToDeck(l.words.map((w) => w.id));
    const prev = state.lessons[l.id] || { best: 0, done: false };
    state.lessons[l.id] = { best: Math.max(prev.best, pct), done: true, last: Date.now() };
    if (!prev.done) bonus += 15;
    headline = "Lição concluída!";
  }
  const total = S.xp + bonus;
  addXp(total);
  const streakUp = touchStreak();
  pushHistory({
    kind: S.kind,
    ref: S.refId || null,
    title: S.title,
    correct: S.points,
    total: S.total,
    xp: total,
    secs,
    mistakes: S.mistakes,
  });
  save();

  const mistakesHTML = S.mistakes.length
    ? `<div class="card"><h3>Para revisar</h3><ul class="mlist">${S.mistakes.map((m) => `<li>${esc(m.label)}</li>`).join("")}</ul>
       <p class="muted small">Esses ficam salvos em "Praticar meus erros".</p></div>`
    : "";

  document.getElementById("app").innerHTML = `
  <div class="session summary">
    <main class="s-stage">
      <div class="sum-hero">
        <div class="sum-check">${icon("check", 44)}</div>
        <h1>${esc(headline)}</h1>
        <p class="muted">${esc(S.title)}</p>
      </div>
      <div class="stats3">
        <div class="stat"><b>${pct}%</b><span>acertos</span></div>
        <div class="stat xp"><b>+${total}</b><span>XP</span></div>
        <div class="stat"><b>${fmtTime(secs)}</b><span>tempo</span></div>
      </div>
      ${streakUp ? `<div class="streak-up">${icon("flame", 22)} Ofensiva: ${state.streak.count} ${state.streak.count === 1 ? "dia" : "dias"}!</div>` : ""}
      ${mistakesHTML}
    </main>
    <footer class="s-foot"><div class="foot-actions"><button class="btn primary big" id="done">Continuar</button></div></footer>
  </div>`;
  document.getElementById("done").onclick = exit;
}

export { MISSIONS_META };

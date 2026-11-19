// DevEnglish — telas principais
import { TRACKS, LESSONS, LESSON_BY_ID, WORDS, LEVELS, LEVEL_NAMES, SKILLS, ITEM_BY_ID } from "./content.js";
import { state, save, today, addDays, currentStreak, xpLevel, mistakeIds, replaceState, resetState, requestPersist, seededRng } from "./store.js";
import { ensureDaily, buildMissionSteps, buildLessonSteps, buildReviewSteps, buildPracticeSteps, buildMistakeSteps, deckStats, dueWordIds, MISSIONS_META, skillOf } from "./learn.js";
import { startSession, isRunning } from "./session.js";
import { speak, englishVoices, ACCENTS, ttsSupported } from "./audio.js";
import { hasKey, listModels, suggestModel, testConnection } from "./gemini.js";
import { esc, icon, toast, modal, fmtTime, fmtDate } from "./ui.js";

const VERSION = "1.0.0";
const ui = { tab: "home", track: null, histLimit: 25, glossQ: "" };

const TABS = [
  { id: "home", label: "Hoje", icon: "home" },
  { id: "tracks", label: "Trilhas", icon: "route" },
  { id: "review", label: "Revisar", icon: "cards" },
  { id: "history", label: "Histórico", icon: "history" },
  { id: "settings", label: "Ajustes", icon: "settings" },
];

const app = () => document.getElementById("app");

export function render() {
  if (isRunning()) return;
  if (!state.onboarded) return renderOnboarding();
  ensureDaily();
  app().innerHTML = `
    <div class="shell">
      <main class="page" id="page">${PAGES[ui.tab]()}</main>
      <nav class="tabbar">${TABS.map((t) => `
        <button class="tab ${ui.tab === t.id ? "on" : ""}" data-tab="${t.id}">${icon(t.icon, 24)}<span>${t.label}</span></button>`).join("")}
      </nav>
    </div>`;
  app().querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => {
    ui.tab = b.dataset.tab;
    ui.track = null;
    render();
    window.scrollTo(0, 0);
  }));
  BINDERS[ui.tab]?.();
}

function run(cfg) {
  startSession(cfg, () => { render(); window.scrollTo(0, 0); });
}

// ================================================================ ONBOARDING
let obStep = 0;
function renderOnboarding() {
  const lv = state.settings.levels;
  const screens = [
    `<div class="ob-hero">
       <div class="logo">${logoSVG(72)}</div>
       <h1>DevEnglish</h1>
       <p class="lead">Inglês para quem trabalha com tecnologia: código, Slack, dailies, IA, entrevistas e as gírias que ninguém te ensina.</p>
     </div>
     <ul class="ob-list">
       <li>${icon("target")}<span><b>3 missões rápidas por dia</b> · cerca de 5 minutos cada</span></li>
       <li>${icon("headphones")}<span><b>Foco em escuta</b> · frases longas, fala rápida e sotaques</span></li>
       <li>${icon("cards")}<span><b>Repetição espaçada</b> · você revisa a palavra antes de esquecer</span></li>
       <li>${icon("sparkles")}<span><b>IA opcional</b> · o Gemini avalia sua fala e sua escrita</span></li>
     </ul>`,
    `<h2>Seu nível em cada habilidade</h2>
     <p class="muted">Já deixei como conversamos: leitura melhor que escuta. Você pode mudar a qualquer momento em Ajustes.</p>
     ${levelSelectors(lv)}`,
    `<h2>Instale no iPhone</h2>
     <ol class="steps">
       <li>Abra este site no <b>Safari</b></li>
       <li>Toque em ${icon("share", 18)} <b>Compartilhar</b></li>
       <li>Escolha <b>Adicionar à Tela de Início</b></li>
     </ol>
     <p class="muted">Assim ele abre em tela cheia, funciona offline e seu progresso fica salvo no aparelho.</p>
     <div class="card soft"><b>${icon("sparkles", 18)} IA (opcional)</b><p class="muted small">Depois, em Ajustes, cole sua chave grátis do Google AI Studio para a IA avaliar sua pronúncia e corrigir seus textos.</p></div>`,
  ];
  app().innerHTML = `
    <div class="onboarding">
      <div class="ob-body">${screens[obStep]}</div>
      <div class="ob-foot">
        <div class="dots">${screens.map((_, i) => `<i class="${i <= obStep ? "on" : ""}"></i>`).join("")}</div>
        <button class="btn primary big" id="ob-next">${obStep < screens.length - 1 ? "Continuar" : "Começar"}</button>
      </div>
    </div>`;
  bindLevelSelectors();
  document.getElementById("ob-next").onclick = () => {
    if (obStep < screens.length - 1) { obStep++; renderOnboarding(); return; }
    state.onboarded = true;
    save();
    requestPersist();
    render();
  };
}

function levelSelectors(lv) {
  return `<div class="levels">${Object.entries(SKILLS).map(([k, label]) => `
    <div class="lv-row">
      <span class="lv-label">${label}</span>
      <div class="seg" data-skill="${k}">${LEVELS.map((l) => `<button class="${lv[k] === l ? "on" : ""}" data-l="${l}">${l}</button>`).join("")}</div>
    </div>`).join("")}
    <p class="muted small">A1 Hello World · A2 Junior · B1 Pleno · B2 Sênior · C1 Tech Lead · C2 Architect</p>
  </div>`;
}

function bindLevelSelectors() {
  document.querySelectorAll(".seg[data-skill]").forEach((seg) => {
    seg.onclick = (e) => {
      const b = e.target.closest("[data-l]");
      if (!b) return;
      state.settings.levels[seg.dataset.skill] = b.dataset.l;
      seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      // missões de hoje continuam; as de amanhã usam o novo nível
      save();
    };
  });
}

// ================================================================ HOME
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function homePage() {
  const daily = ensureDaily();
  const done = daily.missions.filter((m) => m.done).length;
  const streak = currentStreak();
  const { lvl, cur, need } = xpLevel();
  const ds = deckStats();
  const mistakes = mistakeIds().length;
  const nextLesson = LESSONS.find((l) => !state.lessons[l.id]?.done);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const wod = wordOfDay();
  const doneToday = state.streak.lastDay === today();

  return `
  <header class="top">
    <div>
      <p class="muted small">${esc(fmtDate(today()))}</p>
      <h1>${greeting()}</h1>
    </div>
    <div class="pills">
      <span class="pill flame ${doneToday ? "lit" : ""}" title="Ofensiva">${icon("flame", 18)} ${streak}</span>
      <span class="pill xp" title="Nível">${icon("bolt", 18)} Lv ${lvl}</span>
    </div>
  </header>
  <div class="xpbar" title="${cur}/${need} XP para o próximo nível"><i style="width:${Math.round((cur / need) * 100)}%"></i></div>

  ${!doneToday ? `<p class="streak-hint">${icon("flame", 16)} ${streak ? `Faça 1 missão hoje para manter sua ofensiva de ${streak} ${streak === 1 ? "dia" : "dias"}.` : "Complete uma missão para começar sua ofensiva."}</p>` : ""}

  <section class="card missions">
    <div class="sec-head"><h2>Missões de hoje</h2><span class="count">${done}/3</span></div>
    <div class="segbar">${daily.missions.map((m) => `<i class="${m.done ? "on" : ""}"></i>`).join("")}</div>
    ${daily.missions.map((m, i) => {
      const meta = MISSIONS_META[m.id];
      const n = m.id === "vocab" ? `${Math.min(8, Math.max(dueWordIds(8).length, 5))} cards + ${m.items.length} falas` : `${m.items.length} exercícios`;
      return `<button class="mission ${m.done ? "done" : ""}" data-mission="${i}">
        <span class="m-icon">${icon(meta.icon, 24)}</span>
        <span class="m-text"><b>${meta.title}</b><small>${meta.sub}</small><small class="muted">≈ 5 min · ${n}</small></span>
        <span class="m-state">${m.done ? `<span class="m-score">${m.score}%</span>${icon("check", 20)}` : icon("chevron", 20)}</span>
      </button>`;
    }).join("")}
    ${daily.bonus ? `<div class="done-banner">${icon("sparkles", 18)} Dia completo! +30 XP bônus. Volte amanhã para novas missões.</div>` : ""}
  </section>

  <section class="grid2">
    <button class="card tile" id="go-review">
      ${icon("cards", 26)}<b>Revisar palavras</b><small>${ds.due ? `${ds.due} para hoje` : "Nada pendente"}</small>
    </button>
    <button class="card tile" id="go-mistakes" ${mistakes ? "" : "disabled"}>
      ${icon("target", 26)}<b>Praticar meus erros</b><small>${mistakes ? `${mistakes} para refazer` : "Nenhum erro salvo"}</small>
    </button>
  </section>

  ${nextLesson ? `<button class="card continue" id="go-lesson" data-lesson="${nextLesson.id}">
      <span class="chip lvl">${nextLesson.level}</span>
      <span class="c-text"><small class="muted">Próxima lição · ${esc(TRACKS.find((t) => t.id === nextLesson.track).name)}</small><b>${esc(nextLesson.title)}</b></span>
      ${icon("chevron", 20)}
    </button>` : ""}

  <button class="card practice" id="go-practice">${icon("bolt", 20)} Treino livre (7 exercícios variados)</button>

  <section class="card wod">
    <div class="sec-head"><h2>Expressão do dia</h2><button class="mini-play" data-say="${esc(wod.en.replace(/\(.*?\)/g, ""))}">${icon("volume", 18)}</button></div>
    <p class="wod-en">${esc(wod.en)}</p>
    <p class="muted">${esc(wod.pt)}</p>
    <p class="wod-ex">“${esc(wod.ex)}” <button class="mini-play" data-say="${esc(wod.ex)}">${icon("volume", 16)}</button></p>
  </section>

  ${isIOS && !standalone ? `<section class="card soft install">${icon("share", 20)}<span>Para instalar: <b>Compartilhar → Adicionar à Tela de Início</b> no Safari.</span></section>` : ""}
  <div class="spacer"></div>`;
}

function wordOfDay() {
  const pool = WORDS.filter((w) => ["slang", "meetings", "speech"].includes(LESSON_BY_ID[w.lesson].track));
  const rng = seededRng("wod-" + today());
  return pool[Math.floor(rng() * pool.length)];
}

function bindHome() {
  document.querySelectorAll("[data-mission]").forEach((b) => (b.onclick = () => {
    const m = state.daily.missions[+b.dataset.mission];
    const meta = MISSIONS_META[m.id];
    run({ kind: "mission", refId: m.id, title: `Missão: ${meta.title}`, steps: buildMissionSteps(m) });
  }));
  document.getElementById("go-review").onclick = () => startReview();
  const gm = document.getElementById("go-mistakes");
  if (gm) gm.onclick = () => run({ kind: "mistakes", title: "Praticar meus erros", steps: buildMistakeSteps(mistakeIds()) });
  const gl = document.getElementById("go-lesson");
  if (gl) gl.onclick = () => startLesson(gl.dataset.lesson);
  document.getElementById("go-practice").onclick = () => run({ kind: "practice", title: "Treino livre", steps: buildPracticeSteps() });
  bindSayGlobal();
}

function startReview() {
  run({ kind: "review", title: "Revisão de palavras", steps: buildReviewSteps() });
}
function startLesson(id) {
  const l = LESSON_BY_ID[id];
  run({ kind: "lesson", refId: id, title: `Lição: ${l.title}`, steps: buildLessonSteps(id) });
}

function bindSayGlobal() {
  document.querySelectorAll("#page [data-say]").forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    speak(b.dataset.say);
  }));
}

// ================================================================ TRILHAS
function tracksPage() {
  if (ui.track) return trackDetail(ui.track);
  return `
  <header class="top"><div><h1>Trilhas</h1><p class="muted">Estude por tema, no seu ritmo.</p></div></header>
  ${TRACKS.map((t) => {
    const ls = LESSONS.filter((l) => l.track === t.id);
    const done = ls.filter((l) => state.lessons[l.id]?.done).length;
    const levels = [...new Set(ls.map((l) => l.level))].join(" · ");
    return `<button class="card track" data-track="${t.id}">
      <span class="t-icon">${esc(t.icon)}</span>
      <span class="t-text"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small>
        <span class="t-meta"><span class="minibar"><i style="width:${(done / ls.length) * 100}%"></i></span><small>${done}/${ls.length} lições · ${levels}</small></span>
      </span>
      ${icon("chevron", 20)}
    </button>`;
  }).join("")}
  <div class="spacer"></div>`;
}

function trackDetail(id) {
  const t = TRACKS.find((x) => x.id === id);
  const ls = LESSONS.filter((l) => l.track === id);
  return `
  <header class="top"><button class="icon-btn" id="back">${icon("back")}</button><div><h1>${esc(t.name)}</h1><p class="muted">${esc(t.desc)}</p></div></header>
  ${ls.map((l) => {
    const st = state.lessons[l.id];
    const types = [...new Set(l.items.map((i) => skillOf(i)))].map((s) => SKILLS[s]).join(" · ");
    return `<button class="card lesson ${st?.done ? "done" : ""}" data-lesson="${l.id}">
      <span class="chip lvl">${l.level}</span>
      <span class="l-text"><b>${esc(l.title)}</b><small>${esc(l.desc)}</small><small class="muted">${l.items.length} exercícios · ${l.words.length} palavras · ${types}</small></span>
      <span class="l-state">${st?.done ? `<span class="m-score">${st.best}%</span>${icon("check", 18)}` : icon("chevron", 18)}</span>
    </button>`;
  }).join("")}
  <div class="spacer"></div>`;
}

function bindTracks() {
  document.querySelectorAll("[data-track]").forEach((b) => (b.onclick = () => { ui.track = b.dataset.track; render(); window.scrollTo(0, 0); }));
  document.querySelectorAll("[data-lesson]").forEach((b) => (b.onclick = () => startLesson(b.dataset.lesson)));
  const back = document.getElementById("back");
  if (back) back.onclick = () => { ui.track = null; render(); };
}

// ================================================================ REVISAR
function reviewPage() {
  const ds = deckStats();
  const mistakes = mistakeIds().length;
  const q = ui.glossQ.toLowerCase();
  const words = WORDS.filter((w) => !q || w.en.toLowerCase().includes(q) || w.pt.toLowerCase().includes(q));
  return `
  <header class="top"><div><h1>Revisar</h1><p class="muted">Repetição espaçada: cada palavra volta no momento certo.</p></div></header>
  <section class="stats4">
    <div class="stat"><b>${ds.due}</b><span>para hoje</span></div>
    <div class="stat"><b>${ds.learning}</b><span>aprendendo</span></div>
    <div class="stat"><b>${ds.mastered}</b><span>dominadas</span></div>
    <div class="stat"><b>${ds.total}</b><span>no baralho</span></div>
  </section>
  <button class="btn primary big full" id="rv-start">${ds.due ? `Revisar ${Math.min(ds.due, 15)} palavras` : "Aprender palavras novas"}</button>
  <button class="btn ghost full" id="rv-mist" ${mistakes ? "" : "disabled"}>${icon("target", 18)} Praticar meus erros ${mistakes ? `(${mistakes})` : ""}</button>

  <section class="card gloss">
    <div class="sec-head"><h2>Glossário</h2><span class="count">${WORDS.length} termos</span></div>
    <label class="search">${icon("search", 18)}<input id="gq" type="search" placeholder="Buscar em inglês ou português" value="${esc(ui.glossQ)}"></label>
    <ul class="glist">${words.map((w) => {
      const c = state.deck[w.id];
      const st = !c ? "new" : c.interval >= 21 ? "master" : "learn";
      return `<li><span class="dot ${st}" title="${st === "new" ? "nova" : st === "master" ? "dominada" : "aprendendo"}"></span>
        <span class="g-text"><b>${esc(w.en)}</b><small>${esc(w.pt)}</small></span>
        <button class="mini-play" data-say="${esc(w.en.replace(/\(.*?\)/g, ""))}">${icon("volume", 16)}</button></li>`;
    }).join("")}</ul>
    <p class="muted small legend"><span class="dot new"></span> nova <span class="dot learn"></span> aprendendo <span class="dot master"></span> dominada (intervalo ≥ 21 dias)</p>
  </section>
  <div class="spacer"></div>`;
}

function bindReview() {
  document.getElementById("rv-start").onclick = startReview;
  const m = document.getElementById("rv-mist");
  if (m) m.onclick = () => run({ kind: "mistakes", title: "Praticar meus erros", steps: buildMistakeSteps(mistakeIds()) });
  const gq = document.getElementById("gq");
  gq.oninput = () => {
    ui.glossQ = gq.value;
    const pos = gq.selectionStart;
    render();
    const n = document.getElementById("gq");
    n.focus();
    n.setSelectionRange(pos, pos);
  };
  bindSayGlobal();
}

// ================================================================ HISTÓRICO
function skillAccuracy() {
  const acc = { reading: [0, 0], writing: [0, 0], listening: [0, 0], speaking: [0, 0] };
  for (const [id, s] of Object.entries(state.itemStats)) {
    const it = ITEM_BY_ID[id];
    if (!it) continue;
    const k = skillOf(it);
    acc[k][0] += s.ok;
    acc[k][1] += s.ok + s.bad;
  }
  return acc;
}

function heatmap() {
  const weeks = 15;
  const t = today();
  const dow = new Date().getDay(); // 0 = domingo
  const start = addDays(t, -(weeks * 7 - 1) + (6 - dow));
  let cells = "";
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const info = state.days[d];
    const xp = info?.xp || 0;
    const lvl = d > t ? "future" : xp === 0 ? "l0" : xp < 40 ? "l1" : xp < 90 ? "l2" : xp < 160 ? "l3" : "l4";
    cells += `<i class="${lvl}" title="${d}: ${xp} XP"></i>`;
  }
  return `<div class="heat">${cells}</div>
    <div class="heat-legend muted small"><span>menos</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>mais</span></div>`;
}

const KIND_NAMES = { mission: "Missão", lesson: "Lição", review: "Revisão", practice: "Treino", mistakes: "Erros" };

function historyPage() {
  const { lvl, cur, need } = xpLevel();
  const activeDays = Object.values(state.days).filter((d) => d.xp > 0).length;
  const totalSecs = Object.values(state.days).reduce((a, d) => a + (d.secs || 0), 0);
  const ds = deckStats();
  const acc = skillAccuracy();
  const hist = state.history.slice(0, ui.histLimit);
  let lastDay = "";
  const list = hist.map((h) => {
    const d = new Date(h.ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const head = day !== lastDay ? `<li class="h-day">${esc(fmtDate(day))}</li>` : "";
    lastDay = day;
    const pct = h.total ? Math.round((h.correct / h.total) * 100) : 100;
    return `${head}<li class="h-item">
      <details>
        <summary>
          <span class="h-kind k-${h.kind}">${KIND_NAMES[h.kind] || h.kind}</span>
          <span class="h-title">${esc(h.title.replace(/^(Missão|Lição): /, ""))}</span>
          <span class="h-meta">${pct}% · +${h.xp} XP</span>
        </summary>
        <div class="h-body">
          <p class="muted small">${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${fmtTime(h.secs || 0)} · ${h.correct}/${h.total} acertos</p>
          ${h.mistakes?.length ? `<p class="small"><b>Erros:</b></p><ul class="mlist">${h.mistakes.map((m) => `<li>${esc(m.label)}</li>`).join("")}</ul>` : `<p class="small">Sem erros.</p>`}
        </div>
      </details>
    </li>`;
  }).join("");

  return `
  <header class="top"><div><h1>Histórico</h1><p class="muted">Tudo fica salvo no seu iPhone.</p></div></header>
  <section class="stats3">
    <div class="stat flame"><b>${icon("flame", 20)} ${currentStreak()}</b><span>ofensiva</span></div>
    <div class="stat"><b>${state.streak.best}</b><span>recorde</span></div>
    <div class="stat xp"><b>${state.xp}</b><span>XP total</span></div>
  </section>
  <section class="stats3">
    <div class="stat"><b>Lv ${lvl}</b><span>${cur}/${need} XP</span></div>
    <div class="stat"><b>${activeDays}</b><span>dias ativos</span></div>
    <div class="stat"><b>${Math.round(totalSecs / 60)}</b><span>minutos</span></div>
  </section>

  <section class="card">
    <div class="sec-head"><h2>Atividade</h2><span class="count">${ds.mastered} palavras dominadas</span></div>
    ${heatmap()}
  </section>

  <section class="card">
    <div class="sec-head"><h2>Acertos por habilidade</h2></div>
    ${Object.entries(SKILLS).map(([k, label]) => {
      const [ok, tot] = acc[k];
      const p = tot ? Math.round((ok / tot) * 100) : 0;
      return `<div class="skill-row"><span>${label} <small class="muted">${state.settings.levels[k]}</small></span>
        <span class="minibar wide"><i style="width:${p}%"></i></span><span class="pct">${tot ? p + "%" : "—"}</span></div>`;
    }).join("")}
    <p class="muted small">Acertando acima de 85% numa habilidade com frequência? Talvez seja hora de subir o nível em Ajustes.</p>
  </section>

  <section class="card">
    <div class="sec-head"><h2>Sessões</h2><span class="count">${state.history.length}</span></div>
    ${state.history.length ? `<ul class="hlist">${list}</ul>` : `<p class="muted">Suas sessões aparecem aqui assim que você concluir a primeira missão.</p>`}
    ${state.history.length > ui.histLimit ? `<button class="btn ghost full" id="more">Ver mais</button>` : ""}
  </section>
  <div class="spacer"></div>`;
}

function bindHistory() {
  const more = document.getElementById("more");
  if (more) more.onclick = () => { ui.histLimit += 25; render(); };
}

// ================================================================ AJUSTES
function settingsPage() {
  const s = state.settings;
  const voices = englishVoices();
  const key = s.apiKey ? s.apiKey.slice(0, 6) + "•••••••" + s.apiKey.slice(-4) : "";
  return `
  <header class="top"><div><h1>Ajustes</h1></div></header>

  <section class="card">
    <h2>Seus níveis</h2>
    <p class="muted small">As missões escolhem exercícios perto do seu nível em cada habilidade.</p>
    ${levelSelectors(s.levels)}
  </section>

  <section class="card">
    <h2>Voz</h2>
    ${ttsSupported() ? `
    <label class="field"><span>Voz principal</span>
      <select id="voice">
        <option value="">Automática (melhor disponível)</option>
        ${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${s.voiceURI === v.voiceURI ? "selected" : ""}>${esc(v.name)} · ${esc(ACCENTS[v.lang.replace("_", "-")] || v.lang)}</option>`).join("")}
      </select>
    </label>
    <div class="field"><span>Velocidade</span>
      <div class="seg" id="rate">${[0.8, 0.9, 1, 1.1].map((r) => `<button data-r="${r}" class="${s.rate === r ? "on" : ""}">${r}x</button>`).join("")}</div>
    </div>
    <label class="toggle"><input type="checkbox" id="vary" ${s.varyAccents ? "checked" : ""}><span>Variar sotaques na escuta (a partir do B1)</span></label>
    <button class="btn ghost" id="test-voice">${icon("volume", 18)} Testar voz</button>
    <p class="muted small">Dica: no iPhone, vá em Ajustes → Acessibilidade → Conteúdo Falado → Vozes → Inglês e baixe vozes "Aprimoradas" (Enhanced) para um som mais natural.</p>
    ` : `<p class="muted">Este navegador não tem síntese de voz.</p>`}
  </section>

  <section class="card">
    <h2>${icon("sparkles", 20)} IA · Gemini</h2>
    <p class="muted small">Usada para avaliar sua pronúncia e corrigir seus textos. A chave fica salva só neste aparelho e nunca vai para o GitHub.</p>
    <label class="field"><span>Chave da API ${hasKey() ? `<em class="ok-tag">salva</em>` : ""}</span>
      <input id="key" type="password" autocomplete="off" placeholder="${key || "Cole aqui sua chave (AIza…)"}">
    </label>
    <div class="row2"><button class="btn primary" id="save-key">Salvar chave</button>${hasKey() ? `<button class="btn ghost" id="del-key">Remover</button>` : ""}</div>
    <label class="field"><span>Modelo</span>
      <div class="row-input"><select id="model"><option value="${esc(s.model)}">${esc(s.model)}</option></select>
      <button class="btn ghost small" id="load-models" ${hasKey() ? "" : "disabled"}>${icon("refresh", 16)}</button></div>
    </label>
    <button class="btn ghost full" id="test-ai" ${hasKey() ? "" : "disabled"}>Testar conexão</button>
    <div id="ai-status" class="muted small"></div>
    <details class="howto"><summary>Como pegar a chave grátis</summary>
      <ol>
        <li>Acesse <b>aistudio.google.com</b> com sua conta Google</li>
        <li>Clique em <b>Get API key</b> → <b>Create API key</b> → <b>em um novo projeto</b> (assim a cota fica separada do seu outro app)</li>
        <li>Copie a chave e cole aqui</li>
        <li><b>Não</b> ative faturamento (billing). Sem cartão, nunca há cobrança: quando a cota grátis acaba, o app só volta para o modo sem IA até o dia seguinte.</li>
      </ol>
    </details>
  </section>

  <section class="card">
    <h2>Backup</h2>
    <p class="muted small">Seus dados ficam só neste aparelho. Exporte de vez em quando para não perder nada.</p>
    <div class="row2">
      <button class="btn ghost" id="export">${icon("download", 18)} Exportar</button>
      <label class="btn ghost file">${icon("upload", 18)} Importar<input type="file" id="import" accept="application/json,.json"></label>
    </div>
  </section>

  <section class="card danger">
    <h2>Zona de perigo</h2>
    <button class="btn danger-btn full" id="reset">Apagar todo o progresso</button>
  </section>

  <p class="muted small center">DevEnglish v${VERSION} · feito para estudar todo dia</p>
  <div class="spacer"></div>`;
}

function bindSettings() {
  const s = state.settings;
  bindLevelSelectors();
  const voice = document.getElementById("voice");
  if (voice) voice.onchange = () => { s.voiceURI = voice.value; save(); speak("Hi! This is my voice."); };
  const rate = document.getElementById("rate");
  if (rate) rate.onclick = (e) => {
    const b = e.target.closest("[data-r]");
    if (!b) return;
    s.rate = parseFloat(b.dataset.r);
    rate.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    save();
  };
  const vary = document.getElementById("vary");
  if (vary) vary.onchange = () => { s.varyAccents = vary.checked; save(); };
  const tv = document.getElementById("test-voice");
  if (tv) tv.onclick = () => speak("The build failed because of a missing environment variable.");

  document.getElementById("save-key").onclick = async () => {
    const v = document.getElementById("key").value.trim();
    if (!v) return toast("Cole a chave primeiro.");
    s.apiKey = v;
    save();
    toast("Chave salva!");
    render();
    autoPickModel();
  };
  const del = document.getElementById("del-key");
  if (del) del.onclick = () => { s.apiKey = ""; save(); render(); };
  const model = document.getElementById("model");
  model.onchange = () => { s.model = model.value; save(); };
  document.getElementById("load-models").onclick = autoPickModel;
  document.getElementById("test-ai").onclick = async () => {
    const st = document.getElementById("ai-status");
    st.innerHTML = `<span class="spinner"></span> Testando…`;
    try {
      const ok = await testConnection();
      st.innerHTML = ok ? `<span class="ok-text">${icon("check", 16)} Tudo certo com o modelo ${esc(s.model)}.</span>` : "Resposta inesperada.";
    } catch (e) {
      st.innerHTML = `<span class="err-text">${esc(e.message)}</span>`;
    }
  };

  document.getElementById("export").onclick = exportBackup;
  document.getElementById("import").onchange = importBackup;
  document.getElementById("reset").onclick = async () => {
    const ok = await modal("<h3>Apagar tudo?</h3><p class='muted'>Isso apaga XP, ofensiva, histórico e palavras. Não dá para desfazer (a não ser que você tenha um backup).</p>",
      [{ label: "Cancelar", value: false, cls: "ghost" }, { label: "Apagar", value: true, cls: "danger-btn" }]);
    if (!ok) return;
    resetState();
    obStep = 0;
    render();
  };
}

async function autoPickModel() {
  const st = document.getElementById("ai-status");
  if (st) st.innerHTML = `<span class="spinner"></span> Carregando modelos…`;
  try {
    const models = await listModels();
    if (!models.length) throw new Error("Nenhum modelo disponível para essa chave.");
    if (!models.includes(state.settings.model)) state.settings.model = suggestModel(models);
    save();
    const sel = document.getElementById("model");
    if (sel) sel.innerHTML = models.map((m) => `<option ${m === state.settings.model ? "selected" : ""}>${esc(m)}</option>`).join("");
    if (st) st.innerHTML = `<span class="ok-text">${icon("check", 16)} ${models.length} modelos encontrados. Usando ${esc(state.settings.model)}.</span>`;
  } catch (e) {
    if (st) st.innerHTML = `<span class="err-text">${esc(e.message)}</span>`;
  }
}

function exportBackup() {
  const data = JSON.stringify({ ...state, settings: { ...state.settings, apiKey: "" } }, null, 1);
  const blob = new Blob([data], { type: "application/json" });
  const name = `devenglish-backup-${today()}.json`;
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: "Backup DevEnglish" }).catch(() => {});
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  toast("Backup exportado (a chave da API não vai junto).");
}

function importBackup(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const data = JSON.parse(r.result);
      if (!data.settings || !data.history) throw new Error();
      const ok = await modal("<h3>Importar backup?</h3><p class='muted'>O progresso atual será substituído pelo do arquivo.</p>",
        [{ label: "Cancelar", value: false, cls: "ghost" }, { label: "Importar", value: true, cls: "primary" }]);
      if (!ok) return;
      const key = state.settings.apiKey;
      replaceState(data);
      if (!state.settings.apiKey) state.settings.apiKey = key;
      save();
      toast("Backup restaurado!");
      render();
    } catch (err) {
      toast("Arquivo inválido.");
    }
  };
  r.readAsText(f);
}

// ================================================================ registro
const PAGES = { home: homePage, tracks: tracksPage, review: reviewPage, history: historyPage, settings: settingsPage };
const BINDERS = { home: bindHome, tracks: bindTracks, review: bindReview, history: bindHistory, settings: bindSettings };

export function logoSVG(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#0f1620"/>
    <path d="M18 22l-8 10 8 10" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M46 22l8 10-8 10" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="32" y="39" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="17" fill="#4ade80">en</text>
  </svg>`;
}

// ================================================================ boot
render();
document.addEventListener("visibilitychange", () => {
  // virou o dia com o app aberto → novas missões
  if (!document.hidden && state.daily && state.daily.date !== today() && !isRunning()) render();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

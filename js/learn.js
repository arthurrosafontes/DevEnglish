// Repetição espaçada (SRS) + geração das missões diárias
import { ITEMS, WORDS, LESSON_BY_ID, LEVELS, SKILL_OF_TYPE, ITEM_BY_ID } from "./content.js";
import { state, today, addDays, seededRng, shuffle, save } from "./store.js";

export const lvlIdx = (l) => LEVELS.indexOf(l);

export function skillOf(item) {
  if (item.type === "mcq" && item.audio) return "listening";
  return SKILL_OF_TYPE[item.type] || "reading";
}

// =============== SRS (SM-2 simplificado) ===============
// nota: 0 = errei, 1 = difícil, 2 = bom, 3 = fácil
export function reviewCard(wordId, grade) {
  const c = state.deck[wordId] || newCard();
  if (grade === 0) {
    c.reps = 0;
    c.interval = 0;
    c.lapses++;
    c.ef = Math.max(1.3, c.ef - 0.2);
    c.due = today();
  } else {
    c.reps++;
    if (c.reps === 1) c.interval = grade === 3 ? 3 : 1;
    else if (c.reps === 2) c.interval = grade === 1 ? 3 : grade === 3 ? 7 : 6;
    else c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ef * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1)));
    c.ef = Math.max(1.3, c.ef + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
    c.due = addDays(today(), c.interval);
  }
  c.lastReview = Date.now();
  state.deck[wordId] = c;
}

function newCard() {
  return { ef: 2.5, interval: 0, reps: 0, due: today(), lapses: 0, added: Date.now() };
}

export function addWordsToDeck(ids) {
  let n = 0;
  for (const id of ids) {
    if (!state.deck[id]) { state.deck[id] = newCard(); n++; }
  }
  return n;
}

export function deckStats() {
  const t = today();
  const cards = Object.values(state.deck);
  return {
    total: cards.length,
    due: cards.filter((c) => c.due <= t).length,
    learning: cards.filter((c) => c.interval > 0 && c.interval < 21).length,
    mastered: cards.filter((c) => c.interval >= 21).length,
    fresh: cards.filter((c) => c.reps === 0).length,
  };
}

export function dueWordIds(limit = 99) {
  const t = today();
  return Object.entries(state.deck)
    .filter(([, c]) => c.due <= t)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
    .slice(0, limit)
    .map(([id]) => id);
}

// Palavras ainda não vistas, perto do nível de leitura do usuário
export function newWordIds(limit) {
  const lv = lvlIdx(state.settings.levels.reading);
  return WORDS
    .filter((w) => !state.deck[w.id] && lvlIdx(w.level) <= lv + 1)
    .sort((a, b) => Math.abs(lvlIdx(a.level) - lv) - Math.abs(lvlIdx(b.level) - lv))
    .slice(0, limit)
    .map((w) => w.id);
}

// =============== Seleção de exercícios ===============
function pick(types, n, rng, exclude = new Set()) {
  const now = Date.now();
  const week = 7 * 864e5;
  const scored = ITEMS
    .filter((it) => types.includes(it.type) && !exclude.has(it.id))
    .map((it) => {
      const userLv = lvlIdx(state.settings.levels[skillOf(it)]);
      const dist = Math.abs(lvlIdx(it.level) - userLv);
      const st = state.itemStats[it.id];
      let score = rng();
      score += dist * 0.9;                       // prefere o nível certo
      if (lvlIdx(it.level) > userLv + 1) score += 3; // difícil demais
      if (st && now - st.last < week) score += st.lastOk ? 1.5 : -0.3; // revisa erros
      if (st && st.seen > 0) score += 0.3;       // prefere inéditos
      return { it, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.it.id);
  scored.forEach((id) => exclude.add(id));
  return scored;
}

export const MISSIONS_META = {
  listen: { title: "Ouvido afiado", sub: "Escuta: frases, ditado e fala rápida", icon: "headphones" },
  read: { title: "Leitura de dev", sub: "Leitura e escrita do dia a dia", icon: "book" },
  vocab: { title: "Vocabulário & fala", sub: "Revisão de palavras + pronúncia", icon: "mic" },
};

export function ensureDaily() {
  const t = today();
  if (state.daily && state.daily.date === t) return state.daily;
  const rng = seededRng("devenglish-" + t);
  const used = new Set();
  const listen = [
    ...pick(["listen"], 1, rng, used),
    ...pick(["buildup"], 1, rng, used),
    ...pick(["listen"], 1, rng, used),
    ...pick(["dict"], 1, rng, used),
    ...pick(["dict", "listen"], 1, rng, used),
  ];
  const read = [
    ...pick(["read"], 1, rng, used),
    ...pick(["fill"], 1, rng, used),
    ...pick(["order"], 1, rng, used),
    ...pick(["mcq", "match", "write"], 1, rng, used),
  ];
  const speak = pick(["speak"], 2, rng, used);
  state.daily = {
    date: t,
    missions: [
      { id: "listen", items: listen, done: false, score: null },
      { id: "read", items: read, done: false, score: null },
      { id: "vocab", items: speak, done: false, score: null },
    ],
    bonus: false,
  };
  save();
  return state.daily;
}

// Monta a lista de passos de uma sessão
export function buildMissionSteps(mission) {
  const items = mission.items.filter((id) => ITEM_BY_ID[id]).map((id) => ({ kind: "item", id }));
  if (mission.id !== "vocab") return items;
  let cards = dueWordIds(8);
  if (cards.length < 8) cards = cards.concat(newWordIds(Math.min(5, 8 - cards.length)));
  addWordsToDeck(cards);
  return [...cards.map((id) => ({ kind: "card", id })), ...items];
}

export function buildLessonSteps(lessonId) {
  const l = LESSON_BY_ID[lessonId];
  return [
    ...l.words.slice(0, 4).filter((w) => !state.deck[w.id]).map((w) => ({ kind: "intro", id: w.id })),
    ...l.items.map((it) => ({ kind: "item", id: it.id })),
  ];
}

export function buildReviewSteps() {
  let cards = dueWordIds(15);
  if (!cards.length) cards = newWordIds(8);
  addWordsToDeck(cards);
  return cards.map((id) => ({ kind: "card", id }));
}

export function buildPracticeSteps() {
  const rng = Math.random;
  const used = new Set();
  return shuffle([
    ...pick(["listen", "buildup", "dict"], 3, rng, used),
    ...pick(["read", "fill", "order", "mcq", "match"], 3, rng, used),
    ...pick(["speak", "write"], 1, rng, used),
  ]).map((id) => ({ kind: "item", id }));
}

export function buildMistakeSteps(ids) {
  return ids.slice(0, 10).filter((id) => ITEM_BY_ID[id]).map((id) => ({ kind: "item", id }));
}

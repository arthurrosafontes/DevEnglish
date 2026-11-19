// Estado do app salvo no próprio iPhone (localStorage)
const KEY = "devenglish:v1";

const DEFAULT = () => ({
  version: 1,
  createdAt: Date.now(),
  onboarded: false,
  settings: {
    levels: { reading: "B1", writing: "A2", listening: "A2", speaking: "A2" },
    voiceURI: "",
    rate: 1,
    varyAccents: true,
    apiKey: "",
    model: "gemini-flash-latest",
  },
  xp: 0,
  streak: { count: 0, best: 0, lastDay: null },
  days: {},        // "YYYY-MM-DD": { xp, missions, secs }
  daily: null,     // missões do dia
  itemStats: {},   // id: { seen, ok, bad, last, lastOk }
  deck: {},        // wordId: { ef, interval, reps, due, lapses, added }
  lessons: {},     // lessonId: { best, done, last }
  history: [],     // sessões
});

let memoryFallback = null;

function deepMerge(base, extra) {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return extra ?? base;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k];
  }
  return out;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return deepMerge(DEFAULT(), JSON.parse(raw));
  } catch (e) {
    if (memoryFallback) return memoryFallback;
  }
  return DEFAULT();
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    memoryFallback = state;
  }
}

export function replaceState(obj) {
  const merged = deepMerge(DEFAULT(), obj);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, merged);
  save();
}

export function resetState() {
  replaceState(DEFAULT());
}

// Pede ao navegador para não apagar os dados
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* ignore */ }
}

// ---------- datas ----------
export function dayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function addDays(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dayStr(dt);
}
export function today() { return dayStr(); }

// ---------- aleatório com semente (missões iguais o dia todo) ----------
export function seededRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- XP, ofensiva, histórico ----------
export function addXp(n) {
  state.xp += n;
  const d = today();
  state.days[d] = state.days[d] || { xp: 0, missions: 0, secs: 0 };
  state.days[d].xp += n;
}

export function touchStreak() {
  const d = today();
  const s = state.streak;
  if (s.lastDay === d) return false;
  s.count = s.lastDay === addDays(d, -1) ? s.count + 1 : 1;
  s.lastDay = d;
  s.best = Math.max(s.best, s.count);
  return true;
}

export function currentStreak() {
  const s = state.streak;
  if (!s.lastDay) return 0;
  const d = today();
  if (s.lastDay === d || s.lastDay === addDays(d, -1)) return s.count;
  return 0;
}

export function recordItem(id, ok) {
  const st = state.itemStats[id] || { seen: 0, ok: 0, bad: 0, last: 0, lastOk: null };
  st.seen++;
  ok ? st.ok++ : st.bad++;
  st.last = Date.now();
  st.lastOk = ok;
  state.itemStats[id] = st;
}

export function pushHistory(entry) {
  state.history.unshift({ id: Date.now().toString(36), ts: Date.now(), ...entry });
  if (state.history.length > 600) state.history.length = 600;
  const d = today();
  state.days[d] = state.days[d] || { xp: 0, missions: 0, secs: 0 };
  state.days[d].secs += entry.secs || 0;
}

export function mistakeIds() {
  return Object.entries(state.itemStats)
    .filter(([, s]) => s.lastOk === false)
    .sort((a, b) => b[1].last - a[1].last)
    .map(([id]) => id);
}

export function xpLevel(xp = state.xp) {
  // Nível sobe a cada 300 XP no começo e vai ficando mais lento
  let lvl = 1, need = 300, rest = xp;
  while (rest >= need) { rest -= need; lvl++; need = Math.round(need * 1.15); }
  return { lvl, cur: rest, need };
}

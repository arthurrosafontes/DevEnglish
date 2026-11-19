// Voz (TTS do iPhone) + gravação do microfone
import { state } from "./store.js";

// ===================== TTS =====================
const synth = window.speechSynthesis;
let voicesCache = [];

function loadVoices() {
  if (!synth) return [];
  const v = synth.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if (synth) {
  loadVoices();
  synth.addEventListener?.("voiceschanged", loadVoices);
}

export const ACCENTS = {
  "en-US": "Americano",
  "en-GB": "Britânico",
  "en-AU": "Australiano",
  "en-IN": "Indiano",
  "en-IE": "Irlandês",
  "en-ZA": "Sul-africano",
};

const norm = (lang) => (lang || "").replace("_", "-");

export function englishVoices() {
  return loadVoices()
    .filter((v) => norm(v.lang).toLowerCase().startsWith("en"))
    .sort((a, b) => quality(b) - quality(a));
}

// Prefere vozes "Enhanced/Premium" e as conhecidas do iOS
function quality(v) {
  const n = v.name.toLowerCase();
  let q = 0;
  if (/premium/.test(n)) q += 4;
  if (/enhanced|aprimorad|neural|natural/.test(n)) q += 3;
  if (/samantha|ava|zoe|evan|nathan|daniel|serena|karen|moira|rishi|tessa|allison|tom/.test(n)) q += 1;
  if (/eloquence|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bahh|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|sandy|flo|reed/.test(n)) q -= 10;
  if (norm(v.lang) === "en-US") q += 0.5;
  return q;
}

function pickVoice(accent) {
  const voices = englishVoices();
  if (!voices.length) return null;
  if (accent) {
    const match = voices.find((v) => norm(v.lang) === accent && quality(v) > -5);
    if (match) return match;
  }
  const chosen = state.settings.voiceURI && voices.find((v) => v.voiceURI === state.settings.voiceURI);
  return chosen || voices.find((v) => norm(v.lang) === "en-US") || voices[0];
}

export function availableAccents() {
  const langs = new Set(englishVoices().filter((v) => quality(v) > -5).map((v) => norm(v.lang)));
  return Object.keys(ACCENTS).filter((a) => langs.has(a));
}

export function ttsSupported() { return !!synth; }

/** Fala um texto. Retorna uma Promise que resolve ao terminar. */
export function speak(text, { rate = 1, accent = null } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(accent);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
    u.rate = Math.max(0.5, Math.min(1.3, rate * (state.settings.rate || 1)));
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(true); } };
    u.onend = finish;
    u.onerror = finish;
    // segurança: iOS às vezes não dispara onend
    setTimeout(finish, 1500 + text.length * 120 / u.rate);
    synth.speak(u);
  });
}

export function stopSpeaking() { if (synth) synth.cancel(); }

// Sotaque para a escuta: varia a partir do B1 se a opção estiver ligada
export function accentFor(seed) {
  if (!state.settings.varyAccents) return null;
  const lv = state.settings.levels.listening;
  if (!["B1", "B2", "C1", "C2"].includes(lv)) return null;
  const list = availableAccents();
  if (list.length < 2) return null;
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // metade das vezes americano, metade outro sotaque
  if (h % 2 === 0) return "en-US";
  return list[h % list.length];
}

// ===================== GRAVAÇÃO =====================
export function recordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function pickMime() {
  const opts = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  for (const m of opts) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* */ }
  }
  return "";
}

/**
 * Começa a gravar. Retorna { stop(): Promise<{blob, url, mime}> }
 * Para sozinho depois de maxMs.
 */
export async function startRecording(maxMs = 15000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  let resolveStop;
  const stopped = new Promise((r) => (resolveStop = r));
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const type = (rec.mimeType || mime || "audio/mp4").split(";")[0];
    const blob = new Blob(chunks, { type });
    resolveStop({ blob, url: URL.createObjectURL(blob), mime: type });
  };
  rec.start();
  const timer = setTimeout(() => rec.state !== "inactive" && rec.stop(), maxMs);
  return {
    stop() {
      clearTimeout(timer);
      if (rec.state !== "inactive") rec.stop();
      return stopped;
    },
    stopped,
  };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

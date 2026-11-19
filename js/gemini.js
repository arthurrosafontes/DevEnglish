// Integração com a API do Gemini (Google AI Studio)
// A chave fica salva só no seu iPhone (Ajustes do app).
import { state } from "./store.js";
import { blobToBase64 } from "./audio.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}

export function hasKey() {
  return !!(state.settings.apiKey && state.settings.apiKey.trim().length > 20);
}
export function aiAvailable() {
  return hasKey() && navigator.onLine !== false;
}

async function call(path, body) {
  const key = state.settings.apiKey.trim();
  const res = await fetch(`${BASE}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || msg; } catch (e) { /* */ }
    if (res.status === 429) throw new GeminiError("Cota gratuita do Gemini esgotada por agora. Tente mais tarde.", 429);
    if (res.status === 400 && /api key/i.test(msg)) throw new GeminiError("Chave da API inválida. Confira em Ajustes.", 400);
    if (res.status === 403) throw new GeminiError("Chave sem permissão (403). Confira em Ajustes.", 403);
    if (res.status === 404) throw new GeminiError("Modelo não encontrado. Escolha outro em Ajustes.", 404);
    throw new GeminiError(msg, res.status);
  }
  return res.json();
}

/** Lista os modelos que geram texto, mais recentes primeiro. */
export async function listModels() {
  const data = await call("models?pageSize=200");
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => /gemini/.test(n) && !/(tts|image|live|embedding|audio|robotics|computer)/.test(n))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

/** Escolhe automaticamente um bom modelo "flash" (rápido e com cota grátis). */
export function suggestModel(models) {
  if (models.includes("gemini-flash-latest")) return "gemini-flash-latest";
  const flash = models.filter((m) => /flash/.test(m) && !/lite|preview|exp/.test(m));
  return flash[0] || models.find((m) => /flash/.test(m)) || models[0];
}

async function generateJSON(parts) {
  const model = state.settings.model || "gemini-flash-latest";
  const data = await call(`models/${model}:generateContent`, {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, ""));
  } catch (e) {
    throw new GeminiError("A IA respondeu num formato inesperado. Tente de novo.");
  }
}

export async function testConnection() {
  const r = await generateJSON([{ text: 'Reply with this exact JSON: {"ok": true}' }]);
  return r.ok === true;
}

/** Avalia a pronúncia de uma gravação comparando com a frase alvo. */
export async function evaluateSpeech(blob, target, level) {
  const data = await blobToBase64(blob);
  const prompt = `You are a strict but kind English pronunciation coach for a Brazilian software developer (CEFR level ${level}).
The student tried to say this TARGET sentence:
"${target}"

Listen to the audio. Transcribe LITERALLY what you hear, do NOT auto-correct mispronounced words into the target words.
Then compare word by word with the target.

Return ONLY JSON with this shape:
{
  "heard": "literal transcription",
  "score": 0-100 (overall intelligibility and accuracy),
  "words": [{"w": "each target word in order", "ok": true/false, "note": "short tip in Brazilian Portuguese if not ok, else empty"}],
  "feedback_pt": "1-2 short sentences in Brazilian Portuguese: what was good and the single most important thing to improve. Use simple phonetic hints a Brazilian understands (ex: 'think' = língua entre os dentes)."
}
If the audio is silent or not English, return score 0 and explain in feedback_pt.`;
  return generateJSON([{ text: prompt }, { inline_data: { mime_type: blob.type || "audio/mp4", data } }]);
}

/** Corrige um texto escrito pelo aluno. */
export async function evaluateWriting(task, model, answer, level) {
  const prompt = `You are an English teacher for a Brazilian software developer (CEFR level ${level}).
TASK (in Portuguese): ${task}
A good example answer: ${model}
STUDENT ANSWER: ${answer}

Evaluate if the student's answer completes the task with understandable, natural English. Small mistakes are OK for this level, but point them out.
Return ONLY JSON:
{
  "ok": true/false (true if the message is understandable and does the task),
  "score": 0-100,
  "corrected": "the student's answer corrected and made natural, keeping their idea",
  "feedback_pt": "2-3 short sentences in Brazilian Portuguese explaining the main corrections"
}`;
  return generateJSON([{ text: prompt }]);
}

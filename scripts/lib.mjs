import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const DATA = path.join(ROOT, "data");

export function env(key, fallback) {
  if (process.env[key]) return process.env[key];
  const file = path.join(ROOT, ".env");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && m[1] === key) return m[2];
    }
  }
  return fallback;
}

export function ensureData() {
  fs.mkdirSync(DATA, { recursive: true });
}

export class NdjsonWriter {
  constructor(file) {
    ensureData();
    this.path = path.join(DATA, file);
    this.stream = fs.createWriteStream(this.path, { flags: "w" });
    this.count = 0;
  }
  write(obj) {
    this.stream.write(JSON.stringify(obj) + "\n");
    this.count += 1;
  }
  close() {
    return new Promise((res) => this.stream.end(res));
  }
}

export function readNdjson(file) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET com retentativa e backoff. Devolve texto. */
export async function get(url, { tries = 5, headers = {}, timeout = 60000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Aurora/0.1 (+plataforma de periodicos; mailto:" + env("CROSSREF_MAILTO", "contato@sevenevents.com.br") + ")", ...headers },
        redirect: "follow",
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
      if (!res.ok) throw new Error("HTTP " + res.status + " em " + url);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

/** Remove acentos e baixa a caixa: base para busca e para casar titulos. */
export function fold(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Chave canonica de titulo, para cruzar OAI com Crossref. */
export function titleKey(s) {
  return fold(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(s, max = 90) {
  const base = fold(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return base || "item";
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "del", "la", "van", "von", "der", "y"]);

/** Caixa de nome proprio em portugues: TUDO MAIUSCULO vira Capitalizado e as
 *  particulas (de, da, dos, e) ficam minusculas fora da primeira posicao. */
export function properCase(raw) {
  const name = (raw || "").replace(/\s+/g, " ").trim();
  if (!name) return "";
  const allCaps = name === name.toUpperCase() && /[A-ZÀ-Ü]{2}/.test(name);
  return name
    .split(" ")
    .map((word, i) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (i > 0 && PARTICULAS.has(lower)) return lower;
      if (!allCaps) return word;
      // respeita hifens e apostrofos: d'Avila, Silva-Santos
      return lower.replace(/(^|[-'’])([\p{L}])/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

/** Converte "Sobrenome, Nome" em "Nome Sobrenome" sem estragar nomes simples. */
export function displayName(raw) {
  const name = (raw || "").replace(/\s+/g, " ").trim();
  if (!name) return "";
  if (name.includes(",")) {
    const [last, first] = name.split(",");
    return properCase([first?.trim(), last?.trim()].filter(Boolean).join(" "));
  }
  return properCase(name);
}

export function sortName(raw) {
  const name = properCase((raw || "").replace(/\s+/g, " ").trim());
  if (name.includes(",")) return name;
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  const last = parts.pop();
  return last + ", " + parts.join(" ");
}

export function log(...a) {
  process.stdout.write(a.join(" ") + "\n");
}

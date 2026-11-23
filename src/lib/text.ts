/** Remove acentos e baixa a caixa. Espelha o fold usado na importacao. */
export function fold(s: string | null | undefined): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Endereço público do portal. Alimenta as tags de citação, o OAI-PMH, o
 *  sitemap e os links dos convites de parecer, então precisa ser o endereço
 *  real em produção. A Netlify define URL (site) e DEPLOY_PRIME_URL (preview). */
export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  "http://localhost:4321"
).replace(/\/$/, "");

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export function dataCurta(d: Date | null | undefined): string {
  if (!d) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function dataLonga(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export function num(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("pt-BR");
}

/** Lista de autores com "e" antes do ultimo, truncada quando muito longa. */
export function listarAutores(nomes: string[], limite = 0): string {
  const l = limite > 0 && nomes.length > limite ? nomes.slice(0, limite) : nomes;
  const resto = nomes.length - l.length;
  let txt: string;
  if (l.length === 0) txt = "";
  else if (l.length === 1) txt = l[0];
  else txt = `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
  return resto > 0 ? `${l.join(", ")} e outros ${resto}` : txt;
}

export function recorte(s: string | null | undefined, n: number): string {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n).trimEnd() + "…";
}

export const IDIOMAS: Record<string, string> = { pt: "Português", en: "Inglês", es: "Espanhol", fr: "Francês" };

/** Markdown minimo para as paginas institucionais: titulos, listas, negrito e links. */
export function miniMarkdown(src: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (t: string) =>
    esc(t)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const out: string[] = [];
  let lista: string[] | null = null;
  const fecharLista = () => {
    if (lista) { out.push(`<ul>${lista.join("")}</ul>`); lista = null; }
  };

  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) { fecharLista(); continue; }
    if (line.startsWith("### ")) { fecharLista(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { fecharLista(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^[-*]\s+/.test(line)) { (lista ??= []).push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`); continue; }
    fecharLista();
    out.push(`<p>${inline(line)}</p>`);
  }
  fecharLista();
  return out.join("\n");
}

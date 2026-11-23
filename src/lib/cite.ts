/** Geracao de citacao nos formatos que a comunidade academica brasileira pede. */

export type CitaDados = {
  titulo: string;
  autores: string[];           // "Nome Sobrenome"
  revista: string;
  issn?: string | null;
  volume?: number | null;
  numero?: string | null;
  ano?: number | null;
  doi?: string | null;
  paginas?: string | null;
  elocation?: string | null;
  url: string;
  acesso: Date;
};

const sobrenomeMaiusculo = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  if (p.length === 1) return p[0].toUpperCase();
  const last = p.pop() as string;
  return `${last.toUpperCase()}, ${p.join(" ")}`;
};

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  if (p.length === 1) return p[0];
  const last = p.pop() as string;
  return `${last}, ${p.map((x) => x[0]?.toUpperCase() + ".").join(" ")}`;
};

const dataBr = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(d).replace(".", "");

export function abnt(c: CitaDados): string {
  const autores = c.autores.length
    ? c.autores.map(sobrenomeMaiusculo).join("; ")
    : "[s. n.]";
  const local = [
    c.volume != null ? `v. ${c.volume}` : null,
    c.numero != null ? `n. ${c.numero}` : null,
    c.elocation ? c.elocation : c.paginas ? `p. ${c.paginas}` : null,
    c.ano != null ? String(c.ano) : null,
  ].filter(Boolean).join(", ");
  const doi = c.doi ? ` DOI: https://doi.org/${c.doi}.` : "";
  return `${autores}. ${c.titulo}. **${c.revista}**, ${local}.${doi} Disponível em: ${c.url}. Acesso em: ${dataBr(c.acesso)}.`;
}

export function apa(c: CitaDados): string {
  const autores = c.autores.length
    ? c.autores.map(iniciais).join("; ")
    : "[s. n.]";
  const vol = c.volume != null ? ` ${c.volume}` : "";
  const numero = c.numero != null ? `(${c.numero})` : "";
  const pag = c.elocation ? `, ${c.elocation}` : c.paginas ? `, ${c.paginas}` : "";
  const doi = c.doi ? ` https://doi.org/${c.doi}` : "";
  return `${autores} (${c.ano ?? "s.d."}). ${c.titulo}. ${c.revista},${vol}${numero}${pag}.${doi}`;
}

export function vancouver(c: CitaDados): string {
  const autores = c.autores.slice(0, 6).map((n) => {
    const p = n.trim().split(/\s+/);
    const last = p.pop() as string;
    return `${last} ${p.map((x) => x[0]?.toUpperCase()).join("")}`;
  }).join(", ") + (c.autores.length > 6 ? ", et al" : "");
  const pag = c.elocation ? `:${c.elocation}` : c.paginas ? `:${c.paginas}` : "";
  const doi = c.doi ? ` doi:${c.doi}` : "";
  return `${autores}. ${c.titulo}. ${c.revista}. ${c.ano ?? "s.d."};${c.volume ?? ""}(${c.numero ?? ""})${pag}.${doi}`;
}

export function bibtex(c: CitaDados, chave: string): string {
  const campos: [string, string | null | undefined][] = [
    ["author", c.autores.map((n) => {
      const p = n.trim().split(/\s+/);
      const last = p.pop() as string;
      return `${last}, ${p.join(" ")}`;
    }).join(" and ") || null],
    ["title", c.titulo],
    ["journal", c.revista],
    ["year", c.ano != null ? String(c.ano) : null],
    ["volume", c.volume != null ? String(c.volume) : null],
    ["number", c.numero ?? null],
    ["pages", c.elocation ?? c.paginas ?? null],
    ["issn", c.issn ?? null],
    ["doi", c.doi ?? null],
    ["url", c.url],
  ];
  const corpo = campos
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@article{${chave},\n${corpo}\n}`;
}

export function ris(c: CitaDados): string {
  const l: string[] = ["TY  - JOUR"];
  for (const a of c.autores) {
    const p = a.trim().split(/\s+/);
    const last = p.pop() as string;
    l.push(`AU  - ${last}, ${p.join(" ")}`);
  }
  l.push(`TI  - ${c.titulo}`);
  l.push(`JO  - ${c.revista}`);
  if (c.ano != null) l.push(`PY  - ${c.ano}`);
  if (c.volume != null) l.push(`VL  - ${c.volume}`);
  if (c.numero != null) l.push(`IS  - ${c.numero}`);
  if (c.elocation) l.push(`SP  - ${c.elocation}`);
  else if (c.paginas) {
    const [sp, ep] = c.paginas.split("-");
    if (sp) l.push(`SP  - ${sp}`);
    if (ep) l.push(`EP  - ${ep}`);
  }
  if (c.issn) l.push(`SN  - ${c.issn}`);
  if (c.doi) l.push(`DO  - ${c.doi}`);
  l.push(`UR  - ${c.url}`);
  l.push("ER  - ");
  return l.join("\n");
}

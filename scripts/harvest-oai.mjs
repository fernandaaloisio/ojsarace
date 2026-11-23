/**
 * Coleta o acervo completo do OJS legado via OAI-PMH.
 * Grava data/oai.ndjson. Nada e enviado ao banco aqui.
 */
import { XMLParser } from "fast-xml-parser";
import { env, get, NdjsonWriter, log } from "./lib.mjs";

const BASE = env("OAI_BASE");
const SET = process.env.OAI_SET || "";

const ARRAYS = new Set([
  "record", "dc:title", "dc:creator", "dc:contributor", "dc:subject",
  "dc:description", "dc:identifier", "dc:source", "dc:relation",
  "dc:type", "dc:date", "dc:language", "dc:rights", "dc:publisher", "dc:format",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ARRAYS.has(name),
});

const text = (v) => {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in v) return String(v["#text"]);
  return null;
};
const list = (v) => (v ? (Array.isArray(v) ? v : [v]).map(text).filter(Boolean) : []);
const lang = (v) => (v && typeof v === "object" ? v["@xml:lang"] || null : null);

/** Escolhe o valor em portugues quando existir, senao o primeiro. */
function preferPt(v) {
  const arr = v ? (Array.isArray(v) ? v : [v]) : [];
  const pt = arr.find((x) => (lang(x) || "").toLowerCase().startsWith("pt"));
  return text(pt ?? arr[0]);
}

async function main() {
  const out = new NdjsonWriter("oai.ndjson");
  let token = null;
  let page = 0;
  let total = null;

  for (;;) {
    const url = token
      ? `${BASE}?verb=ListRecords&resumptionToken=${encodeURIComponent(token)}`
      : `${BASE}?verb=ListRecords&metadataPrefix=oai_dc${SET ? "&set=" + encodeURIComponent(SET) : ""}`;

    const xml = await get(url);
    const doc = parser.parse(xml);
    const body = doc?.["OAI-PMH"]?.ListRecords;
    if (!body) {
      const err = doc?.["OAI-PMH"]?.error;
      log("fim:", text(err) || "sem mais registros");
      break;
    }

    for (const rec of body.record || []) {
      const header = rec.header || {};
      if (header["@status"] === "deleted") continue;
      const dc = rec.metadata?.["oai_dc:dc"] || {};

      const identifiers = list(dc["dc:identifier"]);
      const sources = list(dc["dc:source"]);
      const relations = list(dc["dc:relation"]);

      out.write({
        oaiIdentifier: text(header.identifier),
        datestamp: text(header.datestamp),
        sets: list(header.setSpec),
        title: preferPt(dc["dc:title"]),
        titles: list(dc["dc:title"]),
        creators: list(dc["dc:creator"]),
        contributors: list(dc["dc:contributor"]),
        subjects: list(dc["dc:subject"]),
        abstract: preferPt(dc["dc:description"]),
        publisher: preferPt(dc["dc:publisher"]),
        date: list(dc["dc:date"])[0] || null,
        types: list(dc["dc:type"]),
        landingUrl: identifiers.find((i) => /\/article\/view\//.test(i)) || identifiers[0] || null,
        doi: identifiers.find((i) => /10\.\d{4,9}\//.test(i))?.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") || null,
        sourceLabel: sources.find((s) => /;/.test(s)) || null,
        issn: sources.find((s) => /^\d{4}-\d{3}[\dxX]$/.test(s)) || null,
        galleyUrls: relations.filter((r) => /^https?:/.test(r)),
        language: list(dc["dc:language"])[0] || null,
        rights: preferPt(dc["dc:rights"]),
      });
    }

    page += 1;
    const rt = body.resumptionToken;
    if (total == null && rt && typeof rt === "object") total = rt["@completeListSize"];
    log(`pagina ${page}: ${out.count}${total ? "/" + total : ""} registros`);

    token = text(rt);
    if (!token) break;
  }

  await out.close();
  log(`\nOAI concluido: ${out.count} registros em data/oai.ndjson`);
}

main().catch((e) => {
  console.error("falha na coleta OAI:", e.message);
  process.exit(1);
});

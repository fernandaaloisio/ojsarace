/**
 * Traz as capas reais das edições do OJS para o portal.
 *
 * As capas são arte da própria revista, feitas edição a edição. Gerar capa a
 * partir dos dados, como o portal fazia, só servia enquanto não havia as de
 * verdade. Este script lê o arquivo de edições do OJS, casa cada fascículo
 * pelo rótulo ("v. 8 n. 11 (2026)") e guarda a imagem em public/capas.
 *
 *     npm run capas
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BASE = (process.env.OJS_BASE || "https://periodicos.newsciencepubl.com/arace").replace(/\/+$/, "");
const DESTINO = "public/capas";
const UA = "AuroraOJS/1.0 (colheita de capas do proprio periodico)";

async function pegar(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r;
}

/** Lê uma página do arquivo e devolve [{ rotulo, capa }]. */
function extrair(html) {
  const achados = [];
  const re = /<div class="obj_issue_summary">([\s\S]*?)<\/div><!-- \.obj_issue_summary -->/g;
  let m;
  while ((m = re.exec(html))) {
    const bloco = m[1];
    const capa = bloco.match(/<img src="([^"]*cover_issue_[^"]+)"/)?.[1] ?? null;
    const rotulo = bloco
      .match(/<a class="title"[^>]*>\s*([\s\S]*?)\s*<\/a>/)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (rotulo) achados.push({ rotulo, capa });
  }
  return achados;
}

async function main() {
  fs.mkdirSync(DESTINO, { recursive: true });

  // o arquivo é paginado; segue enquanto a página trouxer fascículos novos
  const doOjs = new Map();
  for (let pagina = 1; pagina <= 20; pagina++) {
    const url = pagina === 1 ? `${BASE}/issue/archive` : `${BASE}/issue/archive/${pagina}`;
    let html;
    try {
      html = await (await pegar(url)).text();
    } catch {
      break;
    }
    const itens = extrair(html);
    const antes = doOjs.size;
    for (const i of itens) if (!doOjs.has(i.rotulo)) doOjs.set(i.rotulo, i.capa);
    console.log(`arquivo pagina ${pagina}: ${itens.length} fasciculos`);
    if (doOjs.size === antes) break;
  }
  console.log(`\n${doOjs.size} fasciculos lidos do OJS`);

  const nossas = await db.issue.findMany({ select: { id: true, slug: true, label: true, coverUrl: true } });
  let baixadas = 0, semCapa = 0, semPar = 0;

  for (const e of nossas) {
    const capa = doOjs.get(e.label);
    if (capa === undefined) { semPar++; continue; }
    if (!capa) { semCapa++; continue; }

    const ext = path.extname(new URL(capa).pathname) || ".jpg";
    const arquivo = `${e.slug}${ext}`;
    const caminho = path.join(DESTINO, arquivo);

    try {
      const r = await pegar(capa);
      const tipo = r.headers.get("content-type") ?? "";
      if (!tipo.startsWith("image/")) throw new Error(`nao e imagem (${tipo})`);
      fs.writeFileSync(caminho, Buffer.from(await r.arrayBuffer()));
      await db.issue.update({ where: { id: e.id }, data: { coverUrl: `/capas/${arquivo}` } });
      baixadas++;
      process.stdout.write(`\r${baixadas} capas baixadas`);
    } catch (err) {
      console.log(`\n  ! ${e.label}: ${err.message}`);
    }
  }

  console.log(`\n\ncapas guardadas:        ${baixadas}`);
  console.log(`fasciculos sem capa:    ${semCapa}`);
  console.log(`sem par no OJS:         ${semPar}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());

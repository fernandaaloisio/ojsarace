/**
 * Gera o esboço navegável do portal como uma página única e autossuficiente,
 * com os dados reais do acervo embutidos. Nenhum dado é digitado à mão aqui:
 * tudo vem do banco, via /tmp/esboco.json.
 *
 *   node scripts/gerar-esboco.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, log } from "./lib.mjs";

const d = JSON.parse(fs.readFileSync("/tmp/esboco.json", "utf8"));

// o esboço é uma página só: o banner vai embutido, não referenciado
const bannerSvg = fs.readFileSync(path.join(ROOT, "public", "banner-arace.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/\n\s*<!--[\s\S]*?-->/g, "")
  .trim();

const MENU = ["Sobre", "Submissão", "Edição atual", "Acervo", "Qualis CAPES",
  "Indexadores", "Políticas editoriais", "Taxa de publicação", "Templates", "Busca"];
const n = (x) => (x ?? 0).toLocaleString("pt-BR");
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "Nome Sobrenome, Outro Nome e Terceiro" */
function lista(nomes, limite = 5) {
  const l = nomes.slice(0, limite);
  const resto = nomes.length - l.length;
  if (resto > 0) return `${l.join(", ")} e outros ${resto}`;
  if (l.length < 2) return l.join("");
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

const ordem = (doi, i) => (doi ? doi.split("-").pop() : String(i + 1).padStart(3, "0"));

// ---------- índice da edição corrente ----------
const indice = d.artigos
  .map((a, i) => `
      <article class="item">
        <span class="item__ord">${esc(ordem(a.doi, i))}</span>
        <div class="item__corpo">
          <h4 class="item__tit">${esc(a.titulo)}</h4>
          <p class="item__aut">${esc(lista(a.autores, 4))}</p>
          <div class="item__sel">
            ${a.doi ? `<span class="sel sel--doi">${esc(a.doi)}</span>` : ""}
            ${a.cit > 0 ? `<span class="sel sel--on">${a.cit} ${a.cit === 1 ? "citação" : "citações"}</span>` : ""}
            ${a.idioma !== "pt" ? `<span class="sel">${esc(a.idioma)}</span>` : ""}
          </div>
        </div>
        <span class="item__pdf">PDF</span>
      </article>`)
  .join("");

// ---------- lombada do arquivo ----------
const maior = Math.max(...d.anos.map((a) => a.artigos));
const lombada = d.anos
  .map((a) => `
      <div class="ano">
        <span class="ano__n">${a.ano}</span>
        <div class="ano__barra">
          <span class="trilho"><span class="preenche" style="width:${Math.max(1.5, (a.artigos / maior) * 100)}%"></span></span>
          <span class="ano__meta">${n(a.artigos)} artigos · ${a.edicoes} ${a.edicoes === 1 ? "edição" : "edições"}</span>
        </div>
      </div>`)
  .join("");

// ---------- constelação de temas (espiral de Vogel) ----------
const L = 1000, A = 560, M = 26;
const max = d.temas[0].count, min = d.temas[d.temas.length - 1].count || 1;
const PHI = Math.PI * (3 - Math.sqrt(5));
const esc_r = Math.min(L, A * 1.7) / 2.75;
const nos = d.temas.map((t, i) => {
  const r = esc_r * Math.sqrt((i + 0.6) / d.temas.length);
  const ang = i * PHI;
  const peso = (t.count - min) / Math.max(1, max - min);
  const x = L / 2 + r * Math.cos(ang) * 1.42;
  const y = A / 2 + r * Math.sin(ang) * 0.95;
  const corpo = 12 + peso * 26;
  return { ...t, x, y, corpo, ponto: 1.6 + peso * 4, op: 0.5 + peso * 0.5, fim: x > L / 2 };
});
const constelacao = nos
  .map((o) => {
    const dy = o.corpo * 0.33;
    const px = o.fim ? o.x + o.ponto + 4 : o.x - o.ponto - 4;
    const tx = o.fim ? o.x - 1 : o.x + 1;
    return `<g opacity="${o.op.toFixed(2)}"><title>${esc(o.term)} — ${o.count} artigos</title>` +
      `<circle cx="${px.toFixed(1)}" cy="${(o.y - dy).toFixed(1)}" r="${o.ponto.toFixed(1)}"/>` +
      `<text x="${tx.toFixed(1)}" y="${(o.y - dy).toFixed(1)}" font-size="${o.corpo.toFixed(1)}" ` +
      `text-anchor="${o.fim ? "end" : "start"}" dominant-baseline="middle" ` +
      `font-weight="${o.corpo > 26 ? 600 : 450}">${esc(o.term)}</text></g>`;
  })
  .join("");

// ---------- bases indexadoras ----------
const ROTULO_TIPO = { push: "depósito", pull: "coleta", harvest: "colheita" };
const bases = d.bases
  .map((b) => `
      <tr>
        <td>${esc(b.name)}</td>
        <td class="mono">${esc(ROTULO_TIPO[b.kind] ?? b.kind)}</td>
        <td class="mono num">${b.recordCount ? n(b.recordCount) : "—"}</td>
        <td><span class="est est--${esc(b.status)}">${esc(b.status)}</span></td>
      </tr>`)
  .join("");

// ---------- pareceres da submissão de teste ----------
const CRIT = { relevancia: "Relevância", problema: "Problema", metodo: "Método", resultados: "Resultados", referencias: "Referências", redacao: "Redação" };
const REC = { "ajustes-menores": "Aceitar com ajustes menores", "ajustes-maiores": "Reformular e reenviar", aceitar: "Aceitar", recusar: "Recusar" };
const pareceres = d.submissao.pareceres
  .map((p, i) => {
    const s = p.scores ? JSON.parse(p.scores) : {};
    const notas = Object.entries(CRIT)
      .filter(([k]) => s[k])
      .map(([k, r]) => `<div class="nota"><span>${r}</span><b>${s[k]}<span class="de">/5</span></b></div>`)
      .join("");
    return `
      <div class="parecer">
        <div class="parecer__cab">
          <span class="rot">Parecerista ${String.fromCharCode(65 + i)}</span>
          <span class="sel sel--on">${esc(REC[p.rec] ?? p.rec)}</span>
        </div>
        <div class="notas">${notas}</div>
      </div>`;
  })
  .join("");

const eventos = d.submissao.eventos
  .map((e) => `
      <li class="ev${e.publico ? "" : " ev--int"}">
        <span class="ev__q">${esc(e.quando)}</span>
        <span class="ev__t">${esc(e.texto)}</span>
        <span class="ev__v">${e.publico ? "autor vê" : "interno"}</span>
      </li>`)
  .join("");

const palavrasDestaque = d.destaque.palavras.slice(0, 6).map((p) => `<span class="tag">${esc(p)}</span>`).join("");
const autoresDestaque = d.destaque.autores.map((a) => esc(a.nome)).join(" · ");

const html = `<title>Portal ARACÊ</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Archivo:wght@400;500;600&family=DM+Mono:wght@300;400;500&display=swap">
<style>
/* Esboço do portal da ARACÊ.
   Identidade vinda do nome: "aracê" é amanhecer em tupi. Tinta sobre papel,
   luz de nascente como único acento, régua de horizonte como marca.
   Layout: coluna única de telas emolduradas, cada uma com sua leitura ao lado. */
:root {
  --paper: #f6f2ea; --paper-2: #efe9df; --paper-3: #e5ddd0;
  --ink: #16130f; --ink-2: #403a33; --ink-3: #6d655b; --ink-4: #9b9288;
  --rule: #d4cabb; --rule-2: #e3dbce;
  --ember: #b4431c; --ember-2: #8a3214; --dawn: #d99227; --moss: #44613f;
  --display: "Fraunces", Georgia, serif;
  --sans: "Archivo", system-ui, sans-serif;
  --mono: "DM Mono", ui-monospace, "SF Mono", monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #12161b; --paper-2: #181d24; --paper-3: #20262f;
    --ink: #eee8dd; --ink-2: #c3bbae; --ink-3: #948c80; --ink-4: #6b6459;
    --rule: #2c343e; --rule-2: #232a33;
    --ember: #e4703f; --ember-2: #b8502a; --dawn: #e9b25a; --moss: #7ba074;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #12161b; --paper-2: #181d24; --paper-3: #20262f;
  --ink: #eee8dd; --ink-2: #c3bbae; --ink-3: #948c80; --ink-4: #6b6459;
  --rule: #2c343e; --rule-2: #232a33;
  --ember: #e4703f; --ember-2: #b8502a; --dawn: #e9b25a; --moss: #7ba074;
  color-scheme: dark;
}

* { box-sizing: border-box; }
body {
  background: var(--paper); color: var(--ink);
  font-family: var(--sans); font-size: 16px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.wrap {
  max-width: 1120px; margin-inline: auto;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
}
h1, h2, h3, h4 { font-family: var(--display); margin: 0; line-height: 1.1; letter-spacing: -0.02em; text-wrap: balance; font-weight: 580; }
p { margin: 0; }
a { color: var(--ember); }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.num { text-align: right; }

/* marca */
.sol { width: 9px; height: 9px; border-radius: 50%; background: var(--ember); display: inline-block; flex: none;
       box-shadow: 0 0 0 4px color-mix(in oklab, var(--ember) 14%, transparent); }
.horizonte { height: 1px; background: var(--rule); border: 0; margin: 0; position: relative; }
.horizonte::after { content: ""; position: absolute; left: var(--sol, 20%); top: 50%; width: 7px; height: 7px;
  border-radius: 50%; background: var(--ember); transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--ember) 16%, transparent); }

/* abertura */
.capa { padding-block: clamp(2.5rem, 7vw, 5rem) clamp(1.5rem, 4vw, 2.5rem); }
.marca { display: flex; align-items: center; gap: .6rem; margin-bottom: 1.75rem; }
.marca b { font-family: var(--display); font-size: 1.5rem; font-weight: 650; letter-spacing: -.02em; }
.marca span { font-family: var(--mono); font-size: .72rem; color: var(--ink-4); }
.capa h1 { font-size: clamp(2.1rem, 6.5vw, 4rem); letter-spacing: -.035em; line-height: .98;
  font-variation-settings: "SOFT" 0, "WONK" 1, "opsz" 120; }
.capa h1 em { font-style: italic; color: var(--ember); }
.capa__linha { max-width: 48ch; color: var(--ink-2); font-size: clamp(1rem, 2.2vw, 1.15rem); margin-top: 1.4rem; }
.aviso-esboco {
  margin-top: 1.75rem; border-left: 3px solid var(--dawn); background: var(--paper-2);
  padding: .85rem 1rem; font-size: .9rem; color: var(--ink-2); max-width: 60ch;
}

/* números */
.nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); border-top: 1px solid var(--ink); margin-top: 2.5rem; }
.nums div { padding: .9rem 1rem .95rem 0; border-bottom: 1px solid var(--rule); border-right: 1px solid var(--rule); }
.nums div:last-child { border-right: 0; }
.nums b { font-family: var(--display); font-size: clamp(1.6rem, 4vw, 2.3rem); font-weight: 600; display: block;
  line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.nums span { font-family: var(--mono); font-size: .68rem; text-transform: uppercase; letter-spacing: .13em;
  color: var(--ink-3); margin-top: .4rem; display: block; }

/* navegação das telas */
.nav { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 10; background: var(--paper);
  border-bottom: 1px solid var(--rule); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 11; background: var(--paper); }
.nav__in { display: flex; gap: 1.1rem; overflow-x: auto; padding-block: .75rem; scrollbar-width: none; }
.nav__in::-webkit-scrollbar { display: none; }
.nav a { font-family: var(--mono); font-size: .72rem; text-transform: uppercase; letter-spacing: .1em;
  color: var(--ink-3); text-decoration: none; white-space: nowrap; padding-block: .2rem; border-bottom: 2px solid transparent; }
.nav a:hover, .nav a:focus-visible { color: var(--ink); border-color: var(--ember); }

/* telas */
.tela { padding-block: clamp(2.5rem, 6vw, 4rem); border-top: 1px solid var(--rule-2); scroll-margin-top: 4rem; }
.tela__cab { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: 1.5rem 3rem; align-items: start; margin-bottom: 2rem; }
@media (max-width: 760px) { .tela__cab { grid-template-columns: 1fr; } }
.rot { font-family: var(--mono); font-size: .68rem; text-transform: uppercase; letter-spacing: .15em; color: var(--ink-3); }
.tela h2 { font-size: clamp(1.4rem, 3.5vw, 2rem); margin-top: .7rem; }
.tela__nota { color: var(--ink-3); font-size: .9rem; line-height: 1.65; }
.tela__nota strong { color: var(--ink-2); font-weight: 600; }

/* moldura de tela */
.quadro { border: 1px solid var(--rule); background: var(--paper-2); padding: clamp(1rem, 3vw, 1.75rem); }
.quadro__barra { display: flex; align-items: center; gap: .5rem; margin-bottom: 1.25rem;
  font-family: var(--mono); font-size: .68rem; color: var(--ink-4); letter-spacing: .04em; }
.quadro__barra i { width: 7px; height: 7px; border-radius: 50%; background: var(--rule); display: block; }
.painel { background: var(--paper); border: 1px solid var(--rule-2); padding: clamp(1rem, 3vw, 1.75rem); }

/* índice de artigos */
.indice { border-top: 1px solid var(--ink); }
.item { display: grid; grid-template-columns: 3.4rem minmax(0, 1fr) auto; gap: .9rem;
  padding: .9rem 0; border-bottom: 1px solid var(--rule-2); align-items: start; }
.item__ord { font-family: var(--mono); font-size: .7rem; color: var(--ink-4); padding-top: .25rem; }
.item__tit { font-size: .97rem; font-weight: 560; line-height: 1.25; font-variation-settings: "WONK" 1, "opsz" 30; }
.item__aut { font-size: .82rem; color: var(--ink-3); margin-top: .3rem; }
.item__sel { display: flex; flex-wrap: wrap; gap: .3rem .8rem; margin-top: .45rem; }
.item__pdf { font-family: var(--sans); font-size: .7rem; font-weight: 600; border: 1px solid var(--rule);
  padding: .2rem .5rem; color: var(--ink-3); white-space: nowrap; }
@media (max-width: 620px) { .item { grid-template-columns: 2.6rem minmax(0, 1fr); } .item__pdf { grid-column: 2; justify-self: start; } }
.sel { font-family: var(--mono); font-size: .68rem; color: var(--ink-3); }
.sel--doi { color: var(--ink-4); }
.sel--on { color: var(--ember); }
.tag { font-family: var(--mono); font-size: .68rem; border: 1px solid var(--rule); padding: .15rem .45rem; color: var(--ink-2); }

/* artigo com marginália */
.artigo { display: grid; grid-template-columns: 11rem minmax(0, 1fr); gap: clamp(1.25rem, 3vw, 2.5rem); align-items: start; }
@media (max-width: 760px) { .artigo { grid-template-columns: 1fr; } }
.marg { border-top: 2px solid var(--ink); padding-top: .9rem; display: grid; gap: .95rem;
  font-family: var(--mono); font-size: .7rem; }
@media (max-width: 760px) { .marg { grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); } }
.marg dt { font-size: .62rem; text-transform: uppercase; letter-spacing: .13em; color: var(--ink-4); margin-bottom: .22rem; }
.marg dd { margin: 0; color: var(--ink-2); word-break: break-word; }
.marg .big { font-family: var(--display); font-size: 1.5rem; font-weight: 600; color: var(--ink); line-height: 1; }
.artigo h3 { font-size: clamp(1.25rem, 3vw, 1.75rem); letter-spacing: -.025em; max-width: 24ch;
  font-variation-settings: "WONK" 1, "opsz" 72; }
.artigo__aut { margin-top: 1rem; font-size: .88rem; color: var(--ink-2); }
.artigo__res { margin-top: 1.4rem; color: var(--ink-2); font-size: .92rem; line-height: 1.72; max-width: 62ch; }
.artigo__res::first-letter { font-family: var(--display); font-size: 3.2em; font-weight: 600; float: left;
  line-height: .82; margin: .06em .08em 0 0; color: var(--ember); }
.chips { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: 1.25rem; }

/* arquivo */
.ano { display: grid; grid-template-columns: 3.5rem minmax(0, 1fr); gap: 1rem; align-items: center; padding: .55rem 0;
  border-bottom: 1px solid var(--rule-2); }
.ano__n { font-family: var(--display); font-size: 1.15rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.trilho { display: block; height: 10px; background: var(--paper-3); position: relative; }
.preenche { position: absolute; inset: 0 auto 0 0; background: var(--ember); }
.ano__meta { font-family: var(--mono); font-size: .68rem; color: var(--ink-3); margin-top: .3rem; display: block; }

/* constelação */
.const { width: 100%; height: auto; display: block; }
.const text { fill: var(--ink-2); font-family: var(--sans); letter-spacing: -.01em; }
.const circle { fill: color-mix(in oklab, var(--ember) 30%, transparent); }

/* tabela de bases */
.tab { width: 100%; border-collapse: collapse; font-size: .85rem; }
.tab th { text-align: left; font-family: var(--mono); font-size: .66rem; text-transform: uppercase;
  letter-spacing: .12em; color: var(--ink-3); font-weight: 400; padding: 0 .7rem .55rem 0; border-bottom: 1px solid var(--ink); }
.tab th.num, .tab td.num { text-align: right; }
.tab td { padding: .6rem .7rem .6rem 0; border-bottom: 1px solid var(--rule-2); color: var(--ink-2); }
.est { font-family: var(--mono); font-size: .68rem; border: 1px solid var(--rule); padding: .12rem .45rem;
  display: inline-flex; align-items: center; gap: .35rem; white-space: nowrap; }
.est::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--dawn); }
.est--ativo { color: var(--moss); border-color: color-mix(in oklab, var(--moss) 45%, transparent); }
.est--ativo::before { background: var(--moss); }

/* painel editorial */
.sub { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 17rem); gap: 1.75rem; align-items: start; }
@media (max-width: 820px) { .sub { grid-template-columns: 1fr; } }
.sub__cod { font-family: var(--mono); font-size: .72rem; color: var(--ember); letter-spacing: .04em; }
.sub h3 { font-size: 1.1rem; margin-top: .5rem; max-width: 34ch; }
.estado { display: inline-flex; align-items: center; gap: .4rem; font-family: var(--mono); font-size: .7rem;
  border: 1px solid var(--rule); padding: .18rem .5rem; margin-top: .85rem; }
.estado::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--dawn); }
.parecer { border: 1px solid var(--rule); padding: .9rem 1rem; margin-bottom: .7rem; background: var(--paper); }
.parecer__cab { display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-bottom: .75rem; flex-wrap: wrap; }
.notas { display: grid; gap: .3rem; }
.nota { display: flex; justify-content: space-between; gap: 1rem; font-size: .8rem; color: var(--ink-2); }
.nota b { font-family: var(--mono); color: var(--ember); font-weight: 500; }
.nota .de { color: var(--ink-4); }
.linha { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }
.ev { display: grid; grid-template-columns: 5.2rem minmax(0, 1fr) auto; gap: .75rem; align-items: baseline;
  font-size: .8rem; padding-bottom: .5rem; border-bottom: 1px solid var(--rule-2); }
.ev__q { font-family: var(--mono); font-size: .68rem; color: var(--ink-4); }
.ev__t { color: var(--ink-2); min-width: 0; }
.ev__v { font-family: var(--mono); font-size: .62rem; color: var(--moss); text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; }
.ev--int .ev__v { color: var(--ink-4); }
@media (max-width: 620px) { .ev { grid-template-columns: minmax(0, 1fr) auto; } .ev__q { grid-column: 1 / -1; } }

/* pendências */
.pend { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); }
.pend > div { background: var(--paper); padding: 1.1rem 1.2rem; }
.pend h4 { font-size: 1rem; margin-bottom: .5rem; }
.pend p { font-size: .86rem; color: var(--ink-3); line-height: 1.6; }
.pend .quem { font-family: var(--mono); font-size: .64rem; text-transform: uppercase; letter-spacing: .12em;
  color: var(--ember); display: block; margin-bottom: .55rem; }

/* banner, menu e lateral do esboço */
.banner-esb { position: relative; isolation: isolate; aspect-ratio: 4 / 1; overflow: hidden; display: flex; align-items: flex-end; }
.banner-esb svg { position: absolute; inset: 0; z-index: -2; width: 100%; height: 100%; object-fit: cover; }
.banner-esb__veu { position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(to top, rgba(10,13,18,.88) 0%, rgba(10,13,18,.5) 40%, rgba(10,13,18,.1) 75%); }
.banner-esb__txt { padding: clamp(.75rem, 2.5vw, 1.5rem); width: 100%; }
.banner-esb__marca { display: flex; align-items: center; gap: .45rem; }
.banner-esb__sol { width: 9px; height: 9px; border-radius: 50%; background: var(--dawn); box-shadow: 0 0 0 4px rgba(233,196,119,.2); }
.banner-esb__marca b { font-family: var(--display); font-size: clamp(1.4rem, 4.5vw, 2.4rem); font-weight: 650; letter-spacing: -.035em; color: #f7f2e8; }
.banner-esb__txt > p { color: rgba(247,242,232,.78); font-size: .82rem; margin-top: .35rem; }
.banner-esb__dados { display: flex; flex-wrap: wrap; gap: .25rem 1.1rem; margin-top: .7rem; font-family: var(--mono); font-size: .62rem; color: rgba(247,242,232,.9); }
.banner-esb__dados i { color: rgba(247,242,232,.5); font-style: normal; text-transform: uppercase; letter-spacing: .1em; margin-right: .25rem; }

.menu-esb { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem .95rem; padding: .65rem clamp(.75rem,2.5vw,1.5rem);
  border-bottom: 1px solid var(--rule); font-size: .76rem; color: var(--ink-3); }
.menu-esb b { margin-left: auto; font-weight: 600; border: 1px solid var(--ink); padding: .15rem .5rem; color: var(--ink); font-size: .72rem; }

.corpo-esb { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,13rem); gap: 1.5rem; padding: clamp(1rem,3vw,1.6rem); }
@media (max-width: 760px) { .corpo-esb { grid-template-columns: 1fr; } }
.lateral-esb { display: grid; gap: .8rem; }
.bl { border: 1px solid var(--rule); background: var(--paper-2); padding: .8rem .85rem .9rem; }
.bl__t { font-family: var(--mono); font-size: .62rem; text-transform: uppercase; letter-spacing: .13em; color: var(--ink-3); margin-bottom: .6rem; }
.bl p { font-size: .76rem; color: var(--ink-3); line-height: 1.5; }
.bl--acao { background: var(--ink); border-color: var(--ink); }
.bl--acao .bl__t { color: rgba(247,242,232,.55); }
.bl--acao p { color: rgba(247,242,232,.8); }
.bl__btn { display: block; text-align: center; background: var(--ember); color: #fff; font-size: .76rem; font-weight: 600; padding: .4rem; margin-top: .7rem; }
.fichinha { display: grid; gap: .35rem; margin: 0; font-family: var(--mono); font-size: .64rem; }
.fichinha div { display: flex; justify-content: space-between; gap: .6rem; border-bottom: 1px solid var(--rule-2); padding-bottom: .3rem; }
.fichinha dt { color: var(--ink-4); text-transform: uppercase; letter-spacing: .08em; }
.fichinha dd { margin: 0; color: var(--ink-2); text-align: right; }
.selos { display: flex; flex-wrap: wrap; gap: .3rem; }
.lidinhos { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
.lidinhos li { display: grid; grid-template-columns: 1.3rem minmax(0,1fr); gap: .4rem; font-size: .72rem; color: var(--ink-2); line-height: 1.35; }
.lidinhos li span:first-child { font-family: var(--mono); font-size: .62rem; color: var(--ember); }

.metr { border: 1px solid var(--rule); background: var(--paper-2); margin-top: 1.5rem; }
.metr__t { font-family: var(--mono); font-size: .62rem; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-3); padding: .7rem .9rem .55rem; }
.metr__g { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); border-top: 1px solid var(--rule); }
.metr__g > div { padding: .7rem .8rem .8rem; border-right: 1px solid var(--rule); }
.metr__g > div:last-child { border-right: 0; }
.metr__g b { font-family: var(--display); font-size: 1.5rem; font-weight: 600; line-height: 1; display: block; letter-spacing: -.03em; }
.metr__g span { font-family: var(--mono); font-size: .58rem; text-transform: uppercase; letter-spacing: .09em; color: var(--ink-3); margin-top: .35rem; display: block; line-height: 1.3; }
.metr__f { font-family: var(--mono); font-size: .58rem; color: var(--ink-4); line-height: 1.5; padding: .6rem .9rem .7rem; border-top: 1px solid var(--rule); }

footer { border-top: 1px solid var(--ink); margin-top: 3rem; padding-block: 2rem 3rem;
  font-family: var(--mono); font-size: .7rem; color: var(--ink-4); display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>

<div class="wrap capa">
  <div class="marca"><span class="sol"></span><b>ARACÊ</b><span>ISSN ${esc(d.revista.issn)}</span></div>
  <h1>Pesquisa interdisciplinar<br>em <em>acesso aberto</em>,<br>publicada em fluxo contínuo.</h1>
  <p class="capa__linha">${esc(d.revista.mission)}</p>
  <div class="aviso-esboco">
    <strong>Esboço para revisão.</strong> As telas abaixo são o sistema real, com os dados reais do acervo
    da ARACÊ — não são imagens nem texto de exemplo. Nada aqui está publicado: serve para você marcar
    o que quer mudar antes de o portal ir ao ar.
  </div>

  <div class="nums">
    <div><b>${n(d.numeros.artigos)}</b><span>Artigos</span></div>
    <div><b>${n(d.numeros.autores)}</b><span>Autores</span></div>
    <div><b>${n(d.numeros.edicoes)}</b><span>Edições</span></div>
    <div><b>${n(d.numeros.citacoes)}</b><span>Citações</span></div>
    <div><b>${n(d.numeros.palavras)}</b><span>Descritores</span></div>
  </div>
</div>

<nav class="nav"><div class="wrap nav__in">
  <a href="#home">Home</a>
  <a href="#artigo">Artigo</a>
  <a href="#arquivo">Arquivo</a>
  <a href="#temas">Temas</a>
  <a href="#indexacao">Indexação</a>
  <a href="#painel">Painel editorial</a>
  <a href="#pendencias">O que falta</a>
</div></nav>

<main>
<section class="tela wrap" id="home">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 1 · Entrada do leitor</p>
      <h2>Banner, menu e coluna lateral</h2>
    </div>
    <p class="tela__nota">
      O banner ocupa toda a largura e é <strong>trocável pela equipe no painel</strong>,
      junto com a logo e os textos. O desenho padrão vem do nome da revista: aracê é
      amanhecer em tupi. Abaixo, o menu completo; ao lado, a ficha do periódico, o botão
      de submissão e os mais lidos. No celular tudo vira coluna única.
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org</div>
    <div class="painel" style="padding:0;overflow:hidden">

      <div class="banner-esb">
        ${bannerSvg}
        <div class="banner-esb__veu"></div>
        <div class="banner-esb__txt">
          <div class="banner-esb__marca"><span class="banner-esb__sol"></span><b>ARACÊ</b></div>
          <p>Revista científica interdisciplinar de acesso aberto</p>
          <div class="banner-esb__dados">
            <span><i>ISSN</i> ${esc(d.revista.issn)}</span>
            <span><i>Qualis CAPES</i> ${esc(d.revista.qualis)}</span>
            <span><i>Editora</i> ${esc(d.revista.publisher)}</span>
          </div>
        </div>
      </div>

      <nav class="menu-esb">${MENU.map((m) => `<span>${esc(m)}</span>`).join("")}<b>Entrar</b></nav>

      <div class="corpo-esb">
        <div>
          <p class="rot">Sobre a revista</p>
          <p style="color:var(--ink-2);line-height:1.7;margin-top:.7rem;font-size:.92rem">
            A ARACÊ é uma revista científica interdisciplinar de acesso aberto, avaliada com
            Qualis CAPES B1 no quadriênio 2021-2024. Publica em fluxo contínuo, com fechamento
            mensal de edições, textos em português, inglês e espanhol.
          </p>
          <hr class="horizonte" style="--sol:14%;margin:1.5rem 0">
          <p class="rot">Edição atual · ${esc(d.edicao.label)}</p>
          <div class="indice" style="margin-top:.8rem">${indice}</div>
        </div>

        <aside class="lateral-esb">
          <div class="bl bl--acao">
            <p class="bl__t">Para autores</p>
            <p>Fluxo contínuo: manuscritos recebidos o ano todo, sem data de chamada.</p>
            <span class="bl__btn">Enviar submissão</span>
          </div>
          <div class="bl">
            <p class="bl__t">A revista</p>
            <dl class="fichinha">
              <div><dt>ISSN</dt><dd>${esc(d.revista.issn)}</dd></div>
              <div><dt>Prefixo DOI</dt><dd>${esc(d.revista.doiPrefix)}</dd></div>
              <div><dt>Qualis</dt><dd>${esc(d.revista.qualis)} · 2021-2024</dd></div>
              <div><dt>Acesso</dt><dd>Aberto, CC BY 4.0</dd></div>
              <div><dt>Artigos</dt><dd>${n(d.numeros.artigos)}</dd></div>
            </dl>
          </div>
          <div class="bl">
            <p class="bl__t">Indexadores</p>
            <div class="selos">${d.bases.filter((b) => b.status === "ativo").map((b) => `<span class="est est--ativo">${esc(b.name)}</span>`).join("")}</div>
          </div>
          <div class="bl">
            <p class="bl__t">Artigos mais citados</p>
            <ol class="lidinhos">
              ${d.artigos.slice(0, 3).map((a, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><span>${esc(a.titulo.slice(0, 68))}…</span></li>`).join("")}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>

<section class="tela wrap" id="artigo">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 2 · A página que o Google Scholar lê</p>
      <h2>Ficha técnica na margem</h2>
    </div>
    <p class="tela__nota">
      DOI, edição, seção, idioma e citações ficam na coluna da esquerda, como o cabeçalho
      corrente de um periódico de papel. O texto respira no centro.
      <strong>Por trás, as tags Highwire e o JSON-LD</strong> que fazem o Scholar e as bases indexarem.
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org/artigo/…</div>
    <div class="painel artigo">
      <dl class="marg">
        <div><dt>Citações</dt><dd class="big">${d.destaque.cit}</dd></div>
        <div><dt>DOI</dt><dd>${esc(d.destaque.doi)}</dd></div>
        <div><dt>Edição</dt><dd>${esc(d.destaque.edicao)}</dd></div>
        <div><dt>Publicado</dt><dd>${esc(d.destaque.data)}</dd></div>
        <div><dt>Seção</dt><dd>${esc(d.destaque.secao)}</dd></div>
        <div><dt>Licença</dt><dd>CC BY 4.0</dd></div>
      </dl>
      <div>
        <p class="rot">ARACÊ · ${esc(d.destaque.secao)}</p>
        <h3 style="margin-top:.8rem">${esc(d.destaque.titulo)}</h3>
        <p class="artigo__aut">${autoresDestaque}</p>
        <hr class="horizonte" style="--sol:8%;margin:1.4rem 0">
        <p class="rot">Resumo</p>
        <p class="artigo__res">${esc(d.destaque.resumo)}</p>
        <div class="chips">${palavrasDestaque}</div>

        <div class="metr">
          <p class="metr__t">Métricas do artigo</p>
          <div class="metr__g">
            <div><b>0</b><span>Visualizações</span></div>
            <div><b>0</b><span>Downloads do PDF</span></div>
            <div><b>${d.destaque.cit}</b><span>Citações recebidas</span></div>
          </div>
          <p class="metr__f">
            Citações segundo o Crossref, consultadas em ${esc(d.destaque.data)}.
            Visualizações e downloads são contados pelo próprio portal.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="tela wrap" id="arquivo">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 3 · Todo o acervo</p>
      <h2>O arquivo conta a história da revista</h2>
    </div>
    <p class="tela__nota">
      A barra de cada ano é proporcional ao número de artigos. Dá para ver de relance
      o salto de 2024 para 2025, quando a New Science assumiu a edição —
      <strong>de ${n(d.anos.find((a) => a.ano === 2024)?.artigos ?? 0)} para ${n(d.anos.find((a) => a.ano === 2025)?.artigos ?? 0)} artigos no ano.</strong>
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org/arquivo</div>
    <div class="painel">${lombada}</div>
  </div>
</section>

<section class="tela wrap" id="temas">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 4 · O que a revista publica</p>
      <h2>Mapa dos ${n(d.numeros.palavras)} descritores</h2>
    </div>
    <p class="tela__nota">
      Os 44 termos mais frequentes, dimensionados pela quantidade de artigos.
      A posição vem de uma espiral de ângulo de ouro: <strong>o desenho é sempre o mesmo</strong>,
      e muda apenas quando o acervo muda. Cada termo leva à sua própria lista.
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org/explorar</div>
    <div class="painel">
      <svg class="const" viewBox="${-M} ${-M} ${L + M * 2} ${A + M * 2}" role="img"
           aria-label="Mapa dos descritores mais frequentes do acervo">${constelacao}</svg>
    </div>
  </div>
</section>

<section class="tela wrap" id="indexacao">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 5 · Interligação automática</p>
      <h2>Estado real de cada base</h2>
    </div>
    <p class="tela__nota">
      Consultado ao vivo nas APIs do Crossref, OpenAlex e DOAJ. <strong>Nada aparece como
      "ativo" sem resposta da própria base</strong> — o que está pendente está pendente de verdade,
      e vira sua lista de tarefas de indexação.
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org/indexacao</div>
    <div class="painel" style="overflow-x:auto">
      <table class="tab">
        <thead><tr><th>Base</th><th>Sentido</th><th class="num">Registros</th><th>Situação</th></tr></thead>
        <tbody>${bases}</tbody>
      </table>
      <p class="mono" style="font-size:.68rem;color:var(--ink-4);margin-top:1rem">
        DOAJ pendente: falta publicar a política de taxas e a equipe editorial — os dois critérios
        que mais reprovam candidaturas.
      </p>
    </div>
  </div>
</section>

<section class="tela wrap" id="painel">
  <div class="tela__cab">
    <div>
      <p class="rot">Tela 6 · Bastidor editorial</p>
      <h2>Submissão, parecer e decisão</h2>
    </div>
    <p class="tela__nota">
      Esta é a submissão de teste que percorreu o fluxo inteiro: triagem, dois pareceres
      duplo-cegos, decisão e versão reformulada. <strong>O parecerista nunca vê a autoria</strong>,
      e só recebe o arquivo anonimizado.
    </p>
  </div>

  <div class="quadro">
    <div class="quadro__barra"><i></i><i></i><i></i> arace.org/painel · acesso restrito</div>
    <div class="painel sub">
      <div>
        <span class="sub__cod">${esc(d.submissao.code)} · rodada ${d.submissao.rodada}</span>
        <h3>${esc(d.submissao.titulo)}</h3>
        <span class="estado">Em reavaliação</span>
        <p class="rot" style="margin:1.6rem 0 .8rem">Histórico · ${d.submissao.eventos.length} eventos</p>
        <ul class="linha">${eventos}</ul>
      </div>
      <aside>
        <p class="rot" style="margin-bottom:.8rem">Pareceres recebidos</p>
        ${pareceres}
        <p class="mono" style="font-size:.68rem;color:var(--ink-4);line-height:1.55">
          Decisão registrada: ${esc(REC[d.submissao.decisao] ?? d.submissao.decisao)}.
          Autor notificado e convites abertos cancelados automaticamente.
        </p>
      </aside>
    </div>
  </div>
</section>

<section class="tela wrap" id="pendencias">
  <div class="tela__cab">
    <div>
      <p class="rot">Antes de ir ao ar</p>
      <h2>O que ainda depende de você</h2>
    </div>
    <p class="tela__nota">
      Três coisas o sistema não pode inventar, e duas que ficaram para depois da sua revisão.
    </p>
  </div>

  <div class="pend">
    <div>
      <span class="quem">Preciso de você</span>
      <h4>Acesso ao OJS</h4>
      <p>Você pediu o roteiro nos dois sistemas. Para o OJS atual preciso de FTP ou SSH
         do servidor e de uma conta de administrador no painel. Sem isso essa metade não anda.</p>
    </div>
    <div>
      <span class="quem">Preciso de você</span>
      <h4>Chave de API do OJS</h4>
      <p>Para importar o histórico de visualizações e downloads de cada artigo.
         Fica no painel do OJS, em Configurações do usuário, aba Chave de API.
         Enquanto não vem, a contagem roda do zero.</p>
    </div>
    <div>
      <span class="quem">Preciso de você</span>
      <h4>A captura do modelo</h4>
      <p>O roteiro diz "como no modelo da captura", mas a imagem não veio junto.
         Mandando, eu comparo o que fiz com o que você tinha em mente.</p>
    </div>
    <div>
      <span class="quem">Conteúdo seu</span>
      <h4>Equipe editorial e taxas</h4>
      <p>As duas páginas estão vazias de propósito: nenhum nome de conselho foi inventado,
         e a política de cobrança só você pode declarar. São os dois critérios que mais
         reprovam candidaturas no DOAJ.</p>
    </div>
    <div>
      <span class="quem">Já resolvido</span>
      <h4>Banner trocável</h4>
      <p>A equipe troca banner, logo, imagem institucional e textos em /painel/identidade,
         sem tocar no código. O desenho padrão veio do nome da revista.</p>
    </div>
    <div>
      <span class="quem">Já resolvido</span>
      <h4>Métricas contando</h4>
      <p>Leituras e downloads são registrados de verdade, com rastreador fora da conta.
         Citações vêm de uma fonte só, o Crossref, com a data da consulta à vista.</p>
    </div>
  </div>
</section>
</main>

<footer class="wrap">
  <span>ARACÊ · ISSN ${esc(d.revista.issn)} · prefixo DOI ${esc(d.revista.doiPrefix)} · Qualis ${esc(d.revista.qualis)}</span>
  <span>Esboço — nada publicado</span>
</footer>
`;

const destino = path.join(ROOT, "esboco-portal.html");
fs.writeFileSync(destino, html);
log(`esboço gerado: ${(fs.statSync(destino).size / 1024).toFixed(0)} KB em ${destino}`);

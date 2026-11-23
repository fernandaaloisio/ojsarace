import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import Formulario from "@/components/Formulario";
import { salvarIdentidade } from "@/app/acoes/identidade";
import { JOURNAL_SLUG } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ENQUADRAMENTOS = [
  { v: "center center", r: "Centro" },
  { v: "center top", r: "Topo" },
  { v: "center bottom", r: "Base" },
  { v: "left center", r: "Esquerda" },
  { v: "right center", r: "Direita" },
  { v: "center 35%", r: "Um pouco acima do centro" },
];

export default async function Identidade() {
  const u = await usuarioAtual();
  if (!ehEditor(u)) notFound();

  const j = await db.journal.findUniqueOrThrow({ where: { slug: JOURNAL_SLUG } });

  return (
    <div style={{ maxWidth: "42rem" }}>
      <header style={{ marginBottom: "1.75rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Editoria</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Identidade visual</h1>
        <p style={{ color: "var(--ink-3)", marginTop: "0.9rem", maxWidth: "54ch" }}>
          O banner, a logo e os textos institucionais da página inicial são trocados
          aqui. Nada disso exige mexer no código, e a troca vale na hora.
        </p>
      </header>

      <Formulario acao={salvarIdentidade} rotulo="Salvar identidade visual">
        {/* ---------- banner ---------- */}
        <fieldset className="grupo">
          <legend>Banner do topo</legend>

          {j.bannerUrl ? (
            <div className="campo">
              <span className="rotulo">Banner em uso</span>
              <img src={j.bannerUrl} alt="" style={{ width: "100%", border: "1px solid var(--rule)",
                     aspectRatio: "4 / 1", objectFit: "cover", objectPosition: j.bannerFoco ?? "center" }} />
              <label className="caixa-marcar">
                <input type="checkbox" name="removerBanner" />
                <span>Remover esta imagem e voltar para o banner padrão da revista.</span>
              </label>
            </div>
          ) : (
            <div className="campo">
              <span className="rotulo">Banner em uso: o padrão</span>
              <img src="/banner-arace.svg" alt="" style={{ width: "100%", border: "1px solid var(--rule)",
                     aspectRatio: "4 / 1", objectFit: "cover" }} />
              <span className="campo__ajuda">
                Desenho feito a partir da identidade da revista. Envie uma imagem abaixo para substituí-lo.
              </span>
            </div>
          )}

          <div className="campo">
            <label htmlFor="banner">Enviar outra imagem</label>
            <input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" />
            <span className="campo__ajuda">
              Proporção recomendada: 4 por 1, com pelo menos 2000 pixels de largura. Até 8 MB.
              A imagem é recortada conforme a largura da tela, então deixe as informações
              importantes longe das bordas.
            </span>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="bannerFoco">Enquadramento</label>
              <select id="bannerFoco" name="bannerFoco" defaultValue={j.bannerFoco ?? "center center"}>
                {ENQUADRAMENTOS.map((e) => <option key={e.v} value={e.v}>{e.r}</option>)}
              </select>
              <span className="campo__ajuda">Qual parte da imagem fica visível quando ela é recortada.</span>
            </div>
            <div className="campo">
              <label htmlFor="bannerAlt">Descrição da imagem</label>
              <input id="bannerAlt" name="bannerAlt" type="text" defaultValue={j.bannerAlt ?? ""}
                     placeholder="Ex.: Fachada da biblioteca ao amanhecer" />
              <span className="campo__ajuda">
                Lida por quem usa leitor de tela. Deixe em branco se a imagem for só decorativa.
              </span>
            </div>
          </div>
        </fieldset>

        {/* ---------- logo ---------- */}
        <fieldset className="grupo">
          <legend>Logo</legend>
          {j.logoUrl ? (
            <div className="campo">
              <span className="rotulo">Logo em uso</span>
              <img src={j.logoUrl} alt="" style={{ maxHeight: "5rem", background: "var(--night)",
                     padding: "1rem", border: "1px solid var(--rule)" }} />
              <label className="caixa-marcar">
                <input type="checkbox" name="removerLogo" />
                <span>Remover a logo e voltar a exibir o nome da revista em tipografia.</span>
              </label>
            </div>
          ) : (
            <p className="campo__ajuda" style={{ marginBottom: "1rem" }}>
              Sem logo enviada: o banner mostra o nome da revista em tipografia, com o ponto de sol.
            </p>
          )}
          <div className="campo">
            <label htmlFor="logo">Enviar logo</label>
            <input id="logo" name="logo" type="file" accept="image/png,image/webp,image/svg+xml" />
            <span className="campo__ajuda">
              Prefira PNG com fundo transparente ou SVG. Ela aparece sobre a imagem escura
              do banner, então versões claras funcionam melhor.
            </span>
          </div>
        </fieldset>

        {/* ---------- sobre a revista ---------- */}
        <fieldset className="grupo">
          <legend>Sobre a revista, na página inicial</legend>

          <div className="campo">
            <label htmlFor="sobreTexto">Texto de apresentação</label>
            <textarea id="sobreTexto" name="sobreTexto" rows={7}
                      defaultValue={j.sobreTexto ?? j.description ?? ""} />
            <span className="campo__ajuda">
              Aceita formatação simples: **negrito**, *itálico*, listas com hífen
              e links no formato [texto](endereço).
            </span>
          </div>

          {j.sobreImagem && (
            <div className="campo">
              <span className="rotulo">Imagem institucional em uso</span>
              <img src={j.sobreImagem} alt="" style={{ width: "100%", maxWidth: "22rem", border: "1px solid var(--rule)" }} />
              <label className="caixa-marcar">
                <input type="checkbox" name="removerSobre" />
                <span>Remover a imagem institucional.</span>
              </label>
            </div>
          )}

          <div className="campo">
            <label htmlFor="sobre">Imagem institucional</label>
            <input id="sobre" name="sobre" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
            <span className="campo__ajuda">Aparece junto do texto de apresentação, na página inicial.</span>
          </div>
        </fieldset>

        {/* ---------- dados institucionais ---------- */}
        <fieldset className="grupo">
          <legend>Dados institucionais</legend>

          <div className="campo">
            <label htmlFor="missao">Missão</label>
            <textarea id="missao" name="missao" rows={3} defaultValue={j.mission ?? ""} />
          </div>
          <div className="campo">
            <label htmlFor="descricao">Descrição curta</label>
            <textarea id="descricao" name="descricao" rows={3} defaultValue={j.description ?? ""} />
            <span className="campo__ajuda">Usada nos resultados de busca e no compartilhamento em redes.</span>
          </div>
          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="periodicidade">Periodicidade</label>
              <input id="periodicidade" name="periodicidade" type="text" defaultValue={j.periodicity ?? ""} />
            </div>
            <div className="campo">
              <label htmlFor="templatesUrl">Endereço do template para autores</label>
              <input id="templatesUrl" name="templatesUrl" type="url" defaultValue={j.templatesUrl ?? ""}
                     placeholder="https://…" />
              <span className="campo__ajuda">Usado na página Templates do menu.</span>
            </div>
          </div>
        </fieldset>
      </Formulario>
    </div>
  );
}

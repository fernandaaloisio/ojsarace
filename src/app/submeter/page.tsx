import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Formulario from "@/components/Formulario";
import CamposAutores from "@/components/CamposAutores";
import { submeter } from "@/app/acoes/submissao";
import { usuarioAtual } from "@/lib/auth";
import { SECOES, TIPOS_TRABALHO } from "@/lib/fluxo";

export const metadata: Metadata = { title: "Submeter manuscrito", robots: { index: false } };

export default async function Submeter() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/submeter");

  return (
    <section className="shell" style={{ maxWidth: "48rem", paddingBlock: "clamp(2rem, 5vw, 3.5rem) clamp(2rem, 5vw, 4rem)" }}>
      <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Nova submissão</p>
      <h1 style={{ fontSize: "var(--step-3)", marginBottom: "0.85rem" }}>Submeter manuscrito</h1>
      <p style={{ color: "var(--ink-3)", maxWidth: "52ch", marginBottom: "2rem" }}>
        Leia as <Link href="/diretrizes" style={{ color: "var(--ember)" }}>diretrizes para autores</Link> antes
        de preencher. O sistema confere o resumo e as palavras-chave no envio.
      </p>

      <div className="passos">
        <span><b>1</b> Manuscrito</span>
        <span><b>2</b> Autoria</span>
        <span><b>3</b> Arquivos</span>
        <span><b>4</b> Declarações</span>
      </div>

      <Formulario acao={submeter} rotulo="Enviar submissão">
        {/* ---------- 1. manuscrito ---------- */}
        <fieldset className="grupo">
          <legend>1 · O manuscrito</legend>

          <div className="campo">
            <label htmlFor="titulo">Título</label>
            <input id="titulo" name="titulo" type="text" required />
          </div>
          <div className="campo">
            <label htmlFor="subtitulo">Subtítulo</label>
            <input id="subtitulo" name="subtitulo" type="text" />
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="tipo">Tipo de trabalho</label>
              <select id="tipo" name="tipo">
                {TIPOS_TRABALHO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="secao">Seção</label>
              <select id="secao" name="secao">
                {Object.entries(SECOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="idioma">Idioma</label>
              <select id="idioma" name="idioma">
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
                <option value="es">Espanhol</option>
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="resumo">Resumo</label>
            <textarea id="resumo" name="resumo" required rows={9} />
            <span className="campo__ajuda">De 150 a 250 palavras, conforme as diretrizes.</span>
          </div>

          <div className="campo">
            <label htmlFor="palavras">Palavras-chave</label>
            <input id="palavras" name="palavras" type="text" required
                   placeholder="Primeira; Segunda; Terceira" />
            <span className="campo__ajuda">
              Exatamente três, separadas por ponto e vírgula.
            </span>
          </div>
        </fieldset>

        {/* ---------- 2. autoria ---------- */}
        <fieldset className="grupo">
          <legend>2 · Autoria</legend>
          <p className="campo__ajuda" style={{ marginBottom: "1.1rem" }}>
            Informe todos os autores na ordem em que devem aparecer na publicação.
            O ORCID do autor correspondente é obrigatório.
          </p>
          <CamposAutores inicial={{ nome: u.name, email: u.email, orcid: u.orcid ?? "", afiliacao: u.affiliation ?? "" }} />
        </fieldset>

        {/* ---------- 3. arquivos ---------- */}
        <fieldset className="grupo">
          <legend>3 · Arquivos</legend>

          <div className="campo">
            <label htmlFor="manuscrito">Manuscrito completo</label>
            <input id="manuscrito" name="manuscrito" type="file" required
                   accept=".docx,.doc,.odt,.pdf" />
            <span className="campo__ajuda">
              Formato editável (.docx ou .odt). PDF sozinho não é aceito nas diretrizes, mas pode ser anexado junto. Até 25 MB.
            </span>
          </div>

          <div className="campo">
            <label htmlFor="anonimizado">Versão anonimizada</label>
            <input id="anonimizado" name="anonimizado" type="file" accept=".docx,.doc,.odt,.pdf" />
            <span className="campo__ajuda">
              Sem nomes, instituições e agradecimentos. É a versão enviada aos pareceristas.
              Se não anexar, a editoria prepara uma antes de distribuir.
            </span>
          </div>

          <div className="campo">
            <label htmlFor="carta">Carta de apresentação</label>
            <input id="carta" name="carta" type="file" accept=".docx,.doc,.odt,.pdf" />
          </div>

          <div className="campo">
            <label htmlFor="suplementar">Material suplementar</label>
            <input id="suplementar" name="suplementar" type="file" accept=".pdf,.zip,.png,.jpg,.csv,.xlsx" />
            <span className="campo__ajuda">Tabelas, imagens em alta, dados brutos, parecer do CEP.</span>
          </div>
        </fieldset>

        {/* ---------- 4. declarações ---------- */}
        <fieldset className="grupo">
          <legend>4 · Declarações</legend>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="cep">Parecer do CEP</label>
              <input id="cep" name="cep" type="text" placeholder="Número do parecer" />
              <span className="campo__ajuda">Obrigatório em pesquisa com seres humanos ou animais.</span>
            </div>
            <div className="campo">
              <label htmlFor="financiamento">Financiamento</label>
              <input id="financiamento" name="financiamento" type="text" placeholder="Agência e número do processo" />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="conflito">Conflito de interesses</label>
            <textarea id="conflito" name="conflito" rows={2}
                      placeholder="Declare qualquer conflito, ou escreva: nada a declarar." />
          </div>

          <div className="campo">
            <label htmlFor="ia">Uso de inteligência artificial</label>
            <textarea id="ia" name="ia" rows={2}
                      placeholder="Ferramenta e finalidade, ou: não foi utilizada." />
            <span className="campo__ajuda">
              A política editorial exige a declaração do uso de IA generativa.
            </span>
          </div>

          <div className="campo">
            <label htmlFor="mensagem">Mensagem para a editoria</label>
            <textarea id="mensagem" name="mensagem" rows={3} />
          </div>

          <label className="caixa-marcar">
            <input type="checkbox" name="declaracao" required />
            <span>
              Declaro que o trabalho é inédito, não está em avaliação em outro periódico,
              que todos os coautores conhecem e aprovam esta submissão, e que concordo com
              a publicação sob licença CC BY 4.0 em caso de aprovação.
            </span>
          </label>
        </fieldset>
      </Formulario>
    </section>
  );
}

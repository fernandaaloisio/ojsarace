import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Formulario from "@/components/Formulario";
import { criarConta } from "@/app/acoes/conta";
import { usuarioAtual } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function CriarConta() {
  if (await usuarioAtual()) redirect("/painel");

  return (
    <section className="shell" style={{ maxWidth: "30rem", paddingBlock: "clamp(3rem, 8vw, 5rem)" }}>
      <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Área do autor</p>
      <h1 style={{ fontSize: "var(--step-3)", marginBottom: "0.75rem" }}>Criar conta</h1>
      <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginBottom: "2rem" }}>
        Os dados abaixo são os seus, como pessoa que submete. Os autores do manuscrito
        são informados depois, no formulário de submissão.
      </p>

      <Formulario acao={criarConta} rotulo="Criar conta">
        <div className="campo">
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" name="nome" type="text" required autoComplete="name" autoFocus />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="campo">
          <label htmlFor="orcid">ORCID</label>
          <input id="orcid" name="orcid" type="text" placeholder="0000-0002-1825-0097" />
          <span className="campo__ajuda">
            Opcional aqui, obrigatório para o autor correspondente na submissão.
            Registre em <a href="https://orcid.org" rel="noreferrer" style={{ color: "var(--ember)" }}>orcid.org</a>.
          </span>
        </div>
        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="afiliacao">Instituição</label>
            <input id="afiliacao" name="afiliacao" type="text" />
          </div>
          <div className="campo">
            <label htmlFor="pais">País</label>
            <input id="pais" name="pais" type="text" defaultValue="Brasil" />
          </div>
        </div>
        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" />
            <span className="campo__ajuda">Ao menos 8 caracteres.</span>
          </div>
          <div className="campo">
            <label htmlFor="senha2">Repita a senha</label>
            <input id="senha2" name="senha2" type="password" required minLength={8} autoComplete="new-password" />
          </div>
        </div>
      </Formulario>

      <p style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--rule)", fontSize: "var(--step--1)", color: "var(--ink-3)" }}>
        Já tem conta? <Link href="/entrar" style={{ color: "var(--ember)" }}>Entrar</Link>
      </p>
    </section>
  );
}

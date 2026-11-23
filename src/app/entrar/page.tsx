import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Formulario from "@/components/Formulario";
import { entrar } from "@/app/acoes/conta";
import { usuarioAtual } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function Entrar({
  searchParams,
}: { searchParams: Promise<{ destino?: string }> }) {
  if (await usuarioAtual()) redirect("/painel");
  const { destino } = await searchParams;

  return (
    <section className="shell" style={{ maxWidth: "26rem", paddingBlock: "clamp(3rem, 8vw, 6rem)" }}>
      <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Área do autor</p>
      <h1 style={{ fontSize: "var(--step-3)", marginBottom: "0.75rem" }}>Entrar</h1>
      <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginBottom: "2rem" }}>
        Para submeter manuscritos e acompanhar avaliações.
      </p>

      <Formulario acao={entrar} rotulo="Entrar">
        <input type="hidden" name="destino" value={destino ?? "/painel"} />
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required autoComplete="current-password" />
        </div>
      </Formulario>

      <p style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--rule)", fontSize: "var(--step--1)", color: "var(--ink-3)" }}>
        Ainda não tem conta? <Link href="/criar-conta" style={{ color: "var(--ember)" }}>Criar conta</Link>
      </p>
      <p style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", lineHeight: 1.55 }}>
        Pareceristas convidados não precisam de conta: o acesso ao parecer é pelo link enviado por e-mail.
      </p>
    </section>
  );
}

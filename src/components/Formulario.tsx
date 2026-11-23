"use client";

import { useActionState } from "react";

export type Estado = { erro?: string; ok?: string } | null;
export type Acao = (prev: Estado, form: FormData) => Promise<Estado>;

/** Envolve uma ação de servidor: mostra erro/sucesso e desabilita durante o envio.
 *  É o mesmo invólucro em todos os formulários do painel. */
export default function Formulario({
  acao, children, rotulo = "Enviar", variante = "solid", confirmar, className, estilo, compacto = false,
}: {
  acao: Acao;
  children?: React.ReactNode;
  rotulo?: string;
  variante?: "solid" | "linha" | "quieto";
  confirmar?: string;
  className?: string;
  estilo?: React.CSSProperties;
  compacto?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, null);

  const classe =
    variante === "solid" ? "btn btn--solid" : variante === "quieto" ? "btn btn--quiet" : "btn";

  return (
    <form
      action={enviar}
      className={className}
      style={estilo}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {estado?.erro && <p className="aviso aviso--erro" role="alert">{estado.erro}</p>}
      {estado?.ok && <p className="aviso aviso--ok" role="status">{estado.ok}</p>}
      {children}
      <button type="submit" className={`${classe}${compacto ? " btn--sm" : ""}`} disabled={pendente}>
        {pendente ? "Enviando…" : rotulo}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";

type Formatos = { rotulo: string; chave: string; texto: string }[];

/** Caixa de citação: alterna entre ABNT, APA, Vancouver, BibTeX e RIS e copia
 *  o texto pronto. As strings vêm do servidor; aqui só há troca de aba. */
export default function Citar({ formatos }: { formatos: Formatos }) {
  const [ativo, setAtivo] = useState(formatos[0]?.chave ?? "abnt");
  const [copiado, setCopiado] = useState(false);
  const atual = formatos.find((f) => f.chave === ativo) ?? formatos[0];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(atual.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="caixa">
      <div className="caixa__titulo">Como citar</div>

      <div className="filtros" style={{ paddingTop: 0, paddingBottom: "0.85rem" }}>
        {formatos.map((f) => (
          <button
            key={f.chave}
            className="tag"
            onClick={() => setAtivo(f.chave)}
            aria-pressed={ativo === f.chave}
            style={ativo === f.chave
              ? { borderColor: "var(--ember)", color: "var(--ember)", background: "color-mix(in oklab, var(--ember) 8%, transparent)", cursor: "pointer" }
              : { cursor: "pointer" }}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <pre style={{
        margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
        fontFamily: "var(--mono)", fontSize: "var(--step--2)", lineHeight: 1.6,
        color: "var(--ink-2)", background: "var(--paper)", border: "1px solid var(--rule-soft)",
        padding: "0.8rem 0.85rem", maxHeight: "16rem", overflow: "auto",
      }}>
        {atual.texto}
      </pre>

      <button className="btn btn--sm" onClick={copiar} style={{ marginTop: "0.8rem" }}>
        {copiado ? "Copiado" : "Copiar citação"}
      </button>
    </div>
  );
}

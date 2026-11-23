"use client";

import { useState } from "react";

type Autor = {
  nome: string; email: string; orcid: string;
  afiliacao: string; pais: string; titulacao: string;
};

const vazio = (): Autor => ({ nome: "", email: "", orcid: "", afiliacao: "", pais: "Brasil", titulacao: "" });

const TITULACOES = ["Graduando", "Graduado", "Especialista", "Mestrando", "Mestre", "Doutorando", "Doutor", "Pós-doutor"];

/** Lista de autores do formulário de submissão. Os campos são repetidos com
 *  o mesmo name, e a ação do servidor lê com form.getAll(), preservando a ordem. */
export default function CamposAutores({ inicial }: { inicial?: Partial<Autor> }) {
  const [autores, setAutores] = useState<Autor[]>([{ ...vazio(), ...inicial }]);
  const [correspondente, setCorrespondente] = useState(0);

  const alterar = (i: number, campo: keyof Autor, valor: string) =>
    setAutores((a) => a.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));

  const remover = (i: number) => {
    setAutores((a) => a.filter((_, j) => j !== i));
    setCorrespondente((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };

  return (
    <>
      <input type="hidden" name="autor-correspondente" value={correspondente} />

      {autores.map((a, i) => (
        <div className="autor-bloco" key={i}>
          <div className="autor-bloco__cabeca">
            <span className="autor-bloco__num">
              {i + 1}º autor{i === correspondente ? " · correspondente" : ""}
            </span>
            <span style={{ display: "flex", gap: "0.5rem" }}>
              {i !== correspondente && (
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => setCorrespondente(i)}>
                  Tornar correspondente
                </button>
              )}
              {autores.length > 1 && (
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => remover(i)}>
                  Remover
                </button>
              )}
            </span>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor={`an${i}`}>Nome completo</label>
              <input id={`an${i}`} name="autor-nome" type="text" required
                     value={a.nome} onChange={(e) => alterar(i, "nome", e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor={`ae${i}`}>E-mail</label>
              <input id={`ae${i}`} name="autor-email" type="email" required
                     value={a.email} onChange={(e) => alterar(i, "email", e.target.value)} />
            </div>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor={`ao${i}`}>
                ORCID {i === correspondente ? "(obrigatório)" : "(recomendado)"}
              </label>
              <input id={`ao${i}`} name="autor-orcid" type="text" placeholder="0000-0002-1825-0097"
                     required={i === correspondente}
                     value={a.orcid} onChange={(e) => alterar(i, "orcid", e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor={`at${i}`}>Maior titulação</label>
              <select id={`at${i}`} name="autor-titulacao"
                      value={a.titulacao} onChange={(e) => alterar(i, "titulacao", e.target.value)}>
                <option value="">Selecione</option>
                {TITULACOES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor={`af${i}`}>Instituição de vínculo</label>
              <input id={`af${i}`} name="autor-afiliacao" type="text"
                     value={a.afiliacao} onChange={(e) => alterar(i, "afiliacao", e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor={`ap${i}`}>País</label>
              <input id={`ap${i}`} name="autor-pais" type="text"
                     value={a.pais} onChange={(e) => alterar(i, "pais", e.target.value)} />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn--quiet btn--sm"
              onClick={() => setAutores((a) => [...a, vazio()])}
              style={{ marginBottom: "1.5rem" }}>
        + Adicionar autor
      </button>
    </>
  );
}

import Link from "next/link";
import Situacao from "./Situacao";
import { dataCurta, listarAutores } from "@/lib/text";
import { prazoTexto, SECOES } from "@/lib/fluxo";

type Item = {
  id: string; code: string; title: string; status: string; round: number;
  submittedAt: Date; dueAt: Date | null; sectionCode: string;
  authors: { name: string; isCorresponding: boolean }[];
  _count: { assignments: number };
};

export default function FilaSubmissoes({
  itens, vazio = "Nenhuma submissão aqui.",
}: { itens: Item[]; vazio?: string }) {
  if (!itens.length) {
    return <div className="vazio"><strong>Nada por enquanto</strong>{vazio}</div>;
  }

  return (
    <div className="fila">
      {itens.map((s) => {
        const prazo = prazoTexto(s.dueAt);
        return (
          <article className="fila__item" key={s.id}>
            <div className="fila__codigo">{s.code}</div>

            <div>
              <h3 className="fila__titulo">
                <Link href={`/painel/submissao/${s.code}`}>{s.title}</Link>
              </h3>
              {s.authors.length > 0 && (
                <p className="item__autores" style={{ marginTop: "0.3rem" }}>
                  {listarAutores(s.authors.map((a) => a.name), 4)}
                </p>
              )}
              <div className="fila__meta">
                <span className="selo">{SECOES[s.sectionCode as keyof typeof SECOES] ?? s.sectionCode}</span>
                <span className="selo">Submetido em {dataCurta(s.submittedAt)}</span>
                {s.round > 1 && <span className="selo"><b>Rodada {s.round}</b></span>}
                {s._count.assignments > 0 && (
                  <span className="selo">{s._count.assignments} {s._count.assignments === 1 ? "parecerista" : "pareceristas"}</span>
                )}
              </div>
            </div>

            <div className="fila__lado">
              <Situacao status={s.status} />
              {s.dueAt && (
                <span className={`selo${prazo.atrasado ? " selo--forte" : ""}`}>
                  {prazo.atrasado ? "Prazo: " : "Prazo "}{prazo.texto}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

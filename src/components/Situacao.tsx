import { STATUS, type Status } from "@/lib/fluxo";

export default function Situacao({ status, titulo }: { status: string; titulo?: boolean }) {
  const s = STATUS[status as Status];
  return (
    <span className="situacao" style={{ ["--cor" as string]: s?.cor ?? "var(--ink-4)" }}
          title={titulo === false ? undefined : s?.descricao}>
      {s?.rotulo ?? status}
    </span>
  );
}

const ESTADO_PARECER: Record<string, { rotulo: string; cor: string }> = {
  convidado: { rotulo: "Convidado", cor: "var(--dawn)" },
  aceito:    { rotulo: "Aceito",    cor: "var(--night)" },
  recusado:  { rotulo: "Recusado",  cor: "var(--ink-4)" },
  concluido: { rotulo: "Concluído", cor: "var(--moss)" },
  cancelado: { rotulo: "Cancelado", cor: "var(--ink-4)" },
  expirado:  { rotulo: "Expirado",  cor: "var(--ember)" },
};

export function SituacaoParecer({ status }: { status: string }) {
  const s = ESTADO_PARECER[status];
  return (
    <span className="situacao" style={{ ["--cor" as string]: s?.cor ?? "var(--ink-4)" }}>
      {s?.rotulo ?? status}
    </span>
  );
}

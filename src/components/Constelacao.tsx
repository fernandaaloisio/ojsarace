import Link from "next/link";

type Termo = { slug: string; term: string; count: number };

/** Campo de palavras-chave posicionado por espiral de Vogel (ângulo de ouro):
 *  distribuição estável, sem física nem bibliotecas, e o mesmo desenho a cada
 *  renderização. O raio cresce com a raiz do índice, o corpo com a frequência.
 *  Os rótulos à direita do centro são ancorados ao fim, para que o texto cresça
 *  para dentro da moldura e nada seja cortado nas bordas. */
export default function Constelacao({ termos, largura = 1000, altura = 520 }: {
  termos: Termo[]; largura?: number; altura?: number;
}) {
  if (!termos.length) return null;
  const max = termos[0].count;
  const min = termos[termos.length - 1].count || 1;
  const PHI = Math.PI * (3 - Math.sqrt(5));
  const cx = largura / 2;
  const cy = altura / 2;
  const escalaR = Math.min(largura, altura * 1.7) / 2.75;
  const margem = 24;

  const nos = termos.map((t, i) => {
    const r = escalaR * Math.sqrt((i + 0.6) / termos.length);
    const a = i * PHI;
    const peso = (t.count - min) / Math.max(1, max - min);
    const x = cx + r * Math.cos(a) * 1.42;
    const y = cy + r * Math.sin(a) * 0.95;
    const corpo = 12 + peso * 26;
    return {
      ...t, x, y, corpo,
      ponto: 1.6 + peso * 4,
      opacidade: 0.5 + peso * 0.5,
      // metade direita: texto ancorado ao fim, ponto depois do texto
      fim: x > cx,
    };
  });

  return (
    <svg
      className="constelacao"
      viewBox={`${-margem} ${-margem} ${largura + margem * 2} ${altura + margem * 2}`}
      role="list"
      aria-label="Palavras-chave mais frequentes no acervo"
    >
      {nos.map((n) => {
        const dy = n.corpo * 0.33;
        const px = n.fim ? n.x + n.ponto + 4 : n.x - n.ponto - 4;
        const tx = n.fim ? n.x - 1 : n.x + 1;
        return (
          <Link key={n.slug} href={`/explorar/${n.slug}`} role="listitem">
            <title>{`${n.term} — ${n.count} artigos`}</title>
            <circle cx={px} cy={n.y - dy} r={n.ponto} opacity={n.opacidade} />
            <text
              x={tx}
              y={n.y - dy}
              fontSize={n.corpo}
              textAnchor={n.fim ? "end" : "start"}
              dominantBaseline="middle"
              opacity={n.opacidade}
              style={{ fontWeight: n.corpo > 26 ? 600 : 450, letterSpacing: "-0.01em" }}
            >
              {n.term}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}

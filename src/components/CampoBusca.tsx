import Link from "next/link";

export default function CampoBusca({
  valor = "", acao = "/busca", autoFocus = false, placeholder = "Buscar por título, autor, resumo ou palavra-chave",
}: { valor?: string; acao?: string; autoFocus?: boolean; placeholder?: string }) {
  return (
    <form className="busca-campo" action={acao} role="search">
      <input
        type="search"
        name="q"
        defaultValue={valor}
        placeholder={placeholder}
        aria-label="Termo de busca"
        autoFocus={autoFocus}
      />
      <button type="submit">Buscar</button>
    </form>
  );
}

export function AtalhosBusca({ termos }: { termos: { slug: string; term: string }[] }) {
  return (
    <div className="filtros" aria-label="Temas mais frequentes">
      {termos.map((t) => (
        <Link key={t.slug} className="tag" href={`/explorar/${t.slug}`}>{t.term}</Link>
      ))}
    </div>
  );
}

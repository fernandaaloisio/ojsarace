"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type ItemNav = { href: string; rotulo: string };

/**
 * Barra de navegação, logo abaixo do banner. Gruda no topo ao rolar, para
 * que o menu continue ao alcance em páginas longas como o arquivo.
 */
export default function Masthead({
  titulo, links, autenticado,
}: { titulo: string; links: ItemNav[]; autenticado: boolean }) {
  const caminho = usePathname();
  const router = useRouter();
  const [tema, setTema] = useState<"dia" | "noite">("dia");
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = termo.trim();
    router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/busca");
    setAberto(false);
  }

  useEffect(() => {
    setTema((document.documentElement.dataset.tema as "dia" | "noite") ?? "dia");
  }, []);
  useEffect(() => { setAberto(false); }, [caminho]);

  function alternar() {
    const novo = tema === "dia" ? "noite" : "dia";
    document.documentElement.dataset.tema = novo;
    try { localStorage.setItem("aurora-tema", novo); } catch {}
    setTema(novo);
  }

  const atual = (href: string) =>
    caminho === href || (href !== "/" && caminho.startsWith(href)) ? "page" : undefined;

  return (
    <nav className="barra" aria-label="Navegação principal">
      <div className="shell barra__in">
        <Link href="/" className="barra__atalho" aria-label={`${titulo}, início`}>
          <span className="barra__sol" aria-hidden />
          <span>{titulo}</span>
        </Link>

        <ul className="barra__lista">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={atual(l.href)}>{l.rotulo}</Link>
            </li>
          ))}
        </ul>

        <div className="barra__acoes">
          <form className="barra__busca" role="search" onSubmit={buscar}>
            <label htmlFor="barra-q" className="barra__busca-rot">Buscar no acervo</label>
            <input id="barra-q" type="search" value={termo} onChange={(e) => setTermo(e.target.value)}
                   placeholder="Buscar artigos" autoComplete="off" />
            <button type="submit" aria-label="Buscar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <circle cx="6.8" cy="6.8" r="4.6" />
                <path d="M10.3 10.3 14 14" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <Link href="/submeter" className="barra__enviar">Enviar artigo</Link>

          <Link href={autenticado ? "/painel" : "/entrar"} className="barra__entrar">
            {autenticado ? "Painel" : "Entrar"}
          </Link>

          <button className="icone-btn" onClick={alternar}
            aria-label={tema === "dia" ? "Ativar tema noturno" : "Ativar tema claro"}>
            {tema === "dia" ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.2 10.1A5.6 5.6 0 0 1 6 2.8a5.6 5.6 0 1 0 7.2 7.3Z" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="3.1" />
                <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button className="icone-btn barra__menu" onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto} aria-label="Abrir menu">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
              {aberto
                ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
                : <path d="M2 4.5h12M2 8h12M2 11.5h12" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {aberto && (
        <div className="shell barra__gaveta">
          <form className="barra__busca barra__busca--gaveta" role="search" onSubmit={buscar}>
            <label htmlFor="gaveta-q" className="barra__busca-rot">Buscar no acervo</label>
            <input id="gaveta-q" type="search" value={termo} onChange={(e) => setTermo(e.target.value)}
                   placeholder="Buscar artigos" autoComplete="off" />
            <button type="submit" aria-label="Buscar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <circle cx="6.8" cy="6.8" r="4.6" />
                <path d="M10.3 10.3 14 14" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={atual(l.href)}>{l.rotulo}</Link>
          ))}
          <Link href="/submeter">Enviar artigo</Link>
          <Link href={autenticado ? "/painel" : "/entrar"}>{autenticado ? "Painel" : "Entrar"}</Link>
        </div>
      )}
    </nav>
  );
}

import type { Metadata } from "next";
import { EB_Garamond, Libre_Franklin, DM_Mono } from "next/font/google";
import "./globals.css";
import Masthead from "@/components/Masthead";
import Banner from "@/components/Banner";
import SiteFooter from "@/components/SiteFooter";
import { revista, paginasNav, paginasTodas, panorama, indices } from "@/lib/queries";
import { usuarioAtual } from "@/lib/auth";
import { SITE_URL } from "@/lib/text";

/* EB Garamond no que se le: titulo, resumo, corpo do artigo e referencias.
   E um recorte livre dos tipos de Claude Garamont, do seculo XVI, e e a
   tradicao tipografica do texto academico impresso. A Garamond original e
   comercial; esta tem desenho equivalente e licenca aberta. */
const serifa = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});
/* Libre Franklin fica so no que e interface: menu, botoes, rotulos de
   metadado. Serifada em corpo 10 nao se le, e sans em texto longo cansa:
   cada uma no seu lugar. */
const franklin = Libre_Franklin({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const r = await revista();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${r.title} — Revista Científica Interdisciplinar`,
      template: `%s — ${r.title}`,
    },
    description: r.description ?? undefined,
    applicationName: r.title,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: r.title,
      title: `${r.title} — Revista Científica Interdisciplinar`,
      description: r.description ?? undefined,
    },
    alternates: {
      types: {
        "application/xml": [{ url: "/api/oai?verb=Identify", title: "OAI-PMH" }],
      },
    },
    robots: { index: true, follow: true },
  };
}

/** Menu da revista. A ordem segue o que o leitor procura primeiro, e os
 *  nomes são os que a comunidade acadêmica usa. */
/* Menu curto, com a busca e o botao de enviar artigo na propria barra.
   Qualis, taxa de publicacao e templates continuam no rodape, em "A revista",
   que lista as paginas institucionais cadastradas. */
const NAV = [
  { href: "/sobre", rotulo: "Sobre a revista" },
  { href: "/edicao-atual", rotulo: "Edição atual" },
  { href: "/arquivo", rotulo: "Acervo" },
  { href: "/politica-editorial", rotulo: "Políticas editoriais" },
  { href: "/indexacao", rotulo: "Indexadores" },
  { href: "/diretrizes", rotulo: "Submissões" },
];

/* Aplica o tema antes da pintura para nao haver piscada de claro para escuro. */
const scriptTema = `
(function(){try{
  var t=localStorage.getItem("aurora-tema");
  if(!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "noite" : "dia";
  document.documentElement.dataset.tema=t;
}catch(e){}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [r, nav, todas, u, p, idx] = await Promise.all([
    revista(), paginasNav(), paginasTodas(), usuarioAtual(), panorama(), indices(),
  ]);

  return (
    /* As variaveis das fontes vao no <html>, e nao no <body>: os tokens de
       globals.css sao definidos em :root, que e o proprio <html>. No <body>
       elas chegavam tarde demais, --sans virava invalido e o navegador caia
       no serif padrao. */
    <html lang="pt-BR" suppressHydrationWarning
          className={`${serifa.variable} ${franklin.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        <link rel="alternate" type="application/rss+xml" title={`${r.title} — últimos artigos`} href="/feed.xml" />
      </head>
      <body>
        <a href="#conteudo" className="sr">Ir para o conteúdo</a>
        <Banner
          credenciais={{ artigos: p.artigos, edicoes: p.edicoes, h: idx.h, i10: idx.i10 }}
          titulo={r.title}
          issn={r.issn}
          qualis={r.qualis}
          publisher={r.publisher}
          bannerUrl={r.bannerUrl}
          bannerAlt={r.bannerAlt}
          bannerFoco={r.bannerFoco}
          logoUrl={r.logoUrl}
        />
        <Masthead titulo={r.title} links={NAV} autenticado={!!u} />
        <main id="conteudo">{children}</main>
        <SiteFooter
          titulo={r.title}
          issn={r.issn}
          doiPrefix={r.doiPrefix}
          publisher={r.publisher}
          qualis={r.qualis}
          paginas={todas}
        />
      </body>
    </html>
  );
}

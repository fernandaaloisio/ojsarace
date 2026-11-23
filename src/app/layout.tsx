import type { Metadata } from "next";
import { Bricolage_Grotesque, Schibsted_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import Masthead from "@/components/Masthead";
import Banner from "@/components/Banner";
import SiteFooter from "@/components/SiteFooter";
import { revista, paginasNav, paginasTodas } from "@/lib/queries";
import { usuarioAtual } from "@/lib/auth";
import { SITE_URL } from "@/lib/text";

/* Bricolage Grotesque nos titulos. E um desenho recente, de contraste
   irregular e largura variavel, que nao aparece nos temas prontos: e dele
   que vem o carater da revista. Os eixos opsz e wdth deixam o titulo
   apertar sozinho conforme o tamanho. */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "wdth"],
  display: "swap",
});
/* Schibsted Grotesk no texto. Feita para jornal escandinavo: letra estreita,
   aberturas francas e numeros firmes, que e o que um artigo pede. Nao e
   nenhuma das sans que todo site usa. */
const sans = Schibsted_Grotesk({
  subsets: ["latin"],
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
  const [r, nav, todas, u] = await Promise.all([revista(), paginasNav(), paginasTodas(), usuarioAtual()]);

  return (
    /* As variaveis das fontes vao no <html>, e nao no <body>: os tokens de
       globals.css sao definidos em :root, que e o proprio <html>. No <body>
       elas chegavam tarde demais, --sans virava invalido e o navegador caia
       no serif padrao. */
    <html lang="pt-BR" suppressHydrationWarning
          className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        <link rel="alternate" type="application/rss+xml" title={`${r.title} — últimos artigos`} href="/feed.xml" />
      </head>
      <body>
        <a href="#conteudo" className="sr">Ir para o conteúdo</a>
        <Banner
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

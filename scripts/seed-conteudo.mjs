/**
 * Páginas institucionais e a lista de bases indexadoras.
 * Idempotente: pode rodar quantas vezes quiser, sempre faz upsert.
 *
 * O texto aqui é o ponto de partida editável. Nenhum nome de conselho
 * editorial foi inventado: a página de equipe fica marcada para preenchimento.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const PAGINAS = [
  {
    slug: "sobre", nav: true, position: 1, title: "Sobre a revista",
    summary: "Escopo, histórico, política de acesso aberto e identificação da revista.",
    body: `A **ARACÊ** é uma revista científica interdisciplinar de acesso aberto, com ISSN 2358-2472 e avaliação **Qualis CAPES B1** no quadriênio 2021-2024.

## Escopo
A revista é qualificada nas áreas Interdisciplinar, Ciências Sociais Aplicadas, Ciências Humanas, Ciências da Saúde, Ciências Biológicas, Ciências Agrárias, Engenharias, Ciências Exatas e da Terra, Artes, Arquitetura, e Educação e Ensino.

São aceitos artigos científicos, revisões de literatura, resenhas, estudos de caso, pesquisa-ação e relatos de experiência, em **português, inglês e espanhol**.

## Histórico editorial
A revista foi editada pela Associação Nacional de Direitos Humanos, Pesquisa e Pós-Graduação até 20 de setembro de 2024. A partir de 21 de setembro de 2024, passou a ser editada pela **New Science Publishers**.

## Acesso aberto
Todo o conteúdo está disponível gratuitamente, sem período de embargo e sem necessidade de cadastro para leitura. Os artigos são publicados sob licença [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt-br): é permitido copiar, distribuir e adaptar o material, inclusive comercialmente, desde que a autoria e a fonte original sejam creditadas.

Os autores retêm os direitos autorais de seus trabalhos e concedem à revista o direito de primeira publicação.

## Periodicidade
Publicação em **fluxo contínuo**, com fechamento mensal de edições. Um artigo aprovado é publicado assim que concluída a editoração, sem esperar o fechamento do fascículo.

## Identificadores persistentes
Cada artigo recebe um **DOI** sob o prefixo \`10.56238\`, registrado no Crossref. O DOI é o endereço permanente do artigo e deve ser usado em citações.

## Preservação
Os metadados são depositados no Crossref e expostos por OAI-PMH, permitindo colheita e preservação por bibliotecas e agregadores. Veja a [página de indexação](/indexacao) para os pontos de acesso.`,
  },
  {
    slug: "diretrizes", nav: true, position: 2, title: "Diretrizes para autores",
    summary: "Como preparar e submeter um manuscrito, formato exigido e fluxo de avaliação.",
    body: `## Antes de submeter
Verifique se o manuscrito é inédito e não está em avaliação em outra revista; se o tema está dentro do [escopo da revista](/sobre); se todos os coautores conhecem e aprovam a submissão; e se as questões éticas da pesquisa foram observadas, com número de parecer do CEP quando houver pesquisa com seres humanos ou animais.

## Formato do manuscrito
- Arquivo em formato editável (**.docx** ou **.odt**), nunca somente PDF
- Fonte Times New Roman, corpo 12, espaçamento 1,5
- Título em português e em inglês
- Resumo de 150 a 250 palavras, com versão em inglês (*abstract*)
- **Exatamente 3 palavras-chave**, separadas por ponto e vírgula, com versão em inglês
- Referências conforme a **ABNT NBR 6023**, em ordem alfabética
- Mínimo de 10 referências, preferencialmente de periódicos revisados por pares e dos últimos cinco anos
- Citações no corpo do texto conforme ABNT NBR 10520
- Tabelas e figuras numeradas, com título acima e fonte abaixo, e com os dados que as originaram disponíveis

## Estrutura esperada
Para artigos de pesquisa original: Introdução, Metodologia, Resultados, Discussão, Conclusão e Referências. Para revisões de literatura: Introdução, Metodologia da revisão, Desenvolvimento, Considerações finais e Referências.

## Identificação dos autores
Informe, para cada autor: nome completo, maior titulação, instituição de vínculo, cidade, estado, país, **ORCID** e e-mail. O ORCID é obrigatório para o autor correspondente e recomendado para todos.

## Fluxo de avaliação
1. **Triagem editorial** — conferência de escopo, formato e originalidade, com verificação de similaridade
2. **Avaliação por pares** — no mínimo dois pareceristas em sistema duplo-cego
3. **Decisão editorial** — aprovação, aprovação com ajustes, nova submissão após reformulação, ou recusa
4. **Ajustes pelos autores**, quando solicitados
5. **Editoração, atribuição de DOI e publicação**

## Direitos e licença
Ao submeter, os autores concordam com a publicação sob licença CC BY 4.0 e declaram que o conteúdo não infringe direitos de terceiros. Os autores retêm os direitos autorais.

## Submissão
Enquanto o novo sistema de submissão está em implantação, as submissões seguem pelos canais informados na [página de contato](/contato).`,
  },
  {
    slug: "politica-editorial", nav: false, position: 3, title: "Política editorial e avaliação por pares",
    summary: "Critérios de avaliação, sistema duplo-cego, prazos e critérios de decisão.",
    body: `## Avaliação por pares duplo-cega
Todo manuscrito que passa a triagem editorial é encaminhado a, no mínimo, **dois pareceristas** com titulação de mestre ou doutor e produção na área do manuscrito. Nem os autores conhecem a identidade dos pareceristas, nem os pareceristas a dos autores.

Quando os dois pareceres são divergentes, um terceiro parecerista é acionado, e a decisão final cabe ao editor responsável.

## Critérios de avaliação
- Relevância e originalidade da contribuição
- Clareza e pertinência do problema de pesquisa
- Adequação e rigor do percurso metodológico
- Consistência entre resultados, discussão e conclusões
- Atualidade, suficiência e correção das referências
- Clareza da redação e correção da linguagem científica

## Prazos de referência
- Triagem editorial: até 10 dias da submissão
- Avaliação por pares: até 30 dias do aceite do convite
- Comunicação da decisão: até 7 dias da conclusão dos pareceres
- Publicação após aprovação final: até 30 dias

Os prazos são de referência e podem variar conforme a disponibilidade de pareceristas na área específica.

## Conflito de interesses
Pareceristas e editores devem declarar qualquer conflito de interesse e recusar a avaliação quando houver vínculo institucional, de coautoria recente ou de orientação com os autores.

## Correções e retratações
Erros que não alterem conclusões são corrigidos por **errata**, vinculada ao artigo original. Erros que invalidem resultados, assim como má conduta comprovada, levam à **retratação**, com nota permanente no registro do artigo e comunicação ao Crossref. O artigo retratado permanece acessível, marcado como retratado, para preservar o registro público da ciência.

## Preprints
É aceita a submissão de trabalhos previamente depositados em servidores de preprints, desde que informado na submissão, com o endereço do depósito.

## Uso de inteligência artificial
O uso de ferramentas de IA generativa deve ser declarado na seção de metodologia, com indicação da ferramenta e da finalidade. Ferramentas de IA não podem figurar como autoras, e a responsabilidade pelo conteúdo é integralmente dos autores.`,
  },
  {
    slug: "etica", nav: false, position: 4, title: "Ética na publicação",
    summary: "Compromissos de autores, pareceristas e editores, e tratamento de má conduta.",
    body: `A revista orienta-se pelas diretrizes do **COPE (Committee on Publication Ethics)**.

## Deveres dos autores
- Garantir a originalidade do trabalho e a correta atribuição de todas as fontes
- Não submeter o mesmo manuscrito simultaneamente a mais de um periódico
- Incluir como autores somente quem contribuiu de forma substantiva para a pesquisa
- Informar as fontes de financiamento e eventuais conflitos de interesse
- Apresentar aprovação de Comitê de Ética em Pesquisa quando a pesquisa envolver seres humanos ou animais
- Comunicar à revista qualquer erro relevante identificado após a publicação

## Deveres dos pareceristas
- Tratar o manuscrito como documento confidencial
- Emitir parecer fundamentado, objetivo e respeitoso, sem crítica pessoal aos autores
- Apontar trabalhos relevantes não citados
- Declarar conflito de interesse e recusar a avaliação quando ele existir

## Deveres dos editores
- Decidir com base no mérito científico, sem discriminação de origem, vínculo, gênero, raça, religião ou orientação política dos autores
- Preservar a confidencialidade de manuscritos e de pareceres
- Agir diante de suspeita de má conduta, mesmo após a publicação

## Plágio e má conduta
Todos os manuscritos passam por verificação de similaridade. Casos de plágio, autoplágio, fabricação ou falsificação de dados, autoria indevida e submissão duplicada levam à recusa imediata e, quando já publicado, à retratação do artigo, com comunicação às instituições de vínculo dos autores.

## Denúncias
Suspeitas de má conduta podem ser comunicadas pelos canais da [página de contato](/contato). A revista compromete-se a apurar cada caso e a preservar a identidade de quem denuncia.`,
  },
  {
    slug: "equipe-editorial", nav: false, position: 5, title: "Equipe editorial",
    summary: "Corpo editorial e conselho científico da revista.",
    body: `## A preencher
Esta página é alimentada pelo cadastro de **equipe editorial** do sistema, e ainda não há registros cadastrados.

Para publicá-la, cadastre no sistema, para cada integrante: nome completo, função (editor-chefe, editor associado, editor de seção ou conselho científico), instituição de vínculo, país e ORCID.

A composição e a qualificação do corpo editorial são critérios avaliados pelas bases indexadoras e pela classificação Qualis, por isso esta página deve ser preenchida com os dados reais e mantida atualizada.`,
  },
  {
    slug: "taxas", nav: false, position: 6, title: "Taxas",
    summary: "Política de cobrança para submissão e publicação.",
    body: `## A informar
Esta página precisa declarar expressamente a política de cobrança da revista: se há **taxa de submissão**, se há **taxa de processamento de artigo (APC)**, os valores vigentes, o que está incluído e as condições de isenção.

A declaração clara e acessível da política de taxas é exigência do DOAJ e critério de transparência avaliado pelas demais bases indexadoras. A ausência dessa informação é um dos motivos mais comuns de recusa em processos de indexação.`,
  },

  {
    slug: "contato", nav: false, position: 7, title: "Contato",
    summary: "Canais de contato com a editoria e dados do editor responsável.",
    body: `## Editora
**New Science Publishers**

## Correio eletrônico
Para submissões, dúvidas sobre manuscritos em avaliação, erratas e denúncias: contato@sevenevents.com.br

## Dados a completar
Para atender aos requisitos de indexação, esta página deve informar também: endereço postal completo da editora, CNPJ, nome do editor responsável e do contato técnico do periódico.`,
  },
  {
    slug: "qualis", nav: false, position: 8, title: "Qualis CAPES",
    summary: "Classificação da revista no Qualis Periódicos e o que ela significa para quem publica.",
    body: `A **ARACÊ** está classificada como **Qualis B1** no quadriênio 2021-2024.

## O que é o Qualis
O Qualis Periódicos é o sistema da CAPES que classifica a produção científica divulgada em periódicos. A classificação é usada na avaliação dos programas de pós-graduação brasileiros e, por consequência, na avaliação da produção de cada pesquisador vinculado a eles.

A escala vai de A1, a mais alta, até C, passando por A2, A3, A4, B1, B2, B3 e B4.

## O que B1 significa na prática
Publicar nesta revista confere ao trabalho a pontuação correspondente ao estrato B1 na área em que a revista é qualificada. Como a ARACÊ é qualificada em várias áreas, a pontuação efetiva depende da área de avaliação do programa a que o autor está vinculado.

## Áreas em que a revista é qualificada
- Interdisciplinar
- Ciências Sociais Aplicadas
- Ciências Humanas
- Ciências da Saúde
- Ciências Biológicas
- Ciências Agrárias
- Engenharias
- Ciências Exatas e da Terra
- Artes
- Arquitetura
- Educação e Ensino

## Onde conferir
A classificação é consultável na Plataforma Sucupira, pelo ISSN **2358-2472**. Recomendamos a consulta direta, já que o Qualis é revisto a cada quadriênio e a referência oficial é sempre a da CAPES.

A revista não tem ingerência sobre a classificação, que é atribuída pelas comissões de área da CAPES.`,
  },
  {
    slug: "templates", nav: false, position: 9, title: "Templates",
    summary: "Modelo de formatação do manuscrito e o que conferir antes de submeter.",
    body: `Use o modelo oficial da revista para formatar o manuscrito. Ele já traz a estrutura, os estilos de título e o formato das referências que a avaliação espera.

## O que o modelo traz pronto
- Folha de rosto com os campos de autoria, incluindo ORCID e titulação
- Estrutura de seções para artigo de pesquisa e para revisão de literatura
- Estilos de título em três níveis
- Formato de tabela e de figura, com título acima e fonte abaixo
- Lista de referências conforme a **ABNT NBR 6023**

## Antes de submeter, confira
- Resumo entre 150 e 250 palavras, com versão em inglês
- **Exatamente três palavras-chave**, separadas por ponto e vírgula, com versão em inglês
- Mínimo de dez referências, preferencialmente de periódicos revisados por pares
- Citações no corpo do texto conforme a ABNT NBR 10520
- ORCID do autor correspondente preenchido
- Arquivo em formato editável: **.docx** ou **.odt**, nunca apenas PDF

O sistema confere o tamanho do resumo, o número de palavras-chave e o ORCID do autor correspondente no momento do envio, e recusa a submissão que não atender a esses pontos.

## Versão anonimizada
Prepare também uma versão sem nomes, instituições e agradecimentos. É ela que vai aos pareceristas, e é o que garante a avaliação duplo-cega. Se você não enviar, a editoria prepara uma antes de distribuir o manuscrito.

Veja as [diretrizes completas para autores](/diretrizes) e a [política editorial](/politica-editorial).`,
  },
];

const INDEXADORES = [
  { code: "crossref", name: "Crossref", kind: "push", autoSync: true,
    url: "https://search.crossref.org/?q=2358-2472", identifier: "prefixo 10.56238",
    lastMessage: "Depósito de DOI e coleta de citações e referências." },
  { code: "openalex", name: "OpenAlex", kind: "pull", autoSync: true,
    url: "https://openalex.org/", identifier: "issn:2358-2472",
    lastMessage: "Fonte aberta de métricas de citação e vínculos institucionais." },
  { code: "scholar", name: "Google Scholar", kind: "harvest", autoSync: false,
    url: "https://scholar.google.com/",
    lastMessage: "Colhe pelas tags Highwire da página de cada artigo e pelo sitemap." },
  { code: "doaj", name: "DOAJ", kind: "harvest", autoSync: false,
    url: "https://doaj.org/apply/",
    lastMessage: "Exige política de taxas declarada, equipe editorial pública e licença explícita." },
  { code: "base", name: "BASE — Bielefeld Academic Search Engine", kind: "harvest", autoSync: false,
    url: "https://www.base-search.net/about/en/suggest.php",
    lastMessage: "Cadastre a baseURL do OAI-PMH no formulário de sugestão." },
  { code: "lareferencia", name: "LA Referencia", kind: "harvest", autoSync: false,
    url: "https://www.lareferencia.info/",
    lastMessage: "Rede latino-americana; exige metadados com vocabulário info:eu-repo." },
  { code: "latindex", name: "Latindex", kind: "harvest", autoSync: false,
    url: "https://latindex.org/latindex/postulacion",
    lastMessage: "Avaliação por 38 critérios de qualidade editorial." },
  { code: "diadorim", name: "Diadorim — IBICT", kind: "harvest", autoSync: false,
    url: "https://diadorim.ibict.br/",
    lastMessage: "Diretório brasileiro de políticas de acesso aberto de periódicos." },
  { code: "redib", name: "REDIB", kind: "harvest", autoSync: false,
    url: "https://redib.org/",
    lastMessage: "Rede ibero-americana de inovação e conhecimento científico." },
  { code: "sumarios", name: "Sumários.org", kind: "harvest", autoSync: false,
    url: "https://sumarios.org/",
    lastMessage: "Sumários de revistas brasileiras." },
  { code: "orcid", name: "ORCID", kind: "pull", autoSync: false,
    url: "https://orcid.org/",
    lastMessage: "Enriquecimento de afiliação e identificação de autoria." },
];

async function main() {
  const journal = await db.journal.findUnique({ where: { slug: "arace" }, select: { id: true } });
  if (!journal) throw new Error("Periódico não encontrado. Rode antes: node scripts/import.mjs");

  for (const p of PAGINAS) {
    await db.staticPage.upsert({
      where: { journalId_slug: { journalId: journal.id, slug: p.slug } },
      create: { ...p, journalId: journal.id },
      update: { title: p.title, summary: p.summary, body: p.body, nav: p.nav, position: p.position },
    });
  }
  console.log(`paginas institucionais: ${PAGINAS.length}`);

  for (const i of INDEXADORES) {
    await db.indexerLink.upsert({
      where: { journalId_code: { journalId: journal.id, code: i.code } },
      create: { ...i, journalId: journal.id, status: "pendente" },
      update: { name: i.name, kind: i.kind, url: i.url, identifier: i.identifier ?? null, autoSync: i.autoSync },
    });
  }
  console.log(`bases indexadoras: ${INDEXADORES.length}`);

  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });

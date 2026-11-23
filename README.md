# Aurora — plataforma de periódicos científicos

Sistema editorial próprio da **New Science Publishers**, feito para substituir o OJS
na revista **ARACÊ** (ISSN 2358-2472, Qualis CAPES B1, prefixo DOI `10.56238`).

Entrega o **portal público**, a **interligação com os indexadores** e o
**painel de submissão e avaliação por pares**.

---

## O que já funciona

### Portal público
| Rota | O que é |
|---|---|
| `/` | Abertura, panorama do acervo, sumário da edição corrente, mais citados, série anual e mapa de temas |
| `/edicao-atual` | Redireciona para a edição de maior volume/número |
| `/edicao/[slug]` | Sumário completo da edição, agrupado por seção, com navegação entre fascículos |
| `/artigo/[slug]` | Página do artigo: ficha técnica em marginália, resumo, palavras-chave, referências, artigos correlatos e caixa de citação |
| `/arquivo` | Todas as edições, por ano, com barra proporcional ao número de artigos |
| `/busca` | Busca com facetas de seção, idioma, ano e ordenação |
| `/explorar` e `/explorar/[slug]` | Mapa de descritores e o acervo de cada tema |
| `/autores` e `/autor/[slug]` | Perfil de autoria com publicações, citações, período e rede de coautoria |
| `/indexacao` | Estado real de cada base indexadora e pontos de acesso aos metadados |
| `/sobre`, `/diretrizes`, `/politica-editorial`, `/etica`, `/equipe-editorial`, `/taxas`, `/contato` | Páginas institucionais, editáveis no banco |

Tema claro e escuro, layout responsivo, e a página de artigo imprime limpa.

### Interligação com indexadores

**Saída — o que o portal expõe**
- `GET /api/oai` — servidor **OAI-PMH 2.0** completo (`Identify`, `ListMetadataFormats`,
  `ListSets`, `ListIdentifiers`, `ListRecords`, `GetRecord`), formato `oai_dc`,
  paginação por `resumptionToken`. É a baseURL para cadastrar no DOAJ, BASE,
  LA Referencia, Diadorim e demais colhedores.
- Tags **Highwire** (`citation_*`) em toda página de artigo — é por elas que o Google Scholar indexa.
- **JSON-LD** `ScholarlyArticle` para os buscadores.
- `GET /api/crossref/[slug-da-edicao]` — **XML de depósito de DOI** de uma edição
  inteira, no schema Crossref 5.3.1, pronto para envio.
- `/sitemap.xml`, `/robots.txt`, `/feed.xml`.
- Exportação de citação em **ABNT, APA, Vancouver, BibTeX e RIS** em cada artigo.

**Entrada — o que o portal puxa sozinho**
- **OAI-PMH do OJS atual** — espinha dorsal do acervo: resumo, palavras-chave, PDF, seção, edição.
- **Crossref** — DOI, volume/número, elocation, paginação, referências e citações.
- **OpenAlex** — ORCID, afiliação institucional e contagem de citações atualizada.
- **DOAJ** — verifica se a revista está indexada e registra o estado.

### Painel editorial

Fluxo completo: autor submete, editor faz triagem e distribui, parecerista
avalia por link seguro, editor decide, autor reformula.

| Rota | Quem acessa | O que é |
|---|---|---|
| `/entrar`, `/criar-conta` | público | Acesso por e-mail e senha (hash scrypt, sessão em cookie httpOnly de 30 dias) |
| `/submeter` | autor | Formulário em quatro blocos: manuscrito, autoria, arquivos e declarações |
| `/painel` | autenticado | Visão por papel: suas submissões, seus pareceres e, para a editoria, a fila e os atrasos |
| `/painel/fila` | editoria | Fila filtrável por situação |
| `/painel/submissao/[code]` | autor e editoria | Tela de trabalho: resumo, autoria, declarações, arquivos, pareceres, decisões e histórico |
| `/painel/mensagens` | editoria | Fila de mensagens geradas pelo fluxo |
| `/painel/pareceres` | parecerista | Convites recebidos e prazos |
| `/painel/perfil` | autenticado | Dados, ORCID, áreas de atuação e adesão ao corpo de pareceristas |
| `/parecer/[token]` | parecerista | Aceite do convite e formulário de parecer, **sem exigir conta** |
| `/api/arquivo/[id]` | autorizado | Download controlado dos manuscritos |

**Situações:** submetido → em triagem → em avaliação → aguardando decisão →
ajustes solicitados → em reavaliação → aceito → em editoração → publicado,
mais recusado, retirado e arquivado.

**O que o sistema garante por construção**

- **Duplo-cego real.** O parecerista nunca recebe autoria, e o download só
  libera a versão anonimizada e o material suplementar: o manuscrito
  identificado responde 403 mesmo com token válido.
- **Manuscrito não é público.** Os arquivos ficam em `storage/`, fora de
  `public/`, e saem apenas por rota autenticada. O nome em disco é um UUID
  gerado pelo sistema; o nome original do envio nunca toca o sistema de arquivos.
- **Parecerista sem conta.** O convite gera um token de 32 bytes; o banco guarda
  só o SHA-256 dele. Quem avalia clica no link e trabalha, sem cadastro.
- **Validação pelas diretrizes.** O envio recusa resumo fora da faixa de
  palavras, número de palavras-chave diferente de três, e autor correspondente
  sem ORCID.
- **Trilha de auditoria.** Toda ação vira evento, marcado como público (o autor
  vê) ou interno (só a editoria). A identidade dos pareceristas fica nos
  eventos internos.
- **Transição automática.** Entregue o último parecer da rodada, com dois ou
  mais concluídos, a submissão passa sozinha para "aguardando decisão".
- **Conflito evidente barrado.** Não é possível convidar como parecerista
  alguém que consta como autor do próprio manuscrito.

**Mensagens.** Cada passo do fluxo gera a mensagem correspondente, com o texto
pronto, na fila em `/painel/mensagens`. Sem servidor de e-mail configurado, a
editoria copia de lá (ou abre no cliente de e-mail por um clique) e marca como
enviada. Quando houver SMTP, é esse o ponto único a ligar.

### Criar o primeiro editor

```bash
node scripts/criar-editor.mjs "Nome Completo" email@dominio.com senhaforte
```

Cria a conta com os papéis de autor, editor e admin, ou acrescenta os papéis a
uma conta existente.

---

## Como rodar

```bash
npm install
npx prisma db push
npm run pipeline      # coleta + importação + conteúdo + enriquecimento + status das bases
npm run dev           # http://localhost:4321
```

Para atualizar o acervo depois (citações, ORCID, status das bases):

```bash
npm run atualizar
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run harvest:oai` | Coleta o acervo do OJS legado por OAI-PMH para `data/oai.ndjson` |
| `npm run harvest:crossref` | Coleta os registros do Crossref para `data/crossref.ndjson` |
| `npm run import` | Cruza as duas fontes e grava no banco (recria o acervo do zero) |
| `npm run seed` | Páginas institucionais e lista de bases indexadoras (idempotente) |
| `npm run enriquecer` | Puxa ORCID, afiliação e citações do OpenAlex |
| `npm run sync:indexadores` | Consulta Crossref, OpenAlex e DOAJ e grava o estado real |
| `npm run db:studio` | Abre o Prisma Studio para editar qualquer dado à mão |

---

## Como as fontes são cruzadas

O OJS e o Crossref discordam em vários campos, então a importação tem uma ordem
de confiança explícita, definida depois de inspecionar o acervo real:

- **Volume e número** — o sufixo do DOI (`arev8n11-001`) vem primeiro. O campo
  `volume`/`issue` do Crossref está trocado em boa parte do acervo (há registros
  com DOI `arev5n6` e volume 4, número 5).
- **Ano** — o rótulo do OJS (`ARACÊ; Vol. 2 No. 2 (2015); 8-20`). Note que o
  rótulo traz as páginas no mesmo campo, por isso a varredura é no texto inteiro.
- **Data de publicação** — a data do OJS primeiro. Datas adiantadas (há registros
  com ano 2034 na origem) caem para o ano da edição.
- **Elocation** — o Crossref guarda o `e15187` no campo `page`.
- **Autores** — o Crossref tem a grafia estruturada; o OAI é a reserva. Nomes em
  caixa alta são normalizados e as partículas (`de`, `da`, `dos`) ficam minúsculas.
- **DOI** — pertence a um único registro: se já foi atribuído, o seguinte fica sem DOI.

Os arquivos em `data/` são o material bruto coletado. `npm run import` pode ser
repetido à vontade sobre eles, sem recoletar.

---

## Estado do acervo importado

| | |
|---|---|
| Artigos | 6.962 |
| Com DOI | 6.881 |
| Com resumo | 6.959 |
| Com PDF | 6.955 |
| Edições | 38 (v.1 2014 a v.8 n.11 2026) |
| Autores | 25.094 |
| Palavras-chave | 33.608 |
| Referências | 52.446 |
| Autores com ORCID | 9.774 (eram 0 antes do enriquecimento) |
| Vínculos com afiliação | 8.682 (eram 2) |

Os PDFs ainda são servidos pelo servidor do OJS atual: o portal guarda a URL,
não o arquivo. Migrar os arquivos é uma decisão separada.

---

## Pendências conhecidas

1. **Equipe editorial e taxas** — as páginas `/equipe-editorial` e `/taxas` estão
   marcadas para preenchimento. Nenhum nome foi inventado. As duas são critério
   de avaliação do DOAJ, e a ausência delas é motivo comum de recusa.
2. **Validar o XML do Crossref** — o depósito é gerado no schema 5.3.1 e é XML
   bem formado, mas deve passar pelo validador oficial do Crossref antes do
   primeiro envio real.
3. **Envio de e-mail** — as mensagens são geradas e enfileiradas, mas não há
   SMTP ligado: a editoria despacha manualmente pela fila. Ligar um servidor de
   e-mail é uma alteração em um único ponto (`enfileirarNotificacao`).
4. **Armazenamento dos manuscritos** — vão para `storage/` no disco local. Em
   produção serverless isso precisa virar um bucket (Supabase Storage ou S3);
   o ponto de troca é `salvarArquivo` e `lerArquivo`, em `src/lib/editorial.ts`.
5. **Publicação da submissão aceita** — o campo `articleId` liga a submissão ao
   artigo do acervo, mas a editoração (atribuição de DOI e entrada na edição)
   ainda é feita fora do sistema.
6. **Hospedagem** — ver a seção Publicação. Falta criar o site na Netlify,
   que a conexão desta sessão não tem permissão para fazer.

---

## Publicação

O código está portado para produção e o build foi verificado sem banco
acessível (é a condição do primeiro deploy, antes de o banco existir).

**O que mudou para publicar**

- **Postgres no lugar do SQLite.** `prisma/schema.prisma` usa `postgresql`, com
  `binaryTargets` incluindo `rhel-openssl-3.0.x`, que é o alvo das funções
  serverless da Netlify. `src/lib/db.ts` resolve a conexão por
  `NETLIFY_DB_URL`, caindo para `DATABASE_URL` fora da Netlify.
- **Manuscritos no Netlify Blobs.** As funções rodam em disco efêmero: o que
  for gravado em arquivo some no fim da requisição. `src/lib/armazenamento.ts`
  grava no Blobs quando está na Netlify e em `storage/` no desenvolvimento,
  e o resto do sistema não precisa saber onde está.
- **Páginas públicas sob demanda.** Antes elas eram geradas no build, o que
  exigiria um banco já populado para o build passar. Agora renderizam por
  requisição, com cache na borda da Netlify (`Netlify-CDN-Cache-Control`),
  declarado em `netlify.toml`. O painel e o download de arquivo são marcados
  como `no-store` e `noindex`.
- **`netlify.toml`** com o comando de build, os binários do Prisma incluídos
  no empacotamento das funções e os cabeçalhos de segurança.

### O que trava hoje

A conexão com a Netlify disponível nesta sessão **lê** a conta mas não tem
permissão de escrita. Tanto a criação de projeto quanto o deploy respondem:

```text
Failed to create project: 403
Error: Failed to deploy site: 403 Forbidden
```

Para destravar, basta que o site exista: crie um projeto vazio no painel da
Netlify (sem conectar repositório) e informe o nome. Com o site criado, o
deploy sai daqui.

### Publicando por conta própria

Dentro desta pasta:

```bash
npx netlify-cli login
npx netlify-cli init
npx netlify-cli deploy --build --prod
```

### Depois do primeiro deploy

O banco é provisionado automaticamente, porque `@netlify/database` está
instalado. Com a string de conexão em mãos, um comando faz todo o resto:

```bash
npm run local:postgres
```

```bash
DATABASE_URL="<string do Netlify DB>" npm run producao
```

Ele cria as tabelas, importa os 6.962 artigos (reaproveitando a coleta já
baixada em `data/`), publica as páginas institucionais, enriquece a autoria
pelo OpenAlex e grava o estado real das bases indexadoras.

Por fim, a conta da editoria:

```bash
DATABASE_URL="<string do Netlify DB>" node scripts/criar-editor.mjs "Editoria ARACÊ" contato@sevenevents.com.br
```

Sem senha no comando, a conta fica aguardando: basta usar "Criar conta" no
site com esse mesmo e-mail para definir a senha. A senha nunca passa por aqui.

### Desenvolvimento local depois da portabilidade

O schema vive em Postgres, mas o banco SQLite com todo o acervo continua em
`prisma/dev.db`. Para voltar a rodar local sem Postgres:

```bash
npm run local:sqlite
```

E para voltar ao modo de produção, `npm run local:postgres`. A troca reescreve
o bloco `datasource` e regera o cliente do Prisma.

### Ainda não verificado

O schema e o importador foram portados para Postgres, mas **não foram rodados
contra um Postgres de verdade** — não há Postgres nem Docker nesta máquina, e
o motor de teste do `@netlify/database-dev` só aceita conexões por IPv6 em um
formato que o Prisma recusa. A verificação acontece no `prisma db push` do
primeiro deploy. O schema não usa nada específico de SQLite, então o risco é
baixo, mas é risco não testado.

---

## Stack

Next.js 15 (App Router, componentes de servidor) · TypeScript · Prisma ·
Postgres (Netlify DB, sobre Neon) · Netlify Blobs para os manuscritos ·
CSS escrito à mão, sem framework de UI · Fraunces, Archivo e DM Mono.

## Sobre o visual

O nome **aracê** é "amanhecer" em tupi, e é daí que sai a linguagem visual:
a régua de horizonte com o ponto de sol como marca, a paleta de tinta sobre papel
com o acento em terracota, a textura de grão e a tipografia de periódico impresso.
A home é um **índice editorial denso**, com numeração em monoespaçada e filetes,
não uma grade de cartões. A ficha técnica do artigo vive na **marginália**, como
num periódico de papel. O mapa de temas usa espiral de Vogel (ângulo de ouro):
posicionamento estável, sem biblioteca de física, e o mesmo desenho a cada carga.

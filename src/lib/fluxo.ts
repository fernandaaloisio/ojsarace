/** Vocabulário do fluxo editorial: estados, transições e rótulos. */

export type Status =
  | "submetido" | "em_triagem" | "em_avaliacao" | "aguardando_decisao"
  | "ajustes_solicitados" | "em_reavaliacao" | "aceito" | "em_editoracao"
  | "publicado" | "recusado" | "retirado" | "arquivado";

export const STATUS: Record<Status, { rotulo: string; cor: string; descricao: string }> = {
  submetido:           { rotulo: "Submetido",           cor: "var(--ink-3)",      descricao: "Aguardando triagem editorial." },
  em_triagem:          { rotulo: "Em triagem",          cor: "var(--dawn)",       descricao: "Conferência de escopo, formato e originalidade." },
  em_avaliacao:        { rotulo: "Em avaliação",        cor: "var(--night)",      descricao: "Com os pareceristas." },
  aguardando_decisao:  { rotulo: "Aguardando decisão",  cor: "var(--dawn)",       descricao: "Pareceres concluídos, aguardando o editor." },
  ajustes_solicitados: { rotulo: "Ajustes solicitados", cor: "var(--ember)",      descricao: "Com os autores, para reformulação." },
  em_reavaliacao:      { rotulo: "Em reavaliação",      cor: "var(--night)",      descricao: "Nova rodada de avaliação." },
  aceito:              { rotulo: "Aceito",              cor: "var(--moss)",       descricao: "Aprovado para publicação." },
  em_editoracao:       { rotulo: "Em editoração",       cor: "var(--moss)",       descricao: "Diagramação e atribuição de DOI." },
  publicado:           { rotulo: "Publicado",           cor: "var(--moss)",       descricao: "Disponível no acervo." },
  recusado:            { rotulo: "Recusado",            cor: "var(--ember-deep)", descricao: "Não aprovado para publicação." },
  retirado:            { rotulo: "Retirado",            cor: "var(--ink-4)",      descricao: "Retirado pelos autores." },
  arquivado:           { rotulo: "Arquivado",           cor: "var(--ink-4)",      descricao: "Encerrado sem publicação." },
};

/** Estados que ainda exigem ação de alguém. */
export const ABERTOS: Status[] = [
  "submetido", "em_triagem", "em_avaliacao", "aguardando_decisao",
  "ajustes_solicitados", "em_reavaliacao", "aceito", "em_editoracao",
];

export const RECOMENDACOES = {
  "aceitar": "Aceitar sem alterações",
  "ajustes-menores": "Aceitar com ajustes menores",
  "ajustes-maiores": "Reformular e reenviar",
  "recusar": "Recusar",
} as const;

export const DECISOES = {
  "aceitar": "Aceitar para publicação",
  "ajustes-menores": "Solicitar ajustes menores",
  "ajustes-maiores": "Solicitar reformulação",
  "nova-submissao": "Recusar, com convite a nova submissão",
  "recusar": "Recusar",
} as const;

/** Para onde a submissão vai após cada decisão editorial. */
export const DESTINO_DECISAO: Record<keyof typeof DECISOES, Status> = {
  "aceitar": "aceito",
  "ajustes-menores": "ajustes_solicitados",
  "ajustes-maiores": "ajustes_solicitados",
  "nova-submissao": "recusado",
  "recusar": "recusado",
};

export const TIPOS_ARQUIVO = {
  manuscrito: "Manuscrito",
  anonimizado: "Versão anonimizada",
  carta: "Carta de apresentação",
  suplementar: "Material suplementar",
  "versao-final": "Versão final",
} as const;

export const CRITERIOS = [
  { chave: "relevancia", rotulo: "Relevância e originalidade" },
  { chave: "problema", rotulo: "Clareza do problema de pesquisa" },
  { chave: "metodo", rotulo: "Rigor metodológico" },
  { chave: "resultados", rotulo: "Consistência de resultados e conclusões" },
  { chave: "referencias", rotulo: "Atualidade e suficiência das referências" },
  { chave: "redacao", rotulo: "Clareza da redação" },
] as const;

export const SECOES = { ART: "Artigos", EDT: "Editorial", REV: "Revisões", REL: "Relatos de caso" } as const;

export const TIPOS_TRABALHO = [
  "Artigo científico", "Revisão de literatura", "Revisão integrativa",
  "Estudo de caso", "Relato de experiência", "Pesquisa-ação", "Resenha",
] as const;

export const PAPEIS = {
  autor: "Autor",
  parecerista: "Parecerista",
  editor: "Editor",
  admin: "Administrador",
} as const;

export type Papel = keyof typeof PAPEIS;

/** Dias restantes até o prazo; negativo quando atrasado. */
export function diasAte(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function prazoTexto(d: Date | null | undefined): { texto: string; atrasado: boolean } {
  const dias = diasAte(d);
  if (dias === null) return { texto: "sem prazo", atrasado: false };
  if (dias < 0) return { texto: `${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"} em atraso`, atrasado: true };
  if (dias === 0) return { texto: "vence hoje", atrasado: false };
  return { texto: `em ${dias} ${dias === 1 ? "dia" : "dias"}`, atrasado: false };
}

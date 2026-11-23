/**
 * Citações no Google Acadêmico.
 *
 * O Scholar não publica API e proíbe a raspagem automática das páginas de
 * resultado, então o número de "Citado por" não pode ser colhido por programa:
 * alguém da editoria abre a busca, confere que o resultado é mesmo o artigo e
 * registra o que leu. É por isso que os campos ficam no painel, e não num
 * script de coleta.
 *
 * Daí a diferença entre três estados, que a página pública precisa distinguir:
 *   sem conferência  -> scholarCount nulo         -> "Contagem indisponível"
 *   conferido em zero -> scholarCount 0           -> exibe 0
 *   conferido         -> scholarCount maior que 0 -> exibe o número
 */

/** Estado da contagem, do ponto de vista de quem lê a página. */
export type EstadoScholar = "conferido" | "zero" | "sem_conferencia";

export function estadoScholar(contagem: number | null | undefined): EstadoScholar {
  if (contagem == null) return "sem_conferencia";
  return contagem > 0 ? "conferido" : "zero";
}

/**
 * Busca no Scholar pelo título exato, entre aspas, que é o que separa o artigo
 * de trabalhos com tema parecido. O DOI entra como segundo termo porque o
 * Scholar o indexa no texto do registro: quando o título tem variação de
 * pontuação entre as bases, é o DOI que confirma que o resultado é o certo.
 */
export function buscaScholar(titulo: string, doi?: string | null): string {
  const limpo = titulo.replace(/\s+/g, " ").replace(/["""]/g, "").trim();
  const termos = doi ? `"${limpo}" ${doi}` : `"${limpo}"`;
  return `https://scholar.google.com/scholar?hl=pt-BR&q=${encodeURIComponent(termos)}`;
}

/** Aceita o endereço da lista "Citado por" apenas se for do próprio Scholar. */
export function urlScholarValida(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === "https:" && /(^|\.)scholar\.google\.[a-z.]+$/.test(u.hostname);
  } catch {
    return false;
  }
}

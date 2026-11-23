"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirEditor } from "@/lib/auth";
import { urlScholarValida } from "@/lib/scholar";

export type EstadoForm = { erro?: string; ok?: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/**
 * Registra a conferência da contagem de citações no Google Acadêmico.
 *
 * Três resultados possíveis, que a página pública distingue:
 *   campo em branco  -> volta para "sem conferência"
 *   0                -> a editoria confirmou que o registro não tem citações
 *   número           -> o que estava em "Citado por"
 */
export async function salvarCitacoes(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirEditor();

  const slug = texto(form, "slug");
  const artigo = await db.article.findUnique({ where: { slug }, select: { id: true } });
  if (!artigo) return { erro: "Artigo não encontrado." };

  // limpar devolve o artigo ao estado "sem conferência"
  if (form.get("limpar") === "on") {
    await db.article.update({
      where: { id: artigo.id },
      data: { scholarCount: null, scholarCheckedAt: null, scholarUrl: null,
              scholarById: null, scholarDemo: false },
    });
    revalidatePath(`/artigo/${slug}`);
    revalidatePath(`/painel/citacoes/${slug}`);
    return { ok: "Conferência apagada. O artigo volta a mostrar “Contagem indisponível”." };
  }

  const bruto = texto(form, "contagem");
  if (bruto === "") {
    return { erro: "Informe o número que aparece em “Citado por”, ou 0 se não houver citações. Para desfazer a conferência, marque a caixa de apagar." };
  }
  if (!/^\d{1,7}$/.test(bruto)) {
    return { erro: "A contagem precisa ser um número inteiro, sem pontos nem sinais." };
  }
  const contagem = Number(bruto);

  const url = texto(form, "url");
  if (url && !urlScholarValida(url)) {
    return { erro: "O endereço da lista precisa começar com https:// e apontar para o Google Acadêmico." };
  }

  const dataBruta = texto(form, "data");
  let conferidoEm = new Date();
  if (dataBruta) {
    // <input type="date"> entrega AAAA-MM-DD; fixa ao meio-dia UTC para o dia
    // não escorregar para o anterior no fuso de São Paulo.
    const d = new Date(`${dataBruta}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return { erro: "Data da conferência inválida." };
    if (d.getTime() > Date.now() + 86_400_000) return { erro: "A data da conferência não pode estar no futuro." };
    conferidoEm = d;
  }

  await db.article.update({
    where: { id: artigo.id },
    data: {
      scholarCount: contagem,
      scholarCheckedAt: conferidoEm,
      scholarUrl: url || null,
      scholarById: u.id,
      scholarDemo: form.get("demonstracao") === "on",
    },
  });

  revalidatePath(`/artigo/${slug}`);
  revalidatePath(`/painel/citacoes/${slug}`);
  revalidatePath("/painel/citacoes");
  return {
    ok: contagem === 0
      ? "Registrado: a conferência confirmou zero citações. A página do artigo passa a mostrar 0."
      : `Registrado: ${contagem} ${contagem === 1 ? "citação" : "citações"} no Google Acadêmico.`,
  };
}

"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirEditor } from "@/lib/auth";
import { guardar, apagar } from "@/lib/armazenamento";
import { JOURNAL_SLUG } from "@/lib/queries";

export type EstadoForm = { erro?: string; ok?: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

const IMAGENS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

const MAX = 8 * 1024 * 1024; // 8 MB

/** Guarda a imagem e devolve o endereço público dela. */
async function subirImagem(file: File, journalId: string, kind: string, userId: string) {
  const ext = IMAGENS[file.type] ?? path.extname(file.name).toLowerCase();
  if (!Object.values(IMAGENS).includes(ext)) {
    throw new Error(`Formato de imagem não aceito (${file.type || ext || "desconhecido"}). Use JPG, PNG, WebP, AVIF ou SVG.`);
  }
  if (file.size > MAX) {
    throw new Error(`A imagem tem ${(file.size / 1048576).toFixed(1)} MB; o limite é 8 MB.`);
  }

  const storedName = `site-${randomUUID()}${ext}`;
  await guardar(storedName, Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg");

  const img = await db.siteImage.create({
    data: {
      journalId, kind, storedName,
      originalName: file.name.slice(0, 200),
      mime: file.type || "image/jpeg",
      size: file.size,
      uploadedById: userId,
    },
  });
  return `/api/imagem/${img.id}`;
}

/** Remove do armazenamento a imagem que estava em uso, depois de trocada. */
async function descartarAnterior(url: string | null) {
  const id = url?.match(/^\/api\/imagem\/([\w-]+)$/)?.[1];
  if (!id) return;
  const antiga = await db.siteImage.findUnique({ where: { id } });
  if (!antiga) return;
  await apagar(antiga.storedName).catch(() => {});
  await db.siteImage.delete({ where: { id } }).catch(() => {});
}

export async function salvarIdentidade(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirEditor();

  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG } });
  if (!j) return { erro: "Periódico não encontrado." };

  const dados: Record<string, string | null> = {
    bannerAlt: texto(form, "bannerAlt") || null,
    bannerFoco: texto(form, "bannerFoco") || "center center",
    sobreTexto: texto(form, "sobreTexto") || null,
    templatesUrl: texto(form, "templatesUrl") || null,
    description: texto(form, "descricao") || null,
    mission: texto(form, "missao") || null,
    periodicity: texto(form, "periodicidade") || null,
  };

  try {
    for (const [campo, kind] of [["banner", "banner"], ["logo", "logo"], ["sobre", "sobre"]] as const) {
      const file = form.get(campo) as File | null;
      if (!file || file.size === 0) continue;

      const url = await subirImagem(file, j.id, kind, u.id);
      const alvo = kind === "banner" ? "bannerUrl" : kind === "logo" ? "logoUrl" : "sobreImagem";
      // troca primeiro, descarta depois: se o descarte falhar, a nova já está no ar
      const anterior = (j as unknown as Record<string, string | null>)[alvo];
      dados[alvo] = url;
      await descartarAnterior(anterior);
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao enviar a imagem." };
  }

  // marcar a caixa remove a imagem e volta para a proposta visual padrão
  for (const [campo, alvo] of [["removerBanner", "bannerUrl"], ["removerLogo", "logoUrl"], ["removerSobre", "sobreImagem"]] as const) {
    if (form.get(campo) === "on") {
      await descartarAnterior((j as unknown as Record<string, string | null>)[alvo]);
      dados[alvo] = null;
    }
  }

  await db.journal.update({ where: { id: j.id }, data: dados });

  revalidatePath("/", "layout");
  revalidatePath("/painel/identidade");
  return { ok: "Identidade visual atualizada. Recarregue a página inicial para ver." };
}

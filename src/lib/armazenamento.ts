import fs from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento dos manuscritos.
 *
 * Na Netlify as funções rodam em sistema de arquivos efêmero: o que for
 * gravado em disco some no fim da invocação. Por isso em produção os arquivos
 * vão para o Netlify Blobs, e o disco local fica só para desenvolvimento.
 *
 * O resto do sistema não sabe de nada disso: grava e lê por nome, e a escolha
 * do destino acontece aqui.
 */

const LOJA = "manuscritos";

/** Pasta usada apenas em desenvolvimento. */
export const PASTA_LOCAL = path.join(process.cwd(), "storage");

/** A Netlify define NETLIFY=true nas funções e no build. */
function naNetlify(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

async function loja() {
  const { getStore } = await import("@netlify/blobs");
  // store de site, compartilhada entre deploys: um manuscrito enviado hoje
  // precisa continuar acessível depois da próxima publicação. Nenhuma chamada
  // passa `region`, para que todas usem sempre a mesma (us-east-2).
  return getStore({ name: LOJA, consistency: "strong" });
}

export async function guardar(nome: string, conteudo: Buffer, mime: string): Promise<void> {
  if (naNetlify()) {
    const store = await loja();
    await store.set(nome, new Blob([new Uint8Array(conteudo)], { type: mime }), {
      metadata: { mime, guardadoEm: Date.now() },
    });
    return;
  }
  await fs.mkdir(PASTA_LOCAL, { recursive: true });
  await fs.writeFile(path.join(PASTA_LOCAL, path.basename(nome)), conteudo);
}

export async function buscar(nome: string): Promise<Buffer | null> {
  // o nome vem do banco e é sempre um UUID com extensão; o basename é uma
  // trava extra contra qualquer tentativa de subir de diretório
  const seguro = path.basename(nome);

  if (naNetlify()) {
    try {
      const store = await loja();
      const dados = await store.get(seguro, { type: "arrayBuffer" });
      return dados ? Buffer.from(dados) : null;
    } catch {
      return null;
    }
  }

  try {
    return await fs.readFile(path.join(PASTA_LOCAL, seguro));
  } catch {
    return null;
  }
}

export async function apagar(nome: string): Promise<void> {
  const seguro = path.basename(nome);
  if (naNetlify()) {
    const store = await loja();
    await store.delete(seguro);
    return;
  }
  await fs.unlink(path.join(PASTA_LOCAL, seguro)).catch(() => {});
}

export function ondeEstamos(): "netlify-blobs" | "disco-local" {
  return naNetlify() ? "netlify-blobs" : "disco-local";
}

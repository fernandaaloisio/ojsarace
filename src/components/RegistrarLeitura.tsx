"use client";

import { useEffect } from "react";

/**
 * Registra uma visualização do artigo.
 *
 * Vai pelo navegador, e não na renderização do servidor, por dois motivos:
 * não atrasa o carregamento da página, e não conta rastreador que só lê o
 * HTML. Uma leitura por artigo por sessão do navegador.
 */
export default function RegistrarLeitura({ id }: { id: string }) {
  useEffect(() => {
    const chave = `aurora-lido-${id}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {
      // navegador sem armazenamento: conta mesmo assim, é melhor que não contar
    }

    const corpo = JSON.stringify({ id, tipo: "view" });
    // sendBeacon sobrevive à navegação para fora da página
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrica", new Blob([corpo], { type: "application/json" }));
    } else {
      fetch("/api/metrica", { method: "POST", body: corpo, keepalive: true,
                              headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  }, [id]);

  return null;
}

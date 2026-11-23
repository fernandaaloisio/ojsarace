import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const a = await db.article.findFirst({ where: { pdfUrl: { not: null } }, select: { id: true, slug: true, viewCount: true, downloadCount: true } });
console.log(`antes:  ${a.viewCount} leituras, ${a.downloadCount} downloads`);

// leitura, como o navegador manda
for (let i = 0; i < 3; i++) {
  await fetch("http://localhost:4321/api/metrica", { method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Macintosh)" },
    body: JSON.stringify({ id: a.id, tipo: "view" }) });
}
// um robo declarado: nao deve contar
await fetch("http://localhost:4321/api/metrica", { method: "POST",
  headers: { "Content-Type": "application/json", "User-Agent": "Googlebot/2.1" },
  body: JSON.stringify({ id: a.id, tipo: "view" }) });

// download, seguindo a rota que conta e encaminha
const r = await fetch(`http://localhost:4321/api/baixar/${a.slug}`, { redirect: "manual",
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" } });

const d = await db.article.findUnique({ where: { id: a.id }, select: { viewCount: true, downloadCount: true } });
console.log(`depois: ${d.viewCount} leituras, ${d.downloadCount} downloads`);
console.log(`esperado: 3 leituras (o robo nao conta) e 1 download`);
console.log(`redirecionamento do PDF: ${r.status} -> ${r.headers.get("location")?.slice(0, 62)}`);
console.log(`registros brutos: ${await db.accessLog.count()}`);

// artigo sem DOI mostra a mensagem certa
const sem = await db.article.findFirst({ where: { doi: null }, select: { slug: true } });
if (sem) {
  const html = await fetch(`http://localhost:4321/artigo/${sem.slug}`).then(x => x.text());
  console.log(`artigo sem DOI: ${html.includes("Dados de citações indisponíveis") ? "mostra 'Dados de citações indisponíveis'" : "FALHOU"}`);
}
await db.$disconnect();

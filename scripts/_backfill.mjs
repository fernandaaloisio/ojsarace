import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = await db.article.updateMany({
  where: { doi: { not: null }, citationSource: null },
  data: { citationSource: "Crossref", citationAt: new Date() },
});
console.log(`${r.count.toLocaleString("pt-BR")} artigos agora declaram a fonte das citações`);
console.log("sem DOI (mostrarão 'dados indisponíveis'):", (await db.article.count({ where: { doi: null } })).toLocaleString("pt-BR"));
await db.$disconnect();

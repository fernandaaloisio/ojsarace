import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const n = (x) => x.toLocaleString("pt-BR");
console.log("  artigos:", n(await db.article.count()), "| com DOI:", n(await db.article.count({where:{doi:{not:null}}})), "| com PDF:", n(await db.article.count({where:{pdfUrl:{not:null}}})));
console.log("  edicoes:", n(await db.issue.count()), "| autores:", n(await db.author.count()), "| com ORCID:", n(await db.author.count({where:{orcid:{not:null}}})));
console.log("  palavras-chave:", n(await db.keyword.count()), "| referencias:", n(await db.reference.count()));
console.log("  citacoes totais:", n((await db.article.aggregate({_sum:{citationCount:true}}))._sum.citationCount ?? 0));
for (const i of await db.indexerLink.findMany({ orderBy: { code: "asc" } })) console.log(`  ${i.code.padEnd(13)} ${i.status.padEnd(9)} ${i.recordCount ? n(i.recordCount)+" registros" : ""}`);
await db.$disconnect();

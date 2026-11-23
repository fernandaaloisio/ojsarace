import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
console.log("autores com ORCID:", await db.author.count({ where: { orcid: { not: null } } }), "de", await db.author.count());
console.log("artigos com afiliacao de autor:", await db.articleAuthor.count({ where: { affiliation: { not: null } } }));
await db.$disconnect();

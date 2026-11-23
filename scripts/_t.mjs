import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
for (const i of await db.issue.findMany({ orderBy: { rank: "desc" }, take: 5, include: { _count: { select: { articles: true } } } }))
  console.log(`  rank ${i.rank}  ${i.label.padEnd(18)} ${i._count.articles} artigos`);
await db.$disconnect();

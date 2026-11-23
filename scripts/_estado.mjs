import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s = await db.submission.findFirstOrThrow({
  include: { authors: true, files: true, assignments: true, decisions: true, events: true, notifications: true },
});
console.log(`${s.code} · ${s.status} · rodada ${s.round}`);
console.log(`  autores: ${s.authors.length} | arquivos: ${s.files.length} | eventos: ${s.events.length}`);
console.log(`  pareceres: ${s.assignments.map(a => `${a.reviewerName.split(" ")[0]}=${a.status}`).join(", ")}`);
console.log(`  decisoes: ${s.decisions.map(d => d.decision).join(", ")}`);
console.log(`  mensagens: ${s.notifications.length} (${s.notifications.filter(n => n.status === "pendente").length} pendentes)`);
console.log(`  prazo da rodada: ${s.dueAt?.toISOString().slice(0,10) ?? "—"}`);
console.log("\n  histórico:");
for (const e of s.events.sort((a,b)=>a.createdAt-b.createdAt)) console.log(`    ${e.type.padEnd(22)} ${e.publico ? "público " : "interno "} ${e.message.split("\n")[0].slice(0,62)}`);
console.log(`\nusuarios: ${await db.user.count()} | sessoes: ${await db.session.count()} | papeis: ${(await db.userRole.groupBy({by:["role"],_count:{_all:true}})).map(r=>`${r.role}=${r._count._all}`).join(" ")}`);
console.log(`senhas guardadas em claro: ${await db.user.count({ where: { passwordHash: { not: null, startsWith: "scrypt$" } } })} com hash scrypt, ${await db.user.count({ where: { passwordHash: null } })} sem senha (convite)`);
await db.$disconnect();

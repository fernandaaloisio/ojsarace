import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const fs = await db.submissionFile.findMany({ select: { id: true, kind: true } });
const tok = "GLo_FynkgmEb5WYaiO6Lav467B5b-YL8I_0CZJoTH6E";
for (const f of fs) {
  const semToken = await fetch(`http://localhost:4321/api/arquivo/${f.id}`).then(r => r.status);
  const comToken = await fetch(`http://localhost:4321/api/arquivo/${f.id}?t=${tok}`).then(r => r.status);
  const tokenFalso = await fetch(`http://localhost:4321/api/arquivo/${f.id}?t=abcabcabcabcabcabcabcabcabc`).then(r => r.status);
  console.log(`  ${f.kind.padEnd(13)} sem sessao: ${semToken}  token do parecerista: ${comToken}  token falso: ${tokenFalso}`);
}
console.log("  (403 = bloqueado, 200 = liberado)");
await db.$disconnect();

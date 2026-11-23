import { NetlifyDB } from "@netlify/database-dev";
const db = new NetlifyDB();
const u = await db.start();
console.log("start() devolveu:", u);
await new Promise(r => setTimeout(r, 4000));
const { execSync } = await import("node:child_process");
try { console.log(execSync(`lsof -nP -iTCP -sTCP:LISTEN | grep -i ${new URL(u).port} || echo "nada escutando nessa porta"`, {encoding:"utf8"})); } catch(e) { console.log("lsof:", e.message); }
await db.stop();

import { redirect } from "next/navigation";
import { edicaoAtual } from "@/lib/queries";

export default async function EdicaoAtual() {
  const atual = await edicaoAtual();
  redirect(atual ? `/edicao/${atual.issue.slug}` : "/arquivo");
}

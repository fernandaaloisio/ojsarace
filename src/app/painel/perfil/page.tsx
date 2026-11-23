import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { db } from "@/lib/db";
import Formulario from "@/components/Formulario";
import { atualizarPerfil } from "@/app/acoes/conta";
import { PAPEIS, type Papel } from "@/lib/fluxo";

export default async function Perfil() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/painel/perfil");
  const dados = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  const expertise: string[] = dados.expertise ? JSON.parse(dados.expertise) : [];

  return (
    <div style={{ maxWidth: "38rem" }}>
      <header style={{ marginBottom: "1.75rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Conta</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Meu perfil</h1>
        <p className="mono" style={{ color: "var(--ink-4)", marginTop: "0.6rem", fontSize: "var(--step--2)" }}>
          {dados.email} · {u.papeis.map((p) => PAPEIS[p as Papel] ?? p).join(" · ")}
        </p>
      </header>

      <Formulario acao={atualizarPerfil} rotulo="Salvar alterações">
        <fieldset className="grupo">
          <legend>Identificação</legend>
          <div className="campo">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" name="nome" type="text" required defaultValue={dados.name} />
          </div>
          <div className="campo">
            <label htmlFor="orcid">ORCID</label>
            <input id="orcid" name="orcid" type="text" defaultValue={dados.orcid ?? ""}
                   placeholder="0000-0002-1825-0097" />
          </div>
          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="afiliacao">Instituição</label>
              <input id="afiliacao" name="afiliacao" type="text" defaultValue={dados.affiliation ?? ""} />
            </div>
            <div className="campo">
              <label htmlFor="pais">País</label>
              <input id="pais" name="pais" type="text" defaultValue={dados.country ?? ""} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="lattes">Currículo Lattes</label>
            <input id="lattes" name="lattes" type="url" defaultValue={dados.lattes ?? ""}
                   placeholder="http://lattes.cnpq.br/…" />
          </div>
          <div className="campo">
            <label htmlFor="bio">Minibiografia</label>
            <textarea id="bio" name="bio" rows={3} defaultValue={dados.bio ?? ""} />
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Avaliação por pares</legend>
          <label className="caixa-marcar">
            <input type="checkbox" name="parecerista" defaultChecked={u.papeis.includes("parecerista")} />
            <span>
              Aceito receber convites para emitir pareceres na ARACÊ.
              A editoria considera as áreas informadas abaixo ao distribuir manuscritos.
            </span>
          </label>
          <div className="campo">
            <label htmlFor="expertise">Áreas de atuação</label>
            <input id="expertise" name="expertise" type="text" defaultValue={expertise.join("; ")}
                   placeholder="Saúde coletiva; Epidemiologia; Políticas públicas" />
            <span className="campo__ajuda">Separe por ponto e vírgula.</span>
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Senha</legend>
          <p className="campo__ajuda" style={{ marginBottom: "1rem" }}>
            Preencha apenas se quiser trocar.
          </p>
          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="novaSenha">Nova senha</label>
              <input id="novaSenha" name="novaSenha" type="password" minLength={8} autoComplete="new-password" />
            </div>
            <div className="campo">
              <label htmlFor="novaSenha2">Repita</label>
              <input id="novaSenha2" name="novaSenha2" type="password" minLength={8} autoComplete="new-password" />
            </div>
          </div>
        </fieldset>
      </Formulario>
    </div>
  );
}

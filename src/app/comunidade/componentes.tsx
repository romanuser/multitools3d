"use client";

import { useActionState, useState, useTransition } from "react";
import { criarTopico, responder, alternarUtil, marcarSolucao, denunciar, criarPerfil, alternarConfirmacao, moderar } from "@/lib/comunidade/actions";
import { CATEGORIAS, MATERIAIS } from "@/lib/comunidade/config";

const btn = "bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50";
const lbl = "block text-sm text-ink-muted mb-1";

function CampoFotos() {
  const [n, setN] = useState(0);
  return (
    <label className="block">
      <span className={lbl}>Fotos (opcional, até 4)</span>
      <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" multiple
        onChange={(e) => { if ((e.target.files?.length ?? 0) > 4) { alert("No máximo 4 fotos."); e.target.value = ""; setN(0); } else setN(e.target.files?.length ?? 0); }}
        className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-amber-soft file:px-4 file:py-2 file:text-amber" />
      <span className="block text-xs text-ink-muted mt-1">{n ? `${n} foto${n > 1 ? "s" : ""} escolhida${n > 1 ? "s" : ""}` : "Uma foto da peça ajuda muito a resolver."}</span>
    </label>
  );
}

export function NovaPerguntaForm({ categoria }: { categoria?: string }) {
  const [estado, acao, pendente] = useActionState(criarTopico, undefined);
  return (
    <form action={acao} className="space-y-4 border border-line bg-surface rounded-2xl p-6">
      <label className="block">
        <span className={lbl}>Título da pergunta</span>
        <input name="titulo" required minLength={8} maxLength={140} className="input" placeholder='Ex.: "PETG fazendo fiapos na Bambu A1"' />
      </label>
      <label className="block">
        <span className={lbl}>Categoria</span>
        <select name="categoria" defaultValue={categoria || "duvidas"} className="input">
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
        </select>
      </label>
      <label className="block">
        <span className={lbl}>Descreva a dúvida</span>
        <textarea name="corpo" required minLength={10} maxLength={8000} rows={7} className="input" placeholder="O que acontece, o que você já tentou e as configurações que está usando." />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className={lbl}>Impressora (opcional)</span><input name="impressora" maxLength={80} className="input" placeholder="Ex.: Bambu Lab A1" /></label>
        <label className="block"><span className={lbl}>Filamento (opcional)</span><input name="filamento" maxLength={80} className="input" placeholder="Ex.: PETG Masterprint" /></label>
      </div>
      <CampoFotos />
      {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
      <button type="submit" disabled={pendente} className={btn}>{pendente ? "Publicando…" : "Publicar pergunta"}</button>
    </form>
  );
}

export function RespostaForm({ topicoId, volta }: { topicoId: string; volta: string }) {
  const [estado, acao, pendente] = useActionState(responder, undefined);
  const [chave, setChave] = useState(0);
  if (estado?.ok && chave === 0) queueMicrotask(() => setChave(1));
  return (
    <form key={chave} action={acao} className="space-y-3 border border-line bg-surface rounded-2xl p-5">
      <input type="hidden" name="topicoId" value={topicoId} />
      <input type="hidden" name="volta" value={volta} />
      <label className="block">
        <span className={lbl}>Sua resposta</span>
        <textarea name="corpo" required minLength={2} maxLength={8000} rows={5} className="input" placeholder="Explique como resolver. Configurações, fotos e o que funcionou pra você ajudam muito." />
      </label>
      <CampoFotos />
      {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-amber">{estado.ok}</p>}
      <button type="submit" disabled={pendente} className={btn}>{pendente ? "Publicando…" : "Responder"}</button>
    </form>
  );
}

export function BotaoUtil({ respostaId, total, marcado, volta, logado }: { respostaId: string; total: number; marcado: boolean; volta: string; logado: boolean }) {
  const [p, start] = useTransition();
  if (!logado) return <a href={`/login?volta=${encodeURIComponent(volta)}`} className="text-xs text-ink-muted hover:text-ink">👍 Funcionou pra mim · {total}</a>;
  return (
    <button type="button" disabled={p} onClick={() => start(() => alternarUtil(respostaId, volta))}
      className={`text-xs rounded-full border px-3 py-1 ${marcado ? "border-amber bg-amber-soft text-amber" : "border-line text-ink-muted hover:text-ink"}`}>
      👍 Funcionou pra mim · {total}
    </button>
  );
}

export function BotaoSolucao({ topicoId, respostaId, eSolucao, volta }: { topicoId: string; respostaId: string; eSolucao: boolean; volta: string }) {
  const [p, start] = useTransition();
  return (
    <button type="button" disabled={p} onClick={() => start(() => marcarSolucao(topicoId, eSolucao ? null : respostaId, volta))}
      className="text-xs text-amber hover:underline underline-offset-2 disabled:opacity-50">
      {eSolucao ? "Desmarcar solução" : "✓ Marcar como solução"}
    </button>
  );
}

export function BotaoDenunciar({ tipo, id, volta, logado }: { tipo: "topico" | "resposta" | "perfil"; id: string; volta: string; logado: boolean }) {
  const [feito, setFeito] = useState(false);
  const [p, start] = useTransition();
  if (!logado) return null;
  if (feito) return <span className="text-xs text-ink-muted">Denúncia enviada. Obrigado!</span>;
  return (
    <button type="button" disabled={p} className="text-xs text-ink-muted hover:text-danger"
      onClick={() => { const m = prompt("O que tem de errado? (spam, ofensa, propaganda…)"); if (m === null) return; start(async () => { await denunciar(tipo, id, m, volta); setFeito(true); }); }}>
      Denunciar
    </button>
  );
}

export function PerfilForm() {
  const [estado, acao, pendente] = useActionState(criarPerfil, undefined);
  const campo = (name: string, rotulo: string, ph: string, step = "1") => (
    <label className="block"><span className="block text-xs text-ink-muted mb-1">{rotulo}</span><input name={name} type="number" step={step} className="input font-spec" placeholder={ph} /></label>
  );
  return (
    <form action={acao} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block"><span className={lbl}>Impressora</span><input name="impressora" required className="input" placeholder="Ex.: Bambu Lab A1" /></label>
        <label className="block"><span className={lbl}>Material</span>
          <select name="material" className="input" defaultValue="PLA">{MATERIAIS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="block"><span className={lbl}>Marca (opcional)</span><input name="marca" className="input" placeholder="Ex.: Voolt3D" /></label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {campo("bico", "Bico (°C)", "215")}{campo("mesa", "Mesa (°C)", "60")}{campo("velocidade", "Velocidade (mm/s)", "200")}{campo("fluxo", "Fluxo (%)", "98")}
        {campo("retracao_mm", "Retração (mm)", "0.8", "0.1")}{campo("retracao_vel", "Vel. retração (mm/s)", "30")}{campo("pressure_advance", "Pressure advance", "0.02", "0.001")}
      </div>
      <label className="block"><span className={lbl}>Observações (opcional)</span><textarea name="notas" rows={3} maxLength={1000} className="input" placeholder="Ex.: secar 6 h a 55 °C antes; primeira camada mais lenta." /></label>
      {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-amber">{estado.ok}</p>}
      <button type="submit" disabled={pendente} className={btn}>{pendente ? "Salvando…" : "Compartilhar perfil"}</button>
    </form>
  );
}

export function BotaoConfirmar({ perfilId, total, marcado, logado }: { perfilId: string; total: number; marcado: boolean; logado: boolean }) {
  const [p, start] = useTransition();
  if (!logado) return <a href="/login?volta=/comunidade/calibracao" className="text-xs text-ink-muted hover:text-ink">👍 Funcionou pra mim · {total}</a>;
  return (
    <button type="button" disabled={p} onClick={() => start(() => alternarConfirmacao(perfilId))}
      className={`text-xs rounded-full border px-3 py-1 ${marcado ? "border-amber bg-amber-soft text-amber" : "border-line text-ink-muted hover:text-ink"}`}>
      👍 Funcionou pra mim · {total}
    </button>
  );
}

export function BotaoModerar({ tipo, id, oculto, denunciaId, texto }: { tipo: "topico" | "resposta" | "perfil"; id: string; oculto: boolean; denunciaId?: string; texto: string }) {
  const [p, start] = useTransition();
  return (
    <button type="button" disabled={p} onClick={() => start(() => moderar(tipo, id, oculto, denunciaId))}
      className="text-xs rounded-full border border-line px-3 py-1 text-ink hover:border-amber disabled:opacity-50">{p ? "…" : texto}</button>
  );
}

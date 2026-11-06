import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MATERIAIS, haQuanto } from "@/lib/comunidade/config";
import { BotaoConfirmar, BotaoDenunciar, PerfilForm } from "../componentes";

export const metadata = {
  title: { absolute: "Central de Calibração de impressão 3D: guias, peças de teste e perfis — Multiferramenta 3D" },
  description: "Calibre sua impressora 3D passo a passo: primeira camada, temperatura, fluxo, retração e pressure advance. Torre de temperatura grátis e perfis testados pela comunidade.",
  alternates: { canonical: "/comunidade/calibracao" },
};

const GUIAS: { titulo: string; peca?: { id: string; nome: string }; passos: string[] }[] = [
  { titulo: "1. Primeira camada", passos: [
    "Limpe a mesa com álcool isopropílico: gordura dos dedos é a causa nº 1 de peça soltando.",
    "Faça o nivelamento automático (ou manual com papel) com a mesa já aquecida.",
    "Imprima um quadrado fino de 1 camada: as linhas devem encostar umas nas outras, sem vão e sem 'ondas'.",
    "Linhas soltas e redondas: bico alto (desça o Z offset 0,02 mm por vez). Superfície raspada ou transparente: bico baixo (suba)." ] },
  { titulo: "2. Temperatura", peca: { id: "torre_temperatura", nome: "Torre de temperatura" }, passos: [
    "Gere a torre com a faixa do seu material (PLA 230→190, PETG 250→220, ABS/ASA 260→230).",
    "No fatiador, troque a temperatura do bico a cada 10 mm (G-code M104 na altura de cada andar).",
    "Escolha o andar com a ponte mais lisa, a saliência sem rebarba e sem fiapos. Use essa temperatura no perfil do filamento.",
    "Repita sempre que trocar de marca: cada fabricante pede uma temperatura diferente." ] },
  { titulo: "3. Dimensões e fluxo", peca: { id: "cubo_calibracao", nome: "Cubo de calibração 20 mm" }, passos: [
    "Imprima o cubo com 2 paredes e 15% de preenchimento.",
    "Meça X, Y e Z com o paquímetro em 3 pontos e tire a média.",
    "Paredes grossas, cantos estufados ou topo com excesso de material: reduza o fluxo 2% por vez. Topo com buraquinhos: aumente.",
    "Erro igual em X e Y (ex.: 19,8 mm): ajuste a compensação de tamanho XY no fatiador." ] },
  { titulo: "4. Retração (fiapos)", passos: [
    "Seque o filamento antes: filamento úmido faz fiapo com qualquer retração (PETG e TPU principalmente).",
    "Bico direto (Bambu, Prusa, Ender 3 V3): comece em 0,8 mm. Bowden (Ender 3 clássica): comece em 5 mm.",
    "Aumente 0,2 mm (direto) ou 0,5 mm (bowden) por teste até sumirem os fiapos. Passou do ponto: entupimento e falha de extrusão.",
    "Baixar 5 °C a temperatura também ajuda muito." ] },
  { titulo: "5. Pressure advance", passos: [
    "Corrige cantos estufados e falhas no começo das linhas em velocidade alta.",
    "Bambu Studio e Orca têm o teste pronto: Calibração → Pressure Advance (padrão de linhas).",
    "Escolha a linha mais uniforme, sem engrossar nas pontas, e salve o valor no perfil do filamento (normalmente entre 0,02 e 0,06 em bico direto)." ] },
];

type Perfil = { id: string; autor_nome: string; impressora: string; material: string; marca: string | null; bico: number | null; mesa: number | null; velocidade: number | null; retracao_mm: number | null; retracao_vel: number | null; fluxo: number | null; pressure_advance: number | null; notas: string | null; confirmacoes: number; created_at: string };

export default async function Calibracao({ searchParams }: { searchParams: Promise<{ material?: string; impressora?: string; marca?: string }> }) {
  const { material, impressora, marca } = await searchParams;
  const supabase = await createClient();
  let perfis: Perfil[] = []; let logado = false; let minhas = new Set<string>();
  try {
    const { data: { user } } = await supabase.auth.getUser(); logado = !!user;
    let q = supabase.from("calib_perfis").select("id, autor_nome, impressora, material, marca, bico, mesa, velocidade, retracao_mm, retracao_vel, fluxo, pressure_advance, notas, confirmacoes, created_at")
      .order("confirmacoes", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    if (material && MATERIAIS.includes(material)) q = q.eq("material", material);
    const limpa = (s: string) => s.trim().replace(/[%_\\]/g, "").slice(0, 60);
    if (impressora?.trim()) q = q.ilike("impressora", `%${limpa(impressora)}%`);
    if (marca?.trim()) q = q.ilike("marca", `%${limpa(marca)}%`);
    perfis = ((await q).data ?? []) as Perfil[];
    if (user && perfis.length) {
      const { data } = await supabase.from("calib_confirmacoes").select("perfil_id").eq("account_id", user.id).in("perfil_id", perfis.map((p) => p.id));
      minhas = new Set((data ?? []).map((c) => c.perfil_id));
    }
  } catch { /* sem banco */ }
  const val = (v: number | null, u: string) => (v == null ? null : `${String(v).replace(".", ",")}${u}`);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">🎯 Central de Calibração</h1>
      <p className="mt-2 text-sm text-ink-muted max-w-2xl">Calibre sua impressora na ordem certa e compare com as configurações que funcionaram pra comunidade. Ficou com dúvida? <Link href="/comunidade/nova?cat=calibracao" className="text-amber hover:underline">Pergunte na comunidade</Link>.</p>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl text-ink">Guias passo a passo</h2>
        {GUIAS.map((g, i) => (
          <details key={g.titulo} open={i === 0} className="rounded-2xl border border-line bg-surface px-5 py-4">
            <summary className="cursor-pointer font-medium text-ink">{g.titulo}</summary>
            <ol className="mt-3 list-decimal pl-5 space-y-1.5 text-sm text-ink">{g.passos.map((p) => <li key={p}>{p}</li>)}</ol>
            {g.peca && <Link href={`/dashboard/criador-3d?modelo=${g.peca.id}`} className="mt-3 inline-block rounded-full border border-amber/40 px-4 py-1.5 text-sm text-amber hover:bg-amber-soft">Gerar a peça de teste: {g.peca.nome} →</Link>}
          </details>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Perfis da comunidade</h2>
        <p className="mt-1 text-sm text-ink-muted">Configurações que funcionaram de verdade. Os mais confirmados aparecem primeiro.</p>
        <form action="/comunidade/calibracao" className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select name="material" defaultValue={material ?? ""} className="input"><option value="">Todos os materiais</option>{MATERIAIS.map((m) => <option key={m}>{m}</option>)}</select>
          <input name="impressora" defaultValue={impressora} placeholder="Impressora (ex.: A1)" className="input" />
          <input name="marca" defaultValue={marca} placeholder="Marca do filamento" className="input" />
          <button className="rounded-full border border-line px-4 text-sm text-ink hover:border-amber">Filtrar</button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {perfis.length === 0 && <p className="sm:col-span-2 rounded-2xl border border-line bg-surface px-6 py-8 text-center text-sm text-ink-muted">Nenhum perfil com esse filtro ainda. Compartilhe o seu aqui embaixo!</p>}
          {perfis.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-surface p-5">
              <p className="font-medium text-ink">{p.material}{p.marca ? ` · ${p.marca}` : ""}</p>
              <p className="text-xs text-ink-muted">{p.impressora} · por {p.autor_nome} · {haQuanto(p.created_at)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {[["Bico", val(p.bico, " °C")], ["Mesa", val(p.mesa, " °C")], ["Velocidade", val(p.velocidade, " mm/s")], ["Fluxo", val(p.fluxo, "%")],
                  ["Retração", p.retracao_mm == null ? null : `${val(p.retracao_mm, " mm")}${p.retracao_vel ? ` a ${p.retracao_vel} mm/s` : ""}`], ["Pressure adv.", val(p.pressure_advance, "")]]
                  .filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-ink-muted">{k}</dt><dd className="font-spec text-ink">{v}</dd></div>)}
              </dl>
              {p.notas && <p className="mt-3 text-sm text-ink-muted whitespace-pre-line">{p.notas}</p>}
              <div className="mt-3 flex items-center justify-between gap-2">
                <BotaoConfirmar perfilId={p.id} total={p.confirmacoes} marcado={minhas.has(p.id)} logado={logado} />
                <BotaoDenunciar tipo="perfil" id={p.id} volta="/comunidade/calibracao" logado={logado} />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4">
          <summary className="cursor-pointer font-medium text-ink">+ Compartilhar o meu perfil</summary>
          <div className="mt-4">
            {logado ? <PerfilForm /> : <p className="text-sm text-ink-muted"><Link href="/login?volta=/comunidade/calibracao" className="text-amber hover:underline">Entre</Link> ou <Link href="/cadastro" className="text-amber hover:underline">crie sua conta grátis</Link> pra compartilhar.</p>}
          </div>
        </details>
      </section>
    </main>
  );
}

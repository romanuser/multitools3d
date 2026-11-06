"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, getFromEmail } from "@/lib/email/resend";
import { CATEGORIAS, MATERIAIS, urlTopico } from "./config";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");
export type Estado = { error?: string; ok?: string } | undefined;

// quem está logado + nome que aparece nos posts + se a conta é nova (anti-spam)
async function quemSou(volta: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?volta=${encodeURIComponent(volta)}`);
  const { data: conta } = await supabase.from("accounts").select("company_name").eq("id", user.id).maybeSingle();
  const nome = (conta?.company_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Membro").toString().slice(0, 60);
  const contaNova = Date.now() - new Date(user.created_at).getTime() < 3 * 86400e3;
  return { supabase, user, nome, contaNova };
}

const TEM_LINK = /(https?:\/\/|www\.|\.com\b|\.com\.br\b)/i;
const linkBloqueado = (contaNova: boolean, ...textos: string[]) => contaNova && textos.some((t) => TEM_LINK.test(t));

// até 4 fotos (jpg/png/webp, 4 MB cada), enviadas pelo servidor pra pasta pública "comunidade"
async function enviarFotos(userId: string, formData: FormData): Promise<string[] | { error: string }> {
  const arquivos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  const urls: string[] = [];
  const admin = createAdminClient();
  for (const f of arquivos) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return { error: "As fotos precisam ser JPG, PNG ou WEBP." };
    if (f.size > 4 * 1024 * 1024) return { error: "Cada foto pode ter até 4 MB." };
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage.from("comunidade").upload(caminho, f, { contentType: f.type });
    if (error) return { error: "Não consegui enviar a foto. Tente de novo." };
    urls.push(admin.storage.from("comunidade").getPublicUrl(caminho).data.publicUrl);
  }
  return urls;
}

async function postsHoje(supabase: Awaited<ReturnType<typeof createClient>>, tabela: string, userId: string) {
  const { count } = await supabase.from(tabela).select("id", { count: "exact", head: true })
    .eq("account_id", userId).gte("created_at", new Date(Date.now() - 86400e3).toISOString());
  return count ?? 0;
}

// ---------- perguntar ----------
export async function criarTopico(_: Estado, formData: FormData): Promise<Estado> {
  const { supabase, user, nome, contaNova } = await quemSou("/comunidade/nova");
  const titulo = String(formData.get("titulo") || "").trim();
  const corpo = String(formData.get("corpo") || "").trim();
  const categoria = String(formData.get("categoria") || "duvidas");
  const impressora = String(formData.get("impressora") || "").trim().slice(0, 80) || null;
  const filamento = String(formData.get("filamento") || "").trim().slice(0, 80) || null;
  if (titulo.length < 8) return { error: "Escreva um título com pelo menos 8 letras (ex.: \"PETG fazendo fiapos na A1\")." };
  if (titulo.length > 140) return { error: "Título muito longo (até 140 letras)." };
  if (corpo.length < 10) return { error: "Conte um pouco mais da sua dúvida." };
  if (!CATEGORIAS.some((c) => c.id === categoria)) return { error: "Escolha a categoria." };
  if (linkBloqueado(contaNova, titulo, corpo)) return { error: "Contas criadas há menos de 3 dias ainda não podem postar links." };
  if ((await postsHoje(supabase, "forum_topicos", user.id)) >= 10) return { error: "Limite de 10 perguntas por dia. Volte amanhã!" };
  const fotos = await enviarFotos(user.id, formData);
  if (!Array.isArray(fotos)) return fotos;
  const { data, error } = await supabase.from("forum_topicos")
    .insert({ account_id: user.id, autor_nome: nome, categoria, titulo, corpo, impressora, filamento, fotos })
    .select("id, titulo").single();
  if (error || !data) return { error: "Não consegui publicar. Tente de novo." };
  revalidatePath("/comunidade");
  redirect(urlTopico(data));
}

// ---------- responder ----------
export async function responder(_: Estado, formData: FormData): Promise<Estado> {
  const topicoId = String(formData.get("topicoId") || "");
  const volta = String(formData.get("volta") || "/comunidade");
  const { supabase, user, nome, contaNova } = await quemSou(volta);
  const corpo = String(formData.get("corpo") || "").trim();
  if (corpo.length < 2) return { error: "Escreva a sua resposta." };
  if (linkBloqueado(contaNova, corpo)) return { error: "Contas criadas há menos de 3 dias ainda não podem postar links." };
  if ((await postsHoje(supabase, "forum_respostas", user.id)) >= 60) return { error: "Limite de respostas por hoje atingido." };
  const fotos = await enviarFotos(user.id, formData);
  if (!Array.isArray(fotos)) return fotos;
  const { error } = await supabase.from("forum_respostas").insert({ topico_id: topicoId, account_id: user.id, autor_nome: nome, corpo, fotos });
  if (error) return { error: "Não consegui publicar a resposta." };
  await avisarAutor(topicoId, user.id, nome).catch(() => {});
  revalidatePath(volta);
  return { ok: "Resposta publicada!" };
}

// e-mail pro autor da pergunta quando alguém responde (nunca pra si mesmo)
async function avisarAutor(topicoId: string, quemRespondeu: string, nome: string) {
  const admin = createAdminClient();
  const { data: t } = await admin.from("forum_topicos").select("id, titulo, account_id").eq("id", topicoId).maybeSingle();
  if (!t || t.account_id === quemRespondeu) return;
  const { data: u } = await admin.auth.admin.getUserById(t.account_id);
  const email = u?.user?.email; if (!email) return;
  const link = `${SITE}${urlTopico(t)}`;
  await getResend().emails.send({
    from: getFromEmail(), to: email, subject: `Nova resposta: ${t.titulo}`,
    html: `<p><b>${nome.replace(/</g, "&lt;")}</b> respondeu a sua pergunta na Comunidade Multiferramenta 3D:</p><p><b>${t.titulo.replace(/</g, "&lt;")}</b></p><p><a href="${link}">Ver a resposta</a></p><p style="color:#888;font-size:12px">Se a resposta resolveu, marque como solução: ajuda quem tiver a mesma dúvida.</p>`,
  });
}

// ---------- "funcionou pra mim" (liga/desliga) ----------
export async function alternarUtil(respostaId: string, volta: string) {
  const { supabase, user } = await quemSou(volta);
  const { data } = await supabase.from("forum_uteis").select("resposta_id").eq("resposta_id", respostaId).eq("account_id", user.id).maybeSingle();
  if (data) await supabase.from("forum_uteis").delete().eq("resposta_id", respostaId).eq("account_id", user.id);
  else await supabase.from("forum_uteis").insert({ resposta_id: respostaId, account_id: user.id });
  revalidatePath(volta);
}

// ---------- autor marca a solução (ou desmarca) ----------
export async function marcarSolucao(topicoId: string, respostaId: string | null, volta: string) {
  const { supabase } = await quemSou(volta);
  if (respostaId) {
    const { data: r } = await supabase.from("forum_respostas").select("id").eq("id", respostaId).eq("topico_id", topicoId).maybeSingle();
    if (!r) return;
  }
  await supabase.from("forum_topicos").update({ resolvido: !!respostaId, resposta_aceita: respostaId }).eq("id", topicoId);
  revalidatePath(volta); revalidatePath("/comunidade");
}

// ---------- denunciar ----------
export async function denunciar(tipo: "topico" | "resposta" | "perfil", id: string, motivo: string, volta: string) {
  const { supabase, user } = await quemSou(volta);
  await supabase.from("forum_denuncias").insert({ alvo_tipo: tipo, alvo_id: id, account_id: user.id, motivo: motivo.slice(0, 300) || null });
  return { ok: true };
}

// ---------- calibração: compartilhar perfil e confirmar ----------
const numOuNull = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(",", ".")); return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, n));
};
export async function criarPerfil(_: Estado, formData: FormData): Promise<Estado> {
  const { supabase, user, nome, contaNova } = await quemSou("/comunidade/calibracao");
  const impressora = String(formData.get("impressora") || "").trim().slice(0, 80);
  const material = String(formData.get("material") || "");
  const marca = String(formData.get("marca") || "").trim().slice(0, 60) || null;
  const notas = String(formData.get("notas") || "").trim().slice(0, 1000) || null;
  if (impressora.length < 2) return { error: "Informe a impressora (ex.: Bambu Lab A1)." };
  if (!MATERIAIS.includes(material)) return { error: "Escolha o material." };
  if (notas && linkBloqueado(contaNova, notas)) return { error: "Contas criadas há menos de 3 dias ainda não podem postar links." };
  if ((await postsHoje(supabase, "calib_perfis", user.id)) >= 10) return { error: "Limite de 10 perfis por dia." };
  const { error } = await supabase.from("calib_perfis").insert({
    account_id: user.id, autor_nome: nome, impressora, material, marca, notas,
    bico: numOuNull(formData.get("bico"), 150, 350), mesa: numOuNull(formData.get("mesa"), 0, 130),
    velocidade: numOuNull(formData.get("velocidade"), 5, 1000), retracao_mm: numOuNull(formData.get("retracao_mm"), 0, 15),
    retracao_vel: numOuNull(formData.get("retracao_vel"), 1, 150), fluxo: numOuNull(formData.get("fluxo"), 50, 150),
    pressure_advance: numOuNull(formData.get("pressure_advance"), 0, 2),
  });
  if (error) return { error: "Não consegui salvar o perfil." };
  revalidatePath("/comunidade/calibracao");
  return { ok: "Perfil compartilhado. Obrigado!" };
}
export async function alternarConfirmacao(perfilId: string) {
  const { supabase, user } = await quemSou("/comunidade/calibracao");
  const { data } = await supabase.from("calib_confirmacoes").select("perfil_id").eq("perfil_id", perfilId).eq("account_id", user.id).maybeSingle();
  if (data) await supabase.from("calib_confirmacoes").delete().eq("perfil_id", perfilId).eq("account_id", user.id);
  else await supabase.from("calib_confirmacoes").insert({ perfil_id: perfilId, account_id: user.id });
  revalidatePath("/comunidade/calibracao");
}

// ---------- moderação (só o administrador) ----------
export async function moderar(tipo: "topico" | "resposta" | "perfil", id: string, ocultar: boolean, denunciaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: conta } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!conta?.is_admin) return;
  const admin = createAdminClient();
  const tabela = tipo === "topico" ? "forum_topicos" : tipo === "resposta" ? "forum_respostas" : "calib_perfis";
  await admin.from(tabela).update({ oculto: ocultar }).eq("id", id);
  if (denunciaId) await admin.from("forum_denuncias").update({ resolvida: true }).eq("id", denunciaId);
  revalidatePath("/admin/comunidade"); revalidatePath("/comunidade"); revalidatePath("/comunidade/calibracao");
}

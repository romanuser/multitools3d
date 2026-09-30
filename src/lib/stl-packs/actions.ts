"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { STL_FILES_BUCKET, STL_COVERS_BUCKET } from "./config";
import { runDailyStlSelection } from "./select-daily";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  return { supabase, userId: user.id };
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Passo 1 do upload: gera uma "autorização" temporária pra o navegador do
// admin mandar o arquivo GRANDE direto pro Supabase Storage — sem passar
// pelo servidor do site, então não esbarra em limite de tamanho de função
// serverless (útil pra arquivo/zip grande).
export async function adminCreateStlUploadUrl(fileName: string): Promise<{ path?: string; token?: string; error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const path = `${Date.now()}-${safeName(fileName)}`;

  const { data, error } = await admin.storage.from(STL_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Não consegui iniciar o upload: " + (error?.message || "erro desconhecido") };

  return { path: data.path, token: data.token };
}

// Passo 2: depois que o arquivo já está no Storage (upload feito direto do
// navegador), salva os dados no banco. Aqui sim pode receber a capa
// (imagem pequena) normalmente, via FormData.
export async function adminFinalizeStlUpload(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const tagsRaw = String(formData.get("tags") || "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const path = String(formData.get("path") || "");
  const cover = formData.get("cover") as File | null;

  if (!title) return { error: "Dá um título pro arquivo." };
  if (!path) return { error: "O upload do arquivo não terminou direito. Tenta de novo." };

  const admin = createAdminClient();

  let coverPath: string | null = null;
  if (cover && cover.size > 0) {
    coverPath = `stl-packs/${Date.now()}-${safeName(cover.name)}`;
    const { error: coverError } = await admin.storage
      .from(STL_COVERS_BUCKET)
      .upload(coverPath, cover, { contentType: cover.type || "image/jpeg" });
    if (coverError) coverPath = null; // capa é opcional, não trava o upload por causa dela
  }

  const { error: insertError } = await admin.from("stl_pack_files").insert({
    title,
    tags,
    file_path: path,
    cover_image_path: coverPath,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/admin/stl-packs");
  return { success: true };
}

export async function adminToggleStlFile(fileId: string, active: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("stl_pack_files").update({ active }).eq("id", fileId);
  if (error) return { error: error.message };
  revalidatePath("/admin/stl-packs");
  return {};
}

export async function adminDeleteStlFile(fileId: string, filePath: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.storage.from(STL_FILES_BUCKET).remove([filePath]);
  const { error } = await admin.from("stl_pack_files").delete().eq("id", fileId);
  if (error) return { error: error.message };
  revalidatePath("/admin/stl-packs");
  return {};
}

// Botão "Publicar agora" no Admin — roda a mesma seleção que a função
// agendada da Netlify vai rodar sozinha todo dia.
export async function adminRunDailyStlSelectionNow(): Promise<{ error?: string; picked?: number }> {
  await requireAdmin();
  const result = await runDailyStlSelection();
  revalidatePath("/admin/stl-packs");
  revalidatePath("/dashboard/stl-packs");
  return { picked: result.picked };
}

// Gera um link de download temporário (1 hora) pro usuário final.
export async function getStlDownloadUrl(fileId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: file } = await admin.from("stl_pack_files").select("file_path").eq("id", fileId).maybeSingle();
  if (!file) return { error: "Arquivo não encontrado." };

  const { data, error } = await admin.storage.from(STL_FILES_BUCKET).createSignedUrl(file.file_path, 60 * 60);
  if (error || !data) return { error: "Não consegui gerar o link de download." };

  return { url: data.signedUrl };
}

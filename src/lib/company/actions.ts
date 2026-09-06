"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type CompanyState = { error?: string; success?: string } | undefined;

// ---------------------------------------------------------------------
// Atualiza nome da empresa e, se um arquivo de logo foi enviado, sobe
// pro bucket "company-logos" (dentro de uma pasta com o próprio ID do
// usuário, que é a mesma regra usada na política de Storage) e salva a
// URL pública em accounts.company_logo_url.
// ---------------------------------------------------------------------
export async function updateCompany(
  _prevState: CompanyState,
  formData: FormData
): Promise<CompanyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const companyName = String(formData.get("companyName") || "").trim();
  const logoFile = formData.get("logo") as File | null;

  if (!companyName) {
    return { error: "Digite o nome da empresa." };
  }

  const updates: { company_name: string; company_logo_url?: string } = {
    company_name: companyName,
  };

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: "O logo precisa ter até 2 MB." };
    }
    if (!logoFile.type.startsWith("image/")) {
      return { error: "Envie um arquivo de imagem (PNG, JPG ou SVG)." };
    }

    const extension = logoFile.name.split(".").pop() || "png";
    const path = `${user.id}/logo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });

    if (uploadError) {
      return { error: "Não consegui salvar o logo: " + uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("company-logos").getPublicUrl(path);

    // Adiciona um parâmetro de versão pra evitar que o navegador mostre
    // o logo antigo em cache depois de trocar a imagem.
    updates.company_logo_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: "Não consegui salvar: " + error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/empresa");
  revalidatePath("/dashboard/orcamentos");

  return { success: "Dados da empresa atualizados." };
}

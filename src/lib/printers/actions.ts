"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type PrinterState = { error?: string } | undefined;

export async function savePrinter(
  _prevState: PrinterState,
  formData: FormData
): Promise<PrinterState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const printerId = String(formData.get("printerId") || "");
  const name = String(formData.get("name") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const status = String(formData.get("status") || "livre");
  const photoFile = formData.get("photo") as File | null;

  if (!name) return { error: "Dá um nome pra impressora." };

  const payload: {
    account_id: string;
    name: string;
    model: string | null;
    status: string;
    photo_url?: string;
  } = { account_id: user.id, name, model: model || null, status };

  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 3 * 1024 * 1024) return { error: "A foto precisa ter até 3 MB." };
    if (!photoFile.type.startsWith("image/")) return { error: "Envie um arquivo de imagem." };

    const extension = photoFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${printerId || crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("printer-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadError) return { error: "Não consegui salvar a foto: " + uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("printer-photos").getPublicUrl(path);

    payload.photo_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = printerId
    ? await supabase.from("printers").update(payload).eq("id", printerId)
    : await supabase.from("printers").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/impressoras");
  revalidatePath("/dashboard/fila");
  return {};
}

export async function deletePrinter(printerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("printers")
    .delete()
    .eq("id", printerId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/impressoras");
  return {};
}

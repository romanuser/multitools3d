import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export default async function DadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/loja/conta/entrar");

  const meta = user.user_metadata || {};

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-1">Dados cadastrais</h1>
      <p className="text-sm text-ink-muted mb-8">{user.email}</p>

      <div className="space-y-6">
        <ProfileForm name={meta.name || ""} whatsapp={meta.whatsapp || ""} address={meta.address || ""} />
        <PasswordForm />
      </div>
    </div>
  );
}

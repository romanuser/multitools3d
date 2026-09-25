import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GuideContent } from "./guide-content";

export const metadata = { title: "Guia de uso" };

export default async function GuiaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <GuideContent />;
}

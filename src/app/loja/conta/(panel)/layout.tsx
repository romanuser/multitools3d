import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerSidebar } from "@/components/customer-sidebar";

export default async function ContaPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/loja/conta/entrar");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-paper">
      <CustomerSidebar email={user.email} />
      <div className="flex-1 min-w-0">
        <main className="px-6 py-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ehAdmin } from "@/lib/ofertas/admin";
import { urlAutorizar } from "@/lib/ofertas/ml";

// Leva o administrador pra autorizar o app no Mercado Livre (uma vez só; depois renova sozinho).
export async function GET(request: Request) {
  if (!(await ehAdmin())) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const state = randomBytes(16).toString("hex");
    const res = NextResponse.redirect(urlAutorizar(state));
    res.cookies.set("ml_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    return res;
  } catch (e) {
    return NextResponse.redirect(new URL(`/admin/ofertas?ml_erro=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`, request.url));
  }
}

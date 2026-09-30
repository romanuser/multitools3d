import type { Config } from "@netlify/functions";

// Roda todo dia às 09:00 (horário de Brasília = 12:00 UTC) e só avisa o
// site pra escolher os arquivos do dia — toda a lógica de verdade mora em
// src/app/api/cron/publish-stl-daily/route.ts, dentro do app Next.js.
async function handler() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("[daily-stl-publish] faltando NEXT_PUBLIC_SITE_URL ou CRON_SECRET");
    return new Response("faltando configuração", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/cron/publish-stl-daily?secret=${secret}`, {
    method: "POST",
  });
  const body = await response.text();
  console.log("[daily-stl-publish]", response.status, body);

  return new Response(body, { status: response.status });
}

export default handler;

export const config: Config = {
  schedule: "0 12 * * *",
};

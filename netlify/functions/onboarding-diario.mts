// Agendamento da Netlify: todo dia às 13:00 UTC (10:00 em Brasília)
// chama a sequência de boas-vindas do site.
export default async () => {
  const site = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`${site}/api/cron/onboarding`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  console.log("sequência de boas-vindas:", res.status, await res.text());
  return new Response("ok");
};

export const config = { schedule: "0 13 * * *" };

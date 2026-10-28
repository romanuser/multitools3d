// Agendamento da Netlify: de hora em hora (minuto 20), roda o caçador de promoções.
export default async () => {
  const site = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`${site}/api/cron/ofertas`, { method: "POST", headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" } });
  console.log("caçador de promoções:", res.status, (await res.text()).slice(0, 500));
  return new Response("ok");
};
export const config = { schedule: "20 * * * *" };

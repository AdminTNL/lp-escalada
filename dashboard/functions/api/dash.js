import { parseCookies, verifySession } from "../_lib/session.js";

const SESSION_COOKIE = "esc_dash_session";
const N8N_DASH_WEBHOOK = "https://webhookn8n.tnledu.shop/webhook/dash-escalada";

// Unico chamador legitimo do webhook n8n pra essa superficie. Exige sessao
// valida (login real via Keycloak) e SEMPRE sobrescreve qualquer
// email/p_email/email_admin que o cliente tente mandar pelo email
// verificado da sessao -- nunca aceita identidade vinda do navegador.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ error: "nao autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const upstream = new URL(N8N_DASH_WEBHOOK);
  for (const [key, value] of url.searchParams.entries()) {
    const lower = key.toLowerCase();
    if (lower === "email" || lower === "p_email" || lower === "email_admin") continue;
    upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set("email", session.email);
  upstream.searchParams.set("p_email", session.email);
  upstream.searchParams.set("email_admin", session.email);

  const upstreamRes = await fetch(upstream.toString(), { method: "GET" });
  const body = await upstreamRes.text();

  return new Response(body, {
    status: upstreamRes.status,
    headers: { "Content-Type": upstreamRes.headers.get("content-type") || "application/json" },
  });
}

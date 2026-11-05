import { parseCookies, verifySession } from "../_lib/session.js";
import { logAcesso } from "../_lib/audit.js";

const SESSION_COOKIE = "esc_dash_session";

// Endpoint dedicado pra eventos client-side que o backend nao tem
// visibilidade natural nenhuma (ex: usuario selecionou texto e apertou
// Ctrl+C) -- o cliente so manda {acao, detalhamento}; ip/user_agent/referer
// vem sempre do request real (logAcesso le direto dos headers), nunca do
// que o navegador alegar.
export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ error: "nao autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "corpo invalido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const acao = String(body?.acao || "").trim();
  if (!acao) {
    return new Response(JSON.stringify({ error: "acao obrigatoria" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  waitUntil(
    logAcesso(request, {
      email: session.email,
      acao,
      detalhamento: body?.detalhamento && typeof body.detalhamento === "object" ? body.detalhamento : null,
    })
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

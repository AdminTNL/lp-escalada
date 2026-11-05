import { parseCookies, verifySession } from "../_lib/session.js";
import { logAcesso } from "../_lib/audit.js";

const SESSION_COOKIE = "esc_dash_session";
const N8N_UPLOAD_ENDPOINT = "https://webhookn8n.tnledu.shop/webhook/destaques-engajamento-upload-foto";

// Substitui o padrao antigo (form real + iframe oculto, necessario so' porque
// a pagina rodava embutida na Circle e sofria o bloqueio de CORS dela).
// Aqui a chamada do navegador e' same-origin (fetch normal), e esta Function
// repassa pro n8n real servidor-a-servidor -- sempre forcando o email_admin
// da sessao verificada, nunca o que o cliente mandar.
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

  const { circle_id, ts, ext, foto_base64 } = body || {};
  if (!circle_id || !ts || !ext || !foto_base64) {
    return new Response(JSON.stringify({ error: "campos obrigatorios faltando" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstreamBody = new URLSearchParams({
    email_admin: session.email,
    circle_id: String(circle_id),
    ts: String(ts),
    ext: String(ext),
    foto_base64: String(foto_base64),
  });

  const upstreamRes = await fetch(N8N_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: upstreamBody.toString(),
  });

  waitUntil(
    logAcesso(request, {
      email: session.email,
      acao: "upload_destaque",
      detalhamento: { circle_id: String(circle_id), ext: String(ext) },
    })
  );

  return new Response(JSON.stringify({ ok: upstreamRes.ok, status: upstreamRes.status }), {
    status: upstreamRes.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  });
}

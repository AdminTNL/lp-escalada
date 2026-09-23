// Cloudflare Pages Function -- fica no meio do tracker de visitas/cliques da
// LP e o webhook do n8n (webhookn8n.tnledu.shop/webhook/trafego-escalada),
// so pra enriquecer o payload com sinais de edge que so existem aqui
// (request.cf) antes de repassar pro n8n, que grava tudo cru em viz_lp --
// nenhum filtro de bot acontece aqui, so captura de sinal pra classificacao
// futura (ver supabase/functions/campanhas/viz_lp_sinais_bot.sql no repo
// B.O-s-Escalada).
//
// Responde 204 pro browser IMEDIATAMENTE e so entao repassa pro n8n via
// waitUntil -- o beacon de "engagement" dispara no visibilitychange/unload
// da pagina (as vezes via navigator.sendBeacon), entao esperar a resposta
// do n8n antes de responder arriscaria a requisicao ser cortada pelo
// navegador durante o unload.

export async function onRequestPost(context) {
  const { request, waitUntil } = context;
  const cf = request.cf || {};
  const bot = cf.botManagement || null;

  let body = {};
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch (err) {
    body = {};
  }

  body.ip = request.headers.get('cf-connecting-ip') || null;
  body.pais = cf.country || null;
  body.asn = typeof cf.asn === 'number' ? cf.asn : null;
  body.as_organization = cf.asOrganization || null;
  body.colo = cf.colo || null;
  body.client_tcp_rtt = typeof cf.clientTcpRtt === 'number' ? cf.clientTcpRtt : null;
  body.tls_cipher = cf.tlsCipher || null;
  body.tls_version = cf.tlsVersion || null;
  body.http_protocol = cf.httpProtocol || null;
  body.cf_ray = request.headers.get('cf-ray') || null;
  // botManagement so existe se a zona tiver Bot Management contratado --
  // fica null nos outros planos, sem quebrar nada (coluna aceita null).
  body.verified_bot = bot ? !!bot.verifiedBot : null;
  body.bot_score = bot && typeof bot.score === 'number' ? bot.score : null;

  const forward = fetch('https://webhookn8n.tnledu.shop/webhook/trafego-escalada', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => {});

  waitUntil(forward);

  return new Response(null, { status: 204 });
}

const N8N_DASH_WEBHOOK = "https://webhookn8n.tnledu.shop/webhook/dash-escalada";

// Bug achado 2026-11-05: o node HTTP Request NATIVO do n8n (nos dois
// branches log_acesso/log_acessos_listar) corrompe texto UTF-8 multibyte
// (acentos, "·") tanto ao montar o body da chamada pro Supabase quanto ao
// parsear a resposta de volta -- mesmo com Content-Type/charset explicito.
// Confirmado isolando com RPC direta (sem n8n): grava/le perfeito. Fix no
// workflow: os dois nodes passaram a ser Code nodes com
// this.helpers.httpRequest (bypassa o parsing problematico do node
// declarativo). Do lado de fora (aqui), o unico efeito e' que
// `detalhamento` precisa ir em base64 (`detalhamento_b64`) -- texto puro
// ASCII na query string nunca aciona o bug, mas nao reintroduzir o campo
// cru sem querer. Detalhe completo na skill n8n-flows.
function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Auditoria de acesso (2026-11-05, pedido do Gabriel): o painel agora
// exige login real, entao precisa dar pra saber quem acessou, quando, o
// que fez e quais rotas visitou. Loga via o MESMO webhook n8n que ja
// serve o resto do dashboard (report=log_acesso -> dashboard_registrar_
// acesso, ver supabase/functions/dashboard_auditoria/ no repo
// B.O-s-Escalada) -- sem precisar de credencial Supabase nova aqui.
//
// SEMPRE fire-and-forget: nunca deve atrasar nem quebrar a resposta real
// pro usuario. O chamador precisa envolver com `context.waitUntil(...)`
// pra garantir que o fetch termina mesmo depois da Response ja ter sido
// devolvida (ver uso em _middleware.js/api/dash.js/auth/*).
export async function logAcesso(request, { email, acao, rota, report, detalhamento }) {
  try {
    if (!email || !acao) return;
    const headers = request.headers;
    const ip =
      headers.get("CF-Connecting-IP") ||
      headers.get("X-Forwarded-For") ||
      "";
    const url = new URL(N8N_DASH_WEBHOOK);
    url.searchParams.set("report", "log_acesso");
    url.searchParams.set("email", email);
    url.searchParams.set("acao", acao);
    if (rota) url.searchParams.set("rota", rota);
    if (report) url.searchParams.set("report_logado", report);
    if (detalhamento) url.searchParams.set("detalhamento_b64", toBase64Utf8(JSON.stringify(detalhamento)));
    if (ip) url.searchParams.set("ip", ip);
    const ua = headers.get("User-Agent");
    if (ua) url.searchParams.set("user_agent", ua);
    const referer = headers.get("Referer");
    if (referer) url.searchParams.set("referer", referer);

    await fetch(url.toString(), { method: "GET" });
  } catch (err) {
    console.warn("[audit] falha ao registrar acesso", String(err));
  }
}

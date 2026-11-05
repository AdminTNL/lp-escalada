const N8N_DASH_WEBHOOK = "https://webhookn8n.tnledu.shop/webhook/dash-escalada";

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
    if (detalhamento) url.searchParams.set("detalhamento", JSON.stringify(detalhamento));
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

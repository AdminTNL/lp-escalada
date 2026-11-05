import { parseCookies, verifySession } from "../_lib/session.js";
import { logAcesso } from "../_lib/audit.js";

const REALM = "escalada";
const CLIENT_ID = "dashboard-escaladagame";
const SESSION_COOKIE = "esc_dash_session";

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);

  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);
  if (session) {
    waitUntil(logAcesso(request, { email: session.email, acao: "logout" }));
  }

  const headers = new Headers();
  headers.append("Set-Cookie", "esc_dash_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");

  // Encerra tambem a sessao SSO no Keycloak (via o nosso proxy em
  // functions/realms -- o navegador continua sem visitar o dominio real).
  const endSession = new URL(`${url.protocol}//${url.host}/realms/${REALM}/protocol/openid-connect/logout`);
  endSession.searchParams.set("post_logout_redirect_uri", `${url.protocol}//${url.host}/`);
  endSession.searchParams.set("client_id", CLIENT_ID);
  headers.set("Location", endSession.toString());

  return new Response(null, { status: 302, headers });
}

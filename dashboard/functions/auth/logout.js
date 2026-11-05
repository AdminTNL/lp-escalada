const REALM = "escalada";
const CLIENT_ID = "dashboard-escaladagame";

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

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

import { randomToken } from "../_lib/session.js";

const REALM = "escalada";
const CLIENT_ID = "dashboard-escaladagame";

// Monta a URL de autorizacao do Keycloak apontando pro NOSSO proprio
// dominio (/realms/...), nunca pro dominio real -- quem resolve isso de
// verdade e' o proxy em functions/realms/[[path]].js.
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const redirectTarget = url.searchParams.get("redirect") || "/";
  const safeRedirect = redirectTarget.startsWith("/") ? redirectTarget : "/";

  const state = randomToken();
  const redirectUri = `${url.protocol}//${url.host}/auth/callback`;

  const authorizeUrl = new URL(`${url.protocol}//${url.host}/realms/${REALM}/protocol/openid-connect/auth`);
  authorizeUrl.searchParams.set("client_id", CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);

  const headers = new Headers();
  headers.append("Set-Cookie", `kc_state=${state}; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax`);
  headers.append(
    "Set-Cookie",
    `kc_redirect=${encodeURIComponent(safeRedirect)}; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax`
  );
  headers.set("Location", authorizeUrl.toString());

  return new Response(null, { status: 302, headers });
}

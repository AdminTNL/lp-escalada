import { KEYCLOAK_ORIGIN } from "../_lib/kcproxy.js";
import { parseCookies, signSession } from "../_lib/session.js";

const REALM = "escalada";
const CLIENT_ID = "dashboard-escaladagame";
const SESSION_COOKIE = "esc_dash_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h -- dentro do ssoSessionMaxLifespan do realm (10h)

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Troca de codigo por token e' servidor-a-servidor (Cloudflare -> Keycloak
// real direto, nunca passa pelo navegador do gestor) -- por isso chama
// KEYCLOAK_ORIGIN direto, sem precisar do proxy /realms. Verifica a
// assinatura do id_token contra o JWKS do realm antes de confiar em
// qualquer claim.
//
// O issuer esperado e' o NOSSO dominio, nao o hostname real do Keycloak:
// desde que KC_HOSTNAME ficou dinamico (2026-11-05) e o proxy /realms
// manda o header que faz o Traefik forcar X-Forwarded-Host pro nosso
// dominio, o Keycloak carrega esse hostname resolvido pra toda a sessao de
// autenticacao (inclusive o claim `iss` do token final) -- mesmo essa
// chamada de troca de token sendo direta, sem header, o issuer reflete o
// que foi resolvido na etapa de autorizacao (proxied), nao o desta chamada.
async function verifyIdToken(idToken, expectedIssuer) {
  const [headerB64, payloadB64, sigB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error("id_token malformado");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerB64)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));

  const jwksRes = await fetch(`${KEYCLOAK_ORIGIN}/realms/${REALM}/protocol/openid-connect/certs`);
  if (!jwksRes.ok) throw new Error("falha ao buscar JWKS do Keycloak");
  const jwks = await jwksRes.json();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid && k.kty === "RSA");
  if (!jwk) throw new Error("chave publica do Keycloak nao encontrada pro kid do token");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!ok) throw new Error("assinatura do id_token invalida");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error("id_token expirado");
  if (payload.iss !== expectedIssuer) {
    throw new Error("issuer inesperado: " + payload.iss + " (esperado " + expectedIssuer + ")");
  }
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(CLIENT_ID)) throw new Error("audience nao inclui o client esperado");

  return payload;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const cookies = parseCookies(request.headers.get("Cookie"));
  const expectedState = cookies["kc_state"];
  const postLoginRedirect = cookies["kc_redirect"] || "/";

  const clearAuxCookies = [
    "kc_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    "kc_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
  ];

  if (errorParam) {
    return new Response(`Login cancelado ou falhou: ${errorParam}`, { status: 400 });
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response(
      "Estado de login invalido (CSRF ou expirado) -- volte e tente entrar de novo.",
      { status: 400 }
    );
  }

  const redirectUri = `${url.protocol}//${url.host}/auth/callback`;
  const tokenRes = await fetch(`${KEYCLOAK_ORIGIN}/realms/${REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      client_secret: env.KEYCLOAK_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return new Response("Falha ao trocar o codigo por token (status " + tokenRes.status + "): " + errText, { status: 400 });
  }
  const tokenBody = await tokenRes.json();

  let claims;
  try {
    claims = await verifyIdToken(tokenBody.id_token, `${url.protocol}//${url.host}/realms/${REALM}`);
  } catch (err) {
    return new Response("id_token invalido: " + err.message, { status: 400 });
  }

  if (!claims.email) {
    return new Response(
      "Essa conta nao tem email associado pelo Keycloak -- nao e' possivel abrir sessao.",
      { status: 403 }
    );
  }

  const sessionToken = await signSession(
    { email: claims.email, name: claims.name || claims.preferred_username || null },
    env.SESSION_SECRET,
    SESSION_TTL_SECONDS
  );

  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionToken}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
  );
  clearAuxCookies.forEach((c) => headers.append("Set-Cookie", c));
  const safeRedirect = postLoginRedirect.startsWith("/") ? postLoginRedirect : "/";
  headers.set("Location", safeRedirect);

  return new Response(null, { status: 302, headers });
}

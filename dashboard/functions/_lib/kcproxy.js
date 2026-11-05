// Reverse proxy do Keycloak real pra dentro do nosso dominio -- o navegador
// do gestor NUNCA visita keycloak-escalada.tnledu.shop diretamente (nem a
// tela de login), pra nao sofrer o mesmo bloqueio de firewall que esse
// dominio ja causa nas chamadas de API.
//
// O Keycloak (KC_HOSTNAME removido, dinamico desde 2026-11-05) gera links
// com o dominio certo quando recebe X-Forwarded-Host confiavel -- o Traefik
// so aplica esse X-Forwarded-Host customizado (em vez do fixo real, que e'
// o que o router padrao sempre manda) quando a requisicao carrega o header
// secreto abaixo (ver labels traefik.http.routers.keycloak-dashboard-poc no
// service keycloak_keycloak/Portainer). Sem esse header, cai no router
// padrao (hostname real fixo) -- por isso TODA chamada deste proxy precisa
// mandar o secret, inclusive pro broker do Google funcionar sem hop.
//
// A reescrita de texto abaixo (Location/Set-Cookie/corpo) fica como rede de
// seguranca (idempotente se o Keycloak ja devolver o dominio certo).

export const KEYCLOAK_ORIGIN = "https://keycloak-escalada.tnledu.shop";

const PASSTHROUGH_SKIP_HEADERS = new Set([
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "content-security-policy",
]);

export async function proxyToKeycloak(request, env) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, KEYCLOAK_ORIGIN);
  const keycloakHost = new URL(KEYCLOAK_ORIGIN).host;
  const ourOrigin = `${url.protocol}//${url.host}`;

  const headers = new Headers(request.headers);
  headers.set("Host", keycloakHost);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");
  if (env && env.DASHBOARD_PROXY_SECRET) {
    headers.set("X-Dashboard-Proxy-Secret", env.DASHBOARD_PROXY_SECRET);
  }
  headers.delete("cf-connecting-ip");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  const upstream = await fetch(target.toString(), init);

  const outHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase();
    if (PASSTHROUGH_SKIP_HEADERS.has(lower)) continue;
    if (lower === "set-cookie") {
      outHeaders.append("set-cookie", value.replace(/;\s*Domain=[^;]*/i, ""));
      continue;
    }
    if (lower === "location") {
      // So reescreve quando o PROPRIO redirect aponta pro Keycloak real (o
      // Keycloak redirecionando pra si mesmo) -- nunca um replace cego no
      // valor inteiro, porque um redirect pro broker do Google carrega o
      // redirect_uri real do Keycloak como QUERY PARAM pro lado de fora
      // (precisa chegar intacto em accounts.google.com, que so aceita o
      // redirect_uri exato cadastrado no Google Cloud Console).
      let loc = value;
      if (loc.startsWith(KEYCLOAK_ORIGIN)) {
        loc = ourOrigin + loc.slice(KEYCLOAK_ORIGIN.length);
      }
      outHeaders.set("location", loc);
      continue;
    }
    outHeaders.append(key, value);
  }

  const contentType = upstream.headers.get("content-type") || "";
  const isRewritableText =
    contentType.includes("text/html") ||
    contentType.includes("text/css") ||
    contentType.includes("javascript") ||
    contentType.includes("json");

  if (isRewritableText) {
    const text = await upstream.text();
    const rewritten = text.split(KEYCLOAK_ORIGIN).join(ourOrigin).split(keycloakHost).join(url.host);
    return new Response(rewritten, { status: upstream.status, headers: outHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}

import { parseCookies, verifySession } from "./_lib/session.js";

const SESSION_COOKIE = "esc_dash_session";

// Roda primeiro, antes de servir qualquer pagina ou asset estatico. Garante
// o redirect pro login no SERVIDOR -- nao depende do JS do cliente rodar
// (nem de fetch/cache do navegador se comportar como esperado) pra alguem
// sem sessao valida nunca ver o dashboard tentando (e falhando) carregar
// sem identidade nenhuma.
const PUBLIC_PREFIXES = ["/auth/", "/realms/", "/resources/", "/assets/", "/cdn-cgi/"];

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (PUBLIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return next();
  }
  // /api/* fica protegido pelas proprias Functions (dash.js,
  // destaques-upload.js, imagens) -- aqui so protegemos paginas servidas
  // como HTML (index.html e qualquer coisa fora dos prefixos acima).
  if (url.pathname.startsWith("/api/")) {
    return next();
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);
  if (!session) {
    const redirect = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/auth/login?redirect=${redirect}`, 302);
  }

  return next();
}

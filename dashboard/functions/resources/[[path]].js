import { proxyToKeycloak } from "../_lib/kcproxy.js";

// Assets estaticos do tema de login do Keycloak (CSS/JS/imagens/fontes) --
// mesmo proxy de /realms, so que pra /resources.
export async function onRequest(context) {
  return proxyToKeycloak(context.request, context.env);
}

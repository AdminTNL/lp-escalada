import { proxyToKeycloak } from "../_lib/kcproxy.js";

// Catch-all: qualquer coisa sob /realms/* (tela de login, POST do form,
// endpoints de broker Google, etc) passa por aqui -- mesma rota que o
// Keycloak real usaria, so que servida do nosso dominio.
export async function onRequest(context) {
  return proxyToKeycloak(context.request);
}

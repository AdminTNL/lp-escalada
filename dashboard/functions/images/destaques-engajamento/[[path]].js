const SUPABASE_PUBLIC_BASE = "https://database.tnledu.shop/storage/v1/object/public/destaques-engajamento";

// Proxy read-only das fotos de "Destaques de Engajamento" -- sao publicas
// de qualquer forma (mesmo bucket publico de hoje), isso so' move o GET pro
// nosso dominio em vez do navegador bater direto no Supabase Storage.
export async function onRequestGet(context) {
  const { params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const upstream = await fetch(`${SUPABASE_PUBLIC_BASE}/${path}`);

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}

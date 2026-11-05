import { parseCookies, verifySession } from "../_lib/session.js";

const SESSION_COOKIE = "esc_dash_session";

export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifySession(cookies[SESSION_COOKIE], env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ authenticated: true, email: session.email, name: session.name || null }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

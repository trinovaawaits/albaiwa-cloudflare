import * as catalog from '../functions/api/catalog.js';
import * as login from '../functions/api/login.js';
import * as owner from '../functions/api/owner.js';
import * as shop from '../functions/api/shop.js';
import * as orders from '../functions/api/orders.js';
import * as chat from '../functions/api/chat.js';
import * as chatbot from '../functions/api/chatbot.js';

const routes = {
  '/api/catalog': catalog,
  '/api/login': login,
  '/api/owner': owner,
  '/api/shop': shop,
  '/api/orders': orders,
  '/api/chat': chat,
  '/api/chatbot': chatbot
};

const SECURITY = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const mod = routes[url.pathname];
    if (mod) {
      const name = 'onRequest' + request.method.charAt(0) + request.method.slice(1).toLowerCase();
      const handler = mod[name];
      if (!handler) return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
      return handler({ request, env });
    }
    // Everything else is the website itself
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  }
};

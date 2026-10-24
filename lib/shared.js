const enc = new TextEncoder();
const ITER = 100000;

export const json = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export const bearer = (request) => (request.headers.get('authorization') || '').replace('Bearer ', '');

export async function db(env, path, { method = 'GET', body, prefer } = {}) {
  const key = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`DB ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };

export const randomPassword = () => b64u(crypto.getRandomValues(new Uint8Array(6)));
export const randomToken = () => b64u(crypto.getRandomValues(new Uint8Array(24)));

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function derive(pass, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256));
}

export async function hashPass(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${hex(salt)}$${hex(await derive(pass, salt, ITER))}`;
}

export async function checkPass(pass, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
  return safeEqual(hex(await derive(pass, unhex(p[2]), Number(p[1]))), p[3]);
}

const hmacKey = (env) => crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function sign(env, payload) {
  const body = b64u(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + 12 * 3600e3 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body));
  return `${body}.${b64u(new Uint8Array(sig))}`;
}

export async function verify(env, token, role) {
  if (!token || !env.SESSION_SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64u(sig), enc.encode(body));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
  if (p.exp < Date.now()) return null;
  if (role && p.role !== role) return null;
  return p;
}

import { db, json, verify, bearer } from '../../lib/shared.js';

const UUID = /^[0-9a-f-]{36}$/i;

async function access(request, env, threadId, token) {
  if (!UUID.test(threadId || '')) return { error: json(400, { error: 'Bad thread' }) };
  const [thread] = await db(env, `threads?id=eq.${threadId}&select=id,order_id`);
  if (!thread) return { error: json(404, { error: 'Not found' }) };
  const [order] = await db(env, `orders?id=eq.${thread.order_id}&select=id,shop_id,access_token`);
  const shop = await verify(env, bearer(request), 'shop');
  const isCustomer = !!token && token === order.access_token;
  const isShop = !!shop && shop.id === order.shop_id;
  if (!isCustomer && !isShop) return { error: json(403, { error: 'Not allowed' }) };
  return { isShop };
}

export async function onRequestGet({ request, env }) {
  try {
    const q = new URL(request.url).searchParams;
    const a = await access(request, env, q.get('thread_id'), q.get('token'));
    if (a.error) return a.error;
    const messages = await db(env, `messages?thread_id=eq.${q.get('thread_id')}&select=sender_type,body,kind,created_at&order=created_at.asc`);
    return json(200, { messages });
  } catch (e) { console.error('chat GET', e.message); return json(500, { error: 'Server error' }); }
}

export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json();
    const a = await access(request, env, b.thread_id, b.token);
    if (a.error) return a.error;
    const text = String(b.body || '').trim().slice(0, 1000);
    if (!text) return json(400, { error: 'Empty message' });
    await db(env, 'messages', { method: 'POST', body: { thread_id: b.thread_id, sender_type: a.isShop ? 'shop' : 'customer', body: text } });
    return json(201, { ok: true });
  } catch (e) { console.error('chat POST', e.message); return json(500, { error: 'Server error' }); }
}

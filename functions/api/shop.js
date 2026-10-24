import { db, json, verify, bearer } from '../../lib/shared.js';

const guard = (request, env) => verify(env, bearer(request), 'shop');
const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));

export async function onRequestGet({ request, env }) {
  const me = await guard(request, env);
  if (!me) return json(401, { error: 'Shop login required' });
  try {
    const products = await db(env, `products?shop_id=eq.${me.id}&select=id,name,category,price,stock,colors,sizes&order=created_at.desc`);
    const orders = await db(env, `orders?shop_id=eq.${me.id}&select=id,order_no,total,payment_method,payment_status,status,created_at,customer:customers(name,phone,address),threads(id)&order=created_at.desc&limit=100`);
    return json(200, { products, orders });
  } catch (e) { console.error('shop GET', e.message); return json(500, { error: 'Server error' }); }
}

export async function onRequestPost({ request, env }) {
  const me = await guard(request, env);
  if (!me) return json(401, { error: 'Shop login required' });
  try {
    const b = await request.json();
    if (!b.name || b.price === undefined) return json(400, { error: 'Name and price are required' });
    const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30);
    await db(env, 'products', { method: 'POST', body: {
      shop_id: me.id, name: String(b.name).slice(0, 120), category: String(b.category || '').slice(0, 60) || null,
      price: num(b.price, 10000000), stock: Math.floor(num(b.stock, 1000000)), colors: list(b.colors), sizes: list(b.sizes)
    } });
    return json(201, { ok: true });
  } catch (e) { console.error('shop POST', e.message); return json(500, { error: 'Server error' }); }
}

export async function onRequestPatch({ request, env }) {
  const me = await guard(request, env);
  if (!me) return json(401, { error: 'Shop login required' });
  try {
    const b = await request.json();
    const patch = {};
    if (b.price !== undefined) patch.price = num(b.price, 10000000);
    if (b.stock !== undefined) patch.stock = Math.floor(num(b.stock, 1000000));
    await db(env, `products?id=eq.${encodeURIComponent(b.product_id)}&shop_id=eq.${me.id}`, { method: 'PATCH', body: patch });
    return json(200, { ok: true });
  } catch (e) { console.error('shop PATCH', e.message); return json(500, { error: 'Server error' }); }
}

import { db, json, randomToken } from '../../lib/shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const b = await request.json();
    const { name, phone, address } = b.customer || {};
    if (!name || !phone || !address) return json(400, { error: 'Name, phone and address are required' });
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return json(400, { error: 'Cart is empty' });
    if (!['cod', 'online'].includes(b.payment)) return json(400, { error: 'Choose a payment method' });

    const ids = [...new Set(b.items.map((i) => i.product_id))];
    const products = await db(env, `products?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,shop_id,price,stock,name`);
    const shopIds = [...new Set(products.map((p) => p.shop_id))];
    if (products.length !== ids.length || shopIds.length !== 1) return json(400, { error: 'Cart must hold products from one shop' });

    let total = 0;
    const lines = [];
    for (const i of b.items) {
      const p = products.find((x) => x.id === i.product_id);
      const qty = Math.max(1, Math.min(999, parseInt(i.qty, 10) || 1));
      if (p.stock < qty) return json(409, { error: `Not enough stock for ${p.name}` });
      total += Number(p.price) * qty;
      lines.push({ product_id: p.id, qty, unit_price: p.price });
    }

    const [cust] = await db(env, 'customers?on_conflict=phone', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: { name, phone, address }
    });
    const access_token = randomToken();
    const [order] = await db(env, 'orders', {
      method: 'POST', prefer: 'return=representation',
      body: { customer_id: cust.id, shop_id: shopIds[0], payment_method: b.payment, payment_status: 'unpaid', total, access_token }
    });
    await db(env, 'order_items', { method: 'POST', body: lines.map((l) => ({ ...l, order_id: order.id })) });
    const [thread] = await db(env, 'threads', { method: 'POST', prefer: 'return=representation', body: { order_id: order.id } });
    await db(env, 'messages', { method: 'POST', body: [{ thread_id: thread.id, sender_type: 'customer', sender_id: cust.id, body: 'Assalamu Alaikum' }] });
    await db(env, 'notifications', { method: 'POST', body: { shop_id: shopIds[0], order_id: order.id, channel: 'app', status: 'queued', message: `New order #${order.order_no}` } });

    return json(201, { order_no: order.order_no, total, access_token, thread_id: thread.id });
  } catch (e) {
    console.error('orders', e.message);
    return json(500, { error: 'Could not place the order. Please try again.' });
  }
}

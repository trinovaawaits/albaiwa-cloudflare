import { db, json } from '../../lib/shared.js';

export async function onRequestGet({ env }) {
  try {
    const shops = await db(env, 'shops?active=eq.true&select=id,name,market,hours,logo_url');
    const products = await db(env, 'products?select=id,shop_id,name,category,price,stock,colors,sizes,image_url&order=created_at.desc');
    return json(200, { shops, products });
  } catch (e) {
    console.error('catalog', e.message);
    return json(500, { error: 'Server error' });
  }
}

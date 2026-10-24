import { db, json, verify, bearer, hashPass, randomPassword } from '../../lib/shared.js';

const guard = (request, env) => verify(env, bearer(request), 'owner');

export async function onRequestGet({ request, env }) {
  if (!(await guard(request, env))) return json(401, { error: 'Owner login required' });
  try {
    const shops = await db(env, 'shops?select=id,name,market,hours,login_code,active,created_at&order=created_at.desc');
    return json(200, { shops });
  } catch (e) { console.error('owner GET', e.message); return json(500, { error: 'Server error' }); }
}

export async function onRequestPost({ request, env }) {
  if (!(await guard(request, env))) return json(401, { error: 'Owner login required' });
  try {
    const b = await request.json();
    if (!b.name || !b.login_code) return json(400, { error: 'Name and shop code are required' });
    const password = randomPassword();
    const [shop] = await db(env, 'shops', {
      method: 'POST', prefer: 'return=representation',
      body: { name: b.name, market: b.market || null, hours: b.hours || null, login_code: b.login_code, pass_hash: await hashPass(password) }
    });
    return json(201, { shop: { id: shop.id, name: shop.name, login_code: shop.login_code }, temporary_password: password });
  } catch (e) {
    console.error('owner POST', e.message);
    return json(500, { error: 'Could not create the shop (the shop code may already be used)' });
  }
}

export async function onRequestPatch({ request, env }) {
  if (!(await guard(request, env))) return json(401, { error: 'Owner login required' });
  try {
    const b = await request.json();
    const id = encodeURIComponent(b.shop_id);
    if (b.action === 'active') {
      await db(env, `shops?id=eq.${id}`, { method: 'PATCH', body: { active: !!b.active } });
      return json(200, { ok: true });
    }
    const password = randomPassword();
    await db(env, `shops?id=eq.${id}`, { method: 'PATCH', body: { pass_hash: await hashPass(password) } });
    return json(200, { temporary_password: password });
  } catch (e) { console.error('owner PATCH', e.message); return json(500, { error: 'Server error' }); }
}

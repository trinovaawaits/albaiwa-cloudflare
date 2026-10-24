import { db, json, checkPass, sign, safeEqual } from '../../lib/shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const { role, username, code, password } = await request.json();
    if (typeof password !== 'string' || password.length > 200) return json(400, { error: 'Invalid request' });

    if (role === 'owner') {
      const ok = env.OWNER_USERNAME && env.OWNER_PASSWORD &&
        safeEqual(username || '', env.OWNER_USERNAME) && safeEqual(password, env.OWNER_PASSWORD);
      if (!ok) return json(401, { error: 'Wrong details' });
      return json(200, { token: await sign(env, { role: 'owner', id: 'owner' }) });
    }

    if (role === 'shop') {
      const rows = await db(env, `shops?login_code=eq.${encodeURIComponent(String(code || ''))}&active=eq.true&select=id,pass_hash`);
      const s = rows[0];
      if (!s || !(await checkPass(password, s.pass_hash))) return json(401, { error: 'Wrong details' });
      return json(200, { token: await sign(env, { role: 'shop', id: s.id }) });
    }

    return json(400, { error: 'Unknown role' });
  } catch (e) {
    console.error('login', e.message);
    return json(500, { error: 'Server error' });
  }
}

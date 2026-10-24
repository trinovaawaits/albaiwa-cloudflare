// Hidden entry: tap a logo 3 times quickly.
// Footer logo (data-secret="owner") opens the owner login. A shop logo (data-secret="shop") opens the shop login.
(function () {
  function openLogin(role) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:grid;place-items:center;z-index:999';
    const box = document.createElement('form');
    box.style.cssText = 'background:#fff;padding:24px;border-radius:14px;width:min(340px,90vw);font-family:system-ui;color:#12302F';
    const title = document.createElement('h3');
    title.textContent = role === 'owner' ? 'Owner login' : 'Shop login';
    const field = (label, type) => {
      const l = document.createElement('label');
      l.style.cssText = 'display:block;font-size:13px;margin-bottom:10px';
      l.textContent = label;
      const i = document.createElement('input');
      i.type = type; i.autocomplete = type === 'password' ? 'current-password' : 'off';
      i.style.cssText = 'display:block;width:100%;padding:10px;margin-top:4px;font-size:16px;border:1px solid #ccc;border-radius:8px';
      l.appendChild(i);
      return l;
    };
    const err = document.createElement('div');
    err.style.cssText = 'color:#b00020;font-size:13px;min-height:18px';
    const btn = document.createElement('button');
    btn.textContent = 'Sign in';
    btn.style.cssText = 'width:100%;padding:11px;background:#0E5552;color:#fff;border:0;border-radius:8px;font-size:15px';
    box.append(title, field(role === 'owner' ? 'Username' : 'Shop code', 'text'), field('Password', 'password'), err, btn);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    const [userEl, passEl] = box.querySelectorAll('input');

    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true; err.textContent = '';
      const payload = role === 'owner'
        ? { role, username: userEl.value.trim(), password: passEl.value }
        : { role, code: userEl.value.trim().toUpperCase(), password: passEl.value };
      try {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Login failed');
        sessionStorage.setItem('ab_token_' + role, data.token);
        location.href = role === 'owner' ? '/owner.html' : '/shop.html';
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
      }
    });
    setTimeout(() => userEl.focus(), 50);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  }

  function tripleTap(el, role) {
    let taps = 0, timer;
    el.addEventListener('click', () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => (taps = 0), 800);
      if (taps >= 3) { taps = 0; openLogin(role); }
    });
  }

  window.ABSecret = { bind: tripleTap };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-secret="owner"]').forEach((el) => tripleTap(el, 'owner'));
    document.querySelectorAll('[data-secret="shop"]').forEach((el) => tripleTap(el, 'shop'));
  });
})();

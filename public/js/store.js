(function () {
  const { api, esc, money } = AB;
  const app = document.getElementById('app');
  const S = { shops: [], products: [], cart: {}, shopId: null, q: '', timer: null, activeOrder: null };

  // Theme: dark teal (default) or white. Remembered on this device.
  function applyTheme(t) { document.body.classList.toggle('dark', t !== 'light'); }
  applyTheme(localStorage.getItem('ab_theme') || 'dark');
  document.getElementById('theme').addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('ab_theme', next); applyTheme(next);
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

  const savedOrders = () => JSON.parse(localStorage.getItem('ab_orders') || '[]');
  const bubbles = (msgs) => msgs.map((m) => `<div class="bub ${m.sender_type === 'customer' ? 'me' : ''}">${esc(m.body)}</div>`).join('');

  function home() {
    S.shopId = null;
    app.innerHTML = `
      <section class="hero tex">
        <div class="big"><img src="/assets/albaiwa-mark.png" alt=""></div>
        <img class="hero-wm" src="/assets/albaiwa-wordmark.png" alt="البيع والشراء">
        <p>Buy and sell across Lahore’s markets, in one place.</p>
        <input id="q" class="search" placeholder="Search products across all shops" value="${esc(S.q)}">
      </section>
      <div id="res"></div>
      <div class="sec-h"><h2>Shops</h2></div>
      <div class="grid">${S.shops.map((s) => `
        <a class="card" href="#/shop/${s.id}"><b>${esc(s.name)}</b><div class="meta">${esc(s.market || '')} · ${esc(s.hours || '')}</div></a>`).join('') || '<p class="meta">No shops yet.</p>'}</div>
      ${savedOrders().length ? `<div class="sec-h"><h2>Your orders</h2></div>${savedOrders().map((o, i) => `
        <div class="row"><div class="grow"><b>Order #${o.n}</b><div class="meta">${money(o.total)}</div></div><button class="g" data-open="${i}">Open chat</button></div>`).join('')}` : ''}`;
    document.getElementById('q').addEventListener('input', (e) => { S.q = e.target.value; results(); });
    results();
  }

  function results() {
    const box = document.getElementById('res'); if (!box) return;
    const q = S.q.trim().toLowerCase();
    const list = q ? S.products.filter((p) => (p.name + ' ' + (p.category || '')).toLowerCase().includes(q)).slice(0, 40) : [];
    box.innerHTML = list.map((p) => {
      const s = S.shops.find((x) => x.id === p.shop_id); if (!s) return '';
      return `<a class="row" href="#/shop/${s.id}"><div class="grow"><b>${esc(p.name)}</b><div class="meta">${esc(s.name)} · ${p.stock > 0 ? 'In stock' : 'Out of stock'}</div></div><div class="price">${money(p.price)}</div></a>`;
    }).join('');
  }

  function shop(id) {
    const s = S.shops.find((x) => x.id === id);
    if (!s) { app.innerHTML = '<p>Shop not found.</p>'; return; }
    if (S.shopId !== id) { S.cart = {}; S.shopId = id; }
    const items = S.products.filter((p) => p.shop_id === id);
    app.innerHTML = `
      <header class="shop-h"><img class="shop-logo" data-shoplogo src="${esc(s.logo_url || '/assets/albaiwa-mark.png')}" alt="">
        <div><h2 style="margin:0">${esc(s.name)}</h2><div class="meta">${esc(s.market || '')} · ${esc(s.hours || '')}</div></div></header>
      <div class="two"><section>${items.map((p) => `
        <div class="row"><div class="grow"><b>${esc(p.name)}</b><div class="meta">${esc(p.category || '')} · ${p.stock > 0 ? 'In stock' : 'Out of stock'}</div></div>
        <div class="price">${money(p.price)}</div><button data-add="${p.id}" ${p.stock > 0 ? '' : 'disabled'}>Add</button></div>`).join('') || '<p class="meta">No products yet.</p>'}</section>
      <aside id="cart"></aside></div>`;
    window.ABSecret && ABSecret.bind(app.querySelector('[data-shoplogo]'), 'shop');
    cart();
  }

  function cart() {
    const box = document.getElementById('cart'); if (!box) return;
    const ids = Object.keys(S.cart);
    if (!ids.length) { box.innerHTML = '<div class="card"><b>Your cart is empty</b><div class="meta">Add products to checkout.</div></div>'; return; }
    let total = 0;
    const lines = ids.map((id) => {
      const p = S.products.find((x) => x.id === id); const q = S.cart[id]; total += p.price * q;
      return `<div class="row"><div class="grow"><b>${esc(p.name)}</b><div class="meta">${money(p.price)} each</div></div>
        <button class="g" data-dec="${id}">−</button><b>${q}</b><button class="g" data-inc="${id}">+</button></div>`;
    }).join('');
    box.innerHTML = `${lines}<div class="card form"><b>Total: ${money(total)}</b>
      <form id="checkout">
        <input name="name" placeholder="Your name" required>
        <input name="phone" placeholder="Phone (03xx-xxxxxxx)" required>
        <textarea name="address" placeholder="Delivery address" required rows="2"></textarea>
        <select name="payment"><option value="cod">Cash on delivery</option><option value="online">Online payment (coming soon)</option></select>
        <button>Place order</button>
      </form></div>`;
  }

  function openChat(order) {
    S.activeOrder = order;
    const old = document.getElementById('chat'); if (old) old.remove();
    app.insertAdjacentHTML('beforeend', `<section class="chat tex" id="chat"><b>Order #${order.n} chat</b>
      <div id="msgs" class="msgs"></div>
      <form id="sendf" class="compose"><input name="m" placeholder="Type a message" autocomplete="off"><button>Send</button></form></section>`);
    const load = async () => {
      try {
        const d = await api(`chat?thread_id=${order.thread}&token=${order.token}`);
        const box = document.getElementById('msgs'); if (!box) return;
        box.innerHTML = bubbles(d.messages); box.scrollTop = box.scrollHeight;
      } catch (e) { /* keep polling */ }
    };
    load();
    clearInterval(S.timer); S.timer = setInterval(load, 5000);
    document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
  }

  app.addEventListener('click', (e) => {
    const t = e.target;
    const add = t.closest('[data-add]'); if (add) { S.cart[add.dataset.add] = (S.cart[add.dataset.add] || 0) + 1; cart(); return; }
    const inc = t.closest('[data-inc]'); if (inc) { S.cart[inc.dataset.inc]++; cart(); return; }
    const dec = t.closest('[data-dec]'); if (dec) { S.cart[dec.dataset.dec]--; if (S.cart[dec.dataset.dec] <= 0) delete S.cart[dec.dataset.dec]; cart(); return; }
    const op = t.closest('[data-open]'); if (op) openChat(savedOrders()[Number(op.dataset.open)]);
  });

  app.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'checkout') {
      try {
        const body = {
          customer: { name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim() },
          payment: f.payment.value,
          items: Object.entries(S.cart).map(([product_id, qty]) => ({ product_id, qty }))
        };
        const d = await api('orders', { method: 'POST', body: JSON.stringify(body) });
        const orders = savedOrders();
        const order = { n: d.order_no, total: d.total, token: d.access_token, thread: d.thread_id };
        orders.unshift(order); localStorage.setItem('ab_orders', JSON.stringify(orders.slice(0, 20)));
        S.cart = {}; shop(S.shopId);
        AB.toast('Order #' + d.order_no + ' placed. Your chat is open below.');
        openChat(order);
      } catch (err) { AB.toast(err.message); }
    }
    if (f.id === 'sendf' && S.activeOrder) {
      const text = f.m.value.trim(); if (!text) return;
      try {
        await api('chat', { method: 'POST', body: JSON.stringify({ thread_id: S.activeOrder.thread, token: S.activeOrder.token, body: text }) });
        f.m.value = '';
        const d = await api(`chat?thread_id=${S.activeOrder.thread}&token=${S.activeOrder.token}`);
        document.getElementById('msgs').innerHTML = bubbles(d.messages);
      } catch (err) { AB.toast(err.message); }
    }
  });

  function route() {
    const parts = (location.hash || '#/').slice(2).split('/');
    if (parts[0] === 'shop' && parts[1]) shop(parts[1]); else home();
  }

  async function init() {
    try {
      const d = await api('catalog');
      S.shops = d.shops; S.products = d.products;
    } catch (e) { app.innerHTML = '<p>Could not load the shops. Please refresh.</p>'; return; }
    route();
  }
  window.addEventListener('hashchange', route);
  init();
})();

(function () {
  const { api, esc, money, toast } = AB;
  const app = document.getElementById('app');
  if (!sessionStorage.getItem('ab_token_shop')) { location.replace('/'); return; }
  const role = 'shop';
  let activeThread = null, timer = null;

  document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem('ab_token_shop'); location.replace('/'); });

  async function load() {
    const d = await api('shop', {}, role);
    render(d.products, d.orders);
  }

  function render(products, orders) {
    app.innerHTML = `
      <h2>Add product</h2>
      <form id="addp" class="form">
        <input name="name" placeholder="Product name" required>
        <input name="category" placeholder="Category (write your own)">
        <input name="price" type="number" step="0.01" placeholder="Price (Rs)" required>
        <input name="stock" type="number" placeholder="Stock" value="10">
        <input name="colors" placeholder="Colours, comma separated">
        <input name="sizes" placeholder="Sizes, comma separated">
        <button>Add product</button>
      </form>
      <h2>Products</h2>
      ${products.map((p) => `
        <div class="row">
          <div style="flex:1"><b>${esc(p.name)}</b><div class="meta">${esc(p.category || '')}</div></div>
          <input type="number" step="0.01" value="${p.price}" data-price="${p.id}">
          <input type="number" value="${p.stock}" data-stock="${p.id}">
          <button data-save="${p.id}">Save</button>
        </div>`).join('') || '<p class="meta">No products yet.</p>'}
      <h2>Orders</h2>
      ${orders.map((o) => `
        <div class="row">
          <div style="flex:1"><b>#${o.order_no}</b> ${esc(o.customer?.name || '')} · ${esc(o.customer?.phone || '')}
            <div class="meta">${esc(o.customer?.address || '')} · ${money(o.total)} · ${esc(o.payment_method.toUpperCase())}</div></div>
          ${o.threads && o.threads[0] ? `<button class="g" data-chat="${o.threads[0].id}" data-no="${o.order_no}">Chat</button>` : ''}
        </div>`).join('') || '<p class="meta">No orders yet.</p>'}
      <div id="chat"></div>`;
  }

  app.addEventListener('submit', async (e) => {
    if (e.target.id === 'addp') {
      e.preventDefault();
      const f = e.target;
      try {
        await api('shop', { method: 'POST', body: JSON.stringify({
          name: f.name.value, category: f.category.value, price: f.price.value, stock: f.stock.value, colors: f.colors.value, sizes: f.sizes.value
        }) }, role);
        toast('Product added'); await load();
      } catch (err) { toast(err.message); }
    }
    if (e.target.id === 'sendm' && activeThread) {
      e.preventDefault();
      const txt = e.target.m.value.trim(); if (!txt) return;
      try {
        await api('chat', { method: 'POST', body: JSON.stringify({ thread_id: activeThread, body: txt }) }, role);
        e.target.m.value = ''; pollChat();
      } catch (err) { toast(err.message); }
    }
  });

  app.addEventListener('click', async (e) => {
    const save = e.target.closest('[data-save]');
    const chat = e.target.closest('[data-chat]');
    try {
      if (save) {
        const id = save.dataset.save;
        const price = app.querySelector(`[data-price="${id}"]`).value;
        const stock = app.querySelector(`[data-stock="${id}"]`).value;
        await api('shop', { method: 'PATCH', body: JSON.stringify({ product_id: id, price, stock }) }, role);
        toast('Saved');
      }
      if (chat) openChat(chat.dataset.chat, chat.dataset.no);
    } catch (err) { toast(err.message); }
  });

  function openChat(threadId, no) {
    activeThread = threadId;
    document.getElementById('chat').innerHTML = `
      <section class="chat"><b>Order #${esc(no)} chat</b>
        <div id="msgs" class="msgs"></div>
        <form id="sendm" class="compose"><input name="m" placeholder="Reply to customer" autocomplete="off"><button>Send</button></form>
      </section>`;
    clearInterval(timer); pollChat(); timer = setInterval(pollChat, 5000);
  }

  async function pollChat() {
    if (!activeThread) return;
    try {
      const d = await api('chat?thread_id=' + activeThread, {}, role);
      const box = document.getElementById('msgs'); if (!box) return;
      box.innerHTML = d.messages.map((m) => `<div class="bub ${m.sender_type === 'shop' ? 'me' : ''}">${esc(m.body)}</div>`).join('');
      box.scrollTop = box.scrollHeight;
    } catch (e) { /* keep polling */ }
  }

  load().catch(() => { sessionStorage.removeItem('ab_token_shop'); location.replace('/'); });
})();

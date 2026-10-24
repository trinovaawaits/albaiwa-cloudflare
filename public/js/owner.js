(function () {
  const { api, esc, toast } = AB;
  const app = document.getElementById('app');
  if (!sessionStorage.getItem('ab_token_owner')) { location.replace('/'); return; }
  const role = 'owner';
  let shops = [];

  document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem('ab_token_owner'); location.replace('/'); });

  function show(pwHtml) {
    app.innerHTML = `
      <h2>Shops & memberships</h2>
      <form id="newshop" class="form">
        <b>Activate a new shop (membership paid)</b>
        <input name="name" placeholder="Shop name" required>
        <input name="market" placeholder="Market, e.g. Shah Alam Market">
        <input name="hours" placeholder="Hours, e.g. 9am–9pm">
        <input name="login_code" placeholder="Shop code, e.g. SHAH01" required>
        <button>Create shop & generate password</button>
      </form>
      <div id="pw">${pwHtml || ''}</div>
      <h3>All shops</h3>
      ${shops.map((s) => `
        <div class="row">
          <div><b>${esc(s.name)}</b><div class="meta">${esc(s.market || '')} · code ${esc(s.login_code)} · ${s.active ? 'Active' : 'Inactive'}</div></div>
          <button class="g" data-toggle="${s.id}" data-active="${s.active}">${s.active ? 'Deactivate' : 'Activate'}</button>
          <button class="g" data-reset="${s.id}">Reset password</button>
        </div>`).join('') || '<p class="meta">No shops yet.</p>'}`;
  }

  function showPassword(label, code, password) {
    return `<div class="pw-box"><b>${esc(label)}</b><div>Shop code: <b>${esc(code)}</b></div><div>New password: <b>${esc(password)}</b></div><div class="meta">Shown once. Give it to the shopkeeper now.</div></div>`;
  }

  async function load(pwHtml) {
    const d = await api('owner', {}, role);
    shops = d.shops; show(pwHtml);
  }

  app.addEventListener('submit', async (e) => {
    if (e.target.id !== 'newshop') return;
    e.preventDefault();
    const f = e.target;
    try {
      const d = await api('owner', { method: 'POST', body: JSON.stringify({
        name: f.name.value.trim(), market: f.market.value.trim(), hours: f.hours.value.trim(), login_code: f.login_code.value.trim().toUpperCase()
      }) }, role);
      await load(showPassword('Shop created: ' + d.shop.name, d.shop.login_code, d.temporary_password));
      toast('Shop created');
    } catch (err) { toast(err.message); }
  });

  app.addEventListener('click', async (e) => {
    const tg = e.target.closest('[data-toggle]');
    const rs = e.target.closest('[data-reset]');
    try {
      if (tg) {
        await api('owner', { method: 'PATCH', body: JSON.stringify({ shop_id: tg.dataset.toggle, action: 'active', active: tg.dataset.active !== 'true' }) }, role);
        await load();
      }
      if (rs) {
        const d = await api('owner', { method: 'PATCH', body: JSON.stringify({ shop_id: rs.dataset.reset }) }, role);
        const s = shops.find((x) => x.id === rs.dataset.reset);
        await load(showPassword('Password reset: ' + (s ? s.name : ''), s ? s.login_code : '', d.temporary_password));
      }
    } catch (err) { toast(err.message); }
  });

  load().catch(() => { sessionStorage.removeItem('ab_token_owner'); location.replace('/'); });
})();

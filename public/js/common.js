window.AB = {
  async api(path, opts = {}, role) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const token = role ? sessionStorage.getItem('ab_token_' + role) : null;
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch('/api/' + path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  money(n) { return 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-PK'); },
  toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }
};

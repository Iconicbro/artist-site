/* Store admin app. Talks to /api/admin/*. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = c => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = s => { if (!s) return ''; const d = new Date(s.replace(' ', 'T') + 'Z'); return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const statusLabel = { pending: 'Unpaid', paid: 'To ship', shipped: 'Shipped', cancelled: 'Cancelled' };

  async function api(path, { method = 'GET', body, form } = {}) {
    const res = await fetch(`/api/admin${path}`, {
      method, headers: { 'X-Requested-With': 'madscope-admin', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
    if (res.status === 401 && path !== '/login') { showLogin(); throw new Error('Please log in again.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
    return data;
  }
  let toastT;
  const toast = (msg, err) => { const t = $('#toast'); t.textContent = msg; t.className = `toast on${err ? ' err' : ''}`; clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast', 3200); };

  /* ---------- login ---------- */
  const showLogin = () => { $('#app').hidden = true; $('#login').hidden = false; $('#login-form [name=email]').focus(); };
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, msg = $('#login-msg');
    msg.textContent = '';
    try { await api('/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } }); f.password.value = ''; start(); }
    catch (err) { msg.textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await api('/logout', { method: 'POST' }).catch(() => {}); showLogin(); });

  /* ---------- tabs ---------- */
  const loaders = {};
  function go() {
    const tab = (location.hash || '#today').slice(1);
    const name = loaders[tab] ? tab : 'today';
    $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== name);
    $$('[data-tab]').forEach(a => a.dataset.tab === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    loaders[name]().catch(err => toast(err.message, true));
  }
  addEventListener('hashchange', go);

  async function start() {
    try {
      const me = await api('/me');
      $('#me').textContent = me.email;
      $('#pay-mode').textContent = me.stripe ? 'Stripe test checkout' : 'Demo mode (no Stripe key)';
    } catch { return showLogin(); }
    $('#login').hidden = true; $('#app').hidden = false;
    go();
  }

  /* ---------- orders (shared rendering) ---------- */
  const orderHTML = o => `
    <details class="order" data-id="${o.id}">
      <summary>
        <span class="order__num">${esc(o.number)}</span>
        <span class="order__who"><b>${esc(o.name)}</b><span>${o.items.reduce((n, i) => n + i.qty, 0)} item(s) · ${when(o.paid_at || o.created_at)}</span></span>
        <span class="order__total">${money(o.total_cents)}</span>
        <span class="badge badge--${o.status}">${statusLabel[o.status]}</span>
      </summary>
      <div class="order__body">
        <ul>${o.items.map(i => `<li>${i.qty} × ${esc(i.product_name)} <span class="muted">(${esc(i.size)}, ${esc(i.color)})</span></li>`).join('')}
          ${o.discount_code ? `<li class="muted">Code ${esc(o.discount_code)}: −${money(o.discount_cents)}</li>` : ''}
          <li class="muted">Shipping: ${o.shipping_cents ? money(o.shipping_cents) : 'free'}</li></ul>
        <address>${esc(o.name)}<br>${esc(o.address1)}${o.address2 ? '<br>' + esc(o.address2) : ''}<br>${esc(o.city)}${o.region ? ', ' + esc(o.region) : ''} ${esc(o.postcode)}<br>${esc(o.country)}<br><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></address>
        <div>${o.status === 'paid' ? `<button class="btn btn--red ship" type="button">Mark as shipped</button>` : o.status === 'shipped' ? `<p class="muted">Shipped ${when(o.shipped_at)}</p>` : `<p class="muted">Not paid yet.<br>Don't ship this.</p>`}</div>
      </div>
    </details>`;
  document.addEventListener('click', async e => {
    const b = e.target.closest('.ship'); if (!b) return;
    const box = b.closest('.order'); b.disabled = true; b.textContent = 'Saving…';
    try {
      const o = await api(`/orders/${box.dataset.id}/ship`, { method: 'POST' });
      toast(`${o.number} marked as shipped. The customer has been emailed.`);
      (location.hash === '#orders' ? loaders.orders : loaders.today)();
    } catch (err) { toast(err.message, true); b.disabled = false; b.textContent = 'Mark as shipped'; }
  });

  /* ---------- Today ---------- */
  loaders.today = async () => {
    const [d, toShip] = await Promise.all([api('/dashboard'), api('/orders?status=paid')]);
    $('#stats').innerHTML = `
      <div class="stat"><b>${money(d.today.sales)}</b><span>Sales today</span></div>
      <div class="stat"><b>${d.today.orders}</b><span>Orders today</span></div>
      <div class="stat${d.to_ship ? ' stat--alert' : ''}"><b>${d.to_ship}</b><span>Waiting to ship</span></div>
      <div class="stat"><b>${money(d.week.sales)}</b><span>Sales, last 7 days</span></div>`;
    $('#to-ship').innerHTML = toShip.length ? toShip.map(orderHTML).join('') : '<p class="empty-note">Nothing to ship. All caught up.</p>';
    $('#low-stock').innerHTML = d.low_stock.length
      ? `<p class="muted">${d.low_stock_threshold} or fewer left. Update stock under Products.</p><ul class="low">${d.low_stock.map(v => `<li><span>${esc(v.name)} <span class="muted">${esc(v.size)} / ${esc(v.color)}</span></span><b>${v.stock ? `${v.stock} left` : 'Sold out'}</b></li>`).join('')}</ul>`
      : '<p class="empty-note">Everything is well stocked.</p>';
  };

  /* ---------- Orders ---------- */
  let filter = '';
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
    loaders.orders();
  }));
  loaders.orders = async () => {
    const list = await api(`/orders${filter ? `?status=${filter}` : ''}`);
    $('#orders-list').innerHTML = list.length ? list.map(orderHTML).join('') : '<p class="empty-note">No orders here yet.</p>';
  };

  /* ---------- Products ---------- */
  const LOW = 5;
  const prodHTML = p => `
    <article class="prod" data-id="${p.id}">
      <img src="${esc(p.images[0])}" alt="" width="96" height="96" />
      <div>
        <div class="prod__head"><b>${esc(p.name)}</b>
          <span class="toggles">
            <label><input type="checkbox" data-field="active" ${p.active ? 'checked' : ''} /> For sale</label>
            <label><input type="checkbox" data-field="featured" ${p.featured ? 'checked' : ''} /> On home page</label>
            <a href="/shop/p/${esc(p.slug)}" target="_blank" rel="noopener">View</a>
          </span></div>
        <p class="prod__meta">${esc(p.category)} · Price $<input data-field="price" value="${(p.price_cents / 100).toFixed(2)}" inputmode="decimal" aria-label="Price of ${esc(p.name)}" /> · ${p.stock_total} in stock</p>
        <div class="stock-grid">${p.variants.map(v => `<label class="stock-cell${v.stock <= LOW ? ' low' : ''}">${esc(v.size)} / ${esc(v.color)}<input data-variant="${v.id}" value="${v.stock}" inputmode="numeric" aria-label="Stock for ${esc(p.name)} ${esc(v.size)} ${esc(v.color)}" /></label>`).join('')}</div>
      </div>
    </article>`;
  loaders.products = async () => { $('#products-list').innerHTML = (await api('/products')).map(prodHTML).join(''); };
  $('#products-list').addEventListener('change', async e => {
    const art = e.target.closest('.prod'); if (!art) return;
    try {
      if (e.target.dataset.variant) {
        const v = await api(`/variants/${e.target.dataset.variant}`, { method: 'PUT', body: { stock: e.target.value } });
        e.target.closest('.stock-cell').classList.toggle('low', v.stock <= LOW);
        toast('Stock updated.');
      } else if (e.target.dataset.field) {
        const f = e.target.dataset.field;
        await api(`/products/${art.dataset.id}`, { method: 'PATCH', body: { [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } });
        toast(f === 'active' ? (e.target.checked ? 'Now for sale.' : 'Hidden from the shop.') : f === 'featured' ? 'Home page updated.' : 'Price updated.');
      }
    } catch (err) { toast(err.message, true); loaders.products(); }
  });

  // new product with drag-and-drop photos
  let files = [];
  const npForm = $('#new-product'), drop = $('#drop'), picker = $('#photos');
  const showPreviews = () => { $('#previews').innerHTML = files.map((f, i) => `<figure><img src="${URL.createObjectURL(f)}" alt="" /><figcaption>${i ? `Photo ${i + 1}` : 'Main photo'}</figcaption></figure>`).join(''); };
  const addFiles = list => { files = [...files, ...[...list].filter(f => f.type.startsWith('image/'))].slice(0, 8); showPreviews(); };
  $('#new-product-btn').addEventListener('click', () => { npForm.hidden = false; npForm.name.focus(); });
  $('#np-cancel').addEventListener('click', () => { npForm.hidden = true; npForm.reset(); files = []; showPreviews(); $('#np-msg').textContent = ''; });
  drop.addEventListener('click', () => picker.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } });
  picker.addEventListener('change', () => { addFiles(picker.files); picker.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  npForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#np-msg'); msg.textContent = '';
    if (!files.length) { msg.textContent = 'Add at least one photo.'; return; }
    const fd = new FormData(npForm);
    fd.set('featured', npForm.featured.checked ? 'true' : 'false');
    files.forEach(f => fd.append('photos', f));
    const btn = $('button[type=submit]', npForm); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const p = await api('/products', { method: 'POST', form: fd });
      toast(`${p.name} is now in the shop.`);
      npForm.reset(); files = []; showPreviews(); npForm.hidden = true;
      loaders.products();
    } catch (err) { msg.textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = 'Save product'; }
  });

  /* ---------- Discount codes ---------- */
  loaders.codes = async () => {
    const codes = await api('/discounts');
    $('#codes-list').innerHTML = `<table class="list"><thead><tr><th>Code</th><th>Discount</th><th>Times used</th><th>Status</th><th></th></tr></thead><tbody>${
      codes.map(c => `<tr><td><b>${esc(c.code)}</b></td><td>${c.kind === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}</td><td>${c.uses}</td>
      <td>${c.active ? 'Active' : '<span class="muted">Turned off</span>'}</td><td><button type="button" data-code="${esc(c.code)}" data-on="${c.active ? 0 : 1}">${c.active ? 'Turn off' : 'Turn on'}</button></td></tr>`).join('')}</tbody></table>`;
  };
  $('#codes-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-code]'); if (!b) return;
    try { await api(`/discounts/${encodeURIComponent(b.dataset.code)}`, { method: 'PATCH', body: { active: b.dataset.on === '1' } }); loaders.codes(); }
    catch (err) { toast(err.message, true); }
  });
  $('#new-code').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, msg = $('#code-msg'); msg.textContent = '';
    try { const c = await api('/discounts', { method: 'POST', body: { code: f.code.value, kind: f.kind.value, value: f.value.value } }); f.reset(); toast(`${c.code} added.`); loaders.codes(); }
    catch (err) { msg.textContent = err.message; }
  });

  /* ---------- Emails ---------- */
  loaders.emails = async () => {
    const [list, me] = await Promise.all([api('/emails'), api('/me')]);
    $('#email-mode').textContent = 'Every confirmation and shipping email is listed here. Click one to see exactly what the customer received.';
    $('#emails-list').innerHTML = list.length ? `<ul>${list.map(m => `<li><button type="button" data-email="${m.id}">${esc(m.subject)}<span>To ${esc(m.to_addr)} · ${when(m.created_at)}${m.status === 'saved' ? '' : ` · ${esc(m.status)}`}</span></button></li>`).join('')}</ul>` : '<p class="empty-note">No emails yet. They appear here after a customer pays or an order ships.</p>';
    const first = $('[data-email]'); if (first) first.click(); else $('#email-view').removeAttribute('src');
  };
  $('#emails-list').addEventListener('click', e => {
    const b = e.target.closest('[data-email]'); if (!b) return;
    $$('[data-email]').forEach(x => x.setAttribute('aria-current', x === b));
    $('#email-view').src = `/api/admin/emails/${b.dataset.email}`;
  });

  /* ---------- Account ---------- */
  loaders.account = async () => {};
  $('#pw-form').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, msg = $('#pw-msg');
    try { await api('/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } }); f.reset(); msg.className = 'form-msg ok'; msg.textContent = 'Password changed.'; }
    catch (err) { msg.className = 'form-msg err'; msg.textContent = err.message; }
  });

  start();
})();

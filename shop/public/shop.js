/* Madscope merch store: cart (kept in the browser), product options, cart + checkout page. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY = 'madscope-cart', CODE = 'madscope-code';
  const money = c => `$${(c / 100).toFixed(2)}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const cart = {
    get: () => load(KEY, []).filter(i => i && i.variantId && i.qty > 0),
    set(items) { save(KEY, items); badge(); },
    add(variantId, qty) {
      const items = cart.get(), hit = items.find(i => i.variantId === variantId);
      hit ? hit.qty += qty : items.push({ variantId, qty });
      cart.set(items);
    },
  };
  function badge() {
    const n = cart.get().reduce((s, i) => s + i.qty, 0);
    $$('[data-cart-count]').forEach(b => { b.textContent = n; b.hidden = !n; });
  }
  badge();
  addEventListener('storage', e => e.key === KEY && badge());

  const api = async (url, body) => {
    const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  };

  /* ---------------- Product page ---------------- */
  const P = window.PRODUCT;
  if (P) {
    const form = $('#buy'), note = $('#stock-note'), msg = $('#buy-msg'), qty = $('#qty'), img = $('#p-img');
    const color = () => ($('input[name=color]:checked', form) || {}).value || P.colors[0];
    const size = () => ($('input[name=size]:checked', form) || {}).value;
    const variant = () => P.variants.find(v => v.color === color() && v.size === size());
    if (P.sizes.length === 1) $('input[name=size]', form).checked = true;

    const refresh = () => {
      // grey out sizes that are sold out in the chosen colour
      $$('input[name=size]', form).forEach(r => {
        const v = P.variants.find(v => v.color === color() && v.size === r.value);
        r.disabled = !v || v.stock <= 0;
        if (r.disabled && r.checked) r.checked = false;
      });
      if ($('#color-name')) $('#color-name').textContent = color();
      if (P.color_images[color()]) { img.src = P.color_images[color()]; img.alt = `${P.name} in ${color()}`; }
      const v = variant();
      note.textContent = !v ? '' : v.stock <= 0 ? 'Sold out' : v.stock <= 5 ? `Only ${v.stock} left` : '';
      qty.max = v ? Math.min(10, v.stock) : 10;
      $('#add').disabled = P.variants.every(v => v.stock <= 0);
      if ($('#add').disabled) $('#add').textContent = 'Sold out';
    };
    form.addEventListener('change', () => { msg.textContent = ''; refresh(); });
    $$('[data-step]', form).forEach(b => b.addEventListener('click', () => {
      qty.value = Math.max(1, Math.min(+qty.max || 10, (+qty.value || 1) + +b.dataset.step));
    }));
    $$('.thumb').forEach(t => t.addEventListener('click', () => { img.src = t.dataset.src; $$('.thumb').forEach(x => x.classList.toggle('on', x === t)); }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = variant();
      msg.className = 'form-msg err';
      if (!size()) { msg.textContent = 'Choose a size first.'; return; }
      if (!v || v.stock <= 0) { msg.textContent = 'That option is sold out. Choose another.'; return; }
      const n = Math.max(1, Math.floor(+qty.value || 1));
      const inCart = (cart.get().find(i => i.variantId === v.id) || {}).qty || 0;
      if (inCart + n > v.stock) { msg.textContent = `Only ${v.stock} available, and you already have ${inCart} in your cart.`; return; }
      cart.add(v.id, n);
      msg.className = 'form-msg ok';
      msg.innerHTML = `Added to your cart. <a href="/shop/cart" style="text-decoration:underline">View cart</a>`;
    });
    refresh();
  }

  /* ---------------- Cart + checkout page ---------------- */
  const lines = $('#lines');
  if (lines) {
    if (new URLSearchParams(location.search).has('cancelled')) $('#cart-cancelled').hidden = false;
    const codeInput = $('#code'), codeMsg = $('#code-msg'), totals = $('#totals'), cMsg = $('#checkout-msg');
    let code = load(CODE, '') || '', q = null;
    codeInput.value = code;

    async function render() {
      const items = cart.get();
      $('#cart-empty').hidden = !!items.length; $('#cart-full').hidden = !items.length;
      if (!items.length) return;
      try {
        q = await api('/api/quote', { items, code });
        cMsg.textContent = '';
      } catch (err) {
        // usually stock changed: show the message, then show the cart without blocking edits
        cMsg.textContent = err.message;
        q = null;
      }
      if (q) {
        if (q.code_error) { codeMsg.className = 'form-msg err'; codeMsg.textContent = q.code_error; code = ''; save(CODE, ''); return render(); }
        lines.innerHTML = q.lines.map(l => `
          <li class="line" data-id="${l.variantId}">
            <img src="${esc(l.image)}" alt="" width="88" height="88" />
            <div class="line__info"><b>${esc(l.name)}</b><span>${esc(l.size)} / ${esc(l.color)} &middot; ${money(l.price_cents)}</span>
              <div class="line__ctrls">
                <span class="qty"><button type="button" data-d="-1" aria-label="One less ${esc(l.name)}">&minus;</button><input value="${l.qty}" inputmode="numeric" aria-label="Quantity of ${esc(l.name)}" /><button type="button" data-d="1" aria-label="One more ${esc(l.name)}">+</button></span>
                <button type="button" class="remove">Remove</button>
              </div></div>
            <span class="line__price">${money(l.line_cents)}</span>
          </li>`).join('');
        const toFree = q.free_shipping_over_cents - (q.subtotal_cents - q.discount_cents);
        totals.innerHTML = `
          <div><dt>Subtotal</dt><dd>${money(q.subtotal_cents)}</dd></div>
          ${q.discount_cents ? `<div><dt>Discount (${esc(q.discount_code)}, ${esc(q.discount_label)})</dt><dd>&minus;${money(q.discount_cents)}</dd></div>` : ''}
          <div><dt>Shipping</dt><dd>${q.shipping_cents ? money(q.shipping_cents) : 'Free'}</dd></div>
          ${q.shipping_cents && toFree > 0 ? `<div class="hint"><dt>Add ${money(toFree)} more for free shipping</dt></div>` : ''}
          <div class="total"><dt>Total</dt><dd>${money(q.total_cents)}</dd></div>`;
        if (code && q.discount_code) { codeMsg.className = 'form-msg ok'; codeMsg.textContent = `${q.discount_code} applied: ${q.discount_label}.`; }
      } else {
        // fall back to a simple editable list so the shopper can fix quantities
        lines.innerHTML = items.map(i => `<li class="line" data-id="${i.variantId}"><div class="line__info"><b>Item ${i.variantId}</b>
          <div class="line__ctrls"><span class="qty"><button type="button" data-d="-1">&minus;</button><input value="${i.qty}" /><button type="button" data-d="1">+</button></span><button type="button" class="remove">Remove</button></div></div></li>`).join('');
        totals.innerHTML = '';
      }
    }
    const setQty = (id, n) => { cart.set(cart.get().map(i => i.variantId === id ? { ...i, qty: n } : i).filter(i => i.qty > 0)); render(); };
    lines.addEventListener('click', e => {
      const li = e.target.closest('.line'); if (!li) return; const id = +li.dataset.id;
      if (e.target.closest('.remove')) return setQty(id, 0);
      const b = e.target.closest('[data-d]'); if (b) setQty(id, Math.max(1, (+$('input', li).value || 1) + +b.dataset.d));
    });
    lines.addEventListener('change', e => { const li = e.target.closest('.line'); if (li) setQty(+li.dataset.id, Math.max(0, Math.floor(+e.target.value || 0))); });

    $('#code-form').addEventListener('submit', e => {
      e.preventDefault();
      code = codeInput.value.trim(); save(CODE, code);
      codeMsg.textContent = ''; render();
    });

    const form = $('#checkout');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      cMsg.textContent = '';
      let bad = null;
      $$('input[required]', form).forEach(i => { const ok = i.value.trim() && (i.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim())); i.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = i; });
      if (bad) { cMsg.textContent = bad.type === 'email' && bad.value ? 'Enter a valid email address for your receipt.' : 'Fill in the highlighted fields to continue.'; bad.focus(); return; }
      const btn = $('#pay'), label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Taking you to payment…';
      try {
        const customer = Object.fromEntries(new FormData(form));
        save('madscope-customer', { ...customer });
        const { url } = await api('/api/checkout', { items: cart.get(), code, customer });
        location.href = url;
      } catch (err) {
        cMsg.textContent = err.message; btn.disabled = false; btn.textContent = label; render();
      }
    });
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });
    // remember details between visits (this device only)
    const saved = load('madscope-customer', null);
    if (saved) for (const [k, v] of Object.entries(saved)) if (form.elements[k] && v) form.elements[k].value = v;
    render();
  }
})();

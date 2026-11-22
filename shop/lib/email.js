// Customer emails. Every email is saved (the admin can read it under "Emails").
// If SMTP_URL is set (e.g. smtp://user:pass@smtp.example.com:587) it is also sent for real.
const { run } = require('./db');

let transport = null;
if (process.env.SMTP_URL) {
  try { transport = require('nodemailer').createTransport(process.env.SMTP_URL); }
  catch (e) { console.warn('Email: could not set up SMTP, emails will only be saved.', e.message); }
}
const FROM = process.env.MAIL_FROM || 'Madscope Store <orders@madscope.example>';
const SITE = () => process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
const money = c => `$${(c / 100).toFixed(2)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#0b0a09;font-family:Arial,Helvetica,sans-serif;color:#f7f3ee">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0a09"><tr><td align="center" style="padding:32px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#151210;border-top:4px solid #e3262e">
<tr><td style="padding:28px 32px 8px"><div style="font:900 italic 28px Impact,Arial,sans-serif;letter-spacing:1px">MADSCOPE <span style="color:#e3262e">STORE</span></div></td></tr>
<tr><td style="padding:8px 32px 32px">
<h1 style="font:800 30px Impact,Arial,sans-serif;text-transform:uppercase;color:#e3262e;margin:12px 0 16px">${esc(title)}</h1>
${body}
<p style="color:#a8a098;font-size:13px;margin-top:28px">Questions about your order? Reply to this email or write to 1chargeproductions@gmail.com.</p>
</td></tr></table></td></tr></table></body></html>`;
}
function itemsTable(o) {
  const rows = o.items.map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2522">${esc(i.product_name)}<br><span style="color:#a8a098;font-size:13px">${esc(i.size)} / ${esc(i.color)} &times; ${i.qty}</span></td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid #2a2522">${money(i.price_cents * i.qty)}</td></tr>`).join('');
  const line = (l, v, bold) => `<tr><td style="padding:4px 0;${bold ? 'font-weight:bold' : 'color:#a8a098'}">${l}</td><td align="right" style="padding:4px 0;${bold ? 'font-weight:bold' : ''}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${rows}
${line('Subtotal', money(o.subtotal_cents))}
${o.discount_cents ? line(`Discount (${esc(o.discount_code)})`, '&minus;' + money(o.discount_cents)) : ''}
${line('Shipping', o.shipping_cents ? money(o.shipping_cents) : 'Free')}
${line('Total', money(o.total_cents), true)}</table>`;
}
const address = o => `<p style="color:#f7f3ee;line-height:1.5">${esc(o.name)}<br>${esc(o.address1)}${o.address2 ? '<br>' + esc(o.address2) : ''}<br>${esc(o.city)}${o.region ? ', ' + esc(o.region) : ''} ${esc(o.postcode)}<br>${esc(o.country)}</p>`;

function send(to, subject, html) {
  const r = run('INSERT INTO emails(to_addr,subject,html,status) VALUES(?,?,?,?)', to, subject, html, transport ? 'sending' : 'saved');
  const id = Number(r.lastInsertRowid);
  if (transport) transport.sendMail({ from: FROM, to, subject, html })
    .then(() => run("UPDATE emails SET status='sent' WHERE id=?", id))
    .catch(e => { run("UPDATE emails SET status='failed' WHERE id=?", id); console.warn('Email failed:', e.message); });
}

function orderConfirmation(o) {
  send(o.email, `Order ${o.number} confirmed: thanks for supporting Madscope`, layout('Order confirmed', `
<p style="line-height:1.6">Hi ${esc(o.name.split(' ')[0])}, thanks for your order. We're packing it now and will email you again when it ships.</p>
<p style="color:#a8a098">Order <b style="color:#f7f3ee">${esc(o.number)}</b></p>
${itemsTable(o)}
<h2 style="font:700 18px Arial,sans-serif;margin:24px 0 4px">Shipping to</h2>${address(o)}
<p><a href="${SITE()}/shop/order/${o.token}" style="display:inline-block;background:#e3262e;color:#fff;text-decoration:none;padding:12px 20px;font-weight:bold">View your order</a></p>`));
}
function orderShipped(o) {
  send(o.email, `Order ${o.number} has shipped`, layout('Your order is on the way', `
<p style="line-height:1.6">Hi ${esc(o.name.split(' ')[0])}, good news: order <b>${esc(o.number)}</b> has shipped.</p>
${itemsTable(o)}<h2 style="font:700 18px Arial,sans-serif;margin:24px 0 4px">Shipping to</h2>${address(o)}`));
}

module.exports = { orderConfirmation, orderShipped, smtp: !!transport };

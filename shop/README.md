# Madscope Store: how to run it in 5 steps

The store sells Madscope merch with sizes, colours and stock. It has a cart, discount codes, card payments through Stripe (test mode), and order emails. Everything is saved in one file, `shop/data/shop.db`.

## 1. Start the store

You need **Node.js 22.5 or newer** (download it from nodejs.org). Then, in a terminal:

```bash
cd shop
npm install    # first time only
npm start
```

Open **http://localhost:3000**. That's the Madscope site with the Merch section working.
The shop is at **/shop** and the admin is at **/admin**.
The first start fills the store with demo products and orders.

## 2. Log in to the admin

Go to **http://localhost:3000/admin** and log in with:

- Email: `owner@madscope.shop`
- Password: `stackpaper2026`

Then open **Account → Change password** and choose your own password.

## 3. Add and manage products

1. Open **Products** and click **Add a product**.
2. Drag your photos into the box (the first photo is the main one).
3. Enter the name and price.
4. List the sizes and colours, separated by commas, for example `S, M, L` and `Black, White`.
5. Set how many of each you have, then click **Save product**.

In the product list you can:

- **Change stock:** type a new number in a size/colour box. It saves when you click away.
- **For sale:** untick it to hide a product from the shop.
- **On home page:** tick it to show the product in the Merch section of the Madscope site (up to 4).

## 4. Your daily routine

Open **Today**. It shows:

- today's sales and orders
- what's **ready to ship**
- a **Low stock** list (5 or fewer left)

When you've posted an order, open it and click **Mark as shipped**. The customer gets a "your order is on the way" email automatically.

Click **Download orders (Excel)** any time for a spreadsheet of all paid orders.

Two more tabs:

- **Discount codes:** add codes (percent or dollars off) and turn them on or off.
- **Emails:** shows every email customers received.

## 5. Payments, emails and going live

**Payments.** Create a file `shop/.env` (copy `.env.example`) and add your Stripe key:

```
STRIPE_SECRET_KEY=sk_test_...
```

Restart with `npm start`. Checkout now goes to Stripe's secure payment page.

- In test mode, pay with card **4242 4242 4242 4242**, any future date and any CVC.
- No key yet? The store runs in **demo mode** and takes no payment.

**Emails.** To send real emails, add an email service login to `.env`:

```
SMTP_URL=smtp://user:pass@smtp.yourprovider.com:587
```

Every email still shows under **Emails** either way.

**Going live:**

1. Host the `shop` folder on a service that runs Node apps, such as Render or Railway.
2. Set `PUBLIC_URL` to your web address.
3. Switch to your **live** Stripe key (`sk_live_...`) only when you're ready to take real money.
4. To make the Merch buttons on a separately hosted Madscope site point at the store, set the store address in `madscope/index.html`:

   ```html
   <meta name="shop-url" content="https://your-store-address/shop">
   ```

---

**Handy commands**

- `npm run seed` wipes the database and reloads the demo data.
- Back up your store by copying `shop/data/`. That folder holds the database and all uploaded photos.

# Art Shop: React + FastAPI (+ Firestore when you're ready)

```
art-portfolio/
├── backend/
│   ├── data/artworks.json     <-- THE ONE FILE: names, prices, stock, image links
│   ├── main.py  db.py  payments.py  seed_firestore.py  firestore.rules
├── frontend/
│   ├── public/art_images/     <-- your photos, in folders
│   └── src/                   (the website; you rarely touch this)
└── tools/scan_art.py          <-- reads your photo folders, fills in artworks.json
```

## 1. Run it

```bash
# terminal 1: backend
cd backend
python -m venv venv
venv\Scripts\activate            # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # macOS/Linux: cp .env.example .env
uvicorn main:app --reload --port 8000

# terminal 2: frontend
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

The website talks to the backend by itself in development (Vite forwards `/api` to port 8000).
Check the backend directly: http://localhost:8000/api/artworks

## 2. Add or change your photos

Put photos in `frontend/public/art_images/` using this folder pattern:

| What you create | What appears on the site |
|---|---|
| `art_images/<category>/` | a main section (Miniatures, Mandala Art, Resin, Sketches ...) |
| `art_images/<category>/photo.jpg` | one card for that single piece |
| `art_images/<category>/<folder>/*.jpg` | ONE card; every photo in the folder becomes its moving slideshow |
| `art_images/<category>/<group>/<folder>/*.jpg` | same, and `<group>` becomes a filter chip (e.g. Table Stands) |

A photo named like its folder (`foods.jpg` in `food`, `table_stands.jpg`) becomes the card's cover.

Then, from the project folder, run:

```bash
python tools/scan_art.py
```

It adds every new card to `backend/data/artworks.json` and keeps everything you already edited.
Refresh the website, no restart needed.

## 3. THE ONE FILE: `backend/data/artworks.json`

Every card is one block. These are the fields you edit:

| Field | Meaning |
|---|---|
| `title` | name shown on the card |
| `price` | whole rupees, e.g. `2500`. `null` = "Price on request" with an Enquire button (no cart) |
| `stock` | how many you have. `1` for one-of-a-kind. `0` shows "Sold" |
| `type` | `"Original"`, `"Print"` or `"Made to order"` (changes the small note under the title) |
| `hidden` | `true` hides the card from the shop without deleting it |
| `category`, `group` | where it appears (set by folders; you can change them) |
| `description` | text shown when the piece is opened |
| `images` | the photo links. First one is the cover. Reorder, add or remove freely |

- **Add** a piece: add a folder + run the scanner (or copy a block and edit it).
- **Delete** a piece: delete its block (or set `"hidden": true`).
- **Change a price**: edit `price`, save, refresh the site.

Tip: after editing, paste the file into https://jsonlint.com if the site stops loading: a missing comma is the usual cause.

## 4. How the website and backend are linked

- The website gets everything (cards, prices, stock) from `GET /api/artworks`.
- Checkout calls `POST /api/orders`. The backend re-reads the real price and stock itself, so prices can't be changed in the browser.
- For the live site, build the frontend with your API address:
  create `frontend/.env.production` containing `VITE_API_URL=https://your-api-address`
  and set `FRONTEND_ORIGIN=https://your-website-address` in `backend/.env`.
- If the backend is off, the site shows "We couldn't load the shop" with a Try again button.

## 5. Database: Firestore (recommended for this shop)

**Is Firestore OK?** Yes. This is a small shop (tens or hundreds of cards, a few orders a day), the free plan covers it, and you don't have to run a database server.
Free every day: 1 GiB stored, 50,000 reads, 20,000 writes, 20,000 deletes. The backend caches the card list for 60 seconds, so browsing uses very few reads.

**Photos do NOT go in Firestore.** Keep them in `frontend/public/art_images` (they upload with the website). Firestore only stores the text and the photo links. (Firebase Storage now needs a billing account, so you don't need it for this.)

### Switch it on
1. console.firebase.google.com: create a project, open **Firestore Database**, create the **(default)** database. Pick a region close to your customers (e.g. Mumbai `asia-south1`). Only the default database gets the free quota.
2. **Project settings > Service accounts > Generate new private key.** Save it as `backend/serviceAccountKey.json` (never share or upload it).
3. Firestore **Rules** tab: paste the contents of `backend/firestore.rules` and publish. This blocks all direct browser access; only your backend can read or write.
4. In `backend/.env`: `USE_FIRESTORE=true`
5. Upload your cards once: `cd backend` then `python seed_firestore.py`
6. Restart the backend.

### After that, how you manage things
- **Change a price / stock / title**: edit the card in the Firebase console (collection `artworks`). Changes show on the site within about a minute. Enter `price` as a *number*.
- **Add new photos**: add the folder, run `python tools/scan_art.py`, then `python backend/seed_firestore.py`. New cards are added; existing cards only get their photo links refreshed. Your console edits are never overwritten. (`--force` resets everything from the file.)
- **Hide a card**: set `hidden` to true.
- **Orders** are saved in collection `orders`, messages in `messages`. Stock goes down automatically when a payment is confirmed.

### When something else would be better
If you later need heavy reporting, many thousands of products, or invoices/accounting built in, a SQL database (e.g. Postgres) is the stronger choice. You are far from that point now, and the backend isolates the database in `db.py`, so you could switch later.

## 6. Payments (Razorpay)

Starts in demo mode (no real money). For real payments put your Razorpay keys in `backend/.env`:
```
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```
Test with test keys first, then switch to live keys after Razorpay KYC.
Orders appear at `GET /api/admin/orders` (header `X-Admin-Token` = your `ADMIN_TOKEN`), easiest via http://localhost:8000/docs. A status of `needs_attention` means someone paid for a piece that sold a moment earlier: refund it from the Razorpay dashboard.

## 7. Before you go live
- HTTPS everywhere, live Razorpay keys, `PAYMENT_MODE=razorpay`, a long random `ADMIN_TOKEN`.
- **File names are case-sensitive on most web hosts.** `Scooties.jpeg` and `scooties.jpeg` are different files online. Keep names exactly as written in `artworks.json` (lowercase is safest).
- Set a real `price` on each card you want to sell. Cards with `null` price can't be bought, only enquired about.
- Replace the shipping/returns text in `frontend/src/config.js`; add privacy and terms pages.
- Worth adding next: order emails, a Razorpay webhook, an admin page.

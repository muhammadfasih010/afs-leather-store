# AFS Leather — Website

Custom leather goods storefront with a built-in product customization studio, order tracking, and a separate admin/studio panel for managing products and orders.

Originally a single HTML file — split into 9 connected files so the customer site, the admin panel, and the shared data/API layer can be worked on separately.

---

## 🗂 Project structure & workflow

```
afs-leather/
│
├── user.html   ┐
├── user.css    ├── Customer-facing storefront
├── user.js     ┘
│
├── admin.html  ┐
├── admin.css   ├── Private studio / admin panel
├── admin.js    ┘
│
├── config.js   ┐
├── storage.js  ├── Shared core (data + constants + upload API)
├── api.js      ┘
│
└── README.md
```

### How it all connects

```
        config.js   (constants: seed products, color map, $ helper, money())
             │
             ▼
        storage.js  (all localStorage read/write — products, cart, orders)
             │
   ┌─────────┴─────────┐
   ▼                   ▼
user.js            admin.js
   │                   │
   │              api.js (Cloudinary image upload)
   ▼                   ▼
user.html          admin.html
(the shop)         (the studio / admin)
```

- **Load order matters.** Each HTML file loads its scripts in this order:
  - `user.html` → `config.js` → `storage.js` → `user.js`
  - `admin.html` → `config.js` → `storage.js` → `api.js` → `admin.js`
- **Data flow:** Neither page talks to the other directly. Both read/write the *same* browser `localStorage` (products, cart, orders) through `storage.js`. So when the admin edits a product or updates an order's status, the change shows up on the storefront the next time it loads that data.
- **Getting to the admin panel:** click the "AFS" logo mark 5 times on `user.html` → enter the password → it redirects to `admin.html`. `admin.html` also asks for the password itself on load, so it stays protected even if someone opens that file directly.
- **Note on "Firebase":** the original file never actually used Firebase — everything was (and still is) stored in the browser's `localStorage`. `storage.js` is the file that plays that role here. The one real external service in the project is **Cloudinary**, used only for uploading images from the admin panel (`api.js`).

---

## 👥 Who built what

| File(s) | Part | Built by |
|---|---|---|
| `user.html`, `user.css`, `user.js` | Customer storefront (products, customization studio, cart, checkout, order tracking, My Orders) | **Muhammad Fasih** |
| `admin.html`, `admin.css`, `admin.js` | Admin / studio panel (product editor, order management, password gate) | **Muhammad Shayan** |
| `config.js`, `storage.js`, `api.js` | Shared data layer, constants, and the Cloudinary upload API | **Muhammad Ayan** |

## 🔗 Portfolios

| Name | Portfolio |
|---|---|
| Muhammad Fasih | your link |
| Muhammad Shayan | your link |
| Muhammad Ayan | your link |

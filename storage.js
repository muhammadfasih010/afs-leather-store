/* ============================================================
   storage.js
   Shared data layer — now backed by Firebase Realtime Database
   (see firebaseConfig + db in config.js) instead of localStorage.
   This is what makes an admin edit on one phone show up on the
   live site on every device, instantly.

   - Products -> Firebase path "products"   (synced, shared)
   - Orders   -> Firebase path "orders"     (synced, shared)
   - Cart     -> localStorage                (stays per-device —
     a shopping bag belongs to one visitor, not the whole site)

   user.js / admin.js never talk to Firebase directly — everything
   goes through the functions in this file, same as before.
   ============================================================ */

let _products = [];
let _orders = [];

// Removes any base64 data-URLs before persisting (keeps the DB small)
function stripBase64(arr){
  return (arr || []).map(p => ({
    ...p,
    image: p.image?.startsWith('data:') ? '' : p.image,
    groups: (p.groups || []).map(g => ({
      ...g,
      options: (g.options || []).map(o => ({
        ...o,
        image: o.image?.startsWith('data:') ? '' : o.image
      }))
    }))
  }));
}

// ---- Products (shared / live across devices) ----

// Starts listening to Firebase for the product catalog. Fires
// onChange(products) immediately with whatever is currently there,
// and again every time ANY device (including the admin panel)
// changes it. If the database is empty (first time ever running
// this site), it seeds it with the starting catalog from config.js.
function initProducts(onChange){
  const ref = db.ref('products');
  ref.once('value', snap => {
    if(!snap.exists()) ref.set(seedProducts);
  });
  ref.on('value', snap => {
    _products = stripBase64(snap.val() || seedProducts);
    onChange(_products);
  });
}

function saveProducts(products){
  _products = products;
  db.ref('products').set(stripBase64(products));
}

// ---- Orders (shared / live across devices) ----

// Starts listening to Firebase for orders. Fires onChange(orders)
// immediately, then again whenever a new order is placed or the
// admin updates a status — from any device.
function initOrders(onChange){
  db.ref('orders').on('value', snap => {
    const val = snap.val() || {};
    _orders = Object.values(val);
    onChange(_orders);
  });
}

function getOrders(){
  return _orders;
}

function saveOrders(orders){
  _orders = orders;
  const byId = {};
  orders.forEach(o => byId[o.id] = o);
  db.ref('orders').set(byId);
}

// ---- Cart (per-device, unchanged) ----

function getCart(){
  return JSON.parse(localStorage.getItem('afs-cart-static') || '[]');
}

function saveCartData(cart){
  localStorage.setItem('afs-cart-static', JSON.stringify(cart));
}

function statusColor(s){
  const map = {
    'Pending acceptance':'pending',
    'Accepted':'accepted',
    'Shipped':'shipped',
    'Delivered':'delivered',
    'Cancelled':'cancelled'
  };
  return map[s] || 'pending';
}

function trackOrder(id){
  const order = _orders.find(o => o.id.toLowerCase() === id.toLowerCase());
  if(!order) return `No order found for ${id}. Check the number and try again.`;
  let msg = `Order ${order.id} · ${order.status} · ${order.items.length} piece${order.items.length===1?'':'s'} · ${money(order.total)}`;
  if(order.eta) msg += ` · Expected: ${order.eta}`;
  return msg;
}

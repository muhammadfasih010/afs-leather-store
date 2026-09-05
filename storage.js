/* ============================================================
   storage.js
   Shared data layer (localStorage-backed).

   NOTE: This project does not use Firebase anywhere — the original
   file stored everything (products, cart, orders) in the browser's
   localStorage. This file is the "database layer" in place of a
   firebase.js — it centralizes every localStorage read/write so
   user.js and admin.js never touch localStorage directly.

   Keys used (unchanged from the original file, so old saved data
   keeps working):
     afs-products-static  -> array of products
     afs-cart-static       -> array of cart line items
     afs-orders-static     -> array of orders
   ============================================================ */

// Removes any base64 data-URLs before persisting (keeps localStorage small)
function stripBase64(arr){
  return arr.map(p => ({
    ...p,
    image: p.image?.startsWith('data:') ? '' : p.image,
    groups: p.groups.map(g => ({
      ...g,
      options: g.options.map(o => ({
        ...o,
        image: o.image?.startsWith('data:') ? '' : o.image
      }))
    }))
  }));
}

// Loads products from localStorage, falling back to the seed catalog.
// Also re-saves immediately, exactly like the original inline script did.
function loadProducts(){
  const products = stripBase64(JSON.parse(localStorage.getItem('afs-products-static') || 'null') || seedProducts);
  localStorage.setItem('afs-products-static', JSON.stringify(products));
  return products;
}

function saveProducts(products){
  localStorage.setItem('afs-products-static', JSON.stringify(products));
}

function getCart(){
  return JSON.parse(localStorage.getItem('afs-cart-static') || '[]');
}

function saveCartData(cart){
  localStorage.setItem('afs-cart-static', JSON.stringify(cart));
}

function getOrders(){
  return JSON.parse(localStorage.getItem('afs-orders-static') || '[]');
}

function saveOrders(orders){
  localStorage.setItem('afs-orders-static', JSON.stringify(orders));
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
  const orders = getOrders();
  const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());
  if(!order) return `No order found for ${id}. Check the number and try again.`;
  let msg = `Order ${order.id} · ${order.status} · ${order.items.length} piece${order.items.length===1?'':'s'} · ${money(order.total)}`;
  if(order.eta) msg += ` · Expected: ${order.eta}`;
  return msg;
}


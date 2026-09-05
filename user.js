/* ============================================================
   user.js
   Logic for the customer-facing storefront (user.html).
   Load order in the HTML: config.js -> storage.js -> user.js
   ============================================================ */

let products = loadProducts();
let selected = products[0];
let selections = {};
let cart = getCart();

function selectedOptions(){
  return selected.groups.map((g,i) => g.options[selections[i]||0]).filter(Boolean);
}

function renderProducts(){
  const grid = $('#productGrid');
  if(!grid) return;
  grid.innerHTML = products.map(p => `<article class="product-card"><img src="${p.image}" alt="${p.name}"><div><small>${p.category} / Made to order</small><h3>${p.name}</h3><p>${p.description}</p><button data-product="${p.id}">Customize & view ↗</button></div></article>`).join('');
  grid.querySelectorAll('button').forEach(b => b.onclick = () => chooseProduct(products.find(p => p.id === b.dataset.product)));
}

function chooseProduct(p){
  selected = p;
  selections = {};
  renderStudio();
  document.getElementById('studio').scrollIntoView({behavior:'smooth'});
}

function renderStudio(){
  if(!$('#selectedName')) return;
  $('#selectedName').textContent = selected.name;
  $('#optionGroups').innerHTML = selected.groups.map((g,gi) => `<div class="option-group"><strong>${String(gi+1).padStart(2,'0')} / ${g.name}</strong><div class="option-list">${g.options.map((o,oi) => `<button class="${(selections[gi]||0)===oi?'active':''}" data-group="${gi}" data-option="${oi}">${o.hex?`<span class="swatch" style="background:${o.hex}"></span>`:''}${o.name}${o.price?` +${money(o.price)}`:''}</button>`).join('')}</div></div>`).join('');
  $('#optionGroups').querySelectorAll('button').forEach(b => b.onclick = () => { selections[+b.dataset.group] = +b.dataset.option; renderStudio(); });

  const opts = selectedOptions();
  const price = selected.price + opts.reduce((a,o) => a + (+o.price||0), 0);
  const color = opts.find(o => o.hex)?.hex || 'transparent';
  const replacement = opts.find(o => o.image)?.image;

  $('#selectedPrice').textContent = money(price);
  $('#addPrice').textContent = money(price);
  $('#previewImage').src = replacement || selected.image;
  $('#previewImage').alt = selected.name + ' preview';

  const img = $('#previewImage');
  $('#previewTint').style.background = 'transparent';
  $('#previewTint').style.opacity = '0';

  if(color === 'transparent'){
    if(img) img.style.filter = 'none';
  } else {
    // Brown leather base = roughly hue 25deg, sepia(1) gives ~37deg
    // We need to rotate FROM that base TO target hue
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
    let targetHue = 0;
    if(d !== 0){
      if(max === r) targetHue = ((g-b)/d) % 6;
      else if(max === g) targetHue = (b-r)/d + 2;
      else targetHue = (r-g)/d + 4;
      targetHue = Math.round(targetHue * 60);
      if(targetHue < 0) targetHue += 360;
    }
    // sepia() produces hue ~37deg. Rotate from 37 to target.
    const rotate = targetHue - 37;
    // Saturation: grey/black = low, vivid = high
    const sat = d === 0 ? 0 : Math.round((d/max) * 180);
    // Brightness: dark colors need less brightness
    const lum = (r*0.299 + g*0.587 + b*0.114) / 255;
    const bri = Math.max(0.3, Math.min(1.1, lum*1.4));
    // Black/very dark: just desaturate + darken, no hue rotate needed
    if(lum < 0.12){
      if(img) img.style.filter = `grayscale(1) brightness(${(lum*3).toFixed(2)}) contrast(1.1)`;
    } else if(d/max < 0.15){
      // Near grey/neutral: sepia + slight rotate + low sat
      if(img) img.style.filter = `sepia(1) hue-rotate(${rotate}deg) saturate(0.4) brightness(${bri.toFixed(2)})`;
    } else {
      // Full color leather
      if(img) img.style.filter = `sepia(1) hue-rotate(${rotate}deg) saturate(${(sat/60).toFixed(2)}) brightness(${bri.toFixed(2)})`;
    }
  }
}

function renderCart(){
  const box = $('#cartItems');
  if(!box) return;
  $('#cartCount').textContent = String(cart.length).padStart(2,'0');
  box.innerHTML = cart.length ? cart.map((i,n) => `<div class="cart-row"><img src="${i.image}" alt="${i.name}"><div><strong>${i.name}</strong><small>${i.options.join(' · ')||'Standard finish'}<br>${money(i.price)}</small></div><button class="close" data-remove="${n}">×</button></div>`).join('') : '<p>Your bag is empty. Choose a piece from the collection.</p>';
  cart.forEach((_,n) => box.querySelector(`[data-remove="${n}"]`)?.addEventListener('click', () => { cart.splice(n,1); saveCart(); }));
  $('#cartTotal').textContent = money(cart.reduce((a,i) => a + i.price, 0));
}

function saveCart(){
  saveCartData(cart);
  renderCart();
}

function openCart(){ renderCart(); $('#cartDrawer').classList.add('open'); $('#backdrop').classList.add('open'); }
function closeCart(){ $('#cartDrawer').classList.remove('open'); $('#backdrop').classList.remove('open'); }

function addCurrent(){
  const opts = selectedOptions();
  cart.push({
    name: selected.name,
    image: selected.image,
    price: selected.price + opts.reduce((a,o) => a + (+o.price||0), 0),
    options: opts.map(o => o.name)
  });
  saveCart();
  openCart();
}

function openCheckout(){
  if(!cart.length) return alert('Your bag is empty.');
  closeCart();
  $('#checkoutModal').classList.add('open');
  $('#backdrop').classList.add('open');
}
function closeCheckout(){ $('#checkoutModal').classList.remove('open'); $('#backdrop').classList.remove('open'); }

function renderMyOrders(){
  const box = $('#myOrdersList');
  if(!box) return;
  const orders = getOrders();
  if(!orders.length){
    box.innerHTML = `<div class="no-orders-msg">
      <span class="no-orders-icon">🛍</span>
      <strong>Koi order nahi abhi tak</strong>
      <p>Collection se apna piece choose karo<br>aur customize karke order karo.</p>
    </div>`;
    return;
  }
  const statusDot = {'Pending acceptance':'⏳','Accepted':'✅','Shipped':'🚚','Delivered':'📦','Cancelled':'❌'};
  box.innerHTML = [...orders].reverse().map(o => {
    const sc = statusColor(o.status);
    const date = new Date(o.createdAt).toLocaleDateString('en-PK', {day:'numeric',month:'short',year:'numeric'});
    return `<div class="my-order-card status-${sc}">
      <div class="my-order-card-accent"></div>
      <div class="my-order-card-inner">
        <div class="my-order-card-head">
          <div>
            <div class="my-order-id">${o.id}</div>
            <div class="my-order-date">${date} · ${o.payment||'COD'}</div>
          </div>
          <div class="my-order-status-badge">${statusDot[o.status]||'⏳'} ${o.status}</div>
        </div>
        <div class="my-order-divider"></div>
        <div class="my-order-items-list">
          ${o.items.map(i => `<div class="my-order-item-row"><span class="my-order-item-name">${i.name}${i.options?.length?' <span style="opacity:.6;font-size:10px;">('+i.options.join(', ')+')</span>':''}</span><span class="my-order-item-price">${money(i.price)}</span></div>`).join('')}
        </div>
        <div class="my-order-total-row">
          <span class="my-order-total-label">Total</span>
          <span class="my-order-total-amount">${money(o.total)}</span>
        </div>
        ${o.eta||o.adminNote?`<div class="my-order-info-row">${o.eta?`📦 <span>Expected: ${o.eta}</span>`:''}${o.eta&&o.adminNote?' · ':''}${o.adminNote?`📝 <span>${o.adminNote}</span>`:''}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  renderStudio();
  renderCart();

  // My Orders nav
  $('#myOrdersNav')?.addEventListener('click', e => { e.preventDefault(); renderMyOrders(); $('#myOrdersDrawer').classList.add('open'); $('#backdrop').classList.add('open'); });
  $('#closeMyOrders')?.addEventListener('click', () => { $('#myOrdersDrawer').classList.remove('open'); $('#backdrop').classList.remove('open'); });

  document.querySelectorAll('[data-open-cart]').forEach(b => b.onclick = openCart);
  document.querySelectorAll('[data-close-cart]').forEach(b => b.onclick = closeCart);
  $('#backdrop')?.addEventListener('click', () => { closeCart(); closeCheckout(); });
  $('#addToCart')?.addEventListener('click', addCurrent);
  $('#checkout')?.addEventListener('click', openCheckout);
  document.querySelector('[data-close-checkout]')?.addEventListener('click', closeCheckout);

  $('#checkoutForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const orders = getOrders();
    const order = {
      id: `AFS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      status: 'Pending acceptance',
      customer: {
        name: $('#customerName').value.trim(),
        phone: $('#customerPhone').value.trim(),
        address: $('#customerAddress').value.trim(),
        postal: $('#customerPostal').value.trim()
      },
      payment: $('#payment').value,
      items: cart,
      total: cart.reduce((a,i) => a + i.price, 0),
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    saveOrders(orders);
    cart = []; saveCart(); closeCheckout();
    $('#trackId').value = order.id;
    $('#trackResult').textContent = trackOrder(order.id);
    $('#trackResult').className = 'track-result ok';
    location.hash = 'orders';
    alert(`Order ${order.id} created. The studio will review it shortly.`);
  });

  $('#trackForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const id = $('#trackId').value.trim();
    const orders = getOrders();
    const order = orders.find(o => o.id.toLowerCase() === id.toLowerCase());
    const box = $('#trackResult');
    box.style.display = 'block';
    if(!order){
      box.className = 'track-result-card error';
      box.innerHTML = `<div class="track-error-msg">❌ Order <b>${id}</b> nahi mila. ID check karke dobara try karo.</div>`;
      return;
    }
    const statusDot = {'Pending acceptance':'⏳','Accepted':'✅','Shipped':'🚚','Delivered':'📦','Cancelled':'❌'};
    const sc = statusColor(order.status);
    box.className = 'track-result-card';
    box.innerHTML = `
      <div class="track-result-id">${order.id}</div>
      <div class="my-order-status-badge status-${sc}" style="margin-bottom:14px;">${statusDot[order.status]||'⏳'} ${order.status}</div>
      <div class="track-result-row">🛍 <span>${order.items.map(i => i.name).join(', ')}</span></div>
      <div class="track-result-row">💰 <span>${money(order.total)}</span></div>
      <div class="track-result-row">💳 <span>${order.payment||'COD'}</span></div>
      ${order.eta?`<div class="track-result-row">📦 <span>Expected: ${order.eta}</span></div>`:''}
      ${order.adminNote?`<div class="track-result-row">📝 <span>${order.adminNote}</span></div>`:''}
    `;
  });

  // Admin — 5 clicks on AFS mark → password modal → redirect to admin.html
  let clicks = 0, timer;
  const trigger = $('#adminTrigger');
  trigger?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => clicks = 0, 2200);
    if(clicks >= 5){ clicks = 0; openPwModal(); }
  });

  function openPwModal(){
    $('#pwInput').value = '';
    $('#pwError').textContent = '';
    $('#pwModal').classList.add('open');
    setTimeout(() => $('#pwInput').focus(), 100);
  }
  function closePwModal(){ $('#pwModal').classList.remove('open'); }
  function checkPassword(){
    const val = $('#pwInput').value.trim();
    if(val === 'admin123'){
      closePwModal();
      window.location.href = 'admin.html';
    } else {
      $('#pwError').textContent = 'Galat password. Dobara try karo.';
      $('#pwInput').value = '';
      $('#pwInput').focus();
    }
  }
  $('#pwSubmit')?.addEventListener('click', checkPassword);
  $('#pwInput')?.addEventListener('keydown', e => { if(e.key==='Enter') checkPassword(); if(e.key==='Escape') closePwModal(); });
  $('#pwCancel')?.addEventListener('click', closePwModal);
  $('#pwModal')?.addEventListener('click', e => { if(e.target === $('#pwModal')) closePwModal(); });
});

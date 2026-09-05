/* ============================================================
   admin.js
   Logic for the private studio / admin page (admin.html).
   Load order in the HTML: config.js -> storage.js -> api.js -> admin.js
   ============================================================ */

let products = loadProducts();
let selected = products[0] || null;

// ---- Password gate ----
// admin.html is a standalone page, so it re-checks the password on
// every load instead of relying on the 5-click trick from the main
// site (that trick just gets you here from user.html).
function openPwModal(){
  $('#pwInput').value = '';
  $('#pwError').textContent = '';
  $('#pwModal').classList.add('open');
  setTimeout(() => $('#pwInput').focus(), 100);
}
function unlockAdmin(){
  $('#pwModal').classList.remove('open');
  $('#adminPanel').classList.add('open');
  $('#adminPanel').setAttribute('aria-hidden', 'false');
  renderAdmin();
  renderAdminOrders();
}
function checkPassword(){
  const val = $('#pwInput').value.trim();
  if(val === 'admin123'){
    unlockAdmin();
  } else {
    $('#pwError').textContent = 'Galat password. Dobara try karo.';
    $('#pwInput').value = '';
    $('#pwInput').focus();
  }
}

// ---- Product list (left column) ----
function renderAdminList(){
  const box = $('#adminProductList');
  if(!box) return;
  box.innerHTML = products.map(p => `<div class="admin-product-row ${selected && p.id===selected.id?'active':''}" data-admin-product="${p.id}"><img src="${p.image}" alt=""><div><strong>${p.name}</strong><small>${p.category} · ${money(p.price)}</small></div><button class="admin-delete-product" data-delete-product="${p.id}" title="Product delete karo">🗑</button></div>`).join('');
  box.querySelectorAll('[data-admin-product]').forEach(row => {
    row.onclick = (e) => {
      if(e.target.closest('[data-delete-product]')) return;
      selected = products.find(p => p.id === row.dataset.adminProduct);
      renderAdmin();
    };
  });
  box.querySelectorAll('[data-delete-product]').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    const pid = btn.dataset.deleteProduct;
    const p = products.find(x => x.id === pid);
    if(!confirm(`"${p.name}" delete karna chahte ho? Yeh wapas nahi aayega.`)) return;
    products = products.filter(x => x.id !== pid);
    saveProducts(products);
    if(products.length > 0){ selected = products[0]; }
    else { selected = null; }
    renderAdmin();
  });
}

// ---- Product editor (right column) ----
function renderAdmin(){
  renderAdminList();
  const title = $('#adminTitle'), body = $('#adminEditorBody');
  if(!title || !body) return;
  if(products.length === 0 || !selected){
    title.textContent = 'Koi product nahi';
    body.innerHTML = '<p class="admin-empty">Koi product nahi hai. Neeche "+ Add product" se naya banao.</p>';
    return;
  }
  // Clean up any base64 images already stored
  const safeImg = url => (url && url.startsWith('data:')) ? '' : url;
  title.textContent = selected.name;
  const previewSrc = safeImg(selected.image) || '';
  body.innerHTML = `<div class="admin-form"><div class="admin-image-row">${previewSrc?`<img id="adminPreviewImg" src="${previewSrc}" alt="${selected.name}" style="width:85px;height:96px;object-fit:cover;">`:'<div class="admin-no-preview" id="adminPreviewImg" style="width:85px;height:96px;background:#2a2018;display:grid;place-items:center;color:#998d82;font-size:10px;">No image</div>'}<div><p class="eyebrow">Main product image</p><label class="cloudinary-upload-btn" id="mainUploadBtn">📁 Device se upload karo<input type="file" id="adminMainFile" accept="image/*" style="display:none"></label><p class="upload-status" id="mainUploadStatus"></p></div></div><label>Product name<input id="adminName" value="${selected.name}"></label><label>Base price<input id="adminPrice" type="number" value="${selected.price}"></label><label class="wide">Ya direct URL paste karo<input id="adminImage" value="${previewSrc}" placeholder="https://res.cloudinary.com/..."></label>${selected.groups.map((g,gi) => `<div class="admin-option-card"><div class="admin-option-card-head"><p class="eyebrow">Option group ${gi+1} — ${g.name}</p><button class="admin-remove-group" data-remove-group="${gi}" type="button">Group delete karo ×</button></div>${g.options.map((o,oi) => `<div class="admin-option-line"><input data-gi="${gi}" data-oi="${oi}" data-key="name" value="${o.name}" placeholder="Option name"><input data-gi="${gi}" data-oi="${oi}" data-key="hex" value="${o.hex||''}" placeholder="#8D4E2A"><input data-gi="${gi}" data-oi="${oi}" data-key="price" type="number" value="${o.price||0}" placeholder="Add price"><input data-gi="${gi}" data-oi="${oi}" data-key="image" value="${safeImg(o.image)||''}" placeholder="Ya URL paste karo"><label class="opt-upload-btn" data-ugi="${gi}" data-uoi="${oi}">↑<input type="file" accept="image/*" style="display:none" data-ugi="${gi}" data-uoi="${oi}"></label><button class="admin-remove" data-remove-option="${gi}:${oi}" type="button">×</button></div>`).join('')}<button class="admin-add-option" data-add-option="${gi}" type="button">+ Add option</button></div>`).join('')}<label class="wide">New option group<input id="adminNewGroup" placeholder="e.g. Color, lining, buckle"></label><button class="admin-save wide" id="adminSave" type="button">Save changes</button></div>`;

  // Attach auto-hex to all name inputs in option lines
  function attachColorAutofill(){
    document.querySelectorAll('.admin-option-line input[data-key="name"]').forEach(nameInput => {
      nameInput.addEventListener('input', () => {
        const hex = nameToHex(nameInput.value);
        if(!hex) return;
        const gi = nameInput.dataset.gi, oi = nameInput.dataset.oi;
        const hexInput = document.querySelector(`.admin-option-line input[data-gi="${gi}"][data-oi="${oi}"][data-key="hex"]`);
        if(hexInput){
          hexInput.value = hex;
          hexInput.style.borderColor = 'var(--gold)';
          hexInput.style.background = hex;
          hexInput.style.color = isLight(hex) ? '#1a1a1a' : '#ffffff';
        }
      });
    });
    // Also live-preview hex field changes
    document.querySelectorAll('.admin-option-line input[data-key="hex"]').forEach(hexInput => {
      hexInput.addEventListener('input', () => {
        const val = hexInput.value.trim();
        if(/^#[0-9a-fA-F]{6}$/.test(val)){
          hexInput.style.background = val;
          hexInput.style.color = isLight(val) ? '#1a1a1a' : '#ffffff';
        }
      });
    });
  }
  attachColorAutofill();

  // Main product image upload (Cloudinary — see api.js)
  const mainFile = $('#adminMainFile');
  const mainStatus = $('#mainUploadStatus');
  mainFile?.addEventListener('change', () => {
    uploadToCloudinary(mainFile.files[0], mainStatus, url => {
      $('#adminImage').value = url;
      const prev = $('#adminPreviewImg');
      if(prev) prev.src = url;
    });
  });

  // Option replacement image uploads
  document.querySelectorAll('.opt-upload-btn input[type=file]').forEach(input => {
    input.addEventListener('change', () => {
      const gi = input.dataset.ugi, oi = input.dataset.uoi;
      const statusId = `optStatus_${gi}_${oi}`;
      let statusEl = document.getElementById(statusId);
      if(!statusEl){ statusEl = document.createElement('span'); statusEl.id = statusId; statusEl.style.cssText = 'font-size:9px;margin-left:6px;'; input.closest('.admin-option-line').appendChild(statusEl); }
      uploadToCloudinary(input.files[0], statusEl, url => {
        const imgInput = document.querySelector(`.admin-option-line input[data-gi="${gi}"][data-oi="${oi}"][data-key="image"]`);
        if(imgInput) imgInput.value = url;
      });
    });
  });

  // Live preview when URL typed
  $('#adminImage')?.addEventListener('input', e => {
    const url = e.target.value.trim();
    const img = $('.admin-image-row img');
    if(img && url && !url.startsWith('data:')) img.src = url;
  });

  document.querySelectorAll('[data-add-option]').forEach(btn => btn.onclick = () => {
    const name = prompt('Option name');
    if(!name) return;
    const hex = prompt('Hex color code, e.g. #8D4E2A (optional)') || '';
    selected.groups[+btn.dataset.addOption].options.push({name, hex, price:0, image:''});
    renderAdmin();
  });
  document.querySelectorAll('[data-remove-option]').forEach(btn => btn.onclick = () => {
    const [gi, oi] = btn.dataset.removeOption.split(':').map(Number);
    selected.groups[gi].options.splice(oi, 1);
    renderAdmin();
  });
  document.querySelectorAll('[data-remove-group]').forEach(btn => btn.onclick = () => {
    const gi = +btn.dataset.removeGroup;
    if(!confirm(`"${selected.groups[gi].name}" group aur iske saare options delete karna chahte ho?`)) return;
    selected.groups.splice(gi, 1);
    renderAdmin();
  });

  $('#adminSave').onclick = () => {
    selected.name = $('#adminName').value.trim() || selected.name;
    selected.price = Number($('#adminPrice').value) || selected.price;
    const newImg = $('#adminImage').value.trim();
    if(newImg && !newImg.startsWith('data:')) selected.image = newImg;
    document.querySelectorAll('.admin-option-line input').forEach(input => {
      const option = selected.groups[+input.dataset.gi]?.options[+input.dataset.oi];
      if(!option) return;
      const key = input.dataset.key;
      const val = input.value.trim();
      if(key === 'price') option[key] = Number(val) || 0;
      else if(key === 'image'){ if(val && !val.startsWith('data:')) option[key] = val; }
      else option[key] = val;
    });
    const groupName = $('#adminNewGroup').value.trim();
    if(groupName) selected.groups.push({name:groupName, options:[]});
    // Strip any leftover base64 from all products before saving
    const clean = p => ({...p, image: p.image?.startsWith('data:')?'':p.image, groups: p.groups.map(g => ({...g, options: g.options.map(o => ({...o, image: o.image?.startsWith('data:')?'':o.image}))}))});
    products = products.map(p => p.id === selected.id ? clean(selected) : clean(p));
    saveProducts(products);
    renderAdmin();
    const imgField = $('#adminImage');
    if(imgField){ imgField.value=''; imgField.placeholder='Link save ho gayi ✓'; }
    const saveBtn = $('#adminSave');
    if(saveBtn){ saveBtn.textContent='Saved ✓'; saveBtn.style.background='#4f6e54'; saveBtn.style.color='#d4f0d6'; saveBtn.disabled=true; setTimeout(() => { saveBtn.textContent='Save changes'; saveBtn.style.background=''; saveBtn.style.color=''; saveBtn.disabled=false; }, 3000); }
  };
}

// ---- Orders tab ----
function renderAdminOrders(){
  const box = $('#adminOrdersList');
  if(!box) return;
  const orders = getOrders();
  const badge = $('#adminOrderBadge');
  const pending = orders.filter(o => o.status === 'Pending acceptance').length;
  if(badge) badge.textContent = pending || '';
  if(badge) badge.style.display = pending ? 'inline-flex' : 'none';
  if(!orders.length){ box.innerHTML = '<div class="admin-no-orders">Abhi koi order nahi aaya.</div>'; return; }
  box.innerHTML = [...orders].reverse().map((o) => `
    <div class="admin-order-card">
      <div class="admin-order-card-head">
        <div>
          <div class="admin-order-id">${o.id}</div>
          <div class="admin-order-meta">${new Date(o.createdAt).toLocaleString('en-PK')} · ${o.payment}</div>
        </div>
        <span class="my-order-status status-${statusColor(o.status)}">${o.status}</span>
      </div>
      <div class="admin-customer-info">
        👤 ${o.customer?.name||'—'} · 📞 ${o.customer?.phone||'—'}<br>
        📍 ${o.customer?.address||'—'} · 📮 ${o.customer?.postal||'—'}
      </div>
      <div class="admin-order-items">
        ${o.items.map(i => `<div class="admin-order-item"><span>${i.name} ${i.options?.length?'('+i.options.join(', ')+')':''}</span><span>${money(i.price)}</span></div>`).join('')}
      </div>
      <div class="admin-order-total">Total: ${money(o.total)}</div>
      <div class="admin-status-row">
        <select class="admin-status-select" id="status_${o.id}">
          ${['Pending acceptance','Accepted','Shipped','Delivered','Cancelled'].map(s => `<option${o.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <input class="admin-eta-input" id="eta_${o.id}" placeholder="Expected date, e.g. 10 Sep 2026" value="${o.eta||''}">
        <input class="admin-eta-input" id="note_${o.id}" placeholder="Note for customer (optional)" value="${o.adminNote||''}" style="border-color:#463c36">
        <button class="admin-update-btn" data-order-id="${o.id}">Update →</button>
      </div>
    </div>`).join('');

  box.querySelectorAll('[data-order-id]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.orderId;
      const orders = getOrders();
      const idx = orders.findIndex(o => o.id === id);
      if(idx === -1) return;
      orders[idx].status = document.getElementById('status_'+id).value;
      orders[idx].eta = document.getElementById('eta_'+id).value.trim();
      orders[idx].adminNote = document.getElementById('note_'+id).value.trim();
      saveOrders(orders);
      renderAdminOrders();
      btn.textContent = 'Saved ✓'; btn.style.borderColor = '#4f6e54'; btn.style.color = '#a9d0aa';
      setTimeout(() => { btn.textContent = 'Update →'; btn.style.borderColor=''; btn.style.color=''; }, 2500);
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Always require the password on this page — it's the direct
  // gateway to the admin panel, not just a shortcut from the site.
  openPwModal();

  $('#pwSubmit')?.addEventListener('click', checkPassword);
  $('#pwInput')?.addEventListener('keydown', e => { if(e.key==='Enter') checkPassword(); });
  $('#pwCancel')?.addEventListener('click', () => { window.location.href = 'user.html'; });

  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      $('#tabProducts').style.display = t==='products' ? 'block' : 'none';
      $('#tabOrders').style.display = t==='orders' ? 'block' : 'none';
      if(t==='orders') renderAdminOrders();
    };
  });

  // "Back to site" (previously the × close button, which just
  // hid the overlay on the shared page — now it's a real nav link)
  $('#closeAdmin')?.addEventListener('click', () => { window.location.href = 'user.html'; });

  // New product
  $('#newProduct')?.addEventListener('click', () => {
    const name = prompt('Product name');
    if(!name) return;
    const p = { id:'product-'+Date.now(), name, category:'Leather goods', price:0, image:ASSET+'wallet_f4252cca.jpg', description:'A new made-to-order piece.', groups:[] };
    products.push(p);
    selected = p;
    saveProducts(products);
    renderAdmin();
  });
});

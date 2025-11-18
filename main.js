
// main.js — rewritten, safer, nicer UX/effects
(function () {
  'use strict';

  // ----- Config -----
  const ADMIN_PASSWORD = 'toutouadmin';
  const STORAGE_KEYS = {
    PRODUCTS: 'tt_products_v2',
    CART: 'tt_cart_v2',
    ORDERS: 'tt_orders_v2'
  };

  // ----- Defaults -----
  const defaultProducts = [
    { id: 1, name: 'Baklawa', price: 5.0, img: '' },
    { id: 2, name: 'Makroud', price: 8.0, img: '' },
    { id: 3, name: 'Mekroud', price: 4.0, img: '' }
  ];

  // ----- Utilities -----
  const fmtNum = n => Number(n || 0).toFixed(2);
  const localeFormatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 });
  const currency = n => {
    try { return localeFormatter.format(Number(n)); }
    catch (e) { return fmtNum(n) + ' TND'; }
  };
  const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Safe DOM helpers
  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(opts).forEach(([k, v]) => {
      if (k === 'cls') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'attrs') Object.entries(v).forEach(([a, val]) => node.setAttribute(a, val));
      else node[k] = v;
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (!c) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ----- Storage -----
  function readProducts() {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
      return defaultProducts.map(p => ({ ...p }));
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Invalid products');
      return parsed;
    } catch {
      // fallback to defaults
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
      return defaultProducts.map(p => ({ ...p }));
    }
  }
  function saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }
  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CART) || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function persistCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }

  // ----- State -----
  let products = readProducts();
  let cart = readCart();

  // ----- DOM refs -----
  const productsEl = document.getElementById('products');
  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');
  const checkoutItemsEl = document.getElementById('checkoutItems');
  const checkoutTotalEl = document.getElementById('checkoutTotal');
  const adminBtn = document.getElementById('adminBtn');
  const adminListEl = document.getElementById('adminList');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const orderConfirmEl = document.getElementById('orderConfirm');

  const adminModalElem = document.getElementById('adminModal');
  const checkoutModalElem = document.getElementById('checkoutModal');
  const bootstrapModal = window.bootstrap && window.bootstrap.Modal;
  const adminModal = bootstrapModal ? new bootstrapModal(adminModalElem) : null;
  const checkoutModal = bootstrapModal ? new bootstrapModal(checkoutModalElem) : null;

  // Accessibility: announce area for cart updates
  let liveRegion = document.getElementById('cartLiveRegion');
  if (!liveRegion) {
    liveRegion = el('div', { attrs: { id: 'cartLiveRegion', 'aria-live': 'polite', 'aria-atomic': 'true', style: 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;' }});
    document.body.appendChild(liveRegion);
  }

  // ----- Rendering -----
  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderProducts(filtered = null) {
    // apply search and sort
    const q = (searchInput?.value || '').trim().toLowerCase();
    const sort = sortSelect?.value || 'default';
    let list = Array.isArray(filtered) ? filtered.slice() : products.slice();

    if (q.length) {
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));

    clearChildren(productsEl);

    if (!list.length) {
      productsEl.appendChild(el('div', { cls: 'text-center small text-muted', text: 'No products found' }));
      return;
    }

    // create grid using columns similar to bootstrap layout; keep markup compact
    list.forEach((p, idx) => {
      const col = el('div', { cls: 'col-12 col-sm-6 col-md-4' });
      const card = el('div', { cls: 'product-card', attrs: { 'data-id': String(p.id), role: 'group' } });

      const priceBadge = el('div', { cls: 'price-badge', text: fmtNum(p.price) + ' TND' });

      const imgWrapper = el('div', { cls: 'product-image-wrapper' });
      if (p.img) {
        const img = el('img', { attrs: { src: p.img, alt: p.name } });
        img.className = 'product-img';
        img.style.maxWidth = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '10px';
        imgWrapper.appendChild(img);
      } else {
        const placeholder = el('div', { cls: 'text-muted', text: 'No image' });
        placeholder.style.height = '150px';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        imgWrapper.appendChild(placeholder);
      }

      const title = el('h5', { cls: 'mb-1 title', text: p.name });
      const meta = el('p', { cls: 'mb-2 desc small-muted', text: currency(p.price) });

      const addBtn = el('button', { cls: 'btn btn-cta btn-sm', type: 'button', text: 'Add to cart' });
      addBtn.addEventListener('click', () => addToCart(p.id));

      const ctaWrap = el('div', { cls: 'd-grid gap-2' }, addBtn);

      card.appendChild(priceBadge);
      card.appendChild(imgWrapper);
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(ctaWrap);

      col.appendChild(card);
      productsEl.appendChild(col);

      // staggered reveal
      setTimeout(() => card.classList.add('enter'), idx * 70);
    });
  }

  function renderCart() {
    clearChildren(cartBody);
    let total = 0;

    if (!cart.length) {
      const tr = el('tr');
      const td = el('td', { cls: 'text-center text-muted', attrs: { colspan: '5' }, text: 'Cart is empty' });
      tr.appendChild(td);
      cartBody.appendChild(tr);
      grandTotalEl.textContent = currency(0);
      liveRegion.textContent = 'Cart is empty';
      return;
    }

    cart.forEach(item => {
      const tr = el('tr');

      const tdName = el('td', {}, el('div', { text: item.name }));
      const tdPrice = el('td', { cls: 'text-end' }, el('div', { text: currency(item.price) }));
      const tdQty = el('td', { attrs: { style: 'width:95px' } });
      const qtyInput = el('input', { cls: 'form-control form-control-sm', type: 'number' });
      qtyInput.min = '1';
      qtyInput.value = String(item.qty);
      qtyInput.addEventListener('change', () => changeQty(item.id, qtyInput.value));
      tdQty.appendChild(qtyInput);
      const line = round2(item.price * item.qty);
      const tdLine = el('td', { cls: 'text-end', text: currency(line) });
      const tdActions = el('td');
      const delBtn = el('button', { cls: 'btn btn-sm btn-danger', type: 'button', text: 'Remove' });
      delBtn.addEventListener('click', () => removeFromCart(item.id));
      tdActions.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdPrice);
      tr.appendChild(tdQty);
      tr.appendChild(tdLine);
      tr.appendChild(tdActions);
      cartBody.appendChild(tr);

      total += line;
    });

    total = round2(total);
    grandTotalEl.textContent = currency(total);
    liveRegion.textContent = `Cart updated. Total ${currency(total)}`;
  }

  // ----- Cart operations -----
  function addToCart(id) {
    const prod = products.find(p => Number(p.id) === Number(id));
    if (!prod) {
      showToast('Product not found');
      return;
    }
    const existing = cart.find(i => Number(i.id) === Number(id));
    if (existing) existing.qty = Math.max(1, Number(existing.qty) + 1);
    else cart.push({ id: prod.id, name: prod.name, price: round2(prod.price), qty: 1 });
    persistCart(cart);
    renderCart();
    showToast(`${prod.name} added`);
  }

  function removeFromCart(id) {
    cart = cart.filter(i => Number(i.id) !== Number(id));
    persistCart(cart);
    renderCart();
    showToast('Removed');
  }

  function changeQty(id, val) {
    const item = cart.find(i => Number(i.id) === Number(id));
    if (!item) return;
    const q = Math.max(1, parseInt(val) || 1);
    item.qty = q;
    persistCart(cart);
    renderCart();
  }

  // ----- Checkout -----
  function prepareCheckout() {
    clearChildren(checkoutItemsEl);
    if (!cart.length) {
      checkoutItemsEl.appendChild(el('div', { cls: 'text-center text-muted', text: 'Cart empty' }));
      checkoutTotalEl.textContent = currency(0);
      return;
    }
    cart.forEach(i => {
      const row = el('div', { cls: 'd-flex justify-content-between' });
      row.appendChild(el('span', { text: `${i.qty} × ${i.name}` }));
      row.appendChild(el('span', { text: currency(i.price * i.qty) }));
      checkoutItemsEl.appendChild(row);
    });
    const tot = round2(cart.reduce((s, it) => s + it.price * it.qty, 0));
    checkoutTotalEl.textContent = currency(tot);
    if (checkoutModal) checkoutModal.show();
  }

  function finalizeOrder() {
    if (!cart.length) { alert('Cart is empty'); return; }
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrder = {
      id: uid(),
      date: new Date().toISOString(),
      items: cart.map(i => ({ ...i })),
      total: round2(cart.reduce((s, it) => s + it.price * it.qty, 0))
    };
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    cart = [];
    persistCart(cart);
    renderCart();
    if (checkoutModal) checkoutModal.hide();
    // show confirmation overlay
    orderConfirmEl.classList.add('show');
    setTimeout(() => orderConfirmEl.classList.remove('show'), 2000);
    showToast('Order saved locally. Call 27441307 to confirm.');
  }

  // ----- Admin UI -----
  function populateAdminList() {
    clearChildren(adminListEl);
    if (!products.length) {
      adminListEl.appendChild(el('div', { cls: 'text-center text-muted', text: 'No products yet' }));
      return;
    }
    products.forEach(p => {
      const item = el('div', { cls: 'list-group-item d-flex align-items-center justify-content-between' });
      const left = el('div', { cls: 'd-flex align-items-center' });

      if (p.img) {
        const img = el('img', { attrs: { src: p.img, alt: p.name }});
        img.style.height = '48px'; img.style.width = '48px'; img.style.objectFit = 'cover'; img.style.borderRadius = '6px'; img.style.marginRight = '12px';
        left.appendChild(img);
      } else {
        const placeholder = el('div', { cls: 'text-muted', text: '—' });
        placeholder.style.width = '48px'; placeholder.style.height = '48px'; placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center'; placeholder.style.justifyContent = 'center';
        placeholder.style.background = '#f0f0f0'; placeholder.style.borderRadius = '6px'; placeholder.style.marginRight = '12px';
        left.appendChild(placeholder);
      }

      const info = el('div', {});
      info.appendChild(el('div', { cls: 'fw-bold ms-2', text: p.name }));
      info.appendChild(el('div', { cls: 'text-muted ms-2', text: currency(p.price) }));

      left.appendChild(info);
      item.appendChild(left);

      const right = el('div', {});
      const editBtn = el('button', { cls: 'btn btn-sm btn-outline-primary me-2', type: 'button', text: 'Edit' });
      editBtn.addEventListener('click', () => openEdit(p.id));
      const delBtn = el('button', { cls: 'btn btn-sm btn-outline-danger', type: 'button', text: 'Delete' });
      delBtn.addEventListener('click', () => deleteProduct(p.id));
      right.appendChild(editBtn);
      right.appendChild(delBtn);

      item.appendChild(right);
      adminListEl.appendChild(item);
    });
  }

  function addProductFromAdmin() {
    const nameInput = document.getElementById('newName');
    const priceInput = document.getElementById('newPrice');
    const imageInput = document.getElementById('newImage');
    const name = (nameInput?.value || '').trim();
    const price = parseFloat(priceInput?.value);
    const img = (imageInput?.value || '').trim();

    if (!name || Number.isNaN(price)) {
      alert('Enter a valid name and price');
      return;
    }
    const id = Date.now();
    products.push({ id, name, price: round2(price), img });
    saveProducts(products);

    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '';
    if (imageInput) imageInput.value = '';

    renderProducts();
    populateAdminList();
    showToast('Product added');
  }

  function openEdit(id) {
    const p = products.find(x => Number(x.id) === Number(id));
    if (!p) return;
    const newName = prompt('Edit name:', p.name);
    if (newName === null) return;
    const newPriceRaw = prompt('Edit price (TND):', String(p.price));
    if (newPriceRaw === null) return;
    const newImg = prompt('Image URL (leave empty to keep):', p.img || '');

    p.name = newName.trim() || p.name;
    p.price = round2(Number(newPriceRaw) || p.price);
    p.img = newImg === null ? p.img : newImg.trim();

    saveProducts(products);
    renderProducts();
    populateAdminList();
    showToast('Product updated');
  }

  function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    products = products.filter(p => Number(p.id) !== Number(id));
    saveProducts(products);
    renderProducts();
    populateAdminList();
    showToast('Deleted');
  }

  // ----- Small UI helpers: toast + ripple ----- 
  let toastTimer = null;
  function showToast(text) {
    const bubble = el('div', { cls: 'toast-bubble', text });
    // basic styling if not provided by CSS
    bubble.style.position = 'fixed';
    bubble.style.left = '50%';
    bubble.style.transform = 'translateX(-50%)';
    bubble.style.bottom = '28px';
    bubble.style.background = 'rgba(20,20,20,0.9)';
    bubble.style.color = '#fff';
    bubble.style.padding = '10px 14px';
    bubble.style.borderRadius = '10px';
    bubble.style.zIndex = 1100;
    bubble.style.transition = 'opacity .28s';
    document.body.appendChild(bubble);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      bubble.style.opacity = '0';
      setTimeout(() => bubble.remove(), 250);
    }, 1200);
  }

  // ripple effect (delegated)
  document.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest('.btn-cta, .btn, .btn-primary, .btn-outline-primary, .btn-outline-danger');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const r = Math.max(rect.width, rect.height) * 1.2;
    const ripple = el('span', { cls: 'ripple-span' });
    Object.assign(ripple.style, {
      position: 'absolute',
      left: (e.clientX - rect.left - r / 2) + 'px',
      top: (e.clientY - rect.top - r / 2) + 'px',
      width: r + 'px',
      height: r + 'px',
      background: 'rgba(255,255,255,0.18)',
      borderRadius: '50%',
      transform: 'scale(0)',
      pointerEvents: 'none',
      transition: 'transform .5s ease, opacity .5s ease',
      zIndex: 2
    });
    btn.style.position = getComputedStyle(btn).position === 'static' ? 'relative' : getComputedStyle(btn).position;
    btn.appendChild(ripple);
    requestAnimationFrame(() => { ripple.style.transform = 'scale(1.8)'; });
    setTimeout(() => { ripple.style.opacity = '0'; }, 350);
    setTimeout(() => ripple.remove(), 700);
  });

  // ----- Event wiring -----
  if (searchInput) searchInput.addEventListener('input', () => renderProducts());
  if (sortSelect) sortSelect.addEventListener('change', () => renderProducts());

  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      const pass = prompt('Admin password:');
      if (pass === ADMIN_PASSWORD) {
        populateAdminList();
        if (adminModal) adminModal.show();
        else alert('Admin mode (modal not available).');
      } else if (pass !== null) {
        alert('Wrong password');
      }
    });
  }

  // Expose addProductFromAdmin for inline HTML button (keeps compatibility)
  window.addProductFromAdmin = addProductFromAdmin;

  // Expose some other functions for compatibility with inline HTML (if used)
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.changeQty = changeQty;
  window.prepareCheckout = prepareCheckout;
  window.finalizeOrder = finalizeOrder;

  // ----- Init -----
  function init() {
    products = readProducts();
    cart = readCart();
    renderProducts();
    renderCart();
  }

  // run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
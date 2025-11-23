// main.js — CLEAN, SIMPLE, EASY TO MAINTAIN
(function () {
  'use strict';

  // STORAGE KEYS
  const STORAGE_KEYS = {
    CART: 'tt_cart_v3',
    ORDERS: 'tt_orders_v3'
  };

  // PRODUCTS (use /images/ folder, no uploader needed)
  const products = [
    { id: 1, name: "Gâteau chocolat", price: 40.00, img: "images/gt Chocolat.jpg", category: "les-gateau" },
    { id: 2, name: "Gâteau pistache", price: 40.00, img: "images/gt pistache.jpg", category: "les-gateau" },
    { id: 3, name: "Gâteau fraise", price: 40.00, img: "images/gt fraise.jpg", category: "les-gateau" },
    { id: 4, name: "Makroud", price: 4.00, img: "images/makroud.jpg", category: "حلو عربي" },
    { id: 5, name: "Zlabia", price: 3.50, img: "images/zlabia.jpg", category: "حلو عربي" },
    { id: 6, name: "Jus Orange", price: 2.50, img: "images/jus-orange.jpg", category: "juice" },
    { id: 7, name: "Soirée chocolat", price: 15.00, img: "images/soiree-choco.jpg", category: "gateau-soiree" }
  ];

  // CART
  let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');

  // SECTIONS
  const sections = {
    'les-gateau': document.querySelector('[data-section="les-gateau"]'),
    'halawa-arabi': document.querySelector('[data-section="حلو عربي"]'),
    'juice': document.querySelector('[data-section="juice"]'),
    'gateau-soiree': document.querySelector('[data-section="gateau-soiree"]')
  };

  // ELEMENTS
  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryNav = document.getElementById('categoryNav');

  // HELPERS
  function fmt(n) { return Number(n).toFixed(2); }
  const localeFormatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 });
  function currency(n) { return localeFormatter.format(Number(n)); }
  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
  function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // TOAST
  function showToast(text) {
    const el = document.createElement('div');
    el.className = 'toast-bubble';
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '28px',
      background: 'rgba(20,20,20,0.9)',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '10px',
      zIndex: 9999,
      transition: 'opacity 250ms',
      opacity: '1',
      pointerEvents: 'none'
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, 1100);
  }

  // RENDER PRODUCTS
  function renderProducts() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const sort = sortSelect?.value || 'default';
    Object.values(sections).forEach(s => { if (s) clearChildren(s); });

    let list = products.slice();
    if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'name-asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    list.forEach((p) => {
      const sec = sections[p.category] || sections['les-gateau'];
      if (!sec) return;

      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-id', p.id);

      const badge = document.createElement('div');
      badge.className = 'price-badge';
      badge.textContent = currency(p.price || 0);
      card.appendChild(badge);

      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.name;
      img.loading = 'lazy';
      img.className = 'product-img';
      card.appendChild(img);

      const title = document.createElement('h5');
      title.className = 'mb-1 title';
      title.textContent = p.name || 'Unnamed';
      card.appendChild(title);

      const ctaWrap = document.createElement('div');
      ctaWrap.className = 'd-grid gap-2';
      const btn = document.createElement('button');
      btn.className = 'btn btn-cta btn-sm';
      btn.type = 'button';
      btn.textContent = 'Add to cart';
      btn.addEventListener('click', () => addToCart(p.id));
      ctaWrap.appendChild(btn);
      card.appendChild(ctaWrap);

      col.appendChild(card);
      sec.appendChild(col);
    });
  }

  // CART FUNCTIONS
  function persistCart() { localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); }

  function addToCart(id) {
    const prod = products.find(p => Number(p.id) === Number(id));
    if (!prod) { showToast('Product not found'); return; }
    const item = cart.find(i => Number(i.id) === Number(id));
    if (item) item.qty++;
    else cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), qty: 1 });
    persistCart(); renderCart(); showToast(`${prod.name} added`);
  }

  function removeFromCart(id) { cart = cart.filter(i => Number(i.id) !== Number(id)); persistCart(); renderCart(); }
  function changeQty(id, val) { const it = cart.find(i => Number(i.id) === Number(id)); if (!it) return; it.qty = Math.max(1, parseInt(val) || 1); persistCart(); renderCart(); }

  function renderCart() {
    clearChildren(cartBody);
    let total = 0;
    if (!cart.length) {
      cartBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>`;
      grandTotalEl.innerText = currency(0);
      return;
    }
    cart.forEach(it => {
      const line = round2(it.price * it.qty);
      total += line;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="min-width:120px">${escapeHtml(it.name)}</td>
        <td class="text-end">${fmt(it.price)} TND</td>
        <td style="width:95px"><input class="form-control form-control-sm" type="number" min="1" value="${it.qty}" /></td>
        <td class="text-end">${fmt(line)} TND</td>
        <td><button class="btn btn-sm btn-danger">Remove</button></td>
      `;
      tr.querySelector('input').addEventListener('change', e => changeQty(it.id, e.target.value));
      tr.querySelector('button').addEventListener('click', () => removeFromCart(it.id));
      cartBody.appendChild(tr);
    });
    grandTotalEl.innerText = currency(round2(total));
  }

  // CHECKOUT
  function prepareCheckout() {
    clearChildren(checkoutItems);
    if (!cart.length) { checkoutItems.innerHTML = `<div class="text-center text-muted">Cart empty</div>`; checkoutTotal.innerText = currency(0); return; }
    cart.forEach(i => {
      const row = document.createElement('div');
      row.className = 'd-flex justify-content-between';
      row.innerHTML = `<span>${i.qty} × ${escapeHtml(i.name)}</span><span>${fmt(i.price * i.qty)} TND</span>`;
      checkoutItems.appendChild(row);
    });
    checkoutTotal.innerText = currency(round2(cart.reduce((s, i) => s + i.price * i.qty, 0)));
  }

  function finalizeOrder() {
    if (!cart.length) { alert('Cart is empty'); return; }
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrder = { id: Date.now(), date: new Date().toISOString(), items: cart.slice(), total: round2(cart.reduce((s, i) => s + i.price * i.qty, 0)) };
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    cart = []; persistCart(); renderCart();
    const orderConfirmEl = document.getElementById('orderConfirm');
    if (orderConfirmEl) { orderConfirmEl.classList.add('show'); setTimeout(() => orderConfirmEl.classList.remove('show'), 1800); }
    alert('Order saved locally. Call 27441307 to confirm.');
  }

  // CATEGORY NAV
  function renderCategoryNav() {
    const cats = ['les-gateau', 'halawa-arabi', 'juice', 'gateau-soiree'];
    clearChildren(categoryNav);
    cats.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.textContent = c.replace('-', ' ');
      btn.dataset.target = c;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sec = document.querySelector(`[data-section="${c}"]`);
        if (sec && sec.parentElement) sec.parentElement.scrollIntoView({ behavior: 'smooth' });
      });
      categoryNav.appendChild(btn);
    });
  }

  // SEARCH & SORT LISTENERS
  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (sortSelect) sortSelect.addEventListener('change', renderProducts);

  // EXPOSE FUNCTIONS
  window.prepareCheckout = prepareCheckout;
  window.finalizeOrder = finalizeOrder;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.changeQty = changeQty;

  // INIT
  function init() {
    renderCategoryNav();
    renderProducts();
    renderCart();
    document.querySelectorAll('.section-grid').forEach(s => s.classList.add('visible'));
    const first = document.querySelector('.cat-btn');
    if (first) first.classList.add('active');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();

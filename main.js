// main.js — simplified + easier image uploads (stored in localStorage)
(function () {
  'use strict';

  const STORAGE_KEYS = {
    PRODUCTS: 'tt_products_v3',
    CART: 'tt_cart_v3',
    ORDERS: 'tt_orders_v3'
  };

  // simple starter products (you can replace images or upload new ones)
  const defaultProducts = [
    { id: 1, name: 'Gâteau chocolat', price: 40.50, img: 'images/gt-chocolat.jpg', category: 'les-gateau' },
    { id: 2, name: 'Opéra', price: 12.00, img: 'images/opera.jpg', category: 'les-gateau' },
    { id: 3, name: 'Makroud', price: 4.00, img: 'images/makroud.jpg', category: 'halawa-arabi' },
    { id: 4, name: 'Zlabia', price: 3.50, img: 'images/zlabia.jpg', category: 'halawa-arabi' },
    { id: 5, name: 'Jus Orange', price: 2.50, img: 'images/juice-orange.jpg', category: 'juice' },
    { id: 6, name: 'Soirée chocolat', price: 15.00, img: 'images/soiree-choco.jpg', category: 'gateau-soiree' }
  ];

  // helpers
  function readProducts() {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
      return defaultProducts.map(p => ({ ...p }));
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('invalid');
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
      return defaultProducts.map(p => ({ ...p }));
    }
  }
  function saveProducts(list) { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list)); }

  let products = readProducts();
  let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');

  const sections = {
    'les-gateau': document.querySelector('[data-section="les-gateau"]'),
    'halawa-arabi': document.querySelector('[data-section="halawa-arabi"]'),
    'juice': document.querySelector('[data-section="juice"]'),
    'gateau-soiree': document.querySelector('[data-section="gateau-soiree"]')
  };

  /* elements */
  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  // uploader elements
  const toggleUploader = document.getElementById('toggleUploader');
  const uploader = document.getElementById('uploader');
  const imgUpload = document.getElementById('imgUpload');
  const addUploads = document.getElementById('addUploads');
  const preview = document.getElementById('preview');
  const prodNameInput = document.getElementById('prodName');
  const prodPriceInput = document.getElementById('prodPrice');
  const prodCategory = document.getElementById('prodCategory');
  const categoryNav = document.getElementById('categoryNav');

  // formatting
  function fmt(n) { return Number(n).toFixed(2); }
  const localeFormatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 });
  function currency(n) { try { return localeFormatter.format(Number(n)); } catch { return fmt(n) + ' TND'; } }
  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* Render */
  function renderProducts() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const sort = sortSelect?.value || 'default';

    Object.values(sections).forEach(s => { if (s) clearChildren(s); });

    let list = products.slice();
    if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'name-asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    list.forEach((p, idx) => {
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

      if (p.img) {
        const img = document.createElement('img');
        img.src = p.img; // could be a path or dataURL
        img.alt = p.name || 'product';
        img.loading = 'lazy';
        img.className = 'product-img';
        card.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'text-muted';
        ph.style.height = '150px';
        ph.style.display = 'flex';
        ph.style.alignItems = 'center';
        ph.style.justifyContent = 'center';
        ph.textContent = 'No image';
        card.appendChild(ph);
      }

      const title = document.createElement('h5');
      title.className = 'mb-1 title';
      title.textContent = p.name || 'Unnamed';
      card.appendChild(title);

      const meta = document.createElement('p');
      meta.className = 'mb-2 desc small-muted';
      meta.textContent = p.desc || '';
      card.appendChild(meta);

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
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="text-center text-muted">Cart is empty</td>`;
      cartBody.appendChild(tr);
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
      const input = tr.querySelector('input');
      input.addEventListener('change', () => changeQty(it.id, input.value));
      tr.querySelector('button').addEventListener('click', () => removeFromCart(it.id));
      cartBody.appendChild(tr);
    });
    grandTotalEl.innerText = currency(round2(total));
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function prepareCheckout() {
    clearChildren(checkoutItems);
    if (!cart.length) { checkoutItems.innerHTML = `<div class="text-center text-muted">Cart empty</div>`; checkoutTotal.innerText = currency(0); return; }
    cart.forEach(i => {
      const row = document.createElement('div');
      row.className = 'd-flex justify-content-between';
      row.innerHTML = `<span>${i.qty} × ${escapeHtml(i.name)}</span><span>${fmt(i.price * i.qty)} TND</span>`;
      checkoutItems.appendChild(row);
    });
    const tot = round2(cart.reduce((s, i) => s + i.price * i.qty, 0));
    checkoutTotal.innerText = currency(tot);
  }

  function finalizeOrder() {
    if (!cart.length) { alert('Cart is empty'); return; }
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrder = { id: Date.now(), date: new Date().toISOString(), items: cart.slice(), total: round2(cart.reduce((s, i) => s + i.price * i.qty, 0)) };
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    cart = []; persistCart(); renderCart();
    const orderConfirmEl = document.getElementById('orderConfirm');
    if (orderConfirmEl) {
      orderConfirmEl.classList.add('show');
      setTimeout(() => orderConfirmEl.classList.remove('show'), 1800);
    }
    alert('Order saved locally. Call 27441307 to confirm.');
  }

  // simple toast
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

  // search/sort listeners
  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (sortSelect) sortSelect.addEventListener('change', renderProducts);

  // image uploader logic: preview -> add as product (stores image as dataURL)
  toggleUploader?.addEventListener('click', () => {
    uploader.classList.toggle('container-hidden');
  });

  imgUpload?.addEventListener('change', () => {
    clearChildren(preview);
    const files = Array.from(imgUpload.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        const div = document.createElement('div');
        div.className = 'preview-card';
        div.innerHTML = `<img src="${e.target.result}" alt="${f.name}">`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(f);
    });
  });

  // add uploads as products
  addUploads?.addEventListener('click', () => {
    const files = Array.from(imgUpload.files || []);
    const nameBase = (prodNameInput?.value || '').trim();
    const price = parseFloat(prodPriceInput?.value || '0') || 0;
    const category = prodCategory?.value || 'les-gateau';
    if (!files.length) return showToast('Choose images first');
    let newProducts = products.slice();
    let id = newProducts.length ? Math.max(...newProducts.map(p => p.id)) + 1 : 1;
    const readers = files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => {
        const p = { id: id++, name: nameBase || f.name.replace(/\.[^/.]+$/, ''), price: price, img: e.target.result, category };
        res(p);
      };
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(newItems => {
      newProducts = newProducts.concat(newItems);
      products = newProducts;
      saveProducts(products);
      imgUpload.value = '';
      prodNameInput.value = '';
      prodPriceInput.value = '';
      clearChildren(preview);
      renderProducts();
      showToast('Images added as products');
    });
  });

  // categories nav (simple)
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
        // mobile only slider scroll
        if (window.innerWidth <= 900) {
          goToPage(c);
        } else {
          // scroll to the section element on desktop
          const sec = document.querySelector(`[data-section="${c}"]`);
          if (sec && sec.parentElement) sec.parentElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
      categoryNav.appendChild(btn);
    });
  }

  // slider control (mobile)
  const slider = document.getElementById('sectionSlider');
  const pages = document.querySelectorAll('.slider-page');
  function goToPage(pageName) {
    const index = [...pages].findIndex(p => p.dataset.page === pageName);
    if (index === -1 || !slider) return;
    slider.scrollTo({ left: index * slider.clientWidth, behavior: 'smooth' });
  }

  // expose functions for modal buttons
  window.prepareCheckout = function () {
    prepareCheckout();
  };
  window.finalizeOrder = finalizeOrder;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.changeQty = changeQty;

  // init
  function init() {
    renderCategoryNav();
    renderProducts();
    renderCart();
    // show all sections (add visible class)
    document.querySelectorAll('.section-grid').forEach(s => s.classList.add('visible'));
    // select first category
    const first = document.querySelector('.cat-btn');
    if (first) first.classList.add('active');
    // default mobile go to first page
    if (window.innerWidth <= 900) goToPage('les-gateau');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();

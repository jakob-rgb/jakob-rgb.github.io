// main.js — categories, professional product layout, no admin
(function () {
  'use strict';

  const STORAGE_KEYS = { PRODUCTS: 'tt_products_v2', CART: 'tt_cart_v2', ORDERS: 'tt_orders_v2' };

  const defaultProducts = [
    { id: 1, name: '', price: 6.50, img: 'images/baklawa.jpg', category: 'les-gateau' },
    { id: 2, name: '', price: 12.00, img: 'images/opera.jpg', category: 'les-gateau' },
    { id: 3, name: 'test1', price: 4.00, img: 'images/makroud.jpg', category: 'halawa-arabi' },
    { id: 4, name: 'test', price: 3.50, img: 'images/zlabia.jpg', category: 'halawa-arabi' },
    { id: 5, name: 'test', price: 2.50, img: 'images/juice-orange.jpg', category: 'juice' },
    { id: 6, name: 'test', price: 3.20, img: 'images/juice-mix.jpg', category: 'juice' },
    { id: 7, name: 'test (chocolat)', price: 15.00, img: 'images/soiree-choco.jpg', category: 'gateau-soiree' },
    { id: 8, name: 'test (vanille)', price: 14.00, img: 'images/soiree-vanille.jpg', category: 'gateau-soiree' }
  ];

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
  function saveProducts(p){ localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(p)); }

  let products = readProducts();
  let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');

  const sections = {
    'les-gateau': document.querySelector('[data-section="les-gateau"]'),
    'halawa-arabi': document.querySelector('[data-section="halawa-arabi"]'),
    'juice': document.querySelector('[data-section="juice"]'),
    'gateau-soiree': document.querySelector('[data-section="gateau-soiree"]')
  };

  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  function fmt(n){ return Number(n).toFixed(2); }
  const localeFormatter = new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 });
  function currency(n){ try { return localeFormatter.format(Number(n)); } catch { return fmt(n) + ' TND'; } }
  function round2(n){ return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  function clearChildren(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function renderProducts() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const sort = sortSelect?.value || 'default';

    // start empty sections
    Object.values(sections).forEach(s => { if (s) clearChildren(s); });

    let list = products.slice();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    if (sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
    if (sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
    if (sort === 'name-asc') list.sort((a,b)=>a.name.localeCompare(b.name));

    // group to sections
    list.forEach((p, idx) => {
      const sec = sections[p.category] || sections['les-gateau'];
      if (!sec) return;
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-id', p.id);

      // price badge
      const badge = document.createElement('div');
      badge.className = 'price-badge';
      badge.textContent = currency(p.price);
      card.appendChild(badge);

      if (p.img) {
        const img = document.createElement('img');
        img.src = p.img;
        img.alt = p.name;
        img.loading = 'lazy';
        img.className = 'product-img';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '10px';
        img.style.marginBottom = '10px';
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
      title.textContent = p.name;
      card.appendChild(title);

      const meta = document.createElement('p');
      meta.className = 'mb-2 desc small-muted';
      meta.textContent = ''; // optional short description; keep empty for now
      card.appendChild(meta);

      const ctaWrap = document.createElement('div');
      ctaWrap.className = 'd-grid gap-2';
      const btn = document.createElement('button');
      btn.className = 'btn btn-cta btn-sm';
      btn.type = 'button';
      btn.textContent = 'Add to cart';
      btn.addEventListener('click', ()=> addToCart(p.id));
      ctaWrap.appendChild(btn);
      card.appendChild(ctaWrap);

      col.appendChild(card);
      sec.appendChild(col);

      setTimeout(()=> card.classList.add('enter'), idx * 60);
    });
  }

  function persistCart(){ localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); }

  function addToCart(id){
    const prod = products.find(p=>Number(p.id)===Number(id));
    if(!prod){ showToast('Product not found'); return; }
    const item = cart.find(i=>Number(i.id)===Number(id));
    if(item) item.qty++;
    else cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), qty: 1 });
    persistCart(); renderCart(); showToast(`${prod.name} added`);
  }

  function removeFromCart(id){ cart = cart.filter(i=>Number(i.id)!==Number(id)); persistCart(); renderCart(); }
  function changeQty(id, val){ const it = cart.find(i=>Number(i.id)===Number(id)); if(!it) return; it.qty = Math.max(1, parseInt(val)||1); persistCart(); renderCart(); }

  function renderCart(){
    clearChildren(cartBody);
    let total = 0;
    if(!cart.length){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="text-center text-muted">Cart is empty</td>`;
      cartBody.appendChild(tr);
      grandTotalEl.innerText = currency(0);
      return;
    }
    cart.forEach(it=>{
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
      input.addEventListener('change', ()=> changeQty(it.id, input.value));
      tr.querySelector('button').addEventListener('click', ()=> removeFromCart(it.id));
      cartBody.appendChild(tr);
    });
    grandTotalEl.innerText = currency(round2(total));
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function fmt(n){ return Number(n).toFixed(2); }

  function prepareCheckout(){
    clearChildren(checkoutItems);
    if(!cart.length){ checkoutItems.innerHTML = `<div class="text-center text-muted">Cart empty</div>`; checkoutTotal.innerText = currency(0); return; }
    cart.forEach(i=>{
      const row = document.createElement('div');
      row.className = 'd-flex justify-content-between';
      row.innerHTML = `<span>${i.qty} × ${escapeHtml(i.name)}</span><span>${fmt(i.price*i.qty)} TND</span>`;
      checkoutItems.appendChild(row);
    });
    const tot = round2(cart.reduce((s,i)=>s + i.price*i.qty, 0));
    checkoutTotal.innerText = currency(tot);
  }

  function finalizeOrder(){
    if(!cart.length){ alert('Cart is empty'); return; }
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrder = { id: Date.now(), date: new Date().toISOString(), items: cart.slice(), total: round2(cart.reduce((s,i)=>s + i.price*i.qty, 0)) };
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    cart = []; persistCart(); renderCart();
    // feedback
    const orderConfirmEl = document.getElementById('orderConfirm');
    orderConfirmEl.classList.add('show');
    setTimeout(()=> orderConfirmEl.classList.remove('show'), 1900);
    alert('Order saved locally. Call 27441307 to confirm.');
  }

  // simple toast
  function showToast(text){
    const el = document.createElement('div');
    el.className = 'toast-bubble';
    el.textContent = text;
    Object.assign(el.style, { position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'28px', background:'rgba(20,20,20,0.9)', color:'#fff', padding:'10px 14px', borderRadius:'10px', zIndex:1100 });
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),250); }, 1100);
  }

  // search/sort listeners
  if(searchInput) searchInput.addEventListener('input', renderProducts);
  if(sortSelect) sortSelect.addEventListener('change', renderProducts);

  // expose used by HTML for checkout buttons
  window.prepareCheckout = prepareCheckout;
  window.finalizeOrder = finalizeOrder;
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.changeQty = changeQty;

  // init
  function init(){ products = readProducts(); renderProducts(); renderCart(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
// CATEGORY FILTER + ANIMATION
const catBtns = document.querySelectorAll('.cat-btn');
const allSections = document.querySelectorAll('.section-grid');

catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    
    // activate button
    catBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const target = btn.dataset.target;

    // hide all sections
    allSections.forEach(sec => {
      sec.classList.remove('visible');
      sec.parentElement.style.display = 'none';
    });

    // show only selected section
    const selectedSec = document.querySelector(`[data-section="${target}"]`);
    selectedSec.parentElement.style.display = 'block';

    // animate
    setTimeout(() => selectedSec.classList.add('visible'), 50);

    // smooth scroll
    selectedSec.parentElement.scrollIntoView({ behavior: "smooth" });
  });
});

// Show all when page loads
window.addEventListener("DOMContentLoaded", () => {
  allSections.forEach(sec => sec.classList.add("visible"));
});
// HORIZONTAL SLIDER CONTROL
const slider = document.getElementById('sectionSlider');
const pages = document.querySelectorAll('.slider-page');

function goToPage(pageName) {
  const index = [...pages].findIndex(p => p.dataset.page === pageName);
  if (index === -1) return;

  slider.style.transform = `translateX(-${index * 100}%)`;

  pages.forEach(p => p.classList.remove('active'));
  pages[index].classList.add('active');
}

// category button clicks
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    goToPage(btn.dataset.target);
  });
});

// default
window.addEventListener("DOMContentLoaded", () => {
  goToPage("les-gateau");
});
})();
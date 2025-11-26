// main.js — CLEAN, SIMPLE, EASY TO MAINTAIN
(function () {
  'use strict';

  const STORAGE_KEYS = { CART: 'tt_cart_v4', ORDERS: 'tt_orders_v4' };

  const CATEGORIES = [
    { key: 'les-gateau', label: 'Les gâteaux' },
    { key: 'halawa-arabi', label: 'حلو عربي' },
    { key: 'juice', label: 'Jus' },
    { key: 'gateau-soiree', label: 'Gâteaux soirée' }
  ];

  const products = [
    { id:1, name:'Gâteau chocolat', price:40.00, img:'images/gt-chocolat.jpg', category:'les-gateau' },
    { id:2, name:'Gâteau pistache', price:40.00, img:'images/gt-pistache.jpg', category:'les-gateau' },
    { id:3, name:'Gâteau fraise', price:40.00, img:'images/gt-fraise.jpg', category:'les-gateau' },
    { id:4, name:'Makroud', price:4.00, img:'images/makroud.jpg', category:'halawa-arabi' },
    { id:5, name:'withnin 9athi', price:3.50, img:'images/zlabia.jpg', category:'halawa-arabi' },
    { id:6, name:'Jus Orange', price:2.50, img:'images/jus-orange.jpg', category:'juice' },
    { id:7, name:'Soirée chocolat', price:15.00, img:'images/soiree-choco.jpg', category:'gateau-soiree' }
  ];

  let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');

  const sectionSlider = document.getElementById('sectionSlider');
  const categoryNav = document.getElementById('categoryNav');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');
  const orderConfirmEl = document.getElementById('orderConfirm');
  const confirmOrderBtn = document.getElementById('confirmOrderBtn');

  const fmt = n => Number(n).toFixed(2);
  const localeFormatter = new Intl.NumberFormat('fr-TN', { style:'currency', currency:'TND', minimumFractionDigits:2 });
  const currency = n => localeFormatter.format(Number(n));
  const round2 = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
  const clearChildren = node => { while(node.firstChild) node.removeChild(node.firstChild); };
  const showToast = text => {
    const el = document.createElement('div'); el.className='toast-bubble'; el.textContent=text; document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),240); },1200);
  };

  function buildPages(){
    clearChildren(sectionSlider);
    CATEGORIES.forEach(cat=>{
      const page = document.createElement('section'); page.className='slider-page'; page.dataset.page = cat.key; page.setAttribute('aria-label', cat.label);
      const h = document.createElement('h3'); h.className='section-title'; h.textContent = cat.label; page.appendChild(h);
      const grid = document.createElement('div'); grid.className='section-grid'; grid.dataset.section = cat.key; page.appendChild(grid);
      sectionSlider.appendChild(page);
    });
  }

  function renderProducts(){
    const q = (searchInput.value||'').trim().toLowerCase();
    const sort = sortSelect.value || 'default';
    document.querySelectorAll('.section-grid').forEach(g=>clearChildren(g));

    let list = products.slice();
    if(q) list = list.filter(p => (p.name||'').toLowerCase().includes(q));
    if(sort==='price-asc') list.sort((a,b)=>a.price-b.price);
    if(sort==='price-desc') list.sort((a,b)=>b.price-a.price);
    if(sort==='name-asc') list.sort((a,b)=> (a.name||'').localeCompare(b.name||''));

    list.forEach(p=>{
      const grid = document.querySelector(`[data-section="${p.category}"]`);
      if(!grid) return;
      const col = document.createElement('div'); col.className='product-card'; col.setAttribute('data-id',p.id);

      const badge = document.createElement('div'); badge.className='price-badge'; badge.textContent = currency(p.price||0);
      const img = document.createElement('img'); img.className='product-img'; img.alt = p.name; img.loading='lazy'; img.src = p.img; img.onerror = () => { img.src='https://via.placeholder.com/400x300?text=No+image'; };
      const title = document.createElement('h5'); title.className='title'; title.textContent = p.name;
      const cta = document.createElement('button'); cta.className='btn-cta mt-2'; cta.type='button'; cta.textContent='Ajouter'; cta.addEventListener('click', ()=> addToCart(p.id));

      col.appendChild(badge); col.appendChild(img); col.appendChild(title); col.appendChild(cta);
      grid.appendChild(col);
    });
  }

  function persistCart(){ localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); }
  function addToCart(id){
    const prod = products.find(p=>p.id===Number(id)); if(!prod){ showToast('Produit introuvable'); return; }
    const item = cart.find(i=>i.id===Number(id)); if(item) item.qty++; else cart.push({ id:prod.id, name:prod.name, price:Number(prod.price), qty:1 });
    persistCart(); renderCart(); showToast(`${prod.name} ajouté`);
  }
  function removeFromCart(id){ cart = cart.filter(i=>Number(i.id)!==Number(id)); persistCart(); renderCart(); }
  function changeQty(id,val){ const it=cart.find(i=>Number(i.id)===Number(id)); if(!it) return; it.qty = Math.max(1, parseInt(val)||1); persistCart(); renderCart(); }

  function renderCart(){
    clearChildren(cartBody);
    let total = 0;
    if(!cart.length){ cartBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>`; grandTotalEl.innerText = currency(0); return; }
    cart.forEach(it=>{
      const line = round2(it.price * it.qty); total += line;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="min-width:120px">${escapeHtml(it.name)}</td>
        <td class="text-end">${fmt(it.price)} TND</td>
        <td style="width:95px"><input class="form-control form-control-sm" type="number" min="1" value="${it.qty}" /></td>
        <td class="text-end">${fmt(line)} TND</td>
        <td><button class="btn btn-sm btn-danger">Remove</button></td>
      `;
      tr.querySelector('input').addEventListener('change', e=> changeQty(it.id, e.target.value));
      tr.querySelector('button').addEventListener('click', ()=> removeFromCart(it.id));
      cartBody.appendChild(tr);
    });
    grandTotalEl.innerText = currency(round2(total));
  }

  function prepareCheckout(){
    clearChildren(checkoutItems);
    if(!cart.length){ checkoutItems.innerHTML = `<div class="text-center text-muted">Cart empty</div>`; checkoutTotal.innerText = currency(0); return; }
    cart.forEach(i=>{
      const row = document.createElement('div'); row.className='d-flex justify-content-between'; row.innerHTML = `<span>${i.qty} × ${escapeHtml(i.name)}</span><span>${fmt(i.price * i.qty)} TND</span>`; checkoutItems.appendChild(row);
    });
    checkoutTotal.innerText = currency(round2(cart.reduce((s,i)=>s + i.price * i.qty,0)));
  }

  function finalizeOrder(){
    if(!cart.length){ alert('Cart is empty'); return; }
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrder = { id: Date.now(), date: new Date().toISOString(), items: cart.slice(), total: round2(cart.reduce((s,i)=>s + i.price * i.qty,0)) };
    orders.push(newOrder); localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders)); cart=[]; persistCart(); renderCart();
    if(orderConfirmEl){ orderConfirmEl.classList.add('show'); setTimeout(()=> orderConfirmEl.classList.remove('show'),1800); }
    alert('Order saved locally. Call 27441307 to confirm.');
  }

  function renderCategoryNav(){
    clearChildren(categoryNav);
    CATEGORIES.forEach(c=>{
      const btn = document.createElement('button'); btn.className='cat-btn'; btn.textContent = c.label; btn.dataset.target = c.key;
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const sec = document.querySelector(`[data-page="${c.key}"]`);
        if(sec) sec.scrollIntoView({ behavior:'smooth', block:'center' });
      });
      categoryNav.appendChild(btn);
    });
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c])); }

  if(searchInput) searchInput.addEventListener('input', renderProducts);
  if(sortSelect) sortSelect.addEventListener('change', renderProducts);

  window.prepareCheckout = prepareCheckout; window.finalizeOrder = finalizeOrder; window.addToCart = addToCart; window.removeFromCart = removeFromCart; window.changeQty = changeQty;

  function init(){ buildPages(); renderCategoryNav(); renderProducts(); renderCart(); const first = document.querySelector('.cat-btn'); if(first) first.classList.add('active'); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

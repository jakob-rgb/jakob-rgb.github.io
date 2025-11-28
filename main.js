Main. Js
// main.js — Optimized, Clean, Fast
(() => {
'use strict';

/* ==============================
CONSTANTS & HELPERS
=============================== */
const STORAGE = {
CART: 'tt_cart_v4',
ORDERS: 'tt_orders_v4'
};

const CATEGORIES = [
{ key: 'les-gateau', label: 'Les gâteaux' },
{ key: 'halawa-arabi', label: 'حلو عربي' },
{ key: 'juice', label: 'Jus' },
{ key: 'gateau-soiree', label: 'Gâteaux soirée' }
];

const PRODUCTS = [
{ id:1, name:'Gâteau chocolat', price:40, img:'images/gt-chocolat.jpg', category:'les-gateau' },
{ id:2, name:'Gâteau pistache', price:40, img:'images/gt-pistache.jpg', category:'les-gateau' },
{ id:3, name:'Gâteau fraise', price:40, img:'images/gt-fraise.jpg', category:'les-gateau' },
{ id:4, name:'Makroud', price:4, img:'images/makroud.jpg', category:'halawa-arabi' },
{ id:5, name:'zlabia', price:3.5, img:'images/zlabia.jpg', category:'halawa-arabi' },
{ id:6, name:'Jus Orange', price:2.5, img:'images/jus-orange.jpg', category:'juice' },
{ id:7, name:'Soirée chocolat', price:15, img:'images/soiree-choco.jpg', category:'gateau-soiree' }
];

const fmt = n => Number(n).toFixed(2);
const round2 = n => Math.round(n * 100) / 100;
const currency = n =>
new Intl.NumberFormat('fr-TN', {
style:'currency',
currency:'TND'
}).format(Number(n));

const escapeHtml = str =>
str.replace(/[&<>"']/g, m =>
({ '&':'&', '<':'<', '>':'>', '"':'"', "'":''' }[m])
);

const clear = el => (el.innerHTML = "");

/* ==============================
DOM REFERENCES
=============================== */
const DOM = {
slider: document.getElementById('sectionSlider'),
catNav: document.getElementById('categoryNav'),
search: document.getElementById('searchInput'),
sort: document.getElementById('sortSelect'),
cartBody: document.getElementById('cartBody'),
total: document.getElementById('grandTotal'),
checkoutItems: document.getElementById('checkoutItems'),
checkoutTotal: document.getElementById('checkoutTotal'),
confirmBox: document.getElementById('orderConfirm')
};

/* ==============================
CART LOGIC
=============================== */
let cart = JSON.parse(localStorage.getItem(STORAGE.CART) || "[]");

const saveCart = () =>
localStorage.setItem(STORAGE.CART, JSON.stringify(cart));

const updateQty = (id, qty) => {
const item = cart.find(i => i.id === id);
if (!item) return;
item.qty = Math.max(1, qty);
saveCart();
renderCart();
};

const addToCart = id => {
const prod = PRODUCTS.find(p => p.id === id);
if (!prod) return alert("Produit introuvable");

const item = cart.find(i => i.id === id);  
if (item) item.qty++;  
else cart.push({ id, name: prod.name, price: prod.price, qty: 1 });  

saveCart();  
renderCart();  
toast(`${prod.name} ajouté`);

};

const removeFromCart = id => {
cart = cart.filter(i => i.id !== id);
saveCart();
renderCart();
};

/* ==============================
TOAST
=============================== */
const toast = text => {
const el = document.createElement('div');
el.className = "toast-bubble";
el.textContent = text;
document.body.appendChild(el);

setTimeout(() => {  
  el.style.opacity = "0";  
  setTimeout(() => el.remove(), 240);  
}, 1200);

};

/* ==============================
DOM RENDERING FUNCTIONS
=============================== */

// Build category sections only once
const buildPages = () => {
clear(DOM.slider);
CATEGORIES.forEach(cat => {
DOM.slider.insertAdjacentHTML(
'beforeend',
  <section class="slider-page" data-page="${cat.key}">   <h3 class="section-title">${cat.label}</h3>   <div class="section-grid" data-section="${cat.key}"></div>   </section>  
);
});
};

// Render products FAST
const renderProducts = () => {
const q = DOM.search.value.toLowerCase();
const sort = DOM.sort.value;

// Pre-filter & pre-sort list  
let list = PRODUCTS.filter(p =>  
  !q || p.name.toLowerCase().includes(q)  
);  

if (sort === "price-asc") list.sort((a, b) => a.price - b.price);  
else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);  
else if (sort === "name-asc") list.sort((a, b) =>  
  a.name.localeCompare(b.name)  
);  

// Reset grids  
document.querySelectorAll('.section-grid').forEach(clear);  

// Inject product cards  
for (const p of list) {  
  const grid = document.querySelector(`[data-section="${p.category}"]`);  
  if (!grid) continue;  

  grid.insertAdjacentHTML(  
    'beforeend',  
    `  
    <div class="product-card" data-id="${p.id}">  
      <div class="price-badge">${currency(p.price)}</div>  
      <img class="product-img" src="${p.img}" alt="${p.name}" loading="lazy"  
       onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'"/>  
      <h5 class="title">${escapeHtml(p.name)}</h5>  
      <button class="btn-cta mt-2" onclick="addToCart(${p.id})">Ajouter</button>  
    </div>`  
  );  
}

};

const renderCart = () => {
clear(DOM.cartBody);

if (!cart.length) {  
  DOM.cartBody.innerHTML =  
    `<tr><td colspan="5" class="text-center text-muted">Cart empty</td></tr>`;  
  DOM.total.textContent = currency(0);  
  return;  
}  

let total = 0;  

for (const it of cart) {  
  const line = round2(it.price * it.qty);  
  total += line;  

  DOM.cartBody.insertAdjacentHTML(  
    'beforeend',  
    `  
    <tr>  
      <td>${escapeHtml(it.name)}</td>  
      <td class="text-end">${fmt(it.price)} TND</td>  
      <td><input type="number" min="1" value="${it.qty}"  
           class="form-control form-control-sm"  
           onchange="changeQty(${it.id}, this.value)"></td>  
      <td class="text-end">${fmt(line)} TND</td>  
      <td><button class="btn btn-danger btn-sm"  
           onclick="removeFromCart(${it.id})">Remove</button></td>  
    </tr>`  
  );  
}  

DOM.total.textContent = currency(total);

};

const prepareCheckout = () => {
clear(DOM.checkoutItems);

if (!cart.length) {  
  DOM.checkoutItems.innerHTML =  
    `<div class="text-center text-muted">Cart empty</div>`;  
  DOM.checkoutTotal.textContent = currency(0);  
  return;  
}  

for (const it of cart) {  
  DOM.checkoutItems.insertAdjacentHTML(  
    'beforeend',  
    `<div class="d-flex justify-content-between">  
      <span>${it.qty} × ${escapeHtml(it.name)}</span>  
      <span>${fmt(it.qty * it.price)} TND</span>  
    </div>`  
  );  
}  

const total = cart.reduce((s, i) => s + i.price * i.qty, 0);  
DOM.checkoutTotal.textContent = currency(round2(total));

};

/* ==============================
ORDER SYSTEM
=============================== */
const finalizeOrder = () => {
if (!cart.length) return alert("Cart empty");

const orders = JSON.parse(localStorage.getItem(STORAGE.ORDERS) || "[]");  

orders.push({  
  id: Date.now(),  
  date: new Date().toISOString(),  
  items: cart,  
  total: round2(cart.reduce((s, i) => s + i.price * i.qty, 0))  
});  

localStorage.setItem(STORAGE.ORDERS, JSON.stringify(orders));  

cart = [];  
saveCart();  
renderCart();  

if (DOM.confirmBox) {  
  DOM.confirmBox.classList.add('show');  
  setTimeout(() => DOM.confirmBox.classList.remove('show'), 1500);  
}  

alert("Order saved locally. Call 27441307 to confirm.");

};

/* ==============================
CATEGORY NAV
=============================== */
const renderCatNav = () => {
clear(DOM.catNav);

for (const c of CATEGORIES) {  
  const btn = document.createElement('button');  
  btn.className = "cat-btn";  
  btn.textContent = c.label;  

  btn.onclick = () => {  
    document.querySelectorAll('.cat-btn').forEach(b =>  
      b.classList.remove('active')  
    );  
    btn.classList.add('active');  

    const sec = document.querySelector(`[data-page="${c.key}"]`);  
    sec?.scrollIntoView({ behavior:'smooth', block:'center' });  
  };  

  DOM.catNav.appendChild(btn);  
}  

DOM.catNav.firstElementChild?.classList.add('active');

};

/* ==============================
INIT
=============================== */
const init = () => {
buildPages();
renderCatNav();
renderProducts();
renderCart();
};

window.prepareCheckout = prepareCheckout;
window.finalizeOrder = finalizeOrder;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQty = updateQty;

document.readyState === "loading"
? document.addEventListener("DOMContentLoaded", init)
: init();
})();
Index. Html
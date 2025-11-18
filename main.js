// main.js — static mode with localStorage, admin (password), image URLs
const ADMIN_PASSWORD = "toutouadmin"; // change if you want (only local)
const STORAGE_KEYS = { PRODUCTS: "tt_products_v1", CART: "tt_cart_v1", ORDERS: "tt_orders_v1" };

// --- Seed products if none exist ---
const defaultProducts = [
  { id: 1, name: "Test1", price: 5.00, img: "" },
  { id: 2, name: "Test2", price: 8.00, img: "" },
  { id: 3, name: "Test3", price: 4.00, img: "" }
];

function readProducts(){
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if(!raw){
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
    return defaultProducts.slice();
  }
  try { return JSON.parse(raw); } catch { return defaultProducts.slice(); }
}
function saveProducts(products){ localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }

let products = readProducts();
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || "[]");

// Helpers
function fmt(n){ return Number(n).toFixed(2); }
function currency(n){ return fmt(n) + " TND"; }

// DOM refs
const productsEl = document.getElementById("products");
const cartBody = document.getElementById("cartBody");
const grandTotalEl = document.getElementById("grandTotal");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const adminBtn = document.getElementById("adminBtn");
const adminModalEl = new bootstrap.Modal(document.getElementById("adminModal"));
const checkoutModalEl = new bootstrap.Modal(document.getElementById("checkoutModal"));
const orderConfirmEl = document.getElementById("orderConfirm");

// Render
function renderProducts(list = products){
  // optional search/sort
  const query = document.getElementById("searchInput")?.value?.toLowerCase() || "";
  const sort = document.getElementById("sortSelect")?.value || "default";

  let out = list.filter(p => p.name.toLowerCase().includes(query));

  if(sort === "price-asc") out.sort((a,b)=>a.price-b.price);
  if(sort === "price-desc") out.sort((a,b)=>b.price-a.price);
  if(sort === "name-asc") out.sort((a,b)=>a.name.localeCompare(b.name));

  productsEl.innerHTML = out.map(p => `
    <div class="col-12 col-sm-6 col-md-4">
      <div class="product-card">
        ${p.img ? `<img src="${p.img}" alt="${escapeHtml(p.name)}">` : `<div style="height:140px;display:flex;align-items:center;justify-content:center;color:#bbb">No image</div>`}
        <h5 class="mb-1">${escapeHtml(p.name)}</h5>
        <p class="mb-2 fw-semibold">${fmt(p.price)} TND</p>
        <div class="d-grid gap-2">
          <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">Add to cart</button>
        </div>
      </div>
    </div>
  `).join('');
  attachSearchListeners();
}
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// CART functions
function persistCart(){ localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); }

function addToCart(id){
  const prod = products.find(p=>p.id===id);
  if(!prod) return alert("Product not found");
  const item = cart.find(i=>i.id===id);
  if(item) item.qty++;
  else cart.push({ id: prod.id, name: prod.name, price: Number(prod.price), qty: 1 });
  persistCart(); renderCart();
  // small feedback
  showToast(`${prod.name} added`);
}

function removeFromCart(id){
  cart = cart.filter(i => i.id !== id);
  persistCart(); renderCart();
}

function changeQty(id, val){
  const item = cart.find(i=>i.id===id);
  if(!item) return;
  const q = parseInt(val) || 1;
  item.qty = Math.max(1,q);
  persistCart(); renderCart();
}

function renderCart(){
  cartBody.innerHTML = "";
  let total = 0;
  if(cart.length===0){
    cartBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>`;
  } else {
    cart.forEach(it => {
      const line = round2(it.price * it.qty);
      total += line;
      cartBody.innerHTML += `
        <tr>
          <td style="min-width:120px">${escapeHtml(it.name)}</td>
          <td class="text-end">${fmt(it.price)} TND</td>
          <td style="width:95px">
            <input class="form-control form-control-sm" type="number" min="1" value="${it.qty}" onchange="changeQty(${it.id}, this.value)"/>
          </td>
          <td class="text-end">${fmt(line)} TND</td>
          <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${it.id})">Remove</button></td>
        </tr>
      `;
    });
  }
  grandTotalEl.innerText = currency(round2(total));
}

function round2(n){ return Math.round((n+Number.EPSILON) * 100) / 100; }

// CHECKOUT
function prepareCheckout(){
  if(cart.length===0){
    checkoutItems.innerHTML = `<div class="text-center text-muted">Cart empty</div>`;
    checkoutTotal.innerText = currency(0);
    return;
  }
  checkoutItems.innerHTML = cart.map(i=>`<div class="d-flex justify-content-between"><span>${i.qty} × ${escapeHtml(i.name)}</span><span>${fmt(i.price*i.qty)} TND</span></div>`).join("");
  const tot = cart.reduce((s,i)=>s + (i.price * i.qty), 0);
  checkoutTotal.innerText = currency(round2(tot));
}

// FINALIZE ORDER
function finalizeOrder(){
  if(cart.length===0){ alert("Cart is empty"); return; }
  // save order to local orders (history)
  const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || "[]");
  const newOrder = {
    id: Date.now(),
    date: new Date().toISOString(),
    items: cart.slice(),
    total: round2(cart.reduce((s,i)=>s + i.price*i.qty, 0))
  };
  orders.push(newOrder);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  // clear cart
  cart = []; persistCart(); renderCart();
  checkoutModalEl.hide();

  // show animation
  orderConfirmEl.classList.add("show");
  setTimeout(()=> orderConfirmEl.classList.remove("show"), 1900);

  alert("Order saved locally. Call 27441307 to confirm.");
}

// Simple toast (small floating message)
let toastTimer;
function showToast(text){
  let el = document.createElement("div");
  el.className = "toast-bubble";
  el.innerText = text;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.classList.add("hide"); setTimeout(()=>el.remove(),400); }, 1100);
}

// ADMIN (password prompt)
adminBtn.addEventListener("click", async ()=>{
  const pass = prompt("Admin password:");
  if(pass === ADMIN_PASSWORD){
    populateAdminList();
    adminModalEl.show();
  } else {
    if(pass !== null) alert("Wrong password");
  }
});

// Admin actions: add/edit/delete
function populateAdminList(){
  const list = document.getElementById("adminList");
  list.innerHTML = "";
  products.forEach(p=>{
    const item = document.createElement("div");
    item.className = "list-group-item d-flex align-items-center justify-content-between";
    item.innerHTML = `
      <div class="d-flex align-items-center">
        ${p.img ? `<img src="${p.img}" alt="${escapeHtml(p.name)}">` : `<div style="width:48px;height:48px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#bbb">No</div>`}
        <div>
          <div class="fw-bold ms-2">${escapeHtml(p.name)}</div>
          <div class="text-muted ms-2">${fmt(p.price)} TND</div>
        </div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-primary me-2" onclick='openEdit(${p.id})'>Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick='deleteProduct(${p.id})'>Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// Add product from admin form
window.addProductFromAdmin = function(){
  const name = document.getElementById("newName").value.trim();
  const price = parseFloat(document.getElementById("newPrice").value);
  const img = document.getElementById("newImage").value.trim();
  if(!name || isNaN(price)){ return alert("Enter name and price"); }
  const id = Date.now();
  products.push({ id, name, price: round2(price), img });
  saveProducts(products);
  document.getElementById("newName").value = "";
  document.getElementById("newPrice").value = "";
  document.getElementById("newImage").value = "";
  renderProducts(); populateAdminList();
  showToast("Product added");
};

// Edit product (simple prompt based edit)
window.openEdit = function(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const newName = prompt("Edit name:", p.name);
  if(newName === null) return;
  const newPrice = prompt("Edit price (TND):", p.price);
  if(newPrice === null) return;
  const newImg = prompt("Image URL (leave empty to keep):", p.img || "");
  p.name = newName.trim() || p.name;
  p.price = round2(Number(newPrice) || p.price);
  p.img = (newImg === null) ? p.img : newImg.trim();
  saveProducts(products);
  renderProducts(); populateAdminList();
  showToast("Product updated");
};

window.deleteProduct = function(id){
  if(!confirm("Delete this product?")) return;
  products = products.filter(p=>p.id!==id);
  saveProducts(products);
  renderProducts(); populateAdminList();
  showToast("Deleted");
};

// Search / sort listeners
function attachSearchListeners(){
  const s = document.getElementById("searchInput");
  const sort = document.getElementById("sortSelect");
  if(s) s.oninput = ()=> renderProducts();
  if(sort) sort.onchange = ()=> renderProducts();
}

// Init
function init(){
  products = readProducts();
  cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || "[]");
  renderProducts();
  renderCart();
}
init();

// Expose some functions to window (used in HTML onclick)
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQty = changeQty;
window.prepareCheckout = prepareCheckout;
window.finalizeOrder = finalizeOrder;
document.addEventListener('pointerdown', function (e) {
  const btn = e.target.closest('.btn-cta, .btn, .btn-primary');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const r = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.left = (e.clientX - rect.left - r/2) + 'px';
  ripple.style.top = (e.clientY - rect.top - r/2) + 'px';
  ripple.style.width = ripple.style.height = r + 'px';
  ripple.style.background = 'rgba(255,255,255,0.18)';
  ripple.style.borderRadius = '50%';
  ripple.style.transform = 'scale(0)';
  ripple.style.pointerEvents = 'none';
  ripple.style.transition = 'transform .5s ease, opacity .5s ease';
  ripple.style.opacity = '1';
  ripple.className = 'ripple-span';
  btn.style.position = btn.style.position || 'relative';
  btn.appendChild(ripple);
  requestAnimationFrame(() => ripple.style.transform = 'scale(1.8)');
  setTimeout(() => { ripple.style.opacity = '0'; }, 350);
  setTimeout(() => ripple.remove(), 700);
});
// Call after products are inserted into DOM
document.querySelectorAll('.product-card').forEach((el, i) => {
  el.style.animationDelay = (i * 70) + 'ms';
  el.classList.add('enter');
});

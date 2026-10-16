import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
setPersistence(auth, browserSessionPersistence);
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const secondaryApp=initializeApp(firebaseConfig,"secondary");
const secondaryAuth=getAuth(secondaryApp);
let me=null, profile=null, products=[], orders=[], resellers=[];
const $=id=>document.getElementById(id);
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-LK",{minimumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const statusClass=s=>s==="Delivered"?"success":s==="Cancelled"?"danger":s==="Pending"?"warn":"";
function toast(msg){$("toast").textContent=msg;$("toast").classList.remove("hidden");clearTimeout(window.__toast);window.__toast=setTimeout(()=>$("toast").classList.add("hidden"),2600)}
function openModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
window.closeModal=closeModal;
$("closeModalBtn").onclick=closeModal;
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const btn=e.submitter;btn.disabled=true;btn.textContent="Signing in…";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){$("loginError").textContent="Login failed: "+friendlyAuthError(err)}finally{btn.disabled=false;btn.textContent="Sign in"}});
$("logoutBtn").onclick=()=>signOut(auth);
function friendlyAuthError(err){
 const m={
  "auth/invalid-credential":"Incorrect email or password. Check the exact Firebase Authentication email and password.",
  "auth/user-not-found":"No Firebase Authentication account exists for this email.",
  "auth/wrong-password":"Incorrect password.",
  "auth/invalid-email":"The email address is not valid.",
  "auth/user-disabled":"This Firebase Authentication account is disabled.",
  "auth/too-many-requests":"Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed":"Network error. Check your internet connection."
 };
 return (m[err.code]||err.message||"Unable to sign in.")+" ["+(err.code||"unknown")+"]";
}

onAuthStateChanged(auth,async user=>{
 if(!user){$("loginView").classList.remove("hidden");$("dashboardView").classList.add("hidden");return}
 try{
  me=user;const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()){alert("Your Firebase account has no matching profile in Firestore. Ask the admin to create it.");await signOut(auth);return}
  const d=snap.data();
  profile={
    uid:user.uid,
    ...d,
    email:d.email || d.Email || user.email,
    name:d.name || d.Name || user.email,
    role:String(d.role || d.Role || "reseller").toLowerCase(),
    status:String(d.status || d.Status || "active").toLowerCase()
  };
  if(profile.status==="inactive" || d.active===false){throw new Error("Your account is inactive.");}
  if(profile.role!=="admin" && profile.role!=="reseller"){throw new Error("Your Firestore profile role is missing. Set role to admin for the administrator account.");}
  $("loginView").classList.add("hidden");$("dashboardView").classList.remove("hidden");
  $("userName").textContent=profile.name;
  $("roleBadge").textContent=profile.role==="admin"?"ADMIN":"RESELLER";
  if(profile.role==="admin"){
    $("adminNav").classList.remove("hidden");$("resellerNav").classList.add("hidden");
    await loadAdmin();showTab("overview");
  } else {
    $("resellerNav").classList.remove("hidden");$("adminNav").classList.add("hidden");
    await loadReseller();showTab("myOverview");
  }
 }catch(err){
   console.error(err);
   alert("Login succeeded, but the user profile could not be loaded.\n\n"+(err?.message||err));
   await signOut(auth);
 }
});

document.querySelectorAll(".tabs").forEach(t=>t.addEventListener("click",e=>{if(e.target.dataset.tab)showTab(e.target.dataset.tab)}));
function showTab(tab){document.querySelectorAll(".panel").forEach(x=>x.classList.add("hidden"));$(tab)?.classList.remove("hidden");document.querySelectorAll(".tabs .tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab))}
async function getAll(name){const s=await getDocs(collection(db,name));return s.docs.map(d=>({id:d.id,...d.data()}))}
async function getBy(name,field,value){const s=await getDocs(query(collection(db,name),where(field,"==",value)));return s.docs.map(d=>({id:d.id,...d.data()}))}
async function loadAdmin(){[products,resellers,orders]=await Promise.all([getAll("products"),getAll("users"),getAll("orders")]);resellers=resellers.filter(x=>x.role==="reseller");renderOverview();renderOrders();renderProducts();renderResellers()}
async function loadReseller(){orders=await getBy("orders","resellerId",profile.uid);products=await getAll("products");renderMyOverview();renderMyOrders()}

function renderOverview(){const delivered=orders.filter(o=>o.status==="Delivered"),commission=delivered.reduce((a,o)=>a+Number(o.commission||0),0),sales=orders.reduce((a,o)=>a+Number(o.total||0),0);$("overview").innerHTML=`<div class="panel-head"><div><h2>Admin Dashboard</h2><p class="muted">Monitor the LORVEX reseller network from one place.</p></div><span class="pill success">System online</span></div><div class="stats"><div class="stat"><span class="label">TOTAL ORDERS</span><b>${orders.length}</b></div><div class="stat"><span class="label">DELIVERED</span><b>${delivered.length}</b></div><div class="stat"><span class="label">RESELLERS</span><b>${resellers.length}</b></div><div class="stat"><span class="label">TOTAL SALES</span><b class="accent">${money(sales)}</b></div></div><div class="grid"><div class="info-card"><h3>Commission payable</h3><b>${money(commission)}</b><p class="muted small">Based on delivered orders.</p></div><div class="info-card"><h3>Quick actions</h3><div class="actions"><button class="btn sm" onclick="showTab('products')">Manage products</button><button class="btn sm secondary" onclick="showTab('resellers')">Manage resellers</button></div></div></div>`}
function renderOrders(){const rows=orders.map(o=>`<tr><td>#${esc(o.id.slice(0,8))}</td><td>${esc(resellers.find(r=>r.id===o.resellerId)?.name||o.resellerName||"Unknown")}</td><td>${esc(o.customerName)}</td><td>${esc(o.phone)}</td><td>${esc(o.productName)} × ${o.qty||1}</td><td>${money(o.total)}</td><td><select onchange="changeStatus('${o.id}',this.value)">${["Pending","Confirmed","LORVEX Ordered","Shipped","Delivered","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td><td>${money(o.commission)}</td></tr>`).join("");$("orders").innerHTML=`<div class="panel-head"><div><h2>All Orders</h2><p class="muted">Review and update reseller orders.</p></div></div><div class="table-wrap">${rows?`<table><thead><tr><th>ID</th><th>Reseller</th><th>Customer</th><th>Phone</th><th>Product</th><th>Total</th><th>Status</th><th>Commission</th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty">No orders yet.</div>`}</div>`}
window.changeStatus=async(id,status)=>{try{await updateDoc(doc(db,"orders",id),{status,updatedAt:serverTimestamp()});toast("Order status updated");await loadAdmin();showTab("orders")}catch(e){alert("Could not update order: "+e.message)}};

function renderProducts(){$("products").innerHTML=`<div class="panel-head"><div><h2>Products</h2><p class="muted">Manage your catalogue and reseller commission.</p></div><button class="btn" onclick="productModal()">+ Add Product</button></div><div class="table-wrap">${products.length?`<table><thead><tr><th>Product</th><th>Cost</th><th>Sell</th><th>Commission</th><th>Status</th><th>Action</th></tr></thead><tbody>${products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${money(p.commission)}</td><td><span class="pill ${p.active===false?"danger":"success"}">${p.active===false?"Inactive":"Active"}</span></td><td><div class="actions"><button class="btn sm secondary" onclick="editProduct('${p.id}')">Edit</button><button class="btn sm danger" onclick="removeProduct('${p.id}')">Delete</button></div></td></tr>`).join("")}</tbody></table>`:`<div class="empty">No products yet. Add your first product.</div>`}</div>`}
window.productModal=()=>openModal(`<h2>Add Product</h2><p class="muted">Enter the catalogue price and reseller commission.</p><form id="productForm"><div class="field"><label>Product name</label><input name="name" required></div><div class="grid"><div class="field"><label>Cost (Rs.)</label><input name="cost" type="number" step=".01" min="0" required></div><div class="field"><label>Selling price (Rs.)</label><input name="price" type="number" step=".01" min="0" required></div></div><div class="field"><label>Reseller commission (Rs.)</label><input name="commission" type="number" step=".01" min="0" required></div><div class="field"><label>Image URL (optional)</label><input name="image" type="url" placeholder="https://..."></div><button class="btn full">Add Product</button></form>`);
window.editProduct=async id=>{const p=products.find(x=>x.id===id);if(!p)return;openModal(`<h2>Edit Product</h2><form id="editProductForm"><input type="hidden" name="id" value="${esc(p.id)}"><div class="field"><label>Product name</label><input name="name" value="${esc(p.name)}" required></div><div class="grid"><div class="field"><label>Cost</label><input name="cost" type="number" step=".01" value="${Number(p.cost||0)}" required></div><div class="field"><label>Selling price</label><input name="price" type="number" step=".01" value="${Number(p.price||0)}" required></div></div><div class="field"><label>Commission</label><input name="commission" type="number" step=".01" value="${Number(p.commission||0)}" required></div><div class="field"><label>Status</label><select name="active"><option value="true" ${p.active!==false?"selected":""}>Active</option><option value="false" ${p.active===false?"selected":""}>Inactive</option></select></div><button class="btn full">Save Changes</button></form>`) }
window.removeProduct=async id=>{if(confirm("Delete this product?")){await deleteDoc(doc(db,"products",id));toast("Product deleted");await loadAdmin();showTab("products")}};

function renderResellers(){$("resellers").innerHTML=`<div class="panel-head"><div><h2>Resellers</h2><p class="muted">Create reseller accounts without storing passwords in Firestore.</p></div><button class="btn" onclick="resellerModal()">+ Add Reseller</button></div><div class="table-wrap">${resellers.length?`<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>${resellers.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.email)}</td><td>${esc(r.phone||"—")}</td><td><span class="pill ${r.active===false||r.status==="inactive"?"danger":"success"}">${r.active===false||r.status==="inactive"?"Inactive":"Active"}</span></td><td><button class="btn sm secondary" onclick="toggleReseller('${r.id}',${r.active!==false&&r.status!=="inactive"})">${r.active===false||r.status==="inactive"?"Activate":"Deactivate"}</button></td></tr>`).join("")}</tbody></table>`:`<div class="empty">No reseller profiles yet.</div>`}</div>`}
window.toggleReseller=async(id,isActive)=>{await updateDoc(doc(db,"users",id),{active:!isActive,status:!isActive?"active":"inactive"});toast(isActive?"Reseller deactivated":"Reseller activated");await loadAdmin();showTab("resellers")};
window.resellerModal=()=>openModal(`<h2>Create Reseller Account</h2><div class="notice">The password is sent directly to Firebase Authentication. It is never written to Firestore.</div><form id="resellerForm"><div class="field"><label>Full name</label><input name="name" required></div><div class="field"><label>Email / Login</label><input name="email" type="email" required></div><div class="field"><label>Temporary password</label><input name="password" type="password" minlength="6" required><div class="muted small">Minimum 6 characters. Tell the reseller to change it later if needed.</div></div><div class="grid"><div class="field"><label>Phone</label><input name="phone"></div><div class="field"><label>Status</label><select name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div><button class="btn full">Create Reseller</button></form>`)};

function renderMyOverview(){const delivered=orders.filter(o=>o.status==="Delivered"),earnings=delivered.reduce((a,o)=>a+Number(o.commission||0),0),sales=orders.reduce((a,o)=>a+Number(o.total||0),0);$("myOverview").innerHTML=`<div class="panel-head"><div><h2>Welcome, ${esc(profile.name||"Reseller")}</h2><p class="muted">Create customer orders and track your earnings.</p></div><button class="btn" onclick="newOrderModal()">+ New Order</button></div><div class="stats"><div class="stat"><span class="label">MY ORDERS</span><b>${orders.length}</b></div><div class="stat"><span class="label">DELIVERED</span><b>${delivered.length}</b></div><div class="stat"><span class="label">PENDING</span><b>${orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length}</b></div><div class="stat"><span class="label">MY EARNINGS</span><b class="accent">${money(earnings)}</b></div></div><div class="info-card"><h3>Sales value</h3><b>${money(sales)}</b><p class="muted small">Earnings are counted from delivered orders only.</p></div>`}
function renderMyOrders(){const rows=orders.map(o=>`<tr><td>#${esc(o.id.slice(0,8))}</td><td>${esc(o.customerName)}</td><td>${esc(o.productName)}</td><td>${o.qty||1}</td><td>${money(o.total)}</td><td><span class="pill ${statusClass(o.status)}">${esc(o.status)}</span></td><td>${o.status==="Delivered"?money(o.commission):money(0)}</td></tr>`).join("");$("myOrders").innerHTML=`<div class="panel-head"><div><h2>My Orders</h2><p class="muted">Only your own orders are shown here.</p></div></div><div class="table-wrap">${rows?`<table><thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Commission</th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty">No orders yet. Create your first order.</div>`}</div>`}
window.newOrderModal=()=>openModal(`<h2>New Customer Order</h2><form id="orderForm"><div class="field"><label>Product</label><select name="productId" required><option value="">Select product</option>${products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("")}</select></div><div class="grid"><div class="field"><label>Customer name</label><input name="customerName" required></div><div class="field"><label>Customer phone</label><input name="phone" required></div></div><div class="field"><label>Delivery address</label><textarea name="address" required></textarea></div><div class="field"><label>Quantity</label><input name="qty" type="number" min="1" value="1" required></div><div class="field"><label>Notes</label><textarea name="notes" placeholder="Optional"></textarea></div><button class="btn full">Submit Order</button></form>`);

document.addEventListener("submit",async e=>{
 if(e.target.id==="productForm"){e.preventDefault();const f=new FormData(e.target);await addDoc(collection(db,"products"),{name:f.get("name"),cost:+f.get("cost"),price:+f.get("price"),commission:+f.get("commission"),image:f.get("image")||"",active:true,createdAt:serverTimestamp()});closeModal();toast("Product added");await loadAdmin();showTab("products")}
 if(e.target.id==="editProductForm"){e.preventDefault();const f=new FormData(e.target);await updateDoc(doc(db,"products",f.get("id")),{name:f.get("name"),cost:+f.get("cost"),price:+f.get("price"),commission:+f.get("commission"),active:f.get("active")==="true",updatedAt:serverTimestamp()});closeModal();toast("Product updated");await loadAdmin();showTab("products")}
 if(e.target.id==="resellerForm"){e.preventDefault();const f=new FormData(e.target),btn=e.submitter;btn.disabled=true;btn.textContent="Creating…";try{const cred=await createUserWithEmailAndPassword(secondaryAuth,f.get("email").trim(),f.get("password"));await setDoc(doc(db,"users",cred.user.uid),{name:f.get("name"),email:f.get("email").trim(),phone:f.get("phone")||"",role:"reseller",active:f.get("status")==="active",status:f.get("status"),createdAt:serverTimestamp()});await signOut(secondaryAuth);closeModal();toast("Reseller account created");await loadAdmin();showTab("resellers")}catch(err){alert("Could not create reseller: "+(err.code?err.code+" — ":"")+err.message)}finally{btn.disabled=false;btn.textContent="Create Reseller"}}
 if(e.target.id==="orderForm"){e.preventDefault();const f=new FormData(e.target),p=products.find(x=>x.id===f.get("productId")),qty=+f.get("qty");if(!p)return;await addDoc(collection(db,"orders"),{resellerId:profile.uid,resellerName:profile.name,customerName:f.get("customerName"),phone:f.get("phone"),address:f.get("address"),notes:f.get("notes")||"",productId:p.id,productName:p.name,qty,total:p.price*qty,commission:p.commission*qty,status:"Pending",createdAt:serverTimestamp()});closeModal();toast("Order submitted");await loadReseller();showTab("myOrders")}
});

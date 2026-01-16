/* =========================================================
   school.sy – Firebase Frontend (GitHub Pages Compatible)
========================================================= */

/* =========================
   Helpers
========================= */
const $ = (id) => document.getElementById(id);
const show = (el) => el && el.classList.remove("hidden");
const hide = (el) => el && el.classList.add("hidden");

const views = {
  public: $("viewPublic"),
  login: $("viewLogin"),
  request: $("viewRequest"),
  dash: $("viewDashboard"),
};

function showView(name){
  Object.values(views).forEach(v => hide(v));
  show(views[name]);
}

$("btnGoPublic")?.addEventListener("click", () => showView("public"));
$("btnGoLogin")?.addEventListener("click", () => showView("login"));
$("btnGoRequest")?.addEventListener("click", () => showView("request"));

/* =========================
   Firebase Config
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCexRHqxd8Xm_EBWMEnLj_2WAjxJcgXf9g",
  authDomain: "school-sy.firebaseapp.com",
  projectId: "school-sy",
  storageBucket: "school-sy.firebasestorage.app",
  messagingSenderId: "121186119852",
  appId: "1:121186119852:web:f96d12deade6cebbda6f09"
};

/* =========================
   Firebase Imports (CDN)
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =========================
   Init Firebase
========================= */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const schoolId = "default";

/* =========================
   Render helpers
========================= */
function esc(s){
  return String(s||"").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function renderTop(container, arr){
  if(!container) return;
  container.innerHTML = "";
  const safe = arr?.length ? arr : [];
  for (let i=0;i<3;i++){
    const it = safe[i] || { displayName:"—", count:0 };
    const card = document.createElement("div");
    card.className = "rankCard";
    card.innerHTML = `
      <div class="avatar">${esc(it.displayName)[0] || "؟"}</div>
      <div class="rankMeta">
        <div class="rankName">${esc(it.displayName)}</div>
        <div class="rankCount">عدد المصوّتين: ${Number(it.count||0)}</div>
      </div>
      <div class="badge">#${i+1}</div>
    `;
    container.appendChild(card);
  }
}

/* =========================
   Public data listeners
========================= */
onSnapshot(doc(db, "leaderboards", schoolId), (snap) => {
  const data = snap.data() || {};
  renderTop($("teachersTop"), data.teachersTop || []);
  renderTop($("studentsTop"), data.studentsTop || []);
});

const postsQ = query(collection(db, "posts"), orderBy("createdAt","desc"), limit(20));
onSnapshot(postsQ, (snap) => {
  const wrap = $("postsList");
  if(!wrap) return;
  wrap.innerHTML = "";
  snap.forEach((d) => {
    const p = d.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <h3>${esc(p.title || "")}</h3>
      <p>${esc(p.content || "")}</p>
    `;
    wrap.appendChild(div);
  });
});

/* =========================
   Send account request
========================= */
$("btnSendRequest")?.addEventListener("click", async () => {
  $("reqMsg").textContent = "";
  const role = $("reqRole").value;
  const name = $("reqName").value.trim();
  if (!name){
    $("reqMsg").textContent = "الاسم مطلوب";
    return;
  }

  await addDoc(collection(db, "account_requests"), {
    role,
    displayName: name,
    status: "pending",
    schoolId,
    createdAt: serverTimestamp()
  });

  $("reqMsg").textContent = "✅ تم إرسال الطلب";
  $("reqName").value = "";
});

/* =========================
   Login by KeFo code
========================= */
$("btnLogin")?.addEventListener("click", async () => {
  $("loginMsg").textContent = "";
  const code = $("loginCode").value.trim();
  const pass = $("loginPass").value;

  if (!code.startsWith("KeFo")){
    $("loginMsg").textContent = "أدخل كود يبدأ بـ KeFo";
    return;
  }

  try{
    await signInWithEmailAndPassword(auth, `${code}@school.local`, pass);
    $("loginMsg").textContent = "✅ تم الدخول";
  }catch(e){
    $("loginMsg").textContent = "فشل الدخول";
  }
});

$("btnLogout")?.addEventListener("click", () => signOut(auth));

/* =========================
   Auth state
========================= */
onAuthStateChanged(auth, async (user) => {
  $("btnLogout")?.classList.toggle("hidden", !user);

  if (!user){
    showView("public");
    return;
  }

  const usnap = await getDoc(doc(db, "users", user.uid));
  if (!usnap.exists()){
    await signOut(auth);
    return;
  }

  showView("dash");
});

/* =========================
   Default view
========================= */
document.addEventListener("DOMContentLoaded", () => {
  showView("public");
});

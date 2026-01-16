/* =========================================================
   school.sy – Firebase Frontend (v9 modules)
========================================================= */

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

$("btnGoPublic").onclick = () => showView("public");
$("btnGoLogin").onclick  = () => showView("login");
$("btnGoRequest").onclick = () => showView("request");

function banner(msg){
  // رسالة واضحة بدل الصفحة البيضاء
  const box = document.createElement("div");
  box.style.cssText = `
    position:fixed;left:10px;right:10px;bottom:10px;z-index:99999;
    background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.15);
    border-radius:14px;padding:12px;font-family:system-ui;line-height:1.6;
    box-shadow:0 12px 30px rgba(0,0,0,.35); direction:rtl;
  `;
  box.innerHTML = msg;
  document.body.appendChild(box);
  return box;
}

/* ====== 1) Firebase Config (ضعه هنا) ====== */
const firebaseConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // appId: "...",
};

/* Fail-safe */
function hasValidConfig(cfg){
  return cfg && cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
}

let warnBox = null;

if (!hasValidConfig(firebaseConfig)){
  document.addEventListener("DOMContentLoaded", () => {
    showView("public");
    warnBox = banner("⚠️ Firebase غير مفعّل لأن <b>firebaseConfig</b> ناقص.<br>ضع إعدادات Firebase داخل <b>app.js</b> ثم أعد الرفع.");
  });
  // نوقف هنا حتى لا تظهر أخطاء imports
  throw new Error("Missing firebaseConfig");
}

/* ====== 2) Firebase Imports ====== */
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

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

/* ====== 3) Init ====== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const fn = getFunctions(app);

// لو Functions في منطقة غير الافتراضية:
// import { connectFunctionsEmulator } ... (للتطوير فقط)

const schoolId = "default";
$("schoolName").textContent = "school.sy";

/* ====== 4) Render Helpers ====== */
function esc(s){
  return String(s||"").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function renderTop(container, arr){
  container.innerHTML = "";
  const safe = arr?.length ? arr : [];
  for (let i=0;i<3;i++){
    const it = safe[i] || { displayName:"—", photoURL:"", count:0 };
    const card = document.createElement("div");
    card.className = "rankCard";
    card.innerHTML = `
      <div class="avatar">${it.photoURL ? `<img src="${it.photoURL}" alt="">` : (esc(it.displayName)[0]||"؟")}</div>
      <div class="rankMeta">
        <div class="rankName">${esc(it.displayName)}</div>
        <div class="rankCount">عدد المصوّتين: ${Number(it.count||0)}</div>
      </div>
      <div class="badge">#${i+1}</div>
    `;
    container.appendChild(card);
  }
}

/* ====== 5) Public: leaderboards + posts ====== */
onSnapshot(doc(db, "leaderboards", schoolId), (snap) => {
  const data = snap.data() || {};
  renderTop($("teachersTop"), data.teachersTop || []);
  renderTop($("studentsTop"), data.studentsTop || []);
});

const postsQ = query(collection(db, "posts"), orderBy("createdAt","desc"), limit(20));
onSnapshot(postsQ, (snap) => {
  const wrap = $("postsList");
  wrap.innerHTML = "";
  snap.forEach((d) => {
    const p = d.data();
    const div = document.createElement("div");
    div.className = "post";

    const typeLabel = p.type === "mcq" ? "اختيار من متعدد" : "منشور";
    let body = "";
    if (p.type === "mcq"){
      const opts = (p.mcq?.options || []).map((x)=>`<li>${esc(x)}</li>`).join("");
      body = `
        <div class="muted small">سؤال:</div>
        <div style="font-weight:800;margin:6px 0 8px">${esc(p.mcq?.question || "")}</div>
        <ul class="bullets">${opts}</ul>
      `;
    } else {
      body = `<div>${esc(p.content || "")}</div>`;
    }

    div.innerHTML = `
      <div class="postHeader">
        <div class="avatar" style="width:40px;height:40px">${p.authorPhoto ? `<img src="${p.authorPhoto}" alt="">` : (esc(p.authorName)[0]||"م")}</div>
        <div style="min-width:0">
          <h3 class="postTitle">${esc(p.title || "بدون عنوان")}</h3>
          <div class="postType">${typeLabel} • ${esc(p.authorName || "معلم")}</div>
        </div>
      </div>
      ${body}
    `;
    wrap.appendChild(div);
  });
});

/* ====== 6) Request account ====== */
$("btnSendRequest").onclick = async () => {
  $("reqMsg").textContent = "";
  const role = $("reqRole").value;
  const name = $("reqName").value.trim();
  const phone = $("reqPhone").value.trim();
  const note = $("reqNote").value.trim();

  if (!name){
    $("reqMsg").textContent = "الاسم مطلوب";
    return;
  }

  await addDoc(collection(db, "account_requests"), {
    role,
    displayName: name,
    phone: phone || "",
    note: note || "",
    status: "pending",
    schoolId,
    createdAt: serverTimestamp()
  });

  $("reqMsg").textContent = "✅ تم إرسال الطلب";
  $("reqName").value = $("reqPhone").value = $("reqNote").value = "";
};

/* ====== 7) Login by Code ====== */
$("btnLogin").onclick = async () => {
  $("loginMsg").textContent = "";
  const code = $("loginCode").value.trim();
  const pass = $("loginPass").value;

  if (!code.startsWith("KeFo")){
    $("loginMsg").textContent = "أدخل كود يبدأ بـ KeFo";
    return;
  }
  if (!pass || pass.length < 6){
    $("loginMsg").textContent = "كلمة المرور قصيرة";
    return;
  }

  const email = `${code}@school.local`;
  try{
    await signInWithEmailAndPassword(auth, email, pass);
    $("loginMsg").textContent = "✅ تم الدخول";
  }catch(e){
    $("loginMsg").textContent = "فشل الدخول: " + (e?.message || e);
  }
};

$("btnLogout").onclick = async () => signOut(auth);

/* ====== 8) Tabs in dashboard ====== */
function initTabs(){
  const chips = document.querySelectorAll(".chip");
  const postForm = $("postForm");
  const mcqForm = $("mcqForm");

  chips.forEach(ch => {
    ch.onclick = () => {
      chips.forEach(x => x.classList.remove("active"));
      ch.classList.add("active");
      const tab = ch.getAttribute("data-tab");
      if (tab === "post"){ show(postForm); hide(mcqForm); }
      else { hide(postForm); show(mcqForm); }
    };
  });
}
initTabs();

/* ====== 9) Teacher/Admin publish ====== */
let currentProfile = null;

$("btnPublishPost").onclick = async () => {
  $("postMsg").textContent = "";
  if (!currentProfile) return;

  const title = $("pTitle").value.trim();
  const content = $("pContent").value.trim();
  if (!title || !content){
    $("postMsg").textContent = "العنوان والمحتوى مطلوبان";
    return;
  }

  await addDoc(collection(db, "posts"), {
    authorUid: auth.currentUser.uid,
    authorName: currentProfile.displayName || "Teacher",
    authorPhoto: currentProfile.photoURL || "",
    role: currentProfile.role,
    type: "post",
    title,
    content,
    schoolId,
    createdAt: serverTimestamp()
  });

  $("postMsg").textContent = "✅ تم النشر";
  $("pTitle").value = $("pContent").value = "";
};

$("btnPublishMCQ").onclick = async () => {
  $("mcqMsg").textContent = "";
  if (!currentProfile) return;

  const question = $("qQuestion").value.trim();
  const a = $("qA").value.trim();
  const b = $("qB").value.trim();
  const c = $("qC").value.trim();
  const d = $("qD").value.trim();
  const correctIndex = Number($("qCorrect").value);

  if (!question || !a || !b || !c || !d){

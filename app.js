/* =========================================================
   school.sy – Frontend Only Demo (No Firebase)
   By KeFo.tech / Zakaria KeFo
========================================================= */

window.__APP_LOADED__ = true;

/* =========================
   Helpers
========================= */
const $ = (id) => document.getElementById(id);

/* =========================
   Show / Hide Views
========================= */
const views = {
  public: $("viewPublic"),
  login: $("viewLogin"),
  request: $("viewRequest"),
  dash: $("viewDashboard"),
};

function showView(name){
  Object.values(views).forEach(v => v && v.classList.add("hidden"));
  views[name] && views[name].classList.remove("hidden");
}

/* =========================
   Inject Basic UI (if empty)
========================= */
function bootUI(){
  if ($("viewPublic") && $("viewPublic").children.length < 2){
    $("viewPublic").innerHTML = `
      <h2 style="margin:20px">🏫 school.sy</h2>
      <p style="margin:20px;color:gray">
        منصة تعليمية تربط المدرسة بالطلاب والمعلمين والأهل.
      </p>

      <h3 style="margin:20px">🏆 أفضل 3 معلمين</h3>
      <div id="teachersTop" style="margin:20px;display:grid;gap:10px"></div>

      <h3 style="margin:20px">🌟 أفضل 3 طلاب</h3>
      <div id="studentsTop" style="margin:20px;display:grid;gap:10px"></div>

      <h3 style="margin:20px">📌 منشورات المعلمين</h3>
      <div id="postsList" style="margin:20px;display:grid;gap:10px"></div>
    `;
  }

  if ($("viewLogin")){
    $("viewLogin").innerHTML = `
      <h2 style="margin:20px">🔐 تسجيل دخول (تجريبي)</h2>
      <div style="margin:20px">
        <input id="demoCode" placeholder="KeFo123456"><br><br>
        <button id="demoLoginBtn">دخول</button>
      </div>
    `;
  }

  if ($("viewRequest")){
    $("viewRequest").innerHTML = `
      <h2 style="margin:20px">📝 طلب حساب</h2>
      <p style="margin:20px;color:gray">هذه نسخة تجريبية للواجهة فقط.</p>
    `;
  }

  if ($("viewDashboard")){
    $("viewDashboard").innerHTML = `
      <h2 style="margin:20px">📊 لوحة التحكم (تجريبية)</h2>
      <p style="margin:20px;color:gray">
        تم تسجيل دخول وهمي. هنا ستكون أدوات المعلم/الإدارة/المطور.
      </p>
      <button id="demoLogoutBtn" style="margin:20px">تسجيل خروج</button>
    `;
  }
}

/* =========================
   Fake Data
========================= */
const fakeTeachers = [
  {name:"أحمد علي", votes:128},
  {name:"سارة محمد", votes:97},
  {name:"خالد حسن", votes:65},
];

const fakeStudents = [
  {name:"ليان عمر", votes:210},
  {name:"محمد سامر", votes:180},
  {name:"نور الدين", votes:155},
];

const fakePosts = [
  {
    type:"post",
    title:"درس اليوم: الكسور",
    content:"شرح مبسط عن الكسور مع أمثلة سهلة للطلاب."
  },
  {
    type:"mcq",
    title:"نموذج رياضيات",
    question:"كم ناتج 2 + 5 ؟",
    options:["5","6","7","8"]
  }
];

/* =========================
   Render Functions
========================= */
function renderTop(containerId, list){
  const box = $(containerId);
  if (!box) return;
  box.innerHTML = "";
  list.forEach((x,i)=>{
    const div = document.createElement("div");
    div.style.cssText = "padding:10px;border:1px solid #ddd;border-radius:10px";
    div.innerHTML = `#${i+1} – <b>${x.name}</b> | الأصوات: ${x.votes}`;
    box.appendChild(div);
  });
}

function renderPosts(){
  const box = $("postsList");
  if (!box) return;
  box.innerHTML = "";
  fakePosts.forEach(p=>{
    const div = document.createElement("div");
    div.style.cssText = "padding:12px;border:1px solid #ddd;border-radius:12px";
    if (p.type === "post"){
      div.innerHTML = `<h4>${p.title}</h4><p>${p.content}</p>`;
    } else {
      div.innerHTML = `
        <h4>${p.title}</h4>
        <p><b>سؤال:</b> ${p.question}</p>
        <ul>${p.options.map(o=>`<li>${o}</li>`).join("")}</ul>
      `;
    }
    box.appendChild(div);
  });
}

/* =========================
   Demo Auth
========================= */
function setupDemoAuth(){
  const loginBtn = $("demoLoginBtn");
  if (loginBtn){
    loginBtn.onclick = () => showView("dash");
  }

  const logoutBtn = $("demoLogoutBtn");
  if (logoutBtn){
    logoutBtn.onclick = () => showView("public");
  }
}

/* =========================
   Boot
========================= */
document.addEventListener("DOMContentLoaded", () => {
  bootUI();

  renderTop("teachersTop", fakeTeachers);
  renderTop("studentsTop", fakeStudents);
  renderPosts();

  setupDemoAuth();
  showView("public");

  const boot = document.getElementById("bootCheck");
  if (boot){
    boot.innerHTML = "✅ تم تحميل app.js بنجاح (نسخة الواجهة فقط بدون Firebase)";
  }
});

/* Cổng Hub Gza - app logic. Có config.js + supabase-js thì chạy dữ liệu thật, không có thì chạy bản mẫu. */
const LIVE=!!(window.GZA_CONFIG&&window.supabase);
const sb=LIVE?window.supabase.createClient(GZA_CONFIG.url,GZA_CONFIG.key):null;
const BOSS={email:"",name:"admin"};
async function q(r){const {data,error}=await r;if(error)throw error;return data}
async function persist(fn){if(!LIVE)return true;try{await fn();return true}catch(e){console.error(e);toast("Chưa lưu được: "+(e.message||e));return false}}
const SITES=[
 {id:"shop",name:"Gza Shop",url:"https://shop.gza.vn",desc:"Cửa hàng online, đặt hàng và thanh toán trong 1 phút.",plat:"Vercel",c:["#ff8a1f","#c2410c"],cat:"Bán hàng",status:"ok"},
 {id:"truyen",name:"Xưởng Truyện",url:"https://xuongtruyen.vn",desc:"Đọc truyện tranh và truyện chữ, cập nhật chương mới mỗi ngày.",plat:"Vercel",c:["#ffc24a","#d97706"],cat:"Nội dung",status:"ok"},
 {id:"blog",name:"Gza Blog",url:"https://blog.gza.vn",desc:"Bài viết, mẹo và câu chuyện hậu trường của đội Gza.",plat:"Netlify",c:["#f472b6","#9d174d"],cat:"Nội dung",status:"ok"},
 {id:"booking",name:"Gza Booking",url:"https://datlich.gza.vn",desc:"Đặt lịch hẹn và nhận nhắc lịch qua Zalo.",plat:"Vercel",c:["#34d399","#065f46"],cat:"Dịch vụ",status:"ok"},
 {id:"hoc",name:"Gza Học",url:"https://hoc.gza.vn",desc:"Khoá học ngắn, video và bài tập có chấm điểm.",plat:"Netlify",c:["#818cf8","#3730a3"],cat:"Nội dung",status:"bad"},
 {id:"menu",name:"Gza Menu",url:"https://menu.gza.vn",desc:"Menu QR cho quán, cập nhật giá tức thì.",plat:"Vercel",c:["#fb7185","#9f1239"],cat:"Bán hàng",status:"ok"},
 {id:"event",name:"Gza Event",url:"https://event.gza.vn",desc:"Trang sự kiện, đăng ký và check-in bằng mã QR.",plat:"Netlify",c:["#38bdf8","#075985"],cat:"Dịch vụ",status:"ok"},
 {id:"tuyen",name:"Gza Tuyển dụng",url:"https://jobs.gza.vn",desc:"Vị trí đang tuyển và nộp CV trực tuyến.",plat:"Netlify",c:["#a3a3a3","#404040"],cat:"Dịch vụ",status:"ok"},
];
const USERS=[
 {name:"linh",email:"linh@gza.vn",role:"super_admin",sites:"all",last:"Đang online"},
 {name:"Minh",email:"minh@gza.vn",role:"editor",sites:["shop","menu","booking"],last:"Chưa được mở quyền đăng nhập"},
 {name:"Hà",email:"ha@gza.vn",role:"viewer",sites:["blog","hoc"],last:"Chưa được mở quyền đăng nhập"},
];
const ROLE_LABEL={super_admin:"Super admin",editor:"Editor",viewer:"Viewer"};

function rng(seed){let s=0;for(const c of seed)s=(s*31+c.charCodeAt(0))>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const LOGS={};
SITES.forEach(s=>{const r=rng(s.id);const rows=[];let t=Date.parse("2026-10-25T09:40:00+07:00");
  for(let i=0;i<6;i++){t-=(6+Math.floor(r()*70))*3600e3;const fail=(s.status==="bad"&&i===0)||r()<.12;
    rows.push({who:"linh",at:t,ok:!fail,id:"dpl_"+Math.floor(r()*1e10).toString(36).slice(0,7),file:"dist-"+s.id+".zip",size:(0.8+r()*9).toFixed(1)+" MB",live:false})}
  const f=rows.find(x=>x.ok);if(f)f.live=true;LOGS[s.id]=rows});

const state={rf:{site:"",pay:"",plan:""},site:"shop",tab:"info",page:"overview",cf:{q:"",site:"",plan:"",pg:0},file:null,deploying:false,range:30,cat:"Tất cả",fails:0};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const host=u=>u.replace(/^https?:\/\//,"");
const ini=n=>n.replace(/^Gza /,"").slice(0,1).toUpperCase();
const grad=s=>`linear-gradient(140deg,${s.c[0]},${s.c[1]})`;
const ic=(n,st="")=>`<svg class="i" style="${st}"><use href="#i-${n}"/></svg>`;
function fmtT(t){const d=new Date(t);const p=n=>String(n).padStart(2,"0");return `${p(d.getDate())}/${p(d.getMonth()+1)} · ${p(d.getHours())}:${p(d.getMinutes())}`}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2600)}
const platPill=p=>`<span class="pill">${p==="Vercel"?"▲":"◆"} ${p}</span>`;
let authed=false;if(!LIVE){try{authed=sessionStorage.getItem("gza_auth")==="1"}catch(e){}}

/* ---------- PUBLIC ---------- */
function renderPublic(){
  const cats=["Tất cả",...new Set(SITES.map(s=>s.cat))];
  $("#filters").innerHTML=cats.map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${state.cat===c}">${c}</button>`).join("");
  $("#filters").querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;renderPublic()});
  $("#stats").innerHTML=`<div><b>${SITES.length}</b><span>sản phẩm đang chạy</span></div><div><b>${new Set(SITES.map(s=>s.cat)).size}</b><span>nhóm dịch vụ</span></div><div><b>24/7</b><span>luôn sẵn sàng</span></div>`;
  const qq=$("#q").value.trim().toLowerCase();
  const list=SITES.filter(s=>(state.cat==="Tất cả"||s.cat===state.cat)&&(!qq||(s.name+" "+s.desc).toLowerCase().includes(qq)));
  $("#grid").innerHTML=list.length?list.map(s=>`
    <a class="card" href="${s.url}" target="_blank" rel="noopener">
      <div class="thumb"><div class="bgx" style="background:${grad(s)}"></div><div class="pat"></div><div class="shade"></div>
        <span class="plat">${s.cat}</span><span class="logo">${ini(s.name)}</span></div>
      <div class="cbody"><h3>${esc(s.name)}</h3><div class="host mono">${host(s.url)}</div><p>${esc(s.desc)}</p>
        <div class="go"><span>Truy cập</span><span class="arr">${ic("arrow","width:16px;height:16px")}</span></div></div>
    </a>`).join(""):`<div class="empty">${SITES.length?`Không tìm thấy web nào khớp “${esc(qq)}”.`:"Chưa có web nào. Thêm web đầu tiên trong trang quản trị."}</div>`;
  $("#grid").querySelectorAll(".card").forEach(c=>c.addEventListener("pointermove",e=>{const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")}));
}
$("#q").addEventListener("input",renderPublic);
document.addEventListener("keydown",e=>{if(e.key==="/"&&!$("#public").hidden&&document.activeElement!==$("#q")){e.preventDefault();$("#q").focus()}});

/* ---------- LOGIN ---------- */
function loginErr(m){const e=$("#l-err");e.classList.remove("show");void e.offsetWidth;e.innerHTML=ic("lock","width:16px;height:16px;margin-top:2px")+"<span>"+m+"</span>";e.classList.add("show")}
function loginOk(){authed=true;try{sessionStorage.setItem("gza_auth","1")}catch(e){}state.fails=0;route();toast("Chào mừng trở lại, "+BOSS.name)}
$("#l-eye").onclick=()=>{const p=$("#l-pw");p.type=p.type==="password"?"text":"password";$("#l-eye").textContent=p.type==="password"?"Hiện":"Ẩn"};
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();
  const em=$("#l-email").value.trim().toLowerCase(),pw=$("#l-pw").value;
  if(LIVE){if(!em||!pw)return loginErr("Nhập email và mật khẩu.");
    const go=$("#l-go");go.disabled=true;go.innerHTML='<span class="spin"></span>Đang kiểm tra…';
    const {error}=await sb.auth.signInWithPassword({email:em,password:pw});
    go.disabled=false;go.textContent="Đăng nhập";
    if(error)return loginErr(/invalid/i.test(error.message)?"Email hoặc mật khẩu không đúng.":/rate|many/i.test(error.message)?"Thử sai nhiều lần quá, đợi vài phút rồi thử lại.":"Không đăng nhập được: "+error.message);
    return afterSignIn();}
  if(state.fails>=5)return loginErr("Sai quá 5 lần. Thử lại sau 15 phút.");
  if(!em||!pw)return loginErr("Nhập email và mật khẩu.");
  const go=$("#l-go");go.disabled=true;go.innerHTML='<span class="spin"></span>Đang kiểm tra…';
  setTimeout(()=>{go.disabled=false;go.textContent="Đăng nhập";
    if(em===BOSS.email&&pw===BOSS.pw)return loginOk();
    if(USERS.some(u=>u.email===em&&u.role!=="super_admin"))return loginErr("Tài khoản này không có quyền vào trang quản trị.");
    state.fails++;loginErr(`Email hoặc mật khẩu không đúng.${state.fails>=3?` Còn ${5-state.fails} lần thử.`:""}`)},700)});
$("#l-google").onclick=async()=>{if(LIVE){const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/admin"}});if(error)loginErr(/not enabled|provider/i.test(error.message)?"Đăng nhập Google chưa được bật trong Supabase. Dùng email và mật khẩu.":"Không mở được Google: "+error.message);return}
  const b=$("#l-google");b.disabled=true;b.innerHTML='<span class="spin" style="border-color:rgba(0,0,0,.15);border-top-color:#1f1f1f"></span>Đang mở Google…';setTimeout(()=>{b.disabled=false;loginOk()},900)};

async function afterSignIn(){
  const role=await sb.rpc("my_role").then(r=>r.data).catch(()=>null);
  if(role!=="super_admin"){await sb.auth.signOut();authed=false;route();return loginErr("Tài khoản này không có quyền vào trang quản trị.")}
  const {data:{user}}=await sb.auth.getUser();BOSS.email=user.email;BOSS.name=user.email.split("@")[0];
  try{await loadAdmin()}catch(e){console.error(e);await sb.auth.signOut();return loginErr("Không tải được dữ liệu: "+(e.message||e))}
  loginOk();
}

/* ---------- LIVE data: Supabase -> the same in-memory shapes the UI already renders ---------- */
const mapSite=r=>({id:r.id,name:r.name,url:r.url,desc:r.description||"",plat:r.platform||"Vercel",c:[r.color1,r.color2],cat:r.category||"Dịch vụ",status:r.status||"ok",visible:r.visible!==false,project_ref:r.project_ref||"",token_saved_at:r.token_saved_at||null});
async function loadPublic(){
  const rows=await q(sb.from("sites").select("id,name,url,description,category,color1,color2,status,visible,sort").eq("visible",true).order("sort").order("name"));
  SITES.length=0;rows.forEach(r=>SITES.push(mapSite(r)));renderPublic();
}
async function loadAdmin(){
  const [sites,cfgs,hist,plans,pays,logs,custs,payms,admins,scopes]=await Promise.all([
    q(sb.from("sites").select("*").order("sort").order("name")),q(sb.from("site_config").select("*")),
    q(sb.from("config_history").select("*").order("created_at",{ascending:false}).limit(500)),q(sb.from("site_plans").select("*").order("sort").order("created_at")),
    q(sb.from("pay_accounts").select("*")),q(sb.from("deploy_logs").select("*").order("created_at",{ascending:false}).limit(500)),
    q(sb.from("customers").select("*")),q(sb.from("payments").select("*").order("paid_at",{ascending:false})),
    q(sb.from("admins").select("*")),q(sb.from("admin_sites").select("*"))]);
  SITES.length=0;sites.forEach(r=>SITES.push(mapSite(r)));
  for(const k in CFG)delete CFG[k];for(const k in SITE_PLANS)delete SITE_PLANS[k];for(const k in LOGS)delete LOGS[k];
  SITES.forEach(s=>{const c=cfgs.find(x=>x.site_id===s.id)||{};
    CFG[s.id]={db:c.db_kind||"Firebase",project:c.db_project||"",admin:c.admin_email||"",cskh:c.support_email||"",hotline:c.hotline||"",otpFrom:c.otp_from||"",otpName:c.otp_name||"",otpSubject:c.otp_subject||"",otpTtl:String(c.otp_ttl||5),
      synced:c.synced_at?Date.parse(c.synced_at):null,hist:hist.filter(h=>h.site_id===s.id).map(h=>({at:Date.parse(h.created_at),what:h.summary,ok:true}))};
    const sp=plans.filter(p=>p.site_id===s.id);
    SITE_PLANS[s.id]=sp.map(p=>({id:p.id,name:p.name,price:p.price,cycle:p.cycle,perks:p.perks||[],on:p.active}));
    LOGS[s.id]=logs.filter(l=>l.site_id===s.id).map(l=>({who:(l.actor_email||"").split("@")[0]||"?",at:Date.parse(l.created_at),ok:l.status==="success",pending:l.status==="pending",id:l.deployment_id||("#"+l.id),file:l.file_name,size:l.size_bytes?(l.size_bytes/1048576).toFixed(1)+" MB":"",live:l.is_live,dbid:l.id}))});
  PAYACC.forEach(a=>{const r=pays.find(x=>x.id===a.id)||{};const pf=r.public_fields||{};const sk=r.secret_keys||[];
    a.on=!!r.enabled;a.connected=!!r.connected;a.fields.forEach(f=>{if(f.secret)f.empty=!sk.includes(f.k);else f.v=pf[f.k]??(f.opts?f.opts[0]:"")})});
  CUSTOMERS.length=0;
  custs.forEach(c=>{const L=SITE_PLANS[c.site_id]||[];const pi=L.findIndex(p=>p.id===c.plan_id);const pl=L[pi];
    const pm=payms.find(p=>p.customer_id===c.id);const lastMin=c.last_active_at?Math.max(0,Math.round((Date.now()-Date.parse(c.last_active_at))/6e4)):99999;
    const o={id:c.id,name:c.name||c.email,email:c.email,site:c.site_id,plan:pl?(pi===0?"VIP":"Premium"):"Free",planId:pl?pl.id:null,planName:pl?pl.name:"",price:pl?pl.price:0,joined:Date.parse(c.joined_at),last:Date.now()-lastMin*6e4,lastMin};
    if(pl){o.once=pl.cycle==="lần"||pl.cycle==="trọn đời";o.method=pm?pm.method:"—";o.paidAt=pm?Date.parse(pm.paid_at):o.joined;o.next=pm&&pm.next_due_at?Date.parse(pm.next_due_at):null;o.months=pm?pm.months_paid:1;o.pay=pm?pm.status:"paid"}
    CUSTOMERS.push(o)});
  CUSTOMERS.sort((a,b)=>a.lastMin-b.lastMin);
  USERS.length=0;admins.forEach(a=>USERS.push({uid:a.user_id,name:a.email.split("@")[0],email:a.email,role:a.role,sites:a.role==="super_admin"?"all":scopes.filter(x=>x.user_id===a.user_id).map(x=>x.site_id),last:a.role==="super_admin"?"Chủ hệ thống":"Đã được cấp quyền"}));
  QUOTAS.length=0;
  if(!SITES.find(x=>x.id===state.site))state.site=SITES[0]?SITES[0].id:"";
}
const slug=t=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"web";

/* ---------- ADMIN ---------- */
function renderSide(){
  $("#side").innerHTML=`
    <div class="brand"><span class="mark">G</span><div><div class="nm">GZA Admin</div><div class="sl">Quản trị hệ sinh thái</div></div></div>
    <div class="label">Chung</div>
    <button class="nav-item" data-page="overview" aria-current="${state.page==="overview"}"><span class="ico">${ic("home","width:16px;height:16px")}</span><span class="name">Tổng quan</span>${openAlerts()?`<span class="badge">${openAlerts()}</span>`:""}</button>
    <button class="nav-item" data-page="customers" aria-current="${state.page==="customers"}"><span class="ico">${ic("user","width:16px;height:16px")}</span><span class="name">Khách hàng</span></button>
    <button class="nav-item" data-page="revenue" aria-current="${state.page==="revenue"}"><span class="ico">${ic("coin","width:16px;height:16px")}</span><span class="name">Doanh thu</span>${CUSTOMERS.some(c=>c.pay==="overdue")?`<span class="st" style="background:var(--bad);box-shadow:0 0 8px var(--bad)" title="Có tài khoản quá hạn"></span>`:""}</button>
    <div class="label">Web (${SITES.length})</div>
    ${SITES.map(s=>`<button class="nav-item" data-site="${s.id}" aria-current="${state.page==="site"&&state.site===s.id}">
      <span class="logo" style="background:${grad(s)}">${ini(s.name)}</span><span class="name">${esc(s.name)}</span>
      <span class="st" style="background:var(--${s.status==="ok"?"ok":"bad"});box-shadow:0 0 8px var(--${s.status==="ok"?"ok":"bad"})" title="${s.status==="ok"?"Đang chạy ổn":"Lần deploy gần nhất bị lỗi"}"></span></button>`).join("")}
    <button class="nav-item add" data-page="new" aria-current="${state.page==="new"}"><span class="ico">${ic("plus","width:15px;height:15px")}</span><span class="name">Thêm web mới</span></button>
    <div class="label">Hệ thống</div>
    <button class="nav-item" data-page="users" aria-current="${state.page==="users"}"><span class="ico">${ic("users","width:16px;height:16px")}</span><span class="name">Người dùng & quyền</span></button>
    <button class="nav-item" data-page="payacc" aria-current="${state.page==="payacc"}"><span class="ico">${ic("card","width:16px;height:16px")}</span><span class="name">Tài khoản nhận tiền</span></button>
    <a class="nav-item" href="#"><span class="ico">${ic("globe","width:16px;height:16px")}</span><span class="name">Xem trang public</span></a>
    <div class="me"><span class="avatar">${BOSS.name[0].toUpperCase()}</span><div class="who-txt" style="min-width:0"><div style="font-weight:600">${BOSS.name}</div><div class="muted" style="font-size:12px">Super admin</div></div>
      <button class="out" id="logout" title="Đăng xuất" aria-label="Đăng xuất">${ic("out")}</button></div>`;
  $("#side").querySelectorAll("[data-site]").forEach(b=>b.onclick=()=>{state.page="site";state.site=b.dataset.site;state.file=null;renderAdmin()});
  $("#side").querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;renderAdmin()});
  $("#logout").onclick=()=>{if(LIVE)sb.auth.signOut();authed=false;state.page="overview";try{sessionStorage.removeItem("gza_auth")}catch(e){}location.hash="";route();toast("Đã đăng xuất")};
}

function renderAdmin(){
  renderSide();
  if(state.page==="overview")return renderOverview();
  if(state.page==="customers")return renderCustomers();
  if(state.page==="revenue")return renderRevenue();
  if(state.page==="payacc")return renderPayAcc();
  if(state.page==="users")return renderUsers();
  if(state.page==="new")return renderNew();
  const s=SITES.find(x=>x.id===state.site)||SITES[0];
  if(!s){state.page="new";return renderNew()}
  $("#main").innerHTML=`<div class="fade">
    <div class="site-head">
      <span class="logo" style="background:${grad(s)}">${ini(s.name)}</span>
      <div><h1>${esc(s.name)}</h1>
        <div class="meta"><a class="mono" href="${s.url}" target="_blank" rel="noopener">${host(s.url)} ↗</a>${platPill(s.plat)}
        ${s.status==="ok"?`<span class="pill ok"><span class="dot"></span>Đang chạy</span>`:`<span class="pill warn"><span class="dot"></span>Deploy mới lỗi, vẫn chạy bản cũ</span>`}</div></div>
      <div class="actions"><a class="btn" href="${s.url}" target="_blank" rel="noopener">${ic("ext","width:16px;height:16px")}Mở web</a></div>
    </div>
    <div class="tabs" role="tablist">
      ${[["info","Thông tin","info"],["config","Cấu hình","gear"],["plans","Gói dịch vụ","coin"],["update","Update","rocket"],["traffic","Traffic","chart"]].map(([k,l,i])=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="${state.tab===k}">${ic(i,"width:16px;height:16px")}${l}</button>`).join("")}
    </div>
    <div id="tabbody"></div></div>`;
  $("#main").querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderAdmin()});
  ({info:tabInfo,config:tabConfig,plans:tabPlans,update:tabUpdate,traffic:tabTraffic})[state.tab](s);
}

function tabInfo(s){
  $("#tabbody").innerHTML=`<div class="panel stack fade">
    <div><h2>Thông tin hiển thị</h2><p class="sub">Những gì khách thấy trên thẻ ở trang chủ.</p></div>
    <div class="logo-pick"><span class="logo" style="background:${grad(s)}">${ini(s.name)}</span>
      <div><button class="btn sm" onclick="toast('Bản mẫu: chỗ này sẽ mở chọn ảnh logo')">Đổi logo</button><div class="muted" style="font-size:12px;margin-top:6px">PNG hoặc SVG, vuông, tối thiểu 256×256</div></div></div>
    <div class="form-grid">
      <label class="field"><span>Tên web</span><input id="f-name" class="input" value="${esc(s.name)}"></label>
      <label class="field"><span>URL</span><input id="f-url" class="input mono" value="${esc(s.url)}"></label>
      <label class="field full"><span>Mô tả 1 dòng</span><input id="f-desc" class="input" maxlength="80" value="${esc(s.desc)}"><small id="f-cnt">${s.desc.length}/80 ký tự</small></label>
    </div>
    <div class="divider"></div>
    <div><h2>Kết nối nền tảng</h2><p class="sub">Hub dùng khoá này để deploy thay bạn. Khoá được mã hoá trong DB và không bao giờ gửi về trình duyệt.</p></div>
    <div class="form-grid">
      <label class="field"><span>Nền tảng</span><select id="f-plat" class="input"><option ${s.plat==="Vercel"?"selected":""}>Vercel</option><option ${s.plat==="Netlify"?"selected":""}>Netlify</option></select></label>
      <label class="field"><span>Project ID</span><input id="f-pid" class="input mono" value="${LIVE?esc(s.project_ref||""):"prj_"+s.id+"_8f3a21"}" placeholder="ID project trên ${s.plat}"></label>
      <div class="field full"><span>Token deploy</span><div class="secret" id="tok-box"><input id="f-tok" class="input mono" value="${!LIVE?"••••••••••••••••  đã lưu 12/10/2026":s.token_saved_at?"••••••••••••••••  đã lưu "+fmtD(Date.parse(s.token_saved_at)):"Chưa có token"}" disabled><button class="btn sm" id="tok-btn">${LIVE&&!s.token_saved_at?"Thêm token":"Thay token"}</button></div></div>
    </div>
    <div class="form-foot"><button class="btn ghost" onclick="renderAdmin()">Huỷ</button><button class="btn primary" id="save">Lưu thay đổi</button></div>
  </div>`;
  const d=$("#f-desc");d.addEventListener("input",()=>$("#f-cnt").textContent=d.value.length+"/80 ký tự");
  $("#tok-btn").onclick=()=>secretEdit($("#tok-box"),"site:"+s.id,"deploy_token","Dán token từ "+s.plat,()=>{s.token_saved_at=new Date().toISOString();tabInfo(s)});
  $("#save").onclick=async()=>{const nv={name:$("#f-name").value.trim()||s.name,url:$("#f-url").value.trim()||s.url,desc:$("#f-desc").value.trim(),plat:$("#f-plat").value,project_ref:$("#f-pid").value.trim()};
    const b=$("#save");b.disabled=true;
    const ok=await persist(()=>q(sb.from("sites").update({name:nv.name,url:nv.url,description:nv.desc,platform:nv.plat,project_ref:nv.project_ref||null}).eq("id",s.id)));
    b.disabled=false;if(!ok)return;Object.assign(s,nv);renderAdmin();renderPublic();toast("Đã lưu. Trang chủ cập nhật ngay.")};
}

function logTable(s){
  if(!LOGS[s.id].length)return `<div class="panel muted" style="text-align:center">Chưa có lần deploy nào. Kéo file .zip vào khung phía trên để deploy lần đầu.</div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Người deploy</th><th>Lúc</th><th>File</th><th>Kết quả</th><th>Mã deployment</th><th></th></tr></thead>
    <tbody>${LOGS[s.id].map((l,i)=>`<tr class="${l._new?"new":""}">
      <td><span class="who"><span class="avatar">${l.who[0].toUpperCase()}</span>${esc(l.who)}</span></td>
      <td>${fmtT(l.at)}</td><td class="mono">${esc(l.file)} <span class="muted">· ${l.size}</span></td>
      <td>${l.ok?`<span class="pill ok"><span class="dot"></span>Thành công</span>`:`<span class="pill bad"><span class="dot"></span>Lỗi build</span>`}${l.live?` <span class="pill hot">Đang chạy</span>`:""}</td>
      <td class="mono muted">${l.id}</td>
      <td>${l.ok&&!l.live&&!LIVE?`<button class="btn sm" data-rb="${i}">Quay về bản này</button>`:""}</td></tr>`).join("")}</tbody></table></div>`;
}

function ripple(drop,x,y,big){const r=document.createElement("span");r.className="ripple"+(big?" big":"");r.style.left=x+"px";r.style.top=y+"px";drop.appendChild(r);setTimeout(()=>r.remove(),1900)}
function tabUpdate(s){
  $("#tabbody").innerHTML=`<div class="stack fade">
    <div class="panel stack">
      <div><h2>Cập nhật phiên bản mới</h2><p class="sub">Kéo file <b>.zip</b> chứa thư mục build sẵn (<span class="mono">dist/</span> hoặc <span class="mono">build/</span>, có <span class="mono">index.html</span>) rồi bấm Deploy.</p></div>
      <div class="drop" id="drop" tabindex="0" role="button" aria-label="Chọn file zip">
        <span class="ic">${ic("upload")}</span>
        <strong>Thả file .zip vào đây</strong>
        <span class="hint">hoặc bấm để chọn từ máy</span>
        <span class="types"><span class="pill">.zip</span><span class="pill">tối đa 100 MB</span></span>
        <input type="file" id="file" accept=".zip" hidden>
      </div>
      <button class="btn sm ghost" id="sample" style="justify-self:center">Không có file? Dùng file mẫu dist-${s.id}.zip</button>
      <div id="filebox"></div>
      <div class="note">${ic("shield")}<span>Nếu bản mới deploy lỗi, web vẫn chạy <b>bản đang chạy</b> hiện tại. Hub chỉ chuyển sang bản mới khi ${s.plat} báo thành công.</span></div>
    </div>
    <div><div class="h2row"><h2>Lịch sử deploy</h2><span class="muted" style="font-size:12.5px">${LOGS[s.id].length} lần</span></div>${logTable(s)}</div>
  </div>`;
  const drop=$("#drop"),inp=$("#file");let last=0;
  const pos=e=>{const r=drop.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  drop.onclick=e=>{ripple(drop,...pos(e));inp.click()};
  drop.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inp.click()}};
  inp.onchange=()=>inp.files[0]&&pick(inp.files[0].name,inp.files[0].size);
  drop.addEventListener("dragenter",e=>{e.preventDefault();drop.classList.add("over")});
  drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("over");const n=Date.now();if(n-last>260){last=n;ripple(drop,...pos(e))}});
  drop.addEventListener("dragleave",e=>{if(!drop.contains(e.relatedTarget))drop.classList.remove("over")});
  drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("over");const p=pos(e);ripple(drop,...p,true);setTimeout(()=>ripple(drop,...p,true),180);const f=e.dataTransfer.files[0];f&&pick(f.name,f.size)});
  $("#sample").onclick=()=>{const r=drop.getBoundingClientRect();ripple(drop,r.width/2,r.height/2,true);setTimeout(()=>ripple(drop,r.width/2,r.height/2,true),180);pick(`dist-${s.id}.zip`,4.2*1048576)};
  document.querySelectorAll("[data-rb]").forEach(b=>b.onclick=()=>{const l=LOGS[s.id][+b.dataset.rb];LOGS[s.id].forEach(x=>x.live=false);l.live=true;s.status="ok";renderAdmin();toast("Đã quay về "+l.id)});
  function pick(name,size){
    if(!/\.zip$/i.test(name)){state.file=null;$("#filebox").innerHTML=`<div class="err show">${ic("lock","width:16px;height:16px")}<span>File “${esc(name)}” không phải .zip. Nén thư mục build (dist/) thành .zip rồi thử lại.</span></div>`;return}
    state.file={name,size:(size/1048576).toFixed(1)+" MB"};renderFile(s);
  }
  if(state.file)renderFile(s);
}
function renderFile(s){
  const f=state.file;
  $("#filebox").innerHTML=`<div class="stack" style="gap:14px">
    <div class="file-row"><span class="fi">ZIP</span><div class="nm"><div>${esc(f.name)}</div><div class="muted" style="font-size:12px">${f.size} · có index.html ✓ · sẽ deploy lên ${s.plat}</div></div>
      <button class="btn sm ghost" id="rm">Bỏ file</button></div>
    <div class="deploy-bar"><div class="steps" id="steps">${["Tải lên","Kiểm tra","Deploy","Xong"].map(x=>`<span class="s">${x}</span>`).join("")}</div>
      <button class="btn primary" id="go" ${LIVE?"disabled":""}>${ic("rocket","width:16px;height:16px")}Deploy lên ${s.plat}</button></div>
    ${LIVE?`<div class="note">${ic("shield")}<span>Nút Deploy sẽ chạy khi có hàm deploy ở backend và token ${s.plat} của web này. Đây là bước tiếp theo.</span></div>`:""}
    <div class="bar"><i id="prog"></i></div></div>`;
  $("#rm").onclick=()=>{state.file=null;$("#filebox").innerHTML=""};
  $("#go").onclick=()=>deploy(s);
}
function deploy(s){
  if(state.deploying)return;state.deploying=true;$("#go").disabled=true;$("#rm").disabled=true;
  const st=[...document.querySelectorAll("#steps .s")];let i=0;
  const tick=()=>{st.forEach((e,j)=>e.className="s"+(j<i?" done":j===i?" on":""));$("#prog").style.width=(i/3*100)+"%";
    if(i===3){st[3].className="s done";state.deploying=false;LOGS[s.id].forEach(x=>x.live=false);
      LOGS[s.id].unshift({who:BOSS.name,at:Date.now(),ok:true,id:"dpl_"+Math.random().toString(36).slice(2,9),file:state.file.name,size:state.file.size,live:true,_new:true});
      s.status="ok";state.file=null;setTimeout(()=>{renderAdmin();toast("Deploy thành công. "+host(s.url)+" đã chạy bản mới.")},600);return}
    i++;setTimeout(tick,850)};
  tick();
}

const CFG={};
function cfg(s){const d=s.url.replace(/^https?:\/\//,"").split("/")[0].replace(/^[^.]+\./,"");return CFG[s.id]||(CFG[s.id]={
  db:s.plat==="Netlify"?"Supabase":"Firebase",project:s.id+"-gza-prod",
  admin:"linh@gza.vn",cskh:"cskh@"+(s.id==="truyen"?"xuongtruyen.vn":d),hotline:"1900 6868",
  otpFrom:"no-reply@"+(s.id==="truyen"?"xuongtruyen.vn":d),otpName:s.name,otpSubject:"Mã đăng nhập "+s.name+" của bạn",otpTtl:"5",
  synced:Date.parse("2026-10-24T16:12:00+07:00"),hist:[{at:Date.parse("2026-10-24T16:12:00+07:00"),what:"Đổi email CSKH",ok:true},{at:Date.parse("2026-10-20T10:05:00+07:00"),what:"Đổi tiêu đề email mã đăng nhập",ok:true}]})}
function tabConfig(s){
  const c=cfg(s);
  const row=(id,label,val,hint,type="text")=>`<label class="field"><span>${label}</span><input id="${id}" class="input${type==="email"?" mono":""}" type="${type}" value="${esc(val)}">${hint?`<small>${hint}</small>`:""}</label>`;
  $("#tabbody").innerHTML=`<div class="stack fade">
    <div class="note" style="align-items:center">${ic("db","color:var(--amber)")}<span style="flex:1">${LIVE?`Web này dùng <b>${c.db}</b>${c.project?` · <span class="mono">${esc(c.project)}</span>`:""}. Hub lưu cấu hình ở đây; khi web mở API cho hub, hub sẽ tự ghi xuống ${c.db} của web.`:`Kết nối tới <b>${c.db}</b> · <span class="mono">${c.project}</span>. Lưu ở đây là hub ghi thẳng xuống ${c.db} của web này.`}</span>${c.synced?`<span class="pill ok" id="c-sync"><span class="dot"></span>Đã đồng bộ ${fmtT(c.synced)}</span>`:`<span class="pill warn" id="c-sync"><span class="dot"></span>Chưa đồng bộ xuống web</span>`}</div>
    <div class="panel stack">
      <div><h2>Email & liên hệ</h2><p class="sub">Hiện trên web và dùng để nhận thư của khách.</p></div>
      <div class="form-grid">
        ${row("c-admin","Email admin",c.admin,"Tài khoản quản trị của riêng web này. Đổi xong sẽ gửi thư xác nhận tới email mới.","email")}
        ${row("c-cskh","Email CSKH",c.cskh,"Khách gửi thư hỏi đáp sẽ về đây.","email")}
        ${row("c-hot","Hotline",c.hotline,"")}
      </div>
    </div>
    <div class="panel stack">
      <div><h2>Email gửi mã đăng nhập</h2><p class="sub">Thư chứa mã OTP mà khách nhận khi đăng nhập hoặc quên mật khẩu.</p></div>
      <div class="form-grid">
        ${row("c-from","Gửi từ email",c.otpFrom,"","email")}
        ${row("c-name","Tên người gửi",c.otpName,"Khách thấy tên này trong hộp thư.")}
        <label class="field full"><span>Tiêu đề thư</span><input id="c-subj" class="input" value="${esc(c.otpSubject)}"></label>
        <label class="field"><span>Mã hết hạn sau</span><select id="c-ttl" class="input">${["3","5","10","15"].map(m=>`<option value="${m}" ${c.otpTtl===m?"selected":""}>${m} phút</option>`).join("")}</select></label>
      </div>
      <div class="note">${ic("mail","color:var(--amber)")}<span id="c-prev"></span></div>
      <div class="deploy-bar"><button class="btn sm" id="c-test">${ic("mail","width:15px;height:15px")}Gửi thử tới ${BOSS.email}</button></div>
    </div>
    <div class="form-foot" style="border:0;padding:0"><button class="btn ghost" id="c-cancel">Huỷ</button><button class="btn primary" id="c-save">${LIVE?"Lưu cấu hình":"Lưu & đồng bộ xuống "+c.db}</button></div>
    <div><div class="h2row"><h2>Lịch sử thay đổi</h2></div><div class="tbl-wrap"><table><thead><tr><th>Lúc</th><th>Ai</th><th>Thay đổi</th><th>Kết quả</th></tr></thead><tbody>
      ${c.hist.length?"":`<tr><td colspan="4" class="muted" style="text-align:center">Chưa có thay đổi nào.</td></tr>`}${c.hist.map(h=>`<tr class="${h._new?"new":""}"><td>${fmtT(h.at)}</td><td><span class="who"><span class="avatar">${BOSS.name[0].toUpperCase()}</span>${esc(BOSS.name)}</span></td><td>${esc(h.what)}</td><td><span class="pill ok"><span class="dot"></span>${LIVE?"Đã lưu ở hub":"Đã ghi vào "+c.db}</span></td></tr>`).join("")}
    </tbody></table></div></div>
  </div>`;
  const prev=()=>$("#c-prev").innerHTML=`Khách sẽ nhận: <b>${esc($("#c-name").value)}</b> &lt;<span class="mono">${esc($("#c-from").value)}</span>&gt; · “${esc($("#c-subj").value)}” · mã hết hạn sau ${$("#c-ttl").value} phút.`;
  ["c-name","c-from","c-subj","c-ttl"].forEach(id=>$("#"+id).addEventListener("input",prev));prev();
  $("#c-test").onclick=()=>toast(LIVE?"Gửi thử cần dịch vụ gửi mail của web, sẽ bật khi nối API của web.":"Đã gửi thư thử với mã 482 915 tới "+BOSS.email);
  $("#c-cancel").onclick=()=>tabConfig(s);
  $("#c-save").onclick=async()=>{
    const nv={admin:$("#c-admin").value.trim(),cskh:$("#c-cskh").value.trim(),hotline:$("#c-hot").value.trim(),otpFrom:$("#c-from").value.trim(),otpName:$("#c-name").value.trim(),otpSubject:$("#c-subj").value.trim(),otpTtl:$("#c-ttl").value};
    const bad=["admin","cskh","otpFrom"].find(k=>(nv[k]||!LIVE)&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nv[k]));
    if(bad){toast("Email chưa đúng dạng, kiểm tra lại ô "+({admin:"Email admin",cskh:"Email CSKH",otpFrom:"Gửi từ email"})[bad]);return}
    const L={admin:"email admin",cskh:"email CSKH",hotline:"hotline",otpFrom:"email gửi mã",otpName:"tên người gửi",otpSubject:"tiêu đề thư mã",otpTtl:"thời hạn mã"};
    const ch=Object.keys(nv).filter(k=>nv[k]!==c[k]);
    if(!ch.length){toast("Không có gì thay đổi");return}
    const b=$("#c-save");b.disabled=true;b.innerHTML='<span class="spin"></span>Đang lưu…';
    const summary="Đổi "+ch.map(k=>L[k]).join(", ");
    const ok=await persist(async()=>{await q(sb.from("site_config").upsert({site_id:s.id,admin_email:nv.admin,support_email:nv.cskh,hotline:nv.hotline,otp_from:nv.otpFrom,otp_name:nv.otpName,otp_subject:nv.otpSubject,otp_ttl:+nv.otpTtl}));await q(sb.from("config_history").insert({site_id:s.id,summary}))});
    if(!ok){b.disabled=false;b.textContent="Lưu cấu hình";return}
    setTimeout(()=>{if(LIVE){Object.assign(c,nv);c.hist.forEach(h=>h._new=false);c.hist.unshift({at:Date.now(),what:summary,ok:true,_new:true});tabConfig(s);toast("Đã lưu cấu hình của "+s.name);return}Object.assign(c,nv);c.synced=Date.now();c.hist.forEach(h=>h._new=false);c.hist.unshift({at:Date.now(),what:"Đổi "+ch.map(k=>L[k]).join(", "),ok:true,_new:true});tabConfig(s);toast("Đã lưu và đồng bộ xuống "+c.db+" của "+s.name)},LIVE?0:1100)};
}

const WT={truyen:34,shop:22,menu:12,booking:10,blog:8,hoc:7,event:5,tuyen:2};
function series(id,n){const r=rng(id+"t");const w=WT[id]??WT[id.slice(0,-1)]??8;const prev=!(id in WT)&&(id.slice(0,-1) in WT);let v=w*42*(prev?0.86:1)*(0.85+r()*0.3);const out=[];
  for(let i=0;i<n;i++){v=Math.max(40,v*(0.9+r()*0.22));const wk=new Date(Date.parse("2026-10-25")-(n-1-i)*864e5).getDay();out.push(Math.round(v*(wk===0||wk===6?1.25:1)))}return out}
function niceMax(m){const p=Math.pow(10,Math.floor(Math.log10(m)));return [1,2,2.5,5,10].find(k=>k*p>=m)*p}
function tabTraffic(s){
  const n=state.range;const d=series(s.id,n);const prev=series(s.id+"p",n);
  const sum=d.reduce((a,b)=>a+b,0),psum=prev.reduce((a,b)=>a+b,0);const ch=Math.round((sum/psum-1)*100);
  const W=640,H=230,L=46,R=24,T=14,B=28;const mx=niceMax(Math.max(...d));
  const x=i=>L+i*(W-L-R)/(n-1),y=v=>T+(H-T-B)*(1-v/mx);
  const line=d.map((v,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const grid=[0,.25,.5,.75,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${y(mx*f)}" y2="${y(mx*f)}" stroke="rgba(255,214,170,.07)"/><text x="${L-10}" y="${y(mx*f)+3.5}" text-anchor="end">${(mx*f).toLocaleString("vi-VN")}</text>`).join("");
  const step=n===7?1:7;const xl=[];for(let i=n-1;i>=0;i-=step){const dt=new Date(Date.parse("2026-10-25")-(n-1-i)*864e5);xl.push(`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${dt.getDate()}/${dt.getMonth()+1}</text>`)}
  const pages=[["/",.42],["/san-pham",.21],["/lien-he",.12],["/bai-viet/khai-truong",.09],["/gio-hang",.07]];
  $("#tabbody").innerHTML=`<div class="stack fade">
    <div class="deploy-bar"><div class="seg" role="group" aria-label="Khoảng thời gian">${[7,30].map(k=>`<button data-r="${k}" aria-pressed="${n===k}">${k} ngày</button>`).join("")}</div>
      <span class="pill">Số liệu mẫu</span></div>
    <div class="kpis">
      <div class="kpi"><div class="k">Lượt truy cập</div><div class="v">${sum.toLocaleString("vi-VN")}</div><div class="d ${ch>=0?"up":"down"}">${ch>=0?"▲":"▼"} ${Math.abs(ch)}% so với ${n} ngày trước</div></div>
      <div class="kpi"><div class="k">Người truy cập (không trùng)</div><div class="v">${Math.round(sum*.62).toLocaleString("vi-VN")}</div><div class="d muted">≈ 1,6 trang mỗi người</div></div>
      <div class="kpi"><div class="k">Hôm nay</div><div class="v">${d[n-1].toLocaleString("vi-VN")}</div><div class="d muted">tính đến 09:40</div></div>
    </div>
    <div class="two">
      <div class="panel chart"><h2 style="margin-bottom:14px">Lượt truy cập mỗi ngày</h2>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ lượt truy cập ${n} ngày">
          <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffc24a"/></linearGradient></defs>
          ${grid}${xl.join("")}
          <path d="${line}L${x(n-1)},${y(0)}L${x(0)},${y(0)}Z" fill="url(#ga)"/>
          <path d="${line}" fill="none" stroke="url(#gl)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="${x(n-1)}" cy="${y(d[n-1])}" r="9" fill="#ffc24a" fill-opacity=".2"/>
          <circle cx="${x(n-1)}" cy="${y(d[n-1])}" r="4.5" fill="#ffc24a" stroke="#16120f" stroke-width="2"/>
        </svg></div>
      <div class="panel"><h2 style="margin-bottom:16px">Trang được xem nhiều</h2><div class="toplist">
        ${pages.map(([p,f])=>`<div class="r"><span class="mono" style="overflow:hidden;text-overflow:ellipsis">${p}</span><span style="font-variant-numeric:tabular-nums">${Math.round(sum*f).toLocaleString("vi-VN")}</span><span class="b"><i style="width:${f/.42*100}%"></i></span></div>`).join("")}
      </div></div>
    </div>
    <div class="src">Nguồn số liệu: Umami, một script nhúng chung cho mọi web (Vercel lẫn Netlify) nên các web so sánh được với nhau.</div>
  </div>`;
  $("#tabbody").querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{state.range=+b.dataset.r;tabTraffic(s)});
}

/* ---------- customers (end users of every site), mock ---------- */
const PLANS={Free:{p:0,cls:""},VIP:{p:49000,cls:"vip"},Premium:{p:99000,cls:"pre"}};
const TIER={Free:"Miễn phí",VIP:"Gói cơ bản",Premium:"Gói cao cấp"};
const SITE_PLANS={
 truyen:[{id:"vip",name:"VIP",price:49000,cycle:"tháng",perks:["Đọc trước chương mới 3 ngày","Không quảng cáo"],on:true},{id:"pre",name:"Premium",price:99000,cycle:"tháng",perks:["Mọi quyền lợi VIP","Tải truyện đọc offline","Huy hiệu Premium"],on:true}],
 shop:[{id:"member",name:"Thành viên Bạc",price:59000,cycle:"tháng",perks:["Freeship đơn từ 150k","Giảm 5% mọi đơn"],on:true},{id:"gold",name:"Thành viên Vàng",price:129000,cycle:"tháng",perks:["Freeship mọi đơn","Giảm 10%","Ưu tiên giao hàng"],on:true}],
 blog:[{id:"support",name:"Ủng hộ tác giả",price:29000,cycle:"tháng",perks:["Bài viết độc quyền mỗi tuần"],on:true}],
 booking:[{id:"pro",name:"Pro",price:79000,cycle:"tháng",perks:["Không giới hạn lịch hẹn","Nhắc lịch qua Zalo"],on:true},{id:"team",name:"Nhóm",price:199000,cycle:"tháng",perks:["5 nhân viên","Báo cáo doanh thu"],on:true}],
 hoc:[{id:"single",name:"Khoá lẻ",price:199000,cycle:"lần",perks:["Truy cập 1 khoá học","Chứng chỉ hoàn thành"],on:true},{id:"life",name:"Trọn đời",price:990000,cycle:"trọn đời",perks:["Mọi khoá học hiện có và sau này","Nhóm hỗ trợ riêng"],on:true}],
 menu:[{id:"small",name:"Quán nhỏ",price:99000,cycle:"tháng",perks:["1 chi nhánh","Menu QR không giới hạn món"],on:true},{id:"chain",name:"Chuỗi",price:299000,cycle:"tháng",perks:["Tối đa 10 chi nhánh","Báo cáo bán chạy"],on:true}],
 event:[{id:"ticket",name:"Vé sự kiện",price:149000,cycle:"lần",perks:["1 vé vào cửa","Check-in bằng QR"],on:true}],
 tuyen:[{id:"hot",name:"Tin nổi bật",price:199000,cycle:"lần",perks:["Ghim đầu trang 7 ngày","Gắn nhãn Gấp"],on:true}],
};
const NOW=Date.parse("2026-10-25T13:40:00+07:00");
const CUSTOMERS=(()=>{const r=rng("customers");const HO=["Nguyễn","Trần","Lê","Phạm","Hoàng","Vũ","Đặng","Bùi","Đỗ","Ngô","Dương","Lý"],LOT=["Thị","Văn","Minh","Thu","Gia","Ngọc","Hoài","Đức"],TEN=["An","Bình","Chi","Dũng","Giang","Hải","Hương","Khánh","Lan","Long","Mai","Nam","Ngọc","Phúc","Quân","Thảo","Trang","Tú","Vy","Yến","Hùng","Linh","Sơn","Hà"];
  const W={truyen:34,shop:22,menu:12,booking:10,blog:8,hoc:7,event:5,tuyen:2};const pool=[];Object.entries(W).forEach(([k,v])=>{for(let i=0;i<v;i++)pool.push(k)});
  const plain=t=>t.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
  const doms=["gmail.com","gmail.com","gmail.com","yahoo.com","outlook.com"];const out=[];
  for(let i=0;i<128;i++){const ho=HO[r()*HO.length|0],lot=LOT[r()*LOT.length|0],ten=TEN[r()*TEN.length|0];const site=pool[r()*pool.length|0];
    const x=r();const plan=x<.68?"Free":x<.9?"VIP":"Premium";
    const lastMin=r()<.12?Math.floor(r()*14):r()<.5?Math.floor(r()*1440):Math.floor(r()*43200);
    out.push({id:"KH"+(10231+i*7),name:`${ho} ${lot} ${ten}`,email:`${plain(ten)}.${plain(ho)}${(r()*90+10)|0}@${doms[r()*doms.length|0]}`,site,plan,joined:NOW-Math.floor(30+r()*400)*864e5,last:NOW-lastMin*6e4,lastMin})}
  return out.sort((a,b)=>a.lastMin-b.lastMin)})();
(()=>{const r=rng("pay");const M=["MoMo","ZaloPay","Chuyển khoản","Thẻ Visa","VNPay"];
  CUSTOMERS.forEach(c=>{c.price=0;if(c.plan==="Free")return;const L=SITE_PLANS[c.site];const pl=c.plan==="Premium"&&L[1]?L[1]:L[0];c.planId=pl.id;c.planName=pl.name;c.price=pl.price;c.once=pl.cycle==="lần"||pl.cycle==="trọn đời";c.method=M[r()*M.length|0];c.paidAt=NOW-Math.floor(r()*34*24+1)*36e5;c.next=c.paidAt+30*864e5;c.months=1+(r()*11|0);
    if(c.once){c.next=null;c.months=1;c.pay="paid";return}
    c.pay=c.next<NOW?"overdue":c.next-NOW<3*864e5?"soon":"paid"})})();
const PAY={paid:["Đã thanh toán","ok"],soon:["Sắp gia hạn","warn"],overdue:["Quá hạn","bad"]};
const ago=m=>m<1?"vừa xong":m<60?m+" phút trước":m<1440?Math.floor(m/60)+" giờ trước":Math.floor(m/1440)+" ngày trước";
const fmtD=t=>{const d=new Date(t);return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`};
const vnd=n=>n.toLocaleString("vi-VN")+"đ";
const planPill=p=>`<span class="pill ${PLANS[p].cls}">${TIER[p]}</span>`;
const planTag=c=>`<span class="pill ${PLANS[c.plan].cls}">${c.plan==="Free"?"Miễn phí":esc(c.planName)}</span>`;

/* ---------- platform quotas + upgrade flow, mock ---------- */
const QUOTAS=[
 {id:"supabase",name:"Supabase",acct:"Tổ chức pfcsqwnkajywyklcumxq",metric:"Dung lượng database",used:412,limit:500,unit:"MB",eta:"khoảng 9 ngày",bill:"https://supabase.com/dashboard/org/pfcsqwnkajywyklcumxq/billing",
  cur:{n:"Free",p:"$0",f:["500 MB database","1 GB lưu file","Tạm dừng nếu 7 ngày không dùng"]},up:{n:"Pro",p:"$25",f:["8 GB database","100 GB lưu file","Không bị tạm dừng","Sao lưu hằng ngày"]},state:"open"},
 {id:"netlify",name:"Netlify",acct:"Team Gza",metric:"Băng thông tháng này",used:81,limit:100,unit:"GB",eta:"khoảng 5 ngày",bill:"https://app.netlify.com/",
  cur:{n:"Free",p:"$0",f:["100 GB băng thông","300 phút build","Web tạm ngưng khi vượt"]},up:{n:"Pro",p:"$19",f:["1 TB băng thông","25.000 phút build","Không ngưng khi vượt"]},state:"open"},
 {id:"vercel",name:"Vercel",acct:"Team Gza",metric:"Băng thông tháng này",used:34,limit:100,unit:"GB",eta:"",bill:"https://vercel.com/account/billing",
  cur:{n:"Hobby",p:"$0",f:["100 GB băng thông","Chỉ dùng cá nhân"]},up:{n:"Pro",p:"$20",f:["1 TB băng thông","Dùng thương mại","Analytics đầy đủ"]},state:"ok"},
];
const pct=q=>Math.round(q.used/q.limit*100);
const openAlerts=()=>QUOTAS.filter(q=>q.state==="open").length;

function siteTraffic(){return SITES.map(s=>{const d=series(s.id,30);return{s,visits:d.reduce((a,b)=>a+b,0),users:CUSTOMERS.filter(c=>c.site===s.id).length,d}}).sort((a,b)=>b.visits-a.visits)}

function renderOverview(){
  const st=siteTraffic();const total=st.reduce((a,x)=>a+x.visits,0);
  const days=30;const sumDay=Array.from({length:days},(_,i)=>st.reduce((a,x)=>a+x.d[i],0));
  const prevTotal=SITES.reduce((a,s)=>a+series(s.id+"p",30).reduce((x,y)=>x+y,0),0);const ch=Math.round((total/prevTotal-1)*100);
  const online=CUSTOMERS.filter(c=>c.lastMin<15).length;const paid=CUSTOMERS.filter(c=>c.plan!=="Free");
  const revenue=paid.reduce((a,c)=>a+c.price,0);
  const W=640,H=200,L=50,R=24,T=12,B=26;const mx=niceMax(Math.max(1,...sumDay));
  const x=i=>L+i*(W-L-R)/(days-1),y=v=>T+(H-T-B)*(1-v/mx);
  const line=sumDay.map((v,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const grid=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${y(mx*f)}" y2="${y(mx*f)}" stroke="rgba(255,214,170,.07)"/><text x="${L-10}" y="${y(mx*f)+3.5}" text-anchor="end">${(mx*f).toLocaleString("vi-VN")}</text>`).join("");
  const xl=[];for(let i=days-1;i>=0;i-=7){const dt=new Date(Date.parse("2026-10-25")-(days-1-i)*864e5);xl.push(`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${dt.getDate()}/${dt.getMonth()+1}</text>`)}
  const top=st.length?st[0].visits:1;
  const pc={Free:0,VIP:0,Premium:0};CUSTOMERS.forEach(c=>pc[c.plan]++);
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Tổng quan</h1><div class="meta muted">Toàn bộ hệ sinh thái Gza · 30 ngày gần nhất · <span class="pill">${LIVE?"Lượt truy cập là số mẫu cho tới khi nối Umami":"Số liệu mẫu"}</span></div></div></div>
    ${QUOTAS.filter(q=>q.state!=="ok").map(q=>q.state==="open"?`<div class="alert"><span class="ai">${ic("bell")}</span>
        <div class="at"><b>${q.name} sắp hết hạn mức gói ${q.cur.n}</b><span>${q.metric} đã dùng ${pct(q)}% (${q.used}/${q.limit} ${q.unit}). Với tốc độ hiện tại, ${q.eta} nữa sẽ hết.</span></div>
        <div class="aa"><button class="btn sm ghost" data-dismiss="${q.id}">Để sau</button><button class="btn sm primary" data-plan="${q.id}">Xem gói</button></div></div>`
      :`<div class="alert done"><span class="ai">${ic("shield")}</span><div class="at"><b>${q.name} đã nâng cấp lên gói ${q.up.n} ✓</b><span>Hạn mức mới đã có hiệu lực. Hub sẽ tiếp tục theo dõi.</span></div></div>`).join("")}
    <div class="ov-kpis">
      <div class="kpi"><div class="k">Lượt truy cập</div><div class="v">${total.toLocaleString("vi-VN")}</div><div class="d ${ch>=0?"up":"down"}">${ch>=0?"▲":"▼"} ${Math.abs(ch)}% so với 30 ngày trước</div></div>
      <div class="kpi"><div class="k">Tài khoản khách hàng</div><div class="v">${CUSTOMERS.length.toLocaleString("vi-VN")}</div><div class="d muted">trên ${SITES.length} web</div></div>
      <div class="kpi"><div class="k">Đang online</div><div class="v"><span class="on-dot"></span>${online}</div><div class="d muted">hoạt động trong 15 phút qua</div></div>
      <button class="kpi link" id="ov-rev"><div class="k">Doanh thu gói kỳ này</div><div class="v">${(revenue/1e6).toLocaleString("vi-VN",{maximumFractionDigits:1})}tr</div><div class="d muted">${paid.length} tài khoản trả phí</div><div class="more">Xem ai đã thanh toán ${ic("arrow","width:14px;height:14px")}</div></button>
    </div>
    <div class="two">
      <div class="panel chart"><h2 style="margin-bottom:14px">Lượt truy cập toàn hệ sinh thái</h2>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lượt truy cập 30 ngày">
          <defs><linearGradient id="oa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="ol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffc24a"/></linearGradient></defs>
          ${grid}${xl.join("")}
          <path d="${line}L${x(days-1)},${y(0)}L${x(0)},${y(0)}Z" fill="url(#oa)"/>
          <path d="${line}" fill="none" stroke="url(#ol)" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="${x(days-1)}" cy="${y(sumDay[days-1])}" r="4.5" fill="#ffc24a" stroke="#16120f" stroke-width="2"/>
        </svg></div>
      <div class="panel"><h2 style="margin-bottom:16px">Khách đang dùng gói gì</h2>
        <div class="planbars">${Object.entries(pc).map(([k,v])=>`<div class="pb"><span>${planPill(k)}</span><span class="meter"><i class="${k==="Free"?"":"w"}" style="width:${v/(CUSTOMERS.length||1)*100}%"></i></span><span>${v} · ${Math.round(v/(CUSTOMERS.length||1)*100)}%</span></div>`).join("")}</div>
        <div class="divider" style="margin:18px 0"></div>
        <div class="muted" style="font-size:13px">Mỗi web đặt giá gói riêng trong tab <b style="color:var(--fg)">Gói dịch vụ</b>.</div>
      </div>
    </div>
    <div class="two">
      <div class="panel"><div class="h2row"><h2>Web được dùng nhiều nhất</h2><span class="muted" style="font-size:12.5px">bấm để xem khách</span></div>
        <div class="rank">${st.map((r,i)=>`<button data-rank="${r.s.id}"><span class="logo" style="background:${grad(r.s)}">${ini(r.s.name)}</span><span class="nm">${i+1}. ${esc(r.s.name)}</span><span class="num">${r.visits.toLocaleString("vi-VN")}</span>
          <span class="sub2"><span class="b"><i style="width:${r.visits/top*100}%"></i></span><span>${r.users} tài khoản</span></span></button>`).join("")}</div></div>
      <div class="panel"><h2 style="margin-bottom:16px">Hạn mức nền tảng</h2>
        <div class="quota">${QUOTAS.length?"":`<div class="muted" style="font-size:13px">Chưa nối API đọc hạn mức của Supabase / Netlify / Vercel. Phần này sẽ có số thật ở bước sau.</div>`}${QUOTAS.map(q=>`<div class="q"><div class="qh"><span><b>${q.name}</b> · ${q.state==="up"?q.up.n:q.cur.n}</span><span>${q.state==="up"?"đã nâng cấp":`${q.used}/${q.limit} ${q.unit}`}</span></div>
          <span class="meter"><i class="${q.state==="open"?"w":""}" style="width:${q.state==="up"?Math.round(q.used/(q.limit*10)*100):pct(q)}%"></i></span><span class="muted" style="font-size:12px">${q.metric}</span></div>`).join("")}</div></div>
    </div>
    <div class="panel"><div class="h2row"><h2>Khách vừa hoạt động</h2><button class="btn sm" id="ov-all">Xem tất cả khách hàng</button></div>${custTable(CUSTOMERS.slice(0,6))}</div>
  </div>`;
  $("#main").querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>openPlan(QUOTAS.find(q=>q.id===b.dataset.plan)));
  $("#main").querySelectorAll("[data-dismiss]").forEach(b=>b.onclick=()=>{QUOTAS.find(q=>q.id===b.dataset.dismiss).state="later";renderAdmin();toast("Đã ẩn. Hub sẽ nhắc lại khi dùng tới 90%.")});
  $("#main").querySelectorAll("[data-rank]").forEach(b=>b.onclick=()=>{state.cf={q:"",site:b.dataset.rank,plan:"",pg:0};state.page="customers";renderAdmin()});
  $("#ov-rev").onclick=()=>{state.rf={site:"",pay:"",plan:""};state.page="revenue";renderAdmin()};
  $("#ov-all").onclick=()=>{state.cf={q:"",site:"",plan:"",pg:0};state.page="customers";renderAdmin()};
}

function openPlan(q){
  const m=$("#modal");
  m.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pm-t">
    <div><span class="pill hot">${q.name} · ${q.acct}</span><h2 id="pm-t" style="margin-top:10px">Nâng cấp ${q.name}?</h2>
      <p class="muted" style="margin:6px 0 0">${q.metric} đang ở mức ${pct(q)}% (${q.used}/${q.limit} ${q.unit}). Nếu hết, ${q.id==="supabase"?"database sẽ chuyển sang chỉ đọc":"các web trên "+q.name+" có thể bị tạm ngưng"}.</p></div>
    <div class="meter"><i class="w" style="width:${pct(q)}%"></i></div>
    <div class="plans">
      <div class="plan"><div class="pn"><span>${q.cur.n}</span><span class="pill">Đang dùng</span></div><div class="pp">${q.cur.p}<small> /tháng</small></div><ul>${q.cur.f.map(f=>`<li>${f}</li>`).join("")}</ul></div>
      <div class="plan rec"><div class="pn"><span>${q.up.n}</span><span class="pill hot">Đề xuất</span></div><div class="pp">${q.up.p}<small> /tháng</small></div><ul>${q.up.f.map(f=>`<li>${f}</li>`).join("")}</ul></div>
    </div>
    <div class="note" id="pm-note">${ic("shield")}<span>Bấm thanh toán sẽ mở thẳng trang Billing của ${q.name}. Bạn chọn gói ${q.up.n} và xác nhận thẻ ở đó, hub không giữ thông tin thẻ. Giá là giá tham khảo, xem giá chính xác trên trang ${q.name}.</span></div>
    <div class="modal-foot" id="pm-foot"><button class="btn ghost" id="pm-no">Không, để sau</button><a class="btn primary" id="pm-yes" href="${q.bill}" target="_blank" rel="noopener">Thanh toán trên ${q.name} ${ic("ext","width:15px;height:15px")}</a></div>
  </div>`;
  m.hidden=false;
  const close=()=>{m.hidden=true;m.innerHTML=""};
  m.onclick=e=>{if(e.target===m)close()};
  document.addEventListener("keydown",function k(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",k)}});
  $("#pm-no").onclick=()=>{close();q.state="later";renderAdmin();toast("Đã ẩn. Hub sẽ nhắc lại khi dùng tới 90%.")};
  $("#pm-yes").addEventListener("click",()=>{setTimeout(()=>{
    $("#pm-note").innerHTML=`${ic("ext","color:var(--amber)")}<span>Đã mở trang thanh toán ${q.name} ở tab mới. Thanh toán xong thì quay lại đây bấm nút bên dưới, hub sẽ kiểm tra lại gói.</span>`;
    $("#pm-foot").innerHTML=`<button class="btn ghost" id="pm-close">Đóng</button><button class="btn primary" id="pm-done">Tôi đã thanh toán xong</button>`;
    $("#pm-close").onclick=close;
    $("#pm-done").onclick=()=>{const b=$("#pm-done");b.disabled=true;b.innerHTML='<span class="spin"></span>Đang kiểm tra với '+q.name+'…';setTimeout(()=>{q.state="up";close();renderAdmin();toast(q.name+" đã lên gói "+q.up.n+" ✓")},1200)};
  },50)});
  $("#pm-no").focus();
}

function custTable(rows){
  if(!rows.length)return `<div class="muted" style="text-align:center;padding:28px 0">${CUSTOMERS.length?"Không có khách hàng nào khớp bộ lọc.":"Chưa có khách hàng. Danh sách sẽ tự đổ về khi các web gửi dữ liệu cho hub."}</div>`;
  return `<div class="tbl-wrap" style="box-shadow:none"><table><thead><tr><th>ID</th><th>Khách hàng</th><th>Web</th><th>Gói</th><th>Ngày đăng ký</th><th>Hoạt động</th></tr></thead><tbody>
    ${rows.map(c=>{const s=SITES.find(x=>x.id===c.site);return `<tr><td class="mono muted">${c.id}</td>
      <td><span class="who"><span class="avatar">${c.name.split(" ").pop()[0]}</span><span><div style="font-weight:600">${esc(c.name)}</div><div class="muted mono" style="font-size:11.5px">${esc(c.email)}</div></span></span></td>
      <td><span class="who"><span class="logo" style="width:22px;height:22px;font-size:10px;border-radius:6px;background:${grad(s)}">${ini(s.name)}</span>${esc(s.name)}</span></td>
      <td>${planTag(c)}</td><td>${fmtD(c.joined)}</td>
      <td>${c.lastMin<15?`<span class="on-dot"></span><span style="color:var(--ok)">Đang online</span>`:`<span class="muted">${ago(c.lastMin)}</span>`}</td></tr>`}).join("")}
  </tbody></table></div>`;
}

function renderCustomers(){
  const f=state.cf;const PER=15;
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Khách hàng</h1><div class="meta muted" id="cu-sum"></div></div></div>
    <div class="filters-row">
      <input id="cu-q" class="input" type="search" placeholder="Tìm theo tên, email hoặc ID…" value="${esc(f.q)}">
      <select id="cu-site" class="input"><option value="">Tất cả web</option>${SITES.map(s=>`<option value="${s.id}" ${f.site===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select>
      <select id="cu-plan" class="input"><option value="">Tất cả gói</option>${Object.keys(PLANS).map(p=>`<option value="${p}" ${f.plan===p?"selected":""}>${TIER[p]}</option>`).join("")}</select>
    </div>
    <div id="cu-body"></div>
  </div>`;
  const draw=()=>{const q=f.q.trim().toLowerCase();
    const list=CUSTOMERS.filter(c=>(!f.site||c.site===f.site)&&(!f.plan||c.plan===f.plan)&&(!q||(c.name+" "+c.email+" "+c.id).toLowerCase().includes(q)));
    const pages=Math.max(1,Math.ceil(list.length/PER));f.pg=Math.min(f.pg,pages-1);
    const on=list.filter(c=>c.lastMin<15).length,paid=list.filter(c=>c.plan!=="Free").length;
    $("#cu-sum").innerHTML=`<span class="pill">${list.length} tài khoản</span><span class="pill ok"><span class="dot"></span>${on} đang online</span><span class="pill vip">${paid} trả phí</span>`;
    $("#cu-body").innerHTML=custTable(list.slice(f.pg*PER,f.pg*PER+PER))+`<div class="pager" style="margin-top:12px"><span>Trang ${f.pg+1}/${pages}</span><span style="display:flex;gap:8px"><button class="btn sm" id="cu-prev" ${f.pg===0?"disabled":""}>Trước</button><button class="btn sm" id="cu-next" ${f.pg>=pages-1?"disabled":""}>Sau</button></span></div>`;
    $("#cu-prev").onclick=()=>{f.pg--;draw()};$("#cu-next").onclick=()=>{f.pg++;draw()};};
  $("#cu-q").addEventListener("input",e=>{f.q=e.target.value;f.pg=0;draw()});
  $("#cu-site").onchange=e=>{f.site=e.target.value;f.pg=0;draw()};
  $("#cu-plan").onchange=e=>{f.plan=e.target.value;f.pg=0;draw()};
  draw();
}

function renderRevenue(){
  const f=state.rf;const payers=CUSTOMERS.filter(c=>c.plan!=="Free");
  const total=payers.reduce((a,c)=>a+c.price,0);
  const collected=payers.filter(c=>c.pay!=="overdue").reduce((a,c)=>a+c.price,0);
  const cnt=k=>payers.filter(c=>c.pay===k).length;
  const bySite=SITES.map(s=>({s,v:payers.filter(c=>c.site===s.id).reduce((a,c)=>a+c.price,0),n:payers.filter(c=>c.site===s.id).length})).filter(x=>x.n).sort((a,b)=>b.v-a.v);
  const top=bySite[0]?bySite[0].v:1;
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Doanh thu</h1><div class="meta muted">Tài khoản đang trả phí trên toàn hệ sinh thái${LIVE?"":` · <span class="pill">Số liệu mẫu</span>`}</div></div></div>
    <div class="ov-kpis">
      <div class="kpi"><div class="k">Doanh thu gói kỳ này</div><div class="v">${vnd(total)}</div><div class="d muted">${payers.length} tài khoản trả phí</div></div>
      <div class="kpi"><div class="k">Đã thu kỳ này</div><div class="v">${vnd(collected)}</div><div class="d up">${Math.round(collected/(total||1)*100)}% tổng doanh thu</div></div>
      <div class="kpi"><div class="k">Sắp gia hạn (3 ngày)</div><div class="v" style="color:var(--warn)">${cnt("soon")}</div><div class="d muted">sẽ tự nhắc khách</div></div>
      <div class="kpi"><div class="k">Quá hạn chưa trả</div><div class="v" style="color:var(--bad)">${cnt("overdue")}</div><div class="d muted">${vnd(total-collected)} chưa thu</div></div>
    </div>
    <div class="two">
      <div class="panel"><h2 style="margin-bottom:14px">Doanh thu theo web</h2><div class="rank">${bySite.map(x=>`<button data-rs="${x.s.id}"><span class="logo" style="background:${grad(x.s)}">${ini(x.s.name)}</span><span class="nm">${esc(x.s.name)}</span><span class="num">${vnd(x.v)}</span><span class="sub2"><span class="b"><i style="width:${x.v/top*100}%"></i></span><span>${x.n} tài khoản</span></span></button>`).join("")}</div></div>
      <div class="panel"><h2 style="margin-bottom:16px">Theo gói</h2><div class="planbars">${["VIP","Premium"].map(k=>{const n=payers.filter(c=>c.plan===k).length;const v=payers.filter(c=>c.plan===k).reduce((a,c)=>a+c.price,0);return `<div class="pb"><span>${planPill(k)}</span><span class="meter"><i class="w" style="width:${v/(total||1)*100}%"></i></span><span>${n} TK</span></div><div class="muted" style="font-size:12.5px;margin:-6px 0 4px 102px">tổng <b style="color:var(--fg)">${vnd(v)}</b>/tháng</div>`}).join("")}</div></div>
    </div>
    <div class="filters-row">
      <select id="rf-site" class="input"><option value="">Tất cả web</option>${SITES.map(s=>`<option value="${s.id}" ${f.site===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select>
      <select id="rf-plan" class="input"><option value="">Mọi gói trả phí</option>${["VIP","Premium"].map(p=>`<option value="${p}" ${f.plan===p?"selected":""}>${TIER[p]}</option>`).join("")}</select>
      <select id="rf-pay" class="input"><option value="">Mọi trạng thái</option>${Object.entries(PAY).map(([k,v])=>`<option value="${k}" ${f.pay===k?"selected":""}>${v[0]}</option>`).join("")}</select>
    </div>
    <div id="rv-body"></div>
  </div>`;
  const draw=()=>{const list=payers.filter(c=>(!f.site||c.site===f.site)&&(!f.plan||c.plan===f.plan)&&(!f.pay||c.pay===f.pay)).sort((a,b)=>b.paidAt-a.paidAt);
    const sum=list.reduce((a,c)=>a+c.price,0);
    $("#rv-body").innerHTML=!list.length?`<div class="panel muted" style="text-align:center">Không có tài khoản nào khớp bộ lọc.</div>`:`<div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Khách hàng</th><th>Web</th><th>Gói</th><th>Số tiền</th><th>Thanh toán gần nhất</th><th>Phương thức</th><th>Gia hạn tiếp</th><th>Trạng thái</th></tr></thead><tbody>
      ${list.map(c=>{const s=SITES.find(x=>x.id===c.site);return `<tr><td class="mono muted">${c.id}</td>
        <td><span class="who"><span class="avatar">${c.name.split(" ").pop()[0]}</span><span><div style="font-weight:600">${esc(c.name)}</div><div class="muted mono" style="font-size:11.5px">${esc(c.email)}</div></span></span></td>
        <td><span class="who"><span class="logo" style="width:22px;height:22px;font-size:10px;border-radius:6px;background:${grad(s)}">${ini(s.name)}</span>${esc(s.name)}</span></td>
        <td>${planTag(c)}</td><td style="font-weight:600">${vnd(c.price)}</td>
        <td>${fmtT(c.paidAt)}<div class="muted" style="font-size:11.5px">${c.once?"trả một lần":"đã trả "+c.months+" kỳ"}</div></td><td>${c.method}</td><td>${c.next?fmtD(c.next):`<span class="muted">Không gia hạn</span>`}</td>
        <td><span class="pill ${PAY[c.pay][1]}"><span class="dot"></span>${PAY[c.pay][0]}</span></td></tr>`}).join("")}
      </tbody></table></div><div class="pager" style="margin-top:12px"><span>${list.length} tài khoản · tổng ${vnd(sum)}/tháng</span></div>`};
  $("#rf-site").onchange=e=>{f.site=e.target.value;draw()};$("#rf-plan").onchange=e=>{f.plan=e.target.value;draw()};$("#rf-pay").onchange=e=>{f.pay=e.target.value;draw()};
  $("#main").querySelectorAll("[data-rs]").forEach(b=>b.onclick=()=>{f.site=b.dataset.rs;$("#rf-site").value=f.site;draw();$("#rv-body").scrollIntoView({behavior:"smooth",block:"start"})});
  draw();
}

/* ---------- central payment accounts (declared once, used by every site) ---------- */
const PAYACC=[
 {id:"bank",name:"Chuyển khoản ngân hàng",sub:"Mã QR VietQR, khách quét bằng app ngân hàng",c:["#34d399","#065f46"],on:true,connected:true,fee:"Miễn phí",
  fields:[{k:"Ngân hàng",v:"Vietcombank",opts:["Vietcombank","Techcombank","MB Bank","ACB","BIDV","VPBank"]},{k:"Số tài khoản",v:"1023 456 789"},{k:"Tên chủ tài khoản",v:"CONG TY GZA"},{k:"Nội dung chuyển khoản",v:"GZA {mã đơn}"}]},
 {id:"momo",name:"Ví MoMo",sub:"Thanh toán bằng app MoMo",c:["#d82d8b","#7a0f4c"],on:true,connected:true,fee:"≈ 2%/giao dịch",
  fields:[{k:"Partner code",v:"MOMOGZA2026"},{k:"Access key",secret:true},{k:"Secret key",secret:true}]},
 {id:"vnpay",name:"VNPay",sub:"Thẻ ATM nội địa, Visa, QR VNPay",c:["#2563eb","#1e3a8a"],on:true,connected:true,fee:"≈ 1,1%/giao dịch",
  fields:[{k:"Mã website (TMN code)",v:"GZA00001"},{k:"Hash secret",secret:true}]},
 {id:"zalopay",name:"ZaloPay",sub:"Thanh toán bằng app ZaloPay",c:["#0ea5e9","#075985"],on:false,connected:false,fee:"≈ 1,5%/giao dịch",
  fields:[{k:"App ID",v:""},{k:"Key 1",v:"",secret:true,empty:true},{k:"Key 2",v:"",secret:true,empty:true}]},
];
const activePay=()=>PAYACC.filter(a=>a.on&&a.connected);
function qrSvg(){const r=rng("qr");let h="";for(let y=0;y<21;y++)for(let x=0;x<21;x++){const fin=(a,b)=>x>=a&&x<a+7&&y>=b&&y<b+7;let on;
  const f=[[0,0],[14,0],[0,14]].find(([a,b])=>fin(a,b));if(f){const dx=x-f[0],dy=y-f[1];on=dx===0||dx===6||dy===0||dy===6||(dx>=2&&dx<=4&&dy>=2&&dy<=4)}else on=r()<.48;
  h+=`<i class="${on?"":"o"}"></i>`}return `<div class="qr" aria-label="Mã QR mẫu">${h}</div>`}
function secretEdit(box,owner,key,ph,done){
  if(!LIVE){toast("Bản mẫu: khoá mới sẽ ghi đè khoá cũ");return}
  box.innerHTML=`<input class="input mono" type="password" placeholder="${esc(ph)}" autocomplete="off"><button class="btn sm primary">Lưu khoá</button><button class="btn sm ghost">Huỷ</button>`;
  const [inp,ok,no]=box.children;inp.focus();no.onclick=()=>done&&done(true);
  ok.onclick=async()=>{const v=inp.value.trim();if(v.length<4){toast("Khoá quá ngắn");return}ok.disabled=true;
    const r=await persist(()=>q(sb.rpc("set_secret",{p_owner:owner,p_key:key,p_value:v})));ok.disabled=false;
    if(r){inp.value="";toast("Đã lưu khoá. Từ giờ không ai xem lại được, chỉ thay được.");done&&done()}};
}
function copyText(t){try{navigator.clipboard.writeText(t).then(()=>toast("Đã sao chép"),()=>toast(t))}catch(e){toast(t)}}

function renderPayAcc(){
  const act=activePay();
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Tài khoản nhận tiền</h1><div class="meta muted">Khai báo một lần ở đây, cả ${SITES.length} web dùng chung.</div></div></div>
    <div class="note">${ic("shield")}<span>Tiền khách trả đi thẳng vào tài khoản của bạn, hub không giữ tiền. Khoá bí mật được mã hoá trong database và không bao giờ hiện lại trên trình duyệt. Đang nhận tiền qua <b>${act.length} phương thức</b>: ${act.map(a=>a.name).join(", ")||"chưa có"}.</span></div>
    <div class="acc-grid">${PAYACC.map((a,i)=>`<div class="panel acc ${a.on?"":"off"}">
      <div class="acc-h"><span class="logo" style="background:linear-gradient(140deg,${a.c[0]},${a.c[1]})">${a.name[0]}</span>
        <div class="t"><b>${a.name}</b><span>${a.sub} · phí ${a.fee}</span></div>
        ${a.connected?`<span class="pill ok"><span class="dot"></span>Đã kết nối</span>`:`<span class="pill">Chưa kết nối</span>`}
        <button class="switch" role="switch" aria-checked="${a.on}" aria-label="Bật nhận tiền qua ${a.name}" data-sw="${i}" ${a.connected?"":"disabled"}></button></div>
      ${a.id==="bank"?`<div class="qr-row">${qrSvg()}<div class="muted" style="font-size:12.5px;flex:1 1 160px">Khi khách mua gói ở bất kỳ web nào, hub tạo mã QR có sẵn số tiền và mã đơn. Ngân hàng báo về là hub tự mở gói cho khách.</div></div>`:""}
      <div class="form-grid">${a.fields.map((f,j)=>f.opts?`<label class="field"><span>${f.k}</span><select class="input" id="pa-${a.id}-${j}">${f.opts.map(o=>`<option ${o===f.v?"selected":""}>${o}</option>`).join("")}</select></label>`
        :f.secret&&!f.empty?`<div class="field"><span>${f.k}</span><div class="secret" id="sb-${a.id}-${j}"><input id="pa-${a.id}-${j}" class="input mono" value="••••••••••••  đã lưu" disabled><button class="btn sm" data-rot="${i}:${j}">Thay</button></div></div>`
        :`<label class="field"><span>${f.k}</span><input id="pa-${a.id}-${j}" class="input${f.secret?" mono":""}" ${f.secret?'type="password"':""} value="${esc(f.v)}" placeholder="${f.secret?"Dán khoá từ trang merchant":"Nhập "+f.k.toLowerCase()}"></label>`).join("")}</div>
      ${a.id!=="bank"&&!LIVE?`<div class="hook"><span class="muted">Webhook</span><code>https://gza.vn/api/pay/${a.id}/webhook</code><button class="btn sm ghost" data-copy="https://gza.vn/api/pay/${a.id}/webhook" aria-label="Sao chép">${ic("copy","width:14px;height:14px")}</button></div>`:""}
      <div class="deploy-bar"><span class="muted" style="font-size:12px">${a.connected?"Dùng cho: tất cả web":"Dán khoá rồi bấm Kết nối"}</span>
        <span style="display:flex;gap:8px">${a.connected?`<button class="btn sm" data-test="${i}">Kiểm tra kết nối</button><button class="btn sm primary" data-save="${i}">Lưu</button>`:`<button class="btn sm primary" data-conn="${i}">Kết nối ${a.name}</button>`}</span></div>
    </div>`).join("")}</div>
  </div>`;
  const M=$("#main");
  M.querySelectorAll("[data-sw]").forEach(b=>b.onclick=async()=>{const a=PAYACC[+b.dataset.sw];
    if(!await persist(()=>q(sb.from("pay_accounts").update({enabled:!a.on}).eq("id",a.id))))return;a.on=!a.on;renderPayAcc();toast(a.on?`Đã bật ${a.name} cho tất cả web`:`Đã tắt ${a.name}. Khách sẽ không thấy phương thức này nữa`)});
  M.querySelectorAll("[data-rot]").forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.rot.split(":").map(Number);const a=PAYACC[i],f=a.fields[j];
    secretEdit($(`#sb-${a.id}-${j}`),"pay:"+a.id,f.k,"Dán "+f.k+" mới",()=>renderPayAcc())});
  M.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyText(b.dataset.copy));
  const pubOf=a=>{const o={};a.fields.forEach((f,j)=>{if(!f.secret){const el=$(`#pa-${a.id}-${j}`);o[f.k]=el?el.value.trim():f.v}});return o};
  M.querySelectorAll("[data-save]").forEach(b=>b.onclick=async()=>{const a=PAYACC[+b.dataset.save];const pf=pubOf(a);
    if(!await persist(()=>q(sb.from("pay_accounts").update({public_fields:pf}).eq("id",a.id))))return;
    a.fields.forEach((f,j)=>{const el=$(`#pa-${a.id}-${j}`);if(el&&!el.disabled&&!f.secret)f.v=el.value});toast("Đã lưu "+a.name+". Cả "+SITES.length+" web dùng thông tin mới ngay.")});
  const spin=(b,ms,done)=>{const t=b.innerHTML;b.disabled=true;b.innerHTML='<span class="spin"></span>Đang kiểm tra…';setTimeout(()=>{b.disabled=false;b.innerHTML=t;done()},ms)};
  M.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>LIVE?toast("Kiểm tra kết nối thật cần hàm thanh toán ở backend, sẽ có ở bước sau."):spin(b,900,()=>toast("Kết nối "+PAYACC[+b.dataset.test].name+" hoạt động bình thường ✓")));
  M.querySelectorAll("[data-conn]").forEach(b=>b.onclick=async()=>{const a=PAYACC[+b.dataset.conn];
    const miss=a.fields.find((f,j)=>!$(`#pa-${a.id}-${j}`).value.trim());if(miss){toast("Điền "+miss.k+" trước khi kết nối");return}
    if(LIVE){b.disabled=true;b.innerHTML='<span class="spin"></span>Đang lưu…';
      const ok=await persist(async()=>{for(const [j,f] of a.fields.entries()){if(f.secret&&f.empty)await q(sb.rpc("set_secret",{p_owner:"pay:"+a.id,p_key:f.k,p_value:$(`#pa-${a.id}-${j}`).value.trim()}))}
        await q(sb.from("pay_accounts").update({public_fields:pubOf(a),connected:true,enabled:true}).eq("id",a.id))});
      if(!ok){b.disabled=false;b.textContent="Kết nối "+a.name;return}
      a.fields.forEach((f,j)=>{if(f.secret)f.empty=false;else f.v=$(`#pa-${a.id}-${j}`).value.trim()});a.connected=true;a.on=true;renderPayAcc();toast("Đã lưu "+a.name+". Tất cả web có thêm phương thức này");return}
    spin(b,1100,()=>{a.fields.forEach(f=>{if(f.secret)f.empty=false;else f.v=$(`#pa-${a.id}-${a.fields.indexOf(f)}`).value});a.connected=true;a.on=true;renderPayAcc();toast("Đã kết nối "+a.name+". Tất cả web có thêm phương thức này")})});
}

/* ---------- per-site service plans ---------- */
function tabPlans(s){
  const L=SITE_PLANS[s.id]||(SITE_PLANS[s.id]=[]);const act=activePay();
  const users=pl=>CUSTOMERS.filter(c=>c.site===s.id&&c.planId===pl.id).length;
  $("#tabbody").innerHTML=`<div class="stack fade">
    <div class="note" style="align-items:center">${ic("card","color:var(--amber)")}<span>Khách mua gói ở ${esc(s.name)} sẽ trả qua: ${act.map(a=>`<b>${a.name}</b>`).join(", ")||"<b>chưa có phương thức nào</b>"}. Tiền về tài khoản chung của hub.</span><button class="btn sm" id="pl-acc">Sửa tài khoản nhận tiền</button></div>
    <div class="plan-grid">
      ${L.map((pl,i)=>`<div class="panel pcard ${pl.on?"":"off"}">
        <div class="ph"><b>${esc(pl.name)}</b><button class="switch" role="switch" aria-checked="${pl.on}" aria-label="Bật gói ${esc(pl.name)}" data-psw="${i}"></button></div>
        <div class="pp">${vnd(pl.price)}<small> /${pl.cycle}</small></div>
        <ul>${pl.perks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        <div class="pf"><span class="muted" style="font-size:12.5px">${users(pl)} khách đang dùng${pl.on?"":" · đang ẩn"}</span><span style="display:flex;gap:6px"><button class="btn sm" data-pe="${i}">Sửa</button><button class="btn sm ghost" data-pd="${i}">Xoá</button></span></div>
      </div>`).join("")}
      <button class="panel pcard add" id="pl-add">${ic("plus","width:28px;height:28px")}<span style="font-weight:600">Thêm gói mới</span></button>
    </div>
    <div id="pl-form"></div>
  </div>`;
  $("#pl-acc").onclick=()=>{state.page="payacc";renderAdmin()};
  $("#pl-add").onclick=()=>planForm(s);
  $("#tabbody").querySelectorAll("[data-pe]").forEach(b=>b.onclick=()=>planForm(s,+b.dataset.pe));
  $("#tabbody").querySelectorAll("[data-psw]").forEach(b=>b.onclick=async()=>{const pl=L[+b.dataset.psw];
    if(!await persist(()=>q(sb.from("site_plans").update({active:!pl.on}).eq("id",pl.id))))return;pl.on=!pl.on;tabPlans(s);toast(pl.on?`Đã mở bán gói ${pl.name}`:`Đã ẩn gói ${pl.name}. Khách đang dùng vẫn giữ quyền lợi đến hết kỳ`)});
  $("#tabbody").querySelectorAll("[data-pd]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.pd,pl=L[i],n=users(pl);
    if(n){toast(`Còn ${n} khách đang dùng ${pl.name}. Hãy tắt gói thay vì xoá`);return}
    if(b.dataset.sure){if(!await persist(()=>q(sb.from("site_plans").delete().eq("id",pl.id))))return;L.splice(i,1);tabPlans(s);toast("Đã xoá gói "+pl.name);return}
    b.dataset.sure="1";b.textContent="Bấm lần nữa để xoá";b.style.color="var(--bad)";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="Xoá";b.style.color=""}},3000)});
}
function planForm(s,idx){
  const L=SITE_PLANS[s.id];const pl=idx!=null?L[idx]:{name:"",price:"",cycle:"tháng",perks:[],on:true};
  $("#pl-form").innerHTML=`<div class="panel stack fade">
    <h2>${idx!=null?"Sửa gói "+esc(pl.name):"Thêm gói cho "+esc(s.name)}</h2>
    <div class="form-grid">
      <label class="field"><span>Tên gói</span><input id="pf-name" class="input" value="${esc(pl.name)}" placeholder="Ví dụ: VIP"></label>
      <label class="field"><span>Giá (đồng)</span><input id="pf-price" class="input" inputmode="numeric" value="${pl.price}" placeholder="49000"></label>
      <label class="field"><span>Chu kỳ</span><select id="pf-cycle" class="input">${["tháng","năm","lần","trọn đời"].map(c=>`<option value="${c}" ${pl.cycle===c?"selected":""}>${c==="lần"?"Trả một lần":c==="trọn đời"?"Trọn đời":"Mỗi "+c}</option>`).join("")}</select></label>
      <label class="field full"><span>Quyền lợi</span><textarea id="pf-perks" class="input" placeholder="Mỗi dòng một quyền lợi">${esc(pl.perks.join("\n"))}</textarea><small>Mỗi dòng một quyền lợi, hiện trên trang mua gói của web.</small></label>
    </div>
    <div class="form-foot"><button class="btn ghost" id="pf-cancel">Huỷ</button><button class="btn primary" id="pf-save">${idx!=null?"Lưu gói":"Thêm gói"}</button></div></div>`;
  $("#pf-cancel").onclick=()=>$("#pl-form").innerHTML="";
  $("#pf-save").onclick=async()=>{const name=$("#pf-name").value.trim(),price=parseInt($("#pf-price").value.replace(/\D/g,""),10);
    if(!name){toast("Nhập tên gói");return}if(!(price>0)){toast("Giá phải là số lớn hơn 0, ví dụ 49000");return}
    const rec={...pl,name,price,cycle:$("#pf-cycle").value,perks:$("#pf-perks").value.split("\n").map(x=>x.trim()).filter(Boolean)};
    const row={site_id:s.id,name:rec.name,price:rec.price,cycle:rec.cycle,perks:rec.perks,active:rec.on};
    if(LIVE){const b=$("#pf-save");b.disabled=true;let saved=null;
      const ok=await persist(async()=>{saved=idx!=null?await q(sb.from("site_plans").update(row).eq("id",rec.id).select().single()):await q(sb.from("site_plans").insert({...row,sort:L.length}).select().single())});
      b.disabled=false;if(!ok)return;rec.id=saved.id}
    if(idx!=null){L[idx]=rec;CUSTOMERS.forEach(c=>{if(c.site===s.id&&c.planId===rec.id){c.planName=rec.name;c.price=rec.price}})}else{if(!LIVE)rec.id="p"+Date.now().toString(36);L.push(rec)}
    tabPlans(s);toast((idx!=null?"Đã lưu gói ":"Đã thêm gói ")+name+" cho "+s.name)};
  $("#pf-name").focus();$("#pl-form").scrollIntoView({behavior:"smooth",block:"nearest"});
}

function renderUsers(){
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Người dùng & quyền</h1><div class="meta muted">${LIVE?"Super admin vào được admin. Editor/Viewer: tạo tài khoản trong Supabase → Authentication trước, rồi gán quyền ở đây.":"Hiện chỉ tài khoản Sếp đăng nhập được. Editor và Viewer chuẩn bị sẵn, bật khi cần giao việc."}</div></div>
      <div class="actions"><button class="btn primary" id="adduser">${ic("plus","width:16px;height:16px")}Thêm người</button></div></div>
    <div id="addform"></div>
    <div class="tbl-wrap"><table><thead><tr><th>Người dùng</th><th>Quyền</th><th>Web được quản lý</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${USERS.map((u,i)=>`<tr><td><span class="who"><span class="avatar">${u.name[0].toUpperCase()}</span><span><div style="font-weight:600">${esc(u.name)}</div><div class="muted mono" style="font-size:11.5px">${esc(u.email)}</div></span></span></td>
        <td>${u.role==="super_admin"?`<span class="pill hot">Super admin</span>`:`<span class="pill ${u.role==="editor"?"ok":""}">${ROLE_LABEL[u.role]}</span>`}</td>
        <td>${u.sites==="all"?`<span class="muted">Tất cả web</span>`:`<div class="chips">${u.sites.map(id=>`<span class="pill">${esc((SITES.find(s=>s.id===id)||{name:id}).name)}</span>`).join("")}</div>`}</td>
        <td class="muted">${u.last}</td>
        <td>${u.role!=="super_admin"?`<button class="btn sm" data-edit="${i}">Sửa</button>`:""}</td></tr>`).join("")}</tbody></table></div>
    <div class="role-desc">
      <div class="panel"><span class="pill hot">Super admin</span><ul><li>Thấy và sửa mọi web</li><li>Thêm, xoá web</li><li>Quản lý người dùng</li></ul></div>
      <div class="panel"><span class="pill ok">Editor</span><ul><li>Chỉ thấy web được gán</li><li>Sửa thông tin, deploy, rollback</li><li>Không vào trang này</li></ul></div>
      <div class="panel"><span class="pill">Viewer</span><ul><li>Chỉ thấy web được gán</li><li>Xem lịch sử và traffic</li><li>Không sửa, không deploy</li></ul></div>
    </div></div>`;
  $("#adduser").onclick=()=>userForm();
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>userForm(+b.dataset.edit));
}
function userForm(idx){
  const u=idx!=null?USERS[idx]:{name:"",email:"",role:"editor",sites:[],last:"Chưa được mở quyền đăng nhập"};const pk=new Set(u.sites==="all"?[]:u.sites);
  $("#addform").innerHTML=`<div class="panel stack fade">
    <h2>${idx!=null?"Sửa quyền của "+esc(u.name):"Thêm người mới"}</h2>
    <div class="form-grid">
      <label class="field"><span>Tên</span><input id="u-name" class="input" value="${esc(u.name)}" placeholder="Ví dụ: Lan"></label>
      <label class="field"><span>Email</span><input id="u-email" class="input" value="${esc(u.email)}" placeholder="lan@gza.vn"></label>
      <label class="field"><span>Quyền</span><select id="u-role" class="input"><option value="editor" ${u.role==="editor"?"selected":""}>Editor: sửa và deploy</option><option value="viewer" ${u.role==="viewer"?"selected":""}>Viewer: chỉ xem</option></select></label>
      <div class="field full"><span>Được quản lý web nào</span><div class="chips" id="u-sites">${SITES.map(s=>`<button class="chip sel" data-id="${s.id}" aria-pressed="${pk.has(s.id)}">${esc(s.name)}</button>`).join("")}</div></div>
    </div>
    <div class="form-foot"><button class="btn ghost" id="u-cancel">Huỷ</button><button class="btn primary" id="u-save">Lưu</button></div></div>`;
  $("#u-sites").querySelectorAll(".chip").forEach(c=>c.onclick=()=>{const on=c.getAttribute("aria-pressed")!=="true";c.setAttribute("aria-pressed",on);on?pk.add(c.dataset.id):pk.delete(c.dataset.id)});
  $("#u-cancel").onclick=()=>$("#addform").innerHTML="";
  $("#u-save").onclick=async()=>{const name=$("#u-name").value.trim()||$("#u-email").value.trim().split("@")[0],email=$("#u-email").value.trim();
    if(!name||!email){toast("Nhập tên và email trước khi lưu");return}
    if(!await persist(()=>q(sb.rpc("grant_role",{p_email:email,p_role:$("#u-role").value,p_sites:[...pk]}))))return;
    const rec={name,email,role:$("#u-role").value,sites:[...pk],last:u.last};
    if(idx!=null)USERS[idx]=rec;else USERS.push(rec);renderUsers();toast("Đã lưu "+name)};
  $("#u-name").focus();
}

function renderNew(){
  $("#main").innerHTML=`<div class="stack fade">
    <div class="site-head"><div><h1>Thêm web mới</h1><div class="meta muted">Web mới hiện ngay trên trang chủ sau khi lưu.</div></div></div>
    <div class="panel stack"><div class="form-grid">
      <label class="field"><span>Tên web</span><input id="n-name" class="input" placeholder="Ví dụ: Gza Review"></label>
      <label class="field"><span>URL</span><input id="n-url" class="input mono" placeholder="https://review.gza.vn"></label>
      <label class="field full"><span>Mô tả 1 dòng</span><input id="n-desc" class="input" maxlength="80" placeholder="Đánh giá sản phẩm thật từ khách hàng."></label>
      <label class="field"><span>Nhóm</span><select id="n-cat" class="input"><option>Nội dung</option><option>Bán hàng</option><option>Dịch vụ</option></select></label>
      <label class="field"><span>Nền tảng</span><select id="n-plat" class="input"><option>Vercel</option><option>Netlify</option></select></label>
      <label class="field full"><span>Token deploy</span><input id="n-tok" class="input mono" type="password" placeholder="Dán token từ Vercel hoặc Netlify"><small>Mã hoá khi lưu, không hiện lại.</small></label>
    </div>
    <div class="form-foot"><button class="btn primary" id="n-save">${ic("plus","width:16px;height:16px")}Thêm web</button></div></div></div>`;
  $("#n-save").onclick=async()=>{const name=$("#n-name").value.trim(),url=$("#n-url").value.trim();
    if(!name||!url){toast("Cần ít nhất tên và URL");return}
    let id="w"+Date.now().toString(36);
    if(LIVE){id=slug(name);let k=2;while(SITES.some(x=>x.id===id))id=slug(name).slice(0,36)+"-"+(k++);
      const pal0=[["#ff8a1f","#c2410c"],["#34d399","#065f46"],["#818cf8","#3730a3"],["#fb7185","#9f1239"]][SITES.length%4];const tok=$("#n-tok").value.trim();
      const b=$("#n-save");b.disabled=true;
      const ok=await persist(async()=>{await q(sb.from("sites").insert({id,name,url:/^https?:/.test(url)?url:"https://"+url,description:$("#n-desc").value.trim(),category:$("#n-cat").value,platform:$("#n-plat").value,color1:pal0[0],color2:pal0[1],sort:SITES.length}));
        await q(sb.from("site_config").insert({site_id:id}));if(tok)await q(sb.rpc("set_secret",{p_owner:"site:"+id,p_key:"deploy_token",p_value:tok}))});
      b.disabled=false;if(!ok)return;await loadAdmin();state.page="site";state.site=id;state.tab="info";renderAdmin();loadPublic();toast("Đã thêm "+name+". Nó đã hiện trên trang chủ.");return}const pal=[["#ff8a1f","#c2410c"],["#34d399","#065f46"],["#818cf8","#3730a3"],["#fb7185","#9f1239"]];
    SITES.push({id,name,url:/^https?:/.test(url)?url:"https://"+url,desc:$("#n-desc").value.trim()||"Web mới trong hệ sinh thái Gza.",plat:$("#n-plat").value,c:pal[SITES.length%pal.length],cat:$("#n-cat").value,status:"ok"});
    LOGS[id]=[];state.page="site";state.site=id;state.tab="update";renderAdmin();renderPublic();toast("Đã thêm "+name+". Giờ thả file .zip vào để deploy lần đầu.")};
}

/* ---------- router: the URL decides the view, nothing on the public page links to admin except the footer lock ---------- */
function route(){
  const wantAdmin=location.hash==="#admin"||location.pathname.replace(/\/+$/,"")==="/admin";
  $("#public").hidden=wantAdmin;
  $("#login").hidden=!wantAdmin||authed;
  $("#admin").hidden=!wantAdmin||!authed;
  if(wantAdmin&&authed)renderAdmin();
  if(wantAdmin&&!authed)setTimeout(()=>$("#l-email").focus(),50);
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);
if(LIVE){
  SITES.length=0;renderPublic();route();
  loadPublic().catch(e=>{console.error(e);$("#grid").innerHTML=`<div class="empty">Không tải được danh sách web. Thử tải lại trang.</div>`});
  sb.auth.getSession().then(async({data})=>{if(data.session)await afterSignIn()});
}else if(window.GZA_CONFIG){SITES.length=0;renderPublic();$("#grid").innerHTML=`<div class="empty">Không tải được thư viện kết nối database. Kiểm tra mạng rồi tải lại trang.</div>`;route()
}else{renderPublic();route()}

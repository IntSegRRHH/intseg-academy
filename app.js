/**
 * IntSeg Academy — app.js v3.0 (Supabase)
 * Login del personal con Supabase Auth, acceso del guardia por número de empleado + foto
 * (Edge Function acceso-guardia), avance de evaluaciones y administración en la nube.
 * Depende de: datos.js (sb, DB, EMPLEADOS), cursos.js (COURSE_CONTENT, QUIZZES).
 */

// ── Estado ─────────────────────────────────────────────────
let currentUser = null;      // { id, nombre, user, role, status, numEmpleado, fotoAcceso?, accesoEn? }
let currentCourseKey = null;
let quizState = {};

// Perfil de Supabase → usuario de la app (mantiene los nombres que ya usaba la interfaz)
function perfilAUsuario(p) {
  return {
    id: p.id, nombre: p.nombre, user: p.numero_empleado, role: p.rol, status: p.estado,
    numEmpleado: p.rol === "guardia" ? p.numero_empleado : null, createdAt: p.created_at,
  };
}
const esStaff = (u = currentUser) => !!u && ["admin", "maestro", "supervisor"].includes(u.role);

// ── Avance de evaluaciones (Supabase, tabla progreso) ──────
let PROGRESO_PROPIO = {};   // { curso: { passed, score, date, intentos } } del usuario actual
let PROGRESO_TODOS = {};    // { numero_empleado: { curso: {...} } }  (solo personal)
let USUARIOS = [];          // perfiles de todos los usuarios (solo personal)

async function cargarProgresoPropio() {
  PROGRESO_PROPIO = {};
  const { data, error } = await sb.from("progreso").select("*").eq("guardia_id", currentUser.id);
  if (error) { console.error("cargarProgresoPropio:", error.message); return; }
  (data || []).forEach((r) => { PROGRESO_PROPIO[r.curso_key] = { passed: r.passed, score: r.score, date: r.fecha, intentos: r.intentos }; });
}
async function cargarProgresoTodos() {
  PROGRESO_TODOS = {};
  const { data, error } = await sb.from("progreso").select("*, perfiles(numero_empleado)");
  if (error) { console.error("cargarProgresoTodos:", error.message); return; }
  (data || []).forEach((r) => {
    const num = r.perfiles?.numero_empleado;
    if (!num) return;
    (PROGRESO_TODOS[num] = PROGRESO_TODOS[num] || {})[r.curso_key] = { passed: r.passed, score: r.score, date: r.fecha, intentos: r.intentos };
  });
}
async function cargarUsuarios() {
  const { data, error } = await sb.from("perfiles").select("*").order("created_at");
  if (error) { console.error("cargarUsuarios:", error.message); return; }
  USUARIOS = (data || []).map(perfilAUsuario);
}
function getUsersDB() { return USUARIOS; }
function getProgress(courseKey) { return PROGRESO_PROPIO[courseKey] || null; }
function getAllProgress(user) {
  if (!user || user === currentUser?.user) return PROGRESO_PROPIO;
  return PROGRESO_TODOS[user] || {};
}
async function saveProgress(courseKey, passed, score) {
  const prev = PROGRESO_PROPIO[courseKey];
  const intentos = (prev?.intentos || 0) + 1;
  // Se conserva la última aprobación: un intento reprobado no borra una aprobación previa
  const nuevo = prev && prev.passed && !passed
    ? { ...prev, intentos }
    : { passed, score, date: new Date().toISOString(), intentos };
  PROGRESO_PROPIO[courseKey] = nuevo;
  const { error } = await sb.from("progreso").upsert(
    { guardia_id: currentUser.id, curso_key: courseKey, score: nuevo.score, passed: nuevo.passed, fecha: nuevo.date, intentos },
    { onConflict: "guardia_id,curso_key" }
  );
  if (error) { console.error("saveProgress:", error.message); toast("No se pudo guardar tu avance. Revisa tu conexión."); }
}

// ── Navegación ─────────────────────────────────────────────
function navigate(name) {
  ["viewLogin","viewCatalog","viewDetail","viewAdmin","viewQuiz","viewResult","viewTrainer","viewFichas","viewEvidencias"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.add("hidden");
  });
  document.getElementById("appShell").classList.add("hidden");
  if(name==="login"){document.getElementById("viewLogin").classList.remove("hidden");return;}
  document.getElementById("appShell").classList.remove("hidden");
  const esGuardia=currentUser&&currentUser.role==="guardia";
  document.body.classList.toggle("rol-guardia",!!esGuardia);
  document.getElementById("sidebar").classList.toggle("hidden",!!esGuardia);
  document.getElementById("guardBanner").classList.toggle("hidden",!esGuardia);
  if(esGuardia)document.getElementById("guardNombre").textContent=currentUser.nombre;
  const map={catalog:"viewCatalog",detail:"viewDetail",admin:"viewAdmin",quiz:"viewQuiz",result:"viewResult",trainer:"viewTrainer",fichas:"viewFichas",evidencias:"viewEvidencias"};
  if(map[name]) document.getElementById(map[name]).classList.remove("hidden");
  document.querySelectorAll(".sidebar__item").forEach(i=>i.classList.remove("active"));
  if(name==="catalog"){document.getElementById("sideInicio")?.classList.add("active");document.getElementById("sideCursos")?.classList.add("active");}
  if(name==="admin"){document.getElementById("sideAdmin")?.classList.add("active");}
  if(name==="trainer"){document.getElementById("sideSesiones")?.classList.add("active");}
  if(name==="fichas"){document.getElementById("sideFichas")?.classList.add("active");}
  if(name==="evidencias"){document.getElementById("sideEvidencias")?.classList.add("active");}
  // Visibilidad por rol: capacitador = maestro/admin; personal = supervisor/maestro/admin
  const esCap=currentUser&&(currentUser.role==="maestro"||currentUser.role==="admin");
  document.querySelectorAll(".soloCapacitador").forEach(el=>el.classList.toggle("hidden",!esCap));
  document.querySelectorAll(".soloStaff").forEach(el=>el.classList.toggle("hidden",!esStaff()));
  document.querySelectorAll(".soloAdmin").forEach(el=>el.classList.toggle("hidden",!(currentUser&&currentUser.role==="admin")));
  if(name==="admin") renderAdmin();
  if(name==="evidencias") EVID.mostrar();
  window.scrollTo(0,0);
}

// ── Toast ──────────────────────────────────────────────────
let _tt=null;
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg;el.classList.remove("hidden");
  if(_tt)clearTimeout(_tt);_tt=setTimeout(()=>el.classList.add("hidden"),2500);
}

// ── Inicio de sesión ───────────────────────────────────────
// Deja lista la sesión: avance propio y, si es personal, usuarios, avance de todos y empleados.
async function iniciarSesion(usuario, extra = {}) {
  currentUser = { ...usuario, ...extra };
  await cargarProgresoPropio();
  if (esStaff()) await Promise.all([cargarUsuarios(), cargarProgresoTodos(), EMPLEADOS.cargar()]);
  refreshCatalog();
  if (currentUser.role === "maestro") TR.mostrarLista();
  else if (currentUser.role === "supervisor") navigate("evidencias");
  else navigate(currentUser.role === "admin" ? "admin" : "catalog");
}

function mostrarErrorLogin(msg, ms = 3500) {
  const err = document.getElementById("loginError");
  err.textContent = msg; err.classList.remove("hidden");
  setTimeout(() => err.classList.add("hidden"), ms);
}

// Personal (capacitador, supervisor, admin): usuario + contraseña
async function doLogin(){
  const u=document.getElementById("inputUser").value.trim().toLowerCase();
  const p=document.getElementById("inputPass").value;
  const btn=document.getElementById("btnLogin");
  if(!u||!p) return;
  btn.disabled=true; btn.textContent="Ingresando…";
  try{
    const { data, error } = await sb.auth.signInWithPassword({ email: u+EMAIL_DOMINIO, password: p });
    if(error||!data?.user){ mostrarErrorLogin("Usuario o contraseña incorrectos."); return; }
    const { data: perfil } = await sb.from("perfiles").select("*").eq("id", data.user.id).maybeSingle();
    if(!perfil){ await sb.auth.signOut(); mostrarErrorLogin("No se encontró el perfil de este usuario. Contacta al administrador.", 4500); return; }
    if(perfil.rol==="guardia"){ await sb.auth.signOut(); mostrarErrorLogin("Los guardias entran con su número de empleado.", 4000); return; }
    if(perfil.estado==="inactivo"){ await sb.auth.signOut(); mostrarErrorLogin("Cuenta desactivada. Contacta al administrador.", 4000); return; }
    await iniciarSesion(perfilAUsuario(perfil));
  } finally {
    btn.disabled=false; btn.textContent="Ingresar";
  }
}

async function doLogout(){
  closeSlides();
  try { await sb.auth.signOut(); } catch(e) {}
  currentUser=null;currentCourseKey=null;
  PROGRESO_PROPIO={};PROGRESO_TODOS={};USUARIOS=[];EMPLEADOS.limpiar();
  document.getElementById("inputUser").value="";
  document.getElementById("inputPass").value="";
  document.body.classList.remove("rol-guardia");
  ACCESO.reiniciar();
  navigate("login");
}

// ── Acceso del guardia: número de empleado + foto ─────────────
// Simula el flujo de IntsegWeb. En producción, IntsegWeb valida al empleado
// y la foto queda como evidencia del acceso.
const ACCESO = (() => {
  const $ = (id) => document.getElementById(id);
  let empleado = null, stream = null, foto = null;

  function error(msg) {
    const e = $("empError"); e.textContent = msg; e.classList.remove("hidden");
    setTimeout(() => e.classList.add("hidden"), 4000);
  }
  function apagarCamara() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    $("empVideo").classList.add("hidden");
  }
  function mostrar(estado) {
    // estado: "inicio" | "camara" | "foto"
    $("empVacio").classList.toggle("hidden", estado !== "inicio");
    $("empVideo").classList.toggle("hidden", estado !== "camara");
    $("empImg").classList.toggle("hidden", estado !== "foto");
    $("btnCamOn").classList.toggle("hidden", estado !== "inicio");
    if (estado !== "inicio") $("lblSubir").classList.add("hidden");
    $("btnFoto").classList.toggle("hidden", estado !== "camara");
    $("empAcciones").classList.toggle("hidden", estado !== "foto");
  }
  async function registrar() {
    const num = $("empNum").value.trim();
    if (!num) { error("Escribe tu número de empleado."); $("empNum").focus(); return; }
    empleado = await EMPLEADOS.buscar(num);
    if (!empleado) { $("empPaso").classList.add("hidden"); error("Número de empleado no encontrado."); return; }
    $("empError").classList.add("hidden");
    $("empNombre").textContent = empleado.nombre;
    $("empPaso").classList.remove("hidden");
    foto = null; apagarCamara(); aviso(""); $("lblSubir").classList.add("hidden"); mostrar("inicio");
  }
  function aviso(msg) {
    const el = $("empAviso");
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  }
  // Si la cámara del navegador no está disponible, se ofrece un botón nativo
  // que abre la cámara del celular o el selector de archivos (siempre funciona).
  function ofrecerRespaldo(motivo) {
    aviso(motivo);
    $("btnCamOn").classList.add("hidden");
    $("lblSubir").classList.remove("hidden");
  }
  async function encenderCamara() {
    aviso("");
    // Archivos abiertos desde el celular (content://, file://) no son "contexto seguro":
    // el navegador no permite la cámara en vivo, pero el botón nativo sí funciona.
    if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      ofrecerRespaldo("Abierto como archivo, el navegador no permite la cámara en vivo. Toca el botón de abajo para tomar tu foto.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ofrecerRespaldo("Este navegador no permite abrir la cámara aquí.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const v = $("empVideo");
      v.srcObject = stream;
      await v.play().catch(() => {});
      mostrar("camara");
    } catch (e) {
      const n = e && e.name;
      if (n === "NotAllowedError" || n === "SecurityError")
        ofrecerRespaldo("No se dio permiso para la cámara. Actívalo en el candado de la barra de direcciones, o usa el botón de abajo.");
      else if (n === "NotReadableError" || n === "AbortError")
        ofrecerRespaldo("La cámara está en uso por otra aplicación (por ejemplo Meet o Teams). Ciérrala o usa el botón de abajo.");
      else if (n === "NotFoundError" || n === "OverconstrainedError")
        ofrecerRespaldo("No se encontró una cámara en este equipo.");
      else ofrecerRespaldo("No se pudo abrir la cámara.");
    }
  }
  function reducir(src, cb) {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 720 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL("image/jpeg", 0.72));
    };
    img.src = src;
  }
  function tomarFoto() {
    const v = $("empVideo");
    if (!v.videoWidth) { aviso("La cámara aún se está preparando, intenta de nuevo en un momento."); return; }
    aviso("");
    const cv = document.createElement("canvas");
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);
    reducir(cv.toDataURL("image/jpeg", 0.9), (d) => { foto = d; $("empImg").src = d; apagarCamara(); mostrar("foto"); });
  }
  function fotoDeArchivo(file) {
    if (!file) return;
    const lr = new FileReader();
    lr.onload = () => reducir(lr.result, (d) => { foto = d; $("empImg").src = d; aviso(""); mostrar("foto"); $("lblSubir").classList.add("hidden"); });
    lr.readAsDataURL(file);
  }
  async function entrar() {
    if (!empleado || !foto) return;
    const btn = $("btnEntrar");
    btn.disabled = true; btn.textContent = "Entrando…";
    try {
      const r = await llamarAccesoGuardia({ action: "entrar", num: empleado.num, foto });
      const { error: e1 } = await sb.auth.verifyOtp({ token_hash: r.token_hash, type: r.type || "magiclink" });
      if (e1) throw new Error("No se pudo iniciar la sesión. Intenta de nuevo.");
      const { data: u } = await sb.auth.getUser();
      const { data: perfil } = await sb.from("perfiles").select("*").eq("id", u.user.id).maybeSingle();
      if (!perfil) throw new Error("No se encontró tu perfil. Contacta a Capacitación.");
      apagarCamara();
      await iniciarSesion(perfilAUsuario(perfil), { nombre: empleado.nombre, fotoAcceso: foto, accesoEn: new Date().toISOString() });
    } catch (e) {
      error(e.message || "No se pudo entrar.");
    } finally {
      btn.disabled = false; btn.textContent = "Entrar";
    }
  }
  function reiniciar() {
    apagarCamara(); empleado = null; foto = null;
    $("empNum").value = ""; $("empPaso").classList.add("hidden");
    $("loginGuardia").classList.remove("hidden"); $("loginStaff").classList.add("hidden");
  }
  $("btnEmp").addEventListener("click", registrar);
  $("empNum").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); registrar(); } });
  $("btnCamOn").addEventListener("click", encenderCamara);
  $("btnFoto").addEventListener("click", tomarFoto);
  $("btnRepetir").addEventListener("click", () => { foto = null; $("empImg").removeAttribute("src"); mostrar("inicio"); aviso(""); $("lblSubir").classList.add("hidden"); });
  $("btnEntrar").addEventListener("click", entrar);
  $("empCamara").addEventListener("change", (e) => { fotoDeArchivo(e.target.files[0]); e.target.value = ""; });
  $("lnkStaff").addEventListener("click", () => { reiniciar(); $("loginGuardia").classList.add("hidden"); $("loginStaff").classList.remove("hidden"); $("inputUser").focus(); });
  $("lnkGuardia").addEventListener("click", () => { reiniciar(); $("empNum").focus(); });
  return { reiniciar };
})();

// ── Catálogo ───────────────────────────────────────────────
function refreshCatalog(){
  Object.keys(COURSE_CONTENT).forEach(key=>{
    const prog=getProgress(key);
    const card=document.querySelector(`.courseCard[data-course="${key}"]`);
    if(!card)return;
    const bar=card.querySelector(".progressBar__fill");
    const txt=card.querySelector(".progressText");
    if(prog?.passed){
      card.dataset.status="done";
      if(bar)bar.style.width="100%";
      if(txt)txt.textContent="✅ Aprobado — "+prog.score+"/10";
    }else if(prog){
      card.dataset.status="progress";
      const pct=Math.round((prog.score/10)*100);
      if(bar)bar.style.width=pct+"%";
      if(txt)txt.textContent=pct+"% — Reintentar";
    }else{
      // Sin intentos de este usuario: la tarjeta regresa a "Sin iniciar"
      card.dataset.status="new";
      if(bar)bar.style.width="0%";
      if(txt)txt.textContent="Sin iniciar";
    }
  });
}

// ── Visor de imágenes ──────────────────────────────────────
function openLightbox(src){
  let lb=document.getElementById("lightbox");
  if(!lb){
    lb=document.createElement("div");lb.id="lightbox";lb.className="lightbox";
    lb.innerHTML='<img alt="Lámina ampliada"/><button class="lightbox__close" aria-label="Cerrar">✕</button>';
    lb.addEventListener("click",()=>lb.classList.remove("lightbox--open"));
    document.body.appendChild(lb);
  }
  lb.querySelector("img").src=src;lb.classList.add("lightbox--open");
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("lightbox")?.classList.remove("lightbox--open");});

// ── Visor de temas tipo presentación ───────────────────────
let slideState={slides:[],i:0,opts:{}};
function buildSlides(key){
  const c=COURSE_CONTENT[key];const out=[];
  c.modules.forEach((m,mi)=>{
    if(m.video){out.push({mi,ii:0,parts:1,src:null,video:m.video,title:m.title,items:m.items});return;}
    const imgs=m.imgs?.length?m.imgs:[null];
    imgs.forEach((src,ii)=>out.push({mi,ii,parts:imgs.length,src,title:m.title,items:m.items}));
  });
  return out;
}
function ensureSlideViewer(){
  let v=document.getElementById("slideViewer");if(v)return v;
  v=document.createElement("div");v.id="slideViewer";v.className="slideViewer";
  v.innerHTML=`
    <header class="slideViewer__top">
      <div class="slideViewer__title" id="svTitle"></div>
      <div class="slideViewer__count" id="svCount"></div>
    </header>
    <div class="slideViewer__stage">
      <div class="slideViewer__media"><img id="svImg" alt=""/></div>
      <div class="slideViewer__video hidden" id="svVideoWrap">
        <video id="svVideo" playsinline controls preload="metadata" controlsList="nodownload noplaybackrate nofullscreen" disablePictureInPicture></video>
        <div class="vq hidden" id="svPregunta" role="dialog" aria-live="polite"></div>
      </div>
      <p class="slideViewer__hint">Gira tu celular o toca la lámina para verla en grande</p>
      <ul class="slideViewer__list" id="svList"></ul>
    </div>
    <footer class="slideViewer__nav">
      <button class="svBtn svBtn--navy" id="svPrev"><svg viewBox="0 0 24 24"><path d="M19 11H7.8l4.6-4.6L11 5l-7 7 7 7 1.4-1.4L7.8 13H19z"/></svg><span>Atrás</span></button>
      <button class="svBtn svBtn--home" id="svHome" aria-label="Volver al contenido del curso"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/></svg></button>
      <button class="svBtn svBtn--navy" id="svNext"><span>Siguiente</span><svg viewBox="0 0 24 24"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z"/></svg></button>
    </footer>`;
  document.body.appendChild(v);
  v.querySelector("#svPrev").addEventListener("click",()=>goSlide(-1));
  v.querySelector("#svNext").addEventListener("click",()=>{
    if(!VIDEO.puedeAvanzar()){toast("Termina el video para continuar");return;}
    if(slideState.i>=slideState.slides.length-1){
      closeSlides();
      if(slideState.opts.alTerminar)slideState.opts.alTerminar();else startQuiz();
    }else goSlide(1);
  });
  v.querySelector("#svHome").addEventListener("click",closeSlides);
  v.querySelector("#svImg").addEventListener("click",e=>openLightbox(e.target.src));
  let x0=null;
  v.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
  v.addEventListener("touchend",e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;
    if(Math.abs(dx)>60)goSlide(dx<0?1:-1);});
  return v;
}
// ── Temas en video: preguntas en minutos definidos y sin adelantar ──
const VIDEO = (() => {
  let cfg = null, capacitador = false, maxVisto = 0, hechas = new Set(), terminado = true, abierta = null, corrigiendo = false;
  const v = () => document.getElementById("svVideo");
  const caja = () => document.getElementById("svPregunta");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function cargar(video, modoCapacitador) {
    cfg = video; capacitador = modoCapacitador; maxVisto = 0; hechas = new Set(); terminado = false; abierta = null;
    const el = v();
    el.pause();
    el.querySelectorAll("track,source").forEach((t) => t.remove());
    el.removeAttribute("src");
    // MP4 primero (Chrome, Safari, celulares); WebM como respaldo
    [[video.src, "video/mp4"], [video.webm, "video/webm"]].forEach(([url, tipo]) => {
      if (!url) return;
      const so = document.createElement("source"); so.src = url; so.type = tipo; el.appendChild(so);
    });
    if (video.poster) el.poster = video.poster; else el.removeAttribute("poster");
    if (video.vtt) {
      const tr = document.createElement("track");
      Object.assign(tr, { kind: "subtitles", srclang: "es", label: "Español", src: video.vtt, default: true });
      el.appendChild(tr);
    }
    el.load();
    caja().classList.add("hidden");
  }
  function salir() { const el = v(); if (el) el.pause(); if (caja()) caja().classList.add("hidden"); cfg = null; terminado = true; }
  function puedeAvanzar() { return !cfg || capacitador || terminado; }
  function pendiente(t) { return (cfg?.preguntas || []).findIndex((p, i) => !hechas.has(i) && t >= p.t); }
  function mostrar(i) {
    const p = cfg.preguntas[i]; abierta = i; v().pause();
    caja().innerHTML = `<div class="vq__card"><div class="vq__tag">Pregunta</div><div class="vq__q">${esc(p.q)}</div>
      <div class="vq__opts">${p.opts.map((o, k) => `<button class="quizOption" data-vq="${k}">${esc(o)}</button>`).join("")}</div>
      <div class="vq__fb hidden"></div><button class="btnPrimaryWide vq__seguir hidden">Continuar el video ▶</button></div>`;
    caja().classList.remove("hidden");
  }
  function responder(k) {
    const p = cfg.preguntas[abierta]; const bien = k === p.ans;
    caja().querySelectorAll("[data-vq]").forEach((b, i) => {
      b.disabled = true;
      if (i === p.ans) b.classList.add("quizOption--correct"); else if (i === k) b.classList.add("quizOption--wrong");
    });
    const fb = caja().querySelector(".vq__fb");
    fb.className = "vq__fb quizFeedback " + (bien ? "quizFeedback--ok" : "quizFeedback--no");
    fb.innerHTML = `<div class="quizFeedback__titulo">${bien ? "✅ ¡Correcto!" : "❌ Incorrecto"}</div>` +
      (bien ? "" : `<div class="quizFeedback__correcta">La respuesta correcta es: <b>${esc(p.opts[p.ans])}</b></div>`) +
      (p.exp ? `<div class="quizFeedback__exp">${esc(p.exp)}</div>` : "");
    caja().querySelector(".vq__seguir").classList.remove("hidden");
  }
  function seguir() { hechas.add(abierta); abierta = null; caja().classList.add("hidden"); v().play().catch(() => {}); }
  function enlazar() {
    const el = v(); if (!el || el.dataset.enlazado) return; el.dataset.enlazado = "1";
    el.addEventListener("timeupdate", () => {
      if (!cfg) return;
      if (!el.seeking && el.currentTime > maxVisto && el.currentTime - maxVisto < 2) maxVisto = el.currentTime;
      const i = pendiente(el.currentTime);
      if (i >= 0 && abierta === null) mostrar(i);
    });
    el.addEventListener("seeking", () => {
      if (!cfg || capacitador || corrigiendo) return;
      if (el.currentTime > maxVisto + 0.75) {
        corrigiendo = true; el.currentTime = maxVisto; corrigiendo = false;
        toast("Solo puedes regresar a partes que ya viste");
      }
    });
    el.addEventListener("play", () => { if (abierta !== null) el.pause(); });
    el.addEventListener("ended", () => {
      if (!cfg) return;
      const i = pendiente(el.duration + 1);
      if (i >= 0) { mostrar(i); return; }
      terminado = true;
      toast("Video completado. Ya puedes continuar.");
    });
    caja().addEventListener("click", (e) => {
      const b = e.target.closest("[data-vq]"); if (b) return responder(Number(b.dataset.vq));
      if (e.target.closest(".vq__seguir")) {
        seguir();
        if (v().ended) { const i = pendiente(v().duration + 1); if (i >= 0) mostrar(i); else { terminado = true; toast("Video completado. Ya puedes continuar."); } }
      }
    });
  }
  return { cargar: (a, b) => { enlazar(); cargar(a, b); }, salir, puedeAvanzar };
})();

function openSlides(key,moduleIdx,opts={}){
  slideState.opts=opts;
  const v=ensureSlideViewer();
  slideState.slides=buildSlides(key);
  slideState.i=Math.max(0,slideState.slides.findIndex(s=>s.mi===moduleIdx));
  renderSlide();v.classList.add("slideViewer--open");document.body.style.overflow="hidden";
}
function closeSlides(){
  if(typeof VIDEO!=="undefined")VIDEO.salir();
  document.getElementById("slideViewer")?.classList.remove("slideViewer--open");document.body.style.overflow="";
}
function goSlide(d){
  if(d>0&&!VIDEO.puedeAvanzar()){toast("Termina el video para continuar");return;}
  const n=slideState.i+d;if(n<0||n>=slideState.slides.length)return;
  VIDEO.salir();
  slideState.i=n;renderSlide();
}
function renderSlide(){
  const{slides,i}=slideState;const s=slides[i];const total=slides.length;
  document.getElementById("svTitle").textContent=s.title;
  document.getElementById("svCount").textContent=`${i+1} / ${total}`;
  const img=document.getElementById("svImg");
  img.parentElement.classList.toggle("hidden",!s.src);
  document.getElementById("svVideoWrap").classList.toggle("hidden",!s.video);
  document.querySelector(".slideViewer__hint")?.classList.toggle("ocultoVideo",!!s.video);
  if(s.video)VIDEO.cargar(s.video,!!slideState.opts.modoCapacitador);
  // La lámina ocupa toda la pantalla; el texto del tema queda como descripción accesible
  if(s.src){img.src=s.src;img.alt=`${s.title}. ${s.items.join(" ")}`;}
  const ul=document.getElementById("svList");ul.innerHTML="";
  ul.classList.toggle("hidden",!!s.src||!!s.video);
  if(!s.src&&!s.video)s.items.forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});
  document.getElementById("svPrev").disabled=i===0;
  document.querySelector("#svNext span").textContent=i===total-1?(slideState.opts.textoFinal||"Evaluación"):"Siguiente";
}
document.addEventListener("keydown",e=>{
  if(!document.getElementById("slideViewer")?.classList.contains("slideViewer--open"))return;
  if(document.getElementById("lightbox")?.classList.contains("lightbox--open"))return;
  if(e.key==="ArrowRight")goSlide(1);
  else if(e.key==="ArrowLeft")goSlide(-1);
  else if(e.key==="Escape")closeSlides();
});

// ── Detalle ────────────────────────────────────────────────
function loadDetail(key){
  currentCourseKey=key;
  const c=COURSE_CONTENT[key];if(!c)return;
  document.getElementById("detBadge").textContent=c.badge;
  document.getElementById("detTitle").textContent=c.title;
  document.getElementById("detInstructor").textContent=c.instructor;
  document.getElementById("detDuration").textContent=c.duration;
  document.getElementById("detDesc").textContent=c.desc;
  const img=document.querySelector("#detAvatar img");if(img)img.src=c.img;

  // Botón PDF
  const pdfBtn = document.getElementById("btnVerPDF");
  if(c.pdf){
    pdfBtn.href = c.pdf;
    pdfBtn.classList.remove("hidden");
  } else {
    pdfBtn.classList.add("hidden");
  }
  const container=document.getElementById("moduleList");
  container.innerHTML="";
  c.modules.forEach(mod=>{
    const wrap=document.createElement("div");wrap.className="accordion";
    const header=document.createElement("button");header.className="accordion__header";
    header.innerHTML=`<div class="accordion__left"><span class="checkDot"><svg viewBox="0 0 24 24" class="icon"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5L9 16.2z"/></svg></span><span>${mod.title}</span>${mod.video?'<span class="modTag">▶ Video</span>':''}</div><span class="accordion__chevron">›</span>`;
    const body=document.createElement("div");body.className="accordion__body";
    const inner=document.createElement("div");inner.className="accordion__inner";
    if(mod.imgs?.length){
      inner.classList.add("accordion__inner--media");
      const media=document.createElement("div");media.className="accordion__media";
      mod.imgs.forEach(src=>{
        const im=document.createElement("img");im.className="accordion__img";im.src=src;im.loading="lazy";im.alt=mod.title;
        im.addEventListener("click",()=>openLightbox(src));media.appendChild(im);
      });
      inner.appendChild(media);
    }
    const ul=document.createElement("ul");ul.className="accordion__list";
    mod.items.forEach(item=>{const li=document.createElement("li");li.textContent=item;ul.appendChild(li);});
    inner.appendChild(ul);body.appendChild(inner);
    header.addEventListener("click",()=>{
      if(c.modules.some(m=>m.imgs?.length||m.video)){openSlides(key,c.modules.indexOf(mod));return;}
      const isOpen=wrap.classList.contains("accordion--open");
      document.querySelectorAll(".accordion").forEach(a=>a.classList.remove("accordion--open"));
      if(!isOpen)wrap.classList.add("accordion--open");
    });
    wrap.appendChild(header);wrap.appendChild(body);container.appendChild(wrap);
  });
  const btn=document.getElementById("btnEval");
  const prog=getProgress(key);
  btn.textContent=prog?.passed?"✅ Evaluación superada":prog?"Reintentar evaluación":"Iniciar evaluación";
}

// ── Quiz ───────────────────────────────────────────────────
function startQuiz(ctx=null){
  if(!ctx||typeof ctx.alTerminar!=="function")ctx=null; // si viene de un clic, no es una sesión de capacitador
  const key=ctx?.cursoKey||currentCourseKey;
  if(!key||!QUIZZES[key]){toast("Quiz no disponible");return;}
  const barajar=arr=>{const r=[...arr];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;};
  // Mezcla preguntas y también el orden de las opciones, para que la respuesta no quede siempre en la misma posición
  const pool=barajar(QUIZZES[key]).slice(0,10).map(q=>{
    const orden=barajar(q.opts.map((_,i)=>i));
    return{...q,opts:orden.map(i=>q.opts[i]),ans:orden.indexOf(q.ans)};
  });
  quizState={questions:pool,current:0,answers:[],score:0,courseKey:key,ctx};
  const qBack=document.querySelector("#viewQuiz [data-back]");if(qBack)qBack.dataset.back=ctx?"trainer":"detail";
  navigate("quiz");renderQuestion();
}
function renderQuestion(){
  const{questions,current}=quizState;const q=questions[current];const total=questions.length;
  document.getElementById("quizCourseTitle").textContent=COURSE_CONTENT[quizState.courseKey]?.title||"";
  document.getElementById("quizProgress").textContent=`Pregunta ${current+1} de ${total}`;
  document.getElementById("quizProgressBar").style.width=((current/total)*100)+"%";
  document.getElementById("quizQuestion").textContent=q.q;
  const optsEl=document.getElementById("quizOptions");optsEl.innerHTML="";
  q.opts.forEach((opt,i)=>{
    const btn=document.createElement("button");btn.className="quizOption";btn.textContent=opt;
    btn.addEventListener("click",()=>selectAnswer(i));optsEl.appendChild(btn);
  });
  document.getElementById("btnNextQ").classList.add("hidden");
  document.getElementById("quizFeedback").classList.add("hidden");
}
function selectAnswer(idx){
  const q=quizState.questions[quizState.current];
  document.querySelectorAll(".quizOption").forEach((btn,i)=>{
    btn.disabled=true;
    if(i===q.ans)btn.classList.add("quizOption--correct");
    else if(i===idx&&idx!==q.ans)btn.classList.add("quizOption--wrong");
  });
  const bien=idx===q.ans;
  if(bien)quizState.score++;
  quizState.answers.push(idx);
  // Retroalimentación: siempre se explica por qué la respuesta correcta es la correcta
  const fb=document.getElementById("quizFeedback");
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  fb.className="quizFeedback "+(bien?"quizFeedback--ok":"quizFeedback--no");
  fb.innerHTML=`<div class="quizFeedback__titulo">${bien?"✅ ¡Correcto!":"❌ Incorrecto"}</div>`+
    (bien?"":`<div class="quizFeedback__correcta">La respuesta correcta es: <b>${esc(q.opts[q.ans])}</b></div>`)+
    (q.exp?`<div class="quizFeedback__exp">${esc(q.exp)}</div>`:"");
  if(window.innerWidth<1024)setTimeout(()=>fb.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
  const btnNext=document.getElementById("btnNextQ");
  btnNext.classList.remove("hidden");
  btnNext.textContent=quizState.current+1<quizState.questions.length?"Siguiente →":"Ver resultados";
}
function nextQuestion(){
  quizState.current++;
  if(quizState.current<quizState.questions.length)renderQuestion();else showResult();
}
function showResult(){
  const{score,questions,courseKey}=quizState;const total=questions.length;
  const passed=score>=Math.ceil(total*.8);const pct=Math.round((score/total)*100);
  const ctx=quizState.ctx;
  if(ctx)ctx.alTerminar(score,total,passed);else saveProgress(courseKey,passed,score);
  document.getElementById("resultIcon").textContent=passed?"🏅":"📋";
  document.getElementById("resultTitle").textContent=passed?"¡Aprobado!":"No aprobado";
  document.getElementById("resultScore").textContent=`${score} / ${total} correctas (${pct}%)`;
  document.getElementById("resultMsg").textContent=passed?"Felicidades. Has superado la evaluación con éxito.":"Necesitas mínimo 8 respuestas correctas (80%). Repasa el material e inténtalo de nuevo.";
  document.getElementById("resultBarFill").style.width=pct+"%";
  document.getElementById("resultBarFill").style.background=passed?"#22c55e":"#f97316";
  document.getElementById("btnRetry").style.display=(passed||ctx)?"none":"block";
  const btnBack=document.querySelector("#viewResult .btnSecondaryWide");
  btnBack.dataset.back=ctx?"trainer":"catalog";
  btnBack.textContent=ctx?"← Volver a la sesión":"← Volver al catálogo";
  if(ctx)document.getElementById("resultMsg").textContent=`${ctx.nombre}: ${passed?"aprobado":"no aprobado"}. Calificación registrada en la sesión.`;
  navigate("result");refreshCatalog();
}

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
async function renderAdmin(){
  // Datos frescos de Supabase cada vez que se abre el panel
  await Promise.all([cargarUsuarios(), cargarProgresoTodos(), EMPLEADOS.cargar()]);
  renderAdminDashboard();
  renderAdminUsers();
  renderAdminCourses();
  renderAdminEvals();
  renderAdminEmpleados();
}

function getAdminProgress(username){
  return PROGRESO_TODOS[username] || {};
}

function renderAdminDashboard(){
  const keys=Object.keys(COURSE_CONTENT);
  const allUsers=USUARIOS.filter(u=>u.role!=="admin"&&u.status==="activo");
  let totalEvals=0,totalPassed=0,scores=[];
  allUsers.forEach(u=>{
    const prog=getAdminProgress(u.user);
    keys.forEach(k=>{
      if(prog[k]){totalEvals++;if(prog[k].passed)totalPassed++;scores.push(prog[k].score);}
    });
  });
  const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:0;
  const passRate=totalEvals?Math.round((totalPassed/totalEvals)*100):0;

  document.getElementById("adminStats").innerHTML=`
    <div class="statCard"><div class="statCard__n">${allUsers.length}</div><div class="statCard__l">Usuarios activos</div></div>
    <div class="statCard"><div class="statCard__n">${keys.length}</div><div class="statCard__l">Cursos</div></div>
    <div class="statCard statCard--green"><div class="statCard__n">${totalPassed}</div><div class="statCard__l">Evaluaciones aprobadas</div></div>
    <div class="statCard statCard--orange"><div class="statCard__n">${passRate}%</div><div class="statCard__l">Tasa de aprobación</div></div>
    <div class="statCard"><div class="statCard__n">${avg}</div><div class="statCard__l">Promedio general</div></div>
    <div class="statCard"><div class="statCard__n">${totalEvals}</div><div class="statCard__l">Evaluaciones realizadas</div></div>
  `;

  let html="";
  keys.forEach(k=>{
    const c=COURSE_CONTENT[k];
    let passed=0;
    allUsers.forEach(u=>{const p=getAdminProgress(u.user);if(p[k]?.passed)passed++;});
    const pct=Math.round((passed/(allUsers.length||1))*100);
    html+=`<div class="courseStatRow">
      <div class="courseStatName">${c.title}</div>
      <div class="courseStatBar"><div class="courseStatFill" style="width:${pct}%"></div></div>
      <div class="courseStatPct">${passed}/${allUsers.length} aprobaron (${pct}%)</div>
    </div>`;
  });
  document.getElementById("adminCourseStats").innerHTML=html;
}

// ── Usuarios — Supabase (alta, edición y baja por Edge Function) ──
const RUTA_ROL = { guardia:"Guardia", supervisor:"Supervisor", maestro:"Capacitador", admin:"Admin" };

function renderAdminUsers(){
  const keys = Object.keys(COURSE_CONTENT);
  const users = [...getUsersDB()].sort((a,b)=>((a.role==="guardia")-(b.role==="guardia"))||a.nombre.localeCompare(b.nombre,"es"));
  const gridCols = `160px 100px 90px 80px repeat(${keys.length},80px) 90px`;

  let html = `<div class="userTable">
    <div class="userTable__head" style="grid-template-columns:${gridCols}">
      <div>Nombre</div><div>Usuario</div><div>Rol</div><div>Estado</div>
      ${keys.map(k=>`<div>${COURSE_CONTENT[k].badge.replace("Certificación ","").replace("Seguridad Patrimonial","Patrimonial").replace("SafeR NextGen","NextGen").replace("Operación en campo","Rondines").replace("Seguridad e Higiene","EHS").replace("Prevención de ilícitos","PLD")}</div>`).join("")}
      <div>Acciones</div>
    </div>`;

  users.forEach(u => {
    const prog = getAdminProgress(u.user);
    html += `<div class="userTable__row ${u.status==='inactivo'?'userTable__row--inactive':''}" style="grid-template-columns:${gridCols}">
      <div class="userTable__name">
        <span class="userAvatar ${u.status==='inactivo'?'userAvatar--inactive':''}">${u.nombre.charAt(0)}</span>
        <span>${u.nombre}</span>
      </div>
      <div style="font-size:12px;color:#6b7280">${u.user}</div>
      <div><span class="roleBadge roleBadge--${u.role}">${RUTA_ROL[u.role]||u.role}</span></div>
      <div><span class="statusPill ${u.status==='activo'?'statusPill--active':'statusPill--inactive'}">${u.status}</span></div>
      ${keys.map(k=>{
        const p = prog[k];
        if(!p) return `<div class="progCell progCell--none">—</div>`;
        return `<div class="progCell ${p.passed?"progCell--pass":"progCell--fail"}">${p.passed?"✅":"❌"} ${p.score}/10</div>`;
      }).join("")}
      <div class="actionBtns">
        <button class="btnAction btnAction--edit" onclick="openUserModal('${u.id}')">✏️</button>
        <button class="btnAction ${u.status==='activo'?'btnAction--deact':'btnAction--act'}" onclick="toggleUserStatus('${u.id}')">${u.status==='activo'?'🔒':'🔓'}</button>
        ${u.user!=='admin'?`<button class="btnAction btnAction--del" onclick="deleteUser('${u.id}')">🗑️</button>`:''}
      </div>
    </div>`;
  });
  html += "</div>";
  if(!users.length) html = `<div class="emptyState">Aún no hay usuarios.</div>`;
  document.getElementById("adminUserTable").innerHTML = html;
}

function openUserModal(id) {
  const isNew = !id;
  document.getElementById("modalUsuarioTitle").textContent = isNew ? "Nuevo usuario" : "Editar usuario";
  document.getElementById("editUserId").value = id || "";
  document.getElementById("modalUsuarioError").classList.add("hidden");
  const userField = document.getElementById("editUserUser");
  const passField = document.getElementById("editUserPass");
  const passLabel = document.getElementById("editUserPassLabel");

  if (!isNew) {
    const u = getUsersDB().find(x => x.id === id);
    if (!u) return;
    document.getElementById("editUserNombre").value = u.nombre;
    userField.value = u.user; userField.disabled = true;     // el usuario es su login: no se cambia
    passField.value = ""; passField.placeholder = "Dejar en blanco para no cambiarla";
    passLabel.textContent = "Contraseña (opcional)";
    document.getElementById("editUserRole").value = u.role;
    document.getElementById("editUserStatus").value = u.status;
  } else {
    document.getElementById("editUserNombre").value = "";
    userField.value = ""; userField.disabled = false;
    passField.value = ""; passField.placeholder = "Mínimo 6 caracteres";
    passLabel.textContent = "Contraseña";
    document.getElementById("editUserRole").value = "supervisor";
    document.getElementById("editUserStatus").value = "activo";
  }
  document.getElementById("modalUsuario").classList.remove("hidden");
}

function closeUserModal() {
  document.getElementById("modalUsuario").classList.add("hidden");
}

async function saveUserModal() {
  const id      = document.getElementById("editUserId").value;
  const nombre  = document.getElementById("editUserNombre").value.trim();
  const user    = document.getElementById("editUserUser").value.trim().toLowerCase();
  const pass    = document.getElementById("editUserPass").value.trim();
  const role    = document.getElementById("editUserRole").value;
  const status  = document.getElementById("editUserStatus").value;
  const errEl   = document.getElementById("modalUsuarioError");
  const btn     = document.getElementById("btnSaveUser");
  const fallo = (m) => { errEl.textContent = m; errEl.classList.remove("hidden"); };

  if (!nombre || !user || (!id && !pass)) return fallo("Nombre, usuario y contraseña son obligatorios.");
  if (!/^[a-z0-9._-]+$/.test(user)) return fallo("El usuario solo puede llevar letras, números, punto, guion y guion bajo.");
  if (pass && pass.length < 6) return fallo("La contraseña debe tener al menos 6 caracteres.");
  if (!id && getUsersDB().some(x => x.user === user)) return fallo("Ese usuario ya existe.");

  btn.disabled = true; btn.textContent = "Guardando…";
  try {
    if (id) await llamarAdminUsuarios({ action:"update", id, nombre, rol:role, estado:status, password: pass || undefined });
    else    await llamarAdminUsuarios({ action:"create", numero_empleado:user, nombre, password:pass, rol:role });
    closeUserModal();
    await cargarUsuarios();
    renderAdminUsers();
    renderAdminDashboard();
    toast("✅ Usuario guardado correctamente");
  } catch (e) {
    fallo(e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Guardar";
  }
}

async function toggleUserStatus(id) {
  const u = getUsersDB().find(x => x.id === id);
  if (!u) return;
  if (u.user === "admin") { toast("No puedes desactivar al administrador"); return; }
  const nuevo = u.status === "activo" ? "inactivo" : "activo";
  const { error } = await sb.from("perfiles").update({ estado: nuevo }).eq("id", id);
  if (error) { toast("No se pudo actualizar: " + error.message); return; }
  await cargarUsuarios();
  renderAdminUsers();
  renderAdminDashboard();
  toast(`Usuario ${nuevo === "activo" ? "activado" : "desactivado"}`);
}

async function deleteUser(id) {
  const u = getUsersDB().find(x => x.id === id);
  if (!u) return;
  if (u.user === "admin") { toast("No puedes eliminar al administrador"); return; }
  if (!confirm(`¿Eliminar a ${u.nombre}? Se borra también su avance. Esta acción no se puede deshacer.`)) return;
  try {
    await llamarAdminUsuarios({ action:"delete", id });
    await Promise.all([cargarUsuarios(), cargarProgresoTodos()]);
    renderAdminUsers();
    renderAdminDashboard();
    toast("🗑️ Usuario eliminado");
  } catch (e) { toast("No se pudo eliminar: " + e.message); }
}

document.getElementById("btnCancelUser").addEventListener("click", closeUserModal);
document.getElementById("btnSaveUser").addEventListener("click", saveUserModal);

// ── Empleados (lista provisional hasta conectar IntsegWeb) ──
let EMP_ADMIN = [];
let EMP_FILTRO = "";

async function renderAdminEmpleados(){
  const cont = document.getElementById("adminEmpleadosLista");
  if (!cont) return;
  const { data, error } = await sb.from("empleados").select("num,nombre,area,activo").order("nombre").limit(2000);
  if (error) { cont.innerHTML = `<div class="emptyState">No se pudo cargar la lista: ${error.message}</div>`; return; }
  EMP_ADMIN = data || [];
  pintarEmpleados();
}
function pintarEmpleados(){
  const cont = document.getElementById("adminEmpleadosLista");
  const q = EMP_FILTRO.toLowerCase();
  const activos = EMP_ADMIN.filter(e => e.activo).length;
  document.getElementById("adminEmpleadosResumen").textContent = `${EMP_ADMIN.length} empleados registrados · ${activos} activos`;
  const filas = EMP_ADMIN.filter(e => !q || e.nombre.toLowerCase().includes(q) || e.num.includes(q)).slice(0, 200);
  if (!EMP_ADMIN.length) { cont.innerHTML = `<div class="emptyState">Aún no hay empleados. Pega la lista de arriba para cargarla.</div>`; return; }
  cont.innerHTML = `<div class="userTable">
    <div class="userTable__head" style="grid-template-columns:100px 1fr 160px 90px"><div>No. empleado</div><div>Nombre</div><div>Área</div><div>Estado</div></div>
    ${filas.map(e => `<div class="userTable__row ${e.activo?"":"userTable__row--inactive"}" style="grid-template-columns:100px 1fr 160px 90px">
      <div>${e.num}</div><div>${e.nombre}</div><div>${e.area||"—"}</div>
      <div><span class="statusPill ${e.activo?"statusPill--active":"statusPill--inactive"}">${e.activo?"activo":"inactivo"}</span></div>
    </div>`).join("")}
  </div>${EMP_ADMIN.length > 200 ? `<div class="emptyState">Mostrando los primeros 200. Usa el buscador para ubicar a alguien.</div>` : ""}`;
}

// Importa líneas "numero,nombre,area" (también acepta tabulador o punto y coma, como al copiar de Excel)
async function importarEmpleados(){
  const txt = document.getElementById("empImportText").value;
  const desactivar = document.getElementById("empImportDesactivar").checked;
  const msg = document.getElementById("empImportMsg");
  const btn = document.getElementById("btnEmpImportar");
  const decir = (t, ok = false) => { msg.textContent = t; msg.className = "empImportMsg " + (ok ? "ok" : "mal"); };

  const mapa = new Map(); const ignoradas = [];
  txt.split(/\r?\n/).forEach((linea) => {
    if (!linea.trim()) return;
    const partes = linea.split(/[\t;,]/).map(s => s.trim());
    const num = (partes[0] || "").replace(/^0+/, "");
    if (!/^\d{1,10}$/.test(num) || !partes[1]) { ignoradas.push(linea); return; }
    mapa.set(num, { num, nombre: partes[1], area: partes[2] || null, activo: true, actualizado: new Date().toISOString() });
  });
  const filas = [...mapa.values()];
  if (!filas.length) return decir("No encontré filas válidas. Formato: número, nombre, área (una por línea).");

  btn.disabled = true; btn.textContent = "Importando…";
  try {
    for (let i = 0; i < filas.length; i += 400) {
      const { error } = await sb.from("empleados").upsert(filas.slice(i, i + 400), { onConflict: "num" });
      if (error) throw new Error(error.message);
    }
    let bajas = 0;
    if (desactivar) {
      const enLista = new Set(filas.map(f => f.num));
      const sobrantes = EMP_ADMIN.filter(e => e.activo && !enLista.has(e.num)).map(e => e.num);
      for (let i = 0; i < sobrantes.length; i += 400) {
        const { error } = await sb.from("empleados").update({ activo: false, actualizado: new Date().toISOString() }).in("num", sobrantes.slice(i, i + 400));
        if (error) throw new Error(error.message);
      }
      bajas = sobrantes.length;
    }
    document.getElementById("empImportText").value = "";
    await EMPLEADOS.cargar();
    await renderAdminEmpleados();
    decir(`Listo: ${filas.length} empleados cargados${bajas ? `, ${bajas} marcados como inactivos` : ""}${ignoradas.length ? `, ${ignoradas.length} líneas ignoradas` : ""}.`, true);
  } catch (e) {
    decir("No se pudo importar: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Importar lista";
  }
}
document.getElementById("btnEmpImportar")?.addEventListener("click", importarEmpleados);
document.getElementById("empBuscarAdmin")?.addEventListener("input", (e) => { EMP_FILTRO = e.target.value; pintarEmpleados(); });

function renderAdminCourses(){
  const keys=Object.keys(COURSE_CONTENT);
  let html="";
  keys.forEach(k=>{
    const c=COURSE_CONTENT[k];
    html+=`<div class="adminCourseCard">
      <div class="adminCourseCard__img"><img src="${c.img}" alt="${c.title}"/></div>
      <div class="adminCourseCard__body">
        <div class="adminCourseCard__badge">${c.badge}</div>
        <div class="adminCourseCard__title">${c.title}</div>
        <div class="adminCourseCard__meta">👤 ${c.instructor} &nbsp;|&nbsp; ⏱ ${c.duration}</div>
        <div class="adminCourseCard__desc">${c.desc}</div>
      </div>
      <div class="adminCourseCard__actions">
        <button class="btnEdit" onclick="openEditModal('${k}')">✏️ Editar</button>
        <button class="btnNavy" data-go="detail" data-course="${k}">Ver curso</button>
      </div>
    </div>`;
  });
  document.getElementById("adminCourseList").innerHTML=html;
}


function renderAdminEvals(){
  const keys=Object.keys(COURSE_CONTENT);
  const users=getUsersDB().filter(u=>u.role!=="admin");
  let rows=[];
  users.forEach(u=>{
    const prog=getAdminProgress(u.user);
    keys.forEach(k=>{
      if(prog[k]){
        const fecha=prog[k].date?new Date(prog[k].date):null;
        rows.push({nombre:u.nombre,curso:COURSE_CONTENT[k].title,score:prog[k].score,passed:prog[k].passed,fecha,date:fecha?fecha.toLocaleDateString("es-MX"):"—"});
      }
    });
  });
  rows.sort((a,b)=>(b.fecha||0)-(a.fecha||0));

  if(!rows.length){document.getElementById("adminEvalTable").innerHTML=`<div class="emptyState">Aún no hay evaluaciones registradas.</div>`;return;}

  let html=`<div class="evalTable">
    <div class="evalTable__head"><div>Usuario</div><div>Curso</div><div>Puntaje</div><div>Estado</div><div>Fecha</div></div>`;
  rows.forEach(r=>{
    html+=`<div class="evalTable__row">
      <div>${r.nombre}</div>
      <div class="evalTable__curso">${r.curso}</div>
      <div><strong>${r.score}/10</strong></div>
      <div><span class="statusBadge ${r.passed?"statusBadge--pass":"statusBadge--fail"}">${r.passed?"Aprobado":"No aprobado"}</span></div>
      <div>${r.date}</div>
    </div>`;
  });
  html+="</div>";
  document.getElementById("adminEvalTable").innerHTML=html;
}

// ── Editar curso ───────────────────────────────────────────
function openEditModal(key){
  const c=COURSE_CONTENT[key];
  document.getElementById("editCourseKey").value=key;
  document.getElementById("editTitle").value=c.title;
  document.getElementById("editBadge").value=c.badge;
  document.getElementById("editInstructor").value=c.instructor;
  document.getElementById("editDuration").value=c.duration;
  document.getElementById("editDesc").value=c.desc;
  document.getElementById("modalCurso").classList.remove("hidden");
}
function closeEditModal(){ document.getElementById("modalCurso").classList.add("hidden"); }
function saveEditModal(){
  const key=document.getElementById("editCourseKey").value;
  COURSE_CONTENT[key].title      = document.getElementById("editTitle").value.trim();
  COURSE_CONTENT[key].badge      = document.getElementById("editBadge").value.trim();
  COURSE_CONTENT[key].instructor = document.getElementById("editInstructor").value.trim();
  COURSE_CONTENT[key].duration   = document.getElementById("editDuration").value.trim();
  COURSE_CONTENT[key].desc       = document.getElementById("editDesc").value.trim();
  closeEditModal();
  renderAdminCourses();
  refreshCatalog();
  toast("✅ Curso actualizado correctamente");
}
document.getElementById("btnCancelEdit").addEventListener("click", closeEditModal);
document.getElementById("btnSaveEdit").addEventListener("click", saveEditModal);

// ── Admin tabs ─────────────────────────────────────────────
document.querySelectorAll(".adminTab").forEach(tab=>{
  tab.addEventListener("click",function(){
    document.querySelectorAll(".adminTab").forEach(t=>t.classList.remove("adminTab--active"));
    document.querySelectorAll(".adminTabContent").forEach(c=>c.classList.add("hidden"));
    this.classList.add("adminTab--active");
    document.getElementById("atab-"+this.dataset.atab).classList.remove("hidden");
  });
});

// ── Eventos generales ──────────────────────────────────────
document.addEventListener("click",e=>{
  const go=e.target.closest("[data-go]");
  if(go){
    const t=go.dataset.go,c=go.dataset.course;
    if(t==="detail"&&c){loadDetail(c);navigate("detail");}
    else if(t==="catalog"){refreshCatalog();navigate("catalog");}
    else if(t==="admin")navigate("admin");
    return;
  }
  const back=e.target.closest("[data-back]");
  if(back){
    const dest=back.dataset.back;
    if(dest==="catalog"){refreshCatalog();navigate("catalog");}
    else if(dest==="detail")navigate("detail");
    else if(dest==="trainer")TR.volver();
    else{refreshCatalog();navigate("catalog");}
    return;
  }
  if(e.target===document.getElementById("modalCurso")) closeEditModal();
});
document.getElementById("btnEval").addEventListener("click",startQuiz);
document.getElementById("btnNextQ").addEventListener("click",nextQuestion);
document.getElementById("btnRetry").addEventListener("click",()=>{loadDetail(currentCourseKey);navigate("detail");});
document.getElementById("btnLogin").addEventListener("click",doLogin);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.closest&&e.target.closest("#loginStaff"))doLogin();});
document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click",function(){
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("tab--active"));
    this.classList.add("tab--active");
    const f=this.dataset.filter;
    document.querySelectorAll("#courseList .courseCard").forEach(card=>{
      card.style.display=(f==="all"||card.dataset.status===f)?"":"none";
    });
  });
});
document.getElementById("searchInput").addEventListener("input",function(){
  const q=this.value.toLowerCase();
  document.querySelectorAll("#courseList .courseCard").forEach(card=>{
    const t=card.querySelector(".courseCard__title")?.textContent.toLowerCase()||"";
    card.style.display=t.includes(q)?"":"none";
  });
});




// ── Arranque: retoma la sesión del personal si ya estaba abierta ──
async function arranque(){
  try{
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;
    if(user){
      const { data: perfil } = await sb.from("perfiles").select("*").eq("id", user.id).maybeSingle();
      // Los guardias no conservan la sesión al recargar: se identifican de nuevo con número y foto
      if(perfil && perfil.rol!=="guardia" && perfil.estado==="activo"){
        await iniciarSesion(perfilAUsuario(perfil));
        return;
      }
      await sb.auth.signOut();
    }
  }catch(e){ console.error("arranque:", e); }
  navigate("login");
}
// Se espera a que carguen todos los scripts (capacitador.js, fichas.js, evidencias.js) antes de arrancar
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arranque);
else arranque();

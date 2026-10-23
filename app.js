/**
 * IntSeg Academy — app.js v3.0
 * Backend real: Supabase (Auth + Postgres + Storage + RLS)
 * Requiere config.js cargado ANTES de este archivo con SUPABASE_URL y SUPABASE_ANON_KEY.
 */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EMAIL_DOMINIO = "@intseg.local"; // login por número de empleado → email sintético


const COURSE_CONTENT = {
  dc3: {
    badge:"Certificación DC3",
    title:"Fundamento Legal de la Seguridad Privada",
    instructor:"Elly Escoto",
    duration:"2 horas",
    img:"avatar-guardia.png",
    pdf:"Fundamento_Legal.pdf",
    desc:"Conoce el marco normativo que regula la seguridad privada en México: leyes aplicables, uso de la fuerza, manejo de evidencia y responsabilidades del guardia.",
    modules:[
      { title:"Módulo 1 — ¿Por qué conocer el marco legal?", items:["Conocer y entender las leyes te ayuda a actuar de forma adecuada y justa.","Protege tanto a los ciudadanos como al propio guardia de consecuencias legales.","⚠️ La ley NO te exime de responsabilidad por desconocimiento."] },
      { title:"Módulo 2 — Legislación y regulaciones aplicables", items:["🔺 Constitución Política de los Estados Unidos Mexicanos (norma máxima).","Ley General del Sistema Nacional de Seguridad Pública.","Ley Federal de Seguridad Privada.","Ley Nacional del Uso de la Fuerza.","Reglamentos estatales y municipales.","Reglamento Interior de Trabajo — derechos y obligaciones del personal."] },
      { title:"Módulo 3 — Uso de la fuerza (Art. 11)", items:["Presencia de Autoridad: la sola presencia visible e identificable del guardia disuade conductas ilícitas.","El guardia debe mantener actitud profesional en todo momento.","Principios: Legalidad, Necesidad y Proporcionalidad.","PR-24 y gas chile: solo en caso de ABSOLUTA NECESIDAD cuando la integridad esté en riesgo."] },
      { title:"Módulo 4 — Manejo de evidencia e informes", items:["Cadena de custodia: mantener integridad y autenticidad de la evidencia.","Documenta: tipo de evidencia, fecha, hora, lugar y quien la recolectó.","El informe debe ser claro, conciso, formal y objetivo.","Adjunta fotografías, diagramas y registros pertinentes.","Resguarda en lugar seguro. Mantén absoluta discreción."] },
      { title:"Módulo 5 — Responsabilidades y sanciones", items:["Responsabilidad Civil: obligaciones frente a terceros por daños causados.","Responsabilidad Penal: infracciones que constituyen delitos (prisión o multas).","Responsabilidad Administrativa: infracciones a normas administrativas.","Las sanciones varían: multa, prisión o trabajo comunitario.","💡 Respetar y hacer respetar los derechos de las personas."] },
    ]
  },
  iso: {
    badge:"Certificación Internacional",
    title:"C-TPAT / OEA: Seguridad en la Cadena de Suministro",
    instructor:"Elly Escoto",
    duration:"4 horas",
    img:"cover-iso28001.jpg",
    pdf:"CTPAT_OEA.pdf",
    desc:"Estándares C-TPAT y OEA para asegurar la cadena de suministro. Inspección de vehículos, sellos, paquetes sospechosos y control de acceso.",
    modules:[
      { title:"Módulo 1 — ¿Qué es C-TPAT y OEA?", items:["C-TPAT: Asociación Comercial Contra el Terrorismo (programa de CBP/EE.UU.).","OEA: Operador Económico Autorizado, impulsado por la Organización Mundial de Aduanas (OMA).","Objetivo: asegurar la cadena de suministro desde el origen hasta el destino."] },
      { title:"Módulo 2 — Control de acceso de personas", items:["Todo visitante debe presentar identificación oficial vigente.","Visitantes extranjeros: ID oficial + Formato Migratorio Múltiple (FMM).","Registrar: nombre, empresa, hora de entrada/salida, motivo.","Conducta sospechosa: fotografías sin autorización, merodear sin destino."] },
      { title:"Módulo 3 — Recorridos perimetrales", items:["Verificar: barreras, puertas, estacionamientos, lámparas, cámaras y personas no autorizadas.","Principal herramienta de alerta: oído, olfato y vista.","Reportar de inmediato cualquier anomalía al supervisor."] },
      { title:"Módulo 4 — Inspección de vehículos y sellos", items:["Los vehículos de carga se inspeccionan en 17 puntos.","Método VVTT — Ver, Verificar, Tira, Torcer/Girar.","Señales de contaminación: olores inusuales, compartimentos ocultos, modificaciones.","El número de placas vigente NO es señal de contaminación."] },
      { title:"Módulo 5 — Paquetes y objetos sospechosos", items:["Señales: peso desproporcionado, olores químicos, embalaje en mal estado.","Ante paquete sospechoso: NO mover, NO abrir. Aislar y reportar.","Aplicar las 3 C: Confirmar, Comunicar, Controlar el perímetro."] },
    ]
  },
  aml: {
    badge:"Seguridad Patrimonial",
    title:"Seguridad Patrimonial",
    instructor:"Elly Escoto",
    duration:"2 horas",
    img:"cover-antilavado.jpg",
    pdf:"Seguridad_Patrimonial.pdf",
    desc:"Funciones del guardia: controles de acceso, rondines, reporte de incidentes, actos y condiciones inseguros, y manejo de emergencias.",
    modules:[
      { title:"Módulo 1 — Funciones principales del guardia", items:["1. Controles de acceso — registrar y autorizar entradas y salidas.","2. Revisiones — SOLO por consigna del cliente, nunca por iniciativa propia.","3. Rondines — observando, escuchando e identificando aromas extraños.","4. Reporte diario — fecha, hora, personas involucradas y medidas tomadas."] },
      { title:"Módulo 2 — Actos y condiciones inseguros", items:["Acto inseguro: acción del trabajador que representa riesgo (ignorar procedimientos, no usar EPP).","Condición insegura: situación del entorno que representa peligro.","Ejemplos: iluminación fallando, mallas rotas, cámaras fuera de servicio.","El guardia debe reportar ambos tipos al supervisor sin ignorarlos."] },
      { title:"Módulo 3 — Manejo de emergencias", items:["🔥 Incendio: revisar equipo, verificar rutas de evacuación, coordinar con emergencias (9-1-1).","📞 Extorsión: conservar calma, NO dar datos, colgar e informar al supervisor.","Los extorsionadores operan en horarios inhábiles: noches y fines de semana.","Número de emergencias: 9-1-1 y/o 089."] },
      { title:"Módulo 4 — Reporte de incidentes", items:["Todo incidente debe quedar documentado por escrito.","Incluir: fecha, hora, lugar, personas involucradas, descripción y medidas tomadas.","Usar lenguaje claro, objetivo, sin opiniones personales.","Entregar al supervisor al término del turno o de inmediato si es urgente."] },
    ]
  },
};

const QUIZZES = {
  dc3:[
    {q:"¿Qué establece la ley respecto al desconocimiento del marco legal?",opts:["Reduce la sanción si el guardia no sabía","Permite una advertencia antes de sancionar","No exime de responsabilidad por desconocerlo","Solo aplica a mandos superiores"],ans:2},
    {q:"¿Cuál es la norma de mayor jerarquía que regula la actuación del guardia?",opts:["Ley Federal de Seguridad Privada","Reglamento Interior de Trabajo","Constitución Política de los Estados Unidos Mexicanos","Reglamentos municipales"],ans:2},
    {q:"Según el Art. 11, ¿en qué consiste la 'Presencia de Autoridad'?",opts:["En intervenir físicamente ante cualquier amenaza","En la sola presencia visible, identificable y profesional del guardia para disuadir conductas ilícitas","En portar armamento visible en todo momento","En patrullar constantemente el perímetro"],ans:1},
    {q:"¿Bajo qué principios debe basarse el uso de la fuerza?",opts:["Discreción, rapidez y contundencia","Autoridad, disciplina y obediencia","Legalidad, necesidad y proporcionalidad","Prevención, detención y reporte"],ans:2},
    {q:"¿En qué caso se permite usar armas menos letales como el PR-24 o gas chile?",opts:["Ante cualquier persona que no obedezca","Cuando el supervisor lo autorice","Solo en caso de absoluta necesidad, cuando la integridad del guardia o de quienes cuida esté en riesgo","Durante rondines nocturnos"],ans:2},
    {q:"¿Qué tipo de responsabilidad implica causar daños y perjuicios a terceros?",opts:["Penal","Civil","Administrativa","Laboral"],ans:1},
    {q:"¿Qué tipo de responsabilidad se genera al infringir regulaciones administrativas?",opts:["Civil","Penal","Administrativa","Contractual"],ans:2},
    {q:"¿Qué es la cadena de custodia?",opts:["El protocolo de rondines perimetrales","El proceso para mantener integridad y autenticidad de la evidencia haciéndola admisible legalmente","El registro de entradas y salidas de visitantes","El sistema de comunicación entre supervisores"],ans:1},
    {q:"Al redactar un informe sobre evidencia, el guardia debe:",opts:["Usar lenguaje informal para mayor claridad","Resumir sin detalles para agilizar el proceso","Usar lenguaje formal y objetivo, describir detalladamente e incluir fotografías y registros","Esperar instrucciones del cliente antes de redactarlo"],ans:2},
    {q:"¿Cuál es la responsabilidad del guardia respecto a los derechos de las personas?",opts:["Aplicarlos solo con empleados del cliente","Conocerlos pero priorizando la seguridad del inmueble","Reportar cualquier violación sin intervenir","Respetar y hacer respetar los derechos de las personas en todo momento"],ans:3},
  ],
  iso:[
    {q:"¿Qué significa C-TPAT?",opts:["Certificación de Transporte y Prevención de Amenazas","Asociación Comercial Contra el Terrorismo","Control Total de Puertos y Aduanas de Tijuana","Código de Transporte Aduanal y Prevención"],ans:1},
    {q:"Al recibir a un visitante extranjero, el guardia debe solicitar:",opts:["Solo pasaporte vigente","ID oficial vigente y formato migratorio (FMM)","Carta de invitación de la empresa","Credencial de elector mexicana"],ans:1},
    {q:"¿Qué organismo internacional impulsa el programa OEA?",opts:["Organización de las Naciones Unidas (ONU)","Cámara Internacional de Comercio (ICC)","Organización Mundial de Aduanas (OMA)","Banco Mundial"],ans:2},
    {q:"¿Cuál es la principal responsabilidad del guardia en el contexto C-TPAT/OEA?",opts:["Verificar documentos de importación","Alerta mediante oído, olfato y vista","Operar el sistema de cámaras CCTV","Coordinar con agentes aduanales"],ans:1},
    {q:"Durante un recorrido perimetral, el guardia debe verificar:",opts:["Solo el área de carga y descarga","Únicamente las cámaras de seguridad","Barreras, puertas, estacionamientos, lámparas, cámaras y personas sospechosas","El inventario de mercancía en bodega"],ans:2},
    {q:"¿Cuál es el método correcto para inspeccionar sellos de seguridad?",opts:["PASS (Pull, Aim, Squeeze, Sweep)","VVTT (Ver, Verificar, Tira, Torcer/Girar)","LINCE (Localizar, Inspeccionar, Notificar, Confirmar, Evaluar)","RAPID (Revisar, Analizar, Prevenir, Informar, Documentar)"],ans:1},
    {q:"¿Cuántos puntos comprende la inspección de un vehículo de carga?",opts:["7 puntos","12 puntos","17 puntos","21 puntos"],ans:2},
    {q:"¿Cuál de estas opciones NO es señal de posible contaminación en un vehículo?",opts:["Olores inusuales o químicos","Compartimentos ocultos o modificaciones","Número de placas vigente y en regla","Inconsistencias en el sello o precinto"],ans:2},
    {q:"¿Cómo se puede identificar un paquete sospechoso?",opts:["Por el color del embalaje","Por su lugar de origen solamente","Por peso desproporcionado y olores químicos inusuales","Por el número de etiquetas que tiene"],ans:2},
    {q:"¿Qué conducta hace sospechosa a una persona en instalaciones protegidas?",opts:["Usar uniforme de trabajo","Entrar por el acceso principal","Tomar fotografías o videos sin autorización","Preguntar por el supervisor de turno"],ans:2},
  ],
  aml:[
    {q:"¿Cuáles son las 4 funciones principales del guardia de seguridad patrimonial?",opts:["Investigar, arrestar, perseguir, reportar","Controles de acceso, revisiones, rondines y reporte diario","Monitorear CCTV, atender visitantes, abrir puertas, notificar","Escoltar, registrar, asegurar y comunicar"],ans:1},
    {q:"¿Cuándo puede el guardia realizar revisiones a personas o vehículos?",opts:["Cuando lo considere necesario","En cualquier momento del turno","Solo por consigna del cliente","Solo cuando haya sospecha de delito"],ans:2},
    {q:"Durante un rondín, el guardia debe:",opts:["Caminar lo más rápido posible","Mantenerse solo en el perímetro exterior","Observar, escuchar e identificar aromas extraños","Evitar acercarse a áreas oscuras"],ans:2},
    {q:"¿Qué es un acto inseguro?",opts:["Una falla en el equipo electrónico","Una condición ambiental de riesgo","Una acción del trabajador que representa riesgo, como ignorar procedimientos o no usar EPP","Un incidente ya ocurrido"],ans:2},
    {q:"¿Cuál es un ejemplo de condición insegura que el guardia debe reportar?",opts:["Un visitante que llegó tarde","Una cámara fuera de servicio o malla perimetral rota","Un vehículo en zona permitida","Un empleado en horas extras"],ans:1},
    {q:"Ante un conato de incendio, el guardia debe:",opts:["Evacuar sin avisar a nadie","Intentar apagarlo solo","Revisar equipo, verificar salidas y coordinar con emergencias","Esperar instrucciones del cliente"],ans:2},
    {q:"Ante una llamada de extorsión, el guardia debe:",opts:["Negociar con el extorsionador","Transferir al área de finanzas","Conservar la calma, no dar datos, colgar e informar al supervisor","Grabar sin informar a nadie"],ans:2},
    {q:"¿En qué horarios suelen operar los extorsionadores?",opts:["Horarios de oficina de 9 a 5","Solo en días festivos","En horarios inhábiles: noches y fines de semana","Durante cambios de turno"],ans:2},
    {q:"¿Qué información debe incluir el reporte diario del guardia?",opts:["Solo los incidentes graves","Fecha, hora, personas involucradas y medidas tomadas","Solo entradas y salidas de vehículos","El número de visitantes y sus nombres"],ans:1},
    {q:"¿Cuál es el número de emergencias al que debe reportar el guardia?",opts:["800-911-2000","070","9-1-1 (y/o 089)","55-5588-4444"],ans:2},
  ],
};
// ── Estado ─────────────────────────────────────────────────
let currentUser = null;       // {id, numero_empleado, nombre, rol, estado}
let currentCourseKey = null;
let quizState = {};
let progresoCache = {};       // {curso_key: {passed,score,date}} del usuario actual
let guardiasCache = [];       // [{id,nombre,numero_empleado}] rol=guardia
let usersCache = [];          // todos los perfiles (para el panel admin)

// ── Helper: llamar Edge Functions con el token de sesión ────
async function callEdgeFunction(fnName, body){
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  });
  const json = await resp.json().catch(()=>({}));
  if(!resp.ok) throw new Error(json.error || "Error del servidor");
  return json;
}

// ── Navegación ─────────────────────────────────────────────
function navigate(name) {
  ["viewLogin","viewCatalog","viewDetail","viewAdmin","viewQuiz","viewResult","viewEvidencias"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.add("hidden");
  });
  document.getElementById("appShell").classList.add("hidden");
  if(name==="login"){document.getElementById("viewLogin").classList.remove("hidden");return;}
  document.getElementById("appShell").classList.remove("hidden");
  document.getElementById("sidebar").classList.remove("hidden");
  const map={catalog:"viewCatalog",detail:"viewDetail",admin:"viewAdmin",quiz:"viewQuiz",result:"viewResult",evidencias:"viewEvidencias"};
  if(map[name]) document.getElementById(map[name]).classList.remove("hidden");
  document.querySelectorAll(".sidebar__item").forEach(i=>i.classList.remove("active"));
  if(name==="catalog"){document.getElementById("sideInicio")?.classList.add("active");document.getElementById("sideCursos")?.classList.add("active");}
  if(name==="admin"){document.getElementById("sideAdmin")?.classList.add("active");}
  if(name==="evidencias"){document.getElementById("sideEvidencias")?.classList.add("active");}
  if(name==="admin") renderAdmin();
  if(name==="evidencias") renderEvidencias();
  window.scrollTo(0,0);
}

// ── Toast ──────────────────────────────────────────────────
let _tt=null;
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg;el.classList.remove("hidden");
  if(_tt)clearTimeout(_tt);_tt=setTimeout(()=>el.classList.add("hidden"),2500);
}

// ── Login / Logout ───────────────────────────────────────────
async function doLogin(){
  const u=document.getElementById("inputUser").value.trim().toLowerCase();
  const p=document.getElementById("inputPass").value.trim();
  const err=document.getElementById("loginError");
  const btn=document.getElementById("btnLogin");
  if(!u||!p) return;

  err.classList.add("hidden");
  btn.disabled=true; btn.textContent="Ingresando…";

  const { data, error } = await sb.auth.signInWithPassword({ email: u+EMAIL_DOMINIO, password:p });

  if(error || !data?.user){
    btn.disabled=false; btn.textContent="Ingresar";
    err.textContent="Usuario o contraseña incorrectos.";
    err.classList.remove("hidden"); setTimeout(()=>err.classList.add("hidden"),3000);
    return;
  }

  const { data: perfil, error: perfilErr } = await sb.from("perfiles").select("*").eq("id", data.user.id).single();
  btn.disabled=false; btn.textContent="Ingresar";

  if(perfilErr || !perfil){
    err.textContent="No se encontró el perfil de este usuario. Contacta al administrador.";
    err.classList.remove("hidden");
    await sb.auth.signOut();
    return;
  }
  if(perfil.estado==="inactivo"){
    err.textContent="Cuenta desactivada. Contacta al administrador.";
    err.classList.remove("hidden"); setTimeout(()=>err.classList.add("hidden"),4000);
    await sb.auth.signOut();
    return;
  }

  currentUser = perfil;
  await cargarProgresoUsuario();
  refreshCatalog();
  applyRoleVisibility();
  if(perfil.rol==="admin"||perfil.rol==="maestro") navigate("admin");
  else if(perfil.rol==="supervisor") navigate("evidencias");
  else navigate("catalog");
}

function applyRoleVisibility(){
  const canSeeEvid = currentUser && ["admin","maestro","supervisor"].includes(currentUser.rol);
  document.querySelectorAll(".role-evid").forEach(el=> el.classList.toggle("hidden", !canSeeEvid));
}

async function doLogout(){
  await sb.auth.signOut();
  currentUser=null;currentCourseKey=null;progresoCache={};
  document.getElementById("inputUser").value="";
  document.getElementById("inputPass").value="";
  navigate("login");
}

// ── Progreso (backend real) ─────────────────────────────────
async function cargarProgresoUsuario(){
  progresoCache = {};
  const { data, error } = await sb.from("progreso").select("*").eq("guardia_id", currentUser.id);
  if(error) return;
  (data||[]).forEach(r=>{ progresoCache[r.curso_key] = { passed:r.passed, score:r.score, date:r.fecha }; });
}
function getProgress(courseKey){ return progresoCache[courseKey] || null; }
function getAllProgress(){ return progresoCache; }
async function saveProgress(courseKey, passed, score){
  progresoCache[courseKey] = { passed, score, date: new Date().toISOString() };
  const { error } = await sb.from("progreso").upsert(
    { guardia_id: currentUser.id, curso_key: courseKey, score, passed, fecha: new Date().toISOString() },
    { onConflict: "guardia_id,curso_key" }
  );
  if(error) console.error("saveProgress:", error.message);
}

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
      card.dataset.status="new";
      if(bar)bar.style.width="0%";
      if(txt)txt.textContent="Sin iniciar";
    }
  });
}

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

  const pdfBtn = document.getElementById("btnVerPDF");
  if(c.pdf){ pdfBtn.href = c.pdf; pdfBtn.classList.remove("hidden"); }
  else pdfBtn.classList.add("hidden");

  const container=document.getElementById("moduleList");
  container.innerHTML="";
  c.modules.forEach(mod=>{
    const wrap=document.createElement("div");wrap.className="accordion";
    const header=document.createElement("button");header.className="accordion__header";
    header.innerHTML=`<div class="accordion__left"><span class="checkDot"><svg viewBox="0 0 24 24" class="icon"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5L9 16.2z"/></svg></span><span>${mod.title}</span></div><span class="accordion__chevron">›</span>`;
    const body=document.createElement("div");body.className="accordion__body";
    const ul=document.createElement("ul");ul.className="accordion__list";
    mod.items.forEach(item=>{const li=document.createElement("li");li.textContent=item;ul.appendChild(li);});
    body.appendChild(ul);
    header.addEventListener("click",()=>{
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
function startQuiz(){
  const key=currentCourseKey;
  if(!key||!QUIZZES[key]){toast("Quiz no disponible");return;}
  const pool=[...QUIZZES[key]].sort(()=>Math.random()-.5).slice(0,10);
  quizState={questions:pool,current:0,answers:[],score:0,courseKey:key};
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
}
function selectAnswer(idx){
  const q=quizState.questions[quizState.current];
  document.querySelectorAll(".quizOption").forEach((btn,i)=>{
    btn.disabled=true;
    if(i===q.ans)btn.classList.add("quizOption--correct");
    else if(i===idx&&idx!==q.ans)btn.classList.add("quizOption--wrong");
  });
  if(idx===q.ans)quizState.score++;
  quizState.answers.push(idx);
  const btnNext=document.getElementById("btnNextQ");
  btnNext.classList.remove("hidden");
  btnNext.textContent=quizState.current+1<quizState.questions.length?"Siguiente →":"Ver resultados";
}
async function nextQuestion(){
  quizState.current++;
  if(quizState.current<quizState.questions.length)renderQuestion();else await showResult();
}
async function showResult(){
  const{score,questions,courseKey}=quizState;const total=questions.length;
  const passed=score>=Math.ceil(total*.8);const pct=Math.round((score/total)*100);
  await saveProgress(courseKey,passed,score);
  document.getElementById("resultIcon").textContent=passed?"🏅":"📋";
  document.getElementById("resultTitle").textContent=passed?"¡Aprobado!":"No aprobado";
  document.getElementById("resultScore").textContent=`${score} / ${total} correctas (${pct}%)`;
  document.getElementById("resultMsg").textContent=passed?"Felicidades. Has superado la evaluación con éxito.":"Necesitas mínimo 8 respuestas correctas (80%). Repasa el material e inténtalo de nuevo.";
  document.getElementById("resultBarFill").style.width=pct+"%";
  document.getElementById("resultBarFill").style.background=passed?"#22c55e":"#f97316";
  document.getElementById("btnRetry").style.display=passed?"none":"block";
  navigate("result");refreshCatalog();
}

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
function renderAdmin(){
  renderAdminDashboard();
  renderAdminUsers();
  renderAdminCourses();
  renderAdminEvals();
}

async function renderAdminDashboard(){
  const keys=Object.keys(COURSE_CONTENT);
  const { data: perfiles } = await sb.from("perfiles").select("*").neq("rol","admin");
  const { data: progresoAll } = await sb.from("progreso").select("*");
  const allUsers = perfiles||[];
  const progRows = progresoAll||[];

  const totalEvals = progRows.length;
  const totalPassed = progRows.filter(r=>r.passed).length;
  const scores = progRows.map(r=>r.score);
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
    const passed=progRows.filter(r=>r.curso_key===k && r.passed).length;
    const pct= allUsers.length? Math.round((passed/allUsers.length)*100):0;
    html+=`<div class="courseStatRow">
      <div class="courseStatName">${c.title}</div>
      <div class="courseStatBar"><div class="courseStatFill" style="width:${pct}%"></div></div>
      <div class="courseStatPct">${passed}/${allUsers.length} aprobaron (${pct}%)</div>
    </div>`;
  });
  document.getElementById("adminCourseStats").innerHTML=html;
}

// ── Usuarios ────────────────────────────────────────────────
async function renderAdminUsers(){
  const keys = Object.keys(COURSE_CONTENT);
  const { data: users, error } = await sb.from("perfiles").select("*").order("created_at");
  if(error){ document.getElementById("adminUserTable").innerHTML = `<div class="emptyState">Error al cargar usuarios: ${error.message}</div>`; return; }
  usersCache = users||[];
  guardiasCache = usersCache.filter(u=>u.rol==="guardia");

  const { data: progresoAll } = await sb.from("progreso").select("*");
  const progRows = progresoAll||[];

  let html = `<div class="userTable">
    <div class="userTable__head">
      <div>Nombre</div><div>No. Empleado</div><div>Rol</div><div>Estado</div>
      ${keys.map(k=>`<div>${COURSE_CONTENT[k].badge.replace("Certificación ","").replace("Seguridad Patrimonial","Patrimonial")}</div>`).join("")}
      <div>Acciones</div>
    </div>`;

  usersCache.forEach(u => {
    const prog = {};
    progRows.filter(r=>r.guardia_id===u.id).forEach(r=>{ prog[r.curso_key]={passed:r.passed, score:r.score}; });
    html += `<div class="userTable__row ${u.estado==='inactivo'?'userTable__row--inactive':''}">
      <div class="userTable__name">
        <span class="userAvatar ${u.estado==='inactivo'?'userAvatar--inactive':''}">${u.nombre.charAt(0)}</span>
        <span>${u.nombre}</span>
      </div>
      <div style="font-size:12px;color:#6b7280">${u.numero_empleado}</div>
      <div><span class="roleBadge roleBadge--${u.rol}">${u.rol}</span></div>
      <div><span class="statusPill ${u.estado==='activo'?'statusPill--active':'statusPill--inactive'}">${u.estado}</span></div>
      ${keys.map(k=>{
        const p = prog[k];
        if(!p) return `<div class="progCell progCell--none">—</div>`;
        return `<div class="progCell ${p.passed?"progCell--pass":"progCell--fail"}">${p.passed?"✅":"❌"} ${p.score}/10</div>`;
      }).join("")}
      <div class="actionBtns">
        <button class="btnAction btnAction--edit" onclick="openUserModal('${u.id}')">✏️</button>
        <button class="btnAction ${u.estado==='activo'?'btnAction--deact':'btnAction--act'}" onclick="toggleUserStatus('${u.id}')">${u.estado==='activo'?'🔒':'🔓'}</button>
        ${u.rol!=='admin'?`<button class="btnAction btnAction--del" onclick="deleteUser('${u.id}')">🗑️</button>`:''}
      </div>
    </div>`;
  });
  html += "</div>";
  document.getElementById("adminUserTable").innerHTML = html;
}

function openUserModal(id) {
  const isNew = !id;
  document.getElementById("modalUsuarioTitle").textContent = isNew ? "Nuevo usuario" : "Editar usuario";
  document.getElementById("editUserId").value = id || "";
  document.getElementById("modalUsuarioError").classList.add("hidden");
  const passField = document.getElementById("editUserPass");
  const passLabel = document.getElementById("editUserPassLabel");
  const userField = document.getElementById("editUserUser");

  if (!isNew) {
    const u = usersCache.find(x => x.id === id);
    if (!u) return;
    document.getElementById("editUserNombre").value = u.nombre;
    userField.value = u.numero_empleado;
    userField.disabled = true;
    document.getElementById("editUserRole").value = u.rol;
    document.getElementById("editUserStatus").value = u.estado;
    passField.value=""; passField.placeholder="Dejar en blanco para no cambiarla";
    passLabel.textContent = "Contraseña (opcional)";
  } else {
    document.getElementById("editUserNombre").value = "";
    userField.value = ""; userField.disabled = false;
    document.getElementById("editUserRole").value = "guardia";
    document.getElementById("editUserStatus").value = "activo";
    passField.value=""; passField.placeholder="Mínimo 6 caracteres";
    passLabel.textContent = "Contraseña";
  }
  document.getElementById("modalUsuario").classList.remove("hidden");
}

function closeUserModal() { document.getElementById("modalUsuario").classList.add("hidden"); }

async function saveUserModal() {
  const id      = document.getElementById("editUserId").value;
  const nombre  = document.getElementById("editUserNombre").value.trim();
  const numero_empleado = document.getElementById("editUserUser").value.trim().toLowerCase();
  const password = document.getElementById("editUserPass").value.trim();
  const rol     = document.getElementById("editUserRole").value;
  const estado  = document.getElementById("editUserStatus").value;
  const errEl   = document.getElementById("modalUsuarioError");
  const btn     = document.getElementById("btnSaveUser");

  if (!nombre || !numero_empleado || (!id && !password)) {
    errEl.textContent = "Nombre, número de empleado y contraseña son obligatorios.";
    errEl.classList.remove("hidden"); return;
  }
  if (password && password.length < 6) {
    errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
    errEl.classList.remove("hidden"); return;
  }

  btn.disabled=true; btn.textContent="Guardando…";
  try{
    if(id){
      await callEdgeFunction("admin-users", { action:"update", id, nombre, rol, estado, password: password||undefined });
    } else {
      await callEdgeFunction("admin-users", { action:"create", numero_empleado, nombre, password, rol });
    }
    closeUserModal();
    await renderAdminUsers();
    toast("✅ Usuario guardado correctamente");
  }catch(e){
    errEl.textContent = e.message;
    errEl.classList.remove("hidden");
  }finally{
    btn.disabled=false; btn.textContent="Guardar";
  }
}

async function toggleUserStatus(id){
  const u = usersCache.find(x=>x.id===id);
  if(!u) return;
  const nuevo = u.estado==="activo" ? "inactivo" : "activo";
  const { error } = await sb.from("perfiles").update({ estado: nuevo }).eq("id", id);
  if(error){ toast("Error al actualizar estado: "+error.message); return; }
  await renderAdminUsers();
  toast(nuevo==="activo" ? "Usuario activado" : "Usuario desactivado");
}

async function deleteUser(id){
  if(!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
  try{
    await callEdgeFunction("admin-users", { action:"delete", id });
    await renderAdminUsers();
    toast("Usuario eliminado");
  }catch(e){ toast("Error: "+e.message); }
}

// ── Evaluaciones (tab admin) ─────────────────────────────────
async function renderAdminEvals(){
  const { data: rows, error } = await sb.from("progreso")
    .select("*, perfiles!progreso_guardia_id_fkey(nombre,numero_empleado)")
    .order("fecha", { ascending:false });
  const cont=document.getElementById("adminEvalTable");
  if(error){ cont.innerHTML=`<div class="emptyState">Error al cargar evaluaciones.</div>`; return; }
  if(!rows || !rows.length){ cont.innerHTML=`<div class="emptyState">Aún no hay evaluaciones registradas.</div>`; return; }

  let html = `<div class="userTable">
    <div class="userTable__head"><div>Guardia</div><div>Curso</div><div>Calif.</div><div>Estado</div><div>Fecha</div></div>`;
  rows.forEach(r=>{
    const nombre = r.perfiles?.nombre || "—";
    const cursoTitle = COURSE_CONTENT[r.curso_key]?.title || r.curso_key;
    html+=`<div class="userTable__row">
      <div>${nombre}</div>
      <div>${cursoTitle}</div>
      <div><strong>${r.score}/10</strong></div>
      <div><span class="statusBadge ${r.passed?"statusBadge--pass":"statusBadge--fail"}">${r.passed?"Aprobado":"No aprobado"}</span></div>
      <div>${new Date(r.fecha).toLocaleDateString()}</div>
    </div>`;
  });
  html+="</div>";
  cont.innerHTML = html;
}

// ── Cursos (edición en memoria — fase 2 los mueve a la BD) ──
function renderAdminCourses(){
  const keys=Object.keys(COURSE_CONTENT);
  document.getElementById("adminCourseList").innerHTML = keys.map(k=>{
    const c=COURSE_CONTENT[k];
    return `<div class="userTable__row" style="grid-template-columns:2fr 1fr 1fr auto">
      <div><strong>${c.title}</strong><div style="font-size:12px;color:#6b7280">${c.badge}</div></div>
      <div>${c.instructor}</div>
      <div>${c.duration}</div>
      <div class="actionBtns"><button class="btnAction btnAction--edit" onclick="openEditModal('${k}')">✏️</button></div>
    </div>`;
  }).join("");
}

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
  toast("✅ Curso actualizado correctamente (solo en esta sesión — fase 2 lo guarda en la base de datos)");
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

// ══════════════════════════════════════════════════════════
// EVIDENCIAS DE CAPACITACIÓN (Supervisor / Admin) — Supabase Storage + tabla
// ══════════════════════════════════════════════════════════
let evidSelectedGuardia=null;

async function cargarGuardias(){
  const { data } = await sb.from("perfiles").select("id,nombre,numero_empleado").eq("rol","guardia").order("nombre");
  guardiasCache = data||[];
  return guardiasCache;
}

function evidIcon(tipo){
  return {Foto:"📷",Video:"🎥",PDF:"📄","Lista de asistencia":"📋"}[tipo]||"📁";
}

async function renderEvidencias(){
  const users = await cargarGuardias();
  const sel=document.getElementById("evidGuardiaSelect");
  const prevVal=evidSelectedGuardia||sel.value;
  sel.innerHTML = users.length
    ? users.map(u=>`<option value="${u.id}">${u.nombre} (${u.numero_empleado})</option>`).join("")
    : `<option value="">— No hay guardias registrados —</option>`;
  if(prevVal && users.find(u=>u.id===prevVal)) sel.value=prevVal;
  evidSelectedGuardia = sel.value;
  await renderEvidHistorial();
}

async function renderEvidHistorial(){
  const guardiaId=document.getElementById("evidGuardiaSelect").value;
  evidSelectedGuardia=guardiaId;
  const cont=document.getElementById("evidHistorial");
  if(!guardiaId){ cont.innerHTML=`<div class="emptyState">No hay guardias registrados todavía.</div>`; return; }
  cont.innerHTML = `<div class="emptyState">Cargando…</div>`;

  const { data: all, error } = await sb.from("evidencias")
    .select("*, autor:perfiles!evidencias_subido_por_fkey(nombre)")
    .eq("guardia_id", guardiaId)
    .order("fecha", { ascending:false });

  if(error){ cont.innerHTML=`<div class="emptyState">Error al cargar evidencias: ${error.message}</div>`; return; }
  if(!all || !all.length){ cont.innerHTML = `<div class="emptyState">Sin evidencias registradas para este elemento.</div>`; return; }

  const isAdmin = currentUser?.rol==="admin";
  cont.innerHTML = all.map(e=>`
    <div class="evidCard">
      <div class="evidCard__icon">${evidIcon(e.tipo_evidencia)}</div>
      <div class="evidCard__body">
        <div class="evidCard__title">${e.tipo_entrenamiento}</div>
        <div class="evidCard__meta">${e.tipo_evidencia} · ${e.fecha} · subido por ${e.autor?.nombre||"—"}</div>
        ${e.notas?`<div class="evidCard__notas">${e.notas}</div>`:""}
      </div>
      <div class="evidCard__actions">
        <button class="btnAction" title="Descargar archivo" onclick="verEvidencia('${e.id}','${e.archivo_path}','${(e.archivo_nombre||'').replace(/'/g,"\\'")}')">⬇️</button>
        ${isAdmin?`<button class="btnAction btnAction--del" title="Eliminar" onclick="eliminarEvidencia('${e.id}','${e.archivo_path}')">🗑️</button>`:""}
      </div>
    </div>`).join("");
}

async function verEvidencia(id, path, fileName){
  const { data, error } = await sb.storage.from("evidencias").download(path);
  if(error || !data){ toast("No se pudo descargar el archivo"); return; }
  const url=URL.createObjectURL(data);
  const a=document.createElement("a"); a.href=url; a.download=fileName||"evidencia";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}

async function eliminarEvidencia(id, path){
  if(!confirm("¿Eliminar esta evidencia? Esta acción no se puede deshacer.")) return;
  await sb.storage.from("evidencias").remove([path]);
  const { error } = await sb.from("evidencias").delete().eq("id", id);
  if(error){ toast("Error al eliminar: "+error.message); return; }
  await renderEvidHistorial();
  toast("Evidencia eliminada");
}

async function openEvidModal(){
  const users = guardiasCache.length ? guardiasCache : await cargarGuardias();
  if(!users.length){ toast("Primero registra al menos un guardia en Admin → Usuarios"); return; }
  document.getElementById("evidModalError").classList.add("hidden");
  document.getElementById("evidEntrenamiento").value="";
  document.getElementById("evidTipo").value="Foto";
  document.getElementById("evidFecha").value=new Date().toISOString().slice(0,10);
  document.getElementById("evidNotas").value="";
  document.getElementById("evidArchivo").value="";
  const selModal=document.getElementById("evidModalGuardia");
  selModal.innerHTML = users.map(u=>`<option value="${u.id}">${u.nombre} (${u.numero_empleado})</option>`).join("");
  selModal.value = evidSelectedGuardia || users[0]?.id || "";
  document.getElementById("modalEvidencia").classList.remove("hidden");
}
function closeEvidModal(){ document.getElementById("modalEvidencia").classList.add("hidden"); }

async function saveEvidModal(){
  const guardiaId=document.getElementById("evidModalGuardia").value;
  const entrenamiento=document.getElementById("evidEntrenamiento").value.trim();
  const tipo=document.getElementById("evidTipo").value;
  const fecha=document.getElementById("evidFecha").value;
  const notas=document.getElementById("evidNotas").value.trim();
  const file=document.getElementById("evidArchivo").files[0];
  const errEl=document.getElementById("evidModalError");
  const btn=document.getElementById("btnSaveEvid");

  if(!guardiaId||!entrenamiento||!fecha||!file){
    errEl.textContent="Elemento, tipo de entrenamiento, fecha y archivo son obligatorios.";
    errEl.classList.remove("hidden"); return;
  }
  if(file.size > 50*1024*1024){
    errEl.textContent="El archivo no debe superar 50 MB.";
    errEl.classList.remove("hidden"); return;
  }

  btn.disabled=true; btn.textContent="Guardando…";
  const path = `${guardiaId}/${Date.now()}_${file.name}`.replace(/[^a-zA-Z0-9._/-]/g,"_");

  const { error: upErr } = await sb.storage.from("evidencias").upload(path, file);
  if(upErr){
    btn.disabled=false; btn.textContent="Guardar evidencia";
    errEl.textContent="No se pudo subir el archivo: "+upErr.message;
    errEl.classList.remove("hidden"); return;
  }

  const { error: insErr } = await sb.from("evidencias").insert({
    guardia_id: guardiaId,
    subido_por: currentUser.id,
    tipo_entrenamiento: entrenamiento,
    tipo_evidencia: tipo,
    fecha, notas,
    archivo_path: path,
    archivo_nombre: file.name
  });
  btn.disabled=false; btn.textContent="Guardar evidencia";

  if(insErr){
    await sb.storage.from("evidencias").remove([path]);
    errEl.textContent="No se pudo registrar la evidencia: "+insErr.message;
    errEl.classList.remove("hidden"); return;
  }

  closeEvidModal();
  document.getElementById("evidGuardiaSelect").value=guardiaId;
  await renderEvidHistorial();
  toast("✅ Evidencia guardada correctamente");
}

async function descargarExpediente(){
  const guardiaId=document.getElementById("evidGuardiaSelect").value;
  const guardia = guardiasCache.find(g=>g.id===guardiaId);
  const { data: evid, error } = await sb.from("evidencias")
    .select("*, autor:perfiles!evidencias_subido_por_fkey(nombre)")
    .eq("guardia_id", guardiaId);

  if(error || !evid || !evid.length){ toast("Este elemento no tiene evidencias registradas"); return; }
  if(typeof JSZip==="undefined"){ toast("No se pudo cargar el generador de ZIP. Revisa tu conexión."); return; }

  toast("Generando expediente…");
  const zip=new JSZip();
  let manifest = `Expediente de capacitación — ${guardia?.nombre||guardiaId}\nGenerado: ${new Date().toLocaleString()}\n\n`;
  for(const e of evid){
    const { data: blob } = await sb.storage.from("evidencias").download(e.archivo_path);
    const safeName = `${e.fecha}_${e.tipo_evidencia}_${e.archivo_nombre}`.replace(/[\\/:*?"<>|]/g,"_");
    if(blob) zip.file(safeName, blob);
    manifest += `- ${e.fecha} | ${e.tipo_evidencia} | ${e.tipo_entrenamiento} | subido por ${e.autor?.nombre||"—"}${e.notas?" | "+e.notas:""}\n`;
  }
  zip.file("expediente.txt", manifest);
  const content = await zip.generateAsync({type:"blob"});
  const url=URL.createObjectURL(content);
  const a=document.createElement("a");
  a.href=url; a.download=`Expediente_${(guardia?.numero_empleado||guardiaId)}.zip`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}

document.getElementById("evidGuardiaSelect")?.addEventListener("change", renderEvidHistorial);
document.getElementById("btnNuevaEvidencia")?.addEventListener("click", openEvidModal);
document.getElementById("btnCancelEvid")?.addEventListener("click", closeEvidModal);
document.getElementById("btnSaveEvid")?.addEventListener("click", saveEvidModal);
document.getElementById("btnDescargarExpediente")?.addEventListener("click", descargarExpediente);

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
    else{refreshCatalog();navigate("catalog");}
    return;
  }
  if(e.target===document.getElementById("modalCurso")) closeEditModal();
  if(e.target===document.getElementById("modalEvidencia")) closeEvidModal();
  if(e.target===document.getElementById("modalUsuario")) closeUserModal();
});
document.getElementById("btnEval").addEventListener("click",startQuiz);
document.getElementById("btnNextQ").addEventListener("click",nextQuestion);
document.getElementById("btnRetry").addEventListener("click",()=>{loadDetail(currentCourseKey);navigate("detail");});
document.getElementById("btnLogin").addEventListener("click",doLogin);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&!document.getElementById("viewLogin").classList.contains("hidden"))doLogin();});
document.getElementById("btnCancelUser")?.addEventListener("click", closeUserModal);
document.getElementById("btnSaveUser")?.addEventListener("click", saveUserModal);
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

// ── Arranque: si ya había sesión activa (recargó la página), retómala ──
(async function boot(){
  const { data: sessionData } = await sb.auth.getSession();
  if(sessionData?.session?.user){
    const { data: perfil } = await sb.from("perfiles").select("*").eq("id", sessionData.session.user.id).single();
    if(perfil && perfil.estado==="activo"){
      currentUser = perfil;
      await cargarProgresoUsuario();
      refreshCatalog();
      applyRoleVisibility();
      if(perfil.rol==="admin"||perfil.rol==="maestro") return navigate("admin");
      if(perfil.rol==="supervisor") return navigate("evidencias");
      return navigate("catalog");
    }
  }
  navigate("login");
})();

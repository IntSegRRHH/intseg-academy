/**
 * IntSeg Academy — bitacora.js
 * Bitácora de actividad (Admin → Bitácora): quién hizo qué y cuándo.
 * Los cambios en cursos, instructores, usuarios, evidencias y sesiones los registra la base de
 * datos con triggers (migración 005). Aquí se consulta y exporta, y se envían los eventos que
 * la base no ve (inicio y cierre de sesión, descargas de expedientes y de evidencias, cargas masivas).
 * Depende de: datos.js (sb), app.js (toast, currentUser).
 */

// Envía un evento a la bitácora. Nunca interrumpe la app: si falla, solo avisa en consola.
async function registrarEvento(accion, detalle) {
  try {
    const { error } = await sb.rpc("bitacora_evento", { p_accion: accion, p_detalle: detalle || null });
    if (error) console.warn("bitácora:", error.message);
  } catch (e) { console.warn("bitácora:", e.message); }
}

const BIT = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = escHtml;
  let filas = [];                       // renglones cargados del periodo
  const F = { tabla: "all", periodo: "7", texto: "" };

  const TIPOS = [["all", "Todo"], ["cursos", "Cursos"], ["instructores", "Instructores"], ["perfiles", "Usuarios"], ["evidencias", "Evidencias"], ["sesiones", "Sesiones"], ["evento", "Eventos (sesión, descargas)"]];
  const PERIODOS = [["1", "Hoy"], ["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["0", "Todo"]];
  const ACCION = { INSERT: ["Alta", "bitPill--alta"], UPDATE: ["Cambio", "bitPill--cambio"], DELETE: ["Baja", "bitPill--baja"], EVENTO: ["Evento", "bitPill--evento"] };

  function desde() {
    const dias = Number(F.periodo);
    if (!dias) return null;
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (dias - 1));
    return d.toISOString();
  }

  async function render() {
    const root = $("bitRoot"); if (!root) return;
    if (!root.dataset.pintado) {
      root.dataset.pintado = "1";
      root.innerHTML = `
        <div class="bitBarra">
          <select class="editInput" id="bitTipo">${TIPOS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select>
          <select class="editInput" id="bitPeriodo">${PERIODOS.map(([v, t]) => `<option value="${v}" ${v === F.periodo ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
          <input class="editInput" id="bitBuscar" type="search" placeholder="Buscar por nombre, usuario o detalle"/>
          <button class="btnAction bitBtn" id="bitActualizar" title="Actualizar">↻ Actualizar</button>
          <button class="btnAction bitBtn" id="bitExportar" title="Descargar en Excel (CSV)">⬇️ Exportar CSV</button>
        </div>
        <div class="ceNota" id="bitResumen"></div>
        <div id="bitTabla"></div>`;
      $("bitTipo").addEventListener("change", (e) => { F.tabla = e.target.value; cargar(); });
      $("bitPeriodo").addEventListener("change", (e) => { F.periodo = e.target.value; cargar(); });
      $("bitBuscar").addEventListener("input", (e) => { F.texto = e.target.value; pintar(); });
      $("bitActualizar").addEventListener("click", cargar);
      $("bitExportar").addEventListener("click", exportar);
    }
    await cargar();
  }

  async function cargar() {
    const cont = $("bitTabla"); if (!cont) return;
    cont.innerHTML = `<div class="emptyState">Cargando…</div>`;
    let q = sb.from("bitacora").select("*").order("fecha", { ascending: false }).limit(1000);
    const d = desde(); if (d) q = q.gte("fecha", d);
    if (F.tabla !== "all") q = q.eq("tabla", F.tabla);
    const { data, error } = await q;
    if (error) {
      cont.innerHTML = `<div class="ceAviso mal">${/relation|does not exist|schema cache/i.test(error.message) ? "Falta activar la bitácora: corre <b>005_bitacora.sql</b> en Supabase." : "No se pudo cargar: " + esc(error.message)}</div>`;
      filas = []; return;
    }
    filas = data || [];
    pintar();
  }

  function visibles() {
    const q = F.texto.trim().toLowerCase();
    return !q ? filas : filas.filter((r) => [r.nombre, r.usuario, r.resumen, r.rol].some((t) => String(t || "").toLowerCase().includes(q)));
  }

  function pintar() {
    const lista = visibles();
    $("bitResumen").textContent = `${lista.length} registro${lista.length === 1 ? "" : "s"}${filas.length >= 1000 ? " (se muestran los 1000 más recientes; acota el periodo para ver otros)" : ""}`;
    if (!lista.length) { $("bitTabla").innerHTML = `<div class="emptyState">No hay registros con esos filtros.</div>`; return; }
    $("bitTabla").innerHTML = `<div class="bitLista">${lista.map((r) => {
      const [txt, cls] = ACCION[r.operacion] || [r.operacion, ""];
      const detalle = (r.antes || r.despues) ? `<details class="bitDet"><summary>Ver datos</summary><pre>${esc(JSON.stringify({ antes: r.antes || undefined, después: r.despues || undefined }, null, 1))}</pre></details>` : "";
      return `<div class="bitFila">
        <div class="bitFecha">${esc(new Date(r.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }))}</div>
        <div class="bitQuien"><b>${esc(r.nombre || "—")}</b><span>${esc(r.usuario || "")} · ${esc(r.rol || "")}</span></div>
        <div><span class="bitPill ${cls}">${esc(txt)}</span></div>
        <div class="bitQue">${esc(r.resumen)}${detalle}</div>
      </div>`;
    }).join("")}</div>`;
  }

  const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  async function exportar() {
    const lista = visibles();
    if (!lista.length) { toast("No hay registros para exportar"); return; }
    const enc = ["Fecha", "Usuario", "Nombre", "Rol", "Módulo", "Operación", "Detalle"];
    const filasCsv = lista.map((r) => [new Date(r.fecha).toLocaleString("es-MX"), r.usuario, r.nombre, r.rol, r.tabla, (ACCION[r.operacion] || [r.operacion])[0], r.resumen].map(csv).join(","));
    const blob = new Blob(["\ufeff" + [enc.map(csv).join(","), ...filasCsv].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `Bitacora_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    registrarEvento("Exportación de bitácora", `${lista.length} registros`);
  }

  function enlazar() {
    const pestana = document.querySelector('[data-atab="bitacora"]');
    if (pestana && !pestana.dataset.bit) { pestana.dataset.bit = "1"; pestana.addEventListener("click", render); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enlazar); else enlazar();

  return { render };
})();

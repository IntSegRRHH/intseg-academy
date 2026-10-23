/**
 * IntSeg Academy — datos.js (v3, Supabase)
 * Capa de datos: sesiones del capacitador, empleados y acceso del guardia.
 * Mantiene las mismas funciones que la versión local (DB.*, EMPLEADOS.*) para que
 * capacitador.js y fichas.js no cambien.
 *
 * Requiere config.js (SUPABASE_URL, SUPABASE_ANON_KEY) y el SDK de Supabase cargados antes.
 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EMAIL_DOMINIO = "@intseg.local"; // número de empleado / usuario → correo interno de Supabase Auth

/** Llama a la Edge Function de acceso del guardia (no requiere sesión). */
async function llamarAccesoGuardia(payload) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/acceso-guardia`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || "No se pudo completar el acceso.");
  return json;
}

/** Llama a la Edge Function de administración de usuarios con la sesión actual. */
async function llamarAdminUsuarios(payload) {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || "Error del servidor");
  return json;
}

/**
 * Sesiones de capacitación.
 * La sesión completa se guarda en public.sesiones (jsonb). Las fotos van al bucket
 * "sesiones" de Storage y en la base solo queda su ruta. Los participantes también
 * se copian a public.sesion_participantes para reportes y auditorías.
 */
const DB = (() => {
  const BUCKET = "sesiones";

  function dataUrlABlob(dataUrl) {
    const [cab, b64] = dataUrl.split(",");
    const mime = (cab.match(/data:(.*?);/) || [])[1] || "image/jpeg";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function firmarFotos(sesion) {
    const conRuta = (sesion.fotos || []).filter((f) => f.path);
    if (!conRuta.length) return sesion;
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(conRuta.map((f) => f.path), 3600);
    (data || []).forEach((r, i) => { if (r && r.signedUrl) conRuta[i].data = r.signedUrl; });
    return sesion;
  }

  return {
    nuevoId(prefijo = "s") {
      return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    },

    async listarSesiones() {
      const { data, error } = await sb.from("sesiones").select("id,data,creada").order("creada", { ascending: false });
      if (error) { console.error("listarSesiones:", error.message); return []; }
      return (data || []).map((r) => ({ ...r.data, id: r.id, creada: r.creada }));
    },

    async obtenerSesion(id) {
      const { data, error } = await sb.from("sesiones").select("id,data,creada").eq("id", id).maybeSingle();
      if (error || !data) return null;
      return firmarFotos({ ...data.data, id: data.id, creada: data.creada });
    },

    async guardarSesion(sesion) {
      sesion.actualizada = new Date().toISOString();

      // 1) Subir fotos nuevas (las que aún traen la imagen en base64)
      for (const f of sesion.fotos || []) {
        if (!f.path && f.data && f.data.startsWith("data:")) {
          const path = `${sesion.id}/${f.id}.jpg`;
          const { error } = await sb.storage.from(BUCKET).upload(path, dataUrlABlob(f.data), { contentType: "image/jpeg", upsert: true });
          if (error) throw new Error("No se pudo subir una foto: " + error.message);
          f.path = path;
        }
      }

      // 2) Guardar la sesión sin las imágenes en base64
      const payload = JSON.parse(JSON.stringify(sesion));
      payload.fotos = (sesion.fotos || []).map((f) => ({ id: f.id, path: f.path, fecha: f.fecha }));
      const { id, creada, ...resto } = payload;
      const { error: e1 } = await sb.from("sesiones").upsert({
        id: sesion.id,
        creada_por: currentUser?.id || null,
        data: resto,
        creada: sesion.creada || new Date().toISOString(),
        actualizada: sesion.actualizada,
      }, { onConflict: "id" });
      if (e1) throw new Error("No se pudo guardar la sesión: " + e1.message);

      // 3) Copia ordenada de participantes (para reportes)
      await sb.from("sesion_participantes").delete().eq("sesion_id", sesion.id);
      const filas = (sesion.participantes || []).map((p) => {
        const cal = p.calificacion === null || p.calificacion === "" || p.calificacion === undefined ? null : Number(p.calificacion);
        return {
          sesion_id: sesion.id,
          num_empleado: p.numEmpleado ? String(p.numEmpleado) : null,
          nombre: p.nombre || null,
          presente: !!p.presente,
          calificacion: cal,
          aprobado: cal === null ? null : cal >= 8,
          curso_key: sesion.cursoKey || null,
          fecha: sesion.fecha || null,
        };
      });
      if (filas.length) await sb.from("sesion_participantes").insert(filas);
    },

    async eliminarSesion(id) {
      const { data } = await sb.from("sesiones").select("data").eq("id", id).maybeSingle();
      const rutas = ((data && data.data && data.data.fotos) || []).map((f) => f.path).filter(Boolean);
      if (rutas.length) await sb.storage.from(BUCKET).remove(rutas);
      const { error } = await sb.from("sesiones").delete().eq("id", id);
      if (error) throw new Error("No se pudo eliminar la sesión: " + error.message);
    },
  };
})();

/**
 * Directorio de empleados.
 * - Personal con sesión (capacitador, supervisor, admin): se lee la tabla `empleados`.
 * - Guardia sin sesión: se consulta la Edge Function acceso-guardia (valida en servidor).
 * Cuando IntsegWeb esté conectado, el cambio se hace en la Edge Function, no aquí.
 */
const EMPLEADOS = (() => {
  let lista = [];
  const norm = (n) => String(n || "").trim().replace(/^0+/, "");
  return {
    async cargar() {
      const { data, error } = await sb.from("empleados").select("num,nombre,area,activo").eq("activo", true).order("nombre");
      if (error) { console.error("EMPLEADOS.cargar:", error.message); return lista; }
      lista = data || [];
      return lista;
    },
    async buscar(num) {
      const n = norm(num);
      if (!n) return null;
      if (lista.length) return lista.find((e) => e.num === n) || null;
      try {
        const r = await llamarAccesoGuardia({ action: "buscar", num: n });
        return { num: r.num, nombre: r.nombre, area: r.area };
      } catch (e) {
        return null;
      }
    },
    todos() {
      return [...lista];
    },
    limpiar() {
      lista = [];
    },
  };
})();

/**
 * IntSeg Academy — formato-lista.js
 * Formato oficial "LISTA DE ASISTENCIA" (SPGIP-FO-050) y los siete temas con los que se usa.
 * Cada curso se asocia a uno de estos temas (en el editor del curso, o automáticamente por su nombre);
 * al imprimir la lista de una sesión, el tema y los objetivos salen ya llenos.
 */
const LISTA_CODIGO = "SPGIP-FO-050";
const LISTA_EMPRESA = "Grupo IntSeg";
const LISTA_AREA = "Capacitación";
const LISTA_FILAS_POR_HOJA = 20;           // renglones de la tabla de asistencia en cada hoja

const LISTA_TEMAS = [
  { id: "soft", modulo: 1, nombre: "Soft Skills",
    tema: "Programa de Desarrollo Humano y Soft Skills IntSeg",
    objetivos: "Fortalecer las habilidades personales y sociales del personal de seguridad, promoviendo una comunicación efectiva, el trabajo en equipo y la inteligencia emocional." },
  { id: "cultura", modulo: 1, nombre: "Cultura Organizacional y Filosofía IntSeg",
    tema: "Cultura Organizacional y Filosofía IntSeg",
    objetivos: "Que los guardias de seguridad conozcan la Misión, Visión, Política de Calidad, Política de Seguridad, Valores, Código de ética, Derechos Humanos, Imagen." },
  { id: "ocupacional", modulo: 1, nombre: "Seguridad y Salud Ocupacional",
    tema: "Seguridad y Salud Ocupacional",
    objetivos: "Mejorar las condiciones de los colaboradores referentes a Seguridad y Salud, desarrollar consciencia preventiva y hábitos de trabajo seguros para los colaboradores." },
  { id: "consignas", modulo: 2, nombre: "Consignas específicas",
    tema: "Consignas Especificas del Servicio, Código de ética, Derechos Humanos, Seguridad TI y de la Información",
    objetivos: "Que el oficial conozca las actividades a realizar en el servicio y en los diferentes apostamientos que se requieran." },
  { id: "patrimonial", modulo: 2, nombre: "Seguridad Patrimonial",
    tema: "Seguridad Patrimonial, basamentos legales, Uso PR-24, gas pimienta e Incidentes en campo.",
    objetivos: "Que los guardias de seguridad adquieran las herramientas necesarias para la salvaguarda y protección de los bienes del cliente." },
  { id: "ctpat", modulo: 2, nombre: "C-TPAT / OEA",
    tema: "Inducción C-TPAT/OEA",
    objetivos: "Que el Oficial conozca los requerimientos básicos del C-TPAT/OEA, para que sea capaz de identificar y prevenir los riesgos del proceso" },
  { id: "extorsion", modulo: 2, nombre: "Extorsión",
    tema: "Manejo de llamadas de Extorsión",
    objetivos: "Que los oficiales conozcan el protocolo correcto de actuación ante una llamada de extorsión." },
];

// Si el curso no tiene tema asignado, se propone uno por su clave o por su nombre
const LISTA_POR_CLAVE = { aml: "patrimonial", dc3: "patrimonial", iso: "ctpat", ehs: "ocupacional" };
const LISTA_POR_TITULO = [
  [/c-?tpat|oea/i, "ctpat"],
  [/inteligencia emocional|comunicaci[oó]n no verbal|lenguaje no verbal|soft skills|desarrollo humano/i, "soft"],
  [/cultura organizacional|filosof[ií]a/i, "cultura"],
  [/extorsi[oó]n/i, "extorsion"],
  [/consignas/i, "consignas"],
  [/ocupacional|salud y seguridad|higiene/i, "ocupacional"],
  [/patrimonial|fundamento legal|uso de la fuerza/i, "patrimonial"],
];
const temaListaPorId = (id) => LISTA_TEMAS.find((t) => t.id === id) || null;

// Tema que sugiere el sistema para un curso (sin tener en cuenta el que se haya guardado a mano)
function temaListaAuto(key) {
  const c = COURSE_CONTENT[key]; if (!c) return null;
  if (LISTA_POR_CLAVE[key]) return temaListaPorId(LISTA_POR_CLAVE[key]);
  const hit = LISTA_POR_TITULO.find(([re]) => re.test(c.title || ""));
  return hit ? temaListaPorId(hit[1]) : null;
}

// Tema y objetivos que se imprimen para un curso: el guardado, el sugerido o, si no hay, el nombre y la descripción del curso
function listaDelCurso(key) {
  const c = COURSE_CONTENT[key]; if (!c) return { tema: "", objetivos: "" };
  if (c.lista && String(c.lista.tema || "").trim()) return { id: c.lista.id || "", tema: c.lista.tema, objetivos: c.lista.objetivos || "" };
  const auto = temaListaAuto(key);
  if (auto) return { id: auto.id, tema: auto.tema, objetivos: auto.objetivos };
  return { id: "", tema: c.title || "", objetivos: c.desc || "" };
}

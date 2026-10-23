# IntSeg Academy v2.6

Sistema de gestión de aprendizaje (LMS) mobile-first para Grupo IntSeg — desarrollado como Proyecto Final de Ingeniería de Software, Universidad TecMilenio.

## 🔗 Demo en vivo
**https://al05089397-spec.github.io/Intseg-Academy-V2.6/**

---

## Descripción

IntSeg Academy es una Single Page Application (SPA) diseñada para la capacitación de más de 550 guardias de seguridad privada. Permite a los guardias estudiar el material de sus cursos, realizar evaluaciones y al administrador gestionar usuarios, cursos y resultados desde un panel centralizado.

---

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `guardia01` | `intseg123` | Guardia |
| `admin` | `Admin#2026` | Administrador |
| `instructor` | `Inst#2026` | Instructor |

---

## Funcionalidades

### Guardia
- Login con validación de rol y estado de cuenta
- Catálogo de cursos con búsqueda y filtros (Todos / En curso / Completados)
- Vista de detalle con módulos de contenido expandibles (acordeón)
- Botón para ver la presentación original en PDF
- Evaluación de 10 preguntas aleatorias por curso
- Retroalimentación inmediata por respuesta (correcto/incorrecto)
- Resultado con puntaje, barra visual y umbral de aprobación al 80%
- Progreso guardado en localStorage por curso

### Administrador
- Dashboard con métricas reales: usuarios activos, tasa de aprobación, promedio general, progreso por curso
- Gestión de usuarios: crear, editar, activar/desactivar y eliminar guardias
- Gestión de cursos: editar título, badge, instructor, duración y descripción
- Tabla de evaluaciones: resultados por usuario, curso, puntaje y fecha

---

## Cursos disponibles

| Curso | Certificación | Preguntas |
|---|---|---|
| Fundamento Legal de la Seguridad Privada | DC3 | 10 |
| C-TPAT / OEA: Seguridad en la Cadena de Suministro | Internacional | 10 |
| Seguridad Patrimonial | OEA | 10 |

---

## Tecnologías

- HTML5, CSS3, JavaScript ES6+ (Vanilla — sin frameworks)
- SPA con navegación por vistas sin recargas
- localStorage para persistencia de sesión y progreso
- CSS mobile-first con media queries desde 768px
- GitHub Pages para deploy

---

## Estructura del proyecto

```
/
├── index.html          # Estructura de vistas y componentes
├── app.js              # Lógica de la aplicación, quiz engine, admin
├── styles.css          # Estilos mobile-first
├── avatar-guardia.png  # Imagen curso DC3
├── cover-iso28001.jpg  # Imagen curso C-TPAT/OEA
├── cover-antilavado.jpg # Imagen curso Seguridad Patrimonial
├── logo-intseg-nobg.png # Logo IntSeg Academy
├── instructor.jpg      # Foto instructor
├── Fundamento_Legal.pdf
├── CTPAT_OEA.pdf
└── Seguridad_Patrimonial.pdf
```

---

## Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/al05089397-spec/Intseg-Academy-V2.6.git

# Abrir en VS Code
code Intseg-Academy-V2.6

# Ejecutar con Live Server (extensión de VS Code)
# Click derecho en index.html → Open with Live Server
```

---

## Autor

Claudia Elizabeth Escoto Meza
Estudiante de Universidad TecMilenio en P.A. Desarrollo de Software 
Materia Ingeniería de Software Magister Erik Ezequiel Carrillo Moo  
ID: al05089397

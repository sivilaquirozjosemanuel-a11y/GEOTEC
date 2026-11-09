/* =====================================================
   ARCHIVO DE CONTENIDOS — aquí editas todo el sitio
   ===================================================== */

window.SITE = {
  titulo: "Geotec-Estructural",
  subtitulo: "Cuadernos, cursos, asesorías, informes y reportes de laboratorio en Geotecnia y Estructuras.",
  autor: "José Manuel Sivila Quiroz"
};

/*
  Cada elemento de ITEMS es una tarjeta. Campos:
  tipo:   "Cuaderno" | "Curso" | "Asesoría" | "Informe" | "Laboratorio" | "Memoria de cálculo" | "Calculadora" | "Enlace"
  area:   "Estructuras" | "Geotecnia" | "General"
  titulo, descripcion, fecha (AAAA-MM-DD)
  url:    ruta a un archivo dentro del sitio (ej. "archivos/informe1.pdf")
          o un enlace externo (Google Drive, YouTube, Colab, etc.)
  tags:   lista de palabras clave
*/

window.ITEMS = [
  {
    tipo: "Calculadora", area: "Estructuras",
    titulo: "Módulo de elasticidad del hormigón",
    descripcion: "Calcula Ec a partir de f'c según ACI 318 (MPa y kgf/cm²).",
    fecha: "2026-11-09", url: "calculadoras/modulo-elasticidad.html",
    tags: ["hormigón", "ACI 318", "Ec"]
  },
  {
    tipo: "Laboratorio", area: "Geotecnia",
    titulo: "Reporte de laboratorio: Límites de Atterberg (ejemplo)",
    descripcion: "Reemplaza este ejemplo con tu PDF subido a la carpeta archivos/.",
    fecha: "2026-11-09", url: "archivos/ejemplo-atterberg.pdf",
    tags: ["suelos", "plasticidad", "ASTM D4318"]
  },
  {
    tipo: "Memoria de cálculo", area: "Estructuras",
    titulo: "Memoria de cálculo: viga de hormigón armado (ejemplo)",
    descripcion: "Diseño a flexión y corte. Sube tu PDF y cambia la ruta.",
    fecha: "2026-11-09", url: "archivos/ejemplo-viga.pdf",
    tags: ["vigas", "flexión", "cortante"]
  },
  {
    tipo: "Cuaderno", area: "Geotecnia",
    titulo: "Cuaderno de clase: Mecánica de suelos (ejemplo)",
    descripcion: "Apuntes de clase. Puede ser un PDF o un enlace a Drive.",
    fecha: "2026-11-09", url: "https://drive.google.com/",
    tags: ["apuntes", "suelos"]
  },
  {
    tipo: "Curso", area: "General",
    titulo: "Curso: Introducción a Python para ingeniería (ejemplo)",
    descripcion: "Material y ejercicios del curso. Enlaza a YouTube, Colab o Drive.",
    fecha: "2026-11-09", url: "https://colab.research.google.com/",
    tags: ["python", "cálculo"]
  },
  {
    tipo: "Asesoría", area: "General",
    titulo: "Asesorías personalizadas (ejemplo)",
    descripcion: "Describe temas, modalidad y cómo contactarte (WhatsApp, correo, formulario).",
    fecha: "2026-11-09", url: "mailto:tucorreo@ejemplo.com",
    tags: ["clases", "tutoría"]
  },
  {
    tipo: "Enlace", area: "Estructuras",
    titulo: "Normas y recursos útiles (ejemplo)",
    descripcion: "Lista de normas, software y bibliografía de referencia.",
    fecha: "2026-11-09", url: "https://www.concrete.org/",
    tags: ["normas", "recursos"]
  }
];

# Geotec-Estructural

Sitio estático (sin servidor ni base de datos) para publicar cuadernos, cursos, asesorías, informes, reportes de laboratorio, memorias de cálculo, calculadoras y enlaces.

## Estructura

```
index.html          Página principal (no hace falta tocarla)
style.css           Diseño
app.js              Buscador y filtros
data.js             TODO EL CONTENIDO: aquí agregas y editas tarjetas
calculadoras/       Calculadoras en HTML (una por archivo)
archivos/           Aquí subes tus PDFs, Excel, etc. (créala si no existe)
```

## Cómo agregar contenido

1. Copia tu PDF a la carpeta `archivos/`.
2. Abre `data.js` y agrega un bloque dentro de `window.ITEMS`:

```js
{
  tipo: "Laboratorio", area: "Geotecnia",
  titulo: "Ensayo de corte directo",
  descripcion: "Resultados y análisis del ensayo.",
  fecha: "2026-11-09", url: "archivos/corte-directo.pdf",
  tags: ["suelos", "resistencia al corte"]
},
```

3. Cambia el nombre, subtítulo y autor al inicio de `data.js` (`window.SITE`).

Para archivos pesados (más de 100 MB) súbelos a Google Drive y usa el enlace en `url`.

## Publicar gratis en GitHub Pages

1. Crea una cuenta en https://github.com.
2. Crea un repositorio nuevo, público, por ejemplo `portal-ingenieria`.
3. Sube todos los archivos de esta carpeta (botón "Add file" → "Upload files").
4. Ve a **Settings → Pages**. En "Branch" elige `main` y carpeta `/ (root)`, luego **Save**.
5. En uno o dos minutos tu sitio quedará en `https://TU-USUARIO.github.io/portal-ingenieria/`.

Cada vez que subas cambios, el sitio se actualiza solo.

## Alternativas gratuitas

- **Cloudflare Pages / Netlify**: arrastra la carpeta y se publica.
- **Google Sites**: más simple, pero sin calculadoras propias.

## Nota

Todo lo que subas a un sitio público lo puede ver cualquiera. Si algún documento no debe ser público, déjalo en Drive con acceso restringido y enlázalo solo si corresponde.


## Módulo de laboratorio de suelos

- `laboratorio/` : páginas de ensayo (índice, granulometría e hidrometría, límites, clasificación).
- `assets/` : motor de cálculo (`suelos.js`), utilidades y estilos (`lab.js`, `lab.css`).
- `dev/test_suelos.js` : pruebas numéricas (opcional; `node dev/test_suelos.js`).

Cada página genera un reporte: use «Imprimir / guardar PDF», elija «Guardar como PDF» y desactive «Encabezados y pies de página». Los datos se guardan solo en su navegador. Para actualizar el sitio, suba estas carpetas y archivos al repositorio de GitHub reemplazando los existentes.

## Contacto y tema

El teléfono, WhatsApp y correo se editan en `data.js` (campos `telefono`, `whatsapp`, `email`). El botón de modo claro/oscuro y el botón de WhatsApp los añade `assets/site.js` en todas las páginas.

/* site.js — modo claro/oscuro, botón de WhatsApp, contacto en el pie, logo (favicon) */
(function () {
  "use strict";
  var KEY = "geotec:tema", root = document.documentElement;
  function guardado() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function aplicar(t) { if (t) root.setAttribute("data-theme", t); else root.removeAttribute("data-theme"); }
  if (guardado()) aplicar(guardado());                                   // antes de pintar: evita el parpadeo

  var C = { telefono: "+591 75998230", whatsapp: "59175998230", email: "sivilaquirozjosemanuel@gmail.com" };
  var LOGO = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="14" fill="#6f4528"/>' +
    '<path d="M14 24h36M18 24v-6h28v6" stroke="#fff8ef" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M20 24v14M32 24v14M44 24v14" stroke="#fff8ef" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M10 45c7-4 11 4 22 0s15 4 22 0M10 53c7-4 11 4 22 0s15 4 22 0" stroke="#d9b48a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  window.GeotecLogo = LOGO;
  var ICON_SUN = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4z"/></svg>';

  function toggle() {
    var oscuro = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    var t = oscuro ? "light" : "dark";
    aplicar(t); try { localStorage.setItem(KEY, t); } catch (e) {}
  }
  function iniciar() {
    var S = window.SITE || {}, tel = S.telefono || C.telefono, wa = S.whatsapp || C.whatsapp, mail = S.email || C.email;
    // favicon con el logo
    var l = document.createElement("link"); l.rel = "icon"; l.href = "data:image/svg+xml," + encodeURIComponent(LOGO);
    document.head.appendChild(l);
    // botón de tema: en la barra si existe #theme-slot, si no flotante
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Cambiar entre modo claro y oscuro"); b.title = "Modo claro / oscuro";
    b.innerHTML = ICON_SUN + ICON_MOON; b.addEventListener("click", toggle);
    var slot = document.getElementById("theme-slot"), pila = document.createElement("div"); pila.className = "fab-stack screen-only";
    if (slot) { b.className = "theme-btn"; slot.appendChild(b); } else { b.className = "fab"; pila.appendChild(b); }
    var a = document.createElement("a"); a.className = "fab wa"; a.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hola, vi su sitio Geotec-Estructural y quisiera consultar.");
    a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", "Escribir por WhatsApp"); a.title = "Escribir por WhatsApp"; a.innerHTML = ICON_WA;
    pila.appendChild(a); document.body.appendChild(pila);
    // contacto en el pie
    var f = document.querySelector(".foot .wrap");
    if (f && !f.querySelector(".foot-contact")) {
      var s = document.createElement("span"); s.className = "foot-contact";
      s.innerHTML = '<a href="tel:' + tel.replace(/\s/g, "") + '">' + tel + '</a> · <a href="mailto:' + mail + '">' + mail + "</a>";
      f.appendChild(s);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();

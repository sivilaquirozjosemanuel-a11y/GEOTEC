(function () {
  const S = window.SITE, ITEMS = window.ITEMS || [];
  const $ = (id) => document.getElementById(id);

  document.title = S.titulo;
  $("site-title").textContent = S.titulo;
  $("site-subtitle").textContent = S.subtitulo;
  $("site-author").textContent = S.autor;
  $("year").textContent = new Date().getFullYear();

  // contacto
  const tel = S.telefono || "", mail = S.email || "", wa = S.whatsapp || "";
  $("c-autor").textContent = S.autor;
  $("c-tel").href = "tel:" + tel.replace(/\s/g, ""); $("c-tel-t").textContent = tel;
  $("c-mail").href = "mailto:" + mail; $("c-mail-t").textContent = mail;
  $("c-wa").href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hola, vi su sitio Geotec-Estructural y quisiera consultar.");
  $("c-wa-t").textContent = tel;

  // cifras de portada
  const cuenta = (t) => ITEMS.filter(i => i.tipo === t).length;
  const st = [[ITEMS.length, "elementos"], [cuenta("Calculadora"), "calculadoras"], [new Set(ITEMS.map(i => i.area)).size, "áreas"]];
  $("stats").innerHTML = st.map(x => "<div><b>" + x[0] + "</b>" + x[1] + "</div>").join("");

  // aparición suave de tarjetas
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 }) : null;
  const revelar = (el) => { el.classList.add("reveal"); if (io) io.observe(el); else el.classList.add("in"); };
  document.querySelectorAll(".contact").forEach(revelar);

  const tipos = ["Todos", ...Array.from(new Set(ITEMS.map(i => i.tipo)))];
  let tipoActivo = "Todos";

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function renderTabs() {
    const nav = $("tabs");
    nav.innerHTML = "";
    tipos.forEach(t => {
      const b = document.createElement("button");
      b.className = "tab";
      b.type = "button";
      b.textContent = t;
      b.setAttribute("aria-pressed", String(t === tipoActivo));
      b.onclick = () => { tipoActivo = t; renderTabs(); render(); };
      nav.appendChild(b);
    });
  }

  function render() {
    const q = norm($("q").value);
    const area = $("area").value;
    const lista = ITEMS
      .filter(i => tipoActivo === "Todos" || i.tipo === tipoActivo)
      .filter(i => !area || i.area === area)
      .filter(i => !q || norm([i.titulo, i.descripcion, i.tipo, i.area, (i.tags || []).join(" ")].join(" ")).includes(q))
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

    const grid = $("grid");
    grid.innerHTML = "";
    lista.forEach(i => {
      const externo = /^https?:|^mailto:/.test(i.url);
      const c = document.createElement("article");
      c.className = "card " + i.area;
      revelar(c);

      const meta = document.createElement("div");
      meta.className = "meta";
      [i.tipo, i.area, i.fecha].forEach(t => {
        if (!t) return;
        const s = document.createElement("span");
        s.className = "badge";
        s.textContent = t;
        meta.appendChild(s);
      });

      const h = document.createElement("h3");
      h.textContent = i.titulo;
      const p = document.createElement("p");
      p.textContent = i.descripcion || "";

      const tags = document.createElement("div");
      tags.className = "tags";
      (i.tags || []).forEach(t => {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tags.appendChild(s);
      });

      const a = document.createElement("a");
      a.className = "btn";
      a.href = i.url;
      a.textContent = i.tipo === "Calculadora" ? "Abrir calculadora" : (externo ? "Abrir enlace" : "Ver / descargar");
      if (externo && !i.url.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }

      c.append(meta, h, p, tags, a);
      grid.appendChild(c);
    });

    $("count").textContent = lista.length + " elemento(s)";
    $("empty").hidden = lista.length > 0;
  }

  $("q").addEventListener("input", render);
  $("area").addEventListener("change", render);
  renderTabs();
  render();
})();

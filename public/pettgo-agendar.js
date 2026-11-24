/* PettGo: botón "Agendar Cita Veterinaria" en cada tarjeta de /veterinarias + chat en ventana emergente.
   Instalación: la página lo carga con <script defer src="/pettgo-agendar.js" data-server="https://TU-SERVIDOR"></script>
   (lo hace el componente AgendarWidget cuando existe VITE_AGENDAMIENTO_URL). data-server debe ser https (o localhost).
   - Agrega solo el botón a cada tarjeta de la lista de veterinarias (detecta las tarjetas <a href="/veterinarias/…"> con su <h3>).
   - El correo de la persona con sesión lo publica la página en window.PETTGO_USER_EMAIL (y la dirección, si la hay, en
     window.PETTGO_USER_ADDRESS). Este script no lee el almacenamiento del navegador.
   - Manual: PettGo.agendar('Nombre de la veterinaria') o PettGo.abrir() desde cualquier botón.
   - Atributos opcionales del <script>: data-auto="false" (no inyectar botones), data-pill="true" (botón flotante). */
(function () {
  var script = document.currentScript;
  // La dirección del servidor se indica en la etiqueta (data-server) para poder alojar este archivo en el propio sitio.
  var base = new URL(script.getAttribute("data-server") || script.src).origin;
  if (!/^https:\/\//.test(base) && !/^http:\/\/localhost(:\d+)?$/.test(base)) { console.error("PettGo: data-server debe ser https"); return; }
  var overlay, frame, listo = false, pendiente = null;

  // El sitio publica el correo de la persona con sesión en window.PETTGO_USER_EMAIL; este script no lee ningún almacenamiento.
  function correo() { return window.PETTGO_USER_EMAIL || ""; }
  function enviarUsuario() { frame.contentWindow.postMessage({ type: "pettgo-user", email: correo(), address: window.PETTGO_USER_ADDRESS || "" }, base); }
  function enviarVet(v) { frame.contentWindow.postMessage({ type: "pettgo-agendar", veterinaria: v }, base); }

  function crear() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-label", "Agendar cita veterinaria");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(20,48,31,.55);padding:16px;box-sizing:border-box";
    var panel = document.createElement("div");
    panel.style.cssText = "position:relative;width:min(440px,100%);height:min(700px,100%);background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden";
    var x = document.createElement("button");
    x.type = "button"; x.setAttribute("aria-label", "Cerrar"); x.textContent = "✕";
    x.style.cssText = "position:absolute;top:10px;right:10px;z-index:2;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.92);color:#14301f;font:700 15px system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)";
    x.onclick = cerrar;
    frame = document.createElement("iframe");
    frame.src = base + "/#embed"; frame.allow = "geolocation"; frame.title = "Asistente PettGo";
    frame.style.cssText = "width:100%;height:100%;border:0;display:block";
    frame.onload = function () { listo = true; enviarUsuario(); if (pendiente) { enviarVet(pendiente); pendiente = null; } };
    panel.append(frame, x); overlay.append(panel);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) cerrar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
    document.body.appendChild(overlay);
  }
  function abrir() { crear(); overlay.style.display = "flex"; if (listo) enviarUsuario(); }
  function cerrar() { if (overlay) overlay.style.display = "none"; }

  window.addEventListener("message", function (e) { if (e.origin === base && e.data && e.data.type === "pettgo-cerrar") cerrar(); });
  window.PettGo = { abrir: abrir, cerrar: cerrar, agendar: function (v) { abrir(); if (listo) enviarVet(v); else pendiente = v; } };

  /* Botón en cada tarjeta de la lista de veterinarias */
  if (script.getAttribute("data-auto") !== "false") {
    var css = document.createElement("style");
    css.textContent = ".pettgo-agendar-btn{margin-top:10px;width:100%;padding:11px 16px;border:0;border-radius:999px;background:#a82f29;color:#fff;font:700 14px/1 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;transition:background .15s,transform .15s}.pettgo-agendar-btn:hover{background:#8a241f;transform:translateY(-1px)}.pettgo-agendar-btn:focus-visible{outline:3px solid #fad5d3;outline-offset:2px}";
    document.head.appendChild(css);
    var poner = function () {
      document.querySelectorAll('a[href^="/veterinarias/"]').forEach(function (card) {
        var h = card.querySelector("h3"); if (!h || card.querySelector(".pettgo-agendar-btn")) return;
        var b = document.createElement("button");
        b.type = "button"; b.className = "pettgo-agendar-btn"; b.textContent = "Agendar Cita Veterinaria";
        b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); window.PettGo.agendar(h.textContent.trim()); };
        h.parentElement.appendChild(b);
      });
    };
    var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(poner, 80); }).observe(document.documentElement, { childList: true, subtree: true });
    poner();
  }

  if (script.getAttribute("data-pill") === "true") {
    var p = document.createElement("button");
    p.type = "button"; p.textContent = "📅 Agendar cita";
    p.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:2147482999;padding:12px 18px;border:0;border-radius:99px;background:#a82f29;color:#fff;font:700 14px system-ui;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)";
    p.onclick = abrir; document.body.appendChild(p);
  }
})();

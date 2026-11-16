// Burbuja del asistente PettGo Assistant. Copia propia del embed.js original.
(() => {
  // Evita cargar el chatbot dos veces.
  if (document.getElementById("pettgo-launcher")) return;

  // Dirección del asistente. Está fija aquí (y no se toma del script) a propósito: este
  // archivo vive en PettGo, así que lo que se publique en Replit solo puede cambiar el
  // contenido del recuadro del chat, nunca el código que corre en la página.
  const serverUrl = "https://super-ivory-bundledsoftware--sebajara102.replit.app";

  // Estilos de la burbuja y ventana.
  const styles = document.createElement("style");
  styles.textContent = `
    #pettgo-launcher {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 62px;
      height: 62px;
      border: none;
      border-radius: 50%;
      background: #214638;
      color: white;
      font-size: 27px;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(0,0,0,.22);
      z-index: 2147483000;
    }

    #pettgo-panel {
      display: none;
      position: fixed;
      bottom: 96px;
      right: 22px;
      width: min(390px, calc(100vw - 28px));
      height: min(590px, calc(100dvh - 115px));
      background: #fffdf7;
      border-radius: 19px;
      overflow: hidden;
      box-shadow: 0 12px 45px rgba(0,0,0,.22);
      z-index: 2147483001;
    }

    #pettgo-panel[data-open="true"] {
      display: block;
    }

    #pettgo-panel iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    #pettgo-close {
      position: absolute;
      top: 15px;
      right: 12px;
      z-index: 2;
      width: 31px;
      height: 31px;
      border: none;
      border-radius: 50%;
      background: #eee9dd;
      color: #214638;
      font-size: 23px;
      cursor: pointer;
    }

    @media (max-width: 600px) {
      #pettgo-panel {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100dvh;
        border-radius: 0;
      }
    }
  `;

  document.head.appendChild(styles);

  // Botón para abrir el chatbot.
  const launcher = document.createElement("button");
  launcher.id = "pettgo-launcher";
  launcher.type = "button";
  launcher.textContent = "🐾";
  launcher.setAttribute("aria-label", "Abrir PettGo Assistant");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "pettgo-panel");

  // Ventana flotante.
  const panel = document.createElement("div");
  panel.id = "pettgo-panel";
  panel.dataset.open = "false";

  const iframe = document.createElement("iframe");
  iframe.src = `${serverUrl}/?embed=1`;
  iframe.title = "PettGo Assistant";
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  // Botón para cerrar la ventana.
  const close = document.createElement("button");
  close.id = "pettgo-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Cerrar PettGo Assistant");

  panel.append(iframe, close);
  document.body.append(launcher, panel);

  function setOpen(open) {
    panel.dataset.open = String(open);
    launcher.setAttribute("aria-expanded", String(open));
    if (open) close.focus();
    else launcher.focus();
  }

  launcher.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.dataset.open === "true") {
      setOpen(false);
    }
  });
})();

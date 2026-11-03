#!/usr/bin/env python3
"""
Agente de Control de Calidad de la Información — PettGo
=======================================================

Revisa, todos los días y sin intervención humana, que la información que
ven los usuarios en pettgo.cl sea correcta:

  1. Base de datos (Supabase): campos vacíos, teléfonos/correos/URL mal
     escritos, coordenadas fuera de Curicó, duplicados, textos de prueba.
  2. Sitio web (como un usuario, con un navegador automático): páginas que
     no cargan, enlaces rotos, imágenes rotas, datos mal cargados
     ("undefined", "null"), enlaces externos caídos o que redirigen a otro
     dominio.
  3. Cruce BD ↔ sitio: registros que existen en la BD pero no aparecen en
     el sitio, o cuyo teléfono no coincide con lo publicado.

Genera un reporte (HTML + JSON + resumen) y, opcionalmente, lo envía por
correo. Ver README.md para la instalación.
"""

from __future__ import annotations

import concurrent.futures as cf
import datetime as dt
import html
import json
import os
import re
import smtplib
import sys
import unicodedata
from collections import defaultdict
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import requests
import yaml

BASE_DIR = Path(__file__).resolve().parent
UA = "PettGo-AgenteCalidad/1.0 (+https://pettgo.cl)"
SEVERIDADES = ["critico", "advertencia", "menor"]
ETIQUETA_SEV = {"critico": "Crítico", "advertencia": "Advertencia", "menor": "Menor"}

# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------


def normalizar(texto) -> str:
    """minúsculas, sin tildes, solo letras/números separados por un espacio."""
    if texto is None:
        return ""
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def solo_digitos(texto) -> str:
    return re.sub(r"\D", "", str(texto or ""))


def vacio(v) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "") or v == [] or v == {}


def dominio_base(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if re.fullmatch(r"[\d.]+", host) or host == "localhost":
        return host
    partes = host.split(".")
    return ".".join(partes[-2:]) if len(partes) >= 2 else host


class Reporte:
    def __init__(self):
        self.hallazgos: list[dict] = []
        self.metricas: dict = defaultdict(int)

    def agregar(self, severidad, origen, entidad, registro, problema, detalle="", url=""):
        self.hallazgos.append({
            "severidad": severidad,
            "origen": origen,          # Base de datos | Sitio web | Cruce BD-sitio
            "entidad": entidad,        # tabla o página
            "registro": str(registro)[:120],
            "problema": problema,
            "detalle": str(detalle)[:300],
            "url": url,
        })

    def conteo(self):
        c = {s: 0 for s in SEVERIDADES}
        for h in self.hallazgos:
            c[h["severidad"]] += 1
        return c


# ----------------------------------------------------------------------------
# 1. Base de datos (Supabase, vía API REST)
# ----------------------------------------------------------------------------

# Patrones para reconocer columnas aunque no sepamos el nombre exacto.
PATRONES_COLUMNA = {
    "id": r"^id$",
    "nombre": r"^(nombre|name|titulo|title|razon social|nombre .*|.* nombre)$",
    "telefono": r"(telefono|fono|phone|celular|whatsapp|movil)",
    "email": r"(email|correo|mail)",
    "imagen": r"(imagen|image|foto|photo|logo|img|avatar|thumbnail|portada)",
    "url": r"(url|web|sitio|link|enlace|tienda|instagram|facebook)",
    "latitud": r"^(lat|latitud|latitude)$",
    "longitud": r"^(lng|lon|long|longitud|longitude)$",
    "precio": r"(precio|price|valor)",
    "direccion": r"(direccion|address|domicilio)",
    "horario": r"(horario|hours|schedule|atencion)",
    "activo": r"^(activo|active|publicado|published|visible|habilitado|is active)$",
}
GRAVEDAD_VACIO = {
    "nombre": "critico", "telefono": "advertencia", "direccion": "advertencia",
    "latitud": "advertencia", "longitud": "advertencia", "url": "menor",
    "email": "menor", "horario": "menor", "imagen": "menor", "precio": "advertencia",
}
TEXTO_PRUEBA = re.compile(r"\b(test|testing|prueba|lorem|ipsum|asdf|qwerty|xxx|ejemplo)\b")
RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")


class Supabase:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {"apikey": key, "Accept": "application/json", "User-Agent": UA}
        if key.startswith("eyJ"):  # llaves antiguas (JWT) también van en Authorization
            self.h["Authorization"] = f"Bearer {key}"

    def descubrir_tablas(self) -> dict[str, list[str]]:
        """Lee el esquema (OpenAPI) que publica Supabase. Puede no estar
        disponible con la llave pública; en ese caso se usa config.yaml."""
        r = requests.get(self.base + "/", headers={**self.h, "Accept": "application/openapi+json"}, timeout=30)
        r.raise_for_status()
        defs = r.json().get("definitions", {})
        return {t: list((d.get("properties") or {}).keys()) for t, d in defs.items()}

    def filas(self, tabla: str, maximo: int = 20000) -> list[dict]:
        salida, paso = [], 1000
        while len(salida) < maximo:
            h = {**self.h, "Range-Unit": "items", "Range": f"{len(salida)}-{len(salida) + paso - 1}"}
            r = requests.get(f"{self.base}/{tabla}", params={"select": "*"}, headers=h, timeout=60)
            if r.status_code == 416:
                break
            r.raise_for_status()
            lote = r.json()
            salida.extend(lote)
            if len(lote) < paso:
                break
        return salida


def mapear_columnas(columnas: list[str], forzadas: dict | None) -> dict[str, list[str]]:
    mapa = defaultdict(list)
    for col in columnas:
        n = normalizar(col)
        for tipo, patron in PATRONES_COLUMNA.items():
            if re.search(patron, n):
                # una columna de imagen no se trata además como URL a visitar
                if tipo == "url" and re.search(PATRONES_COLUMNA["imagen"], n):
                    continue
                mapa[tipo].append(col)
                break
    for tipo, cols in (forzadas or {}).items():
        mapa[tipo] = cols if isinstance(cols, list) else [cols]
    return dict(mapa)


def validar_telefono(valor) -> str | None:
    d = solo_digitos(valor)
    if d.startswith("56"):
        d = d[2:]
    if len(d) == 9:
        return None
    if len(d) == 8:
        return "formato antiguo de 8 dígitos (falta el 9 o el código de área)"
    return f"tiene {len(d)} dígitos; un número chileno tiene 9 (sin +56)"


def revisar_bd(cfg, rep: Reporte, sb: Supabase):
    """Devuelve {tabla: (filas, mapa_columnas)} para el cruce posterior."""
    conf_tablas = cfg.get("tablas") or {}
    ignorar = set(cfg.get("tablas_ignorar") or [])
    caja = cfg.get("zona_valida", {})
    lat_min, lat_max = caja.get("lat_min", -35.15), caja.get("lat_max", -34.80)
    lng_min, lng_max = caja.get("lng_min", -71.45), caja.get("lng_max", -71.05)

    esquema = {}
    try:
        esquema = sb.descubrir_tablas()
        print(f"[BD] Tablas encontradas: {', '.join(sorted(esquema)) or '(ninguna)'}")
    except Exception as e:  # noqa: BLE001
        print(f"[BD] No se pudo leer el esquema automáticamente ({e}). Se usan las tablas de config.yaml.")

    nombres = list(conf_tablas) if conf_tablas else [t for t in esquema if t not in ignorar]
    if not nombres:
        rep.agregar("critico", "Base de datos", "-", "-", "No hay tablas que revisar",
                    "Define las tablas en config.yaml (sección 'tablas').")
        return {}

    datos = {}
    for tabla in nombres:
        tconf = conf_tablas.get(tabla) or {}
        try:
            filas = sb.filas(tabla)
        except Exception as e:  # noqa: BLE001
            rep.agregar("critico", "Base de datos", tabla, "-", "No se pudo leer la tabla", e)
            continue
        columnas = esquema.get(tabla) or (list(filas[0].keys()) if filas else [])
        mapa = mapear_columnas(columnas, tconf.get("columnas"))
        datos[tabla] = (filas, mapa, tconf)
        rep.metricas["registros_revisados"] += len(filas)
        print(f"[BD] {tabla}: {len(filas)} registros · columnas detectadas: { {k: v for k, v in mapa.items()} }")

        obligatorios = set(tconf.get("obligatorios") or [])
        vistos_nombre, vistos_tel = defaultdict(list), defaultdict(list)

        # Solo se revisan los registros publicados (ej. status = approved)
        publicado = tconf.get("solo_si") or {}
        if publicado:
            filas = [f for f in filas if all(str(f.get(k)) == str(v) for k, v in publicado.items())]
            datos[tabla] = (filas, mapa, tconf)

        for f in filas:
            ident = etiqueta_registro(f, mapa)
            if not esta_activo(f, mapa):
                continue

            # Valores que el equipo decidió no publicar (ej. categoría "alimento")
            for col, prohibidos in (tconf.get("valores_no_permitidos") or {}).items():
                if normalizar(f.get(col)) in {normalizar(x) for x in prohibidos}:
                    rep.agregar("advertencia", "Base de datos", tabla, ident, f"Valor no permitido en {col}",
                                f"'{f.get(col)}' no corresponde a la oferta definida por el equipo")

            # Campos vacíos
            for tipo, cols in mapa.items():
                if tipo in ("id", "activo"):
                    continue
                for c in cols:
                    if vacio(f.get(c)):
                        sev = "critico" if c in obligatorios else GRAVEDAD_VACIO.get(tipo, "menor")
                        rep.agregar(sev, "Base de datos", tabla, ident, f"Campo vacío: {c}")

            # Formatos
            for c in mapa.get("telefono", []):
                if not vacio(f.get(c)) and (err := validar_telefono(f.get(c))):
                    rep.agregar("advertencia", "Base de datos", tabla, ident, f"Teléfono inválido ({c})", f"'{f.get(c)}': {err}")
            for c in mapa.get("email", []):
                v = f.get(c)
                if not vacio(v) and not RE_EMAIL.match(str(v).strip()):
                    rep.agregar("advertencia", "Base de datos", tabla, ident, f"Correo inválido ({c})", f"'{v}'")
            for c in mapa.get("url", []) + mapa.get("imagen", []):
                v = f.get(c)
                if not vacio(v) and isinstance(v, str) and not re.match(r"^https?://[^\s/]+\.[^\s]+", v.strip()):
                    if not v.strip().startswith("/"):
                        rep.agregar("advertencia", "Base de datos", tabla, ident, f"URL mal escrita ({c})",
                                    f"'{v}' (debe empezar con https://)")
            for c in mapa.get("precio", []):
                v = f.get(c)
                if not vacio(v):
                    try:
                        if float(v) <= 0:
                            rep.agregar("advertencia", "Base de datos", tabla, ident, f"Precio en cero o negativo ({c})", v)
                    except (TypeError, ValueError):
                        rep.agregar("advertencia", "Base de datos", tabla, ident, f"Precio no numérico ({c})", v)

            # Coordenadas (mapa de veterinarias)
            if mapa.get("latitud") and mapa.get("longitud"):
                la, lo = f.get(mapa["latitud"][0]), f.get(mapa["longitud"][0])
                try:
                    la, lo = float(la), float(lo)
                    if la == 0 and lo == 0:
                        rep.agregar("critico", "Base de datos", tabla, ident, "Coordenadas en (0, 0)", "El punto aparecería en el océano")
                    elif lat_min <= lo <= lat_max and lng_min <= la <= lng_max:
                        rep.agregar("critico", "Base de datos", tabla, ident, "Latitud y longitud invertidas", f"lat={la}, lng={lo}")
                    elif not (lat_min <= la <= lat_max and lng_min <= lo <= lng_max):
                        rep.agregar("advertencia", "Base de datos", tabla, ident, "Ubicación fuera de la zona de Curicó", f"lat={la}, lng={lo}")
                except (TypeError, ValueError):
                    pass  # vacío ya reportado arriba

            # Textos de prueba
            for c in mapa.get("nombre", []) + mapa.get("direccion", []):
                if TEXTO_PRUEBA.search(normalizar(f.get(c))):
                    rep.agregar("advertencia", "Base de datos", tabla, ident, "Parece un texto de prueba", f"{c}: '{f.get(c)}'")

            # Para duplicados
            for c in mapa.get("nombre", [])[:1]:
                if n := normalizar(f.get(c)):
                    vistos_nombre[n].append(ident)
            for c in mapa.get("telefono", [])[:1]:
                if len(d := solo_digitos(f.get(c))[-9:]) >= 8:
                    vistos_tel[d].append(ident)

        for n, regs in vistos_nombre.items():
            if len(regs) > 1:
                rep.agregar("advertencia", "Base de datos", tabla, " / ".join(regs[:4]), "Nombre duplicado", f"{len(regs)} registros con el mismo nombre")
        for d, regs in vistos_tel.items():
            if len(regs) > 1:
                rep.agregar("menor", "Base de datos", tabla, " / ".join(regs[:4]), "Teléfono repetido", f"{len(regs)} registros con el teléfono {d}")
    return datos


def etiqueta_registro(f, mapa):
    nombre = next((f.get(c) for c in mapa.get("nombre", []) if not vacio(f.get(c))), None)
    ident = next((f.get(c) for c in mapa.get("id", [])), None)
    if nombre and ident is not None:
        return f"{nombre} (id {ident})"
    return str(nombre or (f"id {ident}" if ident is not None else "registro sin id"))


def esta_activo(f, mapa):
    for c in mapa.get("activo", []):
        if f.get(c) is False:
            return False
    return True


# ----------------------------------------------------------------------------
# 2. Revisión de enlaces externos (con caché y en paralelo)
# ----------------------------------------------------------------------------

DOMINIOS_QUE_BLOQUEAN_ROBOTS = ("instagram.com", "facebook.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com", "wa.me", "whatsapp.com")
TEXTO_DOMINIO_ESTACIONADO = re.compile(
    r"(this domain (is|may be) for sale|domain for sale|dominio (esta|est.) en venta|buy this domain|parked free|este dominio ha expirado|domain has expired)", re.I)


_CACHE_URL: dict[str, dict] = {}


def revisar_url(url: str) -> dict:
    """Visita un enlace y devuelve si funciona. Cada URL se revisa una sola vez."""
    if url not in _CACHE_URL:
        _CACHE_URL[url] = _revisar_url(url)
    return _CACHE_URL[url]


def _revisar_url(url: str) -> dict:
    res = {"url": url, "ok": True, "problema": None, "detalle": "", "sev": None}
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20, allow_redirects=True, stream=True)
        cuerpo = ""
        if "text/html" in r.headers.get("Content-Type", ""):
            cuerpo = r.raw.read(200_000, decode_content=True).decode("utf-8", "ignore")
        r.close()
        bloquea = any(d in (urlparse(url).hostname or "") for d in DOMINIOS_QUE_BLOQUEAN_ROBOTS)
        if r.status_code >= 400:
            if bloquea and r.status_code in (401, 403, 429, 999):
                res.update(ok=True, sev="menor", problema="No verificable automáticamente",
                           detalle=f"{dominio_base(url)} bloquea robots (HTTP {r.status_code}); revisar a mano")
            else:
                res.update(ok=False, sev="critico", problema=f"Enlace roto (HTTP {r.status_code})", detalle=url)
        elif dominio_base(r.url) != dominio_base(url):
            res.update(ok=False, sev="advertencia", problema="Redirige a otro sitio", detalle=f"{url} → {r.url}")
        elif TEXTO_DOMINIO_ESTACIONADO.search(cuerpo):
            res.update(ok=False, sev="critico", problema="Dominio vencido o en venta", detalle=r.url)
    except requests.exceptions.SSLError:
        res.update(ok=False, sev="advertencia", problema="Certificado de seguridad inválido (HTTPS)", detalle=url)
    except requests.exceptions.RequestException as e:
        res.update(ok=False, sev="critico", problema="El sitio no responde", detalle=f"{url} ({type(e).__name__})")
    return res


def revisar_urls(urls, hilos=10) -> dict[str, dict]:
    urls = sorted({u for u in urls if u.startswith("http")})
    with cf.ThreadPoolExecutor(hilos) as ex:
        return dict(zip(urls, ex.map(revisar_url, urls)))


# ----------------------------------------------------------------------------
# 3. Recorrido del sitio como usuario (Playwright)
# ----------------------------------------------------------------------------

JS_PANEL = """(html) => {
  let b = document.getElementById('__pettgo_bot');
  if (!b) {
    b = document.createElement('div'); b.id = '__pettgo_bot';
    b.style.cssText = 'position:fixed;top:14px;right:14px;z-index:2147483647;background:#2B2420;color:#fff;' +
      'font:14px/1.45 system-ui,sans-serif;padding:14px 18px;border-radius:14px;max-width:380px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.35);border-left:6px solid #E08A3F';
    document.body.appendChild(b);
  }
  b.innerHTML = html;
}"""
JS_MARCAR = """(e, [color, etiqueta]) => {
  e.style.outline = '3px solid ' + color; e.style.outlineOffset = '3px'; e.style.borderRadius = '4px';
  if (etiqueta) {
    const t = document.createElement('span');
    t.textContent = etiqueta;
    t.style.cssText = 'position:absolute;z-index:2147483646;background:' + color + ';color:#fff;font:11px system-ui;' +
      'padding:2px 6px;border-radius:6px;pointer-events:none';
    const r = e.getBoundingClientRect();
    const arriba = r.top > 24 ? r.top - 20 : r.bottom + 4;   // si no cabe arriba, va debajo
    t.style.left = (r.left + window.scrollX) + 'px'; t.style.top = (arriba + window.scrollY) + 'px';
    document.body.appendChild(t);
  }
}"""
VERDE, AMARILLO, NARANJO, ROJO = "#2E9E5B", "#E0B33F", "#E08A3F", "#C0392B"


def panel(pagina, titulo, linea, rep: Reporte):
    c = rep.conteo()
    pagina.evaluate(JS_PANEL, (
        f"<div style='font-weight:700;font-size:15px'>🤖 Agente de calidad PettGo</div>"
        f"<div style='opacity:.75;margin:2px 0 8px'>{html.escape(titulo)}</div>"
        f"<div>{linea}</div>"
        f"<div style='margin-top:8px;opacity:.85'>Hallazgos: <b style='color:#ff8a80'>{c['critico']}</b> críticos · "
        f"<b style='color:#ffd180'>{c['advertencia']}</b> advertencias · {c['menor']} menores</div>"))


def demo_animar(pagina, info, url, n_pag, rep: Reporte, cfg, dom):
    """Modo demostración: muestra en pantalla lo que el agente revisa en esta página."""
    titulo = f"Página {n_pag}: {urlparse(url).path or '/'}"
    try:
        panel(pagina, titulo, "Leyendo la página…", rep)
        pagina.wait_for_timeout(800)
        for img in pagina.query_selector_all("img"):
            if img.evaluate("i => i.complete && i.naturalWidth === 0"):
                img.scroll_into_view_if_needed()
                img.evaluate(JS_MARCAR, [ROJO, "Imagen rota"])
                panel(pagina, titulo, "❌ Imagen rota encontrada", rep)
                pagina.wait_for_timeout(900)

        enlaces = pagina.query_selector_all("a")[: int(cfg.get("demo_max_enlaces", 25))]
        for i, a in enumerate(enlaces, 1):
          try:
            if not a.is_visible():
                continue
            href = (a.get_attribute("href") or "").strip()
            absu = a.evaluate("e => e.href") or ""
            texto = (a.inner_text(timeout=2000) or href)[:40].strip() or "(sin texto)"
            a.scroll_into_view_if_needed(timeout=2000)
            a.evaluate(JS_MARCAR, [AMARILLO, None])
            panel(pagina, titulo, f"Probando enlace {i}/{len(enlaces)}: <b>{html.escape(texto)}</b>", rep)
            pagina.wait_for_timeout(int(cfg.get("demo_pausa_ms", 350)))

            if href in ("", "#") or href.lower().startswith("javascript"):
                color, et, msg = ROJO, "Sin destino", "❌ Botón sin destino"
            elif href.startswith("tel:"):
                ok = validar_telefono(href[4:]) is None
                color, et, msg = (VERDE, "Teléfono OK", "✅ Teléfono válido") if ok else (ROJO, "Teléfono inválido", "❌ Teléfono inválido")
            elif href.startswith("mailto:"):
                ok = bool(RE_EMAIL.match(href[7:].split("?")[0]))
                color, et, msg = (VERDE, "Correo OK", "✅ Correo válido") if ok else (ROJO, "Correo inválido", "❌ Correo inválido")
            elif absu.startswith("http") and dominio_base(absu) != dom:
                panel(pagina, titulo, f"Visitando sitio externo: <b>{html.escape(dominio_base(absu))}</b>…", rep)
                r = revisar_url(urldefrag(absu)[0])
                if r["sev"] == "critico":
                    color, et, msg = ROJO, r["problema"], f"❌ {r['problema']}"
                elif r["sev"]:
                    color, et, msg = NARANJO, r["problema"], f"⚠️ {r['problema']}"
                else:
                    color, et, msg = VERDE, "Funciona", "✅ Sitio externo responde"
            else:
                color, et, msg = VERDE, None, "✅ Enlace interno (se visitará)"
            a.evaluate(JS_MARCAR, [color, et])
            panel(pagina, titulo, f"{html.escape(texto)} → {msg}", rep)
            pagina.wait_for_timeout(int(cfg.get("demo_pausa_ms", 350)))
          except Exception:  # noqa: BLE001 — enlace oculto o que cambió; se salta solo en la animación
            continue
        panel(pagina, titulo, "Página revisada ✔️  Pasando a la siguiente…", rep)
        pagina.wait_for_timeout(1500)
    except Exception as e:  # noqa: BLE001  — la demostración nunca debe detener la revisión
        print(f"   (demo) no se pudo animar esta página: {e}")


RE_DATO_MAL_CARGADO = re.compile(r"(?<![\w-])(undefined|NaN|null|\[object Object\]|\{\{.*?\}\})(?![\w-])")


def recorrer_sitio(cfg, rep: Reporte) -> dict:
    from playwright.sync_api import sync_playwright

    sitio = cfg["sitio"].rstrip("/")
    dom = dominio_base(sitio)
    max_pag = int(cfg.get("max_paginas", 80))
    pendientes = [sitio + "/"] + [urljoin(sitio + "/", p.lstrip("/")) for p in cfg.get("paginas_extra", [])]
    visitadas, externos, textos, enlaces_tel = set(), defaultdict(set), {}, []
    excluidas = [r.lower() for r in cfg.get("rutas_excluidas", ["/api/"])]
    sin_destino = set()

    with sync_playwright() as p:
        demo = bool(cfg.get("_demo"))
        nav = p.chromium.launch(headless=(not demo) or os.getenv("DEMO_SIN_VENTANA") == "1",
                                slow_mo=120 if demo else 0)
        # La identificación permite filtrar las visitas del agente en las métricas de PettGo
        ctx = nav.new_context(user_agent=UA + " Chrome", viewport={"width": 1366, "height": 850})
        pagina = ctx.new_page()
        errores_consola, recursos_fallidos = [], []
        pagina.on("console", lambda m: errores_consola.append(m.text) if m.type == "error" else None)
        pagina.on("response", lambda r: recursos_fallidos.append((r.status, r.url)) if r.status >= 400 else None)
        pagina.on("requestfailed", lambda r: recursos_fallidos.append(("fallo", r.url)))

        while pendientes and len(visitadas) < max_pag:
            url = urldefrag(pendientes.pop(0))[0]
            if url in visitadas:
                continue
            visitadas.add(url)
            print(f"[Sitio] Visitando página {len(visitadas)}: {url}")
            errores_consola.clear(); recursos_fallidos.clear()
            try:
                resp = pagina.goto(url, wait_until="networkidle", timeout=45_000)
            except Exception as e:  # noqa: BLE001
                rep.agregar("critico", "Sitio web", url, "-", "La página no carga", type(e).__name__, url)
                continue
            if dominio_base(pagina.url) != dom:
                # la ruta interna redirigió a un sitio externo: no se recorre como página de PettGo
                print(f"   → redirige fuera de PettGo ({dominio_base(pagina.url)}); no se recorre")
                continue
            if resp and resp.status >= 400:
                rep.agregar("critico", "Sitio web", url, "-", f"Página con error HTTP {resp.status}", "", url)
                if demo:
                    try:
                        panel(pagina, f"Página {len(visitadas)}: {urlparse(url).path}",
                              f"❌ <b>Esta página no existe (error {resp.status})</b><br>Un usuario que haga clic aquí llega a una página rota.", rep)
                        pagina.wait_for_timeout(2500)
                    except Exception:  # noqa: BLE001
                        pass
                continue
            pagina.wait_for_timeout(int(cfg.get("espera_ms", 1500)))  # deja cargar datos de Supabase

            info = pagina.evaluate("""() => ({
                texto: document.body ? document.body.innerText : '',
                enlaces: [...document.querySelectorAll('a')].map(a => ({href: a.getAttribute('href'), abs: a.href, txt: (a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,60)})),
                imgsRotas: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && (i.currentSrc||i.src)).map(i => i.currentSrc || i.src),
                imgsSinAlt: [...document.images].filter(i => !i.alt).length,
                titulo: document.title
            })""")
            textos[url] = info["texto"]
            rep.metricas["paginas_recorridas"] += 1

            if not info["titulo"].strip():
                rep.agregar("menor", "Sitio web", url, "-", "Página sin título", "", url)
            for m in sorted(set(RE_DATO_MAL_CARGADO.findall(info["texto"]))):
                rep.agregar("advertencia", "Sitio web", url, "-", "Dato mal cargado visible para el usuario",
                            f"Aparece el texto '{m}' en pantalla", url)
            for src in sorted(set(info["imgsRotas"])):
                rep.agregar("advertencia", "Sitio web", url, "-", "Imagen rota", src, url)
            ya_reportadas = set(info["imgsRotas"])
            for st, u in sorted(set((str(s), u) for s, u in recursos_fallidos)):
                if dominio_base(u) == dom and u not in ya_reportadas and not u.endswith("favicon.ico"):
                    rep.agregar("advertencia", "Sitio web", url, "-", f"Recurso interno falla ({st})", u, url)
            # "Failed to load resource" ya queda cubierto por imágenes/recursos fallidos
            for msg in sorted({m for m in errores_consola if "Failed to load resource" not in m})[:5]:
                rep.agregar("menor", "Sitio web", url, "-", "Error de programación en la página (consola)", msg, url)

            for a in info["enlaces"]:
                href, absu = (a["href"] or "").strip(), a["abs"]
                if href in ("", "#") or href.lower().startswith("javascript"):
                    clave = (a["txt"] or "(sin texto)", href)
                    if clave not in sin_destino:  # el mismo botón del menú o pie de página se reporta una vez
                        sin_destino.add(clave)
                        rep.agregar("menor", "Sitio web", url, clave[0], "Enlace o botón sin destino", f"href='{href}'", url)
                elif href.startswith("tel:"):
                    enlaces_tel.append((url, a["txt"], href))
                    if err := validar_telefono(href[4:]):
                        rep.agregar("advertencia", "Sitio web", url, a["txt"], "Teléfono del enlace 'llamar' inválido", f"{href}: {err}", url)
                elif href.startswith("mailto:"):
                    if not RE_EMAIL.match(href[7:].split("?")[0]):
                        rep.agregar("advertencia", "Sitio web", url, a["txt"], "Correo del enlace inválido", href, url)
                elif absu.startswith("http"):
                    limpio = urldefrag(absu)[0]
                    if dominio_base(limpio) == dom:
                        ruta = urlparse(limpio).path.lower()
                        if any(ruta.startswith(r) for r in excluidas):
                            continue  # ej. /api/ir/…: registraría clics falsos en las métricas
                        if limpio not in visitadas and not re.search(r"\.(pdf|jpg|jpeg|png|webp|svg|zip)$", limpio, re.I):
                            pendientes.append(limpio)
                    else:
                        externos[limpio].add(url)
            if demo:
                demo_animar(pagina, info, url, len(visitadas), rep, cfg, dom)
        if demo:
            pagina.goto("about:blank")
            pagina.evaluate("document.body.style.background='#FBF7F2'")
            panel(pagina, "Recorrido terminado", "Revisando enlaces externos restantes y cruzando con la base de datos…", rep)
            pagina.wait_for_timeout(2500)
        nav.close()

    rep.metricas["enlaces_externos"] = len(externos)
    print(f"[Sitio] {len(visitadas)} páginas recorridas · {len(externos)} enlaces externos")
    return {"textos": textos, "externos": externos, "tel": enlaces_tel}


# ----------------------------------------------------------------------------
# 4. Cruce base de datos ↔ sitio
# ----------------------------------------------------------------------------


def cruzar(cfg, rep: Reporte, datos_bd, sitio):
    texto_total = normalizar(" ".join(sitio["textos"].values()))
    digitos_total = solo_digitos(" ".join(sitio["textos"].values())) + "".join(solo_digitos(t[2]) for t in sitio["tel"])
    no_publicadas = set(cfg.get("tablas_no_publicadas") or [])

    for tabla, (filas, mapa, _) in datos_bd.items():
        if tabla in no_publicadas or not mapa.get("nombre"):
            continue
        for f in filas:
            if not esta_activo(f, mapa):
                continue
            nombre = normalizar(f.get(mapa["nombre"][0]))
            if len(nombre) < 3:
                continue
            ident = etiqueta_registro(f, mapa)
            if nombre not in texto_total:
                rep.agregar("advertencia", "Cruce BD-sitio", tabla, ident, "Registrado en la BD pero no aparece en el sitio",
                            "Revisar si debería estar publicado o si la página no lo carga")
                continue
            for c in mapa.get("telefono", [])[:1]:
                tel = solo_digitos(f.get(c))[-8:]
                if len(tel) == 8 and tel not in digitos_total:
                    rep.agregar("advertencia", "Cruce BD-sitio", tabla, ident, "El teléfono de la BD no aparece en el sitio",
                                f"BD: {f.get(c)} — puede estar desactualizado en la página")


# ----------------------------------------------------------------------------
# 5. Reporte
# ----------------------------------------------------------------------------


def marcar_nuevos(rep: Reporte, ruta_anterior: Path):
    previos = set()
    if ruta_anterior.exists():
        try:
            for h in json.loads(ruta_anterior.read_text("utf-8"))["hallazgos"]:
                previos.add((h["entidad"], h["registro"], h["problema"]))
        except Exception:  # noqa: BLE001
            pass
    for h in rep.hallazgos:
        h["nuevo"] = bool(previos) and (h["entidad"], h["registro"], h["problema"]) not in previos
    return bool(previos)


def resumen_ia(cfg, rep: Reporte) -> str:
    """Opcional: si existe ANTHROPIC_API_KEY, un modelo redacta el resumen ejecutivo."""
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key or not cfg.get("resumen_ia", True):
        return ""
    muestra = sorted(rep.hallazgos, key=lambda h: SEVERIDADES.index(h["severidad"]))[:80]
    try:
        r = requests.post("https://api.anthropic.com/v1/messages", timeout=60, headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": cfg.get("modelo_ia", "claude-haiku-5-5"), "max_tokens": 600, "messages": [{"role": "user", "content":
                "Eres el agente de control de calidad de PettGo (plataforma de mascotas en Curicó). "
                "Redacta en español, en máximo 6 líneas, un resumen para el equipo: qué es lo más urgente de corregir hoy y por qué afecta al usuario. "
                "No inventes datos. Hallazgos (JSON):\n" + json.dumps(muestra, ensure_ascii=False)}]})
        r.raise_for_status()
        return "".join(b.get("text", "") for b in r.json().get("content", []))
    except Exception as e:  # noqa: BLE001
        print(f"[IA] No se pudo generar el resumen: {e}")
        return ""


def generar_reporte(cfg, rep: Reporte, carpeta: Path, hay_previo: bool, resumen: str) -> Path:
    carpeta.mkdir(parents=True, exist_ok=True)
    ahora = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3)))
    c = rep.conteo()
    rep.hallazgos.sort(key=lambda h: (SEVERIDADES.index(h["severidad"]), h["origen"], h["entidad"]))
    datos = {"fecha": ahora.isoformat(), "sitio": cfg["sitio"], "conteo": c, "metricas": dict(rep.metricas),
             "resumen_ia": resumen, "hallazgos": rep.hallazgos}
    (carpeta / "ultimo.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), "utf-8")

    filas = "\n".join(
        f"<tr class='{h['severidad']}'><td><span class='pill {h['severidad']}'>{ETIQUETA_SEV[h['severidad']]}</span>"
        f"{' <span class=nuevo>nuevo</span>' if h.get('nuevo') else ''}</td>"
        f"<td>{html.escape(h['origen'])}</td><td>{html.escape(h['entidad'])}</td><td>{html.escape(h['registro'])}</td>"
        f"<td><b>{html.escape(h['problema'])}</b><div class=det>{html.escape(h['detalle'])}</div></td></tr>"
        for h in rep.hallazgos) or "<tr><td colspan=5>Sin hallazgos. Todo correcto. ✅</td></tr>"
    m = rep.metricas
    pagina = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Control de calidad PettGo</title><style>
:root{{--bg:#FBF7F2;--card:#fff;--tx:#2B2420;--mut:#7A6E66;--ln:#EADFD3;--acc:#E08A3F;--cr:#C0392B;--ad:#C77C0E;--me:#5D7A8C}}
body{{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}}
main{{max-width:1100px;margin:auto;padding:24px 16px}} h1{{margin:0 0 4px;font-size:24px}} .sub{{color:var(--mut)}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}}
.kpi{{background:var(--card);border:1px solid var(--ln);border-radius:12px;padding:14px}} .kpi b{{font-size:26px;display:block}}
.kpi.critico b{{color:var(--cr)}} .kpi.advertencia b{{color:var(--ad)}} .kpi.menor b{{color:var(--me)}}
.ia{{background:#FFF3E6;border-left:4px solid var(--acc);padding:12px 16px;border-radius:8px;white-space:pre-wrap}}
.tabla{{overflow-x:auto;background:var(--card);border:1px solid var(--ln);border-radius:12px;margin-top:16px}}
table{{border-collapse:collapse;width:100%;min-width:720px}} th,td{{text-align:left;padding:10px 12px;border-bottom:1px solid var(--ln);vertical-align:top}}
th{{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}} .det{{color:var(--mut);font-size:13px;word-break:break-all}}
.pill{{font-size:12px;padding:2px 8px;border-radius:99px;color:#fff;white-space:nowrap}} .pill.critico{{background:var(--cr)}} .pill.advertencia{{background:var(--ad)}} .pill.menor{{background:var(--me)}}
.nuevo{{font-size:11px;color:var(--acc);font-weight:700}}
</style></head><body><main>
<h1>Control de calidad de la información · PettGo</h1>
<div class="sub">Revisión automática del {ahora:%d-%m-%Y %H:%M} · {html.escape(cfg['sitio'])}</div>
<div class="kpis">
<div class="kpi critico"><b>{c['critico']}</b>Críticos</div><div class="kpi advertencia"><b>{c['advertencia']}</b>Advertencias</div>
<div class="kpi menor"><b>{c['menor']}</b>Menores</div><div class="kpi"><b>{m.get('registros_revisados',0)}</b>Registros en BD revisados</div>
<div class="kpi"><b>{m.get('paginas_recorridas',0)}</b>Páginas recorridas</div><div class="kpi"><b>{m.get('enlaces_externos',0)}</b>Enlaces externos probados</div>
</div>
{f'<div class="ia"><b>Resumen del agente</b>\n{html.escape(resumen)}</div>' if resumen else ''}
{'' if hay_previo else '<p class="sub">Primera ejecución: aún no hay un reporte anterior para marcar hallazgos nuevos.</p>'}
<div class="tabla"><table><thead><tr><th>Gravedad</th><th>Origen</th><th>Tabla / página</th><th>Registro</th><th>Problema</th></tr></thead>
<tbody>{filas}</tbody></table></div></main></body></html>"""
    ruta = carpeta / "reporte.html"
    ruta.write_text(pagina, "utf-8")

    # Resumen en Markdown (lo muestra GitHub en la ejecución)
    md = [f"## Control de calidad PettGo — {ahora:%d-%m-%Y %H:%M}",
          f"**{c['critico']} críticos · {c['advertencia']} advertencias · {c['menor']} menores** "
          f"({m.get('registros_revisados',0)} registros, {m.get('paginas_recorridas',0)} páginas, {m.get('enlaces_externos',0)} enlaces externos)", ""]
    if resumen:
        md += ["> " + resumen.replace("\n", "\n> "), ""]
    md += ["| Gravedad | Origen | Tabla/página | Registro | Problema |", "|---|---|---|---|---|"]
    for h in rep.hallazgos[:200]:
        md.append(f"| {ETIQUETA_SEV[h['severidad']]}{' 🆕' if h.get('nuevo') else ''} | {h['origen']} | {h['entidad']} | "
                  f"{h['registro'].replace('|','/')} | {h['problema']} — {h['detalle'].replace('|','/')} |")
    (carpeta / "resumen.md").write_text("\n".join(md), "utf-8")
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as fh:
            fh.write("\n".join(md))
    return ruta


def guardar_en_supabase(cfg, rep: Reporte, resumen: str):
    """Fase 2: guarda el reporte en la tabla reportes_calidad para verlo en pettgo.cl/admin/calidad.
    Necesita la llave SECRETA de Supabase (SUPABASE_SECRET_KEY); sin ella, se omite."""
    url = (os.getenv("SUPABASE_URL") or "").strip()
    llave = (os.getenv("SUPABASE_SECRET_KEY") or "").strip()
    if not (url and llave):
        print("[Supabase] Sin SUPABASE_SECRET_KEY: el reporte no se guarda en pettgo.cl (solo en GitHub/archivo).")
        return
    c = rep.conteo()
    fila = {
        "origen": "automatico" if os.getenv("GITHUB_ACTIONS") else "manual",
        "sitio": cfg["sitio"],
        "criticos": c["critico"], "advertencias": c["advertencia"], "menores": c["menor"],
        "metricas": dict(rep.metricas),
        "resumen_ia": resumen or None,
        "hallazgos": rep.hallazgos,
    }
    h = {"apikey": llave, "Content-Type": "application/json", "Prefer": "return=minimal", "User-Agent": UA}
    if llave.startswith("eyJ"):  # llave service_role antigua (JWT)
        h["Authorization"] = f"Bearer {llave}"
    try:
        r = requests.post(url.rstrip("/") + "/rest/v1/" + cfg.get("tabla_reportes", "reportes_calidad"),
                          headers=h, data=json.dumps(fila, ensure_ascii=False, default=str).encode("utf-8"), timeout=30)
        r.raise_for_status()
        print("[Supabase] Reporte guardado en la tabla reportes_calidad (visible en pettgo.cl/admin/calidad).")
    except Exception as e:  # noqa: BLE001 — si falla, el resto del reporte igual queda en GitHub
        print(f"[Supabase] No se pudo guardar el reporte: {e}")


def enviar_correo(cfg, rep: Reporte, ruta_html: Path):
    usuario, clave, destino = os.getenv("SMTP_USUARIO"), os.getenv("SMTP_CLAVE"), os.getenv("CORREO_DESTINO")
    if not (usuario and clave and destino):
        print("[Correo] No configurado (faltan SMTP_USUARIO / SMTP_CLAVE / CORREO_DESTINO). Se omite.")
        return
    c = rep.conteo()
    if cfg.get("correo_solo_si_hay_problemas", True) and c["critico"] + c["advertencia"] == 0:
        print("[Correo] Sin problemas relevantes; no se envía.")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"PettGo · Control de calidad: {c['critico']} críticos, {c['advertencia']} advertencias"
    msg["From"], msg["To"] = usuario, destino
    msg.attach(MIMEText(ruta_html.read_text("utf-8"), "html", "utf-8"))
    with smtplib.SMTP(os.getenv("SMTP_SERVIDOR", "smtp.gmail.com"), int(os.getenv("SMTP_PUERTO", "587"))) as s:
        s.starttls(); s.login(usuario, clave)
        s.sendmail(usuario, [d.strip() for d in destino.split(",")], msg.as_string())
    print(f"[Correo] Reporte enviado a {destino}")


# ----------------------------------------------------------------------------
# Programa principal
# ----------------------------------------------------------------------------


def cargar_env_local():
    """Lee credenciales desde un archivo .env (solo para uso en un computador; nunca subirlo a GitHub)."""
    ruta = BASE_DIR / ".env"
    if ruta.exists():
        for linea in ruta.read_text("utf-8").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Agente de control de calidad de la información — PettGo")
    ap.add_argument("--demo", action="store_true", help="abre una ventana de Chrome y muestra el recorrido en vivo")
    args = ap.parse_args()

    cargar_env_local()
    cfg = yaml.safe_load((BASE_DIR / os.getenv("CONFIG", "config.yaml")).read_text("utf-8"))
    cfg["sitio"] = os.getenv("SITIO_URL", cfg.get("sitio", "https://www.pettgo.cl"))
    cfg["_demo"] = args.demo
    if args.demo:
        print("🤖 Modo demostración: se abrirá una ventana de Chrome con el recorrido en vivo.\n")
    carpeta = BASE_DIR / cfg.get("carpeta_reportes", "reportes")
    rep = Reporte()

    datos_bd = {}
    sb_url, sb_key = (os.getenv("SUPABASE_URL") or "").strip(), (os.getenv("SUPABASE_KEY") or "").strip()
    if sb_url and sb_key:
        datos_bd = revisar_bd(cfg, rep, Supabase(sb_url, sb_key))
    else:
        rep.agregar("critico", "Base de datos", "-", "-", "Faltan las credenciales de Supabase",
                    "Configura SUPABASE_URL y SUPABASE_KEY (ver README)")

    sitio = {"textos": {}, "externos": {}, "tel": []}
    if cfg.get("revisar_sitio", True):
        try:
            sitio = recorrer_sitio(cfg, rep)
        except Exception as e:  # noqa: BLE001
            rep.agregar("critico", "Sitio web", cfg["sitio"], "-", "No se pudo recorrer el sitio", e)

    # Enlaces externos: los del sitio + los registrados en la BD
    urls_bd = defaultdict(list)
    for tabla, (filas, mapa, _) in datos_bd.items():
        for f in filas:
            if esta_activo(f, mapa):
                for c in mapa.get("url", []) + (mapa.get("imagen", []) if cfg.get("revisar_imagenes_bd", True) else []):
                    v = f.get(c)
                    if isinstance(v, str) and v.strip().startswith("http"):
                        urls_bd[v.strip()].append((tabla, etiqueta_registro(f, mapa), c))
    resultados = revisar_urls(set(sitio["externos"]) | set(urls_bd), int(cfg.get("hilos", 10)))
    for u, res in resultados.items():
        if not res["sev"]:
            continue
        for tabla, ident, col in urls_bd.get(u, []):
            rep.agregar(res["sev"], "Base de datos", tabla, ident, f"{res['problema']} ({col})", res["detalle"], u)
        for pag in sorted(sitio["externos"].get(u, [])):
            rep.agregar(res["sev"], "Sitio web", pag, u, res["problema"], res["detalle"], u)

    if datos_bd and sitio["textos"]:
        cruzar(cfg, rep, datos_bd, sitio)

    hay_previo = marcar_nuevos(rep, carpeta / "ultimo.json")
    resumen = resumen_ia(cfg, rep)
    ruta = generar_reporte(cfg, rep, carpeta, hay_previo, resumen)
    c = rep.conteo()
    print(f"\nListo: {c['critico']} críticos, {c['advertencia']} advertencias, {c['menor']} menores → {ruta}")
    guardar_en_supabase(cfg, rep, resumen)

    try:
        enviar_correo(cfg, rep, ruta)
    except Exception as e:  # noqa: BLE001
        print(f"[Correo] Error al enviar: {e}")

    if args.demo:
        import webbrowser
        webbrowser.open(ruta.resolve().as_uri())
        return

    if cfg.get("fallar_si_hay_criticos", True) and c["critico"] > 0:
        sys.exit(1)  # GitHub avisa por correo cuando una ejecución falla


if __name__ == "__main__":
    main()

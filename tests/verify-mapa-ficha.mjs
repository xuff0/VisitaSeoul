// Tocar un punto del mapa: ficha breve sobre el mapa, en tamaño de teléfono.
//
// Antes se hacían dos cosas que se peleaban: se abría el globo de Leaflet y, al mismo tiempo, la
// página se desplazaba a la lista. El globo quedaba fuera de pantalla —nunca se veía— y el mapa
// desaparecía entero. Ahora la información sale en una hoja sobre el mapa, y bajar a la ficha
// larga es una acción explícita.
import pkg from "@playwright/test";
const { chromium } = pkg;
import { mkdirSync } from "node:fs";

const EXEC = process.env.PW_CHROMIUM || undefined;
const BASE = process.env.BASE_URL || "http://localhost:3000";
const shots = process.env.SHOTS_DIR || "test-results";
mkdirSync(shots, { recursive: true });

let failures = 0;
const ok = (n, c, e = "") => { console.log(`${c ? "  ok  " : "FAIL  "}${n}${e ? " — " + e : ""}`); if (!c) failures++; };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-BO",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const geometria = () =>
  page.evaluate(() => {
    const h = document.querySelector("[data-hoja]")?.getBoundingClientRect();
    const m = document.querySelector(".leaflet-container").getBoundingClientRect();
    const barra = document.querySelector("div.sticky").getBoundingClientRect().height;
    return {
      hoja: !!h,
      scrollY: Math.round(window.scrollY),
      mapaVisiblePx: Math.round(Math.min(m.bottom, h ? h.top : window.innerHeight) - Math.max(m.top, barra)),
      globos: document.querySelectorAll(".leaflet-popup").length,
      titulo: document.querySelector("[data-hoja] h2")?.textContent ?? null,
    };
  });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".vs-pin", { timeout: 15000 });
await page.waitForTimeout(1500);

// Un grupo chico: con 141 puntos a escala de ciudad se tapan entre sí.
await page.getByRole("button", { name: "K-beauty 9", exact: true }).click();
await page.waitForTimeout(1300);

// ------------------------------------------------ tocar un punto
await page.locator(".vs-pin").first().click({ force: true });
await page.waitForTimeout(1500);
const g = await geometria();

ok("se abre la ficha breve", g.hoja, g.titulo ?? "");
ok("ya no quedan globos de Leaflet", g.globos === 0);
ok("el mapa sigue a la vista, y con espacio", g.mapaVisiblePx > 300, `${g.mapaVisiblePx} px de mapa`);
ok("la página no se va de viaje sola", g.scrollY < 400, `scrollY ${g.scrollY}`);

// ------------------------------------------------ contenido de la hoja
const contenido = await page.evaluate(() => {
  const h = document.querySelector("[data-hoja]");
  return {
    coreano: h.querySelector("[lang=ko]")?.textContent ?? "",
    texto: h.textContent,
    productos: [...h.querySelectorAll('a[href*="shopping.naver"]')].map((a) => a.textContent.trim()),
    multiplos: [...h.querySelectorAll('a[href*="shopping.naver"] span:last-child')].map((s) => s.textContent.trim()),
  };
});
ok("muestra el nombre en coreano", /[ㄱ-ㆎ가-힣]/.test(contenido.coreano), contenido.coreano);
ok("muestra la estación más cercana", /a \d+ m|a \d+[.,]\d+ km/.test(contenido.texto));
ok("muestra qué comprar ahí", contenido.productos.length > 0, contenido.productos[0]?.slice(0, 44));
ok("los productos abren el precio en Naver", contenido.productos.length > 0);

// El orden importa: lo primero que se lee tiene que ser lo que más conviene.
const conMultiplo = contenido.multiplos.map((m) => parseFloat(m.replace(",", ".")))
  .filter((n) => Number.isFinite(n));
ok("ordenados por conveniencia, el mejor primero",
   conMultiplo.every((n, i) => i === 0 || conMultiplo[i - 1] >= n), conMultiplo.join(" ≥ "));

// ------------------------------------------------ el punto no queda tapado por la hoja
const puntoVisible = await page.evaluate(() => {
  const sel = document.querySelector(".vs-pin.is-selected");
  if (!sel) return null;
  const r = sel.getBoundingClientRect();
  const h = document.querySelector("[data-hoja]").getBoundingClientRect();
  const barra = document.querySelector("div.sticky").getBoundingClientRect().height;
  return { tapadoPorLaHoja: r.top > h.top, tapadoPorLaBarra: r.bottom < barra };
});
ok("el punto seleccionado no queda escondido detrás de la hoja",
   puntoVisible && !puntoVisible.tapadoPorLaHoja && !puntoVisible.tapadoPorLaBarra, JSON.stringify(puntoVisible));

await page.screenshot({ path: `${shots}/21-hoja.png` });

// ------------------------------------------------ saltar de un punto a otro sin desplazarse
const antes = (await geometria()).scrollY;
await page.locator(".vs-pin").nth(1).click({ force: true });
await page.waitForTimeout(1000);
const despues = await geometria();
ok("tocar otro punto cambia la hoja", despues.titulo !== g.titulo, `${g.titulo} → ${despues.titulo}`);
ok("y comparar dos lugares no obliga a desplazarse", Math.abs(despues.scrollY - antes) < 40, `${antes} → ${despues.scrollY}`);

// ------------------------------------------------ cerrar
await page.locator("[data-hoja]").getByRole("button", { name: "Cerrar" }).click();
await page.waitForTimeout(600);
ok("la equis cierra la hoja", (await page.locator("[data-hoja]").count()) === 0);

await page.locator(".vs-pin").first().click({ force: true });
await page.waitForTimeout(900);
ok("se puede volver a abrir", (await page.locator("[data-hoja]").count()) === 1);

// tocar el mapa lejos de cualquier punto
await page.locator(".leaflet-container").click({ position: { x: 30, y: 30 } });
await page.waitForTimeout(600);
ok("tocar el fondo del mapa la cierra", (await page.locator("[data-hoja]").count()) === 0);

// ------------------------------------------------ bajar a la ficha larga, ahora a pedido
await page.locator(".vs-pin").first().click({ force: true });
await page.waitForTimeout(900);
const tituloHoja = await page.locator("[data-hoja] h2").textContent();
await page.locator("[data-hoja]").getByRole("button", { name: "Ver ficha completa" }).click();
await page.waitForTimeout(1500);

ok("«Ver ficha completa» cierra la hoja", (await page.locator("[data-hoja]").count()) === 0);
const ficha = await page.evaluate(() => {
  const el = document.querySelector("[data-place-id].border-ink");
  if (!el) return null;
  const barra = document.querySelector("div.sticky").getBoundingClientRect().height;
  const r = el.getBoundingClientRect();
  return {
    nombre: el.textContent.trim().slice(0, 40),
    destella: el.classList.contains("vs-flash"),
    tapada: r.top < barra - 1,
    fuera: r.bottom < 0 || r.top > window.innerHeight,
  };
});
ok("baja a la ficha del mismo lugar", ficha && tituloHoja && ficha.nombre.startsWith(tituloHoja.slice(0, 14)), `${tituloHoja} / ${ficha?.nombre}`);
ok("y la ficha destella al llegar", ficha?.destella);
ok("sin quedar tapada ni fuera de pantalla", ficha && !ficha.tapada && !ficha.fuera);

// ------------------------------------------------ «Acercar» hace el camino inverso
await page.locator("[data-place-id].border-ink").getByRole("button", { name: "Acercar" }).click();
await page.waitForTimeout(1400);
const volvio = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-container").getBoundingClientRect();
  return m.bottom > 0 && m.top < window.innerHeight;
});
ok("«Acercar» devuelve la vista al mapa", volvio);

ok("sin errores de página", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

// Ir del punto del mapa a su ficha, en tamaño de teléfono.
//
// Tres cosas que se rompieron antes y no deberían volver a romperse: el destello que señala la
// ficha (se aplicaba tocando el DOM, y el render de React lo borraba), el desplazamiento que
// dejaba la ficha debajo de la barra de filtros, y el orden de capas — los rincones de control de
// Leaflet usan z-index 1000 y se dibujaban sobre el buscador.
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
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-BO",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".vs-pin", { timeout: 15000 });
await page.waitForTimeout(1500);

// ------------------------------------------------ la barra manda sobre el mapa
// Con el mapa desplazado bajo la barra, cada punto de la barra tiene que responder a la barra.
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(500);
const quienResponde = await page.evaluate(() =>
  [[380, 18], [200, 60], [100, 150], [350, 120]].map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest("div.sticky") ? "barra" : `mapa:${String(el?.className).slice(0, 24)}`;
  }),
);
ok("la barra de filtros queda por encima de los controles de Leaflet",
   quienResponde.every((q) => q === "barra"), quienResponde.join(" | "));

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);

// ------------------------------------------------ del punto a la ficha
// Se filtra a un grupo chico: con 141 puntos a escala de ciudad se tapan entre sí.
await page.getByRole("button", { name: "Ópticas 4", exact: true }).click();
await page.waitForTimeout(1200);
ok("el filtro deja pocos puntos, sin encimarse", (await page.locator(".vs-pin").count()) === 4);

await page.locator(".vs-pin").first().click({ force: true });
await page.waitForTimeout(400);

ok("la ficha destella al llegar", (await page.locator("[data-place-id].vs-flash").count()) === 1);

const pos = await page.evaluate(() => {
  const el = document.querySelector("[data-place-id].border-ink");
  if (!el) return null;
  const barra = document.querySelector("div.sticky").getBoundingClientRect().height;
  const r = el.getBoundingClientRect();
  return {
    nombre: el.textContent.trim().slice(0, 28),
    tapadaPorLaBarra: r.top < barra - 1,
    fueraDePantalla: r.bottom < 0 || r.top > window.innerHeight,
    holguraBajoLaBarra: Math.round(r.top - barra),
  };
});
ok("la ficha seleccionada es la del punto tocado", pos?.nombre?.includes("ópticas") || pos?.nombre?.includes("Davich"), pos?.nombre);
ok("no queda tapada por la barra de filtros", pos && !pos.tapadaPorLaBarra, `holgura ${pos?.holguraBajoLaBarra}px`);
ok("queda dentro de la pantalla", pos && !pos.fueraDePantalla);
await page.screenshot({ path: `${shots}/12-destello.png` });

await page.waitForTimeout(1800);
ok("el destello se apaga solo", (await page.locator("[data-place-id].vs-flash").count()) === 0);

// Tocar el mismo punto otra vez: tiene que volver a destellar y, como la ficha ya quedó a la
// vista del toque anterior, la pantalla no debería moverse. Un salto sin motivo desorienta más
// de lo que ayuda.
const scrollTrasElPrimerToque = await page.evaluate(() => window.scrollY);
await page.locator(".vs-pin").first().click({ force: true });
await page.waitForTimeout(400);
ok("volver a tocar el mismo punto vuelve a destellar", (await page.locator("[data-place-id].vs-flash").count()) === 1);

const scrollTrasElSegundo = await page.evaluate(() => window.scrollY);
ok(
  "con la ficha ya a la vista, la pantalla no salta",
  Math.abs(scrollTrasElSegundo - scrollTrasElPrimerToque) < 30,
  `${scrollTrasElPrimerToque} → ${scrollTrasElSegundo}`,
);

// ------------------------------------------------ y de la ficha de vuelta al mapa
await page.waitForTimeout(1600);
await page.locator("[data-place-id].border-ink").getByRole("button", { name: "Acercar" }).click();
await page.waitForTimeout(1500);
const mapa = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-container").getBoundingClientRect();
  return { visible: m.bottom > 0 && m.top < window.innerHeight, top: Math.round(m.top) };
});
ok("«Acercar» devuelve la vista al mapa", mapa.visible, `top del mapa: ${mapa.top}`);

ok("sin errores de página", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

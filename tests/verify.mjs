// Verificación en navegador real contra el build de producción: mapa, filtros, búsqueda en
// hangul y ubicación.
//
// Si los mosaicos del mapa no cargan (sin red, o detrás de un proxy que los bloquea) el mapa cae
// a la base vectorial embebida y las comprobaciones pasan igual: los marcadores no dependen de
// los mosaicos.
import pkg from "@playwright/test";
const { chromium } = pkg;
import { mkdirSync } from "node:fs";

// Chromium: el de Playwright por defecto. PW_CHROMIUM permite apuntar a uno ya instalado, que es
// lo que hace falta en entornos donde no se puede descargar navegadores.
const EXEC = process.env.PW_CHROMIUM || undefined;
const BASE = process.env.BASE_URL || "http://localhost:3000";
const shots = process.env.SHOTS_DIR || "test-results";
mkdirSync(shots, { recursive: true });

let failures = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["geolocation"],
  geolocation: { latitude: 37.5636, longitude: 126.9827 }, // Myeongdong
  locale: "es-BO",
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/tile|Failed to load resource|net::ERR/i.test(m.text())) errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

// ---------------------------------------------------------------- mapa
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".leaflet-container", { timeout: 15000 });
await page.waitForTimeout(2500);

const pins = await page.locator(".vs-pin").count();
ok("el mapa dibuja los marcadores", pins > 100, `${pins} marcadores`);

const countText = await page.getByText(/^\d+ sitios/).first().textContent();
ok("la lista informa el total", /134 sitios/.test(countText ?? ""), countText?.trim());

const cards = await page.locator("[data-place-id]").count();
ok("la lista renderiza las fichas", cards === 134, `${cards} fichas`);

await page.screenshot({ path: `${shots}/01-mapa.png` });

// ---------------------------------------------------------------- filtros
await page.getByRole("button", { name: /K-beauty/ }).click();
await page.waitForTimeout(600);
const kb = await page.locator("[data-place-id]").count();
ok("el filtro de K-beauty acota la lista", kb === 9, `${kb} sitios`);

await page.getByRole("button", { name: /^Todos/ }).click();
await page.waitForTimeout(400);

// búsqueda por coreano: es la razón de llevar los nombres en hangul
await page.getByRole("searchbox", { name: "Buscar sitios" }).fill("올리브영");
await page.waitForTimeout(500);
const koHits = await page.locator("[data-place-id]").count();
ok("la búsqueda encuentra por hangul", koHits === 5, `${koHits} sitios para 올리브영`);

await page.getByRole("searchbox", { name: "Buscar sitios" }).fill("");
await page.waitForTimeout(400);

// ---------------------------------------------------------------- ubicación
await page.getByRole("button", { name: "Mi ubicación" }).click();
await page.waitForTimeout(2500);
const liveText = await page.locator("text=/Ubicación en vivo/").count();
ok("toma la ubicación en vivo", liveText > 0);

const nearText = (await page.locator("text=/Estación más cercana/").first().textContent()) ?? "";
ok("calcula la estación más cercana", /명동|Myeongdong|을지로|Euljiro/.test(nearText), nearText.trim().slice(0, 90));

await page.getByRole("button", { name: "500 m" }).click();
await page.waitForTimeout(600);
const near500 = await page.locator("[data-place-id]").count();
ok("el radio de 500 m filtra de verdad", near500 > 0 && near500 < 40, `${near500} sitios a menos de 500 m`);

const firstNear = (await page.locator("[data-place-id]").first().textContent()) ?? "";
ok("las fichas muestran la distancia", /de vos/.test(firstNear));

await page.screenshot({ path: `${shots}/02-cerca-de-mi.png` });
await page.getByRole("button", { name: "500 m" }).click();
await page.waitForTimeout(400);

ok("sin errores de consola", errors.length === 0, errors.slice(0, 3).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

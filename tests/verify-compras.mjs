// Módulo de compras, exportación y modo sin conexión.
import pkg from "@playwright/test";
const { chromium } = pkg;
import { mkdirSync, readFileSync } from "node:fs";

// Chromium: el de Playwright por defecto. PW_CHROMIUM permite apuntar a uno ya instalado, que es
// lo que hace falta en entornos donde no se puede descargar navegadores.
const EXEC = process.env.PW_CHROMIUM || undefined;
const BASE = process.env.BASE_URL || "http://localhost:3000";
const shots = process.env.SHOTS_DIR || "test-results";
mkdirSync(shots, { recursive: true });

let failures = 0;
const ok = (n, c, e = "") => { console.log(`${c ? "  ok  " : "FAIL  "}${n}${e ? " — " + e : ""}`); if (!c) failures++; };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, locale: "es-BO" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// ---------------------------------------------------------------- comprar
await page.goto(`${BASE}/comprar`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const top = (await page.locator("text=Los mejores arbitrajes").locator("xpath=..").textContent()) ?? "";
ok("el ranking encabeza con las mascarillas", /Mediheal/.test(top), top.replace(/\s+/g, " ").slice(40, 130));

const rows = await page.locator("ul > li").filter({ has: page.getByRole("link", { name: "Precio en Naver" }) }).count();
ok("lista los 61 productos", rows === 61, `${rows} productos`);

// El orden por múltiplo es la respuesta a "qué me conviene traer".
const firstRow = (await page.locator("li").filter({ has: page.getByRole("link", { name: "Precio en Naver" }) }).first().textContent()) ?? "";
ok("ordena por mejor arbitraje", /Mediheal/.test(firstRow), firstRow.replace(/\s+/g, " ").slice(0, 60));

// conversor
const convField = page.getByText("Precio en Corea (₩)").locator("xpath=..");
await convField.getByRole("textbox").fill("15000");
await page.waitForTimeout(400);
const convText = (await convField.textContent()) ?? "";
ok("el conversor pasa ₩15.000 a dólares y bolivianos", /\$11/.test(convText) && /Bs 136/.test(convText),
   convText.replace(/\s+/g, " ").match(/= \$[\d,.]+ · Bs [\d,.]+/)?.[0]);

// franquicia
const alw = page.getByText("Franquicia de aduana", { exact: true }).locator("xpath=../..");
await page.getByPlaceholder("Qué compraste").fill("Mascarillas 10+10");
await page.getByPlaceholder("₩ pagado").fill("500000");
await page.getByRole("button", { name: "Sumar", exact: true }).click();
await page.waitForTimeout(600);
let alwText = (await alw.textContent()) ?? "";
ok("la franquicia suma la compra", /\$370/.test(alwText), alwText.replace(/\s+/g, " ").match(/\$[\d,.]+ de \$[\d,.]+/)?.[0]);
ok("informa cuánto queda libre", /Te quedan/.test(alwText));

// cruzar la franquicia tiene que avisar, no pasar en silencio
await page.getByPlaceholder("Qué compraste").fill("Lentes y ginseng");
await page.getByPlaceholder("₩ pagado").fill("900000");
await page.getByRole("button", { name: "Sumar", exact: true }).click();
await page.waitForTimeout(600);
alwText = (await alw.textContent()) ?? "";
ok("avisa al pasar los $1.000", /Pasaste la franquicia|Menor Cuantía/.test(alwText));

await page.getByRole("button", { name: "Somos dos" }).click();
await page.waitForTimeout(500);
alwText = (await alw.textContent()) ?? "";
ok("«somos dos» duplica el tope a $2.000", /de \$2\.000/.test(alwText));

await page.screenshot({ path: `${shots}/04-comprar.png`, fullPage: false });

// ---------------------------------------------------------------- exportar
await page.getByRole("link", { name: /Mi viaje/ }).click();
await page.waitForTimeout(1200);

for (const [label, check] of [
  ["GeoJSON", (t) => { const j = JSON.parse(t); return j.type === "FeatureCollection" && j.features.length === 134; }],
  ["KML", (t) => t.includes("<kml") && t.includes("<Folder>") && t.includes("올리브영")],
  ["GPX", (t) => t.includes("<gpx") && (t.match(/<wpt /g) ?? []).length === 134],
  ["CSV", (t) => t.charCodeAt(0) === 0xfeff && t.split("\n").length === 135],
]) {
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: label, exact: true }).click(),
  ]);
  const body = readFileSync(await dl.path(), "utf8");
  ok(`exporta ${label} válido`, check(body), `${dl.suggestedFilename()}, ${body.length} bytes`);
}

// respaldo completo
const [bk] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Descargar respaldo" }).click(),
]);
const backup = JSON.parse(readFileSync(await bk.path(), "utf8"));
ok("el respaldo incluye las compras cargadas", backup.purchases.length === 2, `${backup.purchases.length} compras`);
ok("el respaldo se identifica para no restaurar cualquier archivo", backup.app === "visitaseoul" && backup.version === 2);

const trip = (await page.locator("body").textContent()) ?? "";
ok("avisa que sin cuenta los datos viven sólo en este navegador", /vive sólo en este navegador/.test(trip));

await page.screenshot({ path: `${shots}/05-viaje.png` });

// ---------------------------------------------------------------- sin conexión
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3000); // que el service worker termine de instalarse
const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(() => true).catch(() => false));
ok("el service worker queda activo", swReady);

await ctx.setOffline(true);
await page.goto(`${BASE}/comprar`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const offlineRows = await page.locator("ul > li").filter({ has: page.getByRole("link", { name: "Precio en Naver" }) }).count();
ok("sin conexión, el catálogo sigue entero", offlineRows === 61, `${offlineRows} productos`);

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const offlinePins = await page.locator(".vs-pin").count();
ok("sin conexión, el mapa conserva los marcadores", offlinePins > 100, `${offlinePins} marcadores`);
await page.screenshot({ path: `${shots}/06-offline.png` });

await ctx.setOffline(false);
ok("sin errores de página", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

// Enlaces cortos de Google Maps, autocompletado de metadatos y el grupo Medicina.
//
// La resolución real necesita salir a Google, que en este entorno está bloqueado por el proxy, así
// que la respuesta de /api/resolver se simula para probar el recorrido del formulario. Aparte se
// golpea la ruta real para comprobar que rechaza lo que no debe resolver.
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
  viewport: { width: 1280, height: 950 },
  locale: "es-BO",
  // Sin service worker: las peticiones que salen de un SW no se pueden interceptar desde acá, y
  // este recorrido necesita simular la respuesta de Google. El modo sin conexión se prueba aparte.
  serviceWorkers: "block",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("dialog", (d) => d.accept());

const val = (sel) => page.locator(sel).inputValue();
const URL_FIELD = 'input[placeholder^="https://maps.app.goo.gl"]';

// ---------------------------------------------------------------- la ruta real se defiende sola
await page.goto(BASE, { waitUntil: "networkidle" });
const guard = await page.evaluate(async () => {
  const out = {};
  for (const [k, u] of [
    ["ajeno", "https://evil.com/x"],
    ["metadatos", "http://169.254.169.254/latest/meta-data/"],
    ["subdominio falso", "https://maps.app.goo.gl.evil.com/x"],
  ]) {
    const r = await fetch(`/api/resolver?url=${encodeURIComponent(u)}`);
    out[k] = r.status;
  }
  return out;
});
ok("la ruta rechaza dominios ajenos", Object.values(guard).every((s) => s === 400), JSON.stringify(guard));

// ---------------------------------------------------------------- enlace corto
// Se simula lo que devolvería Google para un Olive Young de Myeongdong.
await page.route("**/api/resolver**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      lat: 37.5638, lng: 126.9827,
      name: "올리브영 테스트점",
      resolved: "https://www.google.com/maps/place/...",
    }),
  }),
);

await page.getByRole("button", { name: "Agregar" }).click();
await page.locator(URL_FIELD).fill("https://maps.app.goo.gl/AbCdEf123");
await page.waitForTimeout(1200);

ok("el enlace corto se convierte en coordenadas", /37\.5638\d*,\s*126\.9827\d*/.test(await val(URL_FIELD)), await val(URL_FIELD));
ok("completa el nombre", (await val('input[placeholder="Cómo lo vas a reconocer"]')) === "올리브영 테스트점");
ok("completa el nombre coreano", (await val('input[placeholder="한글"]')) === "올리브영 테스트점");
ok("deduce el barrio del punto", (await val('input[placeholder="Myeongdong, Jongno…"]')) === "Jung-gu");
ok("adivina el grupo por el nombre", (await page.locator("select").inputValue()) === "kbeauty");

const aviso = await page.locator('[role="status"]').textContent();
ok("dice qué completó y dónde cayó", /Complet/.test(aviso ?? "") && /Seúl/.test(aviso ?? ""), aviso?.trim());

await page.screenshot({ path: `${shots}/09-enlace-corto.png` });

// se guarda y queda con lo deducido
await page.getByRole("button", { name: "Guardar sitio" }).click();
await page.waitForTimeout(900);
await page.getByRole("searchbox", { name: "Buscar sitios" }).fill("올리브영 테스트점");
await page.waitForTimeout(500);
const ficha = (await page.locator("[data-place-id]").first().textContent()) ?? "";
ok("el sitio guardado conserva grupo y barrio", /K-beauty/.test(ficha) && /Jung-gu/.test(ficha), ficha.replace(/\s+/g, " ").slice(0, 80));

await page.unroute("**/api/resolver**");

// ---------------------------------------------------------------- enlace largo, sin red
await page.getByRole("searchbox", { name: "Buscar sitios" }).fill("");
await page.getByRole("button", { name: "Agregar" }).click();
await page.locator(URL_FIELD).fill("https://www.google.com/maps/place/Hongdae/@37.5535,126.9245,17z");
await page.waitForTimeout(600);
ok("un enlace largo deduce el barrio sin consultar nada", (await val('input[placeholder="Myeongdong, Jongno…"]')) === "Mapo-gu");
ok("y no pisa el enlace que pegaste", (await val(URL_FIELD)).includes("google.com/maps"));

// ---------------------------------------------------------------- fuera de Seúl
await page.locator(URL_FIELD).fill("37.4491, 126.4506");
await page.waitForTimeout(500);
const avisoFuera = (await page.locator('[role="status"]').textContent()) ?? "";
ok("fuera de Seúl lo dice y no inventa barrio", /alrededores/.test(avisoFuera), avisoFuera.trim());

await page.getByRole("button", { name: "Cancelar" }).click();

// ---------------------------------------------------------------- grupo Medicina
const chip = page.getByRole("button", { name: /Medicina/ });
await chip.scrollIntoViewIfNeeded();
ok("el grupo Medicina está en los filtros", await chip.isVisible());
await chip.click();
await page.waitForTimeout(700);
const medicos = await page.locator("[data-place-id]").count();
ok("y trae lugares cargados", medicos === 7, `${medicos} sitios`);
const primero = (await page.locator("[data-place-id]").first().textContent()) ?? "";
ok("con nombre coreano, que es lo que sirve en la farmacia", /약국|병원|피부과/.test(primero), primero.replace(/\s+/g, " ").slice(0, 70));

await page.screenshot({ path: `${shots}/10-medicina.png` });
ok("sin errores de página", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

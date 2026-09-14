// Agregar, editar, eliminar y restaurar — sobre un lugar propio y sobre uno precargado.
// Editar los precargados es justamente lo que el archivo original no permitía.
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
const ok = (n, c, e = "") => { console.log(`${c ? "  ok  " : "FAIL  "}${n}${e ? " — " + e : ""}`); if (!c) failures++; };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("dialog", (d) => d.accept());

const count = async () => page.locator("[data-place-id]").count();
// El panel de acciones extra queda abierto tras editar (el estado vive en la ficha), así que
// el ayudante lo abre sólo si hace falta en vez de asumir el texto del botón.
const PALACE = '[data-place-id="s-palacio-gyeongbokgung"]';
const openMore = async (sel = "[data-place-id]") => {
  const card = page.locator(sel).first();
  if (await card.getByRole("button", { name: "Eliminar" }).isVisible().catch(() => false)) return;
  await card.getByRole("button", { name: /^(Más|Menos)$/ }).click();
  await page.waitForTimeout(200);
};
const search = async (t) => {
  await page.getByRole("searchbox", { name: "Buscar sitios" }).fill(t);
  await page.waitForTimeout(500);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("[data-place-id]", { timeout: 15000 });
const baseline = await count();

// ---------------------------------------------------- crear pegando un enlace de Google Maps
await page.getByRole("button", { name: "Agregar" }).click();
await page.locator('input[placeholder^="https://maps.app.goo.gl"]').fill(
  "https://www.google.com/maps/place/Olive+Young/@37.5601,126.9822,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d37.5601!4d126.9822",
);
await page.getByPlaceholder("Cómo lo vas a reconocer").fill("Prueba Myeongdong");
await page.getByPlaceholder("한글", { exact: true }).fill("명동테스트");
await page.getByPlaceholder("Myeongdong, Jongno…").fill("Jung-gu");
await page.getByRole("button", { name: "Guardar sitio" }).click();
await page.waitForTimeout(900);

ok("crear suma un sitio", (await count()) === baseline + 1, `${baseline} → ${await count()}`);
await search("Prueba Myeongdong");
ok("el sitio nuevo aparece en la búsqueda", (await count()) === 1);
const created = (await page.locator("[data-place-id]").first().textContent()) ?? "";
ok("guardó las coordenadas del enlace de Google", /명동테스트/.test(created) && /agregado por vos/.test(created));

// ---------------------------------------------------- editar lo creado
await openMore();
await page.getByRole("button", { name: "Editar" }).click();
await page.getByPlaceholder("Cómo lo vas a reconocer").fill("Prueba editada");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.waitForTimeout(900);
await search("Prueba editada");
ok("editar un sitio propio lo renombra", (await count()) === 1);

// ---------------------------------------------------- persiste al recargar
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[data-place-id]", { timeout: 15000 });
await search("Prueba editada");
ok("sobrevive a recargar la página", (await count()) === 1);

// ---------------------------------------------------- editar un lugar PRECARGADO
await search("Palacio Gyeongbokgung");
await openMore(PALACE);
await page.getByRole("button", { name: "Editar" }).click();
await page.getByPlaceholder("Myeongdong, Jongno…").fill("Barrio cambiado por mí");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.waitForTimeout(900);
const seedEdited = (await page.locator(PALACE).textContent()) ?? "";
ok("editar un lugar precargado funciona", /Barrio cambiado por mí/.test(seedEdited) && /editado por vos/.test(seedEdited));
ok("el resto de los campos del precargado sobrevive", /Cambio de guardia/.test(seedEdited));

// ---------------------------------------------------- restaurar el precargado
await openMore(PALACE);
await page.getByRole("button", { name: "Restaurar original" }).click();
await page.waitForTimeout(900);
const restored = (await page.locator(PALACE).textContent()) ?? "";
ok("restaurar devuelve el original", /Jongno/.test(restored) && !/Barrio cambiado/.test(restored));

// ---------------------------------------------------- ocultar un precargado y recuperarlo
await openMore(PALACE);
await page.getByRole("button", { name: "Eliminar" }).click();
await page.waitForTimeout(900);
ok("ocultar un precargado lo saca de la lista", (await page.locator(PALACE).count()) === 0);

await page.getByRole("link", { name: /Mi viaje/ }).click();
await page.waitForTimeout(1200);
ok("aparece en «sitios que ocultaste»", await page.getByText("Sitios que ocultaste").isVisible());
await page.getByRole("button", { name: "Recuperar" }).first().click();
await page.waitForTimeout(800);

await page.getByRole("link", { name: /Mapa/ }).click();
await page.waitForTimeout(1200);
await search("Palacio Gyeongbokgung");
ok("recuperar lo devuelve al mapa", (await page.locator(PALACE).count()) === 1);

// ---------------------------------------------------- borrar el propio
await search("Prueba editada");
await openMore();
await page.getByRole("button", { name: "Eliminar" }).click();
await page.waitForTimeout(900);
ok("eliminar un sitio propio lo borra", (await count()) === 0);

await search("");
ok("vuelve al total original", (await count()) === baseline, `${await count()} vs ${baseline}`);

await page.screenshot({ path: `${shots}/03-crud.png` });
ok("sin errores de página", errors.length === 0, errors.slice(0, 2).join(" | "));

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLAS`);
await browser.close();
process.exit(failures ? 1 : 0);

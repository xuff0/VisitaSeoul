import { NextResponse } from "next/server";
import { nameFromUrl, parseCoords } from "@/lib/geo";

/**
 * Resuelve los enlaces cortos de Google Maps (maps.app.goo.gl/…), que son los que comparte la
 * aplicación del teléfono y los únicos que el archivo original no sabía leer.
 *
 * Por qué en el servidor: un enlace corto es un redireccionamiento, y hay que seguirlo para saber
 * a dónde apunta. Desde el navegador eso está prohibido por CORS —Google no publica cabeceras que
 * lo permitan— así que la petición la hace el servidor.
 *
 * Esto abre una puerta que hay que cerrar con cuidado: un servicio que trae la URL que le pidan es
 * un SSRF. Las defensas son cuatro: sólo se aceptan enlaces de acortadores de Google, cada salto
 * del redireccionamiento se vuelve a validar contra la lista, hay tope de saltos y de tiempo, y la
 * respuesta nunca devuelve el cuerpo que se descargó, sino únicamente las coordenadas y el nombre.
 */

export const dynamic = "force-dynamic";

/** Acortadores aceptados como punto de entrada. */
const SHORTENERS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

/** Dominios donde puede terminar el redireccionamiento: Google y sus variantes por país. */
function isGoogleHost(host: string): boolean {
  const h = host.toLowerCase();
  if (SHORTENERS.has(h)) return true;
  return /^(?:[a-z0-9-]+\.)*google(?:\.[a-z]{2,3}){1,2}$/.test(h);
}

const MAX_HOPS = 6;
const TIMEOUT_MS = 6000;
/** Tope de lectura del cuerpo: alcanza para encontrar las coordenadas y no para agotar memoria. */
const MAX_BODY = 512 * 1024;

/** Algunos enlaces terminan en una página sin coordenadas en la URL; ahí se mira el cuerpo. */
function coordsFromBody(html: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /"latitude"\s*:\s*(-?\d+\.\d+).{0,40}?"longitude"\s*:\s*(-?\d+\.\d+)/s,
    /center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** Nombre del lugar desde el cuerpo, cuando la URL final no lo trae. */
function nameFromBody(html: string): string {
  const m =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ??
    html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return "";
  return m[1]
    .replace(/\s*[-–]\s*Google\s*Maps?\s*$/i, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Falta el parámetro url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Eso no es un enlace válido." }, { status: 400 });
  }

  if (target.protocol !== "https:" || !SHORTENERS.has(target.hostname.toLowerCase())) {
    return NextResponse.json(
      { error: "Sólo se resuelven enlaces cortos de Google Maps." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let current = target;
    let response: Response | null = null;

    // Los saltos se siguen a mano, y no con redirect:"follow", para poder validar cada destino:
    // un redireccionamiento fuera de Google se corta acá.
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      response = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Sin un agente de navegador, Google devuelve una página distinta y sin coordenadas.
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "accept-language": "ko,es;q=0.8,en;q=0.6",
        },
      });

      const location = response.headers.get("location");
      if (!location) break;

      const next = new URL(location, current);
      if (next.protocol !== "https:" || !isGoogleHost(next.hostname)) {
        return NextResponse.json(
          { error: "El enlace redirige fuera de Google Maps." },
          { status: 400 },
        );
      }
      current = next;
    }

    // Primero la URL final, que es donde están las coordenadas la mayoría de las veces.
    let coords = parseCoords(current.toString());
    let name = nameFromUrl(current.toString());

    if ((!coords || !name) && response?.body) {
      const html = await readCapped(response);
      coords ??= coordsFromBody(html);
      if (!name) name = nameFromBody(html);
    }

    if (!coords) {
      return NextResponse.json(
        { error: "Pude seguir el enlace, pero no encontré coordenadas.", resolved: current.toString() },
        { status: 422 },
      );
    }

    return NextResponse.json({
      lat: coords.lat,
      lng: coords.lng,
      name,
      resolved: current.toString(),
    });
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Google tardó demasiado en responder." : "No pude resolver el enlace." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Lee el cuerpo hasta el tope y corta: no hace falta la página entera para sacar dos números. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
    if (out.length >= MAX_BODY) {
      await reader.cancel();
      break;
    }
  }
  return out;
}

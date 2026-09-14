import { formatCoords, naverWebUrl, searchQuery } from "@/lib/naver";
import type { Place } from "@/lib/types";

/** Copia al portapapeles, con la caída de siempre para navegadores que no dan permiso. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sigue por el camino viejo
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Texto compartible de un lugar: sirve igual pegado en WhatsApp que en un mail. */
export function placeAsText(p: Pick<Place, "n" | "k" | "lat" | "lng">): string {
  return [
    p.n,
    p.k || null,
    formatCoords(p),
    naverWebUrl({ name: p.n, nameKo: p.k }),
  ]
    .filter(Boolean)
    .join("\n");
}

export type ShareResult = "compartido" | "copiado" | "falló";

/**
 * Comparte con el menú del teléfono si existe, y si no copia al portapapeles. Nunca deja al
 * usuario sin nada: siempre termina en una de las dos.
 */
export async function sharePlace(p: Pick<Place, "n" | "k" | "lat" | "lng">): Promise<ShareResult> {
  const text = placeAsText(p);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: p.n, text, url: naverWebUrl({ name: p.n, nameKo: p.k }) });
      return "compartido";
    } catch (e) {
      // Cancelar el menú de compartir no es un error que haya que reportar.
      if ((e as Error)?.name === "AbortError") return "compartido";
    }
  }
  return (await copyText(text)) ? "copiado" : "falló";
}

export { searchQuery };

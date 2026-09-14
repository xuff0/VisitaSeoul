import { districtAt, isInSeoul } from "@/lib/geo";
import type { Zone } from "@/lib/data/places";

/**
 * Deducción de los campos que no hace falta teclear.
 *
 * Todo lo de acá sale de dos cosas que ya tenemos: las coordenadas y el nombre que viene en el
 * enlace. Nada consulta a la red, así que funciona igual sin señal — que es cuando más molesta
 * tener que llenar un formulario a mano.
 *
 * Son sugerencias, no decisiones: los campos quedan editables y el grupo adivinado se puede
 * cambiar en el desplegable.
 */

const HANGUL = /[ㄱ-ㆎ가-힣]/;

export function hasHangul(s: string): boolean {
  return HANGUL.test(s ?? "");
}

/**
 * Separa el nombre que viene del enlace en nombre y nombre coreano.
 *
 * Google devuelve el nombre en el idioma del lugar, así que un local de Seúl casi siempre llega
 * en hangul. Ese texto vale sobre todo como nombre coreano —es el que encuentra Naver y el que
 * entiende el vendedor— pero también sirve de nombre provisorio para no dejar la ficha sin título.
 */
export function splitName(raw: string): { name: string; nameKo: string } {
  const s = (raw ?? "").trim();
  if (!s) return { name: "", nameKo: "" };
  return hasHangul(s) ? { name: s, nameKo: s } : { name: s, nameKo: "" };
}

/**
 * Pistas de grupo, de la más específica a la más general: el orden decide los empates.
 *
 * Son rubros, nunca barrios. «용산» parece útil para electrónica por el mercado de Yongsan, pero
 * también aparece en «이마트 용산점», que es un supermercado: una pista de ese tipo acierta una vez
 * y se equivoca diez.
 */
const HINTS: [RegExp, string][] = [
  [/약국|pharmacy|drugstore|병원|의원|치과|피부과|성형외과|클리닉|clinic|hospital|medical|dental|dermatolog/i, "medicina"],
  [/올리브영|olive\s*young|아리따움|이니스프리|innisfree|시코르|chicor|화장품|cosmetic|beauty|뷰티|에뛰드|더페이스샵/i, "kbeauty"],
  [/안경|optic|다비치|davich|렌즈샵/i, "opticas"],
  [/홍삼|정관장|인삼|ginseng|한약|약령|경동시장/i, "ginseng"],
  [/다이소|daiso|편의점|gs25|세븐일레븐|7-?eleven|이마트24|emart24|\bcu\b/i, "conveniencia"],
  [/전자|electronic|하이마트|himart|테크노마트|technomart|애플|apple\s*store|삼성디지털/i, "electronica"],
  [/아울렛|outlet|무신사|musinsa|코오롱|블랙야크|의류|패션|fashion|스탠다드/i, "ropa"],
  [/백화점|스타필드|starfield|아이파크몰|타임스퀘어|코엑스|\bmall\b|현대서울/i, "malls"],
  [/수산시장|이마트|emart|홈플러스|homeplus|코스트코|costco|마트|슈퍼|식당|맛집|restaurant|카페|cafe/i, "comida"],
  [/시장|market|지하상가|상가/i, "ofertas"],
  [/궁$|궁\s|박물관|미술관|공원|타워|전망대|사찰|성당|museum|palace|temple|tower|park|gallery/i, "turismo"],
];

/** Adivina el grupo a partir del nombre. Devuelve null cuando no hay una pista clara. */
export function guessCategory(text: string): string | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  for (const [re, cat] of HINTS) if (re.test(s)) return cat;
  return null;
}

export type Derived = {
  name: string;
  nameKo: string;
  /**
   * Distrito de Seúl deducido del punto, o vacío si el lugar cae fuera de la ciudad.
   * Va con el sufijo -gu porque así se llama la división: 중구 es Jung-gu, no «Jung».
   */
  district: string;
  zone: Zone;
  /** Grupo sugerido, o null si el nombre no da ninguna pista. */
  cat: string | null;
};

/** Junta todo lo deducible de un punto y un nombre. */
export function derive(lat: number, lng: number, rawName = ""): Derived {
  const { name, nameKo } = splitName(rawName);
  const d = districtAt(lat, lng);
  return {
    name,
    nameKo,
    district: d ? `${d.e}-gu` : "",
    zone: isInSeoul(lat, lng) ? "seul" : "alrededores",
    cat: guessCategory(rawName),
  };
}

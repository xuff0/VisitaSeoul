import { describe, expect, it } from "vitest";
import {
  androidIntentUrl,
  detectPlatform,
  geoUri,
  naverShoppingUrl,
  naverWebUrl,
  nmapPlaceUrl,
  nmapTransitRouteUrl,
  searchQuery,
} from "@/lib/naver";

const olive = { name: "Olive Young Myeongdong Town", nameKo: "올리브영 명동타운점", lat: 37.5638, lng: 126.9827 };
const sinKo = { name: "Prueba", nameKo: "", lat: 37.5, lng: 127.0 };

describe("enlaces de Naver", () => {
  it("busca por el nombre coreano cuando existe", () => {
    // Es la razón de arrastrar los nombres en hangul: el nombre en español no encuentra el local.
    expect(searchQuery(olive)).toBe("올리브영 명동타운점");
    expect(naverWebUrl(olive)).toBe(
      "https://map.naver.com/p/search/" + encodeURIComponent("올리브영 명동타운점"),
    );
  });

  it("cae al nombre en español si no hay coreano", () => {
    expect(searchQuery(sinKo)).toBe("Prueba");
    expect(naverWebUrl(sinKo)).toContain("/p/search/Prueba");
  });

  it("arma el marcador de la app con lat, lng, nombre y appname", () => {
    const u = new URL(nmapPlaceUrl(olive).replace("nmap://", "https://x/"));
    expect(u.pathname).toBe("/place");
    expect(u.searchParams.get("lat")).toBe("37.5638");
    expect(u.searchParams.get("lng")).toBe("126.9827");
    expect(u.searchParams.get("name")).toBe("올리브영 명동타운점");
    expect(u.searchParams.get("appname")).toBeTruthy();
  });

  it("arma la ruta en transporte público con origen y destino", () => {
    const url = nmapTransitRouteUrl({ lat: 37.5, lng: 127.0 }, olive);
    const u = new URL(url.replace("nmap://", "https://x/"));
    expect(u.pathname).toBe("/route/public");
    expect(u.searchParams.get("slat")).toBe("37.5");
    expect(u.searchParams.get("dlat")).toBe("37.5638");
    expect(u.searchParams.get("dname")).toBe("올리브영 명동타운점");
  });

  it("envuelve el esquema en un intent de Android con el paquete de Naver", () => {
    const intent = androidIntentUrl(nmapPlaceUrl(olive));
    expect(intent.startsWith("intent://place?")).toBe(true);
    expect(intent).toContain("scheme=nmap");
    expect(intent).toContain("package=com.nhn.android.nmap");
    expect(intent.endsWith(";end")).toBe(true);
  });

  it("busca el precio vigente en Naver Shopping", () => {
    expect(naverShoppingUrl("조선미녀 릴리프썬")).toBe(
      "https://search.shopping.naver.com/search/all?query=" + encodeURIComponent("조선미녀 릴리프썬"),
    );
  });

  it("arma un geo: válido para otras apps", () => {
    expect(geoUri(olive)).toMatch(/^geo:37\.5638,126\.9827\?q=37\.5638,126\.9827\(/);
  });

  it("distingue las plataformas para elegir la caída correcta", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh)")).toBe("other");
  });
});

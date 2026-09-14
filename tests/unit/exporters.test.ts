import { describe, expect, it } from "vitest";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { toCSV, toGPX, toGeoJSON, toKML } from "@/lib/exporters";
import type { Place } from "@/lib/types";

const places: Place[] = [
  {
    id: "s-1", n: "Olive Young Myeongdong", k: "올리브영 명동타운점", c: "kbeauty",
    z: "seul", d: "Myeongdong", lat: 37.5638, lng: 126.9827,
    t: 'Descuento de IVA en caja, "con pasaporte" & promos 1+1', origin: "seed",
  },
  {
    id: "u-2", n: "Mercado Gyeongdong", k: "경동시장", c: "ginseng",
    z: "seul", d: "Dongdaemun-gu", lat: 37.579, lng: 127.039, origin: "mine",
  },
];

describe("GeoJSON", () => {
  const parsed = JSON.parse(toGeoJSON(places));

  it("es una FeatureCollection válida", () => {
    expect(parsed.type).toBe("FeatureCollection");
    expect(parsed.features).toHaveLength(2);
  });

  it("usa el orden lng, lat que manda el estándar", () => {
    // Invertirlos es el error clásico: el punto aparece en Somalia en vez de en Seúl.
    expect(parsed.features[0].geometry.coordinates).toEqual([126.9827, 37.5638]);
  });

  it("conserva el coreano y el enlace de Naver", () => {
    expect(parsed.features[0].properties.name_ko).toBe("올리브영 명동타운점");
    expect(parsed.features[0].properties.naver).toContain("map.naver.com");
  });
});

describe("KML", () => {
  const kml = toKML(places);

  it("está bien formado", () => {
    expect(XMLValidator.validate(kml)).toBe(true);
  });

  it("agrupa en carpetas por categoría", () => {
    const doc = new XMLParser().parse(kml).kml.Document;
    const folders = Array.isArray(doc.Folder) ? doc.Folder : [doc.Folder];
    expect(folders.map((f: { name: string }) => f.name).sort()).toEqual(["Ginseng y salud", "K-beauty"]);
  });

  it("escapa las comillas y los ampersands sin romper el archivo", () => {
    expect(kml).toContain("&amp;");
    expect(kml).toContain("&quot;");
  });

  it("convierte el color a aabbggrr, que es como lo lee KML", () => {
    // K-beauty es #d6336c, así que en KML va como ff6c33d6.
    expect(kml).toContain("ff6c33d6");
  });
});

describe("GPX", () => {
  const gpx = toGPX(places);

  it("está bien formado", () => {
    expect(XMLValidator.validate(gpx)).toBe(true);
  });

  it("escribe waypoints con lat y lon", () => {
    const wpts = new XMLParser({ ignoreAttributes: false }).parse(gpx).gpx.wpt;
    expect(wpts).toHaveLength(2);
    expect(Number(wpts[0]["@_lat"])).toBe(37.5638);
    expect(Number(wpts[0]["@_lon"])).toBe(126.9827);
  });
});

describe("CSV", () => {
  const csv = toCSV(places);

  it("empieza con BOM para que Excel no rompa el coreano", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("entrecomilla lo que lleva comas o comillas", () => {
    const linea = csv.split("\n")[1];
    expect(linea).toContain('"Descuento de IVA en caja, ""con pasaporte"" & promos 1+1"');
  });

  it("mantiene el hangul intacto", () => {
    expect(csv).toContain("올리브영 명동타운점");
    expect(csv).toContain("경동시장");
  });
});

import { describe, expect, it } from "vitest";
import { derive, guessCategory, hasHangul, splitName } from "@/lib/autofill";
import { districtAt, isShortMapsLink } from "@/lib/geo";
import { CATEGORIES, SEED_PLACES } from "@/lib/data/places";

describe("distrito por coordenadas", () => {
  it("ubica puntos conocidos en su distrito", () => {
    // Sin consultar nada: usa los mismos polígonos que dibuja la capa de distritos.
    expect(districtAt(37.5636, 126.9827)?.e).toBe("Jung"); // Myeongdong
    expect(districtAt(37.515, 127.0576)?.e).toBe("Gangnam"); // COEX y Bongeunsa
    expect(districtAt(37.5535, 126.9245)?.e).toBe("Mapo"); // Hongdae
    expect(districtAt(37.5796, 126.977)?.e).toBe("Jongno"); // Gyeongbokgung
    expect(districtAt(37.5445, 127.0557)?.e).toBe("Seongdong"); // Seongsu
  });

  it("en un punto sobre el límite devuelve uno de los dos vecinos, no un error", () => {
    // La estación Gangnam está partida entre Gangnam-gu y Seocho-gu: sus salidas del lado oeste
    // quedan en Seocho. Cualquiera de los dos es una respuesta defendible.
    expect(["Gangnam", "Seocho"]).toContain(districtAt(37.4979, 127.0276)?.e);
  });

  it("devuelve null fuera de Seúl, en vez de inventar un barrio", () => {
    expect(districtAt(37.4491, 126.4506)).toBeNull(); // aeropuerto de Incheon
    expect(districtAt(37.7906, 127.5257)).toBeNull(); // isla Nami
    expect(districtAt(37.2881, 127.0146)).toBeNull(); // Suwon
  });
});

describe("enlaces cortos", () => {
  it("reconoce los que comparte la aplicación del teléfono", () => {
    expect(isShortMapsLink("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isShortMapsLink("https://goo.gl/maps/xyz")).toBe(true);
    expect(isShortMapsLink(" https://maps.app.goo.gl/abc ")).toBe(true);
  });

  it("no confunde un enlace largo, que ya se lee sin ayuda", () => {
    expect(isShortMapsLink("https://www.google.com/maps/@37.5,127.0,17z")).toBe(false);
    expect(isShortMapsLink("37.5665, 126.9780")).toBe(false);
    expect(isShortMapsLink("")).toBe(false);
    // Un dominio parecido no alcanza: tiene que ser exactamente el acortador.
    expect(isShortMapsLink("https://maps.app.goo.gl.evil.com/x")).toBe(false);
  });
});

describe("nombre", () => {
  it("detecta hangul", () => {
    expect(hasHangul("올리브영")).toBe(true);
    expect(hasHangul("Olive Young")).toBe(false);
  });

  it("un nombre coreano llena además el campo coreano", () => {
    // Es el que encuentra Naver; perderlo sería perder la mitad del valor del enlace.
    expect(splitName("올리브영 명동타운점")).toEqual({
      name: "올리브영 명동타운점",
      nameKo: "올리브영 명동타운점",
    });
  });

  it("un nombre en alfabeto latino no ensucia el campo coreano", () => {
    expect(splitName("Olive Young")).toEqual({ name: "Olive Young", nameKo: "" });
  });
});

describe("grupo sugerido", () => {
  it("reconoce medicina", () => {
    expect(guessCategory("서울대학교병원")).toBe("medicina");
    expect(guessCategory("명동 약국")).toBe("medicina");
    expect(guessCategory("Apgujeong Dermatology Clinic")).toBe("medicina");
  });

  it("reconoce los grupos de compras", () => {
    expect(guessCategory("올리브영 명동타운점")).toBe("kbeauty");
    expect(guessCategory("다비치안경 강남점")).toBe("opticas");
    expect(guessCategory("정관장 인사동점")).toBe("ginseng");
    expect(guessCategory("다이소 홍대입구역점")).toBe("conveniencia");
    expect(guessCategory("용산전자상가")).toBe("electronica");
    expect(guessCategory("신세계백화점 본점")).toBe("malls");
    expect(guessCategory("이마트 용산점")).toBe("comida");
    expect(guessCategory("광장시장")).toBe("ofertas");
    expect(guessCategory("국립중앙박물관")).toBe("turismo");
  });

  it("no adivina cuando no hay pista, en vez de tirar cualquier cosa", () => {
    expect(guessCategory("")).toBeNull();
    expect(guessCategory("Casa de Juan")).toBeNull();
  });

  it("la pista más específica gana a la más general", () => {
    // "수산시장" es un mercado, pero de comida: no debe caer en el genérico de mercados.
    expect(guessCategory("노량진수산시장")).toBe("comida");
  });
});

describe("derive", () => {
  it("junta barrio, zona, nombre y grupo de un solo punto", () => {
    const d = derive(37.5638, 126.9827, "올리브영 명동타운점");
    expect(d).toEqual({
      name: "올리브영 명동타운점",
      nameKo: "올리브영 명동타운점",
      district: "Jung-gu",
      zone: "seul",
      cat: "kbeauty",
    });
  });

  it("fuera de Seúl deja el barrio vacío y marca alrededores", () => {
    const d = derive(37.4491, 126.4506, "인천국제공항");
    expect(d.district).toBe("");
    expect(d.zone).toBe("alrededores");
  });

  it("sin nombre sigue sirviendo para el barrio, que es lo que da el mapa", () => {
    const d = derive(37.5535, 126.9245, "");
    expect(d.district).toBe("Mapo-gu");
    expect(d.cat).toBeNull();
    expect(d.name).toBe("");
  });
});

describe("grupo Medicina", () => {
  it("está en la lista de categorías", () => {
    const c = CATEGORIES.find((x) => x.id === "medicina");
    expect(c).toMatchObject({ label: "Medicina", icon: "💊" });
  });

  it("tiene color propio, distinto del de los demás grupos", () => {
    const colores = CATEGORIES.map((c) => c.color);
    expect(new Set(colores).size).toBe(colores.length);
  });

  it("trae lugares cargados, no queda vacío", () => {
    const medicos = SEED_PLACES.filter((p) => p.c === "medicina");
    expect(medicos.length).toBeGreaterThanOrEqual(5);
    for (const p of medicos) expect(p.k, p.n).toBeTruthy();
  });
});

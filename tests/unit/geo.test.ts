import { describe, expect, it } from "vitest";
import { distanceKm, formatKm, isInSeoul, nameFromUrl, nearestStation, parseCoords } from "@/lib/geo";

describe("parseCoords", () => {
  it("lee el formato @lat,lng de la barra de direcciones", () => {
    expect(parseCoords("https://www.google.com/maps/@37.5665,126.978,17z")).toEqual({
      lat: 37.5665,
      lng: 126.978,
    });
  });

  it("lee el formato !3d!4d de una ficha de lugar", () => {
    expect(parseCoords("https://maps/data=!3m1!4b1!4m6!3d37.5601!4d126.9822")).toEqual({
      lat: 37.5601,
      lng: 126.9822,
    });
  });

  it("lee un par suelto escrito a mano", () => {
    expect(parseCoords("37.5665, 126.9780")).toEqual({ lat: 37.5665, lng: 126.978 });
    expect(parseCoords(" 37.5665 126.9780 ")).toEqual({ lat: 37.5665, lng: 126.978 });
  });

  it("lee ?q= y sus variantes", () => {
    expect(parseCoords("https://x/?q=37.5665,126.9780")).toEqual({ lat: 37.5665, lng: 126.978 });
  });

  it("devuelve null cuando no hay nada que leer", () => {
    expect(parseCoords("")).toBeNull();
    expect(parseCoords("Olive Young Myeongdong")).toBeNull();
    // Un enlace corto de Google no expone las coordenadas: es correcto no inventarlas.
    expect(parseCoords("https://maps.app.goo.gl/abc123")).toBeNull();
  });
});

describe("nameFromUrl", () => {
  it("rescata el nombre del lugar para no hacerte teclearlo", () => {
    expect(nameFromUrl("https://www.google.com/maps/place/Olive+Young/@37.56,126.98,17z")).toBe("Olive Young");
  });
  it("devuelve vacío si el enlace no trae nombre", () => {
    expect(nameFromUrl("https://www.google.com/maps/@37.56,126.98,17z")).toBe("");
  });
});

describe("distancias", () => {
  it("mide bien una distancia conocida", () => {
    // Myeongdong a Gyeongbokgung: poco menos de 2 km en línea recta.
    const km = distanceKm(37.5636, 126.9827, 37.5796, 126.977);
    expect(km).toBeGreaterThan(1.5);
    expect(km).toBeLessThan(2.2);
  });

  it("formatea en metros por debajo del kilómetro", () => {
    expect(formatKm(0.268)).toBe("268 m");
    expect(formatKm(2.34)).toBe("2.3 km");
  });
});

describe("nearestStation", () => {
  it("encuentra la estación correcta parado en Myeongdong", () => {
    const r = nearestStation(37.5636, 126.9827);
    expect(r).not.toBeNull();
    expect(r!.km).toBeLessThan(0.5);
    expect(["을지로입구", "명동"]).toContain(r!.station[0]);
  });

  it("devuelve null lejos de cualquier estación", () => {
    // En medio del mar Amarillo no hay trenes; decirlo es mejor que inventar una estación.
    expect(nearestStation(36.0, 124.0)).toBeNull();
  });
});

describe("isInSeoul", () => {
  it("separa la ciudad de los alrededores", () => {
    expect(isInSeoul(37.5665, 126.978)).toBe(true);
    expect(isInSeoul(37.4491, 126.4506)).toBe(false); // aeropuerto de Incheon
    expect(isInSeoul(37.7906, 127.5257)).toBe(false); // isla Nami
  });
});

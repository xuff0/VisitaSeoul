import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/resolver/route";

/** Respuesta de redireccionamiento, como la que devuelve un acortador. */
const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });
const page = (body: string) => new Response(body, { status: 200, headers: { "content-type": "text/html" } });

const call = (url: string) => GET(new Request(`http://localhost/api/resolver?url=${encodeURIComponent(url)}`));

afterEach(() => vi.unstubAllGlobals());

describe("defensas", () => {
  it("rechaza una petición sin enlace", async () => {
    const res = await GET(new Request("http://localhost/api/resolver"));
    expect(res.status).toBe(400);
  });

  it("rechaza cualquier dominio que no sea un acortador de Google", async () => {
    // Es la defensa central: sin esto, el servicio trae cualquier URL que le pidan.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    for (const malo of [
      "https://evil.com/x",
      "http://169.254.169.254/latest/meta-data/",
      "https://maps.app.goo.gl.evil.com/x",
      "file:///etc/passwd",
    ]) {
      const res = await call(malo);
      expect(res.status, malo).toBe(400);
    }
    // Y ni siquiera llegó a pedir nada.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rechaza http, aunque el dominio sea el correcto", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect((await call("http://maps.app.goo.gl/abc")).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("corta si el redireccionamiento sale de Google", async () => {
    // Cada salto se vuelve a validar: un acortador comprometido no se convierte en un puente.
    vi.stubGlobal("fetch", vi.fn(async () => redirect("https://evil.com/interno")));
    const res = await call("https://maps.app.goo.gl/abc");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/fuera de Google/i);
  });

  it("no sigue redireccionamientos para siempre", async () => {
    const fetchSpy = vi.fn(async () => redirect("https://maps.app.goo.gl/otra"));
    vi.stubGlobal("fetch", fetchSpy);
    await call("https://maps.app.goo.gl/abc");
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(6);
  });
});

describe("resolución", () => {
  it("sigue el enlace y saca coordenadas y nombre de la URL final", async () => {
    const final =
      "https://www.google.com/maps/place/%EC%98%AC%EB%A6%AC%EB%B8%8C%EC%98%81+%EB%AA%85%EB%8F%99%ED%83%80%EC%9A%B4%EC%A0%90/@37.5638,126.9827,17z/data=!3m1!4b1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.includes("goo.gl") ? redirect(final) : page(""))),
    );

    const res = await call("https://maps.app.goo.gl/abc123");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lat).toBeCloseTo(37.5638, 4);
    expect(data.lng).toBeCloseTo(126.9827, 4);
    expect(data.name).toBe("올리브영 명동타운점");
  });

  it("acepta variantes de Google por país", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => redirect("https://www.google.co.kr/maps/place/N/@37.5,127.0,17z")),
    );
    expect((await call("https://maps.app.goo.gl/abc")).status).toBe(200);
  });

  it("si la URL final no trae coordenadas, las busca en la página", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("goo.gl")
          ? redirect("https://www.google.com/maps/place//data=!4m2!3m1!1s0x0")
          : page(
              '<title>경동시장 - Google Maps</title><script>var x = [null,null,[null,null,37.5790,127.0390]];' +
                'window.APP_INITIALIZATION_STATE=[[[null,37.5790,127.0390]],"!3d37.5790!4d127.0390"];</script>',
            ),
      ),
    );

    const res = await call("https://maps.app.goo.gl/xyz");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lat).toBeCloseTo(37.579, 3);
    expect(data.lng).toBeCloseTo(127.039, 3);
    // Y el nombre sale del título, sin el sufijo de Google.
    expect(data.name).toBe("경동시장");
  });

  it("avisa con claridad cuando siguió el enlace pero no había coordenadas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("goo.gl") ? redirect("https://www.google.com/maps") : page("<title>Google Maps</title>"),
      ),
    );
    const res = await call("https://maps.app.goo.gl/nada");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/no encontré coordenadas/i);
  });

  it("no se cuelga si Google no responde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw Object.assign(new Error("abort"), { name: "AbortError" });
    }));
    const res = await call("https://maps.app.goo.gl/abc");
    expect(res.status).toBe(504);
  });

  it("nunca devuelve el cuerpo que descargó", async () => {
    // La respuesta lleva sólo el punto y el nombre: el HTML de Google no vuelve al navegador.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("goo.gl")
          ? redirect("https://www.google.com/maps/place/X/@37.5,127.0,17z")
          : page("<html>SECRETO</html>"),
      ),
    );
    const body = await (await call("https://maps.app.goo.gl/abc")).text();
    expect(body).not.toContain("SECRETO");
    expect(Object.keys(JSON.parse(body)).sort()).toEqual(["lat", "lng", "name", "resolved"]);
  });
});

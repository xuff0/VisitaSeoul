"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { SEED_PLACES } from "@/lib/data/places";
import { restoreSeedPlace } from "@/lib/db/repo";
import { db } from "@/lib/db/schema";
import { EXPORT_FORMATS, download, serialize, type ExportFormat } from "@/lib/exporters";
import { exportBackup, importBackup } from "@/lib/backup";
import { hasSupabase } from "@/lib/supabase/client";
import { useCategories, useFlags, useMounted, useOutboxCount, usePlaces } from "@/lib/hooks";
import { copyText } from "@/lib/share";
import { useLiveQuery } from "dexie-react-hooks";

export default function ViajePage() {
  const mounted = useMounted();
  const places = usePlaces(null);
  const { fav, done } = useFlags();
  const categories = useCategories();
  const pending = useOutboxCount();
  const overrides = useLiveQuery(() => db().overrides.toArray(), [], []);
  const [scope, setScope] = useState<"todos" | "favoritos">("todos");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const hidden = useMemo(() => overrides.filter((o) => o.hidden && !o.deletedAt), [overrides]);
  const seedById = useMemo(() => new Map(SEED_PLACES.map((p) => [p.id, p])), []);
  const selection = useMemo(
    () => (scope === "favoritos" ? places.filter((p) => fav.has(p.id)) : places),
    [places, scope, fav],
  );

  const say = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };

  async function doExport(f: ExportFormat) {
    const meta = EXPORT_FORMATS.find((x) => x.id === f)!;
    const content = serialize(f, selection);
    const name = `seul-sitios.${meta.ext}`;
    if (download(name, meta.mime, content)) say(`Descargado ${name} con ${selection.length} sitios.`);
    else say((await copyText(content)) ? "La descarga está bloqueada acá, así que lo copié al portapapeles." : "No se pudo exportar.");
  }

  if (!mounted) return <p className="mt-4 text-sm text-ink-2">Cargando…</p>;

  const mine = places.filter((p) => p.origin === "mine").length;
  const edited = places.filter((p) => p.origin === "edited").length;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h2 className="m-0 text-base font-semibold">Tu viaje</h2>
        <ul className="mt-2 mb-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
          {[
            ["Favoritos", fav.size],
            ["Visitados", done.size],
            ["Agregados por vos", mine],
            ["Editados", edited],
          ].map(([label, n]) => (
            <li key={label as string} className="rounded-[10px] bg-[#f5f6f8] p-2.5">
              <div className="text-[22px] leading-none font-bold tabular-nums">{n as number}</div>
              <div className="mt-1 text-[12.5px] text-ink-2">{label as string}</div>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 mb-0 text-[13px] text-ink-2">
          {places.length} sitios en total, en {categories.length} grupos.
        </p>
      </Card>

      <Card>
        <h2 className="m-0 text-base font-semibold">Exportar tus sitios</h2>
        <p className="mt-1 mb-2.5 text-[13px] text-ink-2">
          Para abrirlos en otra app: Google My Maps, Organic Maps, una planilla, lo que uses.
        </p>
        <div className="mb-2.5 inline-flex overflow-hidden rounded-full border border-line bg-panel">
          {(["todos", "favoritos"] as const).map((s) => (
            <button
              key={s}
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={"cursor-pointer px-3 py-1.5 text-[13px] " + (scope === s ? "bg-ink text-white" : "text-ink-2")}
            >
              {s === "todos" ? `Todos (${places.length})` : `Solo favoritos (${fav.size})`}
            </button>
          ))}
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {EXPORT_FORMATS.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2">
              <Button className="w-[110px]" onClick={() => doExport(f.id)} disabled={selection.length === 0}>
                {f.label}
              </Button>
              <span className="text-[12.5px] text-ink-3">{f.hint}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="m-0 text-base font-semibold">Respaldo</h2>
        <p className="mt-1 mb-2.5 text-[13px] text-ink-2">
          {hasSupabase()
            ? "Tus datos se sincronizan con la nube, pero un respaldo en archivo nunca sobra."
            : "Sin cuenta configurada, todo esto vive sólo en este navegador. Si limpiás los datos del sitio o cambiás de teléfono, se pierde. Bajá el respaldo cada tanto."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="solid"
            onClick={async () => {
              const data = JSON.stringify(await exportBackup(), null, 2);
              if (download("seul-respaldo.json", "application/json", data)) say("Respaldo descargado.");
              else say((await copyText(data)) ? "Copiado al portapapeles." : "No se pudo generar.");
            }}
          >
            Descargar respaldo
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Restaurar de un archivo</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const r = await importBackup(JSON.parse(await file.text()));
                say(`Restaurado: ${r.added} registros nuevos, ${r.kept} que ya tenías más recientes.`);
              } catch (err) {
                say((err as Error).message || "Ese archivo no se pudo leer.");
              }
            }}
          />
        </div>
        <p className="mt-2.5 mb-0 text-[12.5px] text-ink-3">
          {hasSupabase()
            ? pending > 0
              ? `${pending} cambios esperando para subir. Se envían solos cuando vuelva la señal.`
              : "Todo sincronizado."
            : "Modo local: no hay servidor configurado."}
        </p>
      </Card>

      {hidden.length > 0 && (
        <Card>
          <h2 className="m-0 text-base font-semibold">Sitios que ocultaste</h2>
          <p className="mt-1 mb-2.5 text-[13px] text-ink-2">
            Los sitios que vienen cargados no se borran de verdad: se ocultan, y los podés recuperar cuando quieras.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {hidden.map((o) => (
              <li key={o.seedId} className="flex items-center justify-between gap-2 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate">{seedById.get(o.seedId)?.n ?? o.seedId}</span>
                <Button className="!px-2.5 !py-1 !text-[13px]" onClick={() => restoreSeedPlace(o.seedId)}>
                  Recuperar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {msg && (
        <p className="rounded-[10px] border border-line bg-panel p-2.5 text-[13px] text-ink-2" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

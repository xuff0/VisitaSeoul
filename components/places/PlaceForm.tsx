"use client";

import { useRef, useState } from "react";
import { TAGS, type Category } from "@/lib/data/places";
import { derive } from "@/lib/autofill";
import { isInSeoul, isShortMapsLink, nameFromUrl, parseCoords } from "@/lib/geo";
import type { Place, PlaceInput } from "@/lib/types";
import { Button, Field, inputClass } from "@/components/ui/primitives";

type Props = {
  /** Lugar a editar, o null para crear uno nuevo. El mismo formulario sirve para los dos. */
  editing: Place | null;
  categories: Category[];
  /** Coordenadas que el usuario acaba de marcar tocando el mapa. */
  picked: { lat: number; lng: number } | null;
  pickActive: boolean;
  onRequestPick: () => void;
  onSave: (input: PlaceInput, id?: string) => Promise<void>;
  onCancel: () => void;
};

const fmt = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

export default function PlaceForm({ editing, categories, picked, pickActive, onRequestPick, onSave, onCancel }: Props) {
  // El formulario se monta de nuevo al cambiar de lugar (el padre le pasa una key), así que los
  // campos arrancan del lugar que se está editando sin necesidad de sincronizarlos con un efecto.
  const [coordsText, setCoordsText] = useState(editing ? fmt(editing.lat, editing.lng) : "");
  const [name, setName] = useState(editing?.n ?? "");
  const [nameKo, setNameKo] = useState(editing?.k ?? "");
  const [cat, setCat] = useState(String(editing?.c ?? "turismo"));
  const [district, setDistrict] = useState(editing?.d ?? "");
  const [note, setNote] = useState(editing?.t ?? "");
  const [hours, setHours] = useState(editing?.hours ?? "");
  const [tags, setTags] = useState<string[]>((editing?.tags ?? []).map(String));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [autoNote, setAutoNote] = useState("");

  // Si tocaste el grupo a mano, la deducción deja de pisarlo. Va en estado y no en un ref porque
  // se consulta durante el render, cuando llega un punto nuevo desde el mapa.
  const [catTouched, setCatTouched] = useState(Boolean(editing));
  /** Evita resolver dos veces el mismo enlace corto mientras se reescribe el campo. */
  const lastResolved = useRef("");

  /**
   * Completa lo que se puede deducir de un punto: barrio, zona, grupo y nombre.
   *
   * Sólo llena campos vacíos. Lo que ya escribiste manda: la deducción es una ayuda, no una
   * corrección.
   */
  function applyDerived(lat: number, lng: number, rawName: string, replaceCoords: boolean) {
    const d = derive(lat, lng, rawName);
    const done: string[] = [];

    if (replaceCoords) setCoordsText(fmt(lat, lng));
    if (d.name && !name.trim()) {
      setName(d.name);
      done.push("nombre");
    }
    if (d.nameKo && !nameKo.trim()) {
      setNameKo(d.nameKo);
      done.push("coreano");
    }
    if (d.district && !district.trim()) {
      setDistrict(d.district);
      done.push("barrio");
    }
    if (d.cat && !catTouched) {
      setCat(d.cat);
      done.push("grupo");
    }

    const zona = isInSeoul(lat, lng) ? "Seúl" : "alrededores";
    setAutoNote(
      done.length
        ? `Completé ${done.join(", ")} desde el enlace. Está en ${zona}; cambiá lo que no cuadre.`
        : `Ubicación tomada. Está en ${zona}.`,
    );
  }

  /** Los enlaces cortos son un redireccionamiento: lo sigue el servidor y devuelve el punto. */
  async function resolveShortLink(url: string) {
    setResolving(true);
    setError("");
    setAutoNote("Siguiendo el enlace corto…");
    try {
      const res = await fetch(`/api/resolver?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as { lat?: number; lng?: number; name?: string; error?: string };
      if (!res.ok || data.lat == null || data.lng == null) {
        setAutoNote("");
        setError(
          data.error ??
            "No pude resolver ese enlace. Abrilo en Google Maps y pegá el enlace largo, o mantené presionado el punto y copiá las coordenadas.",
        );
        return;
      }
      applyDerived(data.lat, data.lng, data.name ?? "", true);
    } catch {
      setAutoNote("");
      setError(
        "No pude resolver el enlace: hace falta conexión para seguirlo. Sin señal, pegá el enlace largo o las coordenadas, o tocá “Elegir en el mapa”.",
      );
    } finally {
      setResolving(false);
    }
  }

  function onUrlChange(value: string) {
    setCoordsText(value);
    setError("");

    if (isShortMapsLink(value)) {
      // Un enlace corto se pega entero, no se tipea: en cuanto aparece, se resuelve.
      if (value.trim() !== lastResolved.current) {
        lastResolved.current = value.trim();
        void resolveShortLink(value.trim());
      }
      return;
    }

    const c = parseCoords(value);
    // Al pegar un enlace largo no se pisa el campo: el texto que pegaste sigue a la vista.
    if (c) applyDerived(c.lat, c.lng, nameFromUrl(value), false);
  }

  // Marcar un punto en el mapa tiene que pisar lo que haya en el campo de coordenadas. Se ajusta
  // durante el render, que es el patrón que recomienda React para reaccionar a un cambio de prop,
  // en vez de un efecto que provocaría un render extra.
  const [lastPicked, setLastPicked] = useState(picked);
  if (picked !== lastPicked) {
    setLastPicked(picked);
    if (picked) applyDerived(picked.lat, picked.lng, "", true);
  }

  async function submit() {
    const coords = parseCoords(coordsText);
    if (!coords) {
      setError(
        isShortMapsLink(coordsText)
          ? "Ese enlace corto todavía no se resolvió. Esperá un segundo o pegá el enlace largo."
          : 'No encontré coordenadas ahí. Pegá un enlace de Google Maps, escribí "37.5665, 126.9780" o tocá "Elegir en el mapa".',
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          n: name.trim() || nameFromUrl(coordsText) || "Sitio sin nombre",
          k: nameKo.trim(),
          c: cat,
          z: isInSeoul(coords.lat, coords.lng) ? "seul" : "alrededores",
          d: district.trim() || (editing ? editing.d : "Agregado por vos"),
          lat: coords.lat,
          lng: coords.lng,
          t: note.trim() || undefined,
          hours: hours.trim() || undefined,
          tags,
          buy: editing?.buy,
        },
        editing?.id,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-line bg-panel p-3.5">
      <h2 className="m-0 mb-0.5 text-base font-semibold">
        {editing ? `Editar “${editing.n}”` : "Agregar un sitio"}
      </h2>
      <p className="mt-0 mb-3 text-[13px] text-ink-2">
        {editing
          ? "Podés editar cualquier sitio, incluidos los que vienen cargados. Se guarda sólo lo que cambiás, así que las correcciones futuras te siguen llegando en el resto de los campos."
          : "Pegá cualquier enlace de Google Maps —también los cortos que comparte el teléfono— y completo lo que pueda deducir. O tocá “Elegir en el mapa”."}
      </p>

      <Field label="Enlace de Google Maps o coordenadas">
        <input
          className={inputClass}
          value={coordsText}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://maps.app.goo.gl/… o 37.5665, 126.9780"
        />
      </Field>
      <div className="mb-2.5 flex gap-2">
        <Button onClick={onRequestPick} className="flex-1">
          {pickActive ? "Tocá el mapa…" : "Elegir en el mapa"}
        </Button>
        <Button
          onClick={() => {
            setCoordsText("");
            setAutoNote("");
            setError("");
            lastResolved.current = "";
          }}
          className="flex-1"
        >
          Limpiar
        </Button>
      </div>

      {(resolving || autoNote) && (
        <p className="mb-2.5 rounded-[9px] bg-[#eef6f0] px-2.5 py-2 text-[12.5px] text-[#1f7a4c]" role="status">
          {resolving ? "Siguiendo el enlace corto…" : autoNote}
        </p>
      )}

      <Field label="Nombre">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo lo vas a reconocer" />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Grupo">
            <select
              className={inputClass}
              value={cat}
              onChange={(e) => {
                setCatTouched(true);
                setCat(e.target.value);
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Nombre en coreano" hint="Es lo que busca Naver y lo que entiende el vendedor">
            <input className={inputClass} lang="ko" value={nameKo} onChange={(e) => setNameKo(e.target.value)} placeholder="한글" />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Barrio">
            <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Myeongdong, Jongno…" />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Horario">
            <input className={inputClass} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="10:00–22:00" />
          </Field>
        </div>
      </div>

      <Field label="Nota">
        <textarea
          className={inputClass}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Qué comprar, a qué hora ir, con quién"
        />
      </Field>

      <fieldset className="mb-2.5">
        <legend className="mb-1 text-[13px] text-ink-2">Avisos</legend>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => {
            const on = tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTags((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                className={
                  "cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] " +
                  (on ? "border-ink bg-ink text-white" : "border-line text-ink-2")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button variant="solid" onClick={submit} disabled={saving || resolving}>
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar sitio"}
        </Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </div>

      {error && <p className="mt-2 text-[13px] text-[#c8342f]">{error}</p>}
    </section>
  );
}

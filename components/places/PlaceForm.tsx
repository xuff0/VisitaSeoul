"use client";

import { useState } from "react";
import { TAGS, type Category } from "@/lib/data/places";
import { isInSeoul, nameFromUrl, parseCoords } from "@/lib/geo";
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

  // Marcar un punto en el mapa tiene que pisar lo que haya en el campo de coordenadas. Se ajusta
  // durante el render, que es el patrón que recomienda React para reaccionar a un cambio de prop,
  // en vez de un efecto que provocaría un render extra.
  const [lastPicked, setLastPicked] = useState(picked);
  if (picked !== lastPicked) {
    setLastPicked(picked);
    if (picked) setCoordsText(fmt(picked.lat, picked.lng));
  }

  async function submit() {
    const coords = parseCoords(coordsText);
    if (!coords) {
      setError(
        'No encontré coordenadas ahí. Pegá el enlace largo de Google Maps, escribí "37.5665, 126.9780" o tocá "Elegir en el mapa".',
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
          : "Pegá el enlace de Google Maps, o tocá “Elegir en el mapa” y marcá el punto."}
      </p>

      <Field label="Enlace de Google Maps o coordenadas">
        <input
          className={inputClass}
          value={coordsText}
          onChange={(e) => {
            setCoordsText(e.target.value);
            if (!name) {
              const n = nameFromUrl(e.target.value);
              if (n) setName(n);
            }
          }}
          placeholder="https://www.google.com/maps/... o 37.5665, 126.9780"
        />
      </Field>
      <div className="mb-2.5 flex gap-2">
        <Button onClick={onRequestPick} className="flex-1">
          {pickActive ? "Tocá el mapa…" : "Elegir en el mapa"}
        </Button>
        <Button onClick={() => setCoordsText("")} className="flex-1">
          Limpiar
        </Button>
      </div>

      <Field label="Nombre">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo lo vas a reconocer" />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Grupo">
            <select className={inputClass} value={cat} onChange={(e) => setCat(e.target.value)}>
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
        <Button variant="solid" onClick={submit} disabled={saving}>
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar sitio"}
        </Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </div>

      {error && <p className="mt-2 text-[13px] text-[#c8342f]">{error}</p>}
    </section>
  );
}

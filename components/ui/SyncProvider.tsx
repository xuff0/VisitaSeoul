"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/schema";
import { createEngine } from "@/lib/sync/engine";
import { supabaseRemote } from "@/lib/sync/supabase-remote";
import { ensureSession, hasSupabase, supabase } from "@/lib/supabase/client";

/**
 * Arranca la sincronización, si es que hay servidor configurado.
 *
 * Sin las variables de entorno de Supabase no hace nada y la app queda entera en modo local. Eso
 * es a propósito: permite desplegar y usar la app antes de que exista el proyecto de Supabase.
 *
 * Cuándo sincroniza: al abrir, al volver la señal, al volver a la pestaña, y poco después de cada
 * cambio tuyo. No hay sondeo en un intervalo fijo: gastar batería y datos preguntando "¿algo
 * nuevo?" cada treinta segundos no tiene sentido en una app que usa una sola persona.
 */
export default function SyncProvider() {
  const started = useRef(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!hasSupabase() || started.current) return;
    started.current = true;

    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      const owner = await ensureSession();
      const sb = supabase();
      if (!owner || !sb || cancelled) return;

      const engine = createEngine(db(), supabaseRemote(sb, owner));

      const run = async () => {
        if (cancelled || !navigator.onLine) return;
        const r = await engine.syncOnce();
        if (r.errors.length) console.warn("[sync]", r.errors.join(" | "));
        setTick((n) => n + 1);
      };

      // Un respiro después de cada escritura: agrupa la ráfaga de guardar un lugar en un solo viaje.
      const schedule = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, 1500);
      };

      await run();

      db().outbox.hook("creating", schedule);
      window.addEventListener("online", run);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) run();
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase.
 *
 * Las variables son opcionales a propósito: sin ellas la app corre entera contra IndexedDB y lo
 * dice en "Mi viaje". Así se puede desplegar y usar antes de que el proyecto de Supabase exista,
 * que importa cuando el viaje ya empezó.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabase(): boolean {
  return Boolean(URL && KEY);
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) client = createBrowserClient(URL!, KEY!);
  return client;
}

/**
 * Sesión anónima.
 *
 * No hay pantalla de login: la primera vez que entrás, la app crea un usuario anónimo real. Eso
 * le da a tus filas un `auth.uid()` con el que el RLS puede protegerlas de verdad, en vez de
 * dejar una tabla pública que cualquiera con el enlace pueda vaciar.
 *
 * Cuando quieras entrar desde otro teléfono, `updateUser({ email })` convierte este mismo usuario
 * en permanente conservando el id, así que no se pierde nada de lo cargado.
 */
export async function ensureSession(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: created, error } = await sb.auth.signInAnonymously();
  if (error) {
    // Suele ser que falta habilitar "Anonymous sign-ins" en el panel de Supabase.
    console.warn("[supabase] no se pudo crear la sesión anónima:", error.message);
    return null;
  }
  return created.user?.id ?? null;
}

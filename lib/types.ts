import type { CategoryId, TagId, Zone } from "@/lib/data/places";

/**
 * Un lugar tal como lo ve la interfaz, ya resuelta la mezcla de semilla, ediciones tuyas y
 * lugares propios. `origin` existe para poder ofrecer "restaurar el original" sólo donde tiene
 * sentido.
 */
export type Place = {
  id: string;
  n: string;
  k: string;
  c: CategoryId | string;
  z: Zone;
  d: string;
  lat: number;
  lng: number;
  t?: string;
  tags?: (TagId | string)[];
  hours?: string;
  buy?: string[];
  origin: "seed" | "edited" | "mine";
  /** Distancia a tu posición, en km. La calcula la lista cuando hay ubicación. */
  km?: number;
};

/** Los campos que podés editar de un lugar. */
export type PlaceInput = Pick<Place, "n" | "k" | "c" | "z" | "d" | "lat" | "lng" | "t" | "hours"> & {
  tags?: string[];
  buy?: string[];
};

export type Place = {
  id: string; // Google place id
  name: string;
  rating: number; // napr. 4.6
  userRatingCount: number;
  address: string;
  lat: number;
  lng: number;
  mapsUri: string; // odkaz na Google Maps
  primaryType?: string; // restaurant / cafe / bar...
  photoUrl?: string;
};

export type Review = {
  rating: number; // 1–5 hviezdičiek
  text: string;
  date: string; // ISO dátum
};

export type Filters = {
  minRating: number;
  minReviews: number;
  types: string[]; // prázdne = všetky typy
};

export type WeeklyPick = {
  isoWeek: string; // napr. "2026-W25"
  placeId: string;
};

export type AppState = {
  places: Place[]; // cache celého zoznamu
  fetchedAt: string | null;
  visited: Record<string, Review>; // placeId -> recenzia
  weeklyPick: WeeklyPick | null;
  filters: Filters;
};

export const DEFAULT_FILTERS: Filters = {
  minRating: 4,
  minReviews: 50,
  types: [],
};

export const GASTRO_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "meal_takeaway",
  "bakery",
] as const;

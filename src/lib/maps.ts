import { Loader } from "@googlemaps/js-api-loader";
import { Filters, GASTRO_TYPES, Place } from "../types";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Bounding box pokrývajúci mesto Brno.
const BRNO_BOX = {
  south: 49.13,
  north: 49.26,
  west: 16.5,
  east: 16.7,
};

// Polomer hľadania pre jeden bod mriežky (v metroch).
const SEARCH_RADIUS_M = 1200;

// Krok mriežky v stupňoch (zvolený tak, aby sa kruhy prekrývali a pokryli plochu).
// 1 stupeň lat ≈ 111 km; 1 stupeň lng na 49° ≈ 73 km.
const LAT_STEP = 0.0135; // ~1.5 km
const LNG_STEP = 0.0205; // ~1.5 km

export function hasApiKey(): boolean {
  return Boolean(API_KEY && API_KEY.trim());
}

let loaderPromise: Promise<typeof google.maps.places> | null = null;

async function loadPlacesLibrary(): Promise<typeof google.maps.places> {
  if (!hasApiKey()) {
    throw new Error("Chýba VITE_GOOGLE_MAPS_API_KEY.");
  }
  if (!loaderPromise) {
    const loader = new Loader({ apiKey: API_KEY!, version: "weekly" });
    loaderPromise = loader.importLibrary("places");
  }
  return loaderPromise;
}

/** Vygeneruje body mriežky pokrývajúce Brno. */
function generateGrid(): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  for (let lat = BRNO_BOX.south; lat <= BRNO_BOX.north; lat += LAT_STEP) {
    for (let lng = BRNO_BOX.west; lng <= BRNO_BOX.east; lng += LNG_STEP) {
      points.push({ lat, lng });
    }
  }
  return points;
}

type RawPlace = google.maps.places.Place;

function toPlace(p: RawPlace): Place | null {
  if (!p.id || !p.location) return null;
  const rating = p.rating ?? 0;
  const photo = p.photos?.[0];
  return {
    id: p.id,
    name: p.displayName ?? "(bez názvu)",
    rating,
    userRatingCount: p.userRatingCount ?? 0,
    address: p.formattedAddress ?? "",
    lat: p.location.lat(),
    lng: p.location.lng(),
    mapsUri:
      p.googleMapsURI ??
      `https://www.google.com/maps/search/?api=1&query=${p.location.lat()},${p.location.lng()}&query_place_id=${p.id}`,
    primaryType: p.primaryType ?? undefined,
    photoUrl: photo ? photo.getURI({ maxWidth: 400 }) : undefined,
  };
}

export type FetchProgress = {
  done: number;
  total: number;
  found: number;
};

/**
 * Pretiluje Brno mriežkou a cez Places API načíta gastro podniky.
 * Výsledky dedupne podľa id. Filtrovanie (rating/recenzie/typy) sa robí
 * až v UI cez applyFilters, aby sa filtre dali meniť bez nového fetchu.
 */
export async function fetchBrnoPlaces(
  onProgress?: (p: FetchProgress) => void
): Promise<Place[]> {
  const places = await loadPlacesLibrary();
  const grid = generateGrid();
  const byId = new Map<string, Place>();

  const fields = [
    "id",
    "displayName",
    "rating",
    "userRatingCount",
    "formattedAddress",
    "location",
    "googleMapsURI",
    "primaryType",
    "photos",
  ];

  for (let i = 0; i < grid.length; i++) {
    const point = grid[i];
    try {
      const { places: results } = await places.Place.searchNearby({
        fields,
        locationRestriction: {
          center: new google.maps.LatLng(point.lat, point.lng),
          radius: SEARCH_RADIUS_M,
        },
        includedTypes: [...GASTRO_TYPES],
        maxResultCount: 20,
        rankPreference:
          google.maps.places.SearchNearbyRankPreference.POPULARITY,
      });
      for (const raw of results) {
        const place = toPlace(raw);
        if (place && !byId.has(place.id)) byId.set(place.id, place);
      }
    } catch (err) {
      // Jednotlivý bod môže zlyhať (rate limit a pod.) — pokračujeme ďalej.
      console.warn("searchNearby zlyhalo pre bod", point, err);
    }
    onProgress?.({ done: i + 1, total: grid.length, found: byId.size });
  }

  return [...byId.values()];
}

/** Filtre min ratingu, min počtu recenzií a typov. */
export function applyFilters(places: Place[], filters: Filters): Place[] {
  return places
    .filter((p) => p.rating >= filters.minRating)
    .filter((p) => p.userRatingCount >= filters.minReviews)
    .filter(
      (p) =>
        filters.types.length === 0 ||
        (p.primaryType ? filters.types.includes(p.primaryType) : false)
    )
    .sort((a, b) => b.rating - a.rating || b.userRatingCount - a.userRatingCount);
}

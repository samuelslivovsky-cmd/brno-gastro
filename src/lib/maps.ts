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

// Počiatočná hrubá mriežka (base, hĺbka 0) — krok v stupňoch.
// 1 stupeň lat ≈ 111 km; 1 stupeň lng na 49° ≈ 73 km. ~1,5 km bunky.
const BASE_LAT_STEP = 0.0135;
const BASE_LNG_STEP = 0.0205;

// Ak volanie vráti tento počet, oblasť je pravdepodobne orezaná → rozdeliť.
const CAP = 20;

export type Thoroughness = "cheap" | "balanced" | "max";

// Úrovne dôkladnosti: maxDepth = koľko úrovní delenia nad base mriežkou,
// maxCalls = globálny strop volaní (ochrana pred drahým behom).
export const CRAWL_LEVELS: Record<
  Thoroughness,
  { maxDepth: number; maxCalls: number }
> = {
  cheap: { maxDepth: 1, maxCalls: 100 },
  balanced: { maxDepth: 3, maxCalls: 250 },
  max: { maxDepth: 5, maxCalls: 600 },
};

type Box = { south: number; north: number; west: number; east: number };

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

/** Rozdelí veľký bounding box na počiatočné base bunky. */
function baseBoxes(): Box[] {
  const boxes: Box[] = [];
  for (let lat = BRNO_BOX.south; lat < BRNO_BOX.north; lat += BASE_LAT_STEP) {
    for (let lng = BRNO_BOX.west; lng < BRNO_BOX.east; lng += BASE_LNG_STEP) {
      boxes.push({
        south: lat,
        north: Math.min(lat + BASE_LAT_STEP, BRNO_BOX.north),
        west: lng,
        east: Math.min(lng + BASE_LNG_STEP, BRNO_BOX.east),
      });
    }
  }
  return boxes;
}

/** Stred boxu. */
function boxCenter(b: Box): { lat: number; lng: number } {
  return { lat: (b.south + b.north) / 2, lng: (b.west + b.east) / 2 };
}

/** Polomer kruhu (v metroch), ktorý pokryje celý box = polovica uhlopriečky. */
function boxRadiusM(b: Box): number {
  const c = boxCenter(b);
  const dLat = ((b.north - b.south) / 2) * 111_000;
  const dLng =
    ((b.east - b.west) / 2) * 111_000 * Math.cos((c.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Rozdelí box na 4 kvadranty. */
function quadrants(b: Box): Box[] {
  const midLat = (b.south + b.north) / 2;
  const midLng = (b.west + b.east) / 2;
  return [
    { south: b.south, north: midLat, west: b.west, east: midLng },
    { south: b.south, north: midLat, west: midLng, east: b.east },
    { south: midLat, north: b.north, west: b.west, east: midLng },
    { south: midLat, north: b.north, west: midLng, east: b.east },
  ];
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
  calls: number; // počet doteraz vykonaných volaní
  found: number; // počet unikátnych nájdených podnikov
  capped: number; // koľko oblastí bolo orezaných (vrátilo 20) a delilo sa
};

const FIELDS = [
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

/**
 * Adaptívne („quadtree“) stiahnutie gastro podnikov v Brne cez Places API.
 *
 * Pre každý box spustí searchNearby. Ak vráti CAP (=20) výsledkov, oblasť je
 * pravdepodobne orezaná → rozdelí sa na 4 menšie a prehľadá znova, kým
 * oblasť nevracia menej než 20, nedosiahne maxDepth alebo sa neminie maxCalls.
 * Výsledky dedupne podľa id. Filtre (rating/recenzie/typy) sa aplikujú až v UI.
 */
export async function fetchBrnoPlaces(
  thoroughness: Thoroughness = "balanced",
  onProgress?: (p: FetchProgress) => void
): Promise<Place[]> {
  const places = await loadPlacesLibrary();
  const { maxDepth, maxCalls } = CRAWL_LEVELS[thoroughness];
  const byId = new Map<string, Place>();
  let calls = 0;
  let capped = 0;

  async function searchBox(box: Box): Promise<number> {
    calls++;
    try {
      const { places: results } = await places.Place.searchNearby({
        fields: FIELDS,
        locationRestriction: {
          center: new google.maps.LatLng(boxCenter(box).lat, boxCenter(box).lng),
          radius: boxRadiusM(box),
        },
        includedTypes: [...GASTRO_TYPES],
        maxResultCount: CAP,
        rankPreference: google.maps.places.SearchNearbyRankPreference.POPULARITY,
      });
      for (const raw of results) {
        const place = toPlace(raw);
        if (place && !byId.has(place.id)) byId.set(place.id, place);
      }
      onProgress?.({ calls, found: byId.size, capped });
      return results.length;
    } catch (err) {
      // Jednotlivá oblasť môže zlyhať (rate limit a pod.) — pokračujeme ďalej.
      console.warn("searchNearby zlyhalo pre box", box, err);
      onProgress?.({ calls, found: byId.size, capped });
      return 0;
    }
  }

  async function crawl(box: Box, depth: number): Promise<void> {
    if (calls >= maxCalls) return;
    const count = await searchBox(box);
    // Ak je oblasť orezaná a máme rozpočet aj hĺbku, rozdelíme ju.
    if (count >= CAP && depth < maxDepth && calls < maxCalls) {
      capped++;
      for (const q of quadrants(box)) {
        if (calls >= maxCalls) break;
        await crawl(q, depth + 1);
      }
    }
  }

  for (const box of baseBoxes()) {
    if (calls >= maxCalls) break;
    await crawl(box, 0);
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

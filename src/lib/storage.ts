import { AppState, DEFAULT_FILTERS } from "../types";

const STORAGE_KEY = "brno-gastro/state/v1";

export const EMPTY_STATE: AppState = {
  places: [],
  fetchedAt: null,
  visited: {},
  weeklyPick: null,
  filters: DEFAULT_FILTERS,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...EMPTY_STATE,
      ...parsed,
      filters: { ...DEFAULT_FILTERS, ...(parsed.filters ?? {}) },
      visited: parsed.visited ?? {},
      places: parsed.places ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage môže byť plný / zakázaný — ticho ignorujeme
  }
}

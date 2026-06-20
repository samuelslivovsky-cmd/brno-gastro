import { useEffect, useMemo, useState } from "react";
import { AppState, GASTRO_TYPES, Place, Review } from "./types";
import { EMPTY_STATE, loadState, saveState } from "./lib/storage";
import {
  applyFilters,
  fetchBrnoPlaces,
  FetchProgress,
  hasApiKey,
} from "./lib/maps";
import { getIsoWeek, pickRandom } from "./lib/week";
import { WeeklyPick } from "./components/WeeklyPick";
import { PlaceList } from "./components/PlaceList";
import { ReviewForm } from "./components/ReviewForm";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Place | null>(null);

  // Perzistencia každej zmeny stavu.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const isoWeek = getIsoWeek();

  // Vyfiltrovaný zoznam a pool nenavštívených.
  const filtered = useMemo(
    () => applyFilters(state.places, state.filters),
    [state.places, state.filters]
  );
  const unvisited = useMemo(
    () => filtered.filter((p) => !state.visited[p.id]),
    [filtered, state.visited]
  );
  const visitedList = useMemo(
    () =>
      state.places
        .filter((p) => state.visited[p.id])
        .map((p) => ({ place: p, review: state.visited[p.id] as Review })),
    [state.places, state.visited]
  );

  // Vyriešenie tipu týždňa: stabilný počas týždňa, preskočí navštívené.
  useEffect(() => {
    setState((prev) => {
      const pick = prev.weeklyPick;
      const validPick =
        pick &&
        pick.isoWeek === isoWeek &&
        prev.places.some((p) => p.id === pick.placeId) &&
        !prev.visited[pick.placeId] &&
        applyFilters(
          prev.places.filter((p) => p.id === pick.placeId),
          prev.filters
        ).length > 0;

      if (validPick) return prev;

      const pool = applyFilters(prev.places, prev.filters).filter(
        (p) => !prev.visited[p.id]
      );
      const chosen = pickRandom(pool);
      return {
        ...prev,
        weeklyPick: chosen ? { isoWeek, placeId: chosen.id } : null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoWeek, state.places, state.visited, state.filters]);

  const weeklyPlace =
    state.weeklyPick &&
    state.weeklyPick.isoWeek === isoWeek &&
    !state.visited[state.weeklyPick.placeId]
      ? filtered.find((p) => p.id === state.weeklyPick!.placeId) ?? null
      : null;

  const reviewedThisWeek =
    state.weeklyPick?.isoWeek === isoWeek &&
    !!state.weeklyPick &&
    !!state.visited[state.weeklyPick.placeId];

  async function handleFetch() {
    setError(null);
    setLoading(true);
    setProgress(null);
    try {
      const places = await fetchBrnoPlaces((p) => setProgress(p));
      setState((prev) => ({
        ...prev,
        places,
        fetchedAt: new Date().toISOString(),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Načítanie zlyhalo.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function handleReviewSubmit(review: Review) {
    if (!reviewing) return;
    setState((prev) => ({
      ...prev,
      visited: { ...prev.visited, [reviewing.id]: review },
    }));
    setReviewing(null);
  }

  function pickNext() {
    const pool = applyFilters(state.places, state.filters).filter(
      (p) => !state.visited[p.id]
    );
    const chosen = pickRandom(pool);
    setState((prev) => ({
      ...prev,
      weeklyPick: chosen ? { isoWeek, placeId: chosen.id } : null,
    }));
  }

  function setFilter<K extends keyof AppState["filters"]>(
    key: K,
    value: AppState["filters"][K]
  ) {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
  }

  function toggleType(type: string) {
    setState((prev) => {
      const has = prev.filters.types.includes(type);
      return {
        ...prev,
        filters: {
          ...prev.filters,
          types: has
            ? prev.filters.types.filter((t) => t !== type)
            : [...prev.filters.types, type],
        },
      };
    });
  }

  function resetAll() {
    if (confirm("Vymazať všetky dáta (zoznam, recenzie, tip týždňa)?")) {
      setState(EMPTY_STATE);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Brno Gastro 🍴</h1>
        <p className="muted">
          Každý týždeň jeden náhodný podnik nad 4★ z Google Maps. Navštív,
          orecenzuj, ďalší.
        </p>
      </header>

      {!hasApiKey() && (
        <div className="banner warn">
          Chýba Google API kľúč. Vytvor súbor <code>.env</code> z{" "}
          <code>.env.example</code>, doplň{" "}
          <code>VITE_GOOGLE_MAPS_API_KEY</code> a reštartuj <code>npm run dev</code>.
        </div>
      )}
      {error && <div className="banner error">{error}</div>}

      <section className="toolbar card">
        <div className="toolbar-row">
          <button
            className="btn primary"
            onClick={handleFetch}
            disabled={loading || !hasApiKey()}
          >
            {loading ? "Načítavam…" : "Načítať / obnoviť zoznam"}
          </button>
          {state.fetchedAt && (
            <span className="muted small">
              Naposledy: {new Date(state.fetchedAt).toLocaleString("sk-SK")} ·{" "}
              {state.places.length} podnikov
            </span>
          )}
          <button className="btn ghost danger" onClick={resetAll}>
            Vymazať dáta
          </button>
        </div>

        {loading && progress && (
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
            <span className="muted small">
              {progress.done}/{progress.total} oblastí · nájdených{" "}
              {progress.found}
            </span>
          </div>
        )}

        <div className="filters">
          <label>
            Min. hodnotenie: <strong>{state.filters.minRating.toFixed(1)}</strong>
            <input
              type="range"
              min={4}
              max={5}
              step={0.1}
              value={state.filters.minRating}
              onChange={(e) => setFilter("minRating", Number(e.target.value))}
            />
          </label>
          <label>
            Min. recenzií: <strong>{state.filters.minReviews}</strong>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={state.filters.minReviews}
              onChange={(e) => setFilter("minReviews", Number(e.target.value))}
            />
          </label>
          <div className="type-filters">
            {GASTRO_TYPES.map((t) => (
              <button
                key={t}
                className={`chip ${state.filters.types.includes(t) ? "active" : ""}`}
                onClick={() => toggleType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <WeeklyPick
        place={weeklyPlace}
        isoWeek={isoWeek}
        reviewedThisWeek={reviewedThisWeek}
        poolEmpty={unvisited.length === 0}
        onVisited={() => weeklyPlace && setReviewing(weeklyPlace)}
        onPickNext={pickNext}
      />

      <PlaceList unvisited={unvisited} visited={visitedList} />

      {reviewing && (
        <ReviewForm
          place={reviewing}
          onSubmit={handleReviewSubmit}
          onCancel={() => setReviewing(null)}
        />
      )}

      <footer className="app-footer muted small">
        Dáta z Google Maps · stav uložený lokálne v prehliadači.
      </footer>
    </div>
  );
}

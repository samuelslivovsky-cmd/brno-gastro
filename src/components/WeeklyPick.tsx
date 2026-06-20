import { Place } from "../types";
import { PlaceCard } from "./PlaceCard";

type Props = {
  place: Place | null;
  isoWeek: string;
  reviewedThisWeek: boolean;
  poolEmpty: boolean;
  onVisited: () => void;
  onPickNext: () => void;
};

export function WeeklyPick({
  place,
  isoWeek,
  reviewedThisWeek,
  poolEmpty,
  onVisited,
  onPickNext,
}: Props) {
  return (
    <section className="weekly">
      <div className="weekly-head">
        <h2>🍽️ Tip týždňa</h2>
        <span className="muted small">{isoWeek}</span>
      </div>

      {reviewedThisWeek ? (
        <div className="card done-card">
          <p>Hotovo na tento týždeň ✅ Ďalší tip príde v pondelok.</p>
          {!poolEmpty && (
            <button className="btn ghost" onClick={onPickNext}>
              Vybrať ďalší teraz
            </button>
          )}
        </div>
      ) : place ? (
        <PlaceCard place={place}>
          <button className="btn primary big" onClick={onVisited}>
            Boli sme tam → napísať recenziu
          </button>
        </PlaceCard>
      ) : poolEmpty ? (
        <div className="card">
          <p>
            Všetky podniky v zozname sú navštívené 🎉 Obnov zoznam alebo uvoľni
            filtre.
          </p>
        </div>
      ) : (
        <div className="card">
          <p>Načítaj zoznam podnikov, aby sa mohol vybrať tip týždňa.</p>
        </div>
      )}
    </section>
  );
}

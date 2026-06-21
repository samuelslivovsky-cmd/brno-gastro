import { Place, Review } from "../types";
import { PlaceCard } from "./PlaceCard";

export type ListFilter = "all" | "unvisited" | "visited";

type Props = {
  unvisited: Place[];
  visited: { place: Place; review: Review }[];
  listFilter: ListFilter;
  search: string;
  onReview: (place: Place) => void;
};

export function PlaceList({
  unvisited,
  visited,
  listFilter,
  search,
  onReview,
}: Props) {
  const showUnvisited = listFilter === "all" || listFilter === "unvisited";
  const showVisited = listFilter === "all" || listFilter === "visited";

  const emptyHint = search
    ? `Nič nezodpovedá hľadaniu „${search}“.`
    : "Žiadne podniky — načítaj zoznam alebo uvoľni filtre.";

  return (
    <div className="lists">
      {showUnvisited && (
        <section>
          <h2>Nenavštívené ({unvisited.length})</h2>
          {unvisited.length === 0 ? (
            <p className="muted">{emptyHint}</p>
          ) : (
            <div className="grid">
              {unvisited.map((p) => (
                <PlaceCard key={p.id} place={p} onReview={onReview} />
              ))}
            </div>
          )}
        </section>
      )}

      {showVisited && (
        <section>
          <h2>Navštívené &amp; recenzované ({visited.length})</h2>
          {visited.length === 0 ? (
            <p className="muted">
              {search ? emptyHint : "Zatiaľ žiadne návštevy."}
            </p>
          ) : (
            <div className="grid">
              {visited.map(({ place, review }) => (
                <PlaceCard key={place.id} place={place} review={review} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

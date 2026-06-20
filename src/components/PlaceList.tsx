import { Place, Review } from "../types";
import { PlaceCard } from "./PlaceCard";

type Props = {
  unvisited: Place[];
  visited: { place: Place; review: Review }[];
};

export function PlaceList({ unvisited, visited }: Props) {
  return (
    <div className="lists">
      <section>
        <h2>Nenavštívené ({unvisited.length})</h2>
        {unvisited.length === 0 ? (
          <p className="muted">Žiadne podniky — načítaj zoznam alebo uvoľni filtre.</p>
        ) : (
          <div className="grid">
            {unvisited.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Navštívené &amp; recenzované ({visited.length})</h2>
        {visited.length === 0 ? (
          <p className="muted">Zatiaľ žiadne návštevy.</p>
        ) : (
          <div className="grid">
            {visited.map(({ place, review }) => (
              <PlaceCard key={place.id} place={place} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

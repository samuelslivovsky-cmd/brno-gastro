import { Place, Review } from "../types";

type Props = {
  place: Place;
  review?: Review;
  children?: React.ReactNode;
};

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" title={value.toFixed(1)}>
      {"★".repeat(full)}
      {"☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

export function PlaceCard({ place, review, children }: Props) {
  return (
    <article className="card place-card">
      {place.photoUrl && (
        <img className="place-photo" src={place.photoUrl} alt={place.name} loading="lazy" />
      )}
      <div className="place-body">
        <h3 className="place-name">{place.name}</h3>
        <div className="place-meta">
          <Stars value={place.rating} /> {place.rating.toFixed(1)}{" "}
          <span className="muted">({place.userRatingCount} recenzií)</span>
        </div>
        {place.primaryType && <div className="badge">{place.primaryType}</div>}
        {place.address && <div className="muted small">{place.address}</div>}
        <a className="link" href={place.mapsUri} target="_blank" rel="noreferrer">
          Otvoriť v Google Maps ↗
        </a>
        {review && (
          <div className="my-review">
            <strong>Moja recenzia:</strong> <Stars value={review.rating} />{" "}
            {review.rating}/5
            {review.text && <p className="review-text">„{review.text}“</p>}
            <div className="muted small">
              {new Date(review.date).toLocaleDateString("sk-SK")}
            </div>
          </div>
        )}
        {children}
      </div>
    </article>
  );
}

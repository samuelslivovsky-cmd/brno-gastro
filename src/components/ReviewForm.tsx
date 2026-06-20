import { useState } from "react";
import { Place, Review } from "../types";

type Props = {
  place: Place;
  onSubmit: (review: Review) => void;
  onCancel: () => void;
};

export function ReviewForm({ place, onSubmit, onCancel }: Props) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Recenzia — {place.name}</h2>
        <p className="muted small">Ako sa vám tam páčilo?</p>

        <div className="rating-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star-btn ${n <= rating ? "active" : ""}`}
              onClick={() => setRating(n)}
              aria-label={`${n} hviezdičiek`}
            >
              ★
            </button>
          ))}
          <span className="muted">{rating}/5</span>
        </div>

        <textarea
          className="review-textarea"
          placeholder="Napíš pár slov o návšteve (nepovinné)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />

        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>
            Zrušiť
          </button>
          <button
            className="btn primary"
            onClick={() =>
              onSubmit({
                rating,
                text: text.trim(),
                date: new Date().toISOString(),
              })
            }
          >
            Uložiť recenziu
          </button>
        </div>
      </div>
    </div>
  );
}

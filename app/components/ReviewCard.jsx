import {Stars} from './Stars';

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A single review card used by both the homepage testimonials and the
 * product page reviews section. Accepts normalized Judge.me reviews or the
 * existing static review shape.
 *
 * @param {{
 *   review: any,
 *   subtitle?: string,
 * }} props
 */
export function ReviewCard({review, subtitle}) {
  const name = review.author || review.name || 'Anonymous';
  const text = review.body || review.text || '';
  const initials = getInitials(name);

  const meta =
    subtitle ??
    ([review.location, review.product].filter(Boolean).join(' · ') ||
      review.productTitle ||
      '');

  return (
    <article className="review-card">
      <div className="review-card__top">
        <Stars value={review.rating} size={14} />
        {review.verified ? (
          <span className="review-card__verified">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 6.5l2 2 5-5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Verified
          </span>
        ) : null}
      </div>

      <p className="review-card__text">{text}</p>

      <div className="review-card__foot">
        <span className="review-card__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="review-card__meta">
          <span className="review-card__name">{name}</span>
          {meta ? <span className="review-card__sub">{meta}</span> : null}
        </span>
      </div>
    </article>
  );
}

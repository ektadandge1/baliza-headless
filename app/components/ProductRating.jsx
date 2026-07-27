import {Stars} from './Stars';
import {getExternalId} from '~/lib/judgeMe';

/**
 * Small rating badge shown on product cards. Only renders when rating data
 * exists for the product, so it degrades cleanly before Judge.me is wired.
 *
 * @param {{
 *   productId: string,
 *   ratings?: Record<string, {average: number, count: number, distribution: object}>,
 * }} props
 */
export function ProductRating({productId, ratings}) {
  const key = getExternalId(productId);
  const entry = key ? ratings?.[key] : undefined;

  if (!entry || !entry.count) return null;

  return (
    <div className="product-rating" aria-label={`Rated ${entry.average.toFixed(1)} out of 5 from ${entry.count} reviews`}>
      <Stars value={entry.average} size={13} />
      <span className="product-rating__count">({entry.count})</span>
    </div>
  );
}

import {useState} from 'react';
import {Stars} from './Stars';
import {ReviewCard} from './ReviewCard';

/**
 * Full reviews section for the product page.
 * - Shows rating summary (average, count, distribution bars)
 * - Lists normalized Judge.me reviews
 * - Includes a custom "write a review" form that posts to the public
 *   Judge.me create endpoint (no API token required client-side)
 *
 * @param {{
 *   reviews: Array<object>,
 *   shopDomain?: string,
 *   externalId?: string,
 *   productHandle?: string,
 *   productTitle?: string,
 * }} props
 */
export function ProductReviews({
  reviews,
  shopDomain,
  externalId,
  productHandle,
  productTitle,
}) {
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [form, setForm] = useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    body: '',
  });

  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total
    : 0;

  const distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
  reviews.forEach((r) => {
    const k = Math.round(r.rating || 0);
    if (distribution[k] != null) distribution[k] += 1;
  });

  const bars = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: total ? Math.round((distribution[stars] / total) * 100) : 0,
  }));

  const update = (field, value) =>
    setForm((prev) => ({...prev, [field]: value}));

  const canSubmit =
    form.name.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.body.trim().length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || !shopDomain || !externalId) return;

    setStatus('submitting');
    try {
      const res = await fetch('https://judge.me/api/v1/reviews', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          shop_domain: shopDomain,
          platform: 'shopify',
          id: externalId,
          name: form.name.trim(),
          email: form.email.trim(),
          rating: Number(form.rating),
          title: form.title.trim(),
          body: form.body.trim(),
          ...(productHandle ? {product_handle: productHandle} : {}),
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
      setForm({name: '', email: '', rating: 5, title: '', body: ''});
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-reviews__header">
        <div>
          <span className="product-reviews__eyebrow">Customer Reviews</span>
          <h2 id="product-reviews-title">
            {total ? `${total} Review${total > 1 ? 's' : ''}` : 'Reviews'}
          </h2>
        </div>
        {shopDomain && externalId ? (
          <button
            type="button"
            className="product-reviews__write-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Close' : 'Write a Review'}
          </button>
        ) : null}
      </div>

      {total > 0 ? (
        <>
          <div className="product-reviews__summary">
            <div className="product-reviews__score">
              <span className="product-reviews__score-value">
                {average.toFixed(1)}
              </span>
              <Stars value={average} size={16} />
              <span className="product-reviews__score-count">
                Based on {total} review{total > 1 ? 's' : ''}
              </span>
            </div>

            <div className="product-reviews__bars" aria-hidden="true">
              {bars.map((bar) => (
                <div className="product-reviews__bar-row" key={bar.stars}>
                  <span className="product-reviews__bar-label">
                    {bar.stars}
                  </span>
                  <span className="product-reviews__bar-track">
                    <span
                      className="product-reviews__bar-fill"
                      style={{width: `${bar.percent}%`}}
                    />
                  </span>
                  <span className="product-reviews__bar-percent">
                    {bar.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="product-reviews__grid">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </>
      ) : (
        <p className="product-reviews__empty">
          No reviews yet. Be the first to share your thoughts.
        </p>
      )}

      {showForm && shopDomain && externalId ? (
        <form className="review-form" onSubmit={handleSubmit}>
          <h3 className="review-form__title">
            Write a review{productTitle ? ` for ${productTitle}` : ''}
          </h3>

          <div className="review-form__row">
            <label className="review-form__field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </label>
            <label className="review-form__field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="review-form__field">
            <span>Rating</span>
            <div className="review-form__stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`review-form__star ${star <= form.rating ? 'is-active' : ''}`}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  aria-pressed={star <= form.rating}
                  onClick={() => update('rating', star)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <label className="review-form__field">
            <span>Title (optional)</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </label>

          <label className="review-form__field">
            <span>Review</span>
            <textarea
              rows={4}
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="review-form__submit"
            disabled={!canSubmit || status === 'submitting'}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit Review'}
          </button>

          {status === 'success' ? (
            <p className="review-form__message review-form__message--ok">
              Thanks! Your review was submitted and will appear once approved.
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="review-form__message review-form__message--err">
              Something went wrong. Please try again.
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

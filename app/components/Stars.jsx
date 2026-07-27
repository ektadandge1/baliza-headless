/**
 * Reusable star rating component (shared site-wide).
 * Renders filled/empty stars from a numeric value.
 *
 * @param {{ value?: number, size?: number }} props
 */
export function Stars({value = 0, size = 14}) {
  const rounded = Math.round(value);

  return (
    <span
      className="stars"
      style={{'--star-size': `${size}px`}}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`stars__item ${i <= rounded ? 'is-filled' : ''}`}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.3l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}

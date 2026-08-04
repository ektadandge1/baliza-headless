import {
  BUNDLE_DISCOUNT_TIERS,
  getBundleDiscountState,
} from '~/lib/bundleDiscounts';

const TIER_ICONS = ['percent', 'percent', 'crown'];

/**
 * @param {{cart: CartApiQueryFragment | null}} props
 */
export function CartPromotionProgress({cart}) {
  const {quantity, unlockedTier, nextTier, progress} =
    getBundleDiscountState(cart);
  const highestTier = BUNDLE_DISCOUNT_TIERS.at(-1);
  const allUnlocked = Boolean(unlockedTier && !nextTier);

  let headline;
  if (allUnlocked) {
    headline = `Best reward unlocked: ${highestTier.discount}% off`;
  } else if (unlockedTier && nextTier) {
    const remaining = nextTier.quantity - quantity;
    headline = `You unlocked ${unlockedTier.discount}% off. Add ${remaining} more for ${nextTier.discount}% off`;
  } else if (nextTier) {
    const remaining = nextTier.quantity - quantity;
    headline = `Add ${remaining} item${remaining === 1 ? '' : 's'} to unlock ${nextTier.discount}% off`;
  } else {
    headline = 'Mix & Match rewards unlocked';
  }

  return (
    <section
      className={`cart-promo${allUnlocked ? ' cart-promo--complete' : ''}`}
      aria-label="Shopping rewards progress"
    >
      <div className="cart-promo__header">
        <div className="cart-promo__title-row">
          <span className="cart-promo__icon" aria-hidden="true">
            {allUnlocked ? '★' : '✦'}
          </span>
          <div className="cart-promo__title-text">
            <span className="cart-promo__eyebrow">Mix & Match</span>
            <strong className="cart-promo__headline">{headline}</strong>
          </div>
        </div>
        <span className="cart-promo__spent">
          <small>Items</small>
          <strong>{quantity}</strong>
        </span>
      </div>

      <div className="cart-promo__bar-wrap">
        <div
          className="cart-promo__track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={highestTier.quantity}
          aria-valuenow={Math.min(quantity, highestTier.quantity)}
          aria-label={`${quantity} item${quantity === 1 ? '' : 's'} toward bundle discount rewards`}
        >
          <span
            className="cart-promo__fill"
            style={{width: `${progress}%`}}
          />
        </div>
        <div className="cart-promo__steps">
          {BUNDLE_DISCOUNT_TIERS.map((tier) => {
            const isUnlocked = quantity >= tier.quantity;
            return (
              <div
                className={`cart-promo__step${isUnlocked ? ' is-unlocked' : ''}`}
                key={tier.code}
              >
                <span className="cart-promo__step-dot">
                  {isUnlocked ? (
                    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <span className="cart-promo__step-label">
                  {tier.quantity}+ items
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cart-promo__chips">
        {BUNDLE_DISCOUNT_TIERS.map((tier, index) => {
          const isUnlocked = quantity >= tier.quantity;
          return (
            <span
              className={`cart-promo__chip${isUnlocked ? ' cart-promo__chip--unlocked' : ''}`}
              key={tier.code}
            >
              <span className="cart-promo__chip-icon" aria-hidden="true">
                <MilestoneIcon type={TIER_ICONS[index]} />
              </span>
              Buy {tier.quantity}, save {tier.discount}%
            </span>
          );
        })}
      </div>
    </section>
  );
}

function MilestoneIcon({type}) {
  if (type === 'percent') {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" />
        <line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
        <circle cx="5.5" cy="5.5" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.3 4.3 12.3l.7-4.1-3-2.9 4.2-.7L8 1z" />
    </svg>
  );
}

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */

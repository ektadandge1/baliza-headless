export const BUNDLE_DISCOUNT_TIERS = [
  {quantity: 2, discount: 10, code: 'MIX2'},
  {quantity: 3, discount: 15, code: 'MIX3'},
  {quantity: 5, discount: 20, code: 'MIX5'},
];

export const BUNDLE_DISCOUNT_CODES = BUNDLE_DISCOUNT_TIERS.map(
  (tier) => tier.code,
);

const BUNDLE_DISCOUNT_CODE_SET = new Set(BUNDLE_DISCOUNT_CODES);

export function getBundleDiscountTier(quantity) {
  return BUNDLE_DISCOUNT_TIERS.reduce(
    (bestTier, tier) => (quantity >= tier.quantity ? tier : bestTier),
    null,
  );
}

export function getNextBundleDiscountTier(quantity) {
  return BUNDLE_DISCOUNT_TIERS.find((tier) => quantity < tier.quantity) ?? null;
}

export function isBundleDiscountCode(code) {
  return BUNDLE_DISCOUNT_CODE_SET.has(String(code || '').toUpperCase());
}

export function getBundleDiscountState(cart) {
  const quantity = Number(cart?.totalQuantity) || 0;
  const unlockedTier = getBundleDiscountTier(quantity);
  const nextTier = getNextBundleDiscountTier(quantity);

  return {
    quantity,
    unlockedTier,
    nextTier,
    progress: Math.min(
      (quantity / BUNDLE_DISCOUNT_TIERS[BUNDLE_DISCOUNT_TIERS.length - 1].quantity) *
        100,
      100,
    ),
  };
}

export function getSyncedBundleDiscountCodes(cart, discountCodes = []) {
  const {unlockedTier} = getBundleDiscountState(cart);
  const manualCodes = discountCodes
    .map((code) => String(code || '').trim())
    .filter(Boolean)
    .filter((code) => !isBundleDiscountCode(code));

  return unlockedTier ? [...manualCodes, unlockedTier.code] : manualCodes;
}

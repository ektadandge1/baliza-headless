export const SWATCH_COLOR_MAP = {
  white: '#f6f2ea',
  black: '#111111',
  navy: '#192b4d',
  blue: '#2f65b8',
  greymelange: '#9b9b96',
  graymelange: '#9b9b96',
  grey: '#8f8f8f',
  gray: '#8f8f8f',
  red: '#b92d2d',
  green: '#2d6b4f',
  olive: '#6f7351',
  beige: '#cbb891',
  cream: '#efe3c8',
  brown: '#6f4935',
  coffee: '#4a3428',
  pink: '#e8a0bf',
  yellow: '#f5d76e',
  orange: '#e67e22',
  purple: '#7d3c98',
};

export const DEFAULT_SWATCH_COLOR = '#d7d2c8';

export function normalizeSwatchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function getSwatchColor(value) {
  const normalized = normalizeSwatchValue(value);
  const match = Object.entries(SWATCH_COLOR_MAP).find(([name]) =>
    normalized.includes(name),
  );

  return match?.[1] ?? DEFAULT_SWATCH_COLOR;
}

export function getSwatchColorName(value) {
  const normalized = normalizeSwatchValue(value);
  const match = Object.keys(SWATCH_COLOR_MAP).find((name) =>
    normalized.includes(name),
  );

  return match ?? null;
}

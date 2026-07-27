/**
 * POST /api/delivery
 *
 * Provider-neutral delivery estimate endpoint. The rules provider is used until
 * a courier integration is configured. Courier adapters can later return the
 * same response shape without requiring product-page changes.
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function action({request, context}) {
  if (request.method !== 'POST') {
    return jsonResponse({ok: false, error: 'Method not allowed'}, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ok: false, error: 'Invalid request'}, 400);
  }

  const postalCode = String(body?.postalCode ?? '').replace(/\s+/g, '');
  const price = Number(body?.price) || 0;

  if (!/^\d{6}$/.test(postalCode) || postalCode.startsWith('0')) {
    return jsonResponse(
      {ok: false, error: 'Enter a valid 6-digit PIN code'},
      400,
    );
  }

  const env = context.env;
  const freeShippingThreshold = getNumber(
    env.DELIVERY_FREE_THRESHOLD,
    999,
  );
  const shippingFee = getNumber(env.DELIVERY_STANDARD_FEE, 79);
  const dispatchDays = getNumber(env.DELIVERY_DISPATCH_DAYS, 1);
  const deliveryDaysMin = getNumber(env.DELIVERY_DAYS_MIN, 3);
  const deliveryDaysMax = Math.max(
    deliveryDaysMin,
    getNumber(env.DELIVERY_DAYS_MAX, 6),
  );
  const returnWindowDays = getNumber(env.DELIVERY_RETURN_DAYS, 7);
  const codEnabled = getBoolean(env.DELIVERY_COD_ENABLED, true);
  const blockedPostalCodes = String(env.DELIVERY_BLOCKED_PIN_CODES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (blockedPostalCodes.includes(postalCode)) {
    return jsonResponse({
      ok: true,
      provider: 'rules',
      serviceable: false,
      message: 'Delivery is not currently available to this PIN code.',
    });
  }

  const deliveryStart = addDays(new Date(), dispatchDays + deliveryDaysMin);
  const deliveryEnd = addDays(new Date(), dispatchDays + deliveryDaysMax);

  return jsonResponse({
    ok: true,
    provider: 'rules',
    serviceable: true,
    estimated: true,
    postalCode,
    estimatedDelivery: {
      from: deliveryStart.toISOString(),
      to: deliveryEnd.toISOString(),
    },
    shippingFee: price >= freeShippingThreshold ? 0 : shippingFee,
    freeShippingThreshold,
    codAvailable: codEnabled,
    returnEligible: returnWindowDays > 0,
    returnWindowDays,
    message: 'Estimated delivery based on standard service times.',
  });
}

export async function loader() {
  return jsonResponse({ok: false, error: 'Method not allowed'}, 405);
}

function getNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function getBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() !== 'false';
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

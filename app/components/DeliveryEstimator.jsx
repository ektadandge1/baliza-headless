import {useEffect, useState} from 'react';

/**
 * @param {{price?: MoneyV2}} props
 */
export function DeliveryEstimator({price}) {
  const [postalCode, setPostalCode] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setEstimate(null);
    setStatus('idle');
    setError('');
  }, [price?.amount]);

  const checkDelivery = async (event) => {
    event.preventDefault();
    const normalizedPostalCode = postalCode.replace(/\s+/g, '');

    if (!/^\d{6}$/.test(normalizedPostalCode)) {
      setEstimate(null);
      setError('Enter a valid 6-digit PIN code.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/delivery', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          postalCode: normalizedPostalCode,
          price: Number(price?.amount) || 0,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Unable to check delivery.');
      }

      setEstimate(data);
      setStatus('success');
    } catch (requestError) {
      setEstimate(null);
      setError(requestError.message || 'Unable to check delivery.');
      setStatus('error');
    }
  };

  return (
    <section className="delivery-estimator" aria-labelledby="delivery-estimator-title">
      <div className="delivery-estimator__header">
        <span className="delivery-estimator__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 6.5h11v10H3zM14 10h3.2l3.8 3.7v2.8H14zM7 20a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 7 20ZM17.5 20a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h2 id="delivery-estimator-title">Check delivery</h2>
          <p>Enter your PIN code to see delivery options.</p>
        </div>
      </div>

      <form className="delivery-estimator__form" onSubmit={checkDelivery}>
        <label className="delivery-estimator__label" htmlFor="delivery-postal-code">
          PIN code
        </label>
        <div className="delivery-estimator__input-row">
          <input
            id="delivery-postal-code"
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="Enter 6-digit PIN"
            value={postalCode}
            onChange={(event) => {
              setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 6));
              if (status !== 'idle') setStatus('idle');
              setError('');
            }}
            aria-describedby={error ? 'delivery-estimator-error' : undefined}
          />
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking' : 'Check'}
          </button>
        </div>
      </form>

      {error ? (
        <p className="delivery-estimator__message delivery-estimator__message--error" id="delivery-estimator-error" role="alert">
          {error}
        </p>
      ) : null}

      {estimate ? <DeliveryResult estimate={estimate} /> : null}
    </section>
  );
}

function DeliveryResult({estimate}) {
  if (!estimate.serviceable) {
    return (
      <p className="delivery-estimator__message delivery-estimator__message--error" role="status">
        {estimate.message}
      </p>
    );
  }

  const deliveryRange = formatDateRange(
    estimate.estimatedDelivery.from,
    estimate.estimatedDelivery.to,
  );

  return (
    <div className="delivery-estimator__result" role="status">
      <div className="delivery-estimator__result-heading">
        <span className="delivery-estimator__check" aria-hidden="true">✓</span>
        <div>
          <strong>Delivery available</strong>
          <small>For PIN code {estimate.postalCode}</small>
        </div>
      </div>
      <div className="delivery-estimator__details">
        <DeliveryDetail label="Estimated delivery" value={deliveryRange} />
        <DeliveryDetail
          label="Shipping"
          value={estimate.shippingFee ? formatCurrency(estimate.shippingFee) : 'Free'}
        />
        <DeliveryDetail
          label="Cash on delivery"
          value={estimate.codAvailable ? 'Available' : 'Unavailable'}
        />
        <DeliveryDetail
          label="Returns"
          value={
            estimate.returnEligible
              ? `${estimate.returnWindowDays}-day returns`
              : 'Not eligible'
          }
        />
      </div>
      {estimate.estimated ? (
        <small className="delivery-estimator__note">
          Delivery dates are estimates and may vary by location.
        </small>
      ) : null}
    </div>
  );
}

function DeliveryDetail({label, value}) {
  return (
    <div className="delivery-estimator__detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateRange(from, to) {
  const options = {day: 'numeric', month: 'short'};
  const start = new Date(from).toLocaleDateString('en-IN', options);
  const end = new Date(to).toLocaleDateString('en-IN', options);
  return start === end ? start : `${start} – ${end}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').MoneyV2} MoneyV2 */

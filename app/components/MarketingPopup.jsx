import {useEffect, useState} from 'react';

const SESSION_KEY = 'baliza_popup_session';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Entry popup shown once per browser session (a short delay after load).
 * Offers 10% off the first order in exchange for an email, which is
 * saved to Shopify (marketing opt-in) via /api/subscribe. On success
 * it reveals the discount code.
 *
 * @param {{discountCode?: string, delay?: number}} props
 */
export function MarketingPopup({discountCode = 'WELCOME10', delay = 2500}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const submit = async (event) => {
    event.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <div className="mk-popup" role="dialog" aria-modal="true" aria-labelledby="mk-popup-title">
      <button
        type="button"
        className="mk-popup__overlay"
        onClick={close}
        aria-label="Close dialog"
      />
      <div className="mk-popup__card">
        <button className="mk-popup__close" onClick={close} aria-label="Close">
          &times;
        </button>

        {status === 'success' ? (
          <div className="mk-popup__success">
            <span className="mk-popup__eyebrow">You&rsquo;re in</span>
            <h2 id="mk-popup-title">Your 10% code</h2>
            <p className="mk-popup__copy">Use this at checkout:</p>
            <div className="mk-popup__code">{discountCode}</div>
            <button className="mk-popup__cta" type="button" onClick={close}>
              Start shopping
            </button>
          </div>
        ) : (
          <form className="mk-popup__form" onSubmit={submit}>
            <span className="mk-popup__eyebrow">Welcome to Baliza</span>
            <h2 id="mk-popup-title">Get 10% off your first order</h2>
            <p className="mk-popup__copy">
              Join our list for early drops, styling tips, and a welcome discount.
            </p>

            <label className="mk-popup__field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            {error ? <p className="mk-popup__error">{error}</p> : null}

            <button
              className="mk-popup__cta"
              type="submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting'
                ? 'Unlocking…'
                : `Unlock ${discountCode}`}
            </button>

            <p className="mk-popup__note">No spam. Unsubscribe anytime.</p>
          </form>
        )}
      </div>
    </div>
  );
}

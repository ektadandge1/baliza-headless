import {useEffect, useState} from 'react';

const SESSION_KEY = 'baliza_scrollnotice_session';

/**
 * Slide-in notification shown once per session when the visitor scrolls
 * near the bottom of the page. Reinforces the first-order discount code.
 *
 * @param {{discountCode?: string}} props
 */
export function ScrollNotice({discountCode = 'WELCOME10'}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let fired = false;
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (!fired && height > 200 && scrollTop >= height * 0.85) {
        fired = true;
        setShow(true);
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          /* ignore */
        }
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="mk-notice" role="status">
      <div className="mk-notice__icon" aria-hidden="true">
        %
      </div>
      <div className="mk-notice__body">
        <p className="mk-notice__text">
          Forgot your 10% code? Use <strong>{discountCode}</strong> at checkout.
        </p>
      </div>
      <button
        className="mk-notice__close"
        onClick={() => setShow(false)}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

import {NavLink} from 'react-router';

/**
 * @param {FooterProps}
 */
export function Footer({header}) {
  return (
    <div className="footer-wrapper">
      <div className="footer-top">
        <div className="footer-brand">
          <NavLink to="/" className="footer-brand-name">
            {header.shop.name}
          </NavLink>
          <p className="footer-brand-desc">
            Premium clothing designed for those who appreciate quality, comfort,
            and timeless style. Every piece tells a story.
          </p>
          <div className="footer-social">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <svg viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24">
                <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="footer-column-title">Shop</h4>
          <ul className="footer-links">
            <li><NavLink to="/collections/all">All Products</NavLink></li>
            <li><NavLink to="/collections/new-arrivals">New Arrivals</NavLink></li>
            <li><NavLink to="/collections/best-sellers">Best Sellers</NavLink></li>
            <li><NavLink to="/collections/t-shirts">T-Shirts</NavLink></li>
            <li><NavLink to="/collections/hoodies">Hoodies</NavLink></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-column-title">Help</h4>
          <ul className="footer-links">
            <li><NavLink to="/pages/contact">Contact Us</NavLink></li>
            <li><NavLink to="/policies/shipping-policy">Shipping</NavLink></li>
            <li><NavLink to="/policies/refund-policy">Returns & Exchanges</NavLink></li>
            <li><NavLink to="/policies/privacy-policy">Privacy Policy</NavLink></li>
            <li><NavLink to="/policies/terms-of-service">Terms of Service</NavLink></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-column-title">Company</h4>
          <ul className="footer-links">
            <li><NavLink to="/pages/about">About Us</NavLink></li>
            <li><NavLink to="/blogs/journal">Blog</NavLink></li>
            <li><NavLink to="/account">My Account</NavLink></li>
          </ul>
          <div className="footer-newsletter">
            <p>Stay updated with new drops and exclusive offers.</p>
            <FooterNewsletterForm />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} {header.shop.name}. All rights reserved.
          </p>
          <div className="footer-payments">
            <svg viewBox="0 0 38 24" width="38" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="24" rx="4" fill="#fff" stroke="#E5E5E5" />
              <text x="19" y="15" textAnchor="middle" fill="#111" fontSize="8" fontFamily="sans-serif" fontWeight="600">VISA</text>
            </svg>
            <svg viewBox="0 0 38 24" width="38" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="24" rx="4" fill="#fff" stroke="#E5E5E5" />
              <circle cx="15" cy="12" r="6" fill="#EB001B" opacity="0.8" />
              <circle cx="23" cy="12" r="6" fill="#F79E1B" opacity="0.8" />
            </svg>
            <svg viewBox="0 0 38 24" width="38" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="24" rx="4" fill="#fff" stroke="#E5E5E5" />
              <text x="19" y="15" textAnchor="middle" fill="#111" fontSize="7" fontFamily="sans-serif" fontWeight="600">AMEX</text>
            </svg>
            <svg viewBox="0 0 38 24" width="38" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="24" rx="4" fill="#fff" stroke="#E5E5E5" />
              <text x="19" y="15" textAnchor="middle" fill="#111" fontSize="7" fontFamily="sans-serif" fontWeight="600">GPay</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterNewsletterForm() {
  return (
    <form className="footer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder="Your email"
        className="footer-newsletter-input"
        aria-label="Email for newsletter"
      />
      <button type="submit" className="footer-newsletter-btn">
        Subscribe
      </button>
    </form>
  );
}

/**
 * @typedef {Object} FooterProps
 * @property {Promise<FooterQuery|null>} footer
 * @property {HeaderQuery} header
 * @property {string} publicStoreDomain
 */

/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */

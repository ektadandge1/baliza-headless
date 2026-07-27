import {
  useLoaderData,
  useActionData,
  Form,
  useNavigate,
  useSearchParams,
} from 'react-router';
import {useEffect, useRef, useState} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Forgot Password'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  if (await context.customerAccount.isLoggedIn()) {
    return {redirect: '/account'};
  }
  return {};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim();

  if (!email || !email.includes('@')) {
    return {error: 'Please enter a valid email address.'};
  }

  // Redirect to login with the email as loginHint.
  // On Shopify's login page, the user can click "Forgot password"
  // to receive a password reset email.
  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    loginHint: email,
    loginHintMode: 'none',
  });
}

export default function Recover() {
  /** @type {LoaderReturnData} */
  const loaderData = useLoaderData();

  if (loaderData?.redirect) {
    return <RecoverRedirect redirect={loaderData.redirect} />;
  }

  return <RecoverForm />;
}

function RecoverRedirect({redirect}) {
  const navigate = useNavigate();
  const [count, setCount] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c - 1);
    }, 1000);
    const navTimer = setTimeout(() => {
      navigate(redirect);
    }, 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(navTimer);
    };
  }, [navigate, redirect]);

  return (
    <AuthShell>
      <AuthCard
        title="Already signed in"
        subtitle="You're already logged in. Redirecting you to your account..."
      >
        <div className="auth-redirect">
          <div className="auth-redirect__spinner" aria-hidden="true" />
          <p className="auth-redirect__text">
            Redirecting in {count} second{count !== 1 ? 's' : ''}...
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

function RecoverForm() {
  /** @type {ActionReturnData} */
  const action = useActionData();
  const [searchParams] = useSearchParams();
  const emailRef = useRef(null);

  const returnTo = searchParams.get('return_to') || '/account/login';

  return (
    <AuthShell>
      <AuthCard
        eyebrow="ACCOUNT"
        title="Reset password"
        subtitle="Enter your email to continue."
      >
        <Form method="POST" className="auth-form">
          <input type="hidden" name="return_to" defaultValue={returnTo} />

          {action?.error ? (
            <div className="auth-form__error" role="alert">
              {action.error}
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="email" className="auth-field__label">
              Email address
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              minLength={3}
              maxLength={255}
              className="auth-field__input"
            />
          </div>

          <button type="submit" className="auth-btn auth-btn--primary">
            Continue
          </button>
        </Form>

        <div className="auth-links">
          <a href="/account/login" className="auth-link auth-link--back">
            Back to sign in
          </a>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

function AuthShell({children}) {
  return (
    <section className="auth-shell auth-shell--recover">
      <div className="auth-shell__container">
        <div className="auth-shell__bg" aria-hidden="true" />
        <div className="auth-shell__aside" aria-hidden="true" />
        <a className="auth-shell__brand" href="/" aria-label="Baliza home">
          <span className="auth-shell__brand-mark">B</span>
          <span>BALIZA</span>
        </a>
        {children}
      </div>
    </section>
  );
}

function AuthCard({eyebrow, title, subtitle, children}) {
  return (
    <div className="auth-card">
      <div className="auth-card__head">
        <span className="auth-card__eyebrow">{eyebrow || 'BALIZA ACCOUNT'}</span>
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__subtitle">{subtitle}</p>
      </div>
      <div className="auth-card__body">{children}</div>
    </div>
  );
}

/** @typedef {import('react-router').ReactNode} ReactNode */
/** @typedef {{redirect?: string}} LoaderReturnData */
/** @typedef {{error?: string}} ActionReturnData */
/** @typedef {import('./+types/account_.recover').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
/** @typedef {ReturnType<typeof useActionData<typeof action>>} ActionReturnData */

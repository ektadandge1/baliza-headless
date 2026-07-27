import {
  useLoaderData,
  useActionData,
  Form,
  useNavigate,
} from 'react-router';
import {useEffect, useState} from 'react';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Sign Out'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  if (!(await context.customerAccount.isLoggedIn())) {
    return {redirect: '/account/login'};
  }
  return {};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const formData = await request.formData();
  const confirm = String(formData.get('confirm') || '');

  if (confirm !== 'yes') {
    return {error: 'Please confirm that you want to sign out.'};
  }

  return context.customerAccount.logout({
    postLogoutRedirectUri: '/',
  });
}

export default function Logout() {
  /** @type {LoaderReturnData} */
  const loaderData = useLoaderData();

  if (loaderData?.redirect) {
    return <LogoutRedirect redirect={loaderData.redirect} />;
  }

  return <LogoutForm />;
}

function LogoutRedirect({redirect}) {
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
        title="Not signed in"
        subtitle="You're not currently signed in."
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

function LogoutForm() {
  /** @type {ActionReturnData} */
  const action = useActionData();

  return (
    <AuthShell>
      <AuthCard
        eyebrow="ACCOUNT SECURITY"
        title="Sign out"
        subtitle="Are you sure you want to sign out of your account?"
      >
        <Form method="POST" className="auth-form">
          <div className="auth-confirm">
            <label className="auth-confirm__checkbox">
              <input
                type="checkbox"
                name="confirm"
                value="yes"
                required
              />
              <span className="auth-confirm__label">
                Yes, I want to sign out
              </span>
            </label>
          </div>

          {action?.error ? (
            <div className="auth-form__error" role="alert">
              {action.error}
            </div>
          ) : null}

          <button type="submit" className="auth-btn auth-btn--secondary">
            Sign out
          </button>

          <a href="/account" className="auth-btn auth-btn--outline">
            Cancel
          </a>
        </Form>
      </AuthCard>
    </AuthShell>
  );
}

function AuthShell({children}) {
  return (
    <section className="auth-shell">
      <div className="auth-shell__container">
        <div className="auth-shell__bg" aria-hidden="true" />
        <div className="auth-shell__aside">
          <span className="auth-shell__aside-kicker">BALIZA / MEMBERSHIP</span>
          <p className="auth-shell__aside-title">Private access to the Baliza collection.</p>
          <span className="auth-shell__aside-index">03 / 03</span>
        </div>
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
/** @typedef {import('./+types/account_.logout').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
/** @typedef {ReturnType<typeof useActionData<typeof action>>} ActionReturnData */

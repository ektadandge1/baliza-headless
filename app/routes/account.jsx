import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
} from 'react-router';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export function shouldRevalidate() {
  return true;
}

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({context}) {
  const {customerAccount} = context;

  if (!(await customerAccount.isLoggedIn())) {
    return redirect('/account/login');
  }

  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  /** @type {LoaderReturnData} */
  const {customer} = useLoaderData();

  const displayName = getCustomerName(customer);
  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}`
      : `Welcome to your account.`
    : 'Account Details';
  const addressCount = customer?.addresses?.nodes?.length ?? 0;

  return (
    <div className="account">
      <section className="account-hero" aria-labelledby="account-title">
        <div className="account-hero__content">
          <span className="account-hero__eyebrow">Baliza account</span>
          <h1 id="account-title">{heading}</h1>
          <p>
            Track your orders, manage saved addresses, and keep your shopping
            details ready for a faster checkout.
          </p>
        </div>

        <div className="account-hero__card" aria-label="Account summary">
          <span className="account-hero__avatar" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{displayName}</strong>
            <small>Member profile</small>
          </div>
          <dl>
            <div>
              <dt>Saved addresses</dt>
              <dd>{addressCount}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Active</dd>
            </div>
          </dl>
        </div>
      </section>

      <AccountMenu />

      <div className="account-panel">
        <Outlet context={{customer}} />
      </div>
    </div>
  );
}

function AccountMenu() {
  function menuLinkClass({isActive, isPending}) {
    return `account-menu__link ${isActive ? 'is-active' : ''} ${isPending ? 'is-pending' : ''}`;
  }

  return (
    <nav className="account-menu" role="navigation">
      <NavLink to="/account/orders" className={menuLinkClass}>
        Orders
      </NavLink>
      <NavLink to="/account/profile" className={menuLinkClass}>
        Profile
      </NavLink>
      <NavLink to="/account/addresses" className={menuLinkClass}>
        Addresses
      </NavLink>
      <NavLink to="/account/recover" className={menuLinkClass}>
        Forgot password
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      <input type="hidden" name="confirm" value="yes" />
      <button type="submit">Sign out</button>
    </Form>
  );
}

function getCustomerName(customer) {
  const name = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(' ');
  return name || 'Baliza customer';
}

/** @typedef {import('./+types/account').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import {useRef} from 'react';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Orders'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  /** @type {LoaderReturnData} */
  const {customer, filters} = useLoaderData();
  const {orders} = customer;
  const orderCount = orders?.nodes?.length ?? 0;
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="orders">
      <header className="orders-header">
        <div>
          <span className="orders-header__eyebrow">Order history</span>
          <h2>Your purchases</h2>
          <p>
            Search by order or confirmation number and review the latest status
            for every Baliza purchase.
          </p>
        </div>
        <div className="orders-header__stats" aria-label="Order summary">
          <span>{orderCount}</span>
          <small>{hasFilters ? 'Matching orders' : 'Recent orders'}</small>
        </div>
      </header>

      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

/**
 * @param {{
 *   orders: CustomerOrdersFragment['orders'];
 *   filters: OrderFilterParams;
 * }}
 */
function OrdersTable({orders, filters}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="account-orders" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection
          connection={orders}
          ariaLabel="Customer orders"
          resourcesClassName="account-orders__list"
        >
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

/**
 * @param {{hasFilters?: boolean}}
 */
function EmptyOrders({hasFilters = false}) {
  return (
    <div className="orders-empty">
      <span className="orders-empty__icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 8h10M7 12h10M9 16h6M6 3h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </span>
      {hasFilters ? (
        <>
          <h3>No matching orders</h3>
          <p>Try another order number or clear the current filters.</p>
          <Link className="orders-empty__link" to="/account/orders">
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <h3>No orders yet</h3>
          <p>
            Your Baliza order history will appear here after your first
            purchase.
          </p>
          <Link className="orders-empty__link" to="/collections">
            Start shopping
          </Link>
        </>
      )}
    </div>
  );
}

/**
 * @param {{
 *   currentFilters: OrderFilterParams;
 * }}
 */
function OrderSearchForm({currentFilters}) {
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching =
    navigation.state !== 'idle' &&
    navigation.location?.pathname?.includes('orders');
  const formRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData
      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
      ?.toString()
      .trim();

    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber)
      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);

    setSearchParams(params);
  };

  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="order-search-form"
      aria-label="Search orders"
    >
      <fieldset className="order-search-fieldset">
        <legend className="order-search-legend">Filter orders</legend>
        <p className="order-search-help">
          Find purchases quickly using the order number or confirmation code
          from your receipt.
        </p>

        <div className="order-search-inputs">
          <label className="order-search-field">
            <span>Order number</span>
            <input
              type="search"
              name={ORDER_FILTER_FIELDS.NAME}
              placeholder="Example: 1001"
              aria-label="Order number"
              defaultValue={currentFilters.name || ''}
              className="order-search-input"
            />
          </label>
          <label className="order-search-field">
            <span>Confirmation number</span>
            <input
              type="search"
              name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
              placeholder="Example: ABC123"
              aria-label="Confirmation number"
              defaultValue={currentFilters.confirmationNumber || ''}
              className="order-search-input"
            />
          </label>
        </div>

        <div className="order-search-buttons">
          <button
            type="submit"
            className="order-search-submit"
            disabled={isSearching}
          >
            {isSearching ? 'Searching' : 'Search'}
          </button>
          {hasFilters && (
            <button
              type="button"
              disabled={isSearching}
              className="order-search-clear"
              onClick={() => {
                setSearchParams(new URLSearchParams());
                formRef.current?.reset();
              }}
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

/**
 * @param {{order: OrderItemFragment}}
 */
function OrderItem({order}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  return (
    <article className="order-card">
      <div className="order-card__main">
        <div className="order-card__number">
          <span>Order</span>
          <Link to={`/account/orders/${btoa(order.id)}`}>#{order.number}</Link>
        </div>
        <div className="order-card__meta">
          <span>{formatOrderDate(order.processedAt)}</span>
          {order.confirmationNumber ? (
            <span>Confirmation {order.confirmationNumber}</span>
          ) : null}
        </div>
      </div>

      <div className="order-card__status" aria-label="Order status">
        <span>{formatStatus(order.financialStatus)}</span>
        {fulfillmentStatus ? (
          <span>{formatStatus(fulfillmentStatus)}</span>
        ) : null}
      </div>

      <div className="order-card__total">
        <small>Total</small>
        <Money data={order.totalPrice} />
      </div>

      <Link
        className="order-card__link"
        to={`/account/orders/${btoa(order.id)}`}
      >
        View order
      </Link>
    </article>
  );
}

function formatOrderDate(date) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function formatStatus(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * @typedef {{
 *   customer: CustomerOrdersFragment;
 *   filters: OrderFilterParams;
 * }} OrdersLoaderData
 */

/** @typedef {import('./+types/account.orders._index').Route} Route */
/** @typedef {import('~/lib/orderFilters').OrderFilterParams} OrderFilterParams */
/** @typedef {import('customer-accountapi.generated').CustomerOrdersFragment} CustomerOrdersFragment */
/** @typedef {import('customer-accountapi.generated').OrderItemFragment} OrderItemFragment */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */

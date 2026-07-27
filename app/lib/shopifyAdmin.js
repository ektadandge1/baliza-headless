/**
 * Server-only Shopify Admin API helper for newsletter signups.
 *
 * The Storefront API `customerCreate` requires a password (it creates a full
 * account). For a no-password newsletter capture we use the Admin API
 * `customerCreate` mutation with email-marketing consent + a tag, run
 * server-side so the admin token never reaches the browser.
 *
 * If no admin token is configured, calls degrade to a no-op `ok: true`
 * so the storefront UX still completes (the discount code is still shown).
 */

const ADMIN_API_VERSION = '2024-10';

const CUSTOMER_CREATE = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * @param {string} email
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<{ok: boolean, created: boolean}>}
 */
export async function createNewsletterSubscriber(email, env) {
  const token = env.SHOPIFY_ADMIN_API_TOKEN;
  const shop = env.SHOPIFY_ADMIN_SHOP_DOMAIN || env.PUBLIC_STORE_DOMAIN;

  if (!token || !shop) {
    return {ok: true, created: false};
  }

  const endpoint = `https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  const variables = {
    input: {
      email,
      tags: ['newsletter-signup'],
      emailMarketingConsent: {
        marketingOptInLevel: 'SINGLE_OPT_IN',
        marketingState: 'SUBSCRIBED',
      },
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query: CUSTOMER_CREATE, variables}),
    });

    if (!res.ok) return {ok: false, created: false};

    const json = await res.json();
    const errors = json?.data?.customerCreate?.userErrors ?? [];

    // Email already on file is still a win for the customer.
    const alreadyExists = errors.some((e) =>
      /taken|already|exists/i.test(e.message || ''),
    );

    if (errors.length && !alreadyExists) {
      return {ok: false, created: false};
    }

    return {ok: true, created: !alreadyExists};
  } catch (error) {
    console.error('[Shopify] newsletter signup failed:', error);
    return {ok: false, created: false};
  }
}
